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

  it('reports queryTooShort when query is 1 or 2 characters', async () => {
    await store.search('ab');
    expect(store.vm().queryTooShort).toBeTrue();
    expect(store.vm().validationMessage).toBeTruthy();
  });

  it('does not report queryTooShort once query reaches 3 characters', async () => {
    await store.search('abc');
    expect(store.vm().queryTooShort).toBeFalse();
    expect(store.vm().validationMessage).toBeNull();
  });

  it('does not fire an HTTP request for a too-short query', async () => {
    await store.search('ab');
    expect(http.getOpenLibraryBooks).not.toHaveBeenCalled();
  });

  it('clears results and does not call HTTP when query is empty', async () => {
    await store.search('test');
    http.getOpenLibraryBooks.calls.reset();

    await store.search('');

    expect(http.getOpenLibraryBooks).not.toHaveBeenCalled();
    expect(store.vm().results.length).toBe(0);
    expect(store.vm().query).toBe('');
  });

  it('resets page to 0 on a new search', async () => {
    await store.search('first');
    await store.loadMore();
    http.getOpenLibraryBooks.calls.reset();

    await store.search('second');

    const [page] = http.getOpenLibraryBooks.calls.mostRecent().args;
    expect(page).toBe(0);
  });

  it('appends results when loading more', async () => {
    http.getOpenLibraryBooks.and.returnValues(
      of({ start: 0, num_found: 4, docs: [{ key: 'one', title: 'One', author_name: ['A'] }, { key: 'two', title: 'Two', author_name: ['B'] }] }),
      of({ start: 2, num_found: 4, docs: [{ key: 'three', title: 'Three', author_name: ['C'] }, { key: 'four', title: 'Four', author_name: ['D'] }] }),
    );

    await store.search('test');
    await store.loadMore();

    expect(store.vm().results.length).toBe(4);
  });

  it('reports canLoadMore when total exceeds current result count', async () => {
    http.getOpenLibraryBooks.and.returnValue(
      of({ start: 0, num_found: 10, docs: [{ key: 'one', title: 'One', author_name: ['A'] }] }),
    );

    await store.search('test');

    expect(store.vm().canLoadMore).toBeTrue();
  });

  it('reports canLoadMore as false when all results are loaded', async () => {
    http.getOpenLibraryBooks.and.returnValue(
      of({ start: 0, num_found: 2, docs: [{ key: 'one', title: 'One', author_name: ['A'] }, { key: 'two', title: 'Two', author_name: ['B'] }] }),
    );

    await store.search('test');

    expect(store.vm().canLoadMore).toBeFalse();
  });

  it('trims the search term before querying', async () => {
    await store.search('  trimmed  ');
    expect(http.getOpenLibraryBooks).toHaveBeenCalledWith(0, jasmine.any(Number), 'trimmed');
  });
});
