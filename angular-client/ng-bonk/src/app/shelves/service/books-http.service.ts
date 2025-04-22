import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { BaseHttpService } from '../../service/base-http.service';
import { BookRequest } from '../../model/request/book-request.model';
import { BookResponse } from '../../model/response/book-response.model';
import { PagedOpenLibraryResponse } from '../../model/response/open-library-book-response.model';
import { PagedResponse } from '../../model/response/paged-response.model';

@Injectable({
  providedIn: 'root',
})
export class BookHttpService extends BaseHttpService {
  private readonly baseUrl: string = this.apiBase + '/book';

  private readonly openLibraryBaseUrl: string =
    'https://openlibrary.org/search.json';

  // ----- OPEN LIBRARY -----

  getOpenLibraryBooks(
    page = 0,
    size = 10,
    searchTerm?: string
  ): Observable<PagedOpenLibraryResponse> {
    if (!searchTerm) {
      return of({
        start: 0,
        num_found: 0,
        docs: [],
      } as PagedOpenLibraryResponse); // Empty response when no search term
    }

    const params: { [key: string]: string | number } = {
      q: searchTerm,
      page: page + 1, // OpenLibrary is 1-indexed!
      limit: size,
    };

    return this.get<PagedOpenLibraryResponse>(this.openLibraryBaseUrl, params);
  }

  getOpenLibraryCoverImageUrl(
    coverId: number,
    size: 'S' | 'M' | 'L' = 'M'
  ): string {
    return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
  }

  getOpenLibraryCoverImageByOLID(
    olid: string,
    size: 'S' | 'M' | 'L' = 'M'
  ): string {
    return `https://covers.openlibrary.org/b/olid/${olid}-${size}.jpg`;
  }

  // ----- CREATE -----

  createBook(request: BookRequest): Observable<BookResponse> {
    return this.post<BookResponse>(`${this.baseUrl}`, request);
  }

  // ----- READ -----

  getPagedBooks(page = 0, size = 10): Observable<PagedResponse<BookResponse>> {
    return this.get<PagedResponse<BookResponse>>(
      `${this.baseUrl}?page=${page}&size=${size}`
    );
  }

  getAllBooks(): Observable<BookResponse[]> {
    return this.get<BookResponse[]>(`${this.baseUrl}/all`);
  }

  getBookById(id: string): Observable<BookResponse> {
    return this.get<BookResponse>(`${this.baseUrl}/${id}`);
  }

  getBooksByShelfId(shelfId: string): Observable<BookResponse[]> {
    return this.get<BookResponse[]>(`${this.baseUrl}/shelf/${shelfId}/all`);
  }

  getShelfIdsByBookOpenLibraryId(openLibraryId: string): Observable<string[]> {
    return this.get<string[]>(`${this.baseUrl}/${openLibraryId}/shelves`);
  }

  // ----- UPDATE -----

  updateBook(id: string, request: BookRequest): Observable<BookResponse> {
    return this.put<BookResponse>(`${this.baseUrl}/${id}`, request);
  }

  addBookToShelf(bookId: string, shelfId: string): Observable<BookResponse> {
    return this.put<BookResponse>(
      `${this.baseUrl}/${bookId}/shelf/${shelfId}`,
      {}
    );
  }

  // ----- DELETE -----

  deleteBook(id: string): Observable<void> {
    return this.delete<void>(`${this.baseUrl}/${id}`);
  }

  removeBookFromShelf(
    bookId: string,
    shelfId: string
  ): Observable<BookResponse> {
    return this.delete<BookResponse>(
      `${this.baseUrl}/${bookId}/shelf/${shelfId}`
    );
  }
}
