import { SimpleBookResponse } from './simple-book-response.model';
import { VoteResponse } from './vote-response.model';

/**
 * Represents a nominated candidate for an election.
 */
export interface CandidateResponse {
  id: string; // UUID
  base: SimpleBookResponse;
  pitch: string;
  createdDate: string; // ISO string
  electionId: string; // UUID
  nominatorId: string; // UUID
  votes: VoteResponse[];
}
