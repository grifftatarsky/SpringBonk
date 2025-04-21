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
  // MARK // TODO: Replace the loading circle with a nice, clean progress bar.
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
    private dialog: MatDialog
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
}
