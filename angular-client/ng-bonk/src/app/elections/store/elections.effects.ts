import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import * as ElectionsActions from './elections.actions';
import { ElectionHttpService } from '../../service/http/election-http.service';
import { Store } from '@ngrx/store';
import { catchError, concatMap, from, last, map, of, switchMap, tap, withLatestFrom } from 'rxjs';
import { selectElectionsState } from './elections.reducer';

@Injectable()
export class ElectionsEffects {
  private actions$ = inject(Actions);
  private http = inject(ElectionHttpService);
  private store = inject(Store);

  loadElection$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ElectionsActions.loadElection),
      tap(({ electionId }) =>
        console.log('[ElectionsEffects] loadElection', { electionId })
      ),
      switchMap(({ electionId }) =>
        this.http.getElectionById(electionId).pipe(
          tap(election =>
            console.log('[ElectionsEffects] loadElection success', {
              electionId: election.id,
            })
          ),
          map(election => ElectionsActions.loadElectionSuccess({ election })),
          catchError(error => {
            console.error('[ElectionsEffects] loadElection failure', error);
            return of(ElectionsActions.loadElectionFailure({ error }));
          })
        )
      )
    )
  );

  loadCandidates$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ElectionsActions.loadCandidates),
      tap(({ electionId }) =>
        console.log('[ElectionsEffects] loadCandidates', { electionId })
      ),
      switchMap(({ electionId }) =>
        this.http.getCandidatesByElection(electionId).pipe(
          tap(candidates =>
            console.log('[ElectionsEffects] loadCandidates success', {
              count: candidates.length,
            })
          ),
          map(candidates =>
            ElectionsActions.loadCandidatesSuccess({ electionId, candidates })
          ),
          catchError(error => {
            console.error('[ElectionsEffects] loadCandidates failure', error);
            return of(ElectionsActions.loadCandidatesFailure({ error }));
          })
        )
      )
    )
  );

  submitBallot$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ElectionsActions.submitBallot),
      withLatestFrom(this.store.select(selectElectionsState)),
      switchMap(([{ electionId }, state]) => {
        const order = state.ballotByElection[electionId] || [];
        console.log('[ElectionsEffects] submitBallot', { electionId, orderLength: order.length });

        if (order.length === 0) {
          // Nothing to submit; treat as success
          return of(ElectionsActions.submitBallotSuccess({ electionId }));
        }

        return from(order).pipe(
          concatMap((candidateId, index) =>
            this.http.voteForCandidate(candidateId, index + 1).pipe(
              tap(() =>
                console.log('[ElectionsEffects] voteForCandidate', {
                  candidateId,
                  rank: index + 1,
                })
              )
            )
          ),
          last(),
          map(() => ElectionsActions.submitBallotSuccess({ electionId })),
          catchError(error => {
            console.error('[ElectionsEffects] submitBallot failure', error);
            return of(ElectionsActions.submitBallotFailure({ error }));
          })
        );
      })
    )
  );
}
