import { AsyncPipe, CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { DropdownModule } from 'primeng/dropdown';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Store } from '@ngrx/store';
import { BehaviorSubject, combineLatest, map, Observable, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BookCoverComponent } from '../common/book-cover.component';
import * as LibraryActions from '../store/action/library.actions';
import {
  selectBooksForShelf,
  selectLoadingBooks,
  selectShelfById,
  selectShelfTotal,
} from '../store/selector/library.selectors';
import { BookResponse } from '../model/response/book-response.model';
import { ShelfResponse } from '../model/response/shelf-response.model';
import { DialogService } from 'primeng/dynamicdialog';
import { BookDetailDialog } from './dialog/book-detail-dialog.component';

type SortKey = 'title' | 'author' | 'published';

@Component({
  selector: 'app-shelf-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    AsyncPipe,
    ToolbarModule,
    ButtonModule,
    CardModule,
    TagModule,
    DropdownModule,
    ProgressSpinnerModule,
    BookCoverComponent,
  ],
  templateUrl: './shelf-detail.component.html',
  styleUrls: ['./shelf-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShelfDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(DialogService);

  shelfId!: string;

  readonly shelf$: Observable<ShelfResponse | undefined> = this.route.paramMap.pipe(
    map(params => params.get('id') || ''),
    switchMap(id => this.store.select(selectShelfById(id)))
  );

  readonly total$: Observable<number> = this.route.paramMap.pipe(
    map(params => params.get('id') || ''),
    switchMap(id => this.store.select(selectShelfTotal(id)))
  );

  readonly books$: Observable<BookResponse[]> = this.route.paramMap.pipe(
    map(params => params.get('id') || ''),
    switchMap(id => this.store.select(selectBooksForShelf(id)))
  );

  readonly loading$: Observable<boolean> = this.route.paramMap.pipe(
    map(params => params.get('id') || ''),
    switchMap(id =>
      this.store.select(selectLoadingBooks).pipe(map(mapObj => !!mapObj[id]))
    )
  );

  readonly sortOptions: { label: string; value: SortKey }[] = [
    { label: 'Title', value: 'title' },
    { label: 'Author', value: 'author' },
    { label: 'Year', value: 'published' },
  ];

  private readonly sortKey$ = new BehaviorSubject<SortKey>('title');
  private readonly sortAsc$ = new BehaviorSubject<boolean>(true);
  readonly sortKeyStream$ = this.sortKey$.asObservable();
  readonly sortAscStream$ = this.sortAsc$.asObservable();

  readonly sortedBooks$: Observable<BookResponse[]> = combineLatest([
    this.books$,
    this.sortKey$,
    this.sortAsc$,
  ]).pipe(
    map(([books, key, asc]) => {
      const data = [...books];
      data.sort((a, b) => this.compareByKey(a, b, key));
      return asc ? data : data.reverse();
    })
  );

  private loadingSnapshot: Record<string, boolean> = {};
  private totalSnapshot = 0;
  private booksLength = 0;
  private pageIndex = 0;
  private readonly pageSize = 20;

  constructor() {
    this.books$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(list => (this.booksLength = list.length));

    this.loading$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(flag => {
        if (this.shelfId) this.loadingSnapshot[this.shelfId] = flag;
      });

    this.total$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(total => (this.totalSnapshot = total ?? 0));
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const id = params.get('id');
        if (!id) return;
        this.shelfId = id;
        this.pageIndex = 0;
        this.fetchBooks();
      });
  }

  ngOnDestroy(): void {
    // handled by takeUntilDestroyed
  }

  onSortChange(key: SortKey): void {
    this.sortKey$.next(key);
  }

 toggleDirection(): void {
   this.sortAsc$.next(!this.sortAsc$.value);
 }

  openBookDetail(book: BookResponse): void {
    this.dialog.open(BookDetailDialog, {
      header: book.title,
      width: 'min(640px, 95vw)',
      data: { book },
    });
  }

  onScroll(event: Event): void {
    const el = event.target as HTMLElement;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 100;
    const isLoading = this.loadingSnapshot[this.shelfId] ?? false;
    const haveAll = this.booksLength >= this.totalSnapshot;
    if (nearBottom && !isLoading && !haveAll) {
      this.pageIndex += 1;
      this.fetchBooks();
    }
  }

  trackByBook(_index: number, book: BookResponse): string {
    return book.id;
  }

  directionLabel(): string {
    return this.sortAsc$.value ? 'Ascending' : 'Descending';
  }

  private fetchBooks(): void {
    this.store.dispatch(
      LibraryActions.loadShelfBooks({
        shelfId: this.shelfId,
        pageIndex: this.pageIndex,
        pageSize: this.pageSize,
      })
    );
  }

  private compareByKey(
    a: BookResponse,
    b: BookResponse,
    key: SortKey
  ): number {
    switch (key) {
      case 'author':
        return (a.author || '').localeCompare(b.author || '');
      case 'published':
        return (a.publishedYear ?? 0) - (b.publishedYear ?? 0);
      case 'title':
      default:
        return (a.title || '').localeCompare(b.title || '');
    }
  }
}
