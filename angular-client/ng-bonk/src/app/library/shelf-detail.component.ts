import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { BookCoverComponent } from '../common/book-cover.component';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AsyncPipe, CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Sort } from '@angular/material/sort';
import { Store } from '@ngrx/store';
import * as LibraryActions from '../store/action/library.actions';
import {
  selectBooksForShelf,
  selectLoadingBooks,
  selectShelfById,
  selectShelfTotal,
} from '../store/selector/library.selectors';
import {
  BehaviorSubject,
  combineLatest,
  Observable,
  startWith,
  Subject,
} from 'rxjs';
import { BookResponse } from '../model/response/book-response.model';
import { ShelfResponse } from '../model/response/shelf-response.model';
import { map, switchMap, takeUntil } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { BookDetailSheetComponent } from './sheet/book-detail.sheet';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-shelf-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    AsyncPipe,
    MatCardModule,
    MatChipsModule,
    MatProgressBarModule,
    BookCoverComponent,
  ],
  templateUrl: './shelf-detail.component.html',
  styleUrls: ['./shelf-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShelfDetailComponent implements OnInit, OnDestroy {
  shelfId!: string;
  shelf$!: Observable<ShelfResponse | undefined>;
  books$!: Observable<BookResponse[]>;
  sortedBooks$!: Observable<BookResponse[]>;
  displayedBooks$!: Observable<BookResponse[]>;
  total$!: Observable<number>;
  private sort$ = new BehaviorSubject<Sort>({
    active: 'title',
    direction: 'asc' as 'asc',
  });
  private visibleCount$ = new BehaviorSubject<number>(20);
  loading$!: Observable<boolean>;
  private booksLength = 0;
  private isNominationsShelf = false;
  private pageIndex = 0;
  private pageSize = 20;

  displayedColumns: string[] = ['cover', 'title', 'author', 'published'];

  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);
  private readonly destroy$ = new Subject<void>();
  private readonly sheet = inject(MatBottomSheet);
  // Snapshots for event handling
  private loadingSnapshot: { [key: string]: boolean } = {};
  private totalSnapshot: number | undefined;

  constructor() {}

  ngOnInit(): void {
    const id$ = this.route.paramMap.pipe(
      map(params => params.get('id')!),
      takeUntil(this.destroy$)
    );

    // Update shelf$ reactively on id change
    this.shelf$ = id$.pipe(
      switchMap(id => this.store.select(selectShelfById(id)))
    );

    // Observe books for current shelf id
    this.books$ = id$.pipe(
      switchMap(id => this.store.select(selectBooksForShelf(id))),
      takeUntil(this.destroy$)
    );
    this.books$
      .pipe(takeUntil(this.destroy$))
      .subscribe(b => (this.booksLength = b.length));

    // Total for badge
    this.total$ = id$.pipe(
      switchMap(id => this.store.select(selectShelfTotal(id)))
    );

    // Combine books with sort state to produce sortedBooks$
    this.sortedBooks$ = combineLatest([this.books$, this.sort$]).pipe(
      map(([books, sort]) => {
        const data = [...books];
        if (!sort.active || !sort.direction) return data;
        const isAsc = sort.direction === 'asc';
        return data.sort((a, b) => {
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
      }),
      startWith([] as BookResponse[])
    );

    // Display all loaded books (paging happens via API)
    this.displayedBooks$ = this.sortedBooks$;

    // Track shelf meta and loading bar for this shelf id
    this.loading$ = id$.pipe(
      switchMap(id =>
        this.store.select(selectLoadingBooks).pipe(map(mapObj => !!mapObj[id]))
      )
    );
    this.store
      .select(selectLoadingBooks)
      .pipe(takeUntil(this.destroy$))
      .subscribe(mapObj => (this.loadingSnapshot = mapObj));
    this.shelf$
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        s => (this.isNominationsShelf = (s?.title ?? '') === 'My Nominations')
      );

    this.total$
      .pipe(takeUntil(this.destroy$))
      .subscribe(total => (this.totalSnapshot = total));

    // Dispatch initial page when id changes
    id$.pipe(takeUntil(this.destroy$)).subscribe(id => {
      this.shelfId = id;
      this.pageIndex = 0;
      this.store.dispatch(
        LibraryActions.loadShelfBooks({
          shelfId: id,
          pageIndex: this.pageIndex,
          pageSize: this.pageSize,
        })
      );
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  sortData(sort: Sort): void {
    this.sort$.next(sort);
  }

  openBookSheet(book: BookResponse): void {
    this.sheet.open(BookDetailSheetComponent, {
      data: {
        book,
        shelfId: this.shelfId,
        isNominationsShelf: this.isNominationsShelf,
      },
      panelClass: ['sheet-max', 'book-sheet'],
    });
  }

  onDetailScroll(event: Event): void {
    const el = event.target as HTMLElement;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 100;
    if (nearBottom) {
      // If we haven't loaded all items yet, request next page
      const total = (this as any).totalSnapshot as number | undefined;
      const loadingMap = (this as any).loadingSnapshot as
        | { [key: string]: boolean }
        | undefined;
      const isLoading = loadingMap?.[this.shelfId] ?? false;
      const haveAll = total !== undefined && this.booksLength >= total;
      if (!isLoading && !haveAll) {
        this.pageIndex++;
        this.store.dispatch(
          LibraryActions.loadShelfBooks({
            shelfId: this.shelfId,
            pageIndex: this.pageIndex,
            pageSize: this.pageSize,
          })
        );
      }
    }
  }

  trackByBookId(_index: number, book: BookResponse): string {
    return book.id;
  }
}

function compare(
  a: string | number,
  b: string | number,
  isAsc: boolean
): number {
  return (a < b ? -1 : a > b ? 1 : 0) * (isAsc ? 1 : -1);
}
