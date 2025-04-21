import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { NavigationComponent } from '../navigation.component';
import { ElectionHttpService } from './service/election-http.service';
import { ElectionsDataSource } from './elections.datasource';
import { ElectionDialog } from './election-dialog.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DatePipe } from '@angular/common';
import {ElectionRequest} from '../model/request/election-request.model';

@Component({
  selector: 'app-elections',
  standalone: true,
  imports: [
    NavigationComponent,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    DatePipe
  ],
  templateUrl: './elections.component.html',
  styleUrls: ['./elections.component.scss']
})
export class ElectionsComponent {
  displayedColumns: string[] = ['title', 'endDateTime', 'createDate', 'actions'];
  dataSource: ElectionsDataSource;

  constructor(
    private http: ElectionHttpService,
    private dialog: MatDialog
  ) {
    this.dataSource = new ElectionsDataSource(this.http);
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(ElectionDialog, {
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((result: ElectionRequest): void => {
      if (result) {
        this.http.createElection(result).subscribe((): void => this.dataSource.refresh());
      }
    });
  }

  deleteElection(electionId: string): void {
    this.http.deleteElection(electionId).subscribe((): void => this.dataSource.refresh());
  }
}

