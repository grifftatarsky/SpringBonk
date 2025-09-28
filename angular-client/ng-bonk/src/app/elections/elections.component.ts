import { AsyncPipe, CommonModule, NgClass } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { Router, RouterLink, RouterOutlet, ActivatedRoute, NavigationEnd } from '@angular/router';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Observable, filter, map, startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ElectionHttpService } from '../service/http/election-http.service';
import { ElectionsDataSource } from '../datasource/elections.datasource';
import { ElectionDialog } from './election-dialog.component';
import { ElectionRequest } from '../model/request/election-request.model';
import { ElectionResponse } from '../model/response/election-response.model';
import { Actions, ofType } from '@ngrx/effects';
import * as ElectionsActions from '../store/action/elections.actions';

@Component({
  selector: 'app-elections',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterOutlet,
    AsyncPipe,
    NgClass,
    ToolbarModule,
    ButtonModule,
    CardModule,
    TagModule,
    ProgressSpinnerModule,
    TooltipModule,
  ],
  templateUrl: './elections.component.html',
  styleUrls: ['./elections.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElectionsComponent implements OnInit, AfterViewInit {
  private readonly electionHttp = inject(ElectionHttpService);
  private readonly dialog = inject(DialogService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly actions$ = inject(Actions);
  private readonly destroyRef = inject(DestroyRef);

  dataSource = new ElectionsDataSource(this.electionHttp);
  loading$ = this.dataSource.loading$;
  elections$!: Observable<ElectionResponse[]>;

  total = 0;
  private pageIndex = 0;
  private readonly pageSize = 10;
  private electionCount = 0;

  hasSelection$: Observable<boolean> = this.router.events.pipe(
    filter(event => event instanceof NavigationEnd),
    startWith(null),
    map(() => !!this.route.firstChild?.snapshot.paramMap.get('id'))
  );

  selectedId$: Observable<string | null> = this.router.events.pipe(
    filter(event => event instanceof NavigationEnd),
    startWith(null),
    map(() => this.route.firstChild?.snapshot.paramMap.get('id') ?? null)
  );

  @ViewChild('listContainer', { static: true })
  listContainer!: ElementRef<HTMLElement>;

  constructor() {
    this.dataSource.total$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(count => (this.total = count));
  }

  ngOnInit(): void {
    this.elections$ = this.dataSource.connect();
    this.elections$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(list => (this.electionCount = list.length));

    this.dataSource.loadElections(this.pageIndex, this.pageSize);

    this.actions$
      .pipe(
        ofType(
          ElectionsActions.saveElectionDetailsSuccess,
          ElectionsActions.reopenElectionSuccess,
          ElectionsActions.loadElectionSuccess
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ election }) => {
        const currentId =
          this.route.firstChild?.snapshot.paramMap.get('id') ?? null;
        if (currentId && election.id === currentId) {
          this.refresh(false);
        }
      });
  }

  ngAfterViewInit(): void {
    // reserved for future enhancements
  }

  refresh(reset: boolean = true): void {
    if (reset) {
      this.pageIndex = 0;
    }
    this.dataSource.loadElections(this.pageIndex, this.pageSize);
  }

  openCreateDialog(): void {
    const ref: DynamicDialogRef = this.dialog.open(ElectionDialog, {
      header: 'New Election',
      width: 'min(420px, 92vw)',
    });

    ref.onClose
      .pipe(
        filter((result): result is ElectionRequest => !!result),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(request => {
        this.electionHttp
          .createElection(request)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => this.refresh(false));
      });
  }

  navigateToDetail(electionId: string): void {
    this.router.navigate([electionId], { relativeTo: this.route });
  }

  deleteElection(electionId: string): void {
    this.electionHttp
      .deleteElection(electionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pageIndex = 0;
        this.dataSource.loadElections(this.pageIndex, this.pageSize);
      });
  }

  onListScroll(event: Event): void {
    const el = event.target as HTMLElement;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 200;
    if (nearBottom && this.electionCount < this.total) {
      this.pageIndex += 1;
      this.dataSource.loadElections(this.pageIndex, this.pageSize);
    }
  }

  statusFor(election: ElectionResponse): {
    label: string;
    severity: 'success' | 'danger' | 'info';
    tooltip?: string;
  } {
    switch (election.status) {
      case 'OPEN':
        return {
          label: election.endDateTime ? 'Open until' : 'Open',
          severity: 'success',
          tooltip: election.endDateTime
            ? new Date(election.endDateTime).toLocaleString()
            : 'No scheduled closure',
        };
      case 'CLOSED':
        return {
          label: 'Closed',
          severity: 'danger',
          tooltip: election.endDateTime
            ? new Date(election.endDateTime).toLocaleString()
            : undefined,
        };
      case 'INDEFINITE':
      default:
        return {
          label: 'Indefinite',
          severity: 'info',
        };
    }
  }
}
