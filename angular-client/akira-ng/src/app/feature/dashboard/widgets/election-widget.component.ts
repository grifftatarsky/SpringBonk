import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PaginatedListComponent } from '../../../common/ui/paginated-list/paginated-list.component';
import { ElectionWidgetStore, ElectionSortOption } from './election-widget.store';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-election-widget',
  standalone: true,
  imports: [PaginatedListComponent, RouterLink, DatePipe, ReactiveFormsModule],
  templateUrl: './election-widget.component.html',
  styleUrl: './election-widget.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElectionWidgetComponent {
  private readonly store = inject(ElectionWidgetStore);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly vm = this.store.vm;
  readonly sortOptions = this.store.sortOptions;
  readonly createState = this.store.createState;
  protected readonly controlsOpen = signal(false);
  protected readonly createOpen = signal(false);
  protected readonly createForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    endDateTime: [''],
  });

  protected onFilterChange(value: string): void {
    this.store.setFilter(value);
  }

  protected onPage(direction: 'next' | 'previous'): void {
    this.store.setPage(direction);
  }

  protected onPageSize(size: number): void {
    this.store.setPageSize(size);
  }

  protected updateSort(option: ElectionSortOption): void {
    this.store.setSort(option);
  }

  protected toggleControls(): void {
    this.controlsOpen.update((open: boolean) => !open);
  }

  protected openCreate(): void {
    this.createOpen.set(true);
    this.createForm.reset({ title: '', endDateTime: '' });
    this.store.clearCreateError();
  }

  protected closeCreate(): void {
    this.createOpen.set(false);
  }

  protected async submitCreate(): Promise<void> {
    this.createForm.markAllAsTouched();
    if (this.createForm.invalid) return;
    const { title, endDateTime } = this.createForm.getRawValue();
    const payload = {
      title,
      endDateTime: endDateTime ? new Date(endDateTime).toISOString() : null,
    };
    const success = await this.store.createElection(payload);
    if (success) {
      this.closeCreate();
    }
  }
}
