import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import {
  DynamicDialogConfig,
  DynamicDialogRef,
  DynamicDialogModule,
} from 'primeng/dynamicdialog';
import { DateTimePickerComponent } from '../../common/date-time-picker.component';

export interface ReopenElectionDialogData {
  title: string;
}

export interface ReopenElectionDialogResult {
  endDateTime: string;
}

@Component({
  selector: 'app-reopen-election-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    DynamicDialogModule,
    DateTimePickerComponent,
  ],
  templateUrl: './reopen-election-dialog.component.html',
  styleUrls: ['./reopen-election-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReopenElectionDialogComponent {
  private readonly fb = inject(FormBuilder);
  readonly ref = inject<
    DynamicDialogRef<ReopenElectionDialogResult | undefined>
  >(DynamicDialogRef);
  readonly data = inject(DynamicDialogConfig<ReopenElectionDialogData>).data;

  readonly form = this.fb.group({
    endDateTime: [null, Validators.required],
  });

  cancel(): void {
    this.ref.close();
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const endDateTime = this.normalizeDate(this.form.value.endDateTime);
    if (!endDateTime) return;

    this.ref.close({ endDateTime });
  }

  private normalizeDate(value: unknown): string | null {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value.toISOString();
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }
    return null;
  }
}
