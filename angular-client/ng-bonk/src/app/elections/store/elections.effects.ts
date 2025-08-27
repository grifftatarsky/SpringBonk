import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import * as ElectionsActions from './elections.actions';
import { ElectionHttpService } from '../../service/http/election-http.service';
import { Store } from '@ngrx/store';
import { catchError, concat, forkJoin, last, map, of, switchMap, tap, withLatestFrom } from 'rxjs';
import { NotificationService } from '../../service/notification.service';
import { selectElectionsState } from './elections.reducer';

@Injectable()
export class ElectionsEffects {
  private actions$ = inject(Actions);
  private http = inject(ElectionHttpService);
  private store = inject(Store);
  private notify = inject(NotificationService);

  loadElection$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ElectionsActions.loadElection),
      switchMap(({ electionId }) =>
        this.http.getElectionById(electionId).pipe(
          map(election => ElectionsActions.loadElectionSuccess({ election })),
          catchError(error => of(ElectionsActions.loadElectionFailure({ error })))
        )
      )
    )
  );

  loadCandidates$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ElectionsActions.loadCandidates),
      switchMap(({ electionId }) =>
        this.http.getCandidatesByElection(electionId).pipe(
          map(candidates => ElectionsActions.loadCandidatesSuccess({ electionId, candidates })),
          catchError(error => of(ElectionsActions.loadCandidatesFailure({ error })))
        )
      )
    )
  );

  // Replace-my-ballot semantics: clear existing, then (re)create in the new order
  submitBallot$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ElectionsActions.submitBallot),
      withLatestFrom(this.store.select(selectElectionsState)),
      switchMap(([{ electionId }, state]) => {
        const order = state.ballotByElection[electionId] || [];
        return this.http.getMyVotes(electionId).pipe(
          switchMap(currentVotes => {
            const deleteOps = currentVotes.map(v => this.http.deleteVote(v.candidateId));
            const saveOps = order.map((cid, idx) =>
              this.http.voteForCandidate(cid, idx + 1).pipe(catchError(() => of(void 0)))
            );

            // Build sequence: clear (if any) then save (if any). Ensure at least one emission with of(void 0)
            const steps = [
              deleteOps.length ? forkJoin(deleteOps) : of(void 0),
              order.length ? forkJoin(saveOps) : of(void 0),
            ];

            return concat(...steps).pipe(
              last(),
              map(() => ElectionsActions.submitBallotSuccess({ electionId })),
              tap(() => this.notify.success(order.length ? 'Ballot saved.' : 'Ballot cleared.')),
              catchError(error => of(ElectionsActions.submitBallotFailure({ error })))
            );
          })
        );
      })
    )
  );

  runElection$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ElectionsActions.runElection),
      switchMap(({ electionId }) =>
        this.http.runElection(electionId).pipe(
          map(result => ElectionsActions.runElectionSuccess({ electionId, result })),
          catchError(error => {
            this.notify.error(error?.error?.message || 'Failed to run election.');
            return of(ElectionsActions.runElectionFailure({ error }));
          })
        )
      )
    )
  );

  // Reset ballot: delete all votes for this user/election, set empty order, show toast
  resetBallot$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ElectionsActions.resetBallot),
      switchMap(({ electionId }) =>
        this.http.getMyVotes(electionId).pipe(
          switchMap(currentVotes => {
            const deleteOps = currentVotes.map(v => this.http.deleteVote(v.candidateId));
            const steps = [deleteOps.length ? forkJoin(deleteOps) : of(void 0)];
            return concat(...steps).pipe(
              last(),
              map(() => ElectionsActions.resetBallotSuccess({ electionId })),
              tap(() => this.notify.success('All votes removed')),
              catchError(error => of(ElectionsActions.resetBallotFailure({ error })))
            );
          })
        )
      )
    )
  );

  // Load previous ballot order for this user/election
  loadMyBallot$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ElectionsActions.loadMyBallot),
      switchMap(({ electionId }) =>
        this.http.getMyVotes(electionId).pipe(
          map(votes => {
            // Deduplicate by candidate, keep smallest rank, then sort
            const best = new Map<string, number>();
            for (const v of votes) {
              const r = v.rank ?? 0;
              const cur = best.get(v.candidateId);
              if (cur === undefined || r < cur) best.set(v.candidateId, r);
            }
            return Array.from(best.entries())
              .sort((a, b) => a[1] - b[1])
              .map(([cid]) => cid);
          }),
          map(order => ElectionsActions.loadMyBallotSuccess({ electionId, order })),
          catchError(error => of(ElectionsActions.loadMyBallotFailure({ error })))
        )
      )
    )
  );
}
