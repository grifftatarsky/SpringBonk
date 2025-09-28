import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import {
  DynamicDialogConfig,
  DynamicDialogRef,
  DynamicDialogModule,
} from 'primeng/dynamicdialog';
import { MarkdownService } from '../../service/markdown.service';

export interface BookBlurbData {
  title: string;
  blurb: string;
}

@Component({
  selector: 'app-book-blurb-dialog',
  standalone: true,
  imports: [CommonModule, ButtonModule, DynamicDialogModule],
  templateUrl: './book-blurb-dialog.component.html',
  styleUrls: ['./book-blurb-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookBlurbDialogComponent {
  private readonly config = inject(DynamicDialogConfig<BookBlurbData>);
  private readonly ref = inject(DynamicDialogRef<void>);
  private readonly md = inject(MarkdownService);

  readonly data = this.config.data;

  get html(): string {
    return this.md.toHtml(this.data?.blurb || '');
  }

  close(): void {
    this.ref.close();
  }
}
