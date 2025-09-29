import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { UserService } from '../user.service';
import { Observable } from 'rxjs';
import { baseUri, reverseProxyUri } from '../../app.config';

@Component({
  selector: 'app-login',
  imports: [],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private loginUri?: string;

  constructor(
    http: HttpClient,
    private user: UserService,
    private router: Router,
  ) {
    loginOptions(http).subscribe((opts: LoginOptionResponse[]): void => {
      if (opts.length) {
        this.loginUri = opts[0].loginUri;
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

    url.searchParams.append(
      'post_login_success_uri',
      `${baseUri}${this.router.url}`,
    );

    url.searchParams.append('post_login_failure_uri', `${baseUri}login-error`);
    window.location.href = url.toString();
  }

}

// TODO: I do not like this.
function loginOptions(http: HttpClient): Observable<LoginOptionResponse[]> {
  return http.get<LoginOptionResponse[]>(`${reverseProxyUri}/login-options`);
}
