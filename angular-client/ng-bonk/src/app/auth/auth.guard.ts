import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlTree } from '@angular/router';
import { UserService } from '../service/user.service';
import { catchError, map, Observable, of, skip, take, timeout } from 'rxjs';
import { User } from './user.model';

export const authMatch: CanMatchFn = (): true | Observable<true | UrlTree> => {
  const userService: UserService = inject(UserService);
  const router: Router = inject(Router);

  if (userService.current.isAuthenticated) return true;

  // TODO __ this timeout. Why do I have it, seems bad?
  return userService.valueChanges.pipe(
    skip(1),
    take(1),
    timeout(3000),
    catchError((): Observable<User> => of(userService.current)),
    map((u: User): true | UrlTree =>
      u.isAuthenticated ? true : router.createUrlTree(['/'])
    )
  );
};
