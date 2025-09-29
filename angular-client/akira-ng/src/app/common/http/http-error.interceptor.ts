import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../notification/notification.service';
import { inject } from '@angular/core';

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

let lastErrorKey: string = '';
let lastErrorAt: number = 0;

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notify: NotificationService = inject(NotificationService);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        const url: string = (req.url || '').toString();

        if (url.includes('/user/details') || url.includes('/login-options')) {
          return throwError((): HttpErrorResponse => err);
        }

        const message: string = toDisplayMessage(err);
        const key: string = `${err.status}:${message}`;
        const now: number = Date.now();

        if (key !== lastErrorKey || now - lastErrorAt > 800) {
          notify.error(message);
          lastErrorKey = key;
          lastErrorAt = now;
        }

        console.error('[HTTP ERROR]', err.status, err.message, err);
      }
      return throwError(() => err);
    }),
  );
};
