import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ElectionWidgetComponent } from './election-widget.component';
import { ElectionWidgetStore, ElectionSortOption } from './election-widget.store';
import { PaginatedListComponent } from '../../../common/ui/paginated-list/paginated-list.component';
import { By } from '@angular/platform-browser';

const sortOption: ElectionSortOption = { label: 'Title (A-Z)', field: 'title', direction: 'asc' };

class ElectionWidgetStoreStub {
  readonly vm = signal({
    items: [
      {
        id: '1',
        title: 'Monthly Pick',
        status: 'OPEN',
        statusLabel: 'Open',
        metaLabel: 'Ends',
        metaDate: '2025-11-20T00:00:00Z',
        badgeTone: 'emerald',
      },
    ],
    page: { number: 0, size: 5, totalElements: 1, totalPages: 1 },
    busy: false,
    filter: '',
    error: null,
    sortField: 'title',
    sortDirection: 'asc',
    sortOptions: [sortOption],
    emptyMessage: 'No elections',
  });

  readonly sortOptions = this.vm().sortOptions;
  readonly createState = signal({ creating: false, error: null });

  readonly setFilter = jasmine.createSpy('setFilter');
  readonly setPage = jasmine.createSpy('setPage');
  readonly setPageSize = jasmine.createSpy('setPageSize');
  readonly setSort = jasmine.createSpy('setSort');
  readonly createElection = jasmine.createSpy('createElection').and.resolveTo(true);
  readonly clearCreateError = jasmine.createSpy('clearCreateError');
}

describe('ElectionWidgetComponent', () => {
  let fixture: ComponentFixture<ElectionWidgetComponent>;
  let store: ElectionWidgetStoreStub;

  beforeEach(async () => {
    store = new ElectionWidgetStoreStub();

    await TestBed.configureTestingModule({
      imports: [ElectionWidgetComponent],
      providers: [
        { provide: ElectionWidgetStore, useValue: store },
        provideZonelessChangeDetection(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ElectionWidgetComponent);
    fixture.detectChanges();
  });

  it('renders elections', () => {
    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Monthly Pick');
    expect(compiled.textContent).toContain('Ends');
  });

  it('relays filter changes to the store', () => {
    const paginationComponent = fixture.debugElement
      .query(By.directive(PaginatedListComponent))
      .componentInstance as PaginatedListComponent;

    paginationComponent.filterValueChange.emit('club');

    expect(store.setFilter).toHaveBeenCalledWith('club');
  });
});
