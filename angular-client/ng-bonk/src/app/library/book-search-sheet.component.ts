import { AsyncPipe, CommonModule, NgClass, NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CardModule } from 'primeng/card';
import { Observable, debounceTime, distinctUntilChanged, filter } from 'rxjs';
import { Store } from '@ngrx/store';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { OpenLibraryBookResponse } from '../model/response/open-library-book-response.model';
import * as LibraryActions from '../store/action/library.actions';
import {
  selectOpenLibraryResults,
  selectOpenLibraryTotal,
  selectSearchLoading,
} from '../store/selector/library.selectors';
import { BookCoverComponent } from '../common/book-cover.component';
import { BookHttpService } from '../service/http/books-http.service';
import { BookSelectShelfDialog } from './dialog/book-select-shelf-dialog.component';

@Component({
  selector: 'app-book-search-sheet',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AsyncPipe,
    NgIf,
    NgClass,
    ButtonModule,
    InputTextModule,
    ProgressSpinnerModule,
    CardModule,
    BookCoverComponent,
  ],
  templateUrl: './book-search-sheet.component.html',
  styleUrls: ['./book-search-sheet.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookSearchSheet implements OnInit {
  private readonly store = inject(Store);
  private readonly dialog = inject(DialogService);
  private readonly ref = inject(DynamicDialogRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly bookHttp = inject(BookHttpService);

  readonly results$: Observable<OpenLibraryBookResponse[]> = this.store.select(
    selectOpenLibraryResults
  );
  readonly loading$: Observable<boolean> = this.store.select(selectSearchLoading);
  readonly total$: Observable<number> = this.store.select(selectOpenLibraryTotal);

  readonly searchControl = new FormControl<string>('', { nonNullable: true });

  results: OpenLibraryBookResponse[] = [];
  loading = false;
  totalCount = 0;
  hasSearched = false;
  private pageIndex = 0;
  private readonly pageSize = 10;

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pageIndex = 0;
        this.loadData();
      });

    this.results$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(list => (this.results = list));

    this.loading$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(flag => (this.loading = flag));

    this.total$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(total => (this.totalCount = total ?? 0));
  }

  loadData(): void {
    const query = this.searchControl.value.trim();
    this.hasSearched = true;
    this.store.dispatch(
      LibraryActions.searchOpenLibrary({
        query,
        pageIndex: this.pageIndex,
        pageSize: this.pageSize,
      })
    );
  }

  loadMore(): void {
    if (this.loading || !this.hasMore) return;
    this.pageIndex += 1;
    this.loadData();
  }

  get hasMore(): boolean {
    return this.results.length < this.totalCount;
  }

  getCover(book: OpenLibraryBookResponse): string {
    return book.cover_i
      ? this.bookHttp.getOpenLibraryCoverImageUrl(book.cover_i, 'M')
      : '';
  }

  select(book: OpenLibraryBookResponse): void {
    const dialogRef = this.dialog.open(BookSelectShelfDialog, {
      header: 'Add to shelf',
      width: 'min(420px, 92vw)',
      data: { book },
    });

    dialogRef.onClose
      .pipe(
        filter(
          (result): result is { book: OpenLibraryBookResponse; shelfId: string } =>
            !!result
        )
      )
      .subscribe(result => {
        this.ref.close(result);
      });
  }

  cancel(): void {
    this.ref.close();
  }
}
