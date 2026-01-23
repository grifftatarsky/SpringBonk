import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UserHttpService } from '../../common/http/user-http.service';
import { UserService } from '../../auth/user.service';

interface LoginOption {
  label: string;
  loginUri: string;
  isSameAuthority: boolean;
}

@Component({
  selector: 'app-login-prompt',
  imports: [RouterLink],
  templateUrl: './login-prompt.html',
})
export class LoginPrompt implements OnInit {
  private readonly userHttp = inject(UserHttpService);
  private readonly userService = inject(UserService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly loginOptions = signal<LoginOption[]>([]);
  protected returnUrl = '/';

  ngOnInit(): void {
    // Check both returnUrl and returnURL (case insensitive from Keycloak)
    this.returnUrl = this.route.snapshot.queryParams['returnUrl']
      || this.route.snapshot.queryParams['returnURL']
      || '/';

    // If user is already authenticated, redirect to returnUrl immediately
    if (this.userService.current.isAuthenticated) {
      this.router.navigateByUrl(this.returnUrl);
      return;
    }

    this.loadLoginOptions();
  }

  private loadLoginOptions(): void {
    this.loading.set(true);
    this.error.set(null);
    this.userHttp.getLoginOptions().subscribe({
      next: (options) => {
        this.loginOptions.set(options);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load login options', err);
        this.error.set('Unable to load login options. Please try again.');
        this.loading.set(false);
      },
    });
  }

  login(loginUri: string): void {
    // Append the return URL to the login URI so the BFF can redirect back after auth
    const separator = loginUri.includes('?') ? '&' : '?';
    window.location.href = `${loginUri}${separator}post_login_success_uri=${encodeURIComponent(this.returnUrl)}`;
  }
}
