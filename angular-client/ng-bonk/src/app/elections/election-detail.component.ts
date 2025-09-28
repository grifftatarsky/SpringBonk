import { AsyncPipe, CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DividerModule } from 'primeng/divider';
import { DialogService } from 'primeng/dynamicdialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  Observable,
  of,
  shareReplay,
  startWith,
  switchMap,
} from 'rxjs';
import { Actions, ofType } from '@ngrx/effects';
import { UserService } from '../service/user.service';
import { ElectionHttpService } from '../service/http/election-http.service';
import { BookCoverComponent } from '../common/book-cover.component';
import { ElectionResponse } from '../model/response/election-response.model';
import { CandidateResponse } from '../model/response/candidate-response.model';
import { ElectionResult } from '../model/election-result.model';
import * as ElectionsActions from '../store/action/elections.actions';
import {
  selectBallotOrder,
  selectCandidates,
  selectCurrentElection,
  selectElectionResults,
  selectLatestElectionResult,
  selectLoadingCandidates,
  selectLoadingElection,
  selectLoadingResults,
  selectRankedCandidates,
  selectReopeningElection,
  selectRunResult,
  selectRunning,
  selectSavingElection,
  selectSubmitting,
  selectUnrankedCandidates,
} from '../store/selector/elections.selectors';
import { NominateToElectionDialogComponent } from './dialog/nominate-to-election-dialog.component';
import { BookBlurbDialogComponent } from './dialog/book-blurb-dialog.component';
import { ReopenElectionDialogComponent } from './dialog/reopen-election-dialog.component';
import { ElectionDialog } from './election-dialog.component';
import { ConfirmDialogComponent } from '../common/confirm-dialog.component';
import { ElectionRunDialogComponent } from './dialog/election-run-dialog.component';
import { BookDetailDialog } from '../library/dialog/book-detail-dialog.component';
import { NotificationService } from '../service/notification.service';
import { ElectionRequest } from '../model/request/election-request.model';
import { RoundResult } from '../model/round-result.model';

