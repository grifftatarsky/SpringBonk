import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PaginatedListComponent } from '../../../common/ui/paginated-list/paginated-list.component';
import { ElectionWidgetStore, ElectionSortOption } from './election-widget.store';

@Component({
  selector: 'app-election-widget',
  standalone: true,
  imports: [PaginatedListComponent, RouterLink, DatePipe],
  templateUrl: './election-widget.component.html',
  styleUrl: './election-widget.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElectionWidgetComponent {
  private readonly store = inject(ElectionWidgetStore);

  readonly vm = this.store.vm;
  readonly sortOptions = this.store.sortOptions;

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
}
