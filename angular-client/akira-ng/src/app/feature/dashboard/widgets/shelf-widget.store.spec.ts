import { TestBed } from '@angular/core/testing';
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
  let http: jasmine.SpyObj<ShelfHttpService>;

  beforeEach(() => {
    http = jasmine.createSpyObj<ShelfHttpService>('ShelfHttpService', ['getShelvesPage', 'getAllShelves', 'createShelf']);
    http.getShelvesPage.and.returnValue(
      of({
        _embedded: { shelfResponseList: [baseShelf] },
        page: { number: 0, size: 5, totalElements: 1, totalPages: 1 },
      }),
    );
    http.getAllShelves.and.returnValue(of([baseShelf]));
    http.createShelf.and.returnValue(of(baseShelf));

    TestBed.configureTestingModule({
      providers: [
        ShelfWidgetStore,
        { provide: ShelfHttpService, useValue: http },
        provideZonelessChangeDetection(),
      ],
    });

    store = TestBed.inject(ShelfWidgetStore);
    spyOn(console, 'error');
  });

  it('exposes shelves from the paged response', async () => {
    await wait(150);
    const viewModel = store.vm();
    expect(viewModel.items.length).toBe(1);
    expect(viewModel.items[0].bookCount).toBe(2);
    expect(http.getShelvesPage).toHaveBeenCalled();
  });

  it('filters shelves when a filter term is provided', async () => {
    http.getAllShelves.and.returnValue(
      of([
        baseShelf,
        { ...baseShelf, id: '2', title: 'Sci-Fi Picks', defaultShelf: false },
      ]),
    );

    store.setFilter('sci');
    await wait(150);

    expect(http.getAllShelves).toHaveBeenCalled();
    const viewModel = store.vm();
    expect(viewModel.items.length).toBe(1);
    expect(viewModel.items[0].title).toBe('Sci-Fi Picks');
  });

  it('creates a shelf and refreshes data', async () => {
    await wait(150); // allow initial load
    await store.createShelf('New Shelf');
    await wait(200);

    expect(http.createShelf).toHaveBeenCalledWith({ title: 'New Shelf' });
    expect(http.getShelvesPage).toHaveBeenCalledTimes(2);
  });

  it('surfaces errors when shelf creation fails', async () => {
    http.createShelf.and.returnValue(throwError(() => new Error('nope')));
    let threw = false;
    try {
      await store.createShelf('Broken');
    } catch {
      threw = true;
    }
    expect(threw).toBeTrue();
    expect(store.createState().error).toContain('Unable');
  });
});

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
