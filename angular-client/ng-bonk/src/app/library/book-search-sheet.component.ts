import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { Observable, Subject, Subscription, merge } from 'rxjs';
import { debounceTime, distinctUntilChanged, skip, takeUntil } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { OpenLibraryBookResponse } from '../model/response/open-library-book-response.model';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { AsyncPipe, NgIf } from '@angular/common';
import { BookSelectShelfDialog } from './dialog/book-select-shelf-dialog.component';
import { Store } from '@ngrx/store';
import * as LibraryActions from './store/library.actions';
import {
  selectOpenLibraryResults,
  selectSearchLoading,
  selectOpenLibraryTotal,
} from './store/library.selectors';
import { BookHttpService } from '../service/http/books-http.service';

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
    MatTableModule,
    MatPaginatorModule,
    MatIconModule,
    MatSelectModule,
    MatSidenavModule,
    AsyncPipe,
    NgIf,
  ],
  templateUrl: './book-search-sheet.component.html',
  styleUrls: ['./book-search-sheet.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookSearchSheet implements AfterViewInit, OnDestroy {
  displayedColumns: string[] = ['cover', 'title', 'author', 'year', 'select'];

  searchControl = new FormControl('');
  titleControl = new FormControl('');
  authorControl = new FormControl('');
  subjectControl = new FormControl('');
  sortControl = new FormControl('relevance');
  showFilters = false;
  hasSearched = false;

  results$: Observable<OpenLibraryBookResponse[]>;
  loading$: Observable<boolean>;
  total$: Observable<number>;

  private destroy$ = new Subject<void>();
  private searchSubscription?: Subscription;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('filtersDrawer') filtersDrawer: any;

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
    // Set up search with debounce across all controls
    this.searchSubscription = merge(
      this.searchControl.valueChanges.pipe(skip(1)),
      this.titleControl.valueChanges.pipe(skip(1)),
      this.authorControl.valueChanges.pipe(skip(1)),
      this.subjectControl.valueChanges.pipe(skip(1)),
      this.sortControl.valueChanges.pipe(skip(1))
    )
      .pipe(takeUntil(this.destroy$), debounceTime(300), distinctUntilChanged())
      .subscribe((): void => {
        this.paginator.pageIndex = 0;
        this.loadData();
      });

    // Set up paginator
    this.paginator.page.pipe(takeUntil(this.destroy$)).subscribe((): void => {
      this.loadData();
    });

    // Initial empty state - don't load any data
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.searchSubscription?.unsubscribe();
  }

  loadData(): void {
    const terms: string[] = [];
    const q = this.searchControl.value?.trim();
    const title = this.titleControl.value?.trim();
    const author = this.authorControl.value?.trim();
    const subject = this.subjectControl.value?.trim();
    const sort = this.sortControl.value || 'relevance';
    if (q) {
      terms.push(q);
    }
    if (title) {
      terms.push(`title:${title}`);
    }
    if (author) {
      terms.push(`author:${author}`);
    }
    if (subject) {
      terms.push(`subject:${subject}`);
    }
    const query = terms.join(' ');
    this.hasSearched = true;
    this.store.dispatch(
      LibraryActions.searchOpenLibrary({
        query,
        sort,
        pageIndex: this.paginator.pageIndex,
        pageSize: this.paginator.pageSize,
      })
    );
  }

  getCover(book: OpenLibraryBookResponse): string {
    return book.cover_i
      ? this.bookHttp.getOpenLibraryCoverImageUrl(book.cover_i, 'S')
      : 'assets/placeholder-book-cover.jpg';
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

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
    if (this.filtersDrawer) {
      this.filtersDrawer.toggle();
    }
  }
}
