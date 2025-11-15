import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from './base-http.service';
import { ShelfResponse } from '../../model/response/shelf-response.model';
import { SpringPagedResponse } from '../../model/response/spring-paged-response.model';
import { PaginationQuery } from '../../model/type/pagination';
import { ShelfRequest } from '../../model/request/shelf-request.model';

export type ShelfPageRequest = PaginationQuery;

@Injectable({ providedIn: 'root' })
export class ShelfHttpService extends BaseHttpService {
  private readonly baseUrl: string = `${this.apiBase}/shelf`;

  getShelvesPage(params: ShelfPageRequest): Observable<SpringPagedResponse<ShelfResponse>> {
    const queryParams = {
      page: params.page,
      size: params.size,
      ...(params.sort ? { sort: params.sort } : {}),
    };
    return this.get<SpringPagedResponse<ShelfResponse>>(this.baseUrl, queryParams);
  }

  getAllShelves(): Observable<ShelfResponse[]> {
    return this.get<ShelfResponse[]>(`${this.baseUrl}/all`);
  }

  createShelf(payload: ShelfRequest): Observable<ShelfResponse> {
    return this.post<ShelfResponse>(this.baseUrl, payload);
  }

  getShelf(id: string): Observable<ShelfResponse> {
    return this.get<ShelfResponse>(`${this.baseUrl}/${id}`);
  }
}
