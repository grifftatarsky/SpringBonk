/**
 * Represents a single vote for a candidate with rank.
 */
export interface VoteResponse {
  id: string; // UUID
  candidateId: string; // UUID
  userId: string; // UUID
  rank: number;
}
