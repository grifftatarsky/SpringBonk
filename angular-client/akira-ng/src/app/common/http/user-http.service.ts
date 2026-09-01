import { Injectable } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseHttpService } from './base-http.service';
import { UserInfoResponse } from '../../model/response/user-info-response.model';
import { LoginOptionResponse } from '../../model/response/login-option-response.model';
import { ProfileAvatarId } from '../../model/type/profile-avatar-id';
import { baseUri, reverseProxyUri } from '../../app.config';

@Injectable({
  providedIn: 'root',
})
export class UserHttpService extends BaseHttpService {
  private readonly baseUrl: string = this.apiBase + '/user';

  getDetails(): Observable<UserInfoResponse> {
    return this.get<UserInfoResponse>(`${this.baseUrl}/details`);
  }

  updateAvatar(avatar: ProfileAvatarId): Observable<UserInfoResponse> {
    return this.put<UserInfoResponse>(`${this.baseUrl}/avatar`, { avatar });
  }

  getLoginOptions(): Observable<LoginOptionResponse[]> {
    return this.get<LoginOptionResponse[]>(`${reverseProxyUri}/login-options`);
  }

  logout(): Observable<HttpResponse<void>> {
    // Uses this.http directly (not this.post) because we need observe: 'response'
    // to read the Location header for Keycloak logout redirect
    return this.http.post<void>(`${reverseProxyUri}/logout`, null, {
      headers: {
        'X-POST-LOGOUT-SUCCESS-URI': baseUri,
      },
      observe: 'response',
      withCredentials: true,
    });
  }
}
