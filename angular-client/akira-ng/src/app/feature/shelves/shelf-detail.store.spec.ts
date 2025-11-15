import { TestBed } from '@angular/core/testing';
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
  let shelfHttp: jasmine.SpyObj<ShelfHttpService>;
  let bookHttp: jasmine.SpyObj<BookHttpService>;
  let notifications: jasmine.SpyObj<NotificationService>;

  beforeEach(() => {
    shelfHttp = jasmine.createSpyObj<ShelfHttpService>('ShelfHttpService', ['getShelf']);
    bookHttp = jasmine.createSpyObj<BookHttpService>(
      'BookHttpService',
      ['getBooksByShelfId', 'createBook', 'removeBookFromShelf', 'getOpenLibraryCoverImageUrl'],
    );
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['success', 'error']);

    shelfHttp.getShelf.and.returnValue(of(shelf));
    bookHttp.getBooksByShelfId.and.returnValue(of([book]));
    bookHttp.createBook.and.returnValue(
      of({ ...book, id: 'b2', title: 'New Book' }),
    );
    bookHttp.removeBookFromShelf.and.returnValue(of(book));
    bookHttp.getOpenLibraryCoverImageUrl.and.returnValue('');

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

  it('loads shelf and books on init', async () => {
    store.init('s1');
    await wait();
    expect(store.shelfVm().shelf?.title).toBe('Shelf One');
    expect(store.booksVm().items.length).toBe(1);
  });

  it('adds a custom book', async () => {
    store.init('s1');
    await wait();
    await store.addCustomBook({ title: 'Custom', author: 'Me', imageURL: '', blurb: '' });
    expect(bookHttp.createBook).toHaveBeenCalled();
  });
});

function wait(ms: number = 10): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
