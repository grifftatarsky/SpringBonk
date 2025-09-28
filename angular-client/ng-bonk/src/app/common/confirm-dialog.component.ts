import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import {
  DynamicDialogConfig,
  DynamicDialogRef,
  DynamicDialogModule,
} from 'primeng/dynamicdialog';

export interface ConfirmDialogData {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, ButtonModule, DynamicDialogModule],
  template: `
    <div class="dialog-wrapper">
      <h2 class="dialog-title">{{ model.title || 'Confirm' }}</h2>
      <p class="dialog-message">{{ model.message }}</p>
      <div class="dialog-actions">
        <p-button
          label="{{ model.cancelText || 'Cancel' }}"
          (onClick)="close(false)"
          styleClass="p-button-text"
        />
        <p-button
          label="{{ model.confirmText || 'OK' }}"
          (onClick)="close(true)"
          severity="danger"
        />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  private readonly data = this.config.data as ConfirmDialogData | undefined;

  constructor(
    private readonly ref: DynamicDialogRef,
    @Inject(DynamicDialogConfig)
    private readonly config: DynamicDialogConfig<ConfirmDialogData>
  ) {}

  get model(): ConfirmDialogData {
    return (
      this.data ?? {
        message: '',
      }
    );
  }

  close(result: boolean): void {
    this.ref.close(result);
  }
}
