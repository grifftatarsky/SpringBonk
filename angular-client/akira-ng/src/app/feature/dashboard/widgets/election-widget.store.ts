import { computed, inject, Injectable, signal } from '@angular/core';
import { ElectionHttpService, ElectionPageRequest } from '../../../common/http/election-http.service';
import { ElectionResponse, ElectionStatus } from '../../../model/response/election-response.model';
import { PaginatedResult, PageMetadata, SortDirection } from '../../../model/type/pagination';
import { mapSpringPagedResponse, paginateArray, createEmptyResult } from '../../../common/util/pagination.util';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, firstValueFrom, map, of, switchMap, tap } from 'rxjs';
import { ElectionRequest } from '../../../model/request/election-request.model';
import { NotificationService } from '../../../common/notification/notification.service';

export interface ElectionListItem {
  id: string;
  title: string;
  status: ElectionStatus;
  statusLabel: string;
  metaLabel: string;
  metaDate?: string | null;
  badgeTone: 'emerald' | 'amber' | 'sky';
}

export type ElectionSortField = 'title' | 'endDateTime' | 'createDate';

export type ElectionSortOption = Readonly<{
  label: string;
  field: ElectionSortField;
  direction: SortDirection;
}>;

const SORT_OPTIONS: readonly ElectionSortOption[] = [
  { label: 'Title (A-Z)', field: 'title', direction: 'asc' },
  { label: 'Title (Z-A)', field: 'title', direction: 'desc' },
  { label: 'Soonest end', field: 'endDateTime', direction: 'asc' },
  { label: 'Newest', field: 'createDate', direction: 'desc' },
];

interface ElectionQueryState extends ElectionPageRequest {
  filter: string;
  sortField: ElectionSortField;
  direction: SortDirection;
  refreshKey: number;
}

@Injectable({ providedIn: 'root' })
export class ElectionWidgetStore {
  private readonly electionHttp = inject(ElectionHttpService);
  private readonly notifications = inject(NotificationService);

  private readonly pageIndex = signal(0);
  private readonly pageSize = signal(5);
  private readonly sortField = signal<ElectionSortField>('title');
  private readonly sortDirection = signal<SortDirection>('asc');
  private readonly filterTerm = signal('');
  private readonly refreshKey = signal(0);

  private readonly busy = signal(false);
  private readonly error = signal<string | null>(null);
  private readonly result = signal<PaginatedResult<ElectionResponse>>(createEmptyResult<ElectionResponse>(5));
  private readonly creating = signal(false);
  private readonly createError = signal<string | null>(null);

  private readonly params = computed<ElectionQueryState>(() => ({
    page: this.pageIndex(),
    size: this.pageSize(),
    sort: `${this.sortField()},${this.sortDirection()}`,
    filter: this.filterTerm(),
    sortField: this.sortField(),
    direction: this.sortDirection(),
    refreshKey: this.refreshKey(),
  }));

  readonly sortOptions = SORT_OPTIONS;
  readonly createState = computed(() => ({ creating: this.creating(), error: this.createError() }));

