import {
  AfterViewInit,
  Component,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { ShelfRequest } from '../model/request/shelf-request.model';
import { ShelfResponse } from '../model/response/shelf-response.model';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { Observable } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { RouterModule } from '@angular/router';
import { BookSearchSheet } from './book-search-sheet.component';
import { BookResponse } from '../model/response/book-response.model';
import { BookDetailDialog } from './dialog/book-detail-dialog.component';
import { BookNominateDialog } from './dialog/book-nominate.component';
import { Store } from '@ngrx/store';
import * as LibraryActions from './store/library.actions';
import {
  selectShelves,
  selectShelvesLoading,
  selectShelvesTotal,
  selectShelfBooks,
  selectLoadingBooks,
} from './store/library.selectors';
import { OpenLibraryBookResponse } from '../model/response/open-library-book-response.model';
import { ShelfDialog } from './dialog/shelf-dialog.component';

@Component({
  selector: 'app-shelves',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatProgressBarModule,
    MatIconModule,
    MatExpansionModule,
    MatTooltipModule,
    MatMenuModule,
    MatSortModule,
    RouterModule,
    AsyncPipe,
    NgIf,
    NgForOf,
  ],
  templateUrl: './shelves.component.html',
  styleUrls: ['./shelves.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShelvesComponent implements AfterViewInit {
  bookColumns: string[] = ['cover', 'title', 'author', 'published', 'actions'];
  shelves$: Observable<ShelfResponse[]>;
  loading$: Observable<boolean>;
  total$: Observable<number>;
  shelfBooks$!: Observable<{ [shelfId: string]: BookResponse[] }>;
  loadingBooks$!: Observable<{ [shelfId: string]: boolean }>;

  expandedShelf: string | null = null;
  shelfBooks: { [shelfId: string]: BookResponse[] } = {};
  loadingBooks: { [shelfId: string]: boolean } = {};

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private store: Store,
    private dialog: MatDialog,
    private sheet: MatBottomSheet
  ) {
    this.shelves$ = this.store.select(selectShelves);
    this.loading$ = this.store.select(selectShelvesLoading);
    this.total$ = this.store.select(selectShelvesTotal);
    this.shelfBooks$ = this.store.select(selectShelfBooks);
    this.loadingBooks$ = this.store.select(selectLoadingBooks);
    this.shelfBooks$.subscribe(sb => (this.shelfBooks = sb));
    this.loadingBooks$.subscribe(lb => (this.loadingBooks = lb));
  }

  ngAfterViewInit(): void {
    this.paginator.page.subscribe((): void => {
      this.store.dispatch(
        LibraryActions.loadShelves({
          pageIndex: this.paginator.pageIndex,
          pageSize: this.paginator.pageSize,
        })
      );
    });

    this.store.dispatch(LibraryActions.loadShelves({}));
  }

  refresh(): void {
    this.store.dispatch(
      LibraryActions.loadShelves({
        pageIndex: this.paginator.pageIndex,
        pageSize: this.paginator.pageSize,
      })
    );

    if (this.expandedShelf) {
      this.loadBooksForShelf(this.expandedShelf);
    }
  }

  toggleExpand(shelfId: string): void {
    if (this.expandedShelf === shelfId) {
      this.expandedShelf = null;
    } else {
      this.expandedShelf = shelfId;
      this.loadBooksForShelf(shelfId);
    }
  }

  loadBooksForShelf(shelfId: string): void {
    this.store.dispatch(LibraryActions.loadShelfBooks({ shelfId }));
  }

  openCreateDialog(): void {
    const dialogRef: MatDialogRef<ShelfDialog> = this.dialog.open(ShelfDialog, {
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((result: ShelfRequest): void => {
      if (result) {
        this.store.dispatch(LibraryActions.createShelf({ request: result }));
      }
    });
  }

  openBookSearchDialog(): void {
    const dialogRef = this.sheet.open(BookSearchSheet, {
      panelClass: 'sheet-max',
    });

    dialogRef
      .afterDismissed()
      .subscribe(
        (result?: { book: OpenLibraryBookResponse; shelfId: string }): void => {
          if (result && result.book) {
            this.store.dispatch(
              LibraryActions.addBookFromOpenLibrary({
                book: result.book,
                shelfId: result.shelfId,
              })
            );
          }
        }
      );
  }

  deleteShelf(shelfId: string, event: Event): void {
    event.stopPropagation(); // Prevent expansion panel toggle
    this.store.dispatch(LibraryActions.deleteShelf({ shelfId }));
  }

  openEditDialog(shelfId: string, event: Event): void {
    event.stopPropagation(); // Prevent expansion panel toggle
    const dialogRef: MatDialogRef<ShelfDialog> = this.dialog.open(ShelfDialog, {
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((result: ShelfRequest): void => {
      if (result) {
        this.store.dispatch(
          LibraryActions.updateShelf({ shelfId, request: result })
        );
      }
    });
  }

  // Book operations
  openBookDetails(book: BookResponse): void {
    const dialogRef = this.dialog.open(BookDetailDialog, {
      width: '500px',
      data: { book },
    });

    dialogRef.afterClosed().subscribe(updatedBook => {
      if (updatedBook) {
        // Refresh book lists after update
        if (this.expandedShelf) {
          this.loadBooksForShelf(this.expandedShelf);
        }
      }
    });
  }

  removeBookFromShelf(bookId: string, shelfId: string, event: Event): void {
    event.stopPropagation(); // Prevent opening book details
    this.store.dispatch(
      LibraryActions.removeBookFromShelf({ bookId, shelfId })
    );
  }

  deleteBook(bookId: string, event: Event): void {
    event.stopPropagation(); // Prevent opening book details
    this.store.dispatch(LibraryActions.deleteBook({ bookId }));
  }

  nominateBook(book: BookResponse, event: Event): void {
    event.stopPropagation(); // Prevent opening book details

    const dialogRef = this.dialog.open(BookNominateDialog, {
      data: { book },
      width: '500px',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        // Nomination was successful, no need to refresh the UI
        // the dialog already showed the notification
      }
    });
  }

  sortShelfBooks(sort: Sort, shelfId: string): void {
    const books = [...(this.shelfBooks[shelfId] || [])];
    if (!sort.active || sort.direction === '') {
      this.shelfBooks[shelfId] = books;
      return;
    }
    const isAsc = sort.direction === 'asc';
    this.shelfBooks[shelfId] = books.sort((a, b) => {
      switch (sort.active) {
        case 'title':
          return compare(a.title, b.title, isAsc);
        case 'author':
          return compare(a.author, b.author, isAsc);
        case 'published':
          return compare(a.publishedYear ?? 0, b.publishedYear ?? 0, isAsc);
        default:
          return 0;
      }
    });
  }
}

function compare(
  a: string | number,
  b: string | number,
  isAsc: boolean
): number {
  return (a < b ? -1 : a > b ? 1 : 0) * (isAsc ? 1 : -1);
}
