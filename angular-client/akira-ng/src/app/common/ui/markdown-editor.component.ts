import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  forwardRef,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MarkdownViewComponent } from './markdown-view.component';

type ToolbarAction =
  | 'bold'
  | 'italic'
  | 'h2'
  | 'h3'
  | 'quote'
  | 'ul'
  | 'ol'
  | 'code'
  | 'link'
  | 'image'
  | 'hr';

interface ToolbarButton {
  readonly action: ToolbarAction;
  readonly label: string;
  readonly title: string;
  readonly labelClass?: string;
}

/**
 * Reactive-forms compatible markdown editor.
 *
 * <p>A plain textarea drives the value; a toolbar wraps or prepends markdown
 * syntax around the current selection (preserving caret state). Live preview
 * is rendered through the shared {@link MarkdownViewComponent} which relies
 * on Angular's built-in {@code DomSanitizer} — so pasted HTML can't escape
 * the preview.
 */
@Component({
  selector: 'app-markdown-editor',
  standalone: true,
  imports: [FormsModule, MarkdownViewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MarkdownEditorComponent),
      multi: true,
    },
  ],
  template: `
    <div class="overflow-hidden rounded-md border border-rule">
      <!-- TOOLBAR -->
      <div
        class="flex flex-wrap items-center gap-0.5 border-b border-rule bg-bg-subtle px-1.5 py-1"
        role="toolbar"
        aria-label="Markdown formatting">
        @for (btn of toolbarButtons; track btn.action) {
          <button
            type="button"
            class="inline-flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-xs text-fg-muted transition-colors hover:bg-bg hover:text-fg"
            [class]="btn.labelClass ?? ''"
            [title]="btn.title"
            [attr.aria-label]="btn.title"
            (click)="apply(btn.action)">
            {{ btn.label }}
          </button>
          @if (btn.action === 'italic' || btn.action === 'quote' || btn.action === 'ol') {
            <span class="mx-1 h-4 w-px bg-rule" aria-hidden="true"></span>
          }
        }

        <div class="ml-auto inline-grid grid-cols-3 gap-0.5 rounded border border-rule bg-bg p-0.5" role="radiogroup" aria-label="Editor view mode">
          @for (option of modeOptions; track option.value) {
            <button
              type="button"
              class="h-6 rounded px-2 text-[0.7rem] font-semibold uppercase tracking-wider text-fg-muted transition-colors data-checked:bg-bg-subtle data-checked:text-fg hover:text-fg"
              role="radio"
              [attr.aria-checked]="mode() === option.value"
              [attr.tabindex]="mode() === option.value ? 0 : -1"
              [attr.data-checked]="mode() === option.value ? '' : null"
              (click)="setMode(option.value)">
              {{ option.label }}
            </button>
          }
        </div>
      </div>

      <!-- EDITOR + PREVIEW -->
      <div [class]="paneLayout()">
        @if (mode() !== 'preview') {
          <textarea
            #textarea
            class="block min-h-[28rem] w-full resize-y bg-bg p-4 font-mono text-sm leading-relaxed text-fg outline-none placeholder:text-fg-whisper focus:outline-none"
            [class.border-r]="mode() === 'split'"
            [class.border-rule]="mode() === 'split'"
            [ngModel]="value()"
            (ngModelChange)="onValueChange($event)"
            (blur)="onTouched()"
            (keydown)="onKeyDown($event)"
            placeholder="Write your post in markdown…"
            spellcheck="true"></textarea>
        }
        @if (mode() !== 'edit') {
          <div class="min-h-[28rem] overflow-auto bg-bg p-4">
            @if (value()) {
              <app-markdown-view [source]="value()"/>
            } @else {
              <p class="text-sm text-fg-whisper">Nothing to preview yet.</p>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class MarkdownEditorComponent implements ControlValueAccessor {
  protected readonly textarea = viewChild<ElementRef<HTMLTextAreaElement>>('textarea');

  protected readonly value = signal<string>('');
  protected readonly mode = signal<'edit' | 'split' | 'preview'>('split');

  protected readonly modeOptions: ReadonlyArray<{ label: string; value: 'edit' | 'split' | 'preview' }> = [
    { label: 'Write', value: 'edit' },
    { label: 'Split', value: 'split' },
    { label: 'View', value: 'preview' },
  ];

  protected readonly toolbarButtons: ReadonlyArray<ToolbarButton> = [
    { action: 'bold', label: 'B', title: 'Bold (Ctrl+B)', labelClass: 'font-semibold' },
    { action: 'italic', label: 'I', title: 'Italic (Ctrl+I)', labelClass: 'italic' },
    { action: 'h2', label: 'H2', title: 'Heading 2' },
    { action: 'h3', label: 'H3', title: 'Heading 3' },
    { action: 'quote', label: '"', title: 'Quote' },
    { action: 'ul', label: '•', title: 'Bullet list' },
    { action: 'ol', label: '1.', title: 'Numbered list' },
    { action: 'code', label: '< >', title: 'Code', labelClass: 'font-mono text-[0.65rem]' },
    { action: 'link', label: 'Link', title: 'Link (Ctrl+K)' },
    { action: 'image', label: 'Image', title: 'Image' },
    { action: 'hr', label: '―', title: 'Horizontal rule' },
  ];

  protected paneLayout(): string {
    return this.mode() === 'split'
      ? 'grid grid-cols-1 md:grid-cols-2'
      : 'grid grid-cols-1';
  }

  private onChange: (value: string) => void = () => {};
  protected onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }
  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  protected onValueChange(next: string): void {
    this.value.set(next);
    this.onChange(next);
  }

  protected setMode(mode: 'edit' | 'split' | 'preview'): void {
    this.mode.set(mode);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    if (key === 'b') {
      event.preventDefault();
      this.apply('bold');
    } else if (key === 'i') {
      event.preventDefault();
      this.apply('italic');
    } else if (key === 'k') {
      event.preventDefault();
      this.apply('link');
    }
  }

  protected apply(action: ToolbarAction): void {
    const el = this.textarea()?.nativeElement;
    if (!el) return;
    const before = el.value.substring(0, el.selectionStart);
    const selected = el.value.substring(el.selectionStart, el.selectionEnd);
    const after = el.value.substring(el.selectionEnd);

    const { replacement, caretOffsetFromInsertionStart, selectionLength } =
      this.transform(action, selected);

    const next = before + replacement + after;
    const insertionStart = before.length;
    const caretPos = insertionStart + caretOffsetFromInsertionStart;

    this.value.set(next);
    this.onChange(next);

    queueMicrotask(() => {
      el.focus();
      el.setSelectionRange(caretPos, caretPos + selectionLength);
    });
  }

  private transform(action: ToolbarAction, selected: string): {
    replacement: string;
    caretOffsetFromInsertionStart: number;
    selectionLength: number;
  } {
    switch (action) {
      case 'bold': {
        const text = selected || 'bold text';
        return {
          replacement: `**${text}**`,
          caretOffsetFromInsertionStart: 2,
          selectionLength: text.length,
        };
      }
      case 'italic': {
        const text = selected || 'italic text';
        return {
          replacement: `_${text}_`,
          caretOffsetFromInsertionStart: 1,
          selectionLength: text.length,
        };
      }
      case 'h2': {
        const text = selected || 'Heading';
        return {
          replacement: `## ${text}`,
          caretOffsetFromInsertionStart: 3,
          selectionLength: text.length,
        };
      }
      case 'h3': {
        const text = selected || 'Heading';
        return {
          replacement: `### ${text}`,
          caretOffsetFromInsertionStart: 4,
          selectionLength: text.length,
        };
      }
      case 'quote': {
        const text = selected || 'quoted text';
        const replacement = text
          .split('\n')
          .map((l) => `> ${l}`)
          .join('\n');
        return {
          replacement,
          caretOffsetFromInsertionStart: 2,
          selectionLength: text.length,
        };
      }
      case 'ul': {
        const text = selected || 'item';
        const replacement = text
          .split('\n')
          .map((l) => `- ${l}`)
          .join('\n');
        return {
          replacement,
          caretOffsetFromInsertionStart: 2,
          selectionLength: text.length,
        };
      }
      case 'ol': {
        const lines = (selected || 'item').split('\n');
        const replacement = lines.map((l, i) => `${i + 1}. ${l}`).join('\n');
        return {
          replacement,
          caretOffsetFromInsertionStart: 3,
          selectionLength: lines[0].length,
        };
      }
      case 'code': {
        const text = selected || 'code';
        if (text.includes('\n')) {
          return {
            replacement: `\`\`\`\n${text}\n\`\`\``,
            caretOffsetFromInsertionStart: 4,
            selectionLength: text.length,
          };
        }
        return {
          replacement: `\`${text}\``,
          caretOffsetFromInsertionStart: 1,
          selectionLength: text.length,
        };
      }
      case 'link': {
        const label = selected || 'link text';
        const replacement = `[${label}](https://)`;
        return {
          replacement,
          caretOffsetFromInsertionStart: replacement.length - 1,
          selectionLength: 0,
        };
      }
      case 'image': {
        const alt = selected || 'alt text';
        const replacement = `![${alt}](https://)`;
        return {
          replacement,
          caretOffsetFromInsertionStart: replacement.length - 1,
          selectionLength: 0,
        };
      }
      case 'hr': {
        return {
          replacement: `\n\n---\n\n`,
          caretOffsetFromInsertionStart: 7,
          selectionLength: 0,
        };
      }
    }
  }
}
