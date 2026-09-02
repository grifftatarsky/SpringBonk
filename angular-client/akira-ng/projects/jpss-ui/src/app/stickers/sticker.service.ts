import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CurrentUser, Sticker, StickerEdit } from './sticker.models';

/**
 * Same-origin through the BFF, so the session cookie and Angular's XSRF header
 * travel automatically — the same arrangement the ooze and president remotes
 * use. The host's HttpClient applies when federated.
 */
const BASE = '/bff/jps';

/** Where the BFF itself lives, for the login and logout redirects. */
const BFF = '/bff';

interface LoginOption {
  readonly label: string;
  readonly loginUri: string;
}

/**
 * The whole client for the sticker wall: the stickers themselves, who is signed
 * in, and the two redirects that start and end a session.
 *
 * Identity comes from {@code /jps/me} rather than from the host's auth service.
 * It is the id the backend stamps on a sticker, so it is also the only id that
 * can answer "is this one mine" without trusting the client — and asking the
 * service that owns the data keeps this remote runnable on its own.
 */
@Injectable({ providedIn: 'root' })
export class StickerService {
  private readonly http = inject(HttpClient);

  readonly stickers = signal<readonly Sticker[]>([]);
  readonly currentUser = signal<CurrentUser | null>(null);
  /** True once /me has been answered, so the UI can tell "anonymous" from "still asking". */
  readonly authChecked = signal(false);
  /** True once the wall has been fetched at least once — distinguishes empty from unloaded. */
  readonly loaded = signal(false);
  readonly loadError = signal<string | null>(null);

  readonly signedIn = computed(() => this.currentUser() !== null);

  /** The caller's own stickers, newest first. */
  readonly mine = computed(() => {
    const me = this.currentUser();
    return me ? this.stickers().filter(s => s.authorId === me.id) : [];
  });

  /**
   * Whether the UI should offer Edit and Delete. A moderator may act on anyone's
   * sticker; everyone else, only their own. This decides what is *drawn* — the
   * server re-derives the same answer from the token before accepting anything.
   */
  canEdit(sticker: Sticker): boolean {
    const me = this.currentUser();
    return !!me && (me.moderator || me.id === sticker.authorId);
  }

  owns(sticker: Sticker): boolean {
    return this.currentUser()?.id === sticker.authorId;
  }

  /**
   * The photo for a sticker. `updatedAt` rides along as a query parameter so a
   * replaced photo appears immediately: the URL is otherwise identical and the
   * response is cached for a week.
   */
  imageUrl(sticker: Sticker, variant: 'full' | 'thumb' = 'full'): string {
    const version = Date.parse(sticker.updatedAt) || 0;
    return `${BASE}/stickers/${sticker.id}/image?variant=${variant}&v=${version}`;
  }

  async loadMe(): Promise<CurrentUser | null> {
    try {
      // Anonymous browsing is the normal state here, so the 401 this returns
      // when signed out is the answer to the question, not an error worth
      // interrupting anyone about. The header tells the shell's error
      // interceptor to stay quiet; every other call on this service still
      // reports failures normally.
      const me = await firstValueFrom(
        this.http.get<CurrentUser>(`${BASE}/me`, { headers: { 'X-Silent-Error': 'true' } }),
      );
      this.currentUser.set(me);
      return me;
    } catch {
      this.currentUser.set(null);
      return null;
    } finally {
      this.authChecked.set(true);
    }
  }

  async load(): Promise<void> {
    try {
      const wall = await firstValueFrom(this.http.get<Sticker[]>(`${BASE}/stickers`));
      this.stickers.set(wall);
      this.loadError.set(null);
    } catch (error) {
      this.stickers.set([]);
      this.loadError.set(describe(error, 'The sticker wall could not be loaded'));
    } finally {
      this.loaded.set(true);
    }
  }

  /**
   * Places a sticker. Two multipart parts, matching the controller: the JSON
   * body under `sticker` and the file under `image`. The Content-Type header is
   * deliberately not set — the browser has to write it, because only it knows
   * the multipart boundary.
   */
  async create(edit: StickerEdit, image: File): Promise<Sticker> {
    const body = new FormData();
    body.append('sticker', jsonPart(edit));
    body.append('image', image);

    const created = await firstValueFrom(
      this.http.post<Sticker>(`${BASE}/stickers`, body, { withCredentials: true }),
    );
    this.stickers.update(list => [created, ...list]);
    return created;
  }

  async edit(id: string, edit: StickerEdit): Promise<Sticker> {
    const updated = await firstValueFrom(
      this.http.put<Sticker>(`${BASE}/stickers/${id}`, edit, { withCredentials: true }),
    );
    this.replace(updated);
    return updated;
  }

  async replaceImage(id: string, image: File): Promise<Sticker> {
    const body = new FormData();
    body.append('image', image);

    const updated = await firstValueFrom(
      this.http.post<Sticker>(`${BASE}/stickers/${id}/image`, body, { withCredentials: true }),
    );
    this.replace(updated);
    return updated;
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${BASE}/stickers/${id}`, { withCredentials: true }));
    this.stickers.update(list => list.filter(s => s.id !== id));
  }

  /**
   * Hands off to Keycloak through the BFF, asking to come back to whatever page
   * the user was on. The host's own login button does the same thing; this one
   * exists so the globe's menu bar can offer it without reaching across the
   * federation boundary.
   */
  async login(): Promise<void> {
    const options = await firstValueFrom(this.http.get<LoginOption[]>(`${BFF}/login-options`));
    if (!options.length) return;

    // The BFF builds loginUri from its own client-uri, so it always names the
    // primary domain. Only the path is kept: the flow has to start on whichever
    // host the browser is already on, or the session cookie is set somewhere the
    // user is not. The BFF picks the matching redirect_uri from that request.
    const { pathname, search } = new URL(options[0].loginUri, window.location.origin);
    const url = new URL(pathname + search, window.location.origin);
    url.searchParams.append('post_login_success_uri', window.location.href);
    url.searchParams.append('post_login_failure_uri', `${window.location.origin}/login-error`);
    window.location.href = url.toString();
  }

  /** RP-initiated logout: the BFF answers with the Keycloak end-session URL in Location. */
  async logout(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.post<void>(`${BFF}/logout`, null, {
          headers: { 'X-POST-LOGOUT-SUCCESS-URI': window.location.href },
          observe: 'response',
          withCredentials: true,
        }),
      );
      const next = response.headers.get('Location');
      if (next) {
        window.location.href = next;
        return;
      }
    } finally {
      this.currentUser.set(null);
    }
  }

  private replace(sticker: Sticker): void {
    this.stickers.update(list => list.map(s => (s.id === sticker.id ? sticker : s)));
  }
}

/**
 * A JSON blob rather than a plain string field, so Spring binds the part with
 * its JSON converter and `@Valid` applies. A string part would arrive as
 * text/plain and fail conversion.
 */
function jsonPart(value: unknown): Blob {
  return new Blob([JSON.stringify(value)], { type: 'application/json' });
}

/** Prefers the server's own problem detail over a generic status line. */
export function describe(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const detail = (error.error as { detail?: string; message?: string } | null)?.detail;
    if (detail) return detail;
    const message = (error.error as { message?: string } | null)?.message;
    if (message) return message;
    if (error.status === 0) return 'The sticker service is unreachable';
    if (error.status === 401) return 'You need to sign in for that';
    if (error.status === 403) return 'That sticker belongs to someone else';
    if (error.status === 413) return 'That photo is too large';
    if (error.statusText) return `${error.status} ${error.statusText}`;
  }
  return fallback;
}
