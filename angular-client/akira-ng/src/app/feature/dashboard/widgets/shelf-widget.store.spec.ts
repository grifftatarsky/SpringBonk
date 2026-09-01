import { TestBed } from '@angular/core/testing';
import { createSpyObj, type SpyObj } from '../../../testing/mock';
import { provideZonelessChangeDetection } from '@angular/core';
import { ShelfWidgetStore } from './shelf-widget.store';
import { ShelfHttpService } from '../../../common/http/shelf-http.service';
import { of, throwError } from 'rxjs';
import { ShelfResponse } from '../../../model/response/shelf-response.model';

const baseShelf: ShelfResponse = {
  id: '1',
  title: 'Backlog',
  createdDate: '2024-01-01T00:00:00Z',
  userId: 'user-1',
  defaultShelf: true,
  books: [
    { id: 'b1', title: 'Book 1', author: 'Author', imageURL: '', blurb: '', openLibraryId: 'ol1' },
    { id: 'b2', title: 'Book 2', author: 'Author', imageURL: '', blurb: '', openLibraryId: 'ol2' },
  ],
};

describe('ShelfWidgetStore', () => {
  let store: ShelfWidgetStore;
  let http: SpyObj<ShelfHttpService>;

  beforeEach(() => {
    // The store debounces its param stream by 75ms. Fake timers make that
    // deterministic instead of racing a real sleep against it.
    vi.useFakeTimers();

    http = createSpyObj<ShelfHttpService>(['getShelvesPage', 'getAllShelves', 'createShelf']);
    http.getShelvesPage.mockReturnValue(
      of({
        _embedded: { shelfResponseList: [baseShelf] },
        page: { number: 0, size: 5, totalElements: 1, totalPages: 1 },
      }),
    );
    http.getAllShelves.mockReturnValue(of([baseShelf]));
    http.createShelf.mockReturnValue(of(baseShelf));

    TestBed.configureTestingModule({
      providers: [
        ShelfWidgetStore,
        { provide: ShelfHttpService, useValue: http },
        provideZonelessChangeDetection(),
      ],
    });

    store = TestBed.inject(ShelfWidgetStore);
    vi.spyOn(console, 'error');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exposes shelves from the paged response', async () => {
    await flush();
    const viewModel = store.vm();
    expect(viewModel.items.length).toBe(1);
    expect(viewModel.items[0].bookCount).toBe(2);
    expect(http.getShelvesPage).toHaveBeenCalled();
  });

  it('filters shelves when a filter term is provided', async () => {
    http.getAllShelves.mockReturnValue(
      of([
        baseShelf,
        { ...baseShelf, id: '2', title: 'Sci-Fi Picks', defaultShelf: false },
      ]),
    );

    store.setFilter('sci');
    await flush();

    expect(http.getAllShelves).toHaveBeenCalled();
    const viewModel = store.vm();
    expect(viewModel.items.length).toBe(1);
    expect(viewModel.items[0].title).toBe('Sci-Fi Picks');
  });

  it('creates a shelf and refreshes data', async () => {
    await flush(); // allow initial load
    await store.createShelf('New Shelf');
    await flush();

    expect(http.createShelf).toHaveBeenCalledWith({ title: 'New Shelf' });
    expect(http.getShelvesPage).toHaveBeenCalledTimes(2);
  });

  it('surfaces errors when shelf creation fails', async () => {
    http.createShelf.mockReturnValue(throwError(() => new Error('nope')));
    let threw = false;
    try {
      await store.createShelf('Broken');
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
    expect(store.createState().error).toContain('Unable');
  });
});

/** Drive past the store's 75ms debounce and settle the resulting promises. */
async function flush(): Promise<void> {
  await vi.advanceTimersByTimeAsync(200);
}
