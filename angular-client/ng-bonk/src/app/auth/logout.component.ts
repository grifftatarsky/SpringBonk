import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UserService } from '../service/user.service';
import { lastValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { baseUri, reverseProxyUri } from '../app.config';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'app-logout',
  standalone: true,
  imports: [MatButton],
  templateUrl: './logout.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoutComponent {
  constructor(
    private http: HttpClient,
    private user: UserService
  ) {}

  logout(): void {
    lastValueFrom(
      this.http.post(`${reverseProxyUri}/logout`, null, {
        headers: {
          'X-POST-LOGOUT-SUCCESS-URI': baseUri,
        },
        observe: 'response',
      })
    )
      .then(resp => {
        const logoutUri = resp.headers.get('Location');
        if (!!logoutUri) {
          window.location.href = logoutUri;
        }
      })
      .finally(() => {
        this.user.refresh();
      });
  }
}
