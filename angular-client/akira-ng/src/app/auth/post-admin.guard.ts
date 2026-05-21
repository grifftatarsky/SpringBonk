import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserService } from './user.service';

/**
 * Gate for blog admin actions (create/edit). Requires the user to be
 * authenticated AND to carry the {@code POST_ADMIN} role on their JWT —
 * the role-to-permission expansion lives on the resource server, so the
 * UI checks the role rather than the individual permission.
 */
export const postAdminGuard: CanActivateFn = () => {
  const userService = inject(UserService);
  const router = inject(Router);

  const user = userService.current;
  if (user.isAuthenticated && user.hasAuthority('POST_ADMIN')) {
    return true;
  }

  router.navigate(['/blog']);
  return false;
};
