import { electionsReducer, initialState } from './elections.reducer';
import * as ElectionsActions from './elections.actions';
import { ElectionResponse } from '../../model/response/election-response.model';
import { ElectionResult } from '../../model/election-result.model';

describe('Elections Reducer', () => {
  it('should return the initial state', () => {
    const action = { type: 'Unknown' } as any;
    const state = electionsReducer(undefined, action);
    expect(state).toEqual(initialState);
  });

  it('should handle loadElectionSuccess', () => {
    const election: ElectionResponse = {
      id: 'e1',
      title: 'Test',
      description: '',
      createdDate: '',
      updatedDate: '',
      ownerId: 'u1',
      base: { id: 'b1', title: 'Book', author: 'A' },
    } as any;
    const state = electionsReducer(
      initialState,
      ElectionsActions.loadElectionSuccess({ election })
    );
    expect(state.election).toEqual(election);
    expect(state.loadingElection).toBeFalse();
  });

  it('should set submitting flag on submit', () => {
    const state = electionsReducer(
      initialState,
      ElectionsActions.submitBallot({ electionId: 'e1' })
    );
    expect(state.submitting).toBeTrue();
  });

  it('should handle runElectionSuccess', () => {
    const result: ElectionResult = {
      winnerId: 'c1',
      totalVotes: 10,
      rounds: [],
    };
    const state = electionsReducer(
      { ...initialState, running: true },
      ElectionsActions.runElectionSuccess({ electionId: 'e1', result })
    );
    expect(state.running).toBeFalse();
    expect(state.runResult).toEqual(result);
  });
});

