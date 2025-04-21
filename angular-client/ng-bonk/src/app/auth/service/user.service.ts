import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, interval } from 'rxjs';
import { User } from '../model/user.model';
import { UserHttpService } from './user-http.service';
import { UserInfoResponse } from '../model/user-info-response.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private user$: BehaviorSubject<User> = new BehaviorSubject<User>(
    User.ANONYMOUS
  );
  private refreshSub?: Subscription;

  constructor(private http: UserHttpService) {
    this.refresh();
  }

  refresh(): void {
    this.refreshSub?.unsubscribe();
    this.http.getDetails().subscribe({
      next: (user: UserInfoResponse): void => {
        console.log(user);
        if (
          user.username !== this.user$.value.name ||
          user.email !== this.user$.value.email ||
          (user.roles || []).toString() !== this.user$.value.roles.toString()
        ) {
          this.user$.next(
            user.username
              ? new User(
                  user.username || '',
                  user.email || '',
                  user.roles || []
                )
              : User.ANONYMOUS
          );
        }
        if (
          typeof user.exp === 'number' &&
          user.exp > 0 &&
          user.exp < Number.MAX_SAFE_INTEGER / 1000
        ) {
          const now: number = Date.now();
          const expMs: number = user.exp * 1000; // Convert expiration time to milliseconds safely

          if (expMs > now) {
            // Ensure expiration is in the future
            const delay: number = (expMs - now) * 0.8;

            if (delay > 2000 && delay < Number.MAX_SAFE_INTEGER) {
              this.refreshSub = interval(delay).subscribe((): void =>
                this.refresh()
              );
            }
          }
        }
      },
      error: (error): void => {
        console.warn(error);
        this.user$.next(User.ANONYMOUS);
      },
    });
  }

  get valueChanges(): Observable<User> {
    console.log('User service valueChanges [dbg]');

    return this.user$;
  }

  get current(): User {
    console.log('User service current [dbg]');
    return this.user$.value;
  }
}
