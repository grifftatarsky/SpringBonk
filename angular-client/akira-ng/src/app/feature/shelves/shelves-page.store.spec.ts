import { TestBed } from '@angular/core/testing';
import { createSpyObj, type SpyObj } from '../../testing/mock';
import { provideZonelessChangeDetection } from '@angular/core';
import { ShelvesPageStore } from './shelves-page.store';
import { ShelfHttpService } from '../../common/http/shelf-http.service';
import { of } from 'rxjs';
import { ShelfResponse } from '../../model/response/shelf-response.model';

const shelfFactory = (id: string, title: string): ShelfResponse => ({
  id,
  title,
  createdDate: '2025-01-01T00:00:00Z',
  userId: 'user-1',
  defaultShelf: false,
  books: [],
});

describe('ShelvesPageStore', () => {
  let store: ShelvesPageStore;
  let http: SpyObj<ShelfHttpService>;

  beforeEach(() => {
    // The store debounces its param stream by 75ms. Fake timers make that
    // deterministic instead of racing a real sleep against it.
    vi.useFakeTimers();

    http = createSpyObj<ShelfHttpService>(['getShelvesPage', 'getAllShelves']);
    http.getShelvesPage.mockReturnValue(
      of({
        _embedded: { shelfResponseList: [shelfFactory('1', 'Alpha')] },
        page: { number: 0, size: 8, totalElements: 1, totalPages: 1 },
      }),
    );
    http.getAllShelves.mockReturnValue(of([shelfFactory('2', 'Bravo'), shelfFactory('3', 'Charlie')]));

    TestBed.configureTestingModule({
      providers: [
        ShelvesPageStore,
        { provide: ShelfHttpService, useValue: http },
        provideZonelessChangeDetection(),
      ],
    });

    store = TestBed.inject(ShelvesPageStore);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('maps shelves from paged response', async () => {
    await flush();
    expect(store.vm().items.length).toBe(1);
    expect(store.vm().items[0].title).toBe('Alpha');
  });

  it('uses full list when filtering', async () => {
    store.setFilter('br');
    await flush();
    expect(http.getAllShelves).toHaveBeenCalled();
    expect(store.vm().items[0].title).toBe('Bravo');
  });
});

/** Drive past the store's 75ms debounce and settle the resulting promises. */
async function flush(): Promise<void> {
  await vi.advanceTimersByTimeAsync(200);
}
