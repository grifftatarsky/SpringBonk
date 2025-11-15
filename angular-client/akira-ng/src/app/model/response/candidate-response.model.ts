import { SimpleBookResponse } from './simple-book-response.model';
import { VoteResponse } from './vote-response.model';

export interface CandidateResponse {
  id: string;
  base: SimpleBookResponse;
  pitch: string;
  createdDate: string;
  electionId: string;
  nominatorId: string;
  votes: VoteResponse[];
}
