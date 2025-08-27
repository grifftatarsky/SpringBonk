import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  CanMatchFn,
  Route,
  Router,
  RouterStateSnapshot,
  UrlSegment,
} from '@angular/router';
import { UserService } from '../service/user.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { map, skip, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const user = inject(UserService);
  const router = inject(Router);
  const snack = inject(MatSnackBar);

  // If already authenticated, allow immediately.
  if (user.current.isAuthenticated) {
    return true;
  }

  // Otherwise, wait for the next user emission (post-refresh) and decide.
  return user.valueChanges.pipe(
    skip(1),
    take(1),
    map(u => {
      if (u.isAuthenticated) {
        return true;
      }
      console.warn('AuthGuard: blocked access to', state.url);
      snack.open('Please log in to access this page', 'OK', { duration: 4000 });
      // Return a UrlTree to avoid side-effects inside the guard
      return router.createUrlTree(['/login-error'], {
        queryParams: { redirectUrl: state.url },
      });
    })
  );
};

export const authMatch: CanMatchFn = (route: Route, segments: UrlSegment[]) => {
  const user = inject(UserService);
  const router = inject(Router);
  const snack = inject(MatSnackBar);

  const url = '/' + segments.map(s => s.path).join('/');
  if (user.current.isAuthenticated) {
    console.log('AuthMatch: access granted for', url);
    return true;
  }

  return user.valueChanges.pipe(
    skip(1),
    take(1),
    map(u => {
      if (u.isAuthenticated) {
        console.log('AuthMatch: access granted after refresh', url);
        return true;
      }
      console.warn('AuthMatch: blocked access to', url);
      snack.open('Please log in to access this page', 'OK', { duration: 4000 });
      return router.createUrlTree(['/login-error'], {
        queryParams: { redirectUrl: url },
      });
    })
  );
};
