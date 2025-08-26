import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
  RouterStateSnapshot,
  ActivatedRouteSnapshot,
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

  if (user.current.isAuthenticated) {
    console.log('AuthGuard: access granted for', state.url);
    return true;
  }

  return user.valueChanges.pipe(
    skip(1),
    take(1),
    map(u => {
      if (u.isAuthenticated) {
        console.log('AuthGuard: access granted after refresh', state.url);
        return true;
      }
      console.warn('AuthGuard: blocked access to', state.url);
      snack.open('Please log in to access this page', 'OK', { duration: 4000 });
      router.navigateByUrl('/');
      return false;
    })
  );
};
