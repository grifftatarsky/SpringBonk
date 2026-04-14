import { ChangeDetectionStrategy, Component, effect, HostListener, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { NotificationCenterStore } from './notification-center.store';
import { NotificationResponse } from '../../model/response/notification-response.model';
import { UserService } from '../../auth/user.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative">
      <button
        type="button"
        class="relative inline-grid size-8 place-items-center rounded-md text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
        [attr.aria-label]="'Notifications' + (vm().unreadCount ? ', ' + vm().unreadCount + ' unread' : '')"
        [attr.aria-expanded]="panelOpen()"
        aria-haspopup="true"
        (click)="togglePanel()">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" class="size-4">
          <path
            d="M10 3.5a4.5 4.5 0 0 0-4.5 4.5v1.35c0 .46-.18.9-.5 1.23L3.5 12.1a.7.7 0 0 0 .5 1.2h12a.7.7 0 0 0 .5-1.2l-1.5-1.52a1.75 1.75 0 0 1-.5-1.23V8A4.5 4.5 0 0 0 10 3.5Z"
            stroke-linejoin="round"></path>
          <path
            d="M8 15.3v.2a2 2 0 1 0 4 0v-.2"
            stroke-linecap="round"></path>
        </svg>
        @if (vm().unreadCount > 0) {
          <span
            class="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-accent px-1 text-[0.625rem] font-bold text-accent-fg">
            {{ vm().unreadCount > 9 ? '9+' : vm().unreadCount }}
          </span>
        }
      </button>

      @if (panelOpen()) {
        <!-- Backdrop — desktop: click to close. Mobile: full-screen with bottom sheet. -->
        <div class="fixed inset-0 z-40 sm:hidden" aria-hidden="true" (click)="closePanel()"></div>

        <!-- Panel -->
        <div
          class="fixed left-0 right-0 bottom-0 z-50 flex max-h-[85vh] flex-col overflow-hidden rounded-t-lg border border-rule bg-bg shadow-xl sm:absolute sm:bottom-auto sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 sm:rounded-md"
          role="dialog"
          aria-label="Notifications">
          <header class="flex items-center justify-between border-b border-rule px-4 py-3">
            <h2 class="text-sm font-semibold tracking-tight text-fg">Notifications</h2>
            @if (vm().unreadCount > 0) {
              <button
                type="button"
                class="text-xs font-semibold text-accent transition-colors hover:underline"
                (click)="markAllRead()">
                Mark all read
              </button>
            }
          </header>

          <div class="min-h-0 flex-1 overflow-y-auto">
            @if (vm().loading) {
              <p class="p-6 text-center text-sm text-fg-muted">Loading…</p>
            } @else if (vm().error) {
              <p class="m-4 rounded-md border border-danger bg-danger-subtle px-3 py-2 text-sm text-danger">
                {{ vm().error }}
              </p>
            } @else if (!vm().hasItems) {
              <div class="flex flex-col items-center justify-center gap-1 p-8 text-center">
                <p class="font-mono text-xs text-fg-whisper">Nothing to complain about yet.</p>
                <p class="text-sm text-fg-muted">You'll see updates from elections and shelves here.</p>
              </div>
            } @else {
              <ul class="flex flex-col">
                @for (n of vm().items; track n.id) {
                  <li class="border-t border-rule first:border-t-0">
                    <button
                      type="button"
                      class="group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-subtle"
                      (click)="handleClick(n)">
                      <!-- Unread dot -->
                      <span
                        class="mt-1.5 size-2 shrink-0 rounded-full"
                        [class.bg-accent]="!n.readAt"
                        [class.bg-transparent]="n.readAt"
                        aria-hidden="true"></span>
                      <div class="min-w-0 flex-1">
                        <p class="text-sm"
                           [class.text-fg]="!n.readAt"
                           [class.text-fg-muted]="n.readAt"
                           [class.font-medium]="!n.readAt">
                          {{ n.message }}
                        </p>
                        <p class="mt-0.5 text-xs text-fg-subtle">
                          {{ relativeTime(n.createdAt) }}
                          @if (n.href) { · <span class="text-accent">Open →</span> }
                        </p>
                      </div>
                    </button>
                  </li>
                }
              </ul>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class NotificationBellComponent {
  private readonly store = inject(NotificationCenterStore);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  /** Authenticated state as a signal, so we can auto-refresh on sign-in. */
  private readonly isAuthenticated = toSignal(
    this.userService.valueChanges.pipe(map((u) => u.isAuthenticated)),
    { initialValue: this.userService.current.isAuthenticated },
  );

  protected readonly vm = this.store.vm;
  protected readonly panelOpen = signal(false);

  constructor() {
    // Fetch the unread count whenever the user becomes authenticated.
    effect(() => {
      if (this.isAuthenticated()) {
        void this.store.refreshUnreadCount();
      }
    });
  }

  togglePanel(): void {
    const next = !this.panelOpen();
    this.panelOpen.set(next);
    if (next) {
      void this.store.refresh();
    }
  }

  closePanel(): void {
    this.panelOpen.set(false);
  }

  async markAllRead(): Promise<void> {
    await this.store.markAllRead();
  }

  async handleClick(n: NotificationResponse): Promise<void> {
    await this.store.markRead(n.id);
    if (!n.href) {
      return;
    }
    this.closePanel();
    if (n.href.startsWith('/')) {
      void this.router.navigateByUrl(n.href);
    } else {
      window.open(n.href, '_blank', 'noopener,noreferrer');
    }
  }

  protected relativeTime(iso: string): string {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';
    const diffMs = Date.now() - then;
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
  }

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    if (this.panelOpen()) {
      this.closePanel();
    }
  }
}
