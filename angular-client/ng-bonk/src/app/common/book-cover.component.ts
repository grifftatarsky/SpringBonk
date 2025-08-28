import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-book-cover',
  standalone: true,
  imports: [MatIconModule, MatProgressSpinnerModule],
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
          <mat-progress-spinner diameter="24"></mat-progress-spinner>
        </div>
      }

      @if (showIcon) {
        <div class="placeholder">
          <mat-icon>menu_book</mat-icon>
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
        border: 1px solid #00ff41;
        background: rgba(0, 0, 0, 0.2);

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
      }
      .placeholder mat-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
        color: #00ff41;
        opacity: 0.9;
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
