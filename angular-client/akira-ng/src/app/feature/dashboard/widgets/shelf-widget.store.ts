import { computed, inject, Injectable, signal } from '@angular/core';
import { ShelfHttpService, ShelfPageRequest } from '../../../common/http/shelf-http.service';
import { ShelfResponse } from '../../../model/response/shelf-response.model';
import { PaginatedResult, PageMetadata, SortDirection } from '../../../model/type/pagination';
import { mapSpringPagedResponse, paginateArray, createEmptyResult } from '../../../common/util/pagination.util';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, firstValueFrom, map, of, switchMap, tap } from 'rxjs';

export interface ShelfListItem {
  id: string;
  title: string;
  createdDate: string;
  defaultShelf: boolean;
  bookCount: number;
}

export type ShelfSortField = 'title' | 'createdDate';

export type ShelfSortOption = Readonly<{
  label: string;
  field: ShelfSortField;
  direction: SortDirection;
}>;

const SORT_OPTIONS: readonly ShelfSortOption[] = [
  { label: 'Title (A-Z)', field: 'title', direction: 'asc' },
  { label: 'Title (Z-A)', field: 'title', direction: 'desc' },
  { label: 'Newest', field: 'createdDate', direction: 'desc' },
];

interface ShelfQueryState extends ShelfPageRequest {
  filter: string;
  sortField: ShelfSortField;
  direction: SortDirection;
  refreshKey: number;
}

@Injectable({ providedIn: 'root' })
export class ShelfWidgetStore {
  private readonly shelfHttp = inject(ShelfHttpService);

  private readonly pageIndex = signal(0);
  private readonly pageSize = signal(5);
  private readonly sortField = signal<ShelfSortField>('title');
  private readonly sortDirection = signal<SortDirection>('asc');
  private readonly filterTerm = signal('');
  private readonly refreshKey = signal(0);

  private readonly busy = signal(false);
  private readonly error = signal<string | null>(null);
  private readonly result = signal<PaginatedResult<ShelfResponse>>(createEmptyResult<ShelfResponse>(5));
  private readonly creating = signal(false);
  private readonly createError = signal<string | null>(null);

  private readonly params = computed<ShelfQueryState>(() => ({
    page: this.pageIndex(),
    size: this.pageSize(),
    sort: `${this.sortField()},${this.sortDirection()}`,
    filter: this.filterTerm(),
    sortField: this.sortField(),
    direction: this.sortDirection(),
    refreshKey: this.refreshKey(),
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
              console.error('[ShelfWidgetStore] Failed to load shelves', error);
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
        if (result.items.length > 0) {
          this.error.set(null);
        }
      });
  }

  readonly vm = computed(() => {
    const currentPage: PageMetadata = this.result().page;
    const mappedItems: ShelfListItem[] = this.result().items.map((shelf: ShelfResponse) => ({
      id: shelf.id,
      title: shelf.title,
      createdDate: shelf.createdDate,
      defaultShelf: shelf.defaultShelf,
      bookCount: shelf.books?.length ?? 0,
    }));

    return {
      items: mappedItems,
      page: currentPage,
      busy: this.busy(),
      filter: this.filterTerm(),
      error: this.error(),
      sortField: this.sortField(),
      sortDirection: this.sortDirection(),
      sortOptions: this.sortOptions,
      emptyMessage: this.filterTerm()
        ? 'No shelves match your filter.'
        : 'Create a shelf to start organizing books.',
    };
  });

  readonly createState = computed(() => ({
    creating: this.creating(),
    error: this.createError(),
  }));

  setPage(direction: 'next' | 'previous'): void {
    const page = this.pageIndex();
    if (direction === 'next') {
      this.pageIndex.set(page + 1);
    } else {
      this.pageIndex.set(Math.max(0, page - 1));
    }
  }

  setFilter(value: string): void {
    this.pageIndex.set(0);
    this.filterTerm.set(value);
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.pageIndex.set(0);
  }

  setSort(option: ShelfSortOption): void {
    this.sortField.set(option.field);
    this.sortDirection.set(option.direction);
    this.pageIndex.set(0);
  }

  async createShelf(title: string): Promise<void> {
    const normalizedTitle: string = title.trim();
    if (!normalizedTitle) {
      this.createError.set('Shelf name is required.');
      return;
    }

    if (this.creating()) {
      return;
    }

    this.creating.set(true);
    this.createError.set(null);

    try {
      await firstValueFrom(this.shelfHttp.createShelf({ title: normalizedTitle }));
      this.pageIndex.set(0);
      this.filterTerm.set('');
      this.refreshKey.update((value: number) => value + 1);
    } catch (error) {
      console.error('[ShelfWidgetStore] Failed to create shelf', error);
      this.createError.set('Unable to create shelf right now.');
      throw error;
    } finally {
      this.creating.set(false);
    }
  }

  clearCreateError(): void {
    this.createError.set(null);
  }

  private loadShelves(state: ShelfQueryState) {
    const trimmedFilter = state.filter.trim().toLowerCase();
    if (trimmedFilter) {
      return this.shelfHttp.getAllShelves().pipe(
        map((shelves: ShelfResponse[]): PaginatedResult<ShelfResponse> => {
          const filtered = shelves.filter((shelf: ShelfResponse) =>
            shelf.title?.toLowerCase().includes(trimmedFilter),
          );
          const sorted = this.sortShelves(filtered, state.sortField, state.direction);
          return paginateArray(sorted, state);
        }),
      );
    }

    return this.shelfHttp.getShelvesPage(state).pipe(
      map((response) => mapSpringPagedResponse<ShelfResponse>(response)),
      map((result) => {
        const sortedItems = this.sortShelves(result.items, state.sortField, state.direction);
        return {
          items: sortedItems,
          page: result.page,
        } satisfies PaginatedResult<ShelfResponse>;
      }),
    );
  }

  private sortShelves(
    shelves: ReadonlyArray<ShelfResponse>,
    field: ShelfSortField,
    direction: SortDirection,
  ): ShelfResponse[] {
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
