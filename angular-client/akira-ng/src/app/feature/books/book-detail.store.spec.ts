import { TestBed } from '@angular/core/testing';
import { createSpyObj, type SpyObj } from '../../testing/mock';
import { provideZonelessChangeDetection } from '@angular/core';
import { BookDetailStore } from './book-detail.store';
import { BookHttpService } from '../../common/http/book-http.service';
import { BookStatusHttpService } from '../../common/http/book-status-http.service';
import { ReviewHttpService } from '../../common/http/review-http.service';
import { ShelfHttpService } from '../../common/http/shelf-http.service';
import { NotificationService } from '../../common/notification/notification.service';
import { of, throwError } from 'rxjs';
import { BookResponse } from '../../model/response/book-response.model';
import { ShelfResponse } from '../../model/response/shelf-response.model';

const shelfA: ShelfResponse = {
  id: 's1',
  title: 'Backlog',
  createdDate: '2025-01-01T00:00:00Z',
  userId: 'u1',
  defaultShelf: true,
  books: [],
};
const shelfB: ShelfResponse = { ...shelfA, id: 's2', title: 'Favourites', defaultShelf: false };

describe('BookDetailStore', () => {
  let store: BookDetailStore;
  let http: SpyObj<BookHttpService>;
  let statusHttp: SpyObj<BookStatusHttpService>;
  let reviewHttp: SpyObj<ReviewHttpService>;
  let shelfHttp: SpyObj<ShelfHttpService>;
  let notifications: SpyObj<NotificationService>;

  const book: BookResponse = {
    id: '1',
    title: 'Demo',
    author: 'Tester',
    imageURL: '',
    blurb: '',
    openLibraryId: '',
    shelves: [],
  };

  beforeEach(() => {
    http = createSpyObj<BookHttpService>(['getBookById', 'addBookToShelf', 'removeBookFromShelf']);
    http.getBookById.mockReturnValue(of(book));
    http.addBookToShelf.mockImplementation((_bookId: string, shelfId: string) =>
      of({ ...book, shelves: [{ id: shelfId, title: 'Backlog', userId: 'u1', defaultShelf: true }] }),
    );
    http.removeBookFromShelf.mockReturnValue(of({ ...book, shelves: [] }));

    shelfHttp = createSpyObj<ShelfHttpService>(['getAllShelves']);
    shelfHttp.getAllShelves.mockReturnValue(of([shelfA, shelfB]));

    notifications = createSpyObj<NotificationService>(['success', 'error']);

    // load() resolves the book and the caller's status together.
    statusHttp = createSpyObj<BookStatusHttpService>(['getMyStatus']);
    statusHttp.getMyStatus.mockReturnValue(of(null));

    // load() then kicks off a non-blocking loadReviews().
    reviewHttp = createSpyObj<ReviewHttpService>(['getReviewsForBook']);
    reviewHttp.getReviewsForBook.mockReturnValue(
      of({ content: [], page: { number: 0, size: 20, totalElements: 0, totalPages: 1 } }),
    );

    TestBed.configureTestingModule({
      providers: [
        BookDetailStore,
        { provide: BookHttpService, useValue: http },
        { provide: BookStatusHttpService, useValue: statusHttp },
        { provide: ReviewHttpService, useValue: reviewHttp },
        { provide: ShelfHttpService, useValue: shelfHttp },
        { provide: NotificationService, useValue: notifications },
        provideZonelessChangeDetection(),
      ],
    });

    store = TestBed.inject(BookDetailStore);
  });

  it('loads book details', async () => {
    await store.load('1');
    expect(store.vm().book?.title).toBe('Demo');
  });

  describe('shelf membership', () => {
    it('flags which shelves the book is already on', async () => {
      http.getBookById.mockReturnValue(
        of({ ...book, shelves: [{ id: 's2', title: 'Favourites', userId: 'u1', defaultShelf: false }] }),
      );
      await store.load('1');
      await store.loadShelves();

      const vm = store.shelvesVm();
      expect(vm.items.map((s) => s.id)).toEqual(['s1', 's2']);
      expect(vm.items.find((s) => s.id === 's2')?.onShelf).toBe(true);
      expect(vm.items.find((s) => s.id === 's1')?.onShelf).toBe(false);
      expect(vm.selectedCount).toBe(1);
    });

    it('adds the book to a shelf and reflects it in the view model', async () => {
      await store.load('1');
      await store.loadShelves();

      await store.setShelfMembership('s1', true);

      expect(http.addBookToShelf).toHaveBeenCalledWith('1', 's1');
      expect(store.shelvesVm().items.find((s) => s.id === 's1')?.onShelf).toBe(true);
      expect(notifications.success).toHaveBeenCalledWith('Added to Backlog');
    });

    it('removes the book from a shelf', async () => {
      http.getBookById.mockReturnValue(
        of({ ...book, shelves: [{ id: 's1', title: 'Backlog', userId: 'u1', defaultShelf: true }] }),
      );
      await store.load('1');
      await store.loadShelves();

      await store.setShelfMembership('s1', false);

      expect(http.removeBookFromShelf).toHaveBeenCalledWith('1', 's1');
      expect(store.shelvesVm().items.find((s) => s.id === 's1')?.onShelf).toBe(false);
    });

    it('rolls the chip back when the request fails', async () => {
      await store.load('1');
      await store.loadShelves();
      http.addBookToShelf.mockReturnValue(throwError(() => new Error('boom')));
      vi.spyOn(console, 'error').mockImplementation(() => undefined);

      await store.setShelfMembership('s1', true);

      expect(store.shelvesVm().items.find((s) => s.id === 's1')?.onShelf).toBe(false);
      expect(notifications.error).toHaveBeenCalled();
    });

    it('ignores a toggle for a shelf that is not loaded', async () => {
      await store.load('1');
      await store.loadShelves();

      await store.setShelfMembership('nope', true);

      expect(http.addBookToShelf).not.toHaveBeenCalled();
    });
  });
});
