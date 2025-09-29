import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, interval, Observable, Subscription } from 'rxjs';
import { User } from './user.model';
import { UserHttpService } from '../common/http/user-http.service';
import { UserInfoResponse } from '../model/response/user-info-response.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  // region DI

  private readonly http: UserHttpService = inject(UserHttpService);

  // endregion

  private user$: BehaviorSubject<User> = new BehaviorSubject<User>(
    User.ANONYMOUS,
  );

  private refreshSub?: Subscription;

  constructor() {
    this.refresh();
  }

  refresh(): void {
    this.refreshSub?.unsubscribe();

    this.http.getDetails().subscribe({
      next: (user: UserInfoResponse): void => {
        if (
          user.id !== this.user$.value.id ||
          user.username !== this.user$.value.name ||
          user.email !== this.user$.value.email ||
          (user.roles || []).toString() !== this.user$.value.roles.toString()
        ) {
          const id: string = (user.id || '').toString();

          const normalizedId: string =
            id && id !== '00000000-0000-0000-0000-000000000000' ? id : '';

          this.user$.next(
            normalizedId
              ? new User(
                normalizedId,
                user.username || '',
                user.email || '',
                user.roles || [],
              )
              : User.ANONYMOUS,
          );
        }

        if (user.exp > 0 && user.exp < Number.MAX_SAFE_INTEGER / 1000) {
          const now: number = Date.now();

          const expMs: number = user.exp * 1000;

          if (expMs > now) {
            const delay: number = (expMs - now) * 0.8;

            if (delay > 2000 && delay < Number.MAX_SAFE_INTEGER) {
              this.refreshSub = interval(delay).subscribe((): void =>
                this.refresh(),
              );
            }
          }
        }
      },
      error: (error): void => {
        this.user$.next(User.ANONYMOUS);
      },
    });
  }

  get valueChanges(): Observable<User> {
    return this.user$;
  }

  get current(): User {
    return this.user$.value;
  }
}
