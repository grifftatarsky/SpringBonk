import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import {
  DynamicDialogConfig,
  DynamicDialogRef,
  DynamicDialogModule,
} from 'primeng/dynamicdialog';
import { ElectionRequest } from '../model/request/election-request.model';
import { DateTimePickerComponent } from '../common/date-time-picker.component';

@Component({
  selector: 'app-election-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    DynamicDialogModule,
    DateTimePickerComponent,
  ],
  templateUrl: './election-dialog.component.html',
  styleUrls: ['./election-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElectionDialog {
  private readonly fb = inject(FormBuilder);
  private readonly ref = inject<DynamicDialogRef<ElectionRequest | undefined>>(
    DynamicDialogRef
  );
  private readonly config = inject(DynamicDialogConfig<ElectionRequest | null>);

  readonly data = this.config.data ?? null;

  readonly form = this.fb.group({
    title: [this.data?.title ?? '', [Validators.required, Validators.maxLength(160)]],
    endDateTime: [this.data?.endDateTime ?? null],
  });

  readonly headline = this.data ? 'Edit election' : 'Create an election';
  readonly submitLabel = this.data ? 'Save changes' : 'Create';

  cancel(): void {
    this.ref.close();
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const { title, endDateTime } = this.form.value;
    const closure = this.normalizeDate(endDateTime);
    const payload: ElectionRequest = {
      title: title?.trim() ?? '',
      endDateTime: closure,
    };

    this.ref.close(payload);
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
