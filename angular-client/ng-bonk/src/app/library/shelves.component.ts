import { AsyncPipe, CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Store } from '@ngrx/store';
import { filter, map, Observable, startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ShelfResponse } from '../model/response/shelf-response.model';
import { ShelfRequest } from '../model/request/shelf-request.model';
import * as LibraryActions from '../store/action/library.actions';
import {
  selectShelves,
  selectShelvesLoading,
  selectShelvesTotal,
} from '../store/selector/library.selectors';
import { ShelfDialog } from './dialog/shelf-dialog.component';
import { ConfirmDialogComponent } from '../common/confirm-dialog.component';
import { BookSearchSheet } from './book-search-sheet.component';

@Component({
  selector: 'app-shelves',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    RouterLink,
    RouterOutlet,
    ToolbarModule,
    ButtonModule,
    CardModule,
    TagModule,
    ProgressSpinnerModule,
    ConfirmDialogComponent,
  ],
  templateUrl: './shelves.component.html',
  styleUrls: ['./shelves.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShelvesComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly dialog = inject(DialogService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly shelves$: Observable<ShelfResponse[]> = this.store.select(selectShelves);
  readonly loading$: Observable<boolean> = this.store.select(selectShelvesLoading);
  readonly total$: Observable<number> = this.store.select(selectShelvesTotal);

  readonly selectedId$: Observable<string | null> = this.router.events.pipe(
    filter(event => event instanceof NavigationEnd),
    startWith(null),
    map(() => this.route.firstChild?.snapshot.paramMap.get('id') ?? null)
  );

  private pageIndex = 0;
  private readonly pageSize = 10;
  private shelvesCount = 0;
  private totalCount = 0;
  private loadingState = false;

  constructor() {
    this.shelves$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(list => (this.shelvesCount = list.length));

    this.total$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(total => (this.totalCount = total));

    this.loading$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(flag => (this.loadingState = flag));
  }

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.pageIndex = 0;
    this.store.dispatch(
      LibraryActions.loadShelves({ pageIndex: this.pageIndex, pageSize: this.pageSize })
    );
  }

  loadMore(): void {
    if (this.loadingState) return;
    if (this.shelvesCount >= this.totalCount) return;
    this.pageIndex += 1;
    this.store.dispatch(
      LibraryActions.loadShelves({ pageIndex: this.pageIndex, pageSize: this.pageSize })
    );
  }

  trackByShelfId(_index: number, shelf: ShelfResponse): string {
    return shelf.id;
  }

  navigateToShelf(shelfId: string): void {
    this.router.navigate([shelfId], { relativeTo: this.route });
  }

  openCreateDialog(): void {
    const ref: DynamicDialogRef = this.dialog.open(ShelfDialog, {
      header: 'New Shelf',
      width: '24rem',
      data: { title: '' } satisfies ShelfRequest,
    });

    ref.onClose
      .pipe(filter((result): result is ShelfRequest => !!result))
      .subscribe(request => {
        this.store.dispatch(LibraryActions.createShelf({ request }));
      });
  }

  openEditDialog(shelf: ShelfResponse): void {
    const ref: DynamicDialogRef = this.dialog.open(ShelfDialog, {
      header: 'Rename Shelf',
      width: '24rem',
      data: { title: shelf.title } satisfies ShelfRequest,
    });

    ref.onClose
      .pipe(filter((result): result is ShelfRequest => !!result))
      .subscribe(request => {
        this.store.dispatch(
          LibraryActions.updateShelf({ shelfId: shelf.id, request })
        );
      });
  }

  confirmDelete(shelf: ShelfResponse): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      header: 'Delete Shelf',
      width: '22rem',
      data: {
        title: 'Delete shelf',
        message: `Remove "${shelf.title}" and all associations?`,
        confirmText: 'Delete',
      },
    });

    ref.onClose
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.store.dispatch(LibraryActions.deleteShelf({ shelfId: shelf.id }));
      });
  }

  openBookSearch(): void {
    this.dialog.open(BookSearchSheet, {
      header: 'Search Open Library',
      width: 'min(960px, 92vw)',
      contentStyle: { overflow: 'auto' },
    });
  }

  onScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      this.loadMore();
    }
  }
}
