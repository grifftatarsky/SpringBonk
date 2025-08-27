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
import { map, skip, take, timeout, catchError, of } from 'rxjs';

export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const user = inject(UserService);
  const router = inject(Router);
  // Seamless UX: no snackbars in guards; redirect to home when unauthenticated

  if (user.current.isAuthenticated) return true;
  return user.valueChanges.pipe(
    skip(1),
    take(1),
    timeout(3000),
    catchError(() => of(user.current)),
    map(u => (u.isAuthenticated ? true : router.createUrlTree(['/']))),
  );
};

export const authMatch: CanMatchFn = (route: Route, segments: UrlSegment[]) => {
  const user = inject(UserService);
  const router = inject(Router);
  // Seamless UX: no snackbars in guards; redirect to home when unauthenticated

  const url = '/' + segments.map(s => s.path).join('/');
  if (user.current.isAuthenticated) return true;
  return user.valueChanges.pipe(
    skip(1),
    take(1),
    timeout(3000),
    catchError(() => of(user.current)),
    map(u => (u.isAuthenticated ? true : router.createUrlTree(['/'])))
  );
};
