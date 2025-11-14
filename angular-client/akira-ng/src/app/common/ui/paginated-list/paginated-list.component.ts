import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgIf } from '@angular/common';
import { PageMetadata } from '../../../model/type/pagination';

@Component({
  selector: 'app-paginated-list',
  standalone: true,
  imports: [NgIf],
  templateUrl: './paginated-list.component.html',
  styleUrl: './paginated-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginatedListComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) page!: PageMetadata;
  @Input() filterValue = '';
  @Input() filterPlaceholder = 'Filter items';
  @Input() busy = false;
  @Input() hasItems = false;
  @Input() emptyMessage = 'No records yet.';
  @Input() showPageSize = false;
  @Input() pageSizeOptions: ReadonlyArray<number> = [5, 10, 20];

  @Output() filterValueChange = new EventEmitter<string>();
  @Output() pageChange = new EventEmitter<'next' | 'previous'>();
  @Output() pageSizeChange = new EventEmitter<number>();

  onFilterInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.filterValueChange.emit(value);
  }

  goNext(): void {
    if (this.canGoNext) {
      this.pageChange.emit('next');
    }
  }

  goPrevious(): void {
    if (this.canGoPrevious) {
      this.pageChange.emit('previous');
    }
  }

  changePageSize(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.pageSizeChange.emit(value);
  }

  get canGoPrevious(): boolean {
    return this.page.number > 0 && !this.busy;
  }

  get canGoNext(): boolean {
    return this.page.number < this.page.totalPages - 1 && !this.busy;
  }
}
