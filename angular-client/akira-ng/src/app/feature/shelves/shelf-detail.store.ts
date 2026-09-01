import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ShelfHttpService } from '../../common/http/shelf-http.service';
import { ShelfResponse } from '../../model/response/shelf-response.model';
import { BookHttpService } from '../../common/http/book-http.service';
import { BookResponse } from '../../model/response/book-response.model';
import { PaginatedResult } from '../../model/type/pagination';
import { createEmptyResult, mapSpringPagedResponse, paginateArray } from '../../common/util/pagination.util';
import { OpenLibraryBookResponse } from '../../model/response/open-library-book-response.model';
import { BookRequest } from '../../model/request/book-request.model';
import { catchError, debounceTime, filter, firstValueFrom, map, of, switchMap, tap } from 'rxjs';
import { NotificationService } from '../../common/notification/notification.service';

interface ShelfBooksQuery {
  shelfId: string;
  page: number;
  size: number;
  filter: string;
  /** Bumped to force a refetch after a mutation. */
  tick: number;
}

@Injectable()
export class ShelfDetailStore {
  private readonly shelfHttp = inject(ShelfHttpService);
  private readonly bookHttp = inject(BookHttpService);
  private readonly notifications = inject(NotificationService);

  private readonly shelfId = signal<string>('');
  private readonly shelf = signal<ShelfResponse | null>(null);
  private readonly shelfLoading = signal(false);
  private readonly shelfError = signal<string | null>(null);

  private readonly result = signal<PaginatedResult<BookResponse>>(createEmptyResult<BookResponse>(8));
  private readonly booksLoading = signal(false);
  private readonly booksError = signal<string | null>(null);

  private readonly pageIndex = signal(0);
  private readonly pageSize = signal(8);
  private readonly filterTerm = signal('');
  private readonly reloadTick = signal(0);

  private readonly params = computed<ShelfBooksQuery>(() => ({
    shelfId: this.shelfId(),
    page: this.pageIndex(),
    size: this.pageSize(),
    filter: this.filterTerm(),
    tick: this.reloadTick(),
  }));

