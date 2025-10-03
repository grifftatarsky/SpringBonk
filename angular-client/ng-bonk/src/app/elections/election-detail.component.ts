import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { AsyncPipe, CommonModule, DatePipe, KeyValue } from '@angular/common';
import { ActivatedRoute, ParamMap, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import {
  MatBottomSheet,
  MatBottomSheetModule,
} from '@angular/material/bottom-sheet';
import { MatExpansionModule } from '@angular/material/expansion';
import { NominateToElectionDialogComponent } from './dialog/nominate-to-election-dialog.component';
import { UserService } from '../service/user.service';
import { ElectionHttpService } from '../service/http/election-http.service';
import { BookHttpService } from '../service/http/books-http.service';
import { ShelfHttpService } from '../service/http/shelves-http.service';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { BookCoverComponent } from '../common/book-cover.component';
import * as ElectionsActions from '../store/action/elections.actions';
import {
  selectBallotOrder,
  selectCandidates,
  selectCurrentElection,
  selectLoadingCandidates,
  selectLoadingElection,
  selectRankedCandidates,
  selectRunning,
  selectRunResult,
  selectSubmitting,
  selectUnrankedCandidates,
} from '../store/selector/elections.selectors';
import {
  combineLatest,
  distinctUntilChanged,
  filter as rxFilter,
  map,
  Observable,
  startWith,
  Subject,
  switchMap,
  take,
  takeUntil,
  tap,
  timer,
} from 'rxjs';
import { ElectionResult } from '../model/election-result.model';
import { RoundResult } from '../model/round-result.model';
import { CandidateResponse } from '../model/response/candidate-response.model';
import { ElectionResponse } from '../model/response/election-response.model';
import { ShelfResponse } from '../model/response/shelf-response.model';
import {
  BreakpointObserver,
  Breakpoints,
  BreakpointState,
} from '@angular/cdk/layout';
import { Actions, ofType } from '@ngrx/effects';
import { BookBlurbDialogComponent } from './dialog/book-blurb-dialog.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ReopenElectionDialogComponent } from './dialog/reopen-election-dialog.component';
import { ConfirmDialogComponent } from '../common/confirm-dialog.component';
import { ElectionRequest } from '../model/request/election-request.model';
import { NotificationService } from '../service/notification.service';
import {
  selectElectionResults,
  selectLatestElectionResult,
  selectLoadingResults,
  selectReopeningElection,
  selectSavingElection,
} from '../store/selector/elections.selectors';
import { ElectionDialog } from './election-dialog.component';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-election-detail',
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    BookCoverComponent,
    DatePipe,
    AsyncPipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatMenuModule,
    MatCardModule,
    MatProgressBarModule,
    MatBottomSheetModule,
    MatToolbarModule,
    MatTooltipModule,
    MatExpansionModule,
  ],
  templateUrl: './election-detail.component.html',
  styleUrls: ['./election-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElectionDetailComponent implements OnInit, OnDestroy {
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  // TODO __ Remove use of any.
  private readonly store: Store<any> = inject(Store);
  private readonly dialog: MatDialog = inject(MatDialog);
  private readonly bottomSheet: MatBottomSheet = inject(MatBottomSheet);
  private readonly userService: UserService = inject(UserService);
  private readonly electionHttpService: ElectionHttpService =
    inject(ElectionHttpService);
  private readonly bookHttpService: BookHttpService = inject(BookHttpService);
  private readonly shelfHttpService: ShelfHttpService =
    inject(ShelfHttpService);
  private readonly notify: NotificationService = inject(NotificationService);
  private readonly router: Router = inject(Router);

  election$!: Observable<ElectionResponse | null>;
  loadingElection$!: Observable<boolean>;
  loadingCandidates$!: Observable<boolean>;
  submitting$!: Observable<boolean>;
  running$!: Observable<boolean>;
  runResult$!: Observable<ElectionResult | null>;
  results$!: Observable<ElectionResult[]>;
  latestResult$!: Observable<ElectionResult | null>;
  loadingResults$!: Observable<boolean>;
  savingElection$!: Observable<boolean>;
  reopeningElection$!: Observable<boolean>;

  ranked$!: Observable<CandidateResponse[]>;
  unranked$!: Observable<CandidateResponse[]>;
  order$!: Observable<string[]>;
  myNominationId$!: Observable<string | null>;
  isHandset$!: Observable<boolean>;
  private pending: boolean = false;
  ballotLocked: boolean = false;

  electionId!: string;
  private readonly destroy$: Subject<void> = new Subject<void>();
  private readonly bp: BreakpointObserver = inject(BreakpointObserver);
  // TODO __ Remove use of any.
  private readonly actions$: Actions<any> = inject(Actions);
  private closureTimeoutHandle: number | null = null;
  private closureToastShown = false;
  private awaitingClosure = false;
  private candidateMap: Map<string, CandidateResponse> = new Map();
  private closurePollSub: Subscription | null = null;

  ngOnInit(): void {
    const id$: Observable<string> = this.route.paramMap.pipe(
      map((params: ParamMap): string => params.get('id') || ''),
      takeUntil(this.destroy$)
    );

    // React to id changes: dispatch loads and update local id
    id$.pipe(takeUntil(this.destroy$)).subscribe((id: string): void => {
      this.electionId = id;
      if (id) {
        this.store.dispatch(ElectionsActions.loadElection({ electionId: id }));
        this.store.dispatch(
          ElectionsActions.loadCandidates({ electionId: id })
        );
        this.store.dispatch(ElectionsActions.loadMyBallot({ electionId: id }));
      }
    });

    this.election$ = this.store.select(selectCurrentElection);
    this.loadingElection$ = this.store.select(selectLoadingElection);
    this.loadingCandidates$ = this.store.select(selectLoadingCandidates);
    this.submitting$ = this.store.select(selectSubmitting);
    this.loadingResults$ = this.store.select(selectLoadingResults);
    this.savingElection$ = this.store.select(selectSavingElection);
    this.reopeningElection$ = this.store.select(selectReopeningElection);

    const rankedFactory$ = this.store.select(selectRankedCandidates);
    const unrankedFactory$ = this.store.select(selectUnrankedCandidates);
    const orderFactory$ = this.store.select(selectBallotOrder);
    const resultsFactory$ = this.store.select(selectElectionResults);
    const latestResultFactory$ = this.store.select(selectLatestElectionResult);

    this.ranked$ = id$.pipe(
      switchMap(
        (id: string): Observable<CandidateResponse[]> =>
          rankedFactory$.pipe(map(f => f(id)))
      )
    );
    this.unranked$ = id$.pipe(
      switchMap(
        (id: string): Observable<CandidateResponse[]> =>
          unrankedFactory$.pipe(map(f => f(id)))
      )
    );
    this.order$ = id$.pipe(
      switchMap(
        (id: string): Observable<string[]> =>
          orderFactory$.pipe(map(f => f(id)))
      )
    );
    this.results$ = id$.pipe(
      switchMap((id: string): Observable<ElectionResult[]> =>
        resultsFactory$.pipe(map(f => f(id)))
      )
    );
    this.latestResult$ = id$.pipe(
      switchMap((id: string): Observable<ElectionResult | null> =>
        latestResultFactory$.pipe(map(f => f(id)))
      )
    );

    this.running$ = this.store.select(selectRunning);
    this.runResult$ = this.store.select(selectRunResult);

    // Responsive toolbar behavior
    this.isHandset$ = this.bp
      .observe([Breakpoints.XSmall, Breakpoints.Small])
      .pipe(
        map((state: BreakpointState): boolean => state.matches),
        startWith(false)
      );

    this.myNominationId$ = combineLatest([
      this.store.select(selectCandidates),
      this.userService.valueChanges,
    ]).pipe(
      map(
        ([candidates, u]: [CandidateResponse[], { id: string }]):
          | string
          | null => {
          const myId: string = u?.id ?? '';
          const mine: CandidateResponse | undefined = candidates.find(
            (c: CandidateResponse): boolean => c.nominatorId === myId
          );
          return mine?.id ?? null;
        }
      ),
      distinctUntilChanged()
    );

    this.store
      .select(selectCandidates)
      .pipe(takeUntil(this.destroy$))
      .subscribe((candidates: CandidateResponse[]): void => {
        this.candidateMap = new Map(
          candidates.map((candidate: CandidateResponse) => [candidate.id, candidate])
        );
      });

    this.election$
      .pipe(takeUntil(this.destroy$))
      .subscribe((election: ElectionResponse | null): void => {
        this.setupClosureTimer(election);
        if (election?.status === 'CLOSED') {
          if (this.awaitingClosure) {
            this.awaitingClosure = false;
            this.stopClosurePolling();
            this.store.dispatch(
              ElectionsActions.loadElectionResults({ electionId: election.id })
            );
          }
        }
      });

    // When save or reset succeed for this election, clear pending flag
    this.actions$
      .pipe(
        ofType(
          ElectionsActions.submitBallotSuccess,
          ElectionsActions.resetBallotSuccess
        ),
        rxFilter(a => a.electionId === this.electionId),
        takeUntil(this.destroy$)
      )
      .subscribe((): boolean => (this.pending = false));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearClosureTimer();
    this.stopClosurePolling();
  }

  // Drag within ranked list
  dropRanked(event: CdkDragDrop<unknown>, ranked: CandidateResponse[]): void {
    if (this.ballotLocked) return;
    const newOrder: string[] = [
      ...ranked.map((c: CandidateResponse): string => c.id),
    ];
    moveItemInArray(newOrder, event.previousIndex, event.currentIndex);
    this.store.dispatch(
      ElectionsActions.setBallotOrder({
        electionId: this.electionId,
        orderedCandidateIds: newOrder,
      })
    );
    this.pending = true;
  }

  // Move from unranked to ranked (append at end)
  addToRanked(candidateId: string, ranked: CandidateResponse[]): void {
    if (this.ballotLocked) return;
    const newOrder: string[] = [
      ...ranked.map((c: CandidateResponse): string => c.id),
      candidateId,
    ];
    this.store.dispatch(
      ElectionsActions.setBallotOrder({
        electionId: this.electionId,
        orderedCandidateIds: newOrder,
      })
    );
    this.pending = true;
  }

  // Remove from ranked
  removeFromRanked(candidateId: string, ranked: CandidateResponse[]): void {
    if (this.ballotLocked) return;
    const newOrder: string[] = ranked
      .map((c: CandidateResponse): string => c.id)
      .filter((id: string): boolean => id !== candidateId);
    this.store.dispatch(
      ElectionsActions.setBallotOrder({
        electionId: this.electionId,
        orderedCandidateIds: newOrder,
      })
    );
    this.pending = true;
  }

  trackByCandidate(_index: number, c: CandidateResponse): string {
    return c.id;
  }

  // TODO __ why is this unused...
  clearBallot(): void {
    if (this.ballotLocked) return;
    this.store.dispatch(
      ElectionsActions.clearBallot({ electionId: this.electionId })
    );
  }

  resetBallot(): void {
    if (this.ballotLocked) return;
    this.store.dispatch(
      ElectionsActions.resetBallot({ electionId: this.electionId })
    );
  }

  submitBallot(): void {
    if (this.ballotLocked) return;
    this.store.dispatch(
      ElectionsActions.submitBallot({ electionId: this.electionId })
    );
  }

  hasPendingChanges(): boolean {
    return this.pending;
  }

  getElectionId(): string {
    return this.electionId;
  }

  openNominateDialog(): void {
    this.dialog
      .open(NominateToElectionDialogComponent, {
        width: '720px',
        data: { electionId: this.electionId },
      })
      .afterClosed()
      .subscribe(changed => {
        if (changed) {
          // Refresh candidates
          this.store.dispatch(
            ElectionsActions.loadCandidates({ electionId: this.electionId })
          );
        }
      });
  }

  openNominateSearch(): void {
    import('./sheet/election-book-search.sheet').then(m => {
      this.bottomSheet
        .open(m.ElectionBookSearchSheetComponent, {
          panelClass: ['sheet-max', 'book-sheet'],
          data: { electionId: this.electionId },
        })
        .afterDismissed()
        .pipe(take(1))
        .subscribe(changed => {
          if (changed) {
            this.store.dispatch(
              ElectionsActions.loadCandidates({ electionId: this.electionId })
            );
          }
        });
    });
  }

  removeMyNomination(candidateId: string): void {
    // Find bookId for candidate so we can also remove it from "My Nominations" shelf
    this.store
      .select(selectCandidates)
      .pipe(take(1))
      .subscribe((candidates: CandidateResponse[]): void => {
        const candidate: CandidateResponse | undefined = candidates.find(
          (c: CandidateResponse) => c.id === candidateId
        );
        const bookId: string | undefined = candidate?.base?.id;
        this.electionHttpService
          .deleteCandidate(this.electionId, candidateId)
          .subscribe((): void => {
            this.store.dispatch(
              ElectionsActions.loadCandidates({ electionId: this.electionId })
            );
            if (bookId) {
              this.shelfHttpService
                .getUserShelves()
                .pipe(take(1))
                .subscribe((shelves: ShelfResponse[]): void => {
                  const nominationsShelf: ShelfResponse | undefined =
                    shelves.find(
                      (s: ShelfResponse): boolean =>
                        s.title === 'My Nominations'
                    );
                  if (nominationsShelf) {
                    this.bookHttpService
                      .removeBookFromShelf(bookId, nominationsShelf.id)
                      .pipe(take(1))
                      .subscribe({
                        next: (): void => {},
                        error: (): void => {},
                      });
                  }
                });
            }
          });
      });
  }

  runElection(): void {
    // Open fun results sheet instead of inline
    import('./sheet/election-run.sheet').then(m => {
      this.bottomSheet.open(m.ElectionRunSheetComponent, {
        data: { electionId: this.electionId },
        disableClose: false,
      });
    });
  }

  moveUp(index: number, ranked: CandidateResponse[]): void {
    if (this.ballotLocked) return;
    if (index <= 0) return;
    const order: string[] = [
      ...ranked.map((c: CandidateResponse): string => c.id),
    ];
    const tmp: string = order[index - 1];
    order[index - 1] = order[index];
    order[index] = tmp;
    this.store.dispatch(
      ElectionsActions.setBallotOrder({
        electionId: this.electionId,
        orderedCandidateIds: order,
      })
    );
    this.pending = true;
  }

  moveDown(index: number, ranked: CandidateResponse[]): void {
    if (this.ballotLocked) return;
    if (index >= ranked.length - 1) return;
    const order: string[] = [
      ...ranked.map((c: CandidateResponse): string => c.id),
    ];
    const tmp: string = order[index + 1];
    order[index + 1] = order[index];
    order[index] = tmp;
    this.store.dispatch(
      ElectionsActions.setBallotOrder({
        electionId: this.electionId,
        orderedCandidateIds: order,
      })
    );
    this.pending = true;
  }

  openBlurb(c: CandidateResponse): void {
    this.dialog.open(BookBlurbDialogComponent, {
      width: '640px',
      data: { title: c.base.title, blurb: c.base.blurb },
    });
  }

  openEditDialog(election: ElectionResponse | null): void {
    if (!election || election.status === 'CLOSED') return;
    const ref = this.dialog.open(ElectionDialog, {
      width: '440px',
      data: {
        title: election.title,
        endDateTime: election.endDateTime,
      } satisfies ElectionRequest,
    });

    ref
      .afterClosed()
      .pipe(take(1))
      .subscribe((request: ElectionRequest | undefined): void => {
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
      width: '420px',
      data: { title: election.title },
    });

    ref
      .afterClosed()
      .pipe(take(1))
      .subscribe(
        (result?: { endDateTime: string }): void => {
          if (!result) return;
          this.store.dispatch(
            ElectionsActions.reopenElection({
              electionId: election.id,
              endDateTime: result.endDateTime,
            })
          );
        }
      );
  }

  confirmDelete(election: ElectionResponse | null): void {
    if (!election) return;
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Delete election',
        message: `Delete "${election.title}"? This cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((confirm: boolean): void => {
        if (!confirm) return;
        this.electionHttpService.deleteElection(election.id).subscribe({
          next: (): void => {
            this.notify.success('Election deleted.');
            void this.router.navigate(['/elections']);
          },
          error: (err: unknown): void => {
            const message: string =
              (err as any)?.error?.message || 'Failed to delete election.';
            this.notify.error(message);
          },
        });
      });
  }

  isElectionClosed(election: ElectionResponse | null): boolean {
    if (!election) return false;
    return election.status === 'CLOSED' || this.ballotLocked;
  }

  statusChip(election: ElectionResponse | null): {
    label: string;
    icon: string;
    class: string;
  } {
    if (!election) {
      return { label: 'Loading…', icon: 'hourglass_empty', class: 'chip-loading' };
    }

    if (this.ballotLocked && election.status !== 'CLOSED') {
      return { label: 'Closing…', icon: 'lock_clock', class: 'chip-closing' };
    }

    switch (election.status) {
      case 'OPEN':
        return { label: 'Open', icon: 'how_to_vote', class: 'chip-open' };
      case 'CLOSED':
        return { label: 'Closed', icon: 'lock', class: 'chip-closed' };
      case 'INDEFINITE':
      default:
        return { label: 'Indefinite', icon: 'all_inclusive', class: 'chip-indefinite' };
    }
  }

  resolveCandidateName(candidateId: string | null): string {
    if (!candidateId) return 'Unknown';
    return this.candidateMap.get(candidateId)?.base.title ?? 'Unknown';
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

  compareVoteEntries(
    a: KeyValue<string, number>,
    b: KeyValue<string, number>
  ): number {
    return (b.value ?? 0) - (a.value ?? 0);
  }

  trackByResult(_index: number, result: ElectionResult): string {
    return result.id ?? `${result.closureTime}-${result.winnerId ?? 'none'}`;
  }

  formatEliminatedList(round?: RoundResult): string {
    if (!round?.eliminatedCandidateIds?.length) {
      return '—';
    }
    return round.eliminatedCandidateIds
        .map(id => this.resolveCandidateName(id))
        .join(', ');
  }

  hasEliminated(round?: RoundResult): boolean {
    return !!round?.eliminatedCandidateIds?.length;
  }

  private setupClosureTimer(election: ElectionResponse | null): void {
    this.clearClosureTimer();

    if (!election) return;

    this.ballotLocked = election.status === 'CLOSED';
    if (this.ballotLocked) {
      this.awaitingClosure = false;
    }

    if (election.status !== 'OPEN' || !election.endDateTime) {
      if (election.status !== 'CLOSED') {
        this.closureToastShown = false;
      }
      return;
    }

    const target = new Date(election.endDateTime).getTime();
    const now = Date.now();
    const diff = target - now;

    if (diff <= 0) {
      this.handleClosureReached();
      return;
    }

    this.closureToastShown = false;
    this.ballotLocked = false;
    this.awaitingClosure = false;
    this.closureTimeoutHandle = window.setTimeout(
      () => this.handleClosureReached(),
      diff
    );
  }

  private clearClosureTimer(): void {
    if (this.closureTimeoutHandle !== null) {
      clearTimeout(this.closureTimeoutHandle);
      this.closureTimeoutHandle = null;
    }
  }

  private handleClosureReached(): void {
    this.clearClosureTimer();
    if (this.awaitingClosure) {
      return;
    }
    this.awaitingClosure = true;
    this.ballotLocked = true;
    this.pending = false;
    if (!this.closureToastShown) {
      this.notify.error("TOO LATE! YOU'RE ALL OUT OF TIME!");
      this.closureToastShown = true;
    }
    if (this.electionId) {
      this.startClosurePolling();
    }
  }

  private startClosurePolling(): void {
    if (this.closurePollSub || !this.electionId) return;
    this.closurePollSub = timer(0, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (!this.electionId) return;
        this.store.dispatch(
          ElectionsActions.loadElection({ electionId: this.electionId })
        );
        this.store.dispatch(
          ElectionsActions.loadElectionResults({ electionId: this.electionId })
        );
      });
  }

  private stopClosurePolling(): void {
    if (this.closurePollSub) {
      this.closurePollSub.unsubscribe();
      this.closurePollSub = null;
    }
  }
}
