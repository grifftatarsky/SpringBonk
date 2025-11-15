import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { DatePipe, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShelfWidgetStore, ShelfSortOption } from './shelf-widget.store';
import { PaginatedListComponent } from '../../../common/ui/paginated-list/paginated-list.component';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-shelf-widget',
  standalone: true,
  imports: [PaginatedListComponent, NgIf, RouterLink, DatePipe, ReactiveFormsModule],
  templateUrl: './shelf-widget.component.html',
  styleUrl: './shelf-widget.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShelfWidgetComponent {
  private readonly store = inject(ShelfWidgetStore);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly vm = this.store.vm;
  readonly sortOptions = this.store.sortOptions;
  readonly createState = this.store.createState;
  protected readonly controlsOpen = signal(false);

  protected readonly createForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(80)]],
  });

  protected readonly createModalOpen = signal(false);
  protected readonly createTitleId = 'create-shelf-heading';
  protected readonly createDescId = 'create-shelf-description';
  protected readonly titleErrorId = 'create-shelf-error';

  @ViewChild('createTitleInput') private createTitleInput?: ElementRef<HTMLInputElement>;

  protected onFilterChange(value: string): void {
    this.store.setFilter(value);
  }

  protected onPage(direction: 'next' | 'previous'): void {
    this.store.setPage(direction);
  }

  protected onPageSize(size: number): void {
    this.store.setPageSize(size);
  }

  protected updateSort(option: ShelfSortOption): void {
    this.store.setSort(option);
  }

  protected toggleControls(): void {
    this.controlsOpen.update((open) => !open);
  }

  protected openCreate(): void {
    this.createModalOpen.set(true);
    this.store.clearCreateError();
    this.createForm.reset();
    queueMicrotask(() => this.createTitleInput?.nativeElement.focus());
  }

  protected closeCreate(): void {
    if (this.createModalOpen()) {
      this.createModalOpen.set(false);
    }
  }

  protected async submitCreate(): Promise<void> {
    this.createForm.markAllAsTouched();
    if (this.createForm.invalid) {
      return;
    }

    const title: string = this.createForm.controls.title.value;
    try {
      await this.store.createShelf(title);
      this.createForm.reset();
      this.closeCreate();
    } catch {
      // handled in store via createState
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
    this.closeCreate();
  }
}