@Component({
  selector: 'app-election-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    AsyncPipe,
    DatePipe,
    ToolbarModule,
    ButtonModule,
    CardModule,
    TagModule,
    DividerModule,
    ProgressSpinnerModule,
    BookCoverComponent,
  ],
  templateUrl: './election-detail.component.html',
  styleUrls: ['./election-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElectionDetailComponent implements OnInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);
  private readonly dialog = inject(DialogService);
  private readonly notify = inject(NotificationService);
  private readonly userService = inject(UserService);
  private readonly electionHttpService = inject(ElectionHttpService);
  private readonly router = inject(Router);
  private readonly actions$ = inject(Actions);

  private electionId = '';
  private candidateMap: Map<string, CandidateResponse> = new Map();
  pending = false;

  private readonly electionId$ = this.route.paramMap.pipe(
    map((params: ParamMap) => params.get('id') ?? ''),
    filter(id => id.length > 0),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly election$ = this.store.select(selectCurrentElection);
  readonly loadingElection$ = this.store.select(selectLoadingElection);
  readonly loadingCandidates$ = this.store.select(selectLoadingCandidates);
  readonly loadingResults$ = this.store.select(selectLoadingResults);
  readonly submitting$ = this.store.select(selectSubmitting);
  readonly running$ = this.store.select(selectRunning);
  readonly savingElection$ = this.store.select(selectSavingElection);
  readonly reopeningElection$ = this.store.select(selectReopeningElection);
  readonly latestResult$ = this.store.select(selectLatestElectionResult);
  readonly results$ = this.store.select(selectElectionResults).pipe(map(factory => factory(this.electionId)));
  readonly runResult$ = this.store.select(selectRunResult);

  private readonly rankedFactory$ = this.store.select(selectRankedCandidates);
  private readonly unrankedFactory$ = this.store.select(selectUnrankedCandidates);
  private readonly orderFactory$ = this.store.select(selectBallotOrder);

  readonly ranked$ = this.electionId$.pipe(
    switchMap(id => this.rankedFactory$.pipe(map(factory => factory(id))))
  );

  readonly unranked$ = this.electionId$.pipe(
    switchMap(id => this.unrankedFactory$.pipe(map(factory => factory(id))))
  );

  readonly order$ = this.electionId$.pipe(
    switchMap(id => this.orderFactory$.pipe(map(factory => factory(id))))
  );

  readonly myNominationId$ = combineLatest([
    this.store.select(selectCandidates),
    this.userService.valueChanges,
  ]).pipe(
    map(([candidates, user]) => {
      const myId = user?.id ?? '';
      const mine = candidates.find(candidate => candidate.nominatorId === myId);
      return mine?.id ?? null;
    })
  );

  readonly viewModel$ = combineLatest([
    this.election$,
    this.ranked$,
    this.unranked$,
    this.order$,
    this.loadingElection$,
    this.loadingCandidates$,
    this.loadingResults$,
    this.submitting$,
    this.running$,
    this.savingElection$,
    this.reopeningElection$,
    this.latestResult$,
    this.store.select(selectElectionResults),
    this.myNominationId$,
  ]).pipe(
    map(([
      election,
      ranked,
      unranked,
      order,
      loadingElection,
      loadingCandidates,
      loadingResults,
      submitting,
      running,
      saving,
      reopening,
      latest,
      resultsFactory,
      myNomination,
    ]) => {
      const results = resultsFactory(this.electionId);
      const isClosed = election?.status === 'CLOSED';
      return {
        election,
        ranked,
        unranked,
        order,
        loadingElection,
        loadingCandidates,
        loadingResults,
        submitting,
        running,
        saving,
        reopening,
        latest,
        results,
        myNomination,
        isClosed,
        ballotLocked: isClosed,
        showLoading: loadingElection || loadingCandidates,
      };
    })
  );

  constructor() {
    this.electionId$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(id => {
        this.electionId = id;
        this.pending = false;
        this.store.dispatch(ElectionsActions.loadElection({ electionId: id }));
        this.store.dispatch(ElectionsActions.loadCandidates({ electionId: id }));
        this.store.dispatch(ElectionsActions.loadMyBallot({ electionId: id }));
        this.store.dispatch(ElectionsActions.loadElectionResults({ electionId: id }));
      });

    this.store
      .select(selectCandidates)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(candidates => {
        this.candidateMap = new Map(
          candidates.map(candidate => [candidate.id, candidate] as const)
        );
      });

    this.actions$
      .pipe(
        ofType(
          ElectionsActions.submitBallotSuccess,
          ElectionsActions.resetBallotSuccess
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ electionId }) => {
        if (electionId === this.electionId) {
          this.pending = false;
        }
      });
  }

  ngOnInit(): void {
    // noop
  }

  ngOnDestroy(): void {
    // handled by destroyRef
  }

  hasPendingChanges(): boolean {
    return this.pending;
  }

  getElectionId(): string {
    return this.electionId;
  }

  addToRanked(candidate: CandidateResponse, ranked: CandidateResponse[]): void {
    const newOrder = [...ranked.map(c => c.id), candidate.id];
    this.store.dispatch(
      ElectionsActions.setBallotOrder({
        electionId: this.electionId,
        orderedCandidateIds: newOrder,
      })
    );
    this.pending = true;
  }

  removeFromRanked(candidate: CandidateResponse, ranked: CandidateResponse[]): void {
    const newOrder = ranked
      .map(c => c.id)
      .filter(id => id !== candidate.id);
    this.store.dispatch(
      ElectionsActions.setBallotOrder({
        electionId: this.electionId,
        orderedCandidateIds: newOrder,
      })
    );
    this.pending = true;
  }

  moveUp(index: number, ranked: CandidateResponse[]): void {
    if (index <= 0) return;
    const order = [...ranked.map(c => c.id)];
    [order[index - 1], order[index]] = [order[index], order[index - 1]];
    this.store.dispatch(
      ElectionsActions.setBallotOrder({
        electionId: this.electionId,
        orderedCandidateIds: order,
      })
    );
    this.pending = true;
  }

  moveDown(index: number, ranked: CandidateResponse[]): void {
    if (index >= ranked.length - 1) return;
    const order = [...ranked.map(c => c.id)];
    [order[index], order[index + 1]] = [order[index + 1], order[index]];
    this.store.dispatch(
      ElectionsActions.setBallotOrder({
        electionId: this.electionId,
        orderedCandidateIds: order,
      })
    );
    this.pending = true;
  }

  submitBallot(): void {
    if (!this.pending) return;
    this.store.dispatch(ElectionsActions.submitBallot({ electionId: this.electionId }));
  }

  resetBallot(): void {
    this.store.dispatch(ElectionsActions.resetBallot({ electionId: this.electionId }));
  }

  clearBallot(): void {
    this.store.dispatch(ElectionsActions.clearBallot({ electionId: this.electionId }));
    this.pending = true;
  }

  openNominateDialog(): void {
    const ref = this.dialog.open(NominateToElectionDialogComponent, {
      header: 'Nominate to election',
      width: 'min(620px, 95vw)',
      data: { electionId: this.electionId },
    });

    ref.onClose
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(changed => {
        if (changed) {
          this.store.dispatch(
            ElectionsActions.loadCandidates({ electionId: this.electionId })
          );
        }
      });
  }

  openBlurb(candidate: CandidateResponse): void {
    if (!candidate.base.blurb) return;
    this.dialog.open(BookBlurbDialogComponent, {
      header: candidate.base.title,
      width: 'min(580px, 95vw)',
      data: { title: candidate.base.title, blurb: candidate.base.blurb },
    });
  }

  openBookDetail(candidate: CandidateResponse): void {
    this.dialog.open(BookDetailDialog, {
      header: candidate.base.title,
      width: 'min(640px, 95vw)',
      data: { book: candidate.base },
    });
  }

  runElection(): void {
    this.dialog.open(ElectionRunDialogComponent, {
      header: 'Run election',
      width: 'min(420px, 90vw)',
      data: { electionId: this.electionId },
    });
  }

  openEditDialog(election: ElectionResponse | null): void {
    if (!election) return;
    const ref = this.dialog.open(ElectionDialog, {
      header: 'Edit election',
      width: 'min(420px, 92vw)',
      data: { title: election.title, endDateTime: election.endDateTime },
    });

    ref.onClose
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((request?: ElectionRequest) => {
        if (!request) return;
        this.store.dispatch(
          ElectionsActions.saveElectionDetails({
            electionId: election.id,
            request,
          })
        );
      });
  }

  openReopenDialog(election: ElectionResponse | null): void {
    if (!election || election.status !== 'CLOSED') return;
    const ref = this.dialog.open(ReopenElectionDialogComponent, {
      header: 'Reopen election',
      width: 'min(420px, 90vw)',
      data: { title: election.title },
    });

    ref.onClose
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(result => {
        if (!result) return;
        this.store.dispatch(
          ElectionsActions.reopenElection({
            electionId: election.id,
            endDateTime: result.endDateTime,
          })
        );
      });
  }

  confirmDelete(election: ElectionResponse): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      header: 'Delete election',
      width: 'min(420px, 90vw)',
      data: {
        title: 'Delete election',
        message: `Delete "${election.title}" permanently?`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    ref.onClose
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirm => {
        if (!confirm) return;
        this.electionHttpService
          .deleteElection(election.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            this.notify.success('Election deleted.');
            this.router.navigate(['/elections']);
          });
      });
  }

  removeMyNomination(candidateId: string): void {
    const electionId = this.electionId;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      header: 'Remove nomination',
      width: 'min(420px, 90vw)',
      data: {
        title: 'Remove nomination',
        message: 'Remove your nomination from this election?',
        confirmText: 'Remove',
        cancelText: 'Keep',
      },
    });

    ref.onClose
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirm => {
        if (!confirm) return;
        this.electionHttpService
          .deleteCandidate(electionId, candidateId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            this.notify.success('Nomination removed.');
            this.store.dispatch(
              ElectionsActions.loadCandidates({ electionId })
            );
          });
      });
  }

  statusTag(election: ElectionResponse | null): {
    label: string;
    severity: 'success' | 'info' | 'danger';
    description?: string;
  } {
    if (!election) {
      return { label: 'Unknown', severity: 'info' };
    }
    switch (election.status) {
      case 'OPEN':
        return {
          label: 'Open',
          severity: 'success',
          description: election.endDateTime
            ? `Closes ${new Date(election.endDateTime).toLocaleString()}`
            : 'No scheduled closure',
        };
      case 'CLOSED':
        return {
          label: 'Closed',
          severity: 'danger',
          description: election.endDateTime
            ? `Closed ${new Date(election.endDateTime).toLocaleString()}`
            : undefined,
        };
      default:
        return {
          label: 'Indefinite',
          severity: 'info',
          description: 'Runs without an end date',
        };
    }
  }

  resolveCandidateName(candidateId: string | null): string {
    if (!candidateId) return 'Unknown';
    return this.candidateMap.get(candidateId)?.base.title ?? 'Unknown';
  }

  trackByCandidate(_index: number, candidate: CandidateResponse): string {
    return candidate.id;
  }

  formatEliminationMessage(message?: string): string {
    if (!message) return '';
    return message
      .toLowerCase()
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
      .replace('Tie ', 'Tie: ');
  }

  formatEliminatedList(round?: RoundResult): string {
    if (!round?.eliminatedCandidateIds?.length) {
      return '—';
    }
    return round.eliminatedCandidateIds
      .map(id => this.resolveCandidateName(id))
      .join(', ');
  }
}
