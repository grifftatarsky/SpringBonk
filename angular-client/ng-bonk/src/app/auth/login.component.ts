import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { UserService } from '../service/user.service';
import { baseUri, reverseProxyUri } from '../app.config';
import { Router } from '@angular/router';

import { MatButton } from '@angular/material/button';

interface LoginOptionDto {
  label: string;
  loginUri: string;
  isSameAuthority: boolean;
}

function loginOptions(http: HttpClient): Observable<LoginOptionDto[]> {
  return http.get<LoginOptionDto[]>(`${reverseProxyUri}/login-options`);
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, MatButton],
  templateUrl: 'login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
      `${baseUri}${this.router.url}`
    );

    url.searchParams.append('post_login_failure_uri', `${baseUri}login-error`);
    window.location.href = url.toString();
  }
}
