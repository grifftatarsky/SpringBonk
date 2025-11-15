import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { BookDetailStore } from './book-detail.store';
import { BookHttpService } from '../../common/http/book-http.service';
import { of } from 'rxjs';
import { BookResponse } from '../../model/response/book-response.model';

describe('BookDetailStore', () => {
  let store: BookDetailStore;
  let http: jasmine.SpyObj<BookHttpService>;

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
    http = jasmine.createSpyObj<BookHttpService>('BookHttpService', ['getBookById']);
    http.getBookById.and.returnValue(of(book));

    TestBed.configureTestingModule({
      providers: [BookDetailStore, { provide: BookHttpService, useValue: http }, provideZonelessChangeDetection()],
    });

    store = TestBed.inject(BookDetailStore);
  });

  it('loads book details', async () => {
    await store.load('1');
    expect(store.vm().book?.title).toBe('Demo');
  });
});
