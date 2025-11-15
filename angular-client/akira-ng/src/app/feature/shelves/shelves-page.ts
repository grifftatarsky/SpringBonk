import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ShelvesPageStore } from './shelves-page.store';
import { PaginatedListComponent } from '../../common/ui/paginated-list/paginated-list.component';
import { DatePipe, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-shelves-page',
  standalone: true,
  imports: [PaginatedListComponent, NgIf, RouterLink, DatePipe],
  providers: [ShelvesPageStore],
  templateUrl: './shelves-page.html',
  styleUrl: './shelves-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShelvesPage {
  private readonly store = inject(ShelvesPageStore);
  protected readonly vm = this.store.vm;

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
}
