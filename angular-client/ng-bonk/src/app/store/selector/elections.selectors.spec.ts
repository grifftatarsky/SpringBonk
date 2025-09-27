import {
  selectBallotOrder,
  selectRankedCandidates,
  selectUnrankedCandidates,
} from './elections.selectors';
import { ElectionsState } from '../reducer/elections.reducer';
import { CandidateResponse } from '../../model/response/candidate-response.model';

describe('Elections Selectors', () => {
  const candidates: CandidateResponse[] = [
    { id: 'c1', base: { id: 'b1', title: 'B1', author: 'A' } } as any,
    { id: 'c2', base: { id: 'b2', title: 'B2', author: 'A' } } as any,
    { id: 'c3', base: { id: 'b3', title: 'B3', author: 'A' } } as any,
  ];

  const state: { elections: ElectionsState } = {
    elections: {
      currentElectionId: 'e1',
      election: null,
      candidates,
      ballotByElection: { e1: ['c2', 'c1'] },
      resultsByElection: { e1: [] },
      loadingElection: false,
      loadingCandidates: false,
      loadingResults: false,
      submitting: false,
      running: false,
      runResult: null,
      savingElection: false,
      reopeningElection: false,
    },
  };

  it('selects order factory and returns ordered ids', () => {
    const orderFactory = selectBallotOrder(state as any);
    expect(orderFactory('e1')).toEqual(['c2', 'c1']);
  });

  it('selects ranked candidates', () => {
    const rankedFactory = selectRankedCandidates(state as any);
    expect(rankedFactory('e1').map(c => c.id)).toEqual(['c2', 'c1']);
  });

  it('selects unranked candidates', () => {
    const unrankedFactory = selectUnrankedCandidates(state as any);
    expect(unrankedFactory('e1').map(c => c.id)).toEqual(['c3']);
  });
});
