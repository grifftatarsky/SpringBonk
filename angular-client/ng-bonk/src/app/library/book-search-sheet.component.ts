import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { Observable, Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
// Removed select/sidenav (advanced filters)
import { OpenLibraryBookResponse } from '../model/response/open-library-book-response.model';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { AsyncPipe } from '@angular/common';
import { BookSelectShelfDialog } from './dialog/book-select-shelf-dialog.component';
import { Store } from '@ngrx/store';
import * as LibraryActions from '../store/action/library.actions';
import {
  selectOpenLibraryResults,
  selectOpenLibraryTotal,
  selectSearchLoading,
} from '../store/selector/library.selectors';
import { BookHttpService } from '../service/http/books-http.service';
import { BookCoverComponent } from '../common/book-cover.component';
import {
  CdkVirtualScrollViewport,
  ScrollingModule,
} from '@angular/cdk/scrolling';

@Component({
  selector: 'app-book-search-dialog',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
    MatCardModule,
    MatIconModule,
    BookCoverComponent,
    ScrollingModule,
    AsyncPipe,
  ],
  templateUrl: './book-search-sheet.component.html',
  styleUrls: ['./book-search-sheet.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookSearchSheet implements AfterViewInit, OnDestroy {
  searchControl = new FormControl('');
  hasSearched: boolean = false;

  results$: Observable<OpenLibraryBookResponse[]>;
  loading$: Observable<boolean>;
  total$: Observable<number>;

  private destroy$: Subject<void> = new Subject<void>();
  private searchSubscription?: Subscription;
  private pageIndex: number = 0;
  private pageSize: number = 10;
  private currentCount: number = 0;
  private totalCount: number = 0;
  private isLoading: boolean = false;
  readonly itemSize: number = 110;
  private preloadThreshold: number = 3; // items beyond viewport to trigger prefetch

  @ViewChild(CdkVirtualScrollViewport) viewport?: CdkVirtualScrollViewport;

  constructor(
    private dialogRef: MatBottomSheetRef<BookSearchSheet>,
    private dialog: MatDialog,
    private store: Store,
    private bookHttp: BookHttpService
  ) {
    this.results$ = this.store.select(selectOpenLibraryResults);
    this.loading$ = this.store.select(selectSearchLoading);
    this.total$ = this.store.select(selectOpenLibraryTotal);
  }

  ngAfterViewInit(): void {
    // Track result length, total, and loading state for infinite scroll
    this.results$.pipe(takeUntil(this.destroy$)).subscribe(r => {
      this.currentCount = r.length;
      // If initial results don't fill the viewport, prefetch more
      this.maybePrefetchMore();
    });
    this.total$
      .pipe(takeUntil(this.destroy$))
      .subscribe((t: number): number => (this.totalCount = t ?? 0));
    this.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((l: boolean): boolean => (this.isLoading = l));

    // Set up search with debounce on main control
    this.searchSubscription = this.searchControl.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(300), distinctUntilChanged())
      .subscribe((): void => {
        this.pageIndex = 0;
        this.loadData();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.searchSubscription?.unsubscribe();
  }

  loadData(): void {
    const query: string = (this.searchControl.value || '').toString().trim();
    this.hasSearched = true;
    this.store.dispatch(
      LibraryActions.searchOpenLibrary({
        query,
        pageIndex: this.pageIndex,
        pageSize: this.pageSize,
      })
    );
  }

  getCover(book: OpenLibraryBookResponse): string {
    // Use medium size for better clarity in the results list
    return book.cover_i
      ? this.bookHttp.getOpenLibraryCoverImageUrl(book.cover_i, 'M')
      : '';
  }

  select(book: OpenLibraryBookResponse): void {
    // Open the confirmation dialog instead of immediately dismissing
    const dialogRef = this.dialog.open(BookSelectShelfDialog, {
      data: { book },
      width: '500px',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // If we got a result back with the book and shelfId, dismiss the bottom sheet with the book
        this.dialogRef.dismiss({
          book: result.book,
          shelfId: result.shelfId,
        });
      }
      // If canceled, the bottom sheet stays open so they can select another book
    });
  }

  cancel(): void {
    this.dialogRef.dismiss();
  }

  private maybePrefetchMore(): void {
    if (
      !this.hasSearched ||
      this.isLoading ||
      this.currentCount >= this.totalCount
    ) {
      return;
    }
    const visible: number = this.viewport
      ? Math.ceil(this.viewport.getViewportSize() / this.itemSize)
      : 10;
    if (
      this.currentCount <
      Math.max(visible + this.preloadThreshold, this.pageSize)
    ) {
      this.pageIndex++;
      this.loadData();
    }
  }

  onScrolledIndexChange(index: number): void {
    const visible: number = this.viewport
      ? Math.ceil(this.viewport.getViewportSize() / this.itemSize)
      : 10;
    const nearEnd: boolean =
      index + visible + this.preloadThreshold >= this.currentCount;
    if (
      this.hasSearched &&
      !this.isLoading &&
      this.currentCount < this.totalCount &&
      nearEnd
    ) {
      this.pageIndex++;
      this.loadData();
    }
  }
}
