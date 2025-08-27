import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AsyncPipe, NgForOf, NgIf, NgStyle } from '@angular/common';
import { ShelfRequest } from '../model/request/shelf-request.model';
import { ShelfResponse } from '../model/response/shelf-response.model';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Observable } from 'rxjs';
import { filter, map, startWith } from 'rxjs/operators';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatCardModule } from '@angular/material/card';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { ActivatedRoute, Router, RouterOutlet, NavigationEnd } from '@angular/router';
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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-shelves',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatProgressBarModule,
    MatIconModule,
    MatExpansionModule,
    MatTooltipModule,
    MatSortModule,
    RouterOutlet,
    AsyncPipe,
    NgIf,
    NgForOf,
    NgStyle,
  ],
  templateUrl: './shelves.component.html',
  styleUrls: ['./shelves.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShelvesComponent implements OnInit {
  bookColumns: string[] = ['cover', 'title', 'author', 'published', 'actions'];
  shelves$: Observable<ShelfResponse[]>;
  loading$: Observable<boolean>;
  total$: Observable<number>;
  shelfBooks$!: Observable<{ [shelfId: string]: BookResponse[] }>;
  loadingBooks$!: Observable<{ [shelfId: string]: boolean }>;

  expandedShelf: string | null = null;
  shelfBooks: { [shelfId: string]: BookResponse[] } = {};
  loadingBooks: { [shelfId: string]: boolean } = {};
  bookPageIndex: { [shelfId: string]: number } = {};
  bookPageSize = 5;
  sortBy: { [shelfId: string]: 'title' | 'author' | 'published' } = {};
  sortDir: { [shelfId: string]: 'asc' | 'desc' } = {};

  private pageIndex = 0;
  private pageSize = 10;
  private shelvesCount = 0;
  private totalCount = 0;
  private loadingShelves = false;
  hasSelection$!: Observable<boolean>;
  selectedId$!: Observable<string | null>;

  // Animation state
  showLine = false;
  lineStyle: { top: string; left: string; width: string } = {
    top: '0px',
    left: '0px',
    width: '0px',
  };
  @ViewChild('shelvesLayout', { static: true }) layoutRef!: ElementRef<HTMLElement>;
  @ViewChild('listPane', { static: true }) listPaneRef!: ElementRef<HTMLElement>;
  @ViewChild('detailPane', { static: true }) detailPaneRef!: ElementRef<HTMLElement>;
  @ViewChild('detailContent', { static: false }) detailContentRef?: ElementRef<HTMLElement>;

  constructor(
    private store: Store,
    private dialog: MatDialog,
    private sheet: MatBottomSheet,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.shelves$ = this.store.select(selectShelves);
    this.loading$ = this.store.select(selectShelvesLoading);
    this.total$ = this.store.select(selectShelvesTotal);
    this.shelfBooks$ = this.store.select(selectShelfBooks);
    this.loadingBooks$ = this.store.select(selectLoadingBooks);
    this.shelfBooks$.pipe(takeUntilDestroyed()).subscribe(sb => (this.shelfBooks = sb));
    this.loadingBooks$
      .pipe(takeUntilDestroyed())
      .subscribe(lb => (this.loadingBooks = lb));
    this.loading$
      .pipe(takeUntilDestroyed())
      .subscribe(l => (this.loadingShelves = l));
    this.shelves$
      .pipe(takeUntilDestroyed())
      .subscribe(s => (this.shelvesCount = s.length));
    this.total$
      .pipe(takeUntilDestroyed())
      .subscribe(t => (this.totalCount = t));
    this.hasSelection$ = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      startWith(null),
      map(() => !!this.route.firstChild?.snapshot.paramMap.get('id'))
    );
    this.selectedId$ = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      startWith(null),
      map(() => this.route.firstChild?.snapshot.paramMap.get('id') ?? null)
    );
  }

  ngOnInit(): void {
    this.store.dispatch(
      LibraryActions.loadShelves({
        pageIndex: this.pageIndex,
        pageSize: this.pageSize,
      })
    );
  }

  refresh(): void {
    this.pageIndex = 0;
    this.store.dispatch(
      LibraryActions.loadShelves({
        pageIndex: this.pageIndex,
        pageSize: this.pageSize,
      })
    );

    if (this.expandedShelf) {
      this.loadBooksForShelf(this.expandedShelf);
    }
  }

  onListScroll(event: Event): void {
    const el = event.target as HTMLElement;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 200;
    if (
      nearBottom &&
      !this.loadingShelves &&
      this.shelvesCount < this.totalCount
    ) {
      this.pageIndex++;
      this.store.dispatch(
        LibraryActions.loadShelves({ pageIndex: this.pageIndex, pageSize: this.pageSize })
      );
    }
  }

  onShelfClick(shelf: ShelfResponse, event: MouseEvent): void {
    try {
      const listEl = this.listPaneRef?.nativeElement;
      const layoutEl = this.layoutRef?.nativeElement;
      const targetEl = (event.currentTarget as HTMLElement) ?? (event.target as HTMLElement);
      if (!listEl || !layoutEl || !targetEl) {
        this.router.navigate([shelf.id], { relativeTo: this.route });
        return;
      }

      // Pulse
      targetEl.classList.remove('pulse');
      void targetEl.offsetWidth;
      targetEl.classList.add('pulse');

      const listRect = listEl.getBoundingClientRect();
      const layoutRect = layoutEl.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      const startX = targetRect.right - layoutRect.left;
      const startY = targetRect.top - layoutRect.top + targetRect.height / 2;
      const destX = listRect.right - layoutRect.left;
      const distance = Math.max(0, destX - startX);

      const content = (this as any).detailContentRef?.nativeElement as HTMLElement | undefined;
      if (content) {
        content.classList.remove('fade-in');
        content.classList.add('fade-out');
      }

      this.lineStyle = { top: `${startY}px`, left: `${startX}px`, width: `0px` };
      this.showLine = true;

      const fadeOutMs = 150;
      const lineMs = 350;

      setTimeout(() => {
        // start line and navigate
        this.lineStyle = { ...this.lineStyle, width: `${distance}px` };
        this.router.navigate([shelf.id], { relativeTo: this.route });

        setTimeout(() => {
          this.showLine = false;
          if (content) {
            content.classList.remove('fade-out');
            void content.offsetWidth;
            content.classList.add('fade-in');
          }
        }, lineMs);
      }, fadeOutMs);
    } catch {
      this.router.navigate([shelf.id], { relativeTo: this.route });
    }
  }

  onBookPage(event: PageEvent, shelfId: string): void {
    this.bookPageIndex[shelfId] = event.pageIndex;
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

  // Mobile controls map to Sort type to reuse sorting logic
  onMobileSortChange(shelfId: string): void {
    const active = this.sortBy[shelfId] || 'title';
    const direction = this.sortDir[shelfId] || 'asc';
    this.sortShelfBooks({ active, direction } as Sort, shelfId);
  }
}

function compare(
  a: string | number,
  b: string | number,
  isAsc: boolean
): number {
  return (a < b ? -1 : a > b ? 1 : 0) * (isAsc ? 1 : -1);
}
