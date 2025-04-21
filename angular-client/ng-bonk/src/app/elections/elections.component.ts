import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { NavigationComponent } from '../navigation.component';
import { ElectionHttpService } from './service/election-http.service';
import { ElectionsDataSource } from './elections.datasource';
import { ElectionDialog } from './election-dialog.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AsyncPipe, DatePipe } from '@angular/common';
import { ElectionRequest } from '../model/request/election-request.model';
import { MatPaginator } from '@angular/material/paginator';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-elections',
  standalone: true,
  imports: [
    NavigationComponent,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    DatePipe,
    AsyncPipe
  ],
  templateUrl: './elections.component.html',
  styleUrls: ['./elections.component.scss']
})
export class ElectionsComponent implements AfterViewInit {
  displayedColumns: string[] = ['title', 'endDateTime', 'createDate', 'actions'];

  dataSource: ElectionsDataSource;
  loading$: Observable<boolean>;
  total = 0;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private http: ElectionHttpService,
    private dialog: MatDialog
  ) {
    this.dataSource = new ElectionsDataSource(this.http);
    this.loading$ = this.dataSource.loading$;
    this.dataSource.total$.subscribe(count => this.total = count);
  }

  ngAfterViewInit(): void {
    this.paginator.page.subscribe(() => {
      this.dataSource.loadElections(this.paginator.pageIndex, this.paginator.pageSize);
    });

    this.dataSource.loadElections(); // initial load
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(ElectionDialog, { width: '400px' });

    dialogRef.afterClosed().subscribe((result: ElectionRequest): void => {
      if (result) {
        this.http.createElection(result).subscribe((): void => {
          this.dataSource.loadElections(this.paginator.pageIndex, this.paginator.pageSize);
        });
      }
    });
  }

  deleteElection(electionId: string): void {
    this.http.deleteElection(electionId).subscribe((): void => {
      this.dataSource.loadElections(this.paginator.pageIndex, this.paginator.pageSize);
      if (this.total -1 <= this.paginator.pageSize * this.paginator.pageIndex) {
        this.paginator.previousPage();
      }
    });
  }
}

