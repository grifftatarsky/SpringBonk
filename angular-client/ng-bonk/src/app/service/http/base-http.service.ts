import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { reverseProxyUri } from '../../app.config';

@Injectable({
  providedIn: 'root',
})
export class BaseHttpService {
  protected apiBase: string = `${reverseProxyUri}/api`;

  constructor(
    protected http: HttpClient,
    protected snackBar: MatSnackBar
  ) {}

  /**
   * Perform a GET request
   */
  protected get<T>(
    url: string,
    params?: HttpParams | { [param: string]: string | number | boolean },
    headers?: HttpHeaders
  ): Observable<T> {
    return this.http
      .get<T>(url, {
        params: this.normalizeParams(params),
        headers: this.normalizeHeaders(headers),
      })
      .pipe(
        map(res => res),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Perform a POST request
   */
  protected post<T>(
    url: string,
    body: any,
    headers?: HttpHeaders
  ): Observable<T> {
    return this.http
      .post<T>(url, body, {
        headers: this.normalizeHeaders(headers),
      })
      .pipe(
        map(res => res),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Perform a PUT request
   */
  protected put<T>(
    url: string,
    body: any,
    headers?: HttpHeaders
  ): Observable<T> {
    return this.http
      .put<T>(url, body, {
        headers: this.normalizeHeaders(headers),
      })
      .pipe(
        map(res => res),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Perform a DELETE request
   */
  protected delete<T>(
    url: string,
    params?: HttpParams | { [param: string]: string | number | boolean },
    headers?: HttpHeaders
  ): Observable<T> {
    return this.http
      .delete<T>(url, {
        params: this.normalizeParams(params),
        headers: this.normalizeHeaders(headers),
      })
      .pipe(
        map(res => res),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Normalizes various param types to HttpParams
   */
  private normalizeParams(
    params?: HttpParams | { [param: string]: string | number | boolean }
  ): HttpParams | undefined {
    if (!params) return undefined;
    if (params instanceof HttpParams) return params;

    let httpParams = new HttpParams();
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
        }
  ): HttpHeaders | undefined {
    if (!headers) return undefined;
    if (headers instanceof HttpHeaders) return headers;

    let httpHeaders: HttpHeaders = new HttpHeaders();
    Object.entries(headers).forEach(([key, value]): void => {
      httpHeaders = httpHeaders.set(key, value);
    });
    return httpHeaders;
  }

  /**
   * Global error handler for all HTTP requests
   */
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    // Get an appropriate error message to display
    const displayMessage: string = this.getErrorDisplayMessage(error);

    this.snackBar.open(displayMessage, 'Dismiss', {
      duration: 5000,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
    });

    // Log the error to console for debugging
    console.error(`[HTTP ERROR] ${error.status}: ${error.message}`);

    // Return the error observable
    return throwError((): HttpErrorResponse => error);
  };

  /**
   * Get a user-friendly error message based on HTTP error!
   */
  private getErrorDisplayMessage = (error: HttpErrorResponse): string => {
    // Check if error has a specific message from the server
    if (error.error?.message) {
      return error.error.message;
    }

    switch (error.status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Authentication required. Please log in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'Conflict occurred. The resource may have been modified.';
      case 500:
        return 'Server error. Please try again later.';
      case 503:
        return 'Service unavailable. Please try again later.';
      case 0:
        return 'Network error. Please check your connection.';
      default:
        return `Error ${error.status}: ${error.statusText || 'Unknown error'}`;
    }
  };
}
