import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { marked } from 'marked';

/**
 * Renders markdown as HTML and pipes it through Angular's built-in
 * {@code DomSanitizer} via {@code [innerHTML]} — which strips scripts,
 * event handlers, and {@code javascript:} URLs before paint. We do not
 * call {@code bypassSecurityTrustHtml}, so untrusted post bodies cannot
 * inject executable content.
 *
 * Styling comes from the {@code .prose} class on the host — see
 * styles.css for the design-token-driven rules.
 */
@Component({
  selector: 'app-markdown-view',
  standalone: true,
  host: { class: 'prose block min-w-0' },
  template: `<div [innerHTML]="html()"></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkdownViewComponent {
  readonly source = input<string>('');

  protected readonly html = computed<string>(() => {
    const raw = this.source() ?? '';
    if (!raw) return '';
    return marked.parse(raw, { async: false }) as string;
  });
}
