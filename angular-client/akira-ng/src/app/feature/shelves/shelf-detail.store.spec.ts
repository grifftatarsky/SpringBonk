import { TestBed } from '@angular/core/testing';
import { createSpyObj, type SpyObj } from '../../testing/mock';
import { provideZonelessChangeDetection } from '@angular/core';
import { ShelfDetailStore } from './shelf-detail.store';
import { ShelfHttpService } from '../../common/http/shelf-http.service';
import { BookHttpService } from '../../common/http/book-http.service';
import { of } from 'rxjs';
import { ShelfResponse } from '../../model/response/shelf-response.model';
import { BookResponse } from '../../model/response/book-response.model';
import { NotificationService } from '../../common/notification/notification.service';

const shelf: ShelfResponse = {
  id: 's1',
  title: 'Shelf One',
  createdDate: '2025-01-01T00:00:00Z',
  userId: 'u1',
  defaultShelf: false,
  books: [],
};

const book: BookResponse = {
  id: 'b1',
  title: 'Book',
  author: 'Author',
  imageURL: '',
  blurb: '',
  openLibraryId: 'bk',
  shelves: [],
};

describe('ShelfDetailStore', () => {
  let store: ShelfDetailStore;
  let shelfHttp: SpyObj<ShelfHttpService>;
  let bookHttp: SpyObj<BookHttpService>;
  let notifications: SpyObj<NotificationService>;

  beforeEach(() => {
    // The store debounces its param stream by 75ms. Fake timers make that
    // deterministic instead of racing a real sleep against it.
    vi.useFakeTimers();

    shelfHttp = createSpyObj<ShelfHttpService>(['getShelf']);
    bookHttp = createSpyObj<BookHttpService>([
      'getPagedBooksByShelfId',
      'getBooksByShelfId',
      'createBook',
      'removeBookFromShelf',
      'getOpenLibraryCoverImageUrl',
    ]);
    notifications = createSpyObj<NotificationService>(['success', 'error']);

    shelfHttp.getShelf.mockReturnValue(of(shelf));
    bookHttp.getPagedBooksByShelfId.mockReturnValue(
      of({ content: [book], page: { number: 0, size: 8, totalElements: 1, totalPages: 1 } }),
    );
    bookHttp.getBooksByShelfId.mockReturnValue(of([book, { ...book, id: 'b9', title: 'Zebra' }]));
    bookHttp.createBook.mockReturnValue(
      of({ ...book, id: 'b2', title: 'New Book' }),
    );
    bookHttp.removeBookFromShelf.mockReturnValue(of(book));
    bookHttp.getOpenLibraryCoverImageUrl.mockReturnValue('');

    TestBed.configureTestingModule({
      providers: [
        ShelfDetailStore,
        { provide: ShelfHttpService, useValue: shelfHttp },
        { provide: BookHttpService, useValue: bookHttp },
        { provide: NotificationService, useValue: notifications },
        provideZonelessChangeDetection(),
      ],
    });

    store = TestBed.inject(ShelfDetailStore);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads shelf and books on init', async () => {
    store.init('s1');
    await flush();
    expect(store.shelfVm().shelf?.title).toBe('Shelf One');
    expect(store.booksVm().items.length).toBe(1);
  });

  it('pages books on the server when no filter is active', async () => {
    store.init('s1');
    await flush();

    expect(bookHttp.getPagedBooksByShelfId).toHaveBeenCalledWith('s1', 0, 8);
    expect(bookHttp.getBooksByShelfId).not.toHaveBeenCalled();
    expect(store.booksVm().page.totalElements).toBe(1);
  });

  it('requests the next page from the server', async () => {
    store.init('s1');
    await flush();

    store.setPage('next');
    await flush();

    expect(bookHttp.getPagedBooksByShelfId).toHaveBeenCalledWith('s1', 1, 8);
  });

  // The endpoint has no search parameter, so filtering falls back to the full list.
  it('falls back to the full list when filtering', async () => {
    store.init('s1');
    await flush();

    store.setFilter('zeb');
    await flush();

    expect(bookHttp.getBooksByShelfId).toHaveBeenCalledWith('s1');
    expect(store.booksVm().items.map((b) => b.title)).toEqual(['Zebra']);
  });

  it('adds a custom book', async () => {
    store.init('s1');
    await flush();
    await store.addCustomBook({ title: 'Custom', author: 'Me', imageURL: '', blurb: '' });
    expect(bookHttp.createBook).toHaveBeenCalled();
  });
});

/** Drive past the store's 75ms debounce and settle the resulting promises. */
async function flush(): Promise<void> {
  await vi.advanceTimersByTimeAsync(200);
}
