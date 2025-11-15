import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from './base-http.service';
import { VoteResponse } from '../../model/response/vote-response.model';

@Injectable({ providedIn: 'root' })
export class VotingHttpService extends BaseHttpService {
  private readonly baseUrl: string = `${this.apiBase}/election`;

  getMyVotes(electionId: string): Observable<VoteResponse[]> {
    return this.get<VoteResponse[]>(`${this.baseUrl}/${electionId}/my-votes`);
  }

  voteForCandidate(candidateId: string, rank: number): Observable<VoteResponse> {
    return this.post<VoteResponse>(`${this.baseUrl}/vote/${candidateId}/${rank}`, {});
  }

  deleteVote(candidateId: string): Observable<void> {
    return this.delete<void>(`${this.baseUrl}/vote/${candidateId}`);
  }
}
