import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ElectionHttpService } from '../service/http/election-http.service';
import { ElectionsDataSource } from '../datasource/elections.datasource';
import { ElectionDialog } from './election-dialog.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AsyncPipe, DatePipe, NgClass } from '@angular/common';
import { ElectionRequest } from '../model/request/election-request.model';
import { Observable } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterOutlet,
} from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRippleModule } from '@angular/material/core';
import { ElectionResponse } from '../model/response/election-response.model';

@Component({
  selector: 'app-elections',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatProgressBarModule,
    MatChipsModule,
    MatIconModule,
    MatCardModule,
    MatTooltipModule,
    MatRippleModule,
    RouterOutlet,
    DatePipe,
    AsyncPipe,
    NgClass
],
  templateUrl: './elections.component.html',
  styleUrls: ['./elections.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElectionsComponent implements OnInit, AfterViewInit {
  dataSource: ElectionsDataSource;
  loading$: Observable<boolean>;
  total: number = 0;
  elections$!: Observable<ElectionResponse[]>;

  @ViewChild('listContainer', { static: true })
  listContainer!: ElementRef<HTMLElement>;

  private readonly http = inject(ElectionHttpService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  hasSelection$ = this.router.events.pipe(
    filter(e => e instanceof NavigationEnd),
    startWith(null),
    map(() => !!this.route.firstChild?.snapshot.paramMap.get('id'))
  );
  selectedId$ = this.router.events.pipe(
    filter(e => e instanceof NavigationEnd),
    startWith(null),
    map(() => this.route.firstChild?.snapshot.paramMap.get('id') ?? null)
  );

  constructor() {
    this.dataSource = new ElectionsDataSource(this.http);
    this.loading$ = this.dataSource.loading$;
    this.dataSource.total$.subscribe(
      (count: number): number => (this.total = count)
    );
  }

  private pageIndex = 0;
  private pageSize = 10;
  private electionCount = 0;

  ngOnInit(): void {
    this.elections$ = this.dataSource.connect();
    this.elections$.subscribe(list => (this.electionCount = list.length));
    this.dataSource.loadElections(this.pageIndex, this.pageSize);
  }

  ngAfterViewInit(): void {
    // nothing extra for now
  }

  refresh(): void {
    this.pageIndex = 0;
    this.dataSource.loadElections(this.pageIndex, this.pageSize);
  }

  openCreateDialog(): void {
    const dialogRef: MatDialogRef<ElectionDialog> = this.dialog.open(
      ElectionDialog,
      { width: '400px' }
    );

    dialogRef.afterClosed().subscribe((result: ElectionRequest): void => {
      if (result) {
        this.http.createElection(result).subscribe((): void => {
          this.dataSource.loadElections(this.pageIndex, this.pageSize);
        });
      }
    });
  }

  navigateToDetail(electionId: string): void {
    this.router.navigate([electionId], { relativeTo: this.route });
  }

  deleteElection(electionId: string): void {
    this.http.deleteElection(electionId).subscribe((): void => {
      this.pageIndex = 0;
      this.dataSource.loadElections(this.pageIndex, this.pageSize);
    });
  }

  onListScroll(event: Event): void {
    const el = event.target as HTMLElement;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 200;
    if (nearBottom && this.electionCount < this.total) {
      this.pageIndex++;
      this.dataSource.loadElections(this.pageIndex, this.pageSize);
    }
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
