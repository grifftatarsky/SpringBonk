import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { NotificationResponse } from '../../model/response/notification-response.model';
import { NotificationHttpService } from '../http/notification-http.service';

/**
 * Read-side store for the notification inbox (bell icon in the header).
 * Fetches from the backend on demand (panel open) and exposes a computed
 * view-model with items, loading/error state, and unread count.
 */
@Injectable({ providedIn: 'root' })
export class NotificationCenterStore {
  private readonly http = inject(NotificationHttpService);

  private readonly items = signal<NotificationResponse[]>([]);
  private readonly loading = signal(false);
  private readonly error = signal<string | null>(null);
  private readonly unreadCountSignal = signal(0);

  readonly vm = computed(() => {
    const list = this.items();
    return {
      items: list,
      loading: this.loading(),
      error: this.error(),
      unreadCount: this.unreadCountSignal(),
      hasItems: list.length > 0,
    };
  });

  /**
   * Fetch the latest notifications from the backend.
   */
  async refresh(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const items = await firstValueFrom(this.http.getMyNotifications(50));
      this.items.set(items ?? []);
      this.unreadCountSignal.set((items ?? []).filter((n) => !n.readAt).length);
    } catch (err) {
      console.error('[NotificationCenterStore] Failed to refresh', err);
      this.error.set('Unable to load notifications right now.');
    } finally {
      this.loading.set(false);
    }
  }

  /** Lightweight unread-count poll, e.g. for the header badge. */
  async refreshUnreadCount(): Promise<void> {
    try {
      const { count } = await firstValueFrom(this.http.getUnreadCount());
      this.unreadCountSignal.set(count ?? 0);
    } catch (err) {
      // Silent — bell is ambient, not critical.
      console.debug('[NotificationCenterStore] Unread count failed', err);
    }
  }

  async markRead(id: string): Promise<void> {
    // Optimistic update so the UI responds instantly.
    let wasUnread = false;
    this.items.update((list) =>
      list.map((n) => {
        if (n.id === id && !n.readAt) {
          wasUnread = true;
          return { ...n, readAt: new Date().toISOString() };
        }
        return n;
      }),
    );
    if (wasUnread) {
      this.unreadCountSignal.update((c) => Math.max(0, c - 1));
    }

    try {
      await firstValueFrom(this.http.markRead(id));
    } catch (err) {
      console.error('[NotificationCenterStore] Failed to mark read', err);
      // Revert would require snapshotting; for now just refetch on next open.
    }
  }

  async markAllRead(): Promise<void> {
    const now = new Date().toISOString();
    this.items.update((list) => list.map((n) => (n.readAt ? n : { ...n, readAt: now })));
    this.unreadCountSignal.set(0);

    try {
      await firstValueFrom(this.http.markAllRead());
    } catch (err) {
      console.error('[NotificationCenterStore] Failed to mark all read', err);
    }
  }
}
