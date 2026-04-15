import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ActivityHttpService } from '../../common/http/activity-http.service';
import { ActivityItemResponse } from '../../model/response/activity-item-response.model';

const PAGE_SIZE = 25;

@Injectable()
export class ActivityFeedStore {
  private readonly http = inject(ActivityHttpService);

  private readonly items = signal<ActivityItemResponse[]>([]);
  private readonly loading = signal(false);
  private readonly loadingMore = signal(false);
  private readonly error = signal<string | null>(null);
  private readonly hasMore = signal(true);

  readonly vm = computed(() => ({
    items: this.items(),
    loading: this.loading(),
    loadingMore: this.loadingMore(),
    error: this.error(),
    hasMore: this.hasMore(),
    isEmpty: !this.loading() && this.items().length === 0,
  }));

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const items = await firstValueFrom(this.http.getFeed(PAGE_SIZE));
      this.items.set(items ?? []);
      this.hasMore.set((items ?? []).length === PAGE_SIZE);
    } catch (err) {
      console.error('[ActivityFeedStore] Failed to load feed', err);
      this.error.set('Unable to load the activity feed right now.');
    } finally {
      this.loading.set(false);
    }
  }

  async loadMore(): Promise<void> {
    if (this.loadingMore() || !this.hasMore()) return;
    const current = this.items();
    if (!current.length) {
      return this.load();
    }
    this.loadingMore.set(true);
    try {
      const oldest = current[current.length - 1];
      const next = await firstValueFrom(this.http.getFeed(PAGE_SIZE, oldest.occurredAt));
      if (!next || next.length === 0) {
        this.hasMore.set(false);
      } else {
        // Defensive: drop any overlap with existing items (shouldn't happen,
        // but the cursor is date-based so close-together items can alias).
        const existingIds = new Set(current.map((i) => `${i.type}:${i.occurredAt}:${i.actorId}:${i.bookId}`));
        const deduped = next.filter(
          (i) => !existingIds.has(`${i.type}:${i.occurredAt}:${i.actorId}:${i.bookId}`),
        );
        this.items.set([...current, ...deduped]);
        this.hasMore.set(next.length === PAGE_SIZE);
      }
    } catch (err) {
      console.error('[ActivityFeedStore] Failed to load more', err);
    } finally {
      this.loadingMore.set(false);
    }
  }

  async refresh(): Promise<void> {
    this.hasMore.set(true);
    await this.load();
  }
}
