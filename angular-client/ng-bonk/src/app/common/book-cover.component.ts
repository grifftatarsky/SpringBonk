import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-book-cover',
  standalone: true,
  imports: [ProgressSpinnerModule],
  template: `
    <div class="cover-box">
      @if (hasImage) {
        <img
          class="cover-img"
          [src]="src!"
          [attr.alt]="alt || ''"
          loading="lazy"
          decoding="async"
          (load)="onLoad()"
          (error)="onError()" />
      }

      @if (loading) {
        <div class="spinner">
          <p-progressSpinner strokeWidth="4" styleClass="cover-spinner" />
        </div>
      }

      @if (showIcon) {
        <div class="placeholder">
          <i class="pi pi-book"></i>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      .cover-box {
        position: relative;
        width: 100%;
        height: 100%;
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 0.5rem;
        overflow: hidden;
        background: var(--surface-section, #f3f4f6);
      }
      .cover-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .spinner,
      .placeholder {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.8);
      }
      .placeholder .pi {
        font-size: 32px;
        color: var(--text-color-secondary, #6b7280);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookCoverComponent implements OnChanges {
  @Input() src?: string | null;
  @Input() alt?: string | null;

  loading = false;
  hasImage = false;
  showIcon = false;

  ngOnChanges(changes: SimpleChanges): void {
    if ('src' in changes) {
      const next = (this.src || '').trim();
      if (next) {
        this.loading = true;
        this.hasImage = true;
        this.showIcon = false;
      } else {
        this.loading = false;
        this.hasImage = false;
        this.showIcon = true;
      }
    }
  }

  onLoad(): void {
    this.loading = false;
  }

  onError(): void {
    this.loading = false;
    this.hasImage = false;
    this.showIcon = true;
  }
}
