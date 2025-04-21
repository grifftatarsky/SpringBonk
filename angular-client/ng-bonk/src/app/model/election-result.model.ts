import { RoundResult } from './round-result.model';

/**
 * Represents the result of a completed election.
 */
export interface ElectionResult {
  winnerId: string; // UUID
  totalVotes: number;
  rounds: RoundResult[];
}
