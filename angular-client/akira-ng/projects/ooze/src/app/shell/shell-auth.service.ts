import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import {
  ANONYMOUS_SHELL_USER,
  OozeShellApi,
  ShellUser,
  getOozeShell,
} from '@ooze/contract';

/**
 * Remote-side adapter over the shell's auth contract.
 *
 * Federated (inside akira): reads the shell's live Keycloak session, so the
 * logged-in user flows straight into this remote — one source of truth.
 * Standalone (ooze on :4201): the shell API is absent, so it falls back to
 * anonymous.
 */
@Injectable({ providedIn: 'root' })
export class ShellAuthService {
  private readonly shell: OozeShellApi | undefined = getOozeShell();

  /** True when hosted by the shell, false when running standalone. */
  readonly federated: boolean = this.shell !== undefined;

  readonly user$: Observable<ShellUser> = this.shell
    ? this.shell.user$
    : of(ANONYMOUS_SHELL_USER);

  snapshot(): ShellUser {
    return this.shell ? this.shell.snapshot() : ANONYMOUS_SHELL_USER;
  }
}
