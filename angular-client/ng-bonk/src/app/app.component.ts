import { Component } from '@angular/core';
import {NgForOf, NgIf} from '@angular/common';
import {AuthService} from './service/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [NgIf, NgForOf],
  standalone: true
})
export class AppComponent {
  title = 'Bonk!';
  loginOptions: any[] = [];
  user: any = null;

  constructor(private auth: AuthService) {}

  ngOnInit(): void {
    this.auth.getLoginOptions().subscribe(opts => this.loginOptions = opts);
    this.auth.getCurrentUser().subscribe(u => this.user = u);
  }

  login(url: string) {
    window.location.href = url;
  }

  // OIDC FLOW
  // constructor(private oauthService: OAuthService) {
  //   this.oauthService.configure(authCodeFlowConfig);
  //   this.oauthService.loadDiscoveryDocumentAndLogin();
  //
  //   //this.oauthService.setupAutomaticSilentRefresh();
  //
  //   // Automatically load user profile
  //   this.oauthService.events
  //     .pipe(filter((e: OAuthEvent): boolean => e.type === 'token_received'))
  //     .subscribe((_: OAuthEvent): Promise<object> => this.oauthService.loadUserProfile());
  // }
  //
  // get userName(): string | null {
  //   const claims: Record<string, any> = this.oauthService.getIdentityClaims();
  //   if (!claims) return null;
  //   return claims['given_name'];
  // }
  //
  // get idToken(): string {
  //   return this.oauthService.getIdToken();
  // }
  //
  // get accessToken(): string {
  //   return this.oauthService.getAccessToken();
  // }
  //
  // refresh(): void {
  //   this.oauthService.refreshToken();
  // }
}
