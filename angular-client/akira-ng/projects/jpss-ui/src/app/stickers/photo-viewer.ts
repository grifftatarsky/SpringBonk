import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

const MIN_SCALE = 1;
const MAX_SCALE = 8;
/** Wheel delta to scale factor. Small enough that a trackpad flick is not a jump. */
const WHEEL_SENSITIVITY = 0.0016;
/** Where a double-tap lands, when it is not already zoomed in. */
const DOUBLE_TAP_SCALE = 2.5;

/**
 * The photo, as large as the viewport allows, with zoom and pan.
 *
 * The scrim is dark in both themes rather than derived from the foreground
 * token, which inverts: in dark mode that painted a near-white sheet over the
 * photo. A picture is looked at against a dark ground either way; only the
 * depth of it changes with the theme.
 *
 * Deliberately does not close on a click anywhere on the image or the backdrop.
 * The whole point of opening it is to look closely, which means dragging and
 * pinching — and a drag that ends on the backdrop would otherwise dismiss the
 * thing the user was in the middle of examining. Only the × and Escape close it.
 */
@Component({
  selector: 'jpss-photo-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#101114db] dark:bg-[#040507e6] backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="alt()">
      <!-- touch-action none, or the browser pans the page instead of the photo. -->
      <div
        class="flex size-full touch-none items-center justify-center"
        [class.cursor-grab]="scale() === 1"
        [class.cursor-grabbing]="panning()"
        (pointerdown)="onPointerDown($event)"
        (pointermove)="onPointerMove($event)"
        (pointerup)="onPointerUp($event)"
        (pointercancel)="onPointerUp($event)"
        (wheel)="onWheel($event)"
        (dblclick)="toggleZoom($event)">
        <img
          #photo
          class="size-full origin-center object-contain select-none"
          [class.transition-transform]="!panning()"
          [style.transform]="transform()"
          [src]="src()"
          [alt]="alt()"
          draggable="false" />
      </div>

      <!-- Same-origin, so the download attribute is honoured and names the file
           rather than opening it in a tab. -->
      <a
        class="absolute right-16 top-3 grid size-11 place-items-center rounded-full bg-bg/40 text-fg backdrop-blur-sm transition hover:bg-bg/70 sm:right-14 sm:size-9"
        [href]="src()"
        [attr.download]="filename()"
        aria-label="Download this photo">
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="size-4"
          aria-hidden="true">
          <path d="M8 2v8m0 0 3-3m-3 3L5 7M2.5 11.5v1a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-1" />
        </svg>
      </a>

      <button
        type="button"
        class="absolute right-3 top-3 grid size-11 place-items-center rounded-full bg-bg/40 text-fg backdrop-blur-sm transition hover:bg-bg/70 sm:size-9"
        aria-label="Close full screen"
        (click)="close.emit()">
        <svg viewBox="0 0 16 16" fill="currentColor" class="size-4" aria-hidden="true">
          <path
            d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
        </svg>
      </button>
    </div>
  `,
})
export class PhotoViewer {
  readonly src = input.required<string>();
  readonly alt = input('');
  /** What the saved file is called. Composed by the parent, which has the sticker. */
  readonly filename = input('sticker.jpg');

  readonly close = output<void>();

  private readonly photo = viewChild.required<ElementRef<HTMLImageElement>>('photo');

  protected readonly scale = signal(1);
  private readonly offset = signal({ x: 0, y: 0 });
  protected readonly panning = signal(false);

  protected readonly transform = computed(() => {
    const { x, y } = this.offset();
    return `translate(${x}px, ${y}px) scale(${this.scale()})`;
  });

  /** Live pointers, so one is a drag and two are a pinch. */
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private pinchDistance = 0;

  @HostListener('window:keydown.escape')
  protected onEscape(): void {
    this.close.emit();
  }

  protected onPointerDown(event: PointerEvent): void {
    (event.target as Element).setPointerCapture?.(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pointers.size === 2) {
      this.pinchDistance = this.spread();
    }
    this.panning.set(true);
  }

  protected onPointerMove(event: PointerEvent): void {
    const previous = this.pointers.get(event.pointerId);
    if (!previous) {
      return;
    }
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.pointers.size >= 2) {
      const spread = this.spread();
      if (this.pinchDistance > 0 && spread > 0) {
        this.zoomAbout(this.midpoint(), this.scale() * (spread / this.pinchDistance));
      }
      this.pinchDistance = spread;
      return;
    }

    this.panBy(event.clientX - previous.x, event.clientY - previous.y);
  }

  protected onPointerUp(event: PointerEvent): void {
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) {
      this.pinchDistance = 0;
    }
    if (this.pointers.size === 0) {
      this.panning.set(false);
    }
  }

  protected onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.zoomAbout(
      { x: event.clientX, y: event.clientY },
      this.scale() * Math.exp(-event.deltaY * WHEEL_SENSITIVITY),
    );
  }

  protected toggleZoom(event: MouseEvent): void {
    const target = this.scale() > 1 ? MIN_SCALE : DOUBLE_TAP_SCALE;
    this.zoomAbout({ x: event.clientX, y: event.clientY }, target);
  }

  /**
   * Scales while keeping whatever is under `origin` under it.
   *
   * The image is drawn as `translate(t) scale(s)` about its own centre, so a
   * screen point sits at `C + t + s·q` for image offset `q`. Holding `q` still
   * across a scale change reduces to `t' = t + d·(1 - ratio)`, where `d` is the
   * vector from the photo's current on-screen centre to the zoom origin. Note
   * `d` is measured against the *transformed* box, which already includes `t` —
   * that is what makes the expression this short.
   *
   * Without this, zooming always creeps toward the middle and whatever is being
   * inspected slides out from under the cursor.
   */
  private zoomAbout(origin: { x: number; y: number }, wanted: number): void {
    const next = clamp(wanted, MIN_SCALE, MAX_SCALE);
    const current = this.scale();
    if (next === current) {
      return;
    }

    const box = this.photo().nativeElement.getBoundingClientRect();
    const dx = origin.x - (box.left + box.width / 2);
    const dy = origin.y - (box.top + box.height / 2);
    const ratio = next / current;
    const { x, y } = this.offset();

    this.scale.set(next);
    this.setOffset(x + dx * (1 - ratio), y + dy * (1 - ratio));
  }

  private panBy(dx: number, dy: number): void {
    const { x, y } = this.offset();
    this.setOffset(x + dx, y + dy);
  }

  /** Keeps the photo overlapping the viewport, so it cannot be flung out of sight. */
  private setOffset(x: number, y: number): void {
    if (this.scale() <= MIN_SCALE) {
      this.offset.set({ x: 0, y: 0 });
      return;
    }
    const image = this.photo().nativeElement;
    const limitX = Math.max(0, (image.offsetWidth * this.scale() - window.innerWidth) / 2);
    const limitY = Math.max(0, (image.offsetHeight * this.scale() - window.innerHeight) / 2);
    this.offset.set({ x: clamp(x, -limitX, limitX), y: clamp(y, -limitY, limitY) });
  }

  private spread(): number {
    const [a, b] = [...this.pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private midpoint(): { x: number; y: number } {
    const [a, b] = [...this.pointers.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}
