import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BaseHttpService } from './base-http.service';
import {
  UserBookStatusRequest,
  UserBookStatusResponse,
} from '../../model/response/user-book-status-response.model';

@Injectable({ providedIn: 'root' })
export class BookStatusHttpService extends BaseHttpService {
  private readonly baseUrl: string = `${this.apiBase}/book`;

  /**
   * Fetch the current user's reading status for a book.
   * Backend returns 204 when there's no row — we map that to null so
   * callers don't need to care about the HTTP layer quirk.
   */
  getMyStatus(bookId: string): Observable<UserBookStatusResponse | null> {
    return this.get<UserBookStatusResponse | null>(`${this.baseUrl}/${bookId}/my-status`).pipe(
      catchError(() => of(null)),
    );
  }

  setMyStatus(
    bookId: string,
    payload: UserBookStatusRequest,
  ): Observable<UserBookStatusResponse> {
    return this.put<UserBookStatusResponse>(`${this.baseUrl}/${bookId}/my-status`, payload);
  }

  clearMyStatus(bookId: string): Observable<void> {
    return this.delete<void>(`${this.baseUrl}/${bookId}/my-status`);
  }
}
