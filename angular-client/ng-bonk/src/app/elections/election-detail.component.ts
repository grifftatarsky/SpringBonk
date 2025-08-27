import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, } from '@angular/core';
import { AsyncPipe, CommonModule, DatePipe, NgForOf, NgIf, } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { NominateToElectionDialogComponent } from './dialog/nominate-to-election-dialog.component';
import { UserService } from '../service/user.service';
import { ElectionHttpService } from '../service/http/election-http.service';
import { CdkDragDrop, DragDropModule, moveItemInArray, } from '@angular/cdk/drag-drop';
import { BookCoverComponent } from '../common/book-cover.component';
import * as ElectionsActions from './store/elections.actions';
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
} from './store/elections.selectors';
import { combineLatest, map, Observable, Subject, switchMap, takeUntil, } from 'rxjs';
import { ElectionResult } from '../model/election-result.model';
import { EliminationMessage } from '../model/type/elimination-message.enum';
import { CandidateResponse } from '../model/response/candidate-response.model';
import { ElectionResponse } from '../model/response/election-response.model';

@Component({
  selector: 'app-election-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatCardModule,
    MatProgressBarModule,
    DragDropModule,
    BookCoverComponent,
    DatePipe,
    AsyncPipe,
    NgIf,
    NgForOf,
  ],
  templateUrl: './election-detail.component.html',
  styleUrls: ['./election-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElectionDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);
  private readonly dialog = inject(MatDialog);
  private readonly user = inject(UserService);
  private readonly electionHttp = inject(ElectionHttpService);

  election$!: Observable<ElectionResponse | null>;
  loadingElection$!: Observable<boolean>;
  loadingCandidates$!: Observable<boolean>;
  submitting$!: Observable<boolean>;
  running$!: Observable<boolean>;
  runResult$!: Observable<ElectionResult | null>;
  terminalLines$!: Observable<string[]>;

  ranked$!: Observable<CandidateResponse[]>;
  unranked$!: Observable<CandidateResponse[]>;
  order$!: Observable<string[]>;
  myNominationId$!: Observable<string | null>;

  electionId!: string;
  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    const id$ = this.route.paramMap.pipe(
      map(params => params.get('id') || ''),
      takeUntil(this.destroy$)
    );

    // React to id changes: dispatch loads and update local id
    id$.pipe(takeUntil(this.destroy$)).subscribe(id => {
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

    const rankedFactory$ = this.store.select(selectRankedCandidates);
    const unrankedFactory$ = this.store.select(selectUnrankedCandidates);
    const orderFactory$ = this.store.select(selectBallotOrder);

    this.ranked$ = id$.pipe(
      switchMap(id => rankedFactory$.pipe(map(f => f(id))))
    );
    this.unranked$ = id$.pipe(
      switchMap(id => unrankedFactory$.pipe(map(f => f(id))))
    );
    this.order$ = id$.pipe(
      switchMap(id => orderFactory$.pipe(map(f => f(id))))
    );

    this.running$ = this.store.select(selectRunning);
    this.runResult$ = this.store.select(selectRunResult);

    this.terminalLines$ = combineLatest([
      this.runResult$,
      this.store.select(selectCandidates),
    ]).pipe(
      map(([res, candidates]) => {
        if (!res) return [];
        const nameOf = (id: string) =>
          candidates.find(c => c.id === id)?.base.title || id;
        const lines: string[] = [];
        for (const round of res.rounds) {
          lines.push(`Round ${round.roundNumber}`);
          const entries = Object.entries(round.votes || {}).sort(
            (a, b) => b[1] - a[1]
          );
          for (const [cid, count] of entries) {
            lines.push(`- ${nameOf(cid)}: ${count}`);
          }
          switch (round.eliminationMessage) {
            case EliminationMessage.WINNER_MAJORITY:
              lines.push('> Winner by majority');
              break;
            case EliminationMessage.WINNER_ATTRITION:
              lines.push('> Winner by attrition');
              break;
            case EliminationMessage.TIE_ALL_WAY_TIE_ELIMINATION_MESSAGE:
              lines.push('> All-way tie correction round (no eliminations)');
              break;
            case EliminationMessage.TIE_ELIMINATION_MESSAGE:
              lines.push('> Tie: eliminating lowest tied candidates');
              break;
            case EliminationMessage.NO_TIE_ELIMINATION_MESSAGE:
              lines.push('> Eliminating lowest candidate');
              break;
          }
          if (
            (round as any).eliminatedCandidateIds &&
            (round as any).eliminatedCandidateIds.length
          ) {
            lines.push(
              `> Eliminated: ${(round as any).eliminatedCandidateIds.map(nameOf).join(', ')}`
            );
          }
        }
        const winnerName = nameOf(res.winnerId);
        lines.push(`Winner: ${winnerName} (${res.totalVotes} total votes)`);
        return lines;
      })
    );

    // Determine if the current user has a nomination in this election
    this.myNominationId$ = this.store.select(selectCandidates).pipe(
      map((cands: CandidateResponse[]) => {
        const myId = this.user.current.name; // Keycloak subject UUID
        const mine = cands.find(c => c.nominatorId === myId);
        return mine ? mine.id : null;
      })
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Drag within ranked list
  dropRanked(event: CdkDragDrop<unknown>, ranked: CandidateResponse[]): void {
    const newOrder = [...ranked.map(c => c.id)];
    moveItemInArray(newOrder, event.previousIndex, event.currentIndex);
    this.store.dispatch(
      ElectionsActions.setBallotOrder({
        electionId: this.electionId,
        orderedCandidateIds: newOrder,
      })
    );
  }

  // Move from unranked to ranked (append at end)
  addToRanked(candidateId: string, ranked: CandidateResponse[]): void {
    const newOrder = [...ranked.map(c => c.id), candidateId];
    this.store.dispatch(
      ElectionsActions.setBallotOrder({
        electionId: this.electionId,
        orderedCandidateIds: newOrder,
      })
    );
  }

  // Remove from ranked
  removeFromRanked(candidateId: string, ranked: CandidateResponse[]): void {
    const newOrder = ranked.map(c => c.id).filter(id => id !== candidateId);
    this.store.dispatch(
      ElectionsActions.setBallotOrder({
        electionId: this.electionId,
        orderedCandidateIds: newOrder,
      })
    );
  }

  trackByCandidate(_index: number, c: CandidateResponse): string {
    return c.id;
  }

  clearBallot(): void {
    this.store.dispatch(
      ElectionsActions.clearBallot({ electionId: this.electionId })
    );
  }

  submitBallot(): void {
    this.store.dispatch(
      ElectionsActions.submitBallot({ electionId: this.electionId })
    );
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

  removeMyNomination(candidateId: string): void {
    this.electionHttp
      .deleteCandidate(this.electionId, candidateId)
      .subscribe(() => {
        this.store.dispatch(
          ElectionsActions.loadCandidates({ electionId: this.electionId })
        );
      });
  }

  runElection(): void {
    this.store.dispatch(
      ElectionsActions.runElection({ electionId: this.electionId })
    );
  }

  moveUp(index: number, ranked: CandidateResponse[]): void {
    if (index <= 0) return;
    const order = [...ranked.map(c => c.id)];
    const tmp = order[index - 1];
    order[index - 1] = order[index];
    order[index] = tmp;
    this.store.dispatch(
      ElectionsActions.setBallotOrder({
        electionId: this.electionId,
        orderedCandidateIds: order,
      })
    );
  }

  moveDown(index: number, ranked: CandidateResponse[]): void {
    if (index >= ranked.length - 1) return;
    const order = [...ranked.map(c => c.id)];
    const tmp = order[index + 1];
    order[index + 1] = order[index];
    order[index] = tmp;
    this.store.dispatch(
      ElectionsActions.setBallotOrder({
        electionId: this.electionId,
        orderedCandidateIds: order,
      })
    );
  }
}
