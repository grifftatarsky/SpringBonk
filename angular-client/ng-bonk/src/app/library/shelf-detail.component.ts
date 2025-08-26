import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatSortModule, Sort } from '@angular/material/sort';
import { Store } from '@ngrx/store';
import * as LibraryActions from './store/library.actions';
import { selectBooksForShelf, selectShelfById } from './store/library.selectors';
import { Observable } from 'rxjs';
import { BookResponse } from '../model/response/book-response.model';
import { AsyncPipe } from '@angular/common';

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
})
export class ShelfDetailComponent implements OnInit {
  shelfId!: string;
  shelf$!: Observable<any>;
  books: BookResponse[] = [];
  sortedBooks: BookResponse[] = [];

  displayedColumns: string[] = ['cover', 'title', 'author', 'published'];

  constructor(private route: ActivatedRoute, private store: Store) {}

  ngOnInit(): void {
    this.shelfId = this.route.snapshot.paramMap.get('id')!;
    this.shelf$ = this.store.select(selectShelfById(this.shelfId));
    this.store
      .select(selectBooksForShelf(this.shelfId))
      .subscribe(books => {
        this.books = books;
        this.sortedBooks = [...books];
      });
    this.store.dispatch(LibraryActions.loadShelfBooks({ shelfId: this.shelfId }));
  }

  sortData(sort: Sort): void {
    const data = [...this.books];
    if (!sort.active || sort.direction === '') {
      this.sortedBooks = data;
      return;
    }
    const isAsc = sort.direction === 'asc';
    this.sortedBooks = data.sort((a, b) => {
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
  }
}

function compare(a: string | number, b: string | number, isAsc: boolean): number {
  return (a < b ? -1 : a > b ? 1 : 0) * (isAsc ? 1 : -1);
}
