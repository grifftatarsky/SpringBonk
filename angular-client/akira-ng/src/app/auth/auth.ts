import { Component } from '@angular/core';
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
  styleUrl: './auth.css',
})
export class Auth {
  // TODO: Can I ... or should I ... replace this with a signal.
  isAuthenticated$!: Observable<boolean>;

  constructor(private user: UserService) {
    this.isAuthenticated$ = this.user.valueChanges.pipe(
      map((u: User): boolean => u.isAuthenticated),
    );
  }
}
