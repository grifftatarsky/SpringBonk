import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from './base-http.service';
import { SpringPagedResponse } from '../../model/response/spring-paged-response.model';
import { ElectionResponse } from '../../model/response/election-response.model';
import { PaginationQuery } from '../../model/type/pagination';
import { ElectionRequest } from '../../model/request/election-request.model';
import { CandidateResponse } from '../../model/response/candidate-response.model';
import { ElectionResultResponse } from '../../model/response/election-result-response.model';
import { ElectionReopenRequest } from '../../model/request/election-reopen-request.model';

export type ElectionPageRequest = PaginationQuery;

@Injectable({ providedIn: 'root' })
export class ElectionHttpService extends BaseHttpService {
  private readonly baseUrl: string = `${this.apiBase}/election`;

  getElectionsPage(params: ElectionPageRequest): Observable<SpringPagedResponse<ElectionResponse>> {
    const queryParams = {
      page: params.page,
      size: params.size,
      ...(params.sort ? { sort: params.sort } : {}),
    };
    return this.get<SpringPagedResponse<ElectionResponse>>(this.baseUrl, queryParams);
  }

  getAllElections(): Observable<ElectionResponse[]> {
    return this.get<ElectionResponse[]>(`${this.baseUrl}/all`);
  }

  createElection(payload: ElectionRequest): Observable<ElectionResponse> {
    return this.post<ElectionResponse>(this.baseUrl, payload);
  }

  updateElection(id: string, payload: ElectionRequest): Observable<ElectionResponse> {
    return this.put<ElectionResponse>(`${this.baseUrl}/${id}`, payload);
  }

  getElection(id: string): Observable<ElectionResponse> {
    return this.get<ElectionResponse>(`${this.baseUrl}/${id}`);
  }

  getCandidates(electionId: string): Observable<CandidateResponse[]> {
    return this.get<CandidateResponse[]>(`${this.baseUrl}/${electionId}/candidates/all`);
  }

  nominateCandidate(electionId: string, bookId: string): Observable<CandidateResponse> {
    return this.post<CandidateResponse>(`${this.baseUrl}/${electionId}/nominate/${bookId}`, {});
  }

  deleteCandidate(electionId: string, candidateId: string): Observable<void> {
    return this.delete<void>(`${this.baseUrl}/${electionId}/candidate/${candidateId}`);
  }

  getElectionResults(electionId: string): Observable<ElectionResultResponse[]> {
    return this.get<ElectionResultResponse[]>(`${this.baseUrl}/${electionId}/results`);
  }

  reopenElection(electionId: string, payload: ElectionReopenRequest): Observable<ElectionResponse> {
    return this.post<ElectionResponse>(`${this.baseUrl}/${electionId}/reopen`, payload);
  }

  deleteElection(electionId: string): Observable<void> {
    return this.delete<void>(`${this.baseUrl}/${electionId}`);
  }

  closeElection(electionId: string): Observable<void> {
    return this.post<void>(`${this.baseUrl}/${electionId}/close`, {});
  }
}
