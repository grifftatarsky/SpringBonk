import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from './base-http.service';
import { ShelfResponse } from '../../model/response/shelf-response.model';
import { ShelfRequest } from '../../model/request/shelf-request.model';
import { PagedResponse } from '../../model/response/paged-response.model';

@Injectable({
  providedIn: 'root',
})
export class ShelfHttpService extends BaseHttpService {
  private readonly baseUrl: string = this.apiBase + '/shelf';

  // ----- CREATE -----

  createShelf(request: ShelfRequest): Observable<ShelfResponse> {
    return this.post<ShelfResponse>(`${this.baseUrl}`, request);
  }

  // ----- READ -----

  getPagedShelves(
    page = 0,
    size = 10
  ): Observable<PagedResponse<ShelfResponse>> {
    return this.get<PagedResponse<ShelfResponse>>(
      `${this.baseUrl}?page=${page}&size=${size}`
    );
  }

  getUserShelves(): Observable<ShelfResponse[]> {
    return this.get<ShelfResponse[]>(`${this.baseUrl}/all`);
  }

  getShelfById(id: string): Observable<ShelfResponse> {
    return this.get<ShelfResponse>(`${this.baseUrl}/${id}`);
  }

  // ----- UPDATE -----

  updateShelf(id: string, request: ShelfRequest): Observable<ShelfResponse> {
    return this.put<ShelfResponse>(`${this.baseUrl}/${id}`, request);
  }

  // ----- DELETE -----

  removeAllBooksFromShelf(id: string): Observable<void> {
    return this.delete<void>(`${this.baseUrl}/${id}/books`);
  }

  deleteShelf(id: string): Observable<void> {
    return this.delete<void>(`${this.baseUrl}/${id}`);
  }
}
