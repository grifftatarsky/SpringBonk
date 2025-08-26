import { inject } from '@angular/core';
import { CanActivateFn, Router, RouterStateSnapshot, ActivatedRouteSnapshot } from '@angular/router';
import { UserService } from '../service/user.service';
import { MatSnackBar } from '@angular/material/snack-bar';

export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const user = inject(UserService);
  const router = inject(Router);
  const snack = inject(MatSnackBar);

  if (user.current.isAuthenticated) {
    return true;
  }

  console.warn('AuthGuard: blocked access to', state.url);
  snack.open('Please log in to access this page', 'OK', { duration: 4000 });
  router.navigateByUrl('/');
  return false;
};
