import { computed, inject, Injectable, signal } from '@angular/core';
import { BookHttpService } from '../../common/http/book-http.service';
import { OpenLibraryBookResponse } from '../../model/response/open-library-book-response.model';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class BookSearchStore {
  private readonly http = inject(BookHttpService);

  private readonly query = signal('');
  private readonly pageIndex = signal(0);
  private readonly pageSize = signal(20);
  private readonly loading = signal(false);
  private readonly error = signal<string | null>(null);
  private readonly results = signal<OpenLibraryBookResponse[]>([]);
  private readonly total = signal(0);

  readonly vm = computed(() => ({
    query: this.query(),
    loading: this.loading(),
    error: this.error(),
    results: this.results(),
    total: this.total(),
    canLoadMore: this.results().length < this.total(),
  }));

  async search(term: string): Promise<void> {
    const normalized = term.trim();
    this.query.set(normalized);
    this.pageIndex.set(0);
    this.results.set([]);
    this.total.set(0);
    if (!normalized) {
      return;
    }
    await this.fetch();
  }

  async loadMore(): Promise<void> {
    if (!this.query()) {
      return;
    }
    this.pageIndex.update((page) => page + 1);
    await this.fetch(true);
  }

  private async fetch(append = false): Promise<void> {
    const query = this.query();
    if (!query) {
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await firstValueFrom(
        this.http.getOpenLibraryBooks(this.pageIndex(), this.pageSize(), query),
      );
      this.total.set(response.num_found ?? 0);
      this.results.update((current) =>
        append ? [...current, ...response.docs] : [...response.docs],
      );
    } catch (error) {
      console.error('[BookSearchStore] Failed to search Open Library', error);
      this.error.set('Unable to search Open Library.');
    } finally {
      this.loading.set(false);
    }
  }
}
