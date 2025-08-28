import { createFeature, createReducer, on } from '@ngrx/store';
import * as ElectionsActions from './elections.actions';
import { ElectionResponse } from '../../model/response/election-response.model';
import { CandidateResponse } from '../../model/response/candidate-response.model';

export interface ElectionsState {
  currentElectionId: string | null;
  election: ElectionResponse | null;
  candidates: CandidateResponse[];
  ballotByElection: Record<string, string[]>; // electionId -> ordered candidateIds
  loadingElection: boolean;
  loadingCandidates: boolean;
  submitting: boolean;
  running: boolean;
  runResult: import('../../model/election-result.model').ElectionResult | null;
}

export const initialState: ElectionsState = {
  currentElectionId: null,
  election: null,
  candidates: [],
  ballotByElection: {},
  loadingElection: false,
  loadingCandidates: false,
  submitting: false,
  running: false,
  runResult: null,
};

const reducer = createReducer(
  initialState,
  on(
    ElectionsActions.loadElection,
    (state, { electionId }): ElectionsState => ({
      ...state,
      currentElectionId: electionId,
      loadingElection: true,
    })
  ),
  on(
    ElectionsActions.loadElectionSuccess,
    (state, { election }): ElectionsState => ({
      ...state,
      election,
      loadingElection: false,
    })
  ),
  on(
    ElectionsActions.loadElectionFailure,
    (state): ElectionsState => ({
      ...state,
      loadingElection: false,
    })
  ),

  on(
    ElectionsActions.loadCandidates,
    (state): ElectionsState => ({
      ...state,
      loadingCandidates: true,
    })
  ),
  on(
    ElectionsActions.loadCandidatesSuccess,
    (state, { electionId, candidates }): ElectionsState => ({
      ...state,
      candidates,
      loadingCandidates: false,
      ballotByElection: {
        ...state.ballotByElection,
        [electionId]: state.ballotByElection[electionId] || [],
      },
    })
  ),
  on(
    ElectionsActions.loadCandidatesFailure,
    (state): ElectionsState => ({
      ...state,
      loadingCandidates: false,
    })
  ),

  on(
    ElectionsActions.setBallotOrder,
    (state, { electionId, orderedCandidateIds }): ElectionsState => ({
      ...state,
      ballotByElection: {
        ...state.ballotByElection,
        [electionId]: orderedCandidateIds,
      },
    })
  ),
  on(
    ElectionsActions.clearBallot,
    (state, { electionId }): ElectionsState => ({
      ...state,
      ballotByElection: { ...state.ballotByElection, [electionId]: [] },
    })
  ),
  on(
    ElectionsActions.resetBallotSuccess,
    (state, { electionId }): ElectionsState => ({
      ...state,
      ballotByElection: { ...state.ballotByElection, [electionId]: [] },
      submitting: false,
    })
  ),

  on(
    ElectionsActions.submitBallot,
    (state): ElectionsState => ({
      ...state,
      submitting: true,
    })
  ),
  on(
    ElectionsActions.submitBallotSuccess,
    (state): ElectionsState => ({
      ...state,
      submitting: false,
    })
  ),
  on(
    ElectionsActions.submitBallotFailure,
    (state): ElectionsState => ({
      ...state,
      submitting: false,
    })
  ),
  on(
    ElectionsActions.runElection,
    (state): ElectionsState => ({
      ...state,
      running: true,
      runResult: null,
    })
  ),
  on(
    ElectionsActions.runElectionSuccess,
    (state, { result }): ElectionsState => ({
      ...state,
      running: false,
      runResult: result,
    })
  ),
  on(
    ElectionsActions.runElectionFailure,
    (state): ElectionsState => ({
      ...state,
      running: false,
    })
  ),
  on(
    ElectionsActions.loadMyBallotSuccess,
    (state, { electionId, order }): ElectionsState => ({
      ...state,
      ballotByElection: { ...state.ballotByElection, [electionId]: order },
    })
  )
);

export const electionsFeature = createFeature({
  name: 'elections',
  reducer,
});

export const {
  name: electionsFeatureKey,
  reducer: electionsReducer,
  selectElectionsState,
} = electionsFeature;
