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
import { OpenLibraryBooksDatasource } from '../datasource/open-library-books.datasource';
import { BookHttpService } from '../service/http/books-http.service';
import { AsyncPipe, NgIf } from '@angular/common';
import { BookSelectShelfDialog } from './dialog/book-select-shelf-dialog.component';

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
  dataSource: OpenLibraryBooksDatasource;
  loading$: Observable<boolean>;
  total = 0;

  private destroy$ = new Subject<void>();
  private searchSubscription?: Subscription;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private http: BookHttpService,
    private dialogRef: MatBottomSheetRef<BookSearchSheet>,
    private dialog: MatDialog
  ) {
    this.dataSource = new OpenLibraryBooksDatasource(this.http);
    this.loading$ = this.dataSource.loading$;
    this.dataSource.total$.subscribe(
      (count: number): number => (this.total = count)
    );
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
    this.dataSource.loadBooks(
      searchTerm,
      this.paginator.pageIndex,
      this.paginator.pageSize
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
