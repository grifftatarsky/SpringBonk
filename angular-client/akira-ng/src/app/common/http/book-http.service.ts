import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { BaseHttpService } from './base-http.service';
import { BookResponse } from '../../model/response/book-response.model';
import { BookRequest } from '../../model/request/book-request.model';
import { PagedOpenLibraryResponse } from '../../model/response/open-library-book-response.model';
import { PagedResponse } from '../../model/response/paged-response.model';

@Injectable({ providedIn: 'root' })
export class BookHttpService extends BaseHttpService {
  private readonly baseUrl: string = `${this.apiBase}/book`;
  private readonly openLibraryBaseUrl = 'https://openlibrary.org/search.json';

  getOpenLibraryBooks(
    page = 0,
    size = 10,
    query?: string,
    sort: string = 'relevance',
  ): Observable<PagedOpenLibraryResponse> {
    if (!query) {
      return of({ start: 0, num_found: 0, docs: [] });
    }

    const params: Record<string, string | number> = {
      q: query,
      page: page + 1,
      limit: size,
    };

    if (sort && sort !== 'relevance') {
      params['sort'] = sort;
    }

    return this.get<PagedOpenLibraryResponse>(this.openLibraryBaseUrl, params);
  }

  getOpenLibraryCoverImageUrl(coverId: number, size: 'S' | 'M' | 'L' = 'M'): string {
    return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
  }

  getOpenLibraryCoverImageByOpenLibraryId(olid: string, size: 'S' | 'M' | 'L' = 'M'): string {
    return `https://covers.openlibrary.org/b/olid/${olid}-${size}.jpg`;
  }

  createBook(request: BookRequest): Observable<BookResponse> {
    return this.post<BookResponse>(this.baseUrl, request);
  }

  updateBook(id: string, request: BookRequest): Observable<BookResponse> {
    return this.put<BookResponse>(`${this.baseUrl}/${id}`, request);
  }

  getPagedBooksByShelfId(
    shelfId: string,
    page = 0,
    size = 12,
  ): Observable<PagedResponse<BookResponse>> {
    return this.get<PagedResponse<BookResponse>>(`${this.baseUrl}/shelf/${shelfId}?page=${page}&size=${size}`);
  }

  getBooksByShelfId(shelfId: string): Observable<BookResponse[]> {
    return this.get<BookResponse[]>(`${this.baseUrl}/shelf/${shelfId}/all`);
  }

  addBookToShelf(bookId: string, shelfId: string): Observable<BookResponse> {
    return this.put<BookResponse>(`${this.baseUrl}/${bookId}/shelf/${shelfId}`, {});
  }

  removeBookFromShelf(bookId: string, shelfId: string): Observable<BookResponse> {
    return this.delete<BookResponse>(`${this.baseUrl}/${bookId}/shelf/${shelfId}`);
  }

  getBookById(id: string): Observable<BookResponse> {
    return this.get<BookResponse>(`${this.baseUrl}/${id}`);
  }
}
