import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShelfWidgetComponent } from './shelf-widget.component';
import { ShelfWidgetStore, ShelfSortOption } from './shelf-widget.store';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { PageMetadata } from '../../../model/type/pagination';
import { By } from '@angular/platform-browser';
import { PaginatedListComponent } from '../../../common/ui/paginated-list/paginated-list.component';
import { provideRouter } from '@angular/router';

const basePage: PageMetadata = {
  number: 0,
  size: 5,
  totalElements: 1,
  totalPages: 1,
};

class ShelfWidgetStoreStub {
  readonly vm = signal({
    items: [
      {
        id: '1',
        title: 'Backlog',
        createdDate: '2024-01-01T00:00:00Z',
        defaultShelf: true,
        bookCount: 2,
      },
    ],
    page: basePage,
    busy: false,
    filter: '',
    error: null,
    sortField: 'title',
    sortDirection: 'asc',
    sortOptions: [
      { label: 'Title (A-Z)', field: 'title', direction: 'asc' } satisfies ShelfSortOption,
    ],
    emptyMessage: 'No shelves',
  });

  readonly sortOptions = this.vm().sortOptions;
  readonly createState = signal({ creating: false, error: null });

  readonly setFilter = jasmine.createSpy('setFilter');
  readonly setPage = jasmine.createSpy('setPage');
  readonly setPageSize = jasmine.createSpy('setPageSize');
  readonly setSort = jasmine.createSpy('setSort');
  readonly createShelf = jasmine.createSpy('createShelf').and.callFake(async () => undefined);
  readonly clearCreateError = jasmine.createSpy('clearCreateError');
}

describe('ShelfWidgetComponent', () => {
  let fixture: ComponentFixture<ShelfWidgetComponent>;
  let store: ShelfWidgetStoreStub;

  beforeEach(async () => {
    store = new ShelfWidgetStoreStub();

    await TestBed.configureTestingModule({
      imports: [ShelfWidgetComponent],
      providers: [
        { provide: ShelfWidgetStore, useValue: store },
        provideZonelessChangeDetection(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShelfWidgetComponent);
    fixture.detectChanges();
  });

  it('renders shelf items', () => {
    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Backlog');
    expect(compiled.textContent).toContain('2 books');
  });

  it('forwards filter events to the store', () => {
    const paginationComponent = fixture.debugElement
      .query(By.directive(PaginatedListComponent))
      .componentInstance as PaginatedListComponent;

    paginationComponent.filterValueChange.emit('Queue');

    expect(store.setFilter).toHaveBeenCalledWith('Queue');
  });

  it('opens the create modal and submits a new shelf', async () => {
    (fixture.componentInstance as any).controlsOpen.set(true);
    fixture.detectChanges();
    const createButton: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="open-create-shelf"]');
    createButton.click();
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('#create-shelf-name');
    input.value = 'New Shelf';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const form: HTMLFormElement = fixture.nativeElement.querySelector('[data-testid="create-shelf-form"]');
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(store.createShelf).toHaveBeenCalledWith('New Shelf');
  });
});
