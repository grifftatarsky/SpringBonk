import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { ShelvesPageStore } from './shelves-page.store';
import { PaginatedListComponent } from '../../common/ui/paginated-list/paginated-list.component';
import { DatePipe, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-shelves-page',
  standalone: true,
  imports: [PaginatedListComponent, NgIf, RouterLink, DatePipe, ReactiveFormsModule],
  providers: [ShelvesPageStore],
  templateUrl: './shelves-page.html',
  styleUrl: './shelves-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShelvesPage {
  private readonly store = inject(ShelvesPageStore);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly vm = this.store.vm;
  protected readonly createState = this.store.createState;

  // Create-shelf modal state.
  protected readonly createModalOpen = signal(false);
  protected readonly createForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(80)]],
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

  protected updateSort(optionIndex: number): void {
    const option = this.store.sortOptions[optionIndex];
    this.store.setSort(option);
  }

  protected openCreate(): void {
    this.store.clearCreateError();
    this.createForm.reset();
    this.createModalOpen.set(true);
  }

  protected closeCreate(): void {
    this.createModalOpen.set(false);
  }

  protected async submitCreate(): Promise<void> {
    this.createForm.markAllAsTouched();
    if (this.createForm.invalid) return;
    const title = this.createForm.controls.title.value;
    try {
      await this.store.createShelf(title);
      this.createForm.reset();
      this.closeCreate();
    } catch {
      // handled via createState
    }
  }

  protected get titleError(): string | null {
    const control = this.createForm.controls.title;
    const serverError = this.createState().error;
    if (serverError) return serverError;
    if (!control.touched) return null;
    if (control.hasError('required')) return 'Shelf name is required.';
    if (control.hasError('maxlength')) return 'Shelf name must be 80 characters or fewer.';
    return null;
  }

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    if (this.createModalOpen()) {
      this.closeCreate();
    }
  }
}
