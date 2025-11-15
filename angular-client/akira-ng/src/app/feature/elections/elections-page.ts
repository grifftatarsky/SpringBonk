import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ElectionsPageStore, ElectionStatusFilter, ElectionListItem } from './elections-page.store';
import { PaginatedListComponent } from '../../common/ui/paginated-list/paginated-list.component';
import { DatePipe, NgClass } from '@angular/common';
import { ReactiveFormsModule, NonNullableFormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ElectionStatus } from '../../model/response/election-response.model';

@Component({
  selector: 'app-elections-page',
  standalone: true,
  imports: [PaginatedListComponent, DatePipe, ReactiveFormsModule, RouterLink, NgClass],
  templateUrl: './elections-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ElectionsPageStore],
})
export class ElectionsPage {
  private readonly store = inject(ElectionsPageStore);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly vm = this.store.vm;
  protected readonly createState = this.store.createState;
  protected readonly editState = this.store.editState;

  protected readonly statusFilters: ReadonlyArray<{ label: string; value: ElectionStatusFilter }> = [
    { label: 'All statuses', value: 'ALL' },
    { label: 'Open', value: 'OPEN' },
    { label: 'Closed', value: 'CLOSED' },
    { label: 'Indefinite', value: 'INDEFINITE' },
  ];

  protected readonly createModalOpen = signal(false);
  protected readonly editModalOpen = signal(false);
  protected readonly editMode = signal<'update' | 'reopen'>('update');
  protected readonly editingElection = signal<ElectionListItem | null>(null);
  protected readonly menuOpen = signal<string | null>(null);

  protected readonly createForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(160)]],
    endDateTime: [''],
  });

  protected readonly editForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(160)]],
    endDateTime: [''],
  });

  protected setFilter(value: string): void {
    this.store.setFilter(value);
  }

  protected setStatus(filter: ElectionStatusFilter): void {
    this.store.setStatusFilter(filter);
  }

  protected openCreateModal(): void {
    this.createForm.reset({ title: '', endDateTime: '' });
    this.createModalOpen.set(true);
  }

  protected closeCreateModal(): void {
    this.createModalOpen.set(false);
  }

  protected async submitCreate(): Promise<void> {
    this.createForm.markAllAsTouched();
    if (this.createForm.invalid) return;
    const value = this.createForm.getRawValue();
    const endDate = value.endDateTime ? new Date(value.endDateTime).toISOString() : null;
    try {
      await this.store.createElection({ title: value.title, endDateTime: endDate });
      this.createModalOpen.set(false);
      this.createForm.reset({ title: '', endDateTime: '' });
    } catch {
      // error handled in store
    }
  }

  protected openEditModal(election: ElectionListItem, mode: 'update' | 'reopen' = 'update'): void {
    this.editMode.set(mode);
    this.editingElection.set(election);
    this.editForm.reset({
      title: election.title,
      endDateTime: this.toDateTimeInputValue(election.endDateTime),
    });
    this.editModalOpen.set(true);
  }

  protected closeEditModal(): void {
    if (this.editState().busy) return;
    this.editModalOpen.set(false);
    this.editingElection.set(null);
  }

  protected async submitEdit(): Promise<void> {
    const election = this.editingElection();
    if (!election) return;
    this.editForm.markAllAsTouched();
    if (this.editForm.invalid) return;
    const value = this.editForm.getRawValue();
    const endDate = value.endDateTime ? new Date(value.endDateTime).toISOString() : null;
    try {
      if (this.editMode() === 'update') {
        await this.store.updateElection(election.id, { title: value.title, endDateTime: endDate });
      } else {
        await this.store.reopenElection(election.id, endDate);
      }
      this.editModalOpen.set(false);
      this.editingElection.set(null);
    } catch {
      // handled in store
    }
  }

  protected toggleMenu(id: string): void {
    this.menuOpen.update((current) => (current === id ? null : id));
  }

  protected isMenuOpen(id: string): boolean {
    return this.menuOpen() === id;
  }

  protected closeMenus(): void {
    this.menuOpen.set(null);
  }

  protected async closeElection(id: string): Promise<void> {
    await this.store.closeElection(id);
    this.closeMenus();
  }

  protected async deleteElection(id: string): Promise<void> {
    await this.store.deleteElection(id);
    this.closeMenus();
  }

  protected trackByElection(_: number, election: ElectionListItem): string {
    return election.id;
  }

  protected formatStatusLabel(status: ElectionStatus): string {
    switch (status) {
      case 'OPEN':
        return 'Open';
      case 'CLOSED':
        return 'Closed';
      default:
        return 'Indefinite';
    }
  }

  protected statusFilterLabel(value: ElectionStatusFilter): string {
    const match = this.statusFilters.find((option) => option.value === value);
    return match ? match.label : 'All statuses';
  }

  protected toDateTimeInputValue(value: string | null): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    const tzOffset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - tzOffset * 60000);
    return local.toISOString().slice(0, 16);
  }

  protected changePage(direction: 'next' | 'previous'): void {
    this.store.setPage(direction);
  }

  protected changePageSize(size: number): void {
    this.store.setPageSize(size);
  }
}
