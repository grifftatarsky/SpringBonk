import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { NotificationService } from '../notification.service';
import { catchError, throwError } from 'rxjs';

function toDisplayMessage(error: HttpErrorResponse): string {
  if (error.error?.message) return error.error.message;
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
}

let lastErrorKey = '';
let lastErrorAt = 0;

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notify = inject(NotificationService);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        const url = (req.url || '').toString();
        // Do not show toasts for expected background auth checks
        if (url.includes('/user/details') || url.includes('/login-options')) {
          return throwError(() => err);
        }
        const message = toDisplayMessage(err);
        // Coalesce duplicate errors within 800ms to reduce flicker
        const key = `${err.status}:${message}`;
        const now = Date.now();
        if (key !== lastErrorKey || now - lastErrorAt > 800) {
          notify.error(message);
          lastErrorKey = key;
          lastErrorAt = now;
        }
        // Helpful console signal for local debugging
        console.error('[HTTP ERROR]', err.status, err.message, err);
      }
      return throwError(() => err);
    })
  );
};
