import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from './base-http.service';
import { UserInfoResponse } from '../model/response/user-info-response.model';

@Injectable({
  providedIn: 'root',
})
export class UserHttpService extends BaseHttpService {
  private readonly baseUrl: string = this.apiBase + '/user';

  getDetails(): Observable<UserInfoResponse> {
    return this.get<UserInfoResponse>(`${this.baseUrl}/details`);
  }
}
