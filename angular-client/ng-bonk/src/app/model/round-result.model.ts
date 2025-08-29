import { EliminationMessage } from './type/elimination-message.enum';

/**
 * Represents the results of a single round in a ranked-choice election.
 */
export interface RoundResult {
  roundNumber: number;
  votes: Record<string, number>;
  eliminatedCandidateIds: string[];
  eliminationMessage: EliminationMessage;
}
