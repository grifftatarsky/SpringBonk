import { computed, inject, Injectable, signal } from '@angular/core';
import { ShelfHttpService, ShelfPageRequest } from '../../common/http/shelf-http.service';
import { ShelfResponse } from '../../model/response/shelf-response.model';
import { PaginatedResult, SortDirection } from '../../model/type/pagination';
import { createEmptyResult, mapSpringPagedResponse, paginateArray } from '../../common/util/pagination.util';
import { catchError, debounceTime, map, of, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';

interface ShelvesQuery extends ShelfPageRequest {
  filter: string;
  sortField: ShelfSortField;
  direction: SortDirection;
}

export type ShelfSortField = 'title' | 'createdDate';

export type ShelvesSortOption = Readonly<{ label: string; field: ShelfSortField; direction: SortDirection }>;

const SORT_OPTIONS: readonly ShelvesSortOption[] = [
  { label: 'Title (A-Z)', field: 'title', direction: 'asc' },
  { label: 'Title (Z-A)', field: 'title', direction: 'desc' },
  { label: 'Newest', field: 'createdDate', direction: 'desc' },
];

@Injectable()
export class ShelvesPageStore {
  private readonly http = inject(ShelfHttpService);

  private readonly pageIndex = signal(0);
  private readonly pageSize = signal(8);
  private readonly sortField = signal<ShelfSortField>('createdDate');
  private readonly sortDirection = signal<SortDirection>('desc');
  private readonly filterTerm = signal('');

  private readonly busy = signal(false);
  private readonly error = signal<string | null>(null);
  private readonly result = signal<PaginatedResult<ShelfResponse>>(createEmptyResult<ShelfResponse>(8));

  private readonly params = computed<ShelvesQuery>(() => ({
    page: this.pageIndex(),
    size: this.pageSize(),
    sort: `${this.sortField()},${this.sortDirection()}`,
    filter: this.filterTerm(),
    sortField: this.sortField(),
    direction: this.sortDirection(),
  }));

  readonly sortOptions = SORT_OPTIONS;

  constructor() {
    toObservable(this.params)
      .pipe(
        debounceTime(75),
        tap(() => this.busy.set(true)),
        switchMap((params) =>
          this.loadShelves(params).pipe(
            catchError((error) => {
              console.error('[ShelvesPageStore] Failed to load shelves', error);
              this.error.set('Unable to load shelves right now.');
              return of(createEmptyResult<ShelfResponse>(params.size));
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.result.set(result);
        this.busy.set(false);
        if (result.items.length) {
          this.error.set(null);
        }
      });
  }

  readonly vm = computed(() => ({
    items: this.result().items.map((shelf) => ({
      id: shelf.id,
      title: shelf.title,
      createdDate: shelf.createdDate,
      defaultShelf: shelf.defaultShelf,
      bookCount: shelf.books?.length ?? 0,
    })),
    page: this.result().page,
    busy: this.busy(),
    filter: this.filterTerm(),
    error: this.error(),
    sortOptions: this.sortOptions,
    sortField: this.sortField(),
    sortDirection: this.sortDirection(),
  }));

  setFilter(value: string): void {
    this.pageIndex.set(0);
    this.filterTerm.set(value);
  }

  setPage(direction: 'next' | 'previous'): void {
    const current = this.pageIndex();
    this.pageIndex.set(direction === 'next' ? current + 1 : Math.max(0, current - 1));
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.pageIndex.set(0);
  }

  setSort(option: ShelvesSortOption): void {
    this.sortField.set(option.field);
    this.sortDirection.set(option.direction);
    this.pageIndex.set(0);
  }

  private loadShelves(state: ShelvesQuery) {
    const trimmedFilter = state.filter.trim().toLowerCase();
    if (trimmedFilter) {
      return this.http.getAllShelves().pipe(
        map((shelves) => shelves.filter((shelf) => shelf.title.toLowerCase().includes(trimmedFilter))),
        map((filtered) => this.sortShelves(filtered, state.sortField, state.direction)),
        map((sorted) => paginateArray(sorted, state)),
      );
    }

    return this.http.getShelvesPage(state).pipe(
      map((response) => mapSpringPagedResponse<ShelfResponse>(response)),
      map((result) => ({
        items: this.sortShelves(result.items, state.sortField, state.direction),
        page: result.page,
      } satisfies PaginatedResult<ShelfResponse>)),
    );
  }

  private sortShelves(shelves: ReadonlyArray<ShelfResponse>, field: ShelfSortField, direction: SortDirection) {
    const multiplier = direction === 'asc' ? 1 : -1;
    return [...shelves].sort((a, b) => {
      if (field === 'title') {
        return a.title.localeCompare(b.title) * multiplier;
      }
      const aTime = new Date(a.createdDate).getTime();
      const bTime = new Date(b.createdDate).getTime();
      return (aTime - bTime) * multiplier;
    });
  }
}
