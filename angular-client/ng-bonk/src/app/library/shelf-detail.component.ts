import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
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
    AsyncPipe,
  ],
  templateUrl: './shelf-detail.component.html',
  styleUrls: ['./shelf-detail.component.scss'],
})
export class ShelfDetailComponent implements OnInit {
  shelfId!: string;
  shelf$!: Observable<any>;
  books$!: Observable<BookResponse[]>;

  displayedColumns: string[] = ['cover', 'title', 'author'];

  constructor(private route: ActivatedRoute, private store: Store) {}

  ngOnInit(): void {
    this.shelfId = this.route.snapshot.paramMap.get('id')!;
    this.shelf$ = this.store.select(selectShelfById(this.shelfId));
    this.books$ = this.store.select(selectBooksForShelf(this.shelfId));
    this.store.dispatch(LibraryActions.loadShelfBooks({ shelfId: this.shelfId }));
  }
}
