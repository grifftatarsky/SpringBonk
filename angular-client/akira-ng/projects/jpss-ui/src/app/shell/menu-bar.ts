import { Theme } from '../shared/theme';
import { stickerLabel } from '../stickers/sticker.models';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { BASEMAPS } from '../map/basemap';
import { LAYER_GROUPS } from '../map/layer-groups';
import type { GroupVisibility, LayerGroupId } from '../map/layer-groups';
import type { Sticker } from '../stickers/sticker.models';

/**
 * The one piece of chrome the globe always shows: who you are, and a "…" that
 * holds everything else.
 *
 * Signed out it reads `Login  ⋯`; signed in, `Hi, name  ⋯` over a `+`. Every map tool
 * — basemap, the six detail toggles, the spin — lives behind the "…" rather than
 * in panels of its own, because on this app they are a garnish. The globe and
 * the photos on it are the product.
 */
@Component({
  selector: 'jpss-menu-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  host: { class: 'contents' },
  template: `
    <!-- Closes the menu on any click that is not inside it. Rendered only while
         open, so it never intercepts a click on the globe. -->
    @if (open()) {
      <button
        type="button"
        class="pointer-events-auto fixed inset-0 z-30 cursor-default"
        aria-hidden="true"
        tabindex="-1"
        (click)="close()"></button>
    }

    <div class="pointer-events-auto absolute right-3 top-3 z-40 flex flex-col items-end gap-2">
      <div
        class="flex items-center gap-1 rounded-full border border-rule bg-bg/85 p-1 pl-1 shadow-lg backdrop-blur-md">
        @if (!authChecked()) {
          <span class="px-3 py-1 text-sm text-fg-subtle">Checking…</span>
        } @else if (username(); as name) {
          <!-- The ch unit is the advance of "0", so 16ch is about sixteen
               characters of
               name before the ellipsis — wide enough for nearly every username,
               and it degrades to a truncation rather than pushing the ⋯ button
               off a narrow screen. The greeting is short enough to keep at
               every width now. -->
          <span class="flex min-w-0 items-center gap-1 px-3 py-1 text-sm text-fg">
            <span class="shrink-0">Hi,</span>
            <span class="min-w-0 max-w-[16ch] truncate font-semibold">{{ name }}</span>
          </span>
        } @else {
          <button
            type="button"
            class="rounded-full px-3 py-1 text-sm font-semibold text-accent transition-colors hover:bg-accent-subtle"
            (click)="login.emit()">
            Login
          </button>
        }

        <button
          type="button"
          class="grid size-10 shrink-0 place-items-center rounded-full text-fg transition-colors hover:bg-bg-subtle sm:size-8"
          aria-haspopup="menu"
          aria-label="Globe tools"
          [attr.aria-expanded]="open()"
          [attr.aria-controls]="panelId"
          (click)="toggle()">
          <svg viewBox="0 0 16 16" fill="currentColor" class="size-4" aria-hidden="true">
            <path
              d="M3.5 8a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm6 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm4.5 1.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
          </svg>
        </button>
      </div>

      <!-- Add is the one action worth a permanent target rather than two taps
           through the ⋯ menu, where it also still lives. Same glass treatment as
           the pill above it so the two read as one cluster. -->
      @if (signedIn()) {
        <button
          type="button"
          class="grid size-10 shrink-0 place-items-center rounded-full border border-rule bg-bg/85 text-accent shadow-lg backdrop-blur-md transition-colors hover:bg-accent-subtle sm:size-9"
          aria-label="Add a sticker"
          (click)="addSticker.emit()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round" class="size-5 sm:size-4" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      }

      @if (open()) {
        <div
          class="z-40 w-72 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-rule bg-bg/95 shadow-2xl backdrop-blur-md"
          role="menu"
          aria-label="Globe tools"
          [attr.id]="panelId">
          <div class="max-h-[calc(100dvh-9rem)] overflow-y-auto">
            <!-- ACTIONS -->
            <div class="p-1.5">
              @if (signedIn()) {
                <button
                  type="button"
                  role="menuitem"
                  class="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-fg transition-colors hover:bg-bg-subtle sm:min-h-0"
                  (click)="pick(addSticker)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                       stroke-linecap="round" stroke-linejoin="round" class="size-4 text-accent" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Add a sticker
                </button>
              } @else {
                <button
                  type="button"
                  role="menuitem"
                  class="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-fg transition-colors hover:bg-bg-subtle sm:min-h-0"
                  (click)="pick(login)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                       stroke-linecap="round" stroke-linejoin="round" class="size-4 text-accent" aria-hidden="true">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
                  </svg>
                  Sign in to add a sticker
                </button>
              }

              <button
                type="button"
                role="menuitemcheckbox"
                class="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-fg transition-colors hover:bg-bg-subtle sm:min-h-0"
                [attr.aria-checked]="spinning()"
                (click)="toggleSpin.emit()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                     stroke-linecap="round" stroke-linejoin="round" class="size-4 text-fg-muted" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
                </svg>
                {{ spinning() ? 'Stop spinning' : 'Spin the globe' }}
              </button>

              <button
                type="button"
                role="menuitem"
                class="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-fg transition-colors hover:bg-bg-subtle sm:min-h-0"
                (click)="pick(showGallery)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                     stroke-linecap="round" stroke-linejoin="round" class="size-4 text-fg-muted" aria-hidden="true">
                  <rect x="3" y="4" width="7" height="16" rx="1.5" />
                  <rect x="14" y="4" width="7" height="16" rx="1.5" />
                </svg>
                Browse as a gallery
              </button>

              <!-- Standalone only. Inside the host shell the header already has
                   a theme control, and two switches for one preference is worse
                   than one in the wrong place. -->
              @if (theme.standalone) {
                <button
                  type="button"
                  role="menuitemcheckbox"
                  class="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-fg transition-colors hover:bg-bg-subtle sm:min-h-0"
                  [attr.aria-checked]="theme.dark()"
                  (click)="theme.toggle()">
                  @if (theme.dark()) {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                         stroke-linecap="round" stroke-linejoin="round" class="size-4 text-fg-muted" aria-hidden="true">
                      <circle cx="12" cy="12" r="4" />
                      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                    </svg>
                    Light mode
                  } @else {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                         stroke-linecap="round" stroke-linejoin="round" class="size-4 text-fg-muted" aria-hidden="true">
                      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
                    </svg>
                    Dark mode
                  }
                </button>
              }

              <!-- Signed in only: there is nobody to reply to otherwise. -->
              @if (signedIn()) {
                <button
                  type="button"
                  role="menuitem"
                  class="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-fg transition-colors hover:bg-bg-subtle sm:min-h-0"
                  (click)="pick(requestStickers)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                       stroke-linecap="round" stroke-linejoin="round" class="size-4 text-fg-muted" aria-hidden="true">
                    <path d="M4 6h16v12H4zM4 7l8 6 8-6" />
                  </svg>
                  Request more stickers
                </button>
              }
            </div>

            <!-- YOUR STICKERS -->
            @if (signedIn()) {
              <div class="border-t border-rule p-1.5">
                <p class="px-2.5 pb-1 pt-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-fg-subtle">
                  Your stickers ({{ mine().length }})
                </p>
                @if (!mine().length) {
                  <p class="px-2.5 pb-2 text-xs text-fg-subtle">
                    None yet. Drop one and it shows up here.
                  </p>
                } @else {
                  <ul class="max-h-44 overflow-y-auto">
                    @for (sticker of mine(); track sticker.id) {
                      <li>
                        <button
                          type="button"
                          role="menuitem"
                          class="flex min-h-11 w-full items-baseline justify-between gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-bg-subtle sm:min-h-0 sm:py-1.5"
                          (click)="choose(sticker)">
                          <span class="min-w-0 flex-1 truncate text-sm text-fg">
                            {{ label(sticker) }}
                          </span>
                          <span class="shrink-0 text-[0.7rem] tabular-nums text-fg-subtle">
                            {{ sticker.createdAt | date: 'MMM d' }}
                          </span>
                        </button>
                      </li>
                    }
                  </ul>
                }
              </div>
            }

            <!-- BASEMAP -->
            <div class="border-t border-rule p-2.5">
              <label class="block">
                <span class="text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-fg-subtle">
                  Basemap
                </span>
                <select
                  class="mt-1.5 min-h-11 w-full rounded-md border border-rule bg-bg-subtle px-2 py-1.5 text-base text-fg sm:min-h-0 sm:text-sm"
                  [value]="basemap()"
                  (change)="onBasemap($event)">
                  @for (option of basemaps; track option.id) {
                    <option [value]="option.id">
                      {{ option.name }}{{ option.note ? ' — ' + option.note : '' }}
                    </option>
                  }
                </select>
              </label>
            </div>

            <!-- MAP DETAIL -->
            <div class="border-t border-rule p-2.5">
              <p class="text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-fg-subtle">
                Map detail
              </p>
              <div class="mt-1.5 grid gap-0.5">
                @for (group of groups; track group.id) {
                  <label
                    class="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md px-1 py-1 text-sm transition-colors hover:bg-bg-subtle sm:min-h-0"
                    [class.cursor-default]="!countOf(group.id)"
                    [class.opacity-50]="!countOf(group.id)"
                    [title]="group.hint">
                    <input
                      type="checkbox"
                      class="size-4 accent-accent sm:size-3.5"
                      [checked]="visibility()[group.id]"
                      [disabled]="!countOf(group.id)"
                      (change)="toggleGroup.emit(group.id)" />
                    <span class="flex-1 text-fg">{{ group.name }}</span>
                    <span class="text-[0.7rem] tabular-nums text-fg-subtle">
                      {{ countOf(group.id) || 'none' }}
                    </span>
                  </label>
                }
              </div>
            </div>

            <!-- ACCOUNT -->
            @if (signedIn()) {
              <div class="border-t border-rule p-1.5">
                <button
                  type="button"
                  role="menuitem"
                  class="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg sm:min-h-0"
                  (click)="pick(logout)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                       stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                  </svg>
                  Sign out
                </button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class MenuBar {
  protected readonly theme = inject(Theme);
  protected readonly label = stickerLabel;

  readonly authChecked = input(false);
  readonly username = input<string | null>(null);
  readonly mine = input<readonly Sticker[]>([]);
  readonly basemap = input.required<string>();
  readonly visibility = input.required<GroupVisibility>();
  /** How many layers of the loaded style each group controls; 0 dims the toggle. */
  readonly groupSizes = input<Partial<Record<LayerGroupId, number>>>({});
  readonly spinning = input(false);

  readonly login = output<void>();
  readonly logout = output<void>();
  readonly addSticker = output<void>();
  readonly showGallery = output<void>();
  readonly requestStickers = output<void>();
  readonly toggleSpin = output<void>();
  readonly basemapChange = output<string>();
  readonly toggleGroup = output<LayerGroupId>();
  readonly selectSticker = output<Sticker>();

  protected readonly basemaps = BASEMAPS;
  protected readonly groups = LAYER_GROUPS;
  protected readonly panelId = 'jpss-tools-menu';
  protected readonly open = signal(false);

  protected readonly signedIn = computed(() => this.username() !== null);

  protected toggle(): void {
    this.open.update(open => !open);
  }

  protected close(): void {
    if (this.open()) this.open.set(false);
  }

  /** Menu items that navigate or open something dismiss the menu behind them. */
  protected pick(action: { emit: () => void }): void {
    this.close();
    action.emit();
  }

  protected choose(sticker: Sticker): void {
    this.close();
    this.selectSticker.emit(sticker);
  }

  protected countOf(group: LayerGroupId): number {
    return this.groupSizes()[group] ?? 0;
  }

  protected onBasemap(event: Event): void {
    this.basemapChange.emit((event.target as HTMLSelectElement).value);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.close();
  }
}
