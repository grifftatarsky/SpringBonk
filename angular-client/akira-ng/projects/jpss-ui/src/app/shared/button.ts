import { Directive, computed, input } from '@angular/core';

/**
 * How loud the button is, not what it does — the label says what it does.
 *
 * `danger` is the solid one that commits a destructive action; `danger-quiet`
 * is the text-only one that only opens the confirmation. Keeping them distinct
 * is the point: the button that deletes should never look like the button that
 * asks whether to delete.
 */
export type ButtonTone = 'primary' | 'default' | 'danger' | 'danger-quiet';

/**
 * Touch-sized on a phone and compact from `sm` up. The 44px floor is a real
 * requirement rather than taste — anything smaller is below every platform's
 * minimum target — and it was previously repeated at each call site, which is
 * how two of them ended up 30px tall.
 */
const BASE =
  'inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold' +
  ' transition sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs';

const TONES: Readonly<Record<ButtonTone, string>> = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-50',
  default: 'border border-rule text-fg hover:bg-bg-subtle disabled:opacity-60',
  danger: 'bg-danger text-danger-fg hover:opacity-90 disabled:opacity-60',
  'danger-quiet': 'text-danger hover:bg-danger-subtle disabled:opacity-60',
};

/**
 * The one place a button's shape is decided.
 *
 * A directive rather than a wrapper component so the element stays a real
 * `<button>` — `type="submit"`, `disabled` and form association all keep
 * working — and rather than a shared CSS class because this remote builds the
 * *host's* stylesheet, where a `.jpss-btn` rule would leak into every page of
 * the shell.
 *
 * Angular merges a static `class` attribute with this binding, so a call site
 * can still add spacing or width without losing the tone.
 */
@Directive({
  selector: 'button[jpssButton]',
  host: { '[class]': 'classes()' },
})
export class JpssButton {
  /**
   * A bare `jpssButton` attribute arrives as the empty string, which is the
   * common case and should not have to be spelled `jpssButton="default"`.
   */
  readonly tone = input<ButtonTone, ButtonTone | ''>('default', {
    alias: 'jpssButton',
    transform: value => value || 'default',
  });

  protected readonly classes = computed(() => `${BASE} ${TONES[this.tone()]}`);
}
