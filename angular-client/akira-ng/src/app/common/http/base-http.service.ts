import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-tokens';

@Injectable({ providedIn: 'root' })
export class BaseHttpService {
  // region DI

  protected readonly http: HttpClient = inject(HttpClient);
  protected readonly apiBase: string = inject(API_BASE_URL);

  // endregion

  // region G/P/P/D Methods

  /**
   * Perform a GET request
   */
  protected get<T>(
    url: string,
    params?: HttpParams | { [param: string]: string | number | boolean },
    headers?: HttpHeaders,
  ): Observable<T> {
    return this.http.get<T>(url, {
      params: this.normalizeParams(params),
      headers: this.normalizeHeaders(headers),
    });
  }

  /**
   * Perform a POST request
   */
  protected post<T>(
    url: string,
    body: unknown,
    headers?: HttpHeaders,
  ): Observable<T> {
    return this.http.post<T>(url, body, {
      headers: this.normalizeHeaders(headers),
    });
  }

  /**
   * Perform a PUT request
   */
  protected put<T>(
    url: string,
    body: unknown,
    headers?: HttpHeaders,
  ): Observable<T> {
    return this.http.put<T>(url, body, {
      headers: this.normalizeHeaders(headers),
    });
  }

  /**
   * Perform a DELETE request
   */
  protected delete<T>(
    url: string,
    params?: HttpParams | { [param: string]: string | number | boolean },
    headers?: HttpHeaders,
  ): Observable<T> {
    return this.http.delete<T>(url, {
      params: this.normalizeParams(params),
      headers: this.normalizeHeaders(headers),
    });
  }

  // endregion

  // region Helper Methods
  /**
   * Normalizes various param types to HttpParams
   */
  private normalizeParams(
    params?: HttpParams | { [param: string]: string | number | boolean },
  ): HttpParams | undefined {
    if (!params) return undefined;

    if (params instanceof HttpParams) return params;

    let httpParams: HttpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]): void => {
      httpParams = httpParams.set(key, String(value));
    });
    return httpParams;
  }

  /**
   * Normalizes headers, allowing plain objects or prebuilt HttpHeaders
   */
  private normalizeHeaders(
    headers?:
      | HttpHeaders
      | {
      [header: string]: string | string[];
    },
  ): HttpHeaders | undefined {
    if (!headers) return undefined;
    if (headers instanceof HttpHeaders) return headers;

    let httpHeaders: HttpHeaders = new HttpHeaders();
    Object.entries(headers).forEach(([key, value]): void => {
      httpHeaders = httpHeaders.set(key, value);
    });
    return httpHeaders;
  }

  // endregion
}
