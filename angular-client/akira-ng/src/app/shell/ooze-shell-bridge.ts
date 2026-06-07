import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { OozeShellApi, ShellUser, setOozeShell } from '@ooze/contract';
import { UserService } from '../auth/user.service';
import { User } from '../auth/user.model';

/**
 * Publishes the shell's Keycloak auth/session state to federated remotes
 * (e.g. the ooze micro-frontend) via the {@link OozeShellApi} runtime contract.
 *
 * Instantiated eagerly at startup (see app.config) so the API is on globalThis
 * before any remote loads. The remote keeps using the shell's live session —
 * one source of truth for the logged-in user.
 */
@Injectable({ providedIn: 'root' })
export class OozeShellBridge implements OozeShellApi {
  private readonly userService = inject(UserService);

  readonly user$: Observable<ShellUser> = this.userService.valueChanges.pipe(
    map(toShellUser),
  );

  constructor() {
    setOozeShell(this);
  }

  snapshot(): ShellUser {
    return toShellUser(this.userService.current);
  }
}

function toShellUser(user: User): ShellUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roles: user.roles,
    isAuthenticated: user.isAuthenticated,
  };
}
