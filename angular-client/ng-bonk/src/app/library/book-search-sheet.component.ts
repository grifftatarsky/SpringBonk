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
import { Observable, Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
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
    AsyncPipe,
    NgIf,
  ],
  templateUrl: './book-search-sheet.component.html',
  styleUrls: ['./book-search-sheet.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookSearchSheet implements AfterViewInit, OnDestroy {
  displayedColumns: string[] = ['title', 'author', 'year', 'select'];

  searchControl = new FormControl('');
  results$: Observable<OpenLibraryBookResponse[]>;
  loading$: Observable<boolean>;
  total$: Observable<number>;

  private destroy$ = new Subject<void>();
  private searchSubscription?: Subscription;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private dialogRef: MatBottomSheetRef<BookSearchSheet>,
    private dialog: MatDialog,
    private store: Store
  ) {
    this.results$ = this.store.select(selectOpenLibraryResults);
    this.loading$ = this.store.select(selectSearchLoading);
    this.total$ = this.store.select(selectOpenLibraryTotal);
  }

  ngAfterViewInit(): void {
    // Set up search with debounce
    this.searchSubscription = this.searchControl.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(300), distinctUntilChanged())
      .subscribe((searchTerm: string | null): void => {
        this.paginator.pageIndex = 0;
        this.loadData(searchTerm || undefined);
      });

    // Set up paginator
    this.paginator.page.pipe(takeUntil(this.destroy$)).subscribe((): void => {
      this.loadData(this.searchControl.value || undefined);
    });

    // Initial empty state - don't load any data
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.searchSubscription?.unsubscribe();
  }

  loadData(searchTerm?: string): void {
    if (searchTerm === undefined) {
      searchTerm = '';
    }
    this.store.dispatch(
      LibraryActions.searchOpenLibrary({
        query: searchTerm,
        pageIndex: this.paginator.pageIndex,
        pageSize: this.paginator.pageSize,
      })
    );
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
}
