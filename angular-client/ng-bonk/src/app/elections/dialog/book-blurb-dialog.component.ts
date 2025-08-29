import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MarkdownService } from '../../service/markdown.service';

export interface BookBlurbData {
  title: string;
  blurb: string;
}

@Component({
  selector: 'app-book-blurb-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './book-blurb-dialog.component.html',
  styles: [
    `
      :host {
        display: block;
      }
      .blurb :is(p, h1, h2, h3) {
        margin: 0 0 0.5rem 0;
      }
      .blurb code {
        background: rgba(0, 255, 65, 0.1);
        padding: 0 2px;
      }
      .blurb a {
        color: #00ff41;
        text-decoration: underline;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookBlurbDialogComponent {
  readonly data: BookBlurbData = inject<BookBlurbData>(MAT_DIALOG_DATA as any);

  private readonly md: MarkdownService = inject(MarkdownService);

  get html(): string {
    return this.md.toHtml(this.data?.blurb || '');
  }
}
