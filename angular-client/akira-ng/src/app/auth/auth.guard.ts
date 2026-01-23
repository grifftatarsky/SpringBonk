import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { UserService } from './user.service';

export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const userService = inject(UserService);
  const router = inject(Router);

  if (userService.current.isAuthenticated) {
    return true;
  }

  // Store the intended URL for redirecting after login
  router.navigate(['/login'], {
    queryParams: { returnUrl: state.url }
  });

  return false;
};
