import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from '../../service/base-http.service';
import { ElectionResponse } from '../../model/response/election-response.model';
import { ElectionRequest } from '../../model/request/election-request.model';
import { CandidateResponse } from '../../model/response/candidate-response.model';
import { VoteResponse } from '../../model/response/vote-response.model';
import { ElectionResult } from '../../model/election-result.model';
import { PagedResponse } from '../../model/response/paged-response.model';

@Injectable({
  providedIn: 'root',
})
export class ElectionHttpService extends BaseHttpService {
  private readonly baseUrl: string = this.apiBase + '/election';

  // ----- BASIC CRUD -----

  createElection(request: ElectionRequest): Observable<ElectionResponse> {
    return this.post<ElectionResponse>(`${this.baseUrl}`, request);
  }

  updateElection(
    id: string,
    request: ElectionRequest
  ): Observable<ElectionResponse> {
    return this.put<ElectionResponse>(`${this.baseUrl}/${id}`, request);
  }

  deleteElection(id: string): Observable<void> {
    return this.delete<void>(`${this.baseUrl}/${id}`);
  }

  // ----- GETTERS -----

  getPagedElections(
    page = 0,
    size = 10
  ): Observable<PagedResponse<ElectionResponse>> {
    return this.get<PagedResponse<ElectionResponse>>(
      `${this.baseUrl}?page=${page}&size=${size}`
    );
  }

  getAllElections(): Observable<ElectionResponse[]> {
    return this.get<ElectionResponse[]>(`${this.baseUrl}/all`);
  }

  getElectionById(id: string): Observable<ElectionResponse> {
    return this.get<ElectionResponse>(`${this.baseUrl}/${id}`);
  }

  getCandidatesByElection(id: string): Observable<CandidateResponse[]> {
    return this.get<CandidateResponse[]>(`${this.baseUrl}/${id}/candidates`);
  }

  // ----- ELECTION RUN -----

  runElection(id: string): Observable<ElectionResult> {
    return this.get<ElectionResult>(`${this.baseUrl}/${id}/run`);
  }

  // ----- CANDIDATE NOMINATION -----

  nominateCandidate(
    electionId: string,
    bookId: string
  ): Observable<CandidateResponse> {
    return this.post<CandidateResponse>(
      `${this.baseUrl}/${electionId}/nominate/${bookId}`,
      {}
    );
  }

  // ----- VOTING -----

  voteForCandidate(
    candidateId: string,
    rank: number
  ): Observable<VoteResponse> {
    return this.post<VoteResponse>(
      `${this.baseUrl}/vote/${candidateId}/${rank}`,
      {}
    );
  }

  deleteVote(candidateId: string): Observable<void> {
    return this.delete<void>(`${this.baseUrl}/vote/${candidateId}`);
  }
}
