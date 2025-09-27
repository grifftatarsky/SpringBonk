import { createSelector } from '@ngrx/store';
import { selectElectionsState } from '../reducer/elections.reducer';
import { CandidateResponse } from '../../model/response/candidate-response.model';
import { ElectionResult } from '../../model/election-result.model';

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

export const selectSavingElection = createSelector(
  selectElectionsState,
  state => state.savingElection
);

export const selectReopeningElection = createSelector(
  selectElectionsState,
  state => state.reopeningElection
);

export const selectLoadingResults = createSelector(
  selectElectionsState,
  state => state.loadingResults
);

export const selectElectionResults = createSelector(
  selectElectionsState,
  state => (electionId: string): ElectionResult[] =>
    state.resultsByElection[electionId] || []
);

export const selectLatestElectionResult = createSelector(
  selectElectionResults,
  resultsFactory => (electionId: string): ElectionResult | null => {
    const results = resultsFactory(electionId);
    return results.length > 0 ? results[0] : null;
  }
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
