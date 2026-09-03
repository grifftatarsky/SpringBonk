import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Theme } from './shared/theme';

/** Must track `--color-bg` in styles.css and the metas in index.html. */
const THEME_COLOUR = { light: '#ffffff', dark: '#0a0a0b' } as const;

/**
 * Thin standalone shell used when jpss-ui runs on its own — dev :4203, and
 * findjo.org in production. In federation the host loads ./routes directly and
 * owns the theme, so this component never runs there.
 *
 * Theme resolution lives in {@link Theme}, which the globe's ⋯ menu also drives.
 * What is left here is the browser-chrome colour: the `theme-color` metas follow
 * the OS on their own, so without this a manual override would tint the Dynamic
 * Island dark over a white page.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<router-outlet />',
})
export class App {
  private readonly document = inject(DOCUMENT);
  private readonly theme = inject(Theme);

  constructor() {
    this.dropShellHeaderOffset();
    // Theme is the service's job now — it owns the class and the stored choice,
    // and the ⋯ menu's toggle drives the same signal. Applying it here as well
    // would give the document two writers.
    effect(() => this.applyChromeColour(this.theme.dark()));
  }

  /**
   * Standalone has no shell header for the globe to sit below, so the stage must
   * not reserve room for one. jpss-page.css defaults this to the host's 3.5rem;
   * without the override findjo.org leaves a 56px dead strip under the globe.
   */
  private dropShellHeaderOffset(): void {
    this.document?.documentElement?.style.setProperty('--jpss-shell-header', '0px');
  }

  private applyChromeColour(dark: boolean): void {
    // Overwrite both media-scoped metas with the resolved colour, so whichever
    // one Safari matches gives the same answer.
    this.document?.head
      ?.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
      .forEach((tag) => tag.setAttribute('content', dark ? THEME_COLOUR.dark : THEME_COLOUR.light));
  }
}
