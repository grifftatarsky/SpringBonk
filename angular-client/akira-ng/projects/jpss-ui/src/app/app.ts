import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterOutlet } from '@angular/router';

/** Must track `--color-bg` in styles.css and the metas in index.html. */
const THEME_COLOUR = { light: '#ffffff', dark: '#0a0a0b' } as const;

/**
 * Thin standalone shell used when jpss-ui runs on its own — dev :4203, and
 * findjo.org in production. In federation the host loads ./routes directly and
 * owns the theme, so this component never runs there.
 *
 * Standalone has no theme picker (there is no settings surface to hang one on),
 * but it still has to *resolve* a theme: without this the page renders light on
 * a dark phone, and the `theme-color` meta — which follows the OS on its own —
 * would tint the Dynamic Island dark over a white page.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<router-outlet />',
})
export class App {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  private readonly query: MediaQueryList | null =
    typeof window === 'undefined' ? null : window.matchMedia('(prefers-color-scheme: dark)');
  private readonly prefersDark = signal(this.query?.matches ?? false);

  constructor() {
    if (this.query) {
      const onChange = (event: MediaQueryListEvent) => this.prefersDark.set(event.matches);
      this.query.addEventListener('change', onChange);
      this.destroyRef.onDestroy(() => this.query?.removeEventListener('change', onChange));
    }
    // findjo.org is a separate origin from the host, so this only ever picks up
    // a preference stored by a previous standalone visit — never the host's.
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('akira-theme');
      if (stored === 'light' || stored === 'dark') {
        this.prefersDark.set(stored === 'dark');
      }
    }
    effect(() => this.applyTheme(this.prefersDark()));
  }

  private applyTheme(dark: boolean): void {
    this.document?.documentElement?.classList.toggle('dark', dark);
    // Overwrite both media-scoped metas with the resolved colour, so whichever
    // one Safari matches gives the same answer.
    this.document?.head
      ?.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
      .forEach((tag) => tag.setAttribute('content', dark ? THEME_COLOUR.dark : THEME_COLOUR.light));
  }
}
