import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from './base-http.service';
import { SpringPagedResponse } from '../../model/response/spring-paged-response.model';
import { ElectionResponse } from '../../model/response/election-response.model';
import { PaginationQuery } from '../../model/type/pagination';

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
}
