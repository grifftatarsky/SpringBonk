import type { Observable } from 'rxjs';

/**
 * Federation shell contract.
 *
 * The akira shell and the ooze remote are independently built bundles, so they
 * cannot share an Angular DI token by reference across the federation boundary.
 * Instead the shell publishes a tiny runtime API on `globalThis` that remotes
 * read — a conventional micro-frontend "shell contract". Each side wraps this
 * in its own Angular service, so component code stays clean DI.
 *
 * Types here are erased at runtime; only the string key and object shape are
 * load-bearing, so it's safe for both bundles to carry their own copy.
 */

/** Minimal, framework-agnostic view of the authenticated Keycloak user. */
export interface ShellUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly roles: readonly string[];
  readonly isAuthenticated: boolean;
}

export const ANONYMOUS_SHELL_USER: ShellUser = {
  id: '',
  name: '',
  email: '',
  roles: [],
  isAuthenticated: false,
};

/** Runtime API the shell exposes to federated remotes. */
export interface OozeShellApi {
  /** Emits the current shell user and every change (login/logout/refresh). */
  readonly user$: Observable<ShellUser>;
  /** Synchronous current value. */
  snapshot(): ShellUser;
}

export const OOZE_SHELL_KEY = '__OOZE_SHELL__';

export function setOozeShell(api: OozeShellApi): void {
  (globalThis as Record<string, unknown>)[OOZE_SHELL_KEY] = api;
}

export function getOozeShell(): OozeShellApi | undefined {
  return (globalThis as Record<string, unknown>)[OOZE_SHELL_KEY] as
    | OozeShellApi
    | undefined;
}
