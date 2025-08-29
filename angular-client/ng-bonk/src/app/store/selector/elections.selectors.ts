import { createSelector } from '@ngrx/store';
import { selectElectionsState } from '../reducer/elections.reducer';
import { CandidateResponse } from '../../model/response/candidate-response.model';

export const selectCurrentElectionId = createSelector(
  selectElectionsState,
  state => state.currentElectionId
);

export const selectCurrentElection = createSelector(
  selectElectionsState,
  state => state.election
);

export const selectCandidates = createSelector(
  selectElectionsState,
  state => state.candidates
);

export const selectLoadingElection = createSelector(
  selectElectionsState,
  state => state.loadingElection
);

export const selectLoadingCandidates = createSelector(
  selectElectionsState,
  state => state.loadingCandidates
);

export const selectSubmitting = createSelector(
  selectElectionsState,
  state => state.submitting
);

export const selectRunning = createSelector(
  selectElectionsState,
  state => state.running
);

export const selectRunResult = createSelector(
  selectElectionsState,
  state => state.runResult
);

export const selectBallotOrder = createSelector(
  selectElectionsState,
  s =>
    (electionId: string): string[] =>
      s.ballotByElection[electionId] || []
);

export const selectRankedCandidates = createSelector(
  selectCandidates,
  selectBallotOrder,
  (candidates, orderFactory) =>
    (electionId: string): CandidateResponse[] => {
      const order = orderFactory(electionId);
      const map = new Map(candidates.map(c => [c.id, c] as const));
      return order
        .map(id => map.get(id))
        .filter((c): c is CandidateResponse => !!c);
    }
);

export const selectUnrankedCandidates = createSelector(
  selectCandidates,
  selectBallotOrder,
  (candidates, orderFactory) =>
    (electionId: string): CandidateResponse[] => {
      const order = new Set(orderFactory(electionId));
      return candidates.filter(c => !order.has(c.id));
    }
);
