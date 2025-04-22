import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ViewChild,
} from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { Observable } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { OpenLibraryBookResponse } from '../model/response/open-library-book-response.model';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { OpenLibraryBooksDatasource } from './open-library-books.datasource';
import { BookHttpService } from './service/books-http.service';
import { AsyncPipe, DatePipe, NgIf } from '@angular/common';

@Component({
  selector: 'app-book-search-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
    MatTableModule,
    MatPaginatorModule,
    MatIconModule,
    AsyncPipe,
    DatePipe,
    NgIf,
  ],
  templateUrl: './book-search-sheet.component.html',
  styleUrls: ['./book-search-sheet.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookSearchSheet implements AfterViewInit {
  displayedColumns: string[] = ['title', 'author', 'year', 'select'];

  dataSource: OpenLibraryBooksDatasource;
  loading$: Observable<boolean>;
  total: number = 0;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private http: BookHttpService,
    private dialogRef: MatBottomSheetRef<BookSearchSheet>
  ) {
    this.dataSource = new OpenLibraryBooksDatasource(this.http);
    this.loading$ = this.dataSource.loading$;
    this.dataSource.total$.subscribe(
      (count: number): number => (this.total = count)
    );
  }

  ngAfterViewInit(): void {
    this.paginator.page.subscribe((): void => {
      this.dataSource.loadBooks(
        undefined,
        undefined,
        this.paginator.pageIndex,
        this.paginator.pageSize
      );
    });

    this.dataSource.loadBooks('House of Leaves', undefined);
  }

  refresh(): void {
    this.dataSource.loadBooks();
  }

  select(book: OpenLibraryBookResponse): void {
    this.dialogRef.dismiss(book);
  }

  cancel(): void {
    this.dialogRef.dismiss();
  }
}
