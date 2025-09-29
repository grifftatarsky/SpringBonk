import { Component } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { UserService } from '../user.service';
import { lastValueFrom } from 'rxjs';
import { baseUri, reverseProxyUri } from '../../app.config';

@Component({
  selector: 'app-logout',
  imports: [],
  templateUrl: './logout.html',
  styleUrl: './logout.css',
})
export class Logout {
  constructor(
    private http: HttpClient,
    private user: UserService,
  ) {
  }

  logout(): void {
    lastValueFrom(
      this.http.post(`${reverseProxyUri}/logout`, null, {
        headers: {
          'X-POST-LOGOUT-SUCCESS-URI': baseUri,
        },
        observe: 'response',
      }),
    )
      .then((resp: HttpResponse<Object>): void => {
        const logoutUri: string | null = resp.headers.get('Location');
        if (!!logoutUri) {
          window.location.href = logoutUri;
        }
      })
      .finally((): void => {
        this.user.refresh();
      });
  }
}