  constructor() {
    toObservable(this.params)
      .pipe(
        debounceTime(75),
        tap(() => this.busy.set(true)),
        switchMap((params) =>
          this.loadElections(params).pipe(
            catchError((error) => {
              console.error('[ElectionWidgetStore] Failed to load elections', error);
              this.error.set('Unable to load elections right now.');
              return of(createEmptyResult<ElectionResponse>(params.size));
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

  clearCreateError(): void {
    this.createError.set(null);
  }

  async createElection(request: { title: string; endDateTime: string | null }): Promise<boolean> {
    if (this.creating()) {
      return false;
    }
    this.creating.set(true);
    this.createError.set(null);
    const payload: ElectionRequest = {
      title: request.title,
      endDateTime: request.endDateTime,
    };
    try {
      await firstValueFrom(this.electionHttp.createElection(payload));
      this.pageIndex.set(0);
      this.filterTerm.set('');
      this.refreshKey.update((key) => key + 1);
      this.notifications.success('Election created');
      return true;
    } catch (error) {
      console.error('[ElectionWidgetStore] Failed to create election', error);
      this.createError.set('Unable to create election right now.');
      this.notifications.error('Unable to create election right now.');
      return false;
    } finally {
      this.creating.set(false);
    }
  }

  readonly vm = computed(() => {
    const mappedItems: ElectionListItem[] = this.result().items.map((election) => this.mapElection(election));

    return {
      items: mappedItems,
      page: this.result().page,
      busy: this.busy(),
      filter: this.filterTerm(),
      error: this.error(),
      sortField: this.sortField(),
      sortDirection: this.sortDirection(),
      sortOptions: this.sortOptions,
      emptyMessage: this.filterTerm()
        ? 'No elections match your filter.'
        : 'No elections yet. Create one from the elections page.',
    };
  });

  setPage(direction: 'next' | 'previous'): void {
    const page = this.pageIndex();
    this.pageIndex.set(direction === 'next' ? page + 1 : Math.max(0, page - 1));
  }

  setFilter(value: string): void {
    this.pageIndex.set(0);
    this.filterTerm.set(value);
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.pageIndex.set(0);
  }

  setSort(option: ElectionSortOption): void {
    this.sortField.set(option.field);
    this.sortDirection.set(option.direction);
    this.pageIndex.set(0);
  }

  private loadElections(state: ElectionQueryState) {
    const trimmedFilter = state.filter.trim().toLowerCase();
    if (trimmedFilter) {
      return this.electionHttp.getAllElections().pipe(
        map((items) => this.sortElections(
          items.filter((election) => election.title?.toLowerCase().includes(trimmedFilter)),
          state.sortField,
          state.direction,
        )),
        map((filtered) => paginateArray(filtered, state)),
      );
    }

    return this.electionHttp.getElectionsPage(state).pipe(
      map((response) => mapSpringPagedResponse<ElectionResponse>(response)),
      map((result) => ({
        items: this.sortElections(result.items, state.sortField, state.direction),
        page: result.page,
      } satisfies PaginatedResult<ElectionResponse>)),
    );
  }

  private sortElections(
    elections: ReadonlyArray<ElectionResponse>,
    field: ElectionSortField,
    direction: SortDirection,
  ): ElectionResponse[] {
    const multiplier = direction === 'asc' ? 1 : -1;
    return [...elections].sort((a, b) => {
      if (field === 'title') {
        return a.title.localeCompare(b.title) * multiplier;
      }
      const aValue = field === 'endDateTime' ? dateValue(a.endDateTime) : dateValue(a.createDate);
      const bValue = field === 'endDateTime' ? dateValue(b.endDateTime) : dateValue(b.createDate);
      return (aValue - bValue) * multiplier;
    });
  }

  private mapElection(election: ElectionResponse): ElectionListItem {
    const statusLabel = this.getStatusLabel(election.status);
    const badgeTone = this.getBadgeTone(election.status);
    const meta = this.getMetaLabel(election);

    return {
      id: election.id,
      title: election.title,
      status: election.status,
      statusLabel,
      metaLabel: meta.label,
      metaDate: meta.date,
      badgeTone,
    };
  }

  private getStatusLabel(status: ElectionStatus): string {
    switch (status) {
      case 'OPEN':
        return 'Open';
      case 'INDEFINITE':
        return 'Indefinite';
      default:
        return 'Closed';
    }
  }

  private getBadgeTone(status: ElectionStatus): 'emerald' | 'amber' | 'sky' {
    switch (status) {
      case 'OPEN':
        return 'emerald';
      case 'INDEFINITE':
        return 'sky';
      default:
        return 'amber';
    }
  }

  private getMetaLabel(election: ElectionResponse): { label: string; date?: string | null } {
    if (election.status === 'OPEN' && election.endDateTime) {
      return { label: 'Ends', date: election.endDateTime };
    }
    if (election.status === 'INDEFINITE') {
      return { label: 'Open indefinitely' };
    }
    if (election.status === 'CLOSED' && election.endDateTime) {
      return { label: 'Closed', date: election.endDateTime };
    }
    return { label: 'Created', date: election.createDate };
  }
}

function dateValue(value: string | null | undefined): number {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }
  return new Date(value).getTime();
}
