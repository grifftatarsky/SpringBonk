import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../user.service';
import { baseUri } from '../../app.config';
import { UserHttpService } from '../../common/http/user-http.service';

@Component({
  selector: 'app-login',
  imports: [],
  templateUrl: './login.html',
})
export class Login {
  // region DI

  private readonly userService: UserService = inject(UserService);
  private readonly http: UserHttpService = inject(UserHttpService);
  private readonly router: Router = inject(Router);

  // endregion

  private loginUri?: string;

  constructor() {
    this.http.getLoginOptions().subscribe((opts: LoginOptionResponse[]): void => {
      if (opts.length) {
        this.loginUri = opts[0].loginUri;
      }
    });
  }

  get isLoginEnabled(): boolean {
    return !this.userService.current.isAuthenticated;
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
