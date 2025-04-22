import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { map, Observable } from 'rxjs';
import { UserService } from './service/user.service';
import { baseUri } from '../app.config';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButton } from '@angular/material/button';

interface LoginOptionDto {
  label: string;
  loginUri: string;
  isSameAuthority: boolean;
}

function loginOptions(http: HttpClient): Observable<Array<LoginOptionDto>> {
  return http
    .get('/bff/login-options')
    .pipe(map((dto: any): LoginOptionDto[] => dto as LoginOptionDto[]));
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButton],
  templateUrl: 'login.component.html',
})
export class LoginComponent {
  private loginUri?: string;

  constructor(
    http: HttpClient,
    private user: UserService,
    private router: Router
  ) {
    loginOptions(http).subscribe((opts: LoginOptionDto[]): void => {
      if (opts.length) {
        this.loginUri = opts[0].loginUri;
        // NOTE: To check if same authority, use opts[0].isSameAuthority.
      }
    });
  }

  get isLoginEnabled(): boolean {
    return !this.user.current.isAuthenticated;
  }

  login(): void {
    if (!this.loginUri) {
      return;
    }

    const url = new URL(this.loginUri);
    console.log('DBG: 1');
    url.searchParams.append(
      'post_login_success_uri',
      `${baseUri}${this.router.url}`
    );
    console.log('DBG: 2');
    url.searchParams.append('post_login_failure_uri', `${baseUri}login-error`);
    console.log('DBG: 3');
    window.location.href = url.toString();
  }
}
