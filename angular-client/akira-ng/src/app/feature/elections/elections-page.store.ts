import { computed, inject, Injectable, signal } from '@angular/core';
import { ElectionHttpService } from '../../common/http/election-http.service';
import { NotificationService } from '../../common/notification/notification.service';
import { createEmptyResult, mapSpringPagedResponse, paginateArray } from '../../common/util/pagination.util';
import { PaginatedResult, PageMetadata } from '../../model/type/pagination';
import { ElectionResponse, ElectionStatus } from '../../model/response/election-response.model';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, firstValueFrom, map, of, switchMap, tap } from 'rxjs';

export type ElectionStatusFilter = 'ALL' | ElectionStatus;

export interface ElectionListItem {
  id: string;
  title: string;
  status: ElectionStatus;
  createDate: string;
  endDateTime: string | null;
  badgeTone: 'emerald' | 'amber' | 'sky';
  metaLabel: string;
  metaDate: string | null;
}

interface ElectionsQueryState {
  page: number;
  size: number;
  filter: string;
  status: ElectionStatusFilter;
  refreshKey: number;
}

@Injectable()
export class ElectionsPageStore {
  private readonly http = inject(ElectionHttpService);
  private readonly notifications = inject(NotificationService);

  private readonly pageIndex = signal(0);
  private readonly pageSize = signal(6);
  private readonly filterTerm = signal('');
  private readonly statusFilter = signal<ElectionStatusFilter>('ALL');
  private readonly refreshKey = signal(0);

  private readonly busy = signal(false);
  private readonly error = signal<string | null>(null);
  private readonly result = signal<PaginatedResult<ElectionResponse>>(createEmptyResult<ElectionResponse>(6));

  private readonly createBusy = signal(false);
  private readonly createError = signal<string | null>(null);
  private readonly editBusy = signal(false);
  private readonly editError = signal<string | null>(null);

  private readonly params = computed<ElectionsQueryState>(() => ({
    page: this.pageIndex(),
    size: this.pageSize(),
    filter: this.filterTerm(),
    status: this.statusFilter(),
    refreshKey: this.refreshKey(),
  }));

