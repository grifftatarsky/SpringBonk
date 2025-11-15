import { Component, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { User } from './user.model';
import { Login } from './login/login';
import { Logout } from './logout/logout';
import { UserService } from './user.service';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-auth',
  imports: [Login, Logout, AsyncPipe],
  templateUrl: './auth.html',
})
export class Auth {
  // region DI

  private readonly userService: UserService = inject(UserService);

  // endregion

  isAuthenticated$!: Observable<boolean>;

  constructor() {
    this.isAuthenticated$ = this.userService.valueChanges.pipe(
      map((u: User): boolean => u.isAuthenticated),
    );
  }
}
