import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { ShelfHttpService } from '../../common/http/shelf-http.service';
import { ShelfResponse } from '../../model/response/shelf-response.model';
import { BookHttpService } from '../../common/http/book-http.service';
import { BookResponse } from '../../model/response/book-response.model';
import { PaginatedResult, PaginationQuery } from '../../model/type/pagination';
import { paginateArray } from '../../common/util/pagination.util';
import { OpenLibraryBookResponse } from '../../model/response/open-library-book-response.model';
import { BookRequest } from '../../model/request/book-request.model';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../common/notification/notification.service';

@Injectable()
export class ShelfDetailStore {
  private readonly shelfHttp = inject(ShelfHttpService);
  private readonly bookHttp = inject(BookHttpService);
  private readonly notifications = inject(NotificationService);

  private readonly shelfId = signal<string>('');
  private readonly shelf = signal<ShelfResponse | null>(null);
  private readonly shelfLoading = signal(false);
  private readonly shelfError = signal<string | null>(null);

  private readonly allBooks = signal<BookResponse[]>([]);
  private readonly booksLoading = signal(false);
  private readonly booksError = signal<string | null>(null);

  private readonly pageIndex = signal(0);
  private readonly pageSize = signal(8);
  private readonly filterTerm = signal('');

  constructor() {
    effect(() => {
      const id = this.shelfId();
      if (!id) {
        return;
      }
      this.fetchShelf(id);
      this.fetchBooks(id);
    });
  }

  readonly shelfVm = computed(() => ({
    shelf: this.shelf(),
    loading: this.shelfLoading(),
    error: this.shelfError(),
  }));

  private readonly booksResult = computed<PaginatedResult<BookResponse>>(() => {
    const books = this.allBooks();
    const query: PaginationQuery = {
      page: this.pageIndex(),
      size: this.pageSize(),
    };
    const filter = this.filterTerm().trim().toLowerCase();
    const filtered = filter
      ? books.filter((book) => book.title.toLowerCase().includes(filter) || book.author.toLowerCase().includes(filter))
      : books;
    return paginateArray(filtered, query);
  });

  readonly booksVm = computed(() => ({
    items: this.booksResult().items,
    page: this.booksResult().page,
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

    this.allBooks.update((books) => [placeholder, ...books]);
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
      this.allBooks.update((books) => books.map((book) => (book.id === tempId ? created : book)));
      this.notifications.success('Book added to shelf');
    } catch (error) {
      console.error('[ShelfDetailStore] Failed to add book from Open Library', error);
      this.allBooks.update((books) => books.filter((book) => book.id !== tempId));
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

    this.allBooks.update((books) => [placeholder, ...books]);
    this.pageIndex.set(0);

    try {
      const request: BookRequest = {
        ...form,
        openLibraryId: '',
        shelfIds: [shelfId],
      };
      const created = await firstValueFrom(this.bookHttp.createBook(request));
      this.allBooks.update((books) => books.map((book) => (book.id === tempId ? created : book)));
      this.notifications.success('Book added to shelf');
    } catch (error) {
      console.error('[ShelfDetailStore] Failed to add custom book', error);
      this.allBooks.update((books) => books.filter((book) => book.id !== tempId));
      this.notifications.error('Unable to add book right now.');
      throw error;
    }
  }

  async removeBook(bookId: string): Promise<void> {
    const shelfId = this.shelfId();
    if (!shelfId) {
      return;
    }
    const snapshot = this.allBooks();
    this.allBooks.update((books) => books.filter((book) => book.id !== bookId));
    try {
      await firstValueFrom(this.bookHttp.removeBookFromShelf(bookId, shelfId));
      this.notifications.success('Book removed from shelf');
    } catch (error) {
      console.error('[ShelfDetailStore] Failed to remove book', error);
      this.allBooks.set(snapshot);
      this.notifications.error('Unable to remove book right now.');
      throw error;
    }
  }

  refresh(): void {
    const id = this.shelfId();
    if (id) {
      this.fetchBooks(id);
    }
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

  private async fetchBooks(id: string): Promise<void> {
    this.booksLoading.set(true);
    this.booksError.set(null);
    try {
      const books = await firstValueFrom(this.bookHttp.getBooksByShelfId(id));
      this.allBooks.set(books);
    } catch (error) {
      console.error('[ShelfDetailStore] Failed to load shelf books', error);
      this.booksError.set('Unable to load books for this shelf.');
      this.allBooks.set([]);
    } finally {
      this.booksLoading.set(false);
    }
  }
}
