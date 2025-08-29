import { createAction, props } from '@ngrx/store';
import { ElectionResponse } from '../../model/response/election-response.model';
import { CandidateResponse } from '../../model/response/candidate-response.model';

export const loadElection = createAction(
  '[Elections] Load Election',
  props<{ electionId: string }>()
);

export const loadElectionSuccess = createAction(
  '[Elections] Load Election Success',
  props<{ election: ElectionResponse }>()
);

export const loadElectionFailure = createAction(
  '[Elections] Load Election Failure',
  props<{ error?: unknown }>()
);

export const loadCandidates = createAction(
  '[Elections] Load Candidates',
  props<{ electionId: string }>()
);

export const loadCandidatesSuccess = createAction(
  '[Elections] Load Candidates Success',
  props<{ electionId: string; candidates: CandidateResponse[] }>()
);

export const loadCandidatesFailure = createAction(
  '[Elections] Load Candidates Failure',
  props<{ error?: unknown }>()
);

export const setBallotOrder = createAction(
  '[Elections] Set Ballot Order',
  props<{ electionId: string; orderedCandidateIds: string[] }>()
);

export const clearBallot = createAction(
  '[Elections] Clear Ballot',
  props<{ electionId: string }>()
);

// Persisted clear: delete all votes for this election and show success toast
export const resetBallot = createAction(
  '[Elections] Reset Ballot',
  props<{ electionId: string }>()
);

export const resetBallotSuccess = createAction(
  '[Elections] Reset Ballot Success',
  props<{ electionId: string }>()
);

export const resetBallotFailure = createAction(
  '[Elections] Reset Ballot Failure',
  props<{ error?: unknown }>()
);

export const submitBallot = createAction(
  '[Elections] Submit Ballot',
  props<{ electionId: string }>()
);

export const submitBallotSuccess = createAction(
  '[Elections] Submit Ballot Success',
  props<{ electionId: string }>()
);

export const submitBallotFailure = createAction(
  '[Elections] Submit Ballot Failure',
  props<{ error?: unknown }>()
);

// Run election
export const runElection = createAction(
  '[Elections] Run Election',
  props<{ electionId: string }>()
);

export const runElectionSuccess = createAction(
  '[Elections] Run Election Success',
  props<{
    electionId: string;
    result: import('../../model/election-result.model').ElectionResult;
  }>()
);

export const runElectionFailure = createAction(
  '[Elections] Run Election Failure',
  props<{ error?: unknown }>()
);

// Load my ballot (votes) for election
export const loadMyBallot = createAction(
  '[Elections] Load My Ballot',
  props<{ electionId: string }>()
);

export const loadMyBallotSuccess = createAction(
  '[Elections] Load My Ballot Success',
  props<{ electionId: string; order: string[] }>()
);

export const loadMyBallotFailure = createAction(
  '[Elections] Load My Ballot Failure',
  props<{ error?: unknown }>()
);
