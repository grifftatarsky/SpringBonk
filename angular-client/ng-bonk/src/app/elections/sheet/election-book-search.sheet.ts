import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { Observable, Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { BookCoverComponent } from '../../common/book-cover.component';
import { OpenLibraryBookResponse } from '../../model/response/open-library-book-response.model';
import * as LibraryActions from '../../store/action/library.actions';
import {
  selectOpenLibraryResults,
  selectOpenLibraryTotal,
  selectSearchLoading,
} from '../../store/selector/library.selectors';
import { BookHttpService } from '../../service/http/books-http.service';
import { ElectionHttpService } from '../../service/http/election-http.service';
import { NotificationService } from '../../service/notification.service';
import { BookRequest } from '../../model/request/book-request.model';
import { NominationFinalizeDialogComponent, NominationFinalizeDialogResult } from '../dialog/nomination-finalize-dialog.component';

export interface ElectionBookSearchSheetData {
  electionId: string;
}

@Component({
  selector: 'app-election-book-search-sheet',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AsyncPipe,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
    MatCardModule,
    MatIconModule,
    BookCoverComponent,
    ScrollingModule,
  ],
  templateUrl: './election-book-search.sheet.html',
  styleUrls: ['./election-book-search.sheet.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElectionBookSearchSheetComponent implements AfterViewInit, OnDestroy {
  readonly searchControl: FormControl<string | null> = new FormControl<string | null>(
    ''
  );
  hasSearched = false;
  submitting = false;

  readonly results$: Observable<OpenLibraryBookResponse[]>;
  readonly loading$: Observable<boolean>;
  readonly total$: Observable<number>;

  @ViewChild(CdkVirtualScrollViewport) viewport?: CdkVirtualScrollViewport;

  private readonly destroy$ = new Subject<void>();
  private searchSub?: Subscription;
  private pageIndex = 0;
  private readonly pageSize = 10;
  private currentCount = 0;
  private totalCount = 0;
  private isLoading = false;
  readonly itemSize = 110;
  private readonly preloadThreshold = 3;

  constructor(
    private readonly sheetRef: MatBottomSheetRef<ElectionBookSearchSheetComponent>,
    @Inject(MAT_BOTTOM_SHEET_DATA) private readonly data: ElectionBookSearchSheetData,
    private readonly dialog: MatDialog,
    private readonly store: Store,
    private readonly bookHttp: BookHttpService,
    private readonly electionHttp: ElectionHttpService,
    private readonly notify: NotificationService
  ) {
    this.results$ = this.store.select(selectOpenLibraryResults);
    this.loading$ = this.store.select(selectSearchLoading);
    this.total$ = this.store.select(selectOpenLibraryTotal);
  }

  ngAfterViewInit(): void {
    this.results$.pipe(takeUntil(this.destroy$)).subscribe(results => {
      this.currentCount = results.length;
      this.maybePrefetchMore();
    });

    this.total$.pipe(takeUntil(this.destroy$)).subscribe(total => {
      this.totalCount = total ?? 0;
    });

    this.loading$.pipe(takeUntil(this.destroy$)).subscribe(loading => {
      this.isLoading = loading;
    });

    this.searchSub = this.searchControl.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.pageIndex = 0;
        this.loadData();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.searchSub?.unsubscribe();
  }

  loadData(): void {
    const query = (this.searchControl.value ?? '').trim();
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
    return book.cover_i
      ? this.bookHttp.getOpenLibraryCoverImageUrl(book.cover_i, 'M')
      : '';
  }

  cancel(): void {
    this.sheetRef.dismiss();
  }

  select(book: OpenLibraryBookResponse): void {
    if (this.submitting) {
      return;
    }

    this.dialog
      .open(NominationFinalizeDialogComponent, {
        width: '520px',
        data: { book },
        disableClose: true,
      })
      .afterClosed()
      .pipe(
        takeUntil(this.destroy$),
        switchMap((result?: NominationFinalizeDialogResult) => {
          if (!result) {
            return of(null);
          }
          const payload: BookRequest = {
            title: book.title,
            author: book.author_name?.[0] || 'Unknown',
            imageURL: book.cover_i
              ? this.bookHttp.getOpenLibraryCoverImageUrl(book.cover_i, 'L')
              : '',
            blurb: result.pitch?.trim() ?? '',
            openLibraryId: book.key,
            shelfIds: result.shelfId ? [result.shelfId] : undefined,
          };
          this.submitting = true;
          return this.bookHttp.createBook(payload).pipe(
            switchMap(created =>
              this.electionHttp
                .nominateCandidate(this.data.electionId, created.id)
                .pipe(switchMap(() => of(created)))
            )
          );
        })
      )
      .subscribe({
        next: created => {
          if (!created) {
            return;
          }
          this.notify.success('Book nominated to election');
          this.sheetRef.dismiss(true);
        },
        error: err => {
          this.submitting = false;
          const message = err?.error?.message ?? 'Failed to nominate book';
          this.notify.error(message);
        },
        complete: () => {
          this.submitting = false;
        },
      });
  }

  onScrolledIndexChange(index: number): void {
    const visible = this.viewport
      ? Math.ceil(this.viewport.getViewportSize() / this.itemSize)
      : 10;
    const nearEnd = index + visible + this.preloadThreshold >= this.currentCount;
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

  private maybePrefetchMore(): void {
    if (
      !this.hasSearched ||
      this.isLoading ||
      this.currentCount >= this.totalCount
    ) {
      return;
    }
    const visible = this.viewport
      ? Math.ceil(this.viewport.getViewportSize() / this.itemSize)
      : 10;
    if (this.currentCount < Math.max(visible + this.preloadThreshold, this.pageSize)) {
      this.pageIndex++;
      this.loadData();
    }
  }
}
