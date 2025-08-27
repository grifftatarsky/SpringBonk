import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatSortModule, Sort } from '@angular/material/sort';
import { Store } from '@ngrx/store';
import * as LibraryActions from './store/library.actions';
import {
  selectBooksForShelf,
  selectShelfById,
} from './store/library.selectors';
import { Observable } from 'rxjs';
import { BookResponse } from '../model/response/book-response.model';
import { AsyncPipe } from '@angular/common';
import { ShelfResponse } from '../model/response/shelf-response.model';
import { map, switchMap, takeUntil } from 'rxjs/operators';
import { BehaviorSubject, Subject, combineLatest, startWith } from 'rxjs';

@Component({
  selector: 'app-shelf-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatTableModule,
    MatIconModule,
    MatSortModule,
    AsyncPipe,
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
  private sort$ = new BehaviorSubject<Sort>({ active: 'title', direction: 'asc' as 'asc' });

  displayedColumns: string[] = ['cover', 'title', 'author', 'published'];

  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);
  private readonly destroy$ = new Subject<void>();

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

    // Dispatch load when id changes
    id$.pipe(takeUntil(this.destroy$)).subscribe(id => {
      this.shelfId = id;
      this.store.dispatch(LibraryActions.loadShelfBooks({ shelfId: id }));
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  sortData(sort: Sort): void {
    this.sort$.next(sort);
  }
}

function compare(
  a: string | number,
  b: string | number,
  isAsc: boolean
): number {
  return (a < b ? -1 : a > b ? 1 : 0) * (isAsc ? 1 : -1);
}
