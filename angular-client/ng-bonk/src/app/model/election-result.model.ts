import { RoundResult } from './round-result.model';

/**
 * Represents the result of a completed election.
 */
export interface ElectionResult {
  id?: string;
  winnerId: string | null;
  totalVotes: number;
  rounds?: RoundResult[];
  closureTime?: string;
  flags?: string[];
}