  constructor() {
    effect(() => {
      const id = this.shelfId();
      if (id) {
        this.fetchShelf(id);
      }
    });

    toObservable(this.params)
      .pipe(
        filter((params) => !!params.shelfId),
        debounceTime(75),
        tap(() => this.booksLoading.set(true)),
        switchMap((params) =>
          this.loadBooks(params).pipe(
            catchError((error) => {
              console.error('[ShelfDetailStore] Failed to load shelf books', error);
              this.booksError.set('Unable to load books for this shelf.');
              return of(createEmptyResult<BookResponse>(params.size));
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.result.set(result);
        this.booksLoading.set(false);
        if (result.items.length) {
          this.booksError.set(null);
        }
      });
  }

  /**
   * Server-paged by default. The books-by-shelf endpoint takes a Pageable with
   * no search parameter, so an active filter falls back to the full list and
   * narrows it here — the same trade the shelves and elections pages make.
   */
  private loadBooks(state: ShelfBooksQuery) {
    const term = state.filter.trim().toLowerCase();

    if (term) {
      return this.bookHttp.getBooksByShelfId(state.shelfId).pipe(
        map((books) =>
          books.filter(
            (book) =>
              book.title.toLowerCase().includes(term) || book.author.toLowerCase().includes(term),
          ),
        ),
        map((filtered) => paginateArray(filtered, state)),
      );
    }

    return this.bookHttp
      .getPagedBooksByShelfId(state.shelfId, state.page, state.size)
      .pipe(map((response) => mapSpringPagedResponse<BookResponse>(response)));
  }

  readonly shelfVm = computed(() => ({
    shelf: this.shelf(),
    loading: this.shelfLoading(),
    error: this.shelfError(),
  }));

  readonly booksVm = computed(() => ({
    items: this.result().items,
    page: this.result().page,
    loading: this.booksLoading(),
    error: this.booksError(),
    filter: this.filterTerm(),
  }));

  init(id: string): void {
    if (id && id !== this.shelfId()) {
      this.shelfId.set(id);
      this.pageIndex.set(0);
      this.filterTerm.set('');
    }
  }

  setFilter(value: string): void {
    this.pageIndex.set(0);
    this.filterTerm.set(value);
  }

  setPage(direction: 'next' | 'previous'): void {
    const current = this.pageIndex();
    this.pageIndex.set(direction === 'next' ? current + 1 : Math.max(0, current - 1));
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.pageIndex.set(0);
  }

  async addBookFromOpenLibrary(doc: OpenLibraryBookResponse, pitch: string): Promise<void> {
    const shelfId = this.shelfId();
    if (!shelfId) {
      throw new Error('Shelf not loaded');
    }

    const normalizedPitch = pitch?.trim() ?? '';
    const tempId = `tmp-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
    const placeholder: BookResponse = {
      id: tempId,
      title: doc.title || 'Untitled',
      author: doc.author_name?.[0] || 'Unknown author',
      imageURL: doc.cover_i ? this.bookHttp.getOpenLibraryCoverImageUrl(doc.cover_i, 'M') : '',
      blurb: normalizedPitch || (doc.has_fulltext ? 'Full text available via Open Library.' : ''),
      openLibraryId: doc.key?.replace('/works/', '') || doc.key || '',
      shelves: [],
    };

    this.result.update((current) => ({ ...current, items: [placeholder, ...current.items] }));
    this.pageIndex.set(0);

    try {
      const request: BookRequest = {
        title: placeholder.title,
        author: placeholder.author,
        imageURL: placeholder.imageURL,
        blurb: placeholder.blurb,
        openLibraryId: placeholder.openLibraryId,
        shelfIds: [shelfId],
      };
      const created = await firstValueFrom(this.bookHttp.createBook(request));
      this.result.update((current) => ({
        ...current,
        items: current.items.map((book) => (book.id === tempId ? created : book)),
      }));
      this.notifications.success('Book added to shelf');
      this.refresh();
    } catch (error) {
      console.error('[ShelfDetailStore] Failed to add book from Open Library', error);
      this.result.update((current) => ({
        ...current,
        items: current.items.filter((book) => book.id !== tempId),
      }));
      this.notifications.error('Unable to add book right now.');
      throw error;
    }
  }

  async addCustomBook(form: { title: string; author: string; imageURL: string; blurb: string }): Promise<void> {
    const shelfId = this.shelfId();
    if (!shelfId) {
      throw new Error('Shelf not loaded');
    }

    const tempId = `tmp-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
    const placeholder: BookResponse = {
      id: tempId,
      title: form.title,
      author: form.author,
      imageURL: form.imageURL,
      blurb: form.blurb,
      openLibraryId: '',
      shelves: [],
    };

    this.result.update((current) => ({ ...current, items: [placeholder, ...current.items] }));
    this.pageIndex.set(0);

    try {
      const request: BookRequest = {
        ...form,
        openLibraryId: '',
        shelfIds: [shelfId],
      };
      const created = await firstValueFrom(this.bookHttp.createBook(request));
      this.result.update((current) => ({
        ...current,
        items: current.items.map((book) => (book.id === tempId ? created : book)),
      }));
      this.notifications.success('Book added to shelf');
      this.refresh();
    } catch (error) {
      console.error('[ShelfDetailStore] Failed to add custom book', error);
      this.result.update((current) => ({
        ...current,
        items: current.items.filter((book) => book.id !== tempId),
      }));
      this.notifications.error('Unable to add book right now.');
      throw error;
    }
  }

  async removeBook(bookId: string): Promise<void> {
    const shelfId = this.shelfId();
    if (!shelfId) {
      return;
    }
    const snapshot = this.result();
    this.result.update((current) => ({
      ...current,
      items: current.items.filter((book) => book.id !== bookId),
    }));
    try {
      await firstValueFrom(this.bookHttp.removeBookFromShelf(bookId, shelfId));
      this.notifications.success('Book removed from shelf');
      this.refresh();
    } catch (error) {
      console.error('[ShelfDetailStore] Failed to remove book', error);
      this.result.set(snapshot);
      this.notifications.error('Unable to remove book right now.');
      throw error;
    }
  }

  async deleteShelf(): Promise<boolean> {
    const shelfId = this.shelfId();
    if (!shelfId) return false;
    try {
      await firstValueFrom(this.shelfHttp.deleteShelf(shelfId));
      this.notifications.success('Shelf deleted');
      return true;
    } catch (error) {
      console.error('[ShelfDetailStore] Failed to delete shelf', error);
      this.notifications.error('Unable to delete shelf right now.');
      return false;
    }
  }

  /** Re-runs the current query (page, size and filter unchanged). */
  refresh(): void {
    this.reloadTick.update((tick) => tick + 1);
  }

  private async fetchShelf(id: string): Promise<void> {
    this.shelfLoading.set(true);
    this.shelfError.set(null);
    try {
      const shelf = await firstValueFrom(this.shelfHttp.getShelf(id));
      this.shelf.set(shelf);
    } catch (error) {
      console.error('[ShelfDetailStore] Failed to load shelf', error);
      this.shelfError.set('Unable to load shelf.');
      this.shelf.set(null);
    } finally {
      this.shelfLoading.set(false);
    }
  }
}
