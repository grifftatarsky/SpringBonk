import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserService } from '../service/user.service';

export const authGuard: CanActivateFn = () => {
  const user = inject(UserService);
  const router = inject(Router);
  if (user.current.isAuthenticated) {
    return true;
  }
  router.navigateByUrl('/');
  return false;
};
