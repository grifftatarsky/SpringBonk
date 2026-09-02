import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { StickerService } from './sticker.service';
import type { Sticker } from './sticker.models';

/**
 * One sticker, opened: the photo, who put it there, when, what they said, and —
 * if it is yours — how to change or remove it.
 *
 * A sidebar rather than a floating card, because opening a sticker also drives
 * the camera down to the street it was taken on. The panel is the place you read
 * it; the map beside it is the place you are.
 *
 * Deleting asks first, inline. A native confirm would drop the photo out of view
 * at the exact moment somebody is deciding whether they meant it.
 */
@Component({
  selector: 'jpss-sticker-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  host: { class: 'contents' },
  template: `
    <section class="flex h-full flex-col overflow-hidden" aria-labelledby="jpss-sidebar-title">
      <header class="flex items-start justify-between gap-2 border-b border-rule px-4 py-3">
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-fg" id="jpss-sidebar-title">
            {{ sticker().authorName }}
          </p>
          <p class="truncate text-xs text-fg-subtle">
            {{ sticker().createdAt | date: 'mediumDate' }}
            @if (sticker().place) {
              <span aria-hidden="true"> · </span>{{ sticker().place }}
            }
          </p>
        </div>
        <button
          type="button"
          class="-mr-2 -mt-1 grid size-11 shrink-0 sm:-mr-1 sm:-mt-0.5 sm:size-7 place-items-center rounded-md text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
          aria-label="Close sticker and return to the globe"
          (click)="dismiss.emit()">
          <svg viewBox="0 0 16 16" fill="currentColor" class="size-4 sm:size-3.5" aria-hidden="true">
            <path
              d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
          </svg>
        </button>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto">
        <!-- The thumbnail the globe never needed sits behind the full image,
             blurred, so the panel is never briefly empty on a slow connection.
             Aspect ratio comes from the stored dimensions, so nothing reflows
             when the photo lands. -->
        <div
          class="relative max-h-[34dvh] bg-bg-sunk bg-cover bg-center sm:max-h-[26rem]"
          [style.aspect-ratio]="aspectRatio()"
          [style.background-image]="placeholder()">
          <div class="absolute inset-0 backdrop-blur-xl"></div>
          <img
            class="absolute inset-0 size-full object-cover transition-opacity duration-300"
            [class.opacity-0]="!loaded()"
            [src]="imageUrl()"
            [alt]="'Sticker by ' + sticker().authorName + ': ' + sticker().comment"
            decoding="async"
            (load)="loaded.set(true)" />
        </div>

        <div class="px-4 py-4">
          <p class="text-sm leading-relaxed whitespace-pre-wrap text-fg">{{ sticker().comment }}</p>
          <p class="mt-3 font-mono text-[0.7rem] tabular-nums text-fg-subtle">{{ coordinates() }}</p>
        </div>
      </div>

      @if (owned()) {
        <div class="border-t border-rule px-4 py-3">
          @if (confirming()) {
            <p class="text-xs text-fg-muted">Delete this sticker for good?</p>
            <div class="mt-2 flex gap-2">
              <button
                type="button"
                class="rounded-md bg-danger inline-flex min-h-11 items-center justify-center px-4 text-sm font-semibold sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs text-danger-fg transition hover:opacity-90 disabled:opacity-60"
                [disabled]="busy()"
                (click)="confirmDelete()">
                {{ busy() ? 'Deleting…' : 'Delete' }}
              </button>
              <button
                type="button"
                class="rounded-md border border-rule inline-flex min-h-11 items-center justify-center px-4 text-sm font-semibold sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs text-fg transition hover:bg-bg-subtle"
                [disabled]="busy()"
                (click)="confirming.set(false)">
                Keep it
              </button>
            </div>
          } @else {
            <div class="flex gap-2">
              <button
                type="button"
                class="rounded-md border border-rule inline-flex min-h-11 items-center justify-center px-4 text-sm font-semibold sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs text-fg transition hover:bg-bg-subtle"
                (click)="edit.emit(sticker())">
                Edit
              </button>
              <button
                type="button"
                class="rounded-md inline-flex min-h-11 items-center justify-center px-4 text-sm font-semibold sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs text-danger transition hover:bg-danger-subtle"
                (click)="confirming.set(true)">
                Delete
              </button>
            </div>
          }
        </div>
      }
    </section>
  `,
})
export class StickerSidebar {
  private readonly service = inject(StickerService);

  readonly sticker = input.required<Sticker>();

  readonly dismiss = output<void>();
  readonly edit = output<Sticker>();
  readonly remove = output<Sticker>();

  protected readonly confirming = signal(false);
  protected readonly busy = signal(false);
  protected readonly loaded = signal(false);

  protected readonly owned = computed(() => this.service.owns(this.sticker()));
  protected readonly imageUrl = computed(() => this.service.imageUrl(this.sticker()));
  protected readonly placeholder = computed(
    () => `url("${this.service.imageUrl(this.sticker(), 'thumb')}")`,
  );

  protected readonly aspectRatio = computed(() => {
    const { imageWidth, imageHeight } = this.sticker();
    return imageWidth > 0 && imageHeight > 0 ? `${imageWidth} / ${imageHeight}` : '4 / 3';
  });

  protected readonly coordinates = computed(() => {
    const { latitude, longitude } = this.sticker();
    const ns = latitude >= 0 ? 'N' : 'S';
    const ew = longitude >= 0 ? 'E' : 'W';
    return `${Math.abs(latitude).toFixed(4)}° ${ns}, ${Math.abs(longitude).toFixed(4)}° ${ew}`;
  });

  protected confirmDelete(): void {
    this.busy.set(true);
    this.remove.emit(this.sticker());
  }
}
