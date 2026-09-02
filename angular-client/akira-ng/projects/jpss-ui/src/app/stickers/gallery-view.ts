import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { JpssButton } from '../shared/button';
import { StickerService } from './sticker.service';
import { formatCoordinate, stickerLabel, type Sticker } from './sticker.models';

/** How many stickers a page holds. One screen of swiping on a phone. */
const PAGE_SIZE = 12;

/** Long enough that typing a username does not filter on every keystroke. */
const SEARCH_DEBOUNCE_MS = 250;

type SortKey = 'newest' | 'oldest' | 'author';

/**
 * The wall as a gallery instead of a globe.
 *
 * A horizontal scroll-snap track rather than a carousel with its own transform
 * maths: the browser already does momentum, rubber-banding and snapping better
 * than a hand-rolled slider, and it stays keyboard- and screen-reader-navigable
 * for free. Paging sits on top of it so a thousand stickers never become a
 * thousand DOM nodes.
 */
@Component({
  selector: 'jpss-gallery-view',
  imports: [DatePipe, JpssButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <section class="jpss-gallery" aria-label="Sticker gallery">
      <!-- CONTROLS -->
      <div class="flex shrink-0 flex-wrap items-center gap-2 px-3 pt-3 sm:px-4">
        <label class="relative min-w-0 flex-1 sm:max-w-xs">
          <span class="sr-only">Search by author</span>
          <input
            type="search"
            class="min-h-11 w-full rounded-md border border-rule bg-bg-subtle px-3 text-base text-fg placeholder:text-fg-subtle sm:min-h-0 sm:py-1.5 sm:text-sm"
            placeholder="Search by author…"
            [value]="query()"
            (input)="onQuery($event)" />
        </label>

        <label class="shrink-0">
          <span class="sr-only">Sort</span>
          <select
            class="min-h-11 rounded-md border border-rule bg-bg-subtle px-2 text-base text-fg sm:min-h-0 sm:py-1.5 sm:text-sm"
            [value]="sort()"
            (change)="onSort($event)">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="author">By author</option>
          </select>
        </label>

        <button type="button" jpssButton class="shrink-0" (click)="close.emit()">Globe</button>
      </div>

      <p class="shrink-0 px-3 pt-2 text-xs text-fg-subtle sm:px-4">
        {{ matches().length }}
        {{ matches().length === 1 ? 'sticker' : 'stickers' }}
        @if (debounced()) {
          by “{{ debounced() }}”
        }
      </p>

      <!-- TRACK -->
      @if (page().length) {
        <ul class="jpss-gallery__track" role="list">
          @for (sticker of page(); track sticker.id) {
            <li class="jpss-gallery__slide">
              <figure
                class="relative flex h-full flex-col overflow-hidden rounded-xl border border-rule bg-bg">
                <div class="relative min-h-0 flex-1 bg-bg-sunk">
                  <img
                    class="absolute inset-0 size-full cursor-zoom-in object-cover"
                    [src]="service.imageUrl(sticker, 'thumb')"
                    [alt]="'Sticker by ' + sticker.authorName"
                    loading="lazy"
                    decoding="async"
                    (click)="open.emit(sticker)" />
                </div>

                <!-- Fixed height, always two rows, whether or not there is a
                     story to show. Cards that disagree about their caption
                     height make the whole track look broken as it scrolls. -->
                <figcaption
                  class="jpss-gallery__bar flex shrink-0 flex-col justify-center gap-0.5 border-t border-rule px-3">
                  <p class="flex items-baseline justify-between gap-2 text-sm">
                    <span class="truncate font-semibold text-fg">{{ sticker.authorName }}</span>
                    <span class="shrink-0 text-xs text-fg-subtle">
                      {{ sticker.createdAt | date: 'mediumDate' }}
                    </span>
                  </p>
                  <p class="flex items-center justify-between gap-2">
                    <span class="truncate font-mono text-[0.7rem] text-fg-subtle">
                      {{ where(sticker) }}
                    </span>
                    @if (sticker.comment) {
                      <button
                        type="button"
                        class="-mr-1 flex shrink-0 items-center gap-1 rounded px-1 py-0.5 text-[0.7rem] font-semibold text-accent transition-colors hover:bg-bg-subtle"
                        [attr.aria-expanded]="expandedId() === sticker.id"
                        (click)="toggle(sticker.id)">
                        Story
                        <svg viewBox="0 0 16 16" fill="currentColor" class="size-3" aria-hidden="true">
                          <path d="M8 3.5a.75.75 0 0 1 .53.22l4 4a.75.75 0 1 1-1.06 1.06L8 5.31 4.53 8.78a.75.75 0 0 1-1.06-1.06l4-4A.75.75 0 0 1 8 3.5Z" />
                        </svg>
                      </button>
                    }
                  </p>
                </figcaption>

                <!-- Slides up over the photo rather than growing the card, so
                     the track never reflows while somebody is reading. -->
                @if (sticker.comment; as story) {
                  <div
                    class="jpss-gallery__story absolute inset-0 flex flex-col bg-bg/95 backdrop-blur-md"
                    [class.jpss-gallery__story--open]="expandedId() === sticker.id"
                    [attr.aria-hidden]="expandedId() !== sticker.id">
                    <div class="flex shrink-0 items-start justify-between gap-2 px-3 pt-3">
                      <div class="min-w-0">
                        <p class="truncate text-sm font-semibold text-fg">{{ sticker.authorName }}</p>
                        <p class="truncate font-mono text-[0.7rem] text-fg-subtle">
                          {{ where(sticker) }}
                        </p>
                      </div>
                      <button
                        type="button"
                        class="-mr-1 -mt-1 grid size-9 shrink-0 place-items-center rounded-md text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
                        aria-label="Close story"
                        [attr.tabindex]="expandedId() === sticker.id ? null : -1"
                        (click)="toggle(sticker.id)">
                        <svg viewBox="0 0 16 16" fill="currentColor" class="size-3.5" aria-hidden="true">
                          <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                        </svg>
                      </button>
                    </div>
                    <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
                      <p class="text-sm leading-relaxed whitespace-pre-wrap text-fg">{{ story }}</p>
                    </div>
                  </div>
                }
              </figure>
            </li>
          }
        </ul>
      } @else {
        <div class="flex flex-1 items-center justify-center px-6 text-center">
          <p class="text-sm text-fg-muted">
            @if (debounced()) {
              Nobody called “{{ debounced() }}” has placed a sticker.
            } @else {
              Nothing on the globe yet.
            }
          </p>
        </div>
      }

      <!-- PAGER -->
      @if (pageCount() > 1) {
        <nav
          class="flex shrink-0 items-center justify-between gap-2 px-3 pb-3 pt-2 sm:px-4"
          aria-label="Gallery pages">
          <button type="button" jpssButton [disabled]="pageIndex() === 0" (click)="step(-1)">
            Previous
          </button>
          <span class="text-xs tabular-nums text-fg-muted" aria-live="polite">
            Page {{ pageIndex() + 1 }} of {{ pageCount() }}
          </span>
          <button
            type="button"
            jpssButton
            [disabled]="pageIndex() >= pageCount() - 1"
            (click)="step(1)">
            Next
          </button>
        </nav>
      }
    </section>
  `,
  styles: `
    .jpss-gallery {
      position: absolute;
      inset: 0;
      z-index: 15;
      display: flex;
      flex-direction: column;
      background-color: var(--color-bg);
    }

    /* The slider. Scroll-snap rather than a transform carousel, so momentum,
       rubber-banding and keyboard scrolling are the browser's problem. One card
       fills a phone; wider screens fit more without changing the mechanism. */
    .jpss-gallery__track {
      display: flex;
      flex: 1;
      gap: 0.75rem;
      margin: 0;
      padding: 0.75rem;
      min-height: 0;
      overflow-x: auto;
      overflow-y: hidden;
      list-style: none;
      scroll-snap-type: x mandatory;
      /* Snapping otherwise aligns a card to the scrollport edge and eats the
         padding, so the first card sits flush against the window. */
      scroll-padding-inline: 0.75rem;
      overscroll-behavior-x: contain;
    }

    .jpss-gallery__slide {
      flex: 0 0 min(85%, 22rem);
      scroll-snap-align: center;
    }

    /* One height for every caption, so the photos above them line up. */
    .jpss-gallery__bar {
      height: 3.75rem;
    }

    .jpss-gallery__story {
      transform: translateY(100%);
      visibility: hidden;
      transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1), visibility 260ms;
    }

    .jpss-gallery__story--open {
      transform: translateY(0);
      visibility: visible;
    }

    @media (prefers-reduced-motion: reduce) {
      .jpss-gallery__story {
        transition: none;
      }
    }

    @media (min-width: 640px) {
      .jpss-gallery__track {
        /* Centred and capped rather than stretched: a card that fills a desktop
           window is a column, not a photo. On a phone the full height is right,
           because there is only one card and it is the whole view. */
        align-items: center;
        padding: 1rem;
        scroll-padding-inline: 1rem;
        gap: 1rem;
      }

      .jpss-gallery__slide {
        flex-basis: 20rem;
        max-height: min(30rem, 100%);
        height: 100%;
        scroll-snap-align: start;
      }
    }
  `,
})
export class GalleryView {
  protected readonly service = inject(StickerService);
  private readonly destroyRef = inject(DestroyRef);

  readonly stickers = input.required<readonly Sticker[]>();

  readonly open = output<Sticker>();
  readonly close = output<void>();

  protected readonly query = signal('');
  /** The query the list actually filters on; trails {@link query} by a beat. */
  protected readonly debounced = signal('');
  protected readonly sort = signal<SortKey>('newest');
  protected readonly pageIndex = signal(0);
  /** Which card has its story slid up, if any. */
  protected readonly expandedId = signal<string | null>(null);

  private timer?: number;

  constructor() {
    this.destroyRef.onDestroy(() => window.clearTimeout(this.timer));
  }

  protected readonly matches = computed(() => {
    const needle = this.debounced().trim().toLowerCase();
    const found = needle
      ? this.stickers().filter(s => s.authorName.toLowerCase().includes(needle))
      : [...this.stickers()];

    switch (this.sort()) {
      case 'oldest':
        return found.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      case 'author':
        // Ties broken by date, so the order is total rather than "whatever the
        // sort happened to do with equal keys".
        return found.sort(
          (a, b) =>
            a.authorName.localeCompare(b.authorName) || b.createdAt.localeCompare(a.createdAt),
        );
      default:
        return found.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  });

  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.matches().length / PAGE_SIZE)),
  );

  protected readonly page = computed(() => {
    // Clamped rather than reset: filtering down while on page 4 should land on
    // the last page that still exists, not throw the reader back to the start.
    const index = Math.min(this.pageIndex(), this.pageCount() - 1);
    const from = index * PAGE_SIZE;
    return this.matches().slice(from, from + PAGE_SIZE);
  });

  protected onQuery(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    this.expandedId.set(null);
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      this.debounced.set(value);
      this.pageIndex.set(0);
    }, SEARCH_DEBOUNCE_MS);
  }

  protected onSort(event: Event): void {
    this.sort.set((event.target as HTMLSelectElement).value as SortKey);
    this.expandedId.set(null);
    this.pageIndex.set(0);
  }

  protected toggle(id: string): void {
    this.expandedId.update(open => (open === id ? null : id));
  }

  protected step(by: number): void {
    this.expandedId.set(null);
    this.pageIndex.update(i => Math.min(Math.max(0, i + by), this.pageCount() - 1));
  }

  protected where(sticker: Sticker): string {
    return sticker.place ?? formatCoordinate(sticker);
  }

  protected readonly label = stickerLabel;
}
