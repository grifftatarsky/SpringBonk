import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {catchError, Observable, of} from 'rxjs';
import {UserInfo} from "angular-oauth2-oidc";

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient) {}

  getLoginOptions(): Observable<{ label: string; loginUri: string }[]> {
    return this.http.get<{ label: string; loginUri: string }[]>('http://localhost:7080/bff/login-options');
  }

  getCurrentUser(): Observable<UserInfo | null> {
    return this.http.get<UserInfo>('/bff/me').pipe(
      catchError(() => of(null))
    );
  }
}
