import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { ElectionHttpService } from './service/election-http.service';
import { ElectionsDataSource } from './elections.datasource';
import { ElectionDialog } from './election-dialog.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AsyncPipe, DatePipe, NgClass, NgIf } from '@angular/common';
import { ElectionRequest } from '../model/request/election-request.model';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { Observable } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-elections',
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
    NgClass,
  ],
  templateUrl: './elections.component.html',
  styleUrls: ['./elections.component.scss'],
})
export class ElectionsComponent implements AfterViewInit {
  // TODO: Replace the loading circle with a nice, clean progress bar.
  displayedColumns: string[] = [
    'title',
    'status',
    'endDateTime',
    'createDate',
    'actions',
  ];

  dataSource: ElectionsDataSource;
  loading$: Observable<boolean>;
  total: number = 0;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private http: ElectionHttpService,
    private dialog: MatDialog
  ) {
    this.dataSource = new ElectionsDataSource(this.http);
    this.loading$ = this.dataSource.loading$;
    this.dataSource.total$.subscribe(
      (count: number): number => (this.total = count)
    );
  }

  ngAfterViewInit(): void {
    this.paginator.page.subscribe((): void => {
      this.dataSource.loadElections(
        this.paginator.pageIndex,
        this.paginator.pageSize
      );
    });

    this.dataSource.loadElections();
  }

  refresh(): void {
    this.dataSource.loadElections();
  }

  openCreateDialog(): void {
    const dialogRef: MatDialogRef<ElectionDialog> = this.dialog.open(
      ElectionDialog,
      { width: '400px' }
    );

    dialogRef.afterClosed().subscribe((result: ElectionRequest): void => {
      if (result) {
        this.http.createElection(result).subscribe((): void => {
          this.dataSource.loadElections(
            this.paginator.pageIndex,
            this.paginator.pageSize
          );
        });
      }
    });
  }

  deleteElection(electionId: string): void {
    this.http.deleteElection(electionId).subscribe((): void => {
      this.dataSource.loadElections(
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

  getStatus(endDateTime?: string): {
    text: string;
    icon: string;
    class: string;
  } {
    const now = new Date();

    if (!endDateTime || isNaN(new Date(endDateTime).getTime())) {
      return {
        text: 'Endless',
        icon: 'all_inclusive',
        class: 'status-chip-endless',
      };
    }

    const end = new Date(endDateTime);

    if (end > now) {
      return {
        text: 'Ongoing',
        icon: 'timer',
        class: 'status-chip-ongoing',
      };
    }

    return {
      text: 'Ended',
      icon: 'stop',
      class: 'status-chip-ended',
    };
  }
}
