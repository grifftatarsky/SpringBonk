import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  of,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { BookHttpService } from '../../common/http/book-http.service';
import { OpenLibraryBookResponse } from '../../model/response/open-library-book-response.model';

/**
 * Searches Open Library with a debounced, cancelable pipeline.
 *
 * Behavior:
 * - Callers push query updates via `setQuery(q)` on every keystroke.
 * - A 500ms debounce means we only fire the actual HTTP request once the
 *   user pauses typing. The 500ms keeps us well under Open Library's
 *   3 req/sec limit for identified callers.
 * - `switchMap` cancels any in-flight request when a new query arrives,
 *   so we never race and stale results never overwrite current ones.
 * - Two separate "busy" signals so the UI can show distinct states:
 *     - `typing`  — between keypress and debounce resolution ("Typing…")
 *     - `loading` — while the HTTP request is in flight ("Searching…")
 */
const DEBOUNCE_MS = 500;
const MIN_QUERY_LENGTH = 3;

@Injectable()
export class BookSearchStore {
  private readonly http = inject(BookHttpService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly query = signal('');
  private readonly pageIndex = signal(0);
  private readonly pageSize = signal(20);
  private readonly loading = signal(false);
  private readonly typing = signal(false);
  private readonly error = signal<string | null>(null);
  private readonly results = signal<OpenLibraryBookResponse[]>([]);
  private readonly total = signal(0);

  /** Raw query stream — driven by keystroke events. */
  private readonly queryInput$ = new Subject<string>();

  readonly vm = computed(() => {
    const query = this.query();
    const queryTooShort = query.length > 0 && query.length < MIN_QUERY_LENGTH;
    const typing = this.typing();
    const loading = this.loading();

    let statusLabel: string | null = null;
    if (typing) statusLabel = 'Typing…';
    else if (loading) statusLabel = 'Searching…';

    return {
      query,
      typing,
      loading,
      pending: typing || loading,
      statusLabel,
      error: this.error(),
      results: this.results(),
      total: this.total(),
      canLoadMore: this.results().length < this.total(),
      queryTooShort,
      validationMessage: queryTooShort ? 'Search requires at least 3 characters' : null,
    };
  });

  constructor() {
    this.queryInput$
      .pipe(
        tap((raw) => {
          const normalized = (raw ?? '').trim();
          this.query.set(normalized);
          this.typing.set(true);
          this.error.set(null);
          if (!normalized || normalized.length < MIN_QUERY_LENGTH) {
            // Below the minimum — clear results immediately and don't
            // bother debouncing a request we won't send.
            this.results.set([]);
            this.total.set(0);
            this.typing.set(false);
          }
        }),
        debounceTime(DEBOUNCE_MS),
        distinctUntilChanged(),
        // After debounce, reset page index for a fresh search.
        tap(() => this.pageIndex.set(0)),
        switchMap((raw) => {
          const normalized = (raw ?? '').trim();
          this.typing.set(false);
          if (!normalized || normalized.length < MIN_QUERY_LENGTH) {
            this.loading.set(false);
            return of(null);
          }
          this.loading.set(true);
          return this.http
            .getOpenLibraryBooks(this.pageIndex(), this.pageSize(), normalized)
            .pipe(
              catchError((err) => {
                console.error('[BookSearchStore] Open Library search failed', err);
                this.error.set('Unable to search Open Library right now.');
                return of(null);
              }),
            );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        this.loading.set(false);
        if (!response) {
          return;
        }
        this.total.set(response.num_found ?? 0);
        this.results.set([...response.docs]);
      });
  }

  /**
   * Push a raw query update from a keystroke. Debounces internally.
   */
  setQuery(term: string): void {
    this.queryInput$.next(term);
  }

  /**
   * Fire a search immediately — bypasses the debounce. Used when the UI
   * wants to force a refresh (e.g., retrying after an error).
   */
  async search(term: string): Promise<void> {
    this.setQuery(term);
  }

  /**
   * Fetch the next page. Not debounced — this is a deliberate action.
   */
  loadMore(): void {
    if (!this.query() || this.query().length < MIN_QUERY_LENGTH) {
      return;
    }
    this.pageIndex.update((page) => page + 1);
    this.loading.set(true);
    this.http
      .getOpenLibraryBooks(this.pageIndex(), this.pageSize(), this.query())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.total.set(response.num_found ?? 0);
          this.results.update((current) => [...current, ...response.docs]);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('[BookSearchStore] Failed to load more', err);
          this.error.set('Unable to load more results.');
          this.loading.set(false);
        },
      });
  }
}
