import { TestBed } from '@angular/core/testing';
import { createSpyObj, type SpyObj } from '../../testing/mock';
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
  let http: SpyObj<BookHttpService>;

  beforeEach(() => {
    http = createSpyObj<BookHttpService>(['getOpenLibraryBooks']);
    http.getOpenLibraryBooks.mockReturnValue(of(openLibraryResponse));

    TestBed.configureTestingModule({
      providers: [BookSearchStore, { provide: BookHttpService, useValue: http }, provideZonelessChangeDetection()],
    });

    store = TestBed.inject(BookSearchStore);
    // search() feeds a debounceTime(500) pipeline; fake timers let us flush it.
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('searches and stores results', async () => {
    await store.search('test');
    await vi.runAllTimersAsync();
    expect(store.vm().results.length).toBe(2);
  });

  it('loads more results', async () => {
    await store.search('test');
    await vi.runAllTimersAsync();
    store.loadMore();
    await vi.runAllTimersAsync();
    expect(http.getOpenLibraryBooks).toHaveBeenCalledTimes(2);
  });

  it('reports queryTooShort when query is 1 or 2 characters', async () => {
    await store.search('ab');
    await vi.runAllTimersAsync();
    expect(store.vm().queryTooShort).toBe(true);
    expect(store.vm().validationMessage).toBeTruthy();
  });

  it('does not report queryTooShort once query reaches 3 characters', async () => {
    await store.search('abc');
    await vi.runAllTimersAsync();
    expect(store.vm().queryTooShort).toBe(false);
    expect(store.vm().validationMessage).toBeNull();
  });

  it('does not fire an HTTP request for a too-short query', async () => {
    await store.search('ab');
    await vi.runAllTimersAsync();
    expect(http.getOpenLibraryBooks).not.toHaveBeenCalled();
  });

  it('clears results and does not call HTTP when query is empty', async () => {
    await store.search('test');
    await vi.runAllTimersAsync();
    http.getOpenLibraryBooks.mockClear();

    await store.search('');
    await vi.runAllTimersAsync();

    expect(http.getOpenLibraryBooks).not.toHaveBeenCalled();
    expect(store.vm().results.length).toBe(0);
    expect(store.vm().query).toBe('');
  });

  it('resets page to 0 on a new search', async () => {
    await store.search('first');
    await vi.runAllTimersAsync();
    store.loadMore();
    await vi.runAllTimersAsync();
    http.getOpenLibraryBooks.mockClear();

    await store.search('second');
    await vi.runAllTimersAsync();

    const [page] = http.getOpenLibraryBooks.mock.lastCall!;
    expect(page).toBe(0);
  });

  it('appends results when loading more', async () => {
    http.getOpenLibraryBooks
      .mockReturnValueOnce(
        of({ start: 0, num_found: 4, docs: [{ key: 'one', title: 'One', author_name: ['A'] }, { key: 'two', title: 'Two', author_name: ['B'] }] }),
      )
      .mockReturnValueOnce(
        of({ start: 2, num_found: 4, docs: [{ key: 'three', title: 'Three', author_name: ['C'] }, { key: 'four', title: 'Four', author_name: ['D'] }] }),
      );

    await store.search('test');
    await vi.runAllTimersAsync();
    store.loadMore();
    await vi.runAllTimersAsync();

    expect(store.vm().results.length).toBe(4);
  });

  it('reports canLoadMore when total exceeds current result count', async () => {
    http.getOpenLibraryBooks.mockReturnValue(
      of({ start: 0, num_found: 10, docs: [{ key: 'one', title: 'One', author_name: ['A'] }] }),
    );

    await store.search('test');
    await vi.runAllTimersAsync();

    expect(store.vm().canLoadMore).toBe(true);
  });

  it('reports canLoadMore as false when all results are loaded', async () => {
    http.getOpenLibraryBooks.mockReturnValue(
      of({ start: 0, num_found: 2, docs: [{ key: 'one', title: 'One', author_name: ['A'] }, { key: 'two', title: 'Two', author_name: ['B'] }] }),
    );

    await store.search('test');
    await vi.runAllTimersAsync();

    expect(store.vm().canLoadMore).toBe(false);
  });

  it('trims the search term before querying', async () => {
    await store.search('  trimmed  ');
    await vi.runAllTimersAsync();
    expect(http.getOpenLibraryBooks).toHaveBeenCalledWith(0, expect.any(Number), 'trimmed');
  });
});
