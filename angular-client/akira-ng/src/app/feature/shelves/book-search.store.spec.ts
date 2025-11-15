import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { BookSearchStore } from './book-search.store';
import { BookHttpService } from '../../common/http/book-http.service';
import { of } from 'rxjs';

const openLibraryResponse = {
  start: 0,
  num_found: 2,
  docs: [
    { key: 'one', title: 'One', author_name: ['Author'] },
    { key: 'two', title: 'Two', author_name: ['Writer'] },
  ],
};

describe('BookSearchStore', () => {
  let store: BookSearchStore;
  let http: jasmine.SpyObj<BookHttpService>;

  beforeEach(() => {
    http = jasmine.createSpyObj<BookHttpService>('BookHttpService', ['getOpenLibraryBooks']);
    http.getOpenLibraryBooks.and.returnValue(of(openLibraryResponse));

    TestBed.configureTestingModule({
      providers: [BookSearchStore, { provide: BookHttpService, useValue: http }, provideZonelessChangeDetection()],
    });

    store = TestBed.inject(BookSearchStore);
  });

  it('searches and stores results', async () => {
    await store.search('test');
    expect(store.vm().results.length).toBe(2);
  });

  it('loads more results', async () => {
    await store.search('test');
    await store.loadMore();
    expect(http.getOpenLibraryBooks).toHaveBeenCalledTimes(2);
  });
});
