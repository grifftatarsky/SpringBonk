import { TestBed } from '@angular/core/testing';
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
  let http: jasmine.SpyObj<ShelfHttpService>;

  beforeEach(() => {
    http = jasmine.createSpyObj<ShelfHttpService>('ShelfHttpService', ['getShelvesPage', 'getAllShelves']);
    http.getShelvesPage.and.returnValue(
      of({
        _embedded: { shelfResponseList: [shelfFactory('1', 'Alpha')] },
        page: { number: 0, size: 8, totalElements: 1, totalPages: 1 },
      }),
    );
    http.getAllShelves.and.returnValue(of([shelfFactory('2', 'Bravo'), shelfFactory('3', 'Charlie')]));

    TestBed.configureTestingModule({
      providers: [
        ShelvesPageStore,
        { provide: ShelfHttpService, useValue: http },
        provideZonelessChangeDetection(),
      ],
    });

    store = TestBed.inject(ShelvesPageStore);
  });

  it('maps shelves from paged response', async () => {
    await wait();
    expect(store.vm().items.length).toBe(1);
    expect(store.vm().items[0].title).toBe('Alpha');
  });

  it('uses full list when filtering', async () => {
    store.setFilter('br');
    await wait();
    expect(http.getAllShelves).toHaveBeenCalled();
    expect(store.vm().items[0].title).toBe('Bravo');
  });
});

function wait(ms: number = 120): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
