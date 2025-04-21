import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/**
 * BaseHttpService provides generic HTTP methods with centralized error handling and clean request setup.
 * Extend this class in feature-specific services to DRY out boilerplate and enforce consistency.
 */
@Injectable({
  providedIn: 'root'
})
export class BaseHttpService {
  protected apiBase: string = "/bff/api"

  constructor(protected http: HttpClient) {}

  /**
   * Perform a GET request
   */
  protected get<T>(url: string, params?: HttpParams | { [param: string]: string | number | boolean }, headers?: HttpHeaders): Observable<T> {
    return this.http.get<T>(url, {
      params: this.normalizeParams(params),
      headers: this.normalizeHeaders(headers)
    }).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

  /**
   * Perform a POST request
   */
  protected post<T>(url: string, body: any, headers?: HttpHeaders): Observable<T> {
    return this.http.post<T>(url, body, {
      headers: this.normalizeHeaders(headers)
    }).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

  /**
   * Perform a PUT request
   */
  protected put<T>(url: string, body: any, headers?: HttpHeaders): Observable<T> {
    return this.http.put<T>(url, body, {
      headers: this.normalizeHeaders(headers)
    }).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

  /**
   * Perform a DELETE request
   */
  protected delete<T>(url: string, params?: HttpParams | { [param: string]: string | number | boolean }, headers?: HttpHeaders): Observable<T> {
    return this.http.delete<T>(url, {
      params: this.normalizeParams(params),
      headers: this.normalizeHeaders(headers)
    }).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

  /**
   * Normalizes various param types to HttpParams
   */
  private normalizeParams(params?: HttpParams | { [param: string]: string | number | boolean }): HttpParams | undefined {
    if (!params) return undefined;
    if (params instanceof HttpParams) return params;

    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      httpParams = httpParams.set(key, String(value));
    });
    return httpParams;
  }

  /**
   * Normalizes headers, allowing plain objects or prebuilt HttpHeaders
   */
  private normalizeHeaders(headers?: HttpHeaders | { [header: string]: string | string[] }): HttpHeaders | undefined {
    if (!headers) return undefined;
    if (headers instanceof HttpHeaders) return headers;

    let httpHeaders = new HttpHeaders();
    Object.entries(headers).forEach(([key, value]) => {
      httpHeaders = httpHeaders.set(key, value);
    });
    return httpHeaders;
  }

  /**
   * Global error handler for all HTTP requests
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    // Could expand this with toast service or log to a remote server
    console.error(`[HTTP ERROR] ${error.status}: ${error.message}`);
    return throwError((): HttpErrorResponse => error);
  }
}
