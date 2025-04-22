import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AsyncPipe, DatePipe, NgIf } from '@angular/common';
import { ElectionRequest } from '../model/request/election-request.model';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { Observable } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { ShelvesDataSource } from './shelves.datasource';
import { ShelfHttpService } from './service/shelves-http.service';
import { ShelfDialog } from './shelf-dialog.component';
import { OpenLibraryBookResponse } from '../model/response/open-library-book-response.model';
import { BookHttpService } from './service/books-http.service';
import { BookRequest } from '../model/request/book-request.model';
import {
  MatBottomSheet,
  MatBottomSheetRef,
} from '@angular/material/bottom-sheet';
import { BookSearchSheet } from './book-search-sheet.component';

@Component({
  selector: 'app-shelves',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatProgressBarModule,
    MatChipsModule,
    MatIconModule,
    DatePipe,
    AsyncPipe,
    NgIf,
  ],
  templateUrl: './shelves.component.html',
  styleUrls: ['./shelves.component.scss'],
})
export class ShelvesComponent implements AfterViewInit {
  displayedColumns: string[] = [
    'title',
    'createdDate',
    'defaultShelf',
    'actions',
  ];

  dataSource: ShelvesDataSource;
  loading$: Observable<boolean>;
  total: number = 0;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private http: ShelfHttpService,
    private bookHttp: BookHttpService,
    private dialog: MatDialog,
    private sheet: MatBottomSheet
  ) {
    this.dataSource = new ShelvesDataSource(this.http);
    this.loading$ = this.dataSource.loading$;
    this.dataSource.total$.subscribe(
      (count: number): number => (this.total = count)
    );
  }

  ngAfterViewInit(): void {
    this.paginator.page.subscribe((): void => {
      this.dataSource.loadShelves(
        this.paginator.pageIndex,
        this.paginator.pageSize
      );
    });

    this.dataSource.loadShelves();
  }

  refresh(): void {
    this.dataSource.loadShelves();
  }

  openCreateDialog(): void {
    const dialogRef: MatDialogRef<ShelfDialog> = this.dialog.open(ShelfDialog, {
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((result: ElectionRequest): void => {
      if (result) {
        this.http.createShelf(result).subscribe((): void => {
          this.dataSource.loadShelves(
            this.paginator.pageIndex,
            this.paginator.pageSize
          );
        });
      }
    });
  }

  // TODO: We should move this stuff to a different component.
  openBookSearchDialog(): void {
    const dialogRef: MatBottomSheetRef<
      BookSearchSheet,
      OpenLibraryBookResponse
    > = this.sheet.open(BookSearchSheet, {
      panelClass: 'sheet-max',
    });

    dialogRef
      .afterDismissed()
      .subscribe((selected: OpenLibraryBookResponse | undefined): void => {
        if (selected) {
          const payload: BookRequest = {
            title: selected.title,
            author: selected.title,
            imageURL: `https://covers.openlibrary.org/b/id/${selected.cover_i}-L.jpg`,
            blurb: 'No blurb added. TODO!',
            openLibraryId: selected.key,
          };

          this.bookHttp.createBook(payload).subscribe((): void => {
            this.dataSource.loadShelves(
              this.paginator.pageIndex,
              this.paginator.pageSize
            );
          });
        }
      });
  }

  deleteShelf(electionId: string): void {
    this.http.deleteShelf(electionId).subscribe((): void => {
      this.dataSource.loadShelves(
        this.paginator.pageIndex,
        this.paginator.pageSize
      );
      if (
        this.total - 1 <=
        this.paginator.pageSize * this.paginator.pageIndex
      ) {
        this.paginator.previousPage();
      }
    });
  }

  openEditDialog(electionId: string): void {
    const dialogRef: MatDialogRef<ShelfDialog> = this.dialog.open(ShelfDialog, {
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((result: ElectionRequest): void => {
      if (result) {
        this.http.updateShelf(electionId, result).subscribe((): void => {
          this.dataSource.loadShelves(
            this.paginator.pageIndex,
            this.paginator.pageSize
          );
        });
      }
    });
  }
}
