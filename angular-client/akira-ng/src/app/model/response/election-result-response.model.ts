import { Flag } from '../type/election-flags';

export interface RoundResultRecord {
  roundNumber: number;
  votes: Record<string, number>;
  eliminatedCandidateIds: string[];
  eliminationMessage: string | null;
}

export interface ElectionResultResponse {
  id: string;
  winnerId: string | null;
  totalVotes: number;
  rounds: RoundResultRecord[];
  closureTime: string;
  flags: Flag[];
}
