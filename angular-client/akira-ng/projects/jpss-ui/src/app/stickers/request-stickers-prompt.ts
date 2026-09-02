import { ChangeDetectionStrategy, Component, HostListener, input, output } from '@angular/core';
import { JpssButton } from '../shared/button';

/**
 * Where a request for more stickers goes. A placeholder until there is
 * somewhere real to send it — deliberately a plain mailto rather than a form
 * posting to an endpoint that does not exist yet, so the button either works or
 * is obviously not wired, never silently drops what someone typed.
 */
const CONTACT = 'stickers@findjo.org';

/**
 * Asks Jo for more stickers.
 *
 * Signed-in only, which is why the address is safe to render: it is behind a
 * login rather than sitting in the public page for a scraper to harvest.
 */
@Component({
  selector: 'jpss-request-stickers-prompt',
  imports: [JpssButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        class="absolute inset-0 cursor-default bg-fg/40 backdrop-blur-sm"
        aria-label="Close"
        (click)="close.emit()"></button>
      <section
        class="relative z-10 w-full max-w-md rounded-lg border border-rule bg-bg p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="jpss-request-title">
        <h2 id="jpss-request-title" class="text-base font-semibold text-fg">Request more stickers</h2>
        <p class="mt-1.5 text-sm leading-relaxed text-fg-muted">
          Run out of somewhere to put them? Ask Jo for more, and say roughly how many
          you are after.
        </p>
        <p class="mt-3 rounded-md border border-rule bg-bg-subtle px-3 py-2 font-mono text-xs break-all text-fg">
          {{ contact }}
        </p>
        <div class="mt-4 flex flex-wrap gap-2">
          <a
            class="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover sm:min-h-0 sm:px-3.5 sm:py-1.5 sm:text-xs"
            [href]="mailto()"
            (click)="close.emit()">
            Email Jo
          </a>
          <button type="button" jpssButton (click)="close.emit()">Not now</button>
        </div>
        <p class="mt-3 text-[0.7rem] leading-relaxed text-fg-subtle">
          Placeholder address — nothing is sent from this page.
        </p>
      </section>
    </div>
  `,
})
export class RequestStickersPrompt {
  readonly username = input<string | null>(null);

  readonly close = output<void>();

  protected readonly contact = CONTACT;

  protected mailto(): string {
    const who = this.username();
    const body = who
      ? `Hello Jo,\n\nCould I have some more stickers? I am ${who} on the globe.\n\nThank you.`
      : 'Hello Jo,\n\nCould I have some more stickers?\n\nThank you.';
    return `mailto:${CONTACT}?subject=${encodeURIComponent('More stickers, please')}&body=${encodeURIComponent(body)}`;
  }

  @HostListener('window:keydown.escape')
  protected onEscape(): void {
    this.close.emit();
  }
}