  constructor() {
    toObservable(this.params)
      .pipe(
        debounceTime(75),
        tap(() => this.busy.set(true)),
        switchMap((params) =>
          this.loadElections(params).pipe(
            catchError((error) => {
              console.error('[ElectionsPageStore] Failed to load elections', error);
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
        if (result.items.length) {
          this.error.set(null);
        }
      });
  }

  readonly vm = computed(() => ({
    items: this.result().items.map((election) => ({
      id: election.id,
      title: election.title,
      status: election.status,
      createDate: election.createDate,
      endDateTime: election.endDateTime,
      badgeTone: this.getBadgeTone(election.status),
      metaLabel: this.getMetaLabel(election),
      metaDate: this.getMetaDate(election),
    } satisfies ElectionListItem)),
    page: this.result().page,
    busy: this.busy(),
    error: this.error(),
    filter: this.filterTerm(),
    status: this.statusFilter(),
  }));

  readonly createState = computed(() => ({
    busy: this.createBusy(),
    error: this.createError(),
  }));

  readonly editState = computed(() => ({
    busy: this.editBusy(),
    error: this.editError(),
  }));

  setFilter(value: string): void {
    this.pageIndex.set(0);
    this.filterTerm.set(value);
  }

  setStatusFilter(filter: ElectionStatusFilter): void {
    this.pageIndex.set(0);
    this.statusFilter.set(filter);
  }

  setPage(direction: 'next' | 'previous'): void {
    const current = this.pageIndex();
    this.pageIndex.set(direction === 'next' ? current + 1 : Math.max(0, current - 1));
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.pageIndex.set(0);
  }

  async createElection(form: { title: string; endDateTime: string | null }): Promise<void> {
    const normalizedTitle = form.title.trim();
    if (!normalizedTitle) {
      this.createError.set('Title is required.');
      return;
    }
    if (this.createBusy()) return;

    this.createBusy.set(true);
    this.createError.set(null);

    try {
      await firstValueFrom(
        this.http.createElection({ title: normalizedTitle, endDateTime: form.endDateTime }),
      );
      this.notifications.success('Election created');
      this.resetAndReload();
    } catch (error) {
      console.error('[ElectionsPageStore] Failed to create election', error);
      this.createError.set('Unable to create election right now.');
      throw error;
    } finally {
      this.createBusy.set(false);
    }
  }

  async updateElection(id: string, form: { title: string; endDateTime: string | null }): Promise<void> {
    const normalizedTitle = form.title.trim();
    if (!normalizedTitle) {
      this.editError.set('Title is required.');
      return;
    }
    if (this.editBusy()) return;

    this.editBusy.set(true);
    this.editError.set(null);

    try {
      await firstValueFrom(
        this.http.updateElection(id, { title: normalizedTitle, endDateTime: form.endDateTime }),
      );
      this.notifications.success('Election updated');
      this.resetAndReload();
    } catch (error) {
      console.error('[ElectionsPageStore] Failed to update election', error);
      this.editError.set('Unable to update election right now.');
      throw error;
    } finally {
      this.editBusy.set(false);
    }
  }

  async closeElection(id: string): Promise<void> {
    try {
      await firstValueFrom(this.http.closeElection(id));
      this.notifications.success('Election closed');
      this.resetAndReload();
    } catch (error) {
      console.error('[ElectionsPageStore] Failed to close election', error);
      this.notifications.error('Unable to close election.');
      throw error;
    }
  }

  async deleteElection(id: string): Promise<void> {
    try {
      await firstValueFrom(this.http.deleteElection(id));
      this.notifications.success('Election deleted');
      this.resetAndReload();
    } catch (error) {
      console.error('[ElectionsPageStore] Failed to delete election', error);
      this.notifications.error('Unable to delete election right now.');
      throw error;
    }
  }

  async reopenElection(id: string, endDateTime: string | null): Promise<void> {
    try {
      await firstValueFrom(this.http.reopenElection(id, { endDateTime }));
      this.notifications.success('Election reopened');
      this.resetAndReload();
    } catch (error) {
      console.error('[ElectionsPageStore] Failed to reopen election', error);
      this.notifications.error('Unable to reopen election right now.');
      throw error;
    }
  }

  private resetAndReload(): void {
    this.pageIndex.set(0);
    this.refreshKey.update((value) => value + 1);
  }

  private loadElections(state: ElectionsQueryState) {
    const trimmedFilter = state.filter.trim().toLowerCase();
    const statusFilter = state.status;
    const requiresClientFilter = Boolean(trimmedFilter) || statusFilter !== 'ALL';

    if (requiresClientFilter) {
      return this.http.getAllElections().pipe(
        map((elections) => this.filterAndPaginate(elections, state)),
      );
    }

    return this.http.getElectionsPage({ page: state.page, size: state.size, sort: 'createDate,desc' }).pipe(
      map((response) => mapSpringPagedResponse<ElectionResponse>(response)),
    );
  }

  private filterAndPaginate(items: ElectionResponse[], state: ElectionsQueryState): PaginatedResult<ElectionResponse> {
    const filtered = items
      .filter((item) => this.matchesFilter(item, state.filter, state.status))
      .sort((a, b) => new Date(b.createDate).getTime() - new Date(a.createDate).getTime());

    return paginateArray(filtered, { page: state.page, size: state.size });
  }

  private matchesFilter(item: ElectionResponse, filterValue: string, status: ElectionStatusFilter): boolean {
    const matchesTitle = item.title.toLowerCase().includes(filterValue.trim().toLowerCase());
    const matchesStatus = status === 'ALL' || item.status === status;
    return matchesTitle && matchesStatus;
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

  private getMetaLabel(election: ElectionResponse): string {
    if (election.status === 'OPEN' && election.endDateTime) {
      return 'Ends';
    }
    if (election.status === 'CLOSED' && election.endDateTime) {
      return 'Closed';
    }
    if (election.status === 'INDEFINITE') {
      return 'No end date';
    }
    return 'Created';
  }

  private getMetaDate(election: ElectionResponse): string | null {
    if (election.status === 'INDEFINITE') {
      return null;
    }
    if (election.status === 'OPEN' && election.endDateTime) {
      return election.endDateTime;
    }
    if (election.status === 'CLOSED' && election.endDateTime) {
      return election.endDateTime;
    }
    return election.createDate;
  }
}
