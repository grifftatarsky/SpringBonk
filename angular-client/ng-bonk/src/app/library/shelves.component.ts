import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AsyncPipe, DatePipe, NgForOf, NgIf } from '@angular/common';
import { ElectionRequest } from '../model/request/election-request.model';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { Observable } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { ShelvesDataSource } from '../datasource/shelves.datasource';
import { ShelfHttpService } from '../service/http/shelves-http.service';
import { ShelfDialog } from './dialog/shelf-dialog.component';
import { OpenLibraryBookResponse } from '../model/response/open-library-book-response.model';
import { BookHttpService } from '../service/http/books-http.service';
import { BookRequest } from '../model/request/book-request.model';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { BookSearchSheet } from './book-search-sheet.component';
import { BookResponse } from '../model/response/book-response.model';
import { BookDetailDialog } from './dialog/book-detail-dialog.component';
import { NotificationService } from '../service/notification.service';
import { ElectionHttpService } from '../service/http/election-http.service';
import { BookNominateDialog } from './dialog/book-nominate.component';

@Component({
  selector: 'app-shelves',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatProgressBarModule,
    MatChipsModule,
    MatIconModule,
    MatExpansionModule,
    MatTooltipModule,
    MatMenuModule,
    DatePipe,
    AsyncPipe,
    NgIf,
    NgForOf,
  ],
  templateUrl: './shelves.component.html',
  styleUrls: ['./shelves.component.scss'],
})
export class ShelvesComponent implements AfterViewInit {
  displayedColumns: string[] = [
    'title',
    'createdDate',
    'defaultShelf',
    'actions',
  ];

  bookColumns: string[] = ['cover', 'title', 'author', 'actions'];

  dataSource: ShelvesDataSource;
  loading$: Observable<boolean>;
  total: number = 0;

  expandedShelf: string | null = null;
  shelfBooks: { [shelfId: string]: BookResponse[] } = {};
  loadingBooks: { [shelfId: string]: boolean } = {};

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private http: ShelfHttpService,
    private bookHttp: BookHttpService,
    private electionHttp: ElectionHttpService,
    private dialog: MatDialog,
    private sheet: MatBottomSheet,
    private notification: NotificationService
  ) {
    this.dataSource = new ShelvesDataSource(this.http);
    this.loading$ = this.dataSource.loading$;
    this.dataSource.total$.subscribe(
      (count: number): number => (this.total = count)
    );
  }

  ngAfterViewInit(): void {
    this.paginator.page.subscribe((): void => {
      this.dataSource.loadShelves(
        this.paginator.pageIndex,
        this.paginator.pageSize
      );
    });

    this.dataSource.loadShelves();
  }

  refresh(): void {
    this.dataSource.loadShelves();

    // Also refresh any expanded shelf's books
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
    this.loadingBooks[shelfId] = true;

    this.bookHttp.getBooksByShelfId(shelfId).subscribe({
      next: (books: BookResponse[]) => {
        this.shelfBooks[shelfId] = books;
        this.loadingBooks[shelfId] = false;
      },
      error: () => {
        this.loadingBooks[shelfId] = false;
        this.shelfBooks[shelfId] = [];
      },
    });
  }

  openCreateDialog(): void {
    const dialogRef: MatDialogRef<ShelfDialog> = this.dialog.open(ShelfDialog, {
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((result: ElectionRequest): void => {
      if (result) {
        this.http.createShelf(result).subscribe((): void => {
          this.dataSource.loadShelves(
            this.paginator.pageIndex,
            this.paginator.pageSize
          );
        });
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
            const payload: BookRequest = {
              title: result.book.title,
              author: result.book.author_name?.[0] || 'Unknown',
              imageURL: result.book.cover_i
                ? this.bookHttp.getOpenLibraryCoverImageUrl(
                    result.book.cover_i,
                    'L'
                  )
                : '',
              blurb: 'No blurb added. TODO!',
              openLibraryId: result.book.key,
              shelfIds: [result.shelfId],
            };

            this.bookHttp.createBook(payload).subscribe((): void => {
              this.dataSource.loadShelves(
                this.paginator.pageIndex,
                this.paginator.pageSize
              );

              // Refresh the book list if the shelf is expanded
              if (this.expandedShelf === result.shelfId) {
                this.loadBooksForShelf(result.shelfId);
              }
            });
          }
        }
      );
  }

  deleteShelf(shelfId: string, event: Event): void {
    event.stopPropagation(); // Prevent expansion panel toggle
    this.http.deleteShelf(shelfId).subscribe((): void => {
      this.dataSource.loadShelves(
        this.paginator.pageIndex,
        this.paginator.pageSize
      );
      if (
        this.total - 1 <=
        this.paginator.pageSize * this.paginator.pageIndex
      ) {
        this.paginator.previousPage();
      }
    });
  }

  openEditDialog(shelfId: string, event: Event): void {
    event.stopPropagation(); // Prevent expansion panel toggle
    const dialogRef: MatDialogRef<ShelfDialog> = this.dialog.open(ShelfDialog, {
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((result: ElectionRequest): void => {
      if (result) {
        this.http.updateShelf(shelfId, result).subscribe((): void => {
          this.dataSource.loadShelves(
            this.paginator.pageIndex,
            this.paginator.pageSize
          );
        });
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
    this.bookHttp.removeBookFromShelf(bookId, shelfId).subscribe((): void => {
      this.loadBooksForShelf(shelfId);
    });
  }

  deleteBook(bookId: string, event: Event): void {
    event.stopPropagation(); // Prevent opening book details
    this.bookHttp.deleteBook(bookId).subscribe((): void => {
      // Refresh all shelf book lists that are loaded
      Object.keys(this.shelfBooks).forEach((shelfId: string): void => {
        this.loadBooksForShelf(shelfId);
      });
    });
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
}
