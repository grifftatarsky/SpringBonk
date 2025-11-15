import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from './base-http.service';
import { UserInfoResponse } from '../../model/response/user-info-response.model';
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
    return this.http.get<LoginOptionResponse[]>(`${reverseProxyUri}/login-options`);
  }

  logout(): Observable<any> {
    return this.http.post(`${reverseProxyUri}/logout`, null, {
      headers: {
        'X-POST-LOGOUT-SUCCESS-URI': baseUri,
      },
      observe: 'response',
    });
  }
}
