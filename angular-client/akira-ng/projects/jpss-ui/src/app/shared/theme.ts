import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

/** Shared with the host shell, so a visitor keeps one preference across both. */
const STORAGE_KEY = 'akira-theme';

/** Set by the standalone shell; absent when jpss-ui is a page of the host. */
const STANDALONE_FLAG = 'jpssStandalone';

/**
 * Light or dark, for the standalone build.
 *
 * <p>The host shell has its own theme control in its header, and owns the
 * `.dark` class on the document. Inside it, this service reports the current
 * mode and changes nothing — two writers fighting over one class is exactly the
 * bug that produces a flicker on every navigation. On findjo.org there is no
 * header to put a control in, so here it both owns and applies the preference,
 * and the globe's ⋯ menu offers the toggle.
 */
@Injectable({ providedIn: 'root' })
export class Theme {
  private readonly document = inject(DOCUMENT);

  /** True on findjo.org, false as a page of akira-app.io. */
  readonly standalone: boolean;

  private readonly state = signal(false);
  readonly dark = this.state.asReadonly();

  private readonly query: MediaQueryList | null =
    typeof window === 'undefined' ? null : window.matchMedia('(prefers-color-scheme: dark)');

  constructor() {
    const root = this.document?.documentElement;
    this.standalone = !!root && root.dataset[STANDALONE_FLAG] !== undefined;

    this.state.set(this.resolve());

    if (this.query) {
      // Only meaningful until somebody picks explicitly; after that the stored
      // choice wins and the OS changing underneath should not override them.
      this.query.addEventListener('change', () => {
        if (!this.storedChoice()) this.state.set(this.query!.matches);
      });
    }

    if (this.standalone) {
      effect(() => root?.classList.toggle('dark', this.state()));
    }
  }

  toggle(): void {
    const next = !this.state();
    this.state.set(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    } catch {
      // Private browsing and blocked storage both throw here. The toggle still
      // works for this visit; it just will not be remembered.
    }
  }

  private resolve(): boolean {
    const stored = this.storedChoice();
    if (stored) {
      return stored === 'dark';
    }
    // Embedded, the host has already decided and stamped the class.
    if (!this.standalone) {
      return !!this.document?.documentElement?.classList.contains('dark');
    }
    return this.query?.matches ?? false;
  }

  private storedChoice(): 'light' | 'dark' | null {
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch {
      return null;
    }
  }
}
