import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AsyncPipe, NgStyle } from '@angular/common';
import { ShelfRequest } from '../model/request/shelf-request.model';
import { ShelfResponse } from '../model/response/shelf-response.model';
import { MatPaginatorModule } from '@angular/material/paginator';
import { Observable } from 'rxjs';
import { filter, map, startWith } from 'rxjs/operators';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSortModule } from '@angular/material/sort';
import { MatCardModule } from '@angular/material/card';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatRippleModule } from '@angular/material/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterOutlet,
} from '@angular/router';
import { BookSearchSheet } from './book-search-sheet.component';
import { BookResponse } from '../model/response/book-response.model';
import { Store } from '@ngrx/store';
import * as LibraryActions from '../store/action/library.actions';
import {
  selectLoadingBooks,
  selectShelfBooks,
  selectShelves,
  selectShelvesLoading,
  selectShelvesTotal,
} from '../store/selector/library.selectors';
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
    MatRippleModule,
    AsyncPipe,
    NgStyle,
  ],
  templateUrl: './shelves.component.html',
  styleUrls: ['./shelves.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShelvesComponent implements OnInit {
  shelves$: Observable<ShelfResponse[]>;
  loading$: Observable<boolean>;
  total$: Observable<number>;
  shelfBooks$!: Observable<{ [shelfId: string]: BookResponse[] }>;
  loadingBooks$!: Observable<{ [shelfId: string]: boolean }>;

  expandedShelf: string | null = null;
  shelfBooks: { [shelfId: string]: BookResponse[] } = {};
  loadingBooks: { [shelfId: string]: boolean } = {};

  private pageIndex: number = 0;
  private pageSize: number = 10;
  private shelvesCount: number = 0;
  private totalCount: number = 0;
  private loadingShelves: boolean = false;
  hasSelection$!: Observable<boolean>;
  selectedId$!: Observable<string | null>;

  // Animation state
  showLine: boolean = false;
  lineInstant: boolean = false;
  lineStyle: { top: string; left: string; width: string } = {
    top: '0px',
    left: '0px',
    width: '16px',
  };

  @ViewChild('shelvesLayout', { static: true })
  layoutRef!: ElementRef<HTMLElement>;

  @ViewChild('listPane', { static: true })
  listPaneRef!: ElementRef<HTMLElement>;

  @ViewChild('detailPane', { static: true })
  detailPaneRef!: ElementRef<HTMLElement>;

  @ViewChild('detailContent', { static: false })
  detailContentRef?: ElementRef<HTMLElement>;

  @ViewChild('transLine', { static: false })
  lineRef?: ElementRef<HTMLElement>;

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
    this.shelfBooks$
      .pipe(takeUntilDestroyed())
      .subscribe(sb => (this.shelfBooks = sb));
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
    const nearBottom: boolean =
      el.scrollTop + el.clientHeight >= el.scrollHeight - 200;
    if (
      nearBottom &&
      !this.loadingShelves &&
      this.shelvesCount < this.totalCount
    ) {
      this.pageIndex++;
      this.store.dispatch(
        LibraryActions.loadShelves({
          pageIndex: this.pageIndex,
          pageSize: this.pageSize,
        })
      );
    }
  }

  // TODO __ Seems kinda complex...
  onShelfClick(shelf: ShelfResponse, event: MouseEvent): void {
    try {
      const listEl: HTMLElement = this.listPaneRef?.nativeElement;
      const layoutEl: HTMLElement = this.layoutRef?.nativeElement;
      const targetEl: HTMLElement =
        (event.currentTarget as HTMLElement) ?? (event.target as HTMLElement);

      if (!listEl || !layoutEl || !targetEl) {
        this.router.navigate([shelf.id], { relativeTo: this.route });
        return;
      }

      listEl.getBoundingClientRect();
      const layoutRect: DOMRect = layoutEl.getBoundingClientRect();
      const targetRect: DOMRect = targetEl.getBoundingClientRect();

      const startX: number = targetRect.right - layoutRect.left;
      const startY: number =
        targetRect.top - layoutRect.top + targetRect.height / 2;

      this.detailPaneRef?.nativeElement.getBoundingClientRect();
      const content = (this as any).detailContentRef?.nativeElement as
        | HTMLElement
        | undefined;

      if (content) {
        content.classList.remove('fade-in');
        content.classList.add('fade-out');
      }

      this.lineInstant = true;
      this.lineStyle = {
        top: `${startY}px`,
        left: `${startX}px`,
        width: `0px`,
      };
      this.showLine = true;

      const fadeOutMs = 150;
      const lineMs = 350;

      setTimeout((): void => {
        // enable transition and start line
        void this.lineRef?.nativeElement.offsetWidth;
        this.lineInstant = false;
        this.lineStyle = { ...this.lineStyle, width: `16px` };
        this.router.navigate([shelf.id], { relativeTo: this.route });

        setTimeout((): void => {
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

  trackByShelfId(_index: number, shelf: ShelfResponse): string {
    return shelf.id;
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
    event.stopPropagation();

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

  removeBookFromShelf(bookId: string, shelfId: string, event: Event): void {
    event.stopPropagation(); // Prevent opening book details
    this.store.dispatch(
      LibraryActions.removeBookFromShelf({ bookId, shelfId })
    );
  }
}
