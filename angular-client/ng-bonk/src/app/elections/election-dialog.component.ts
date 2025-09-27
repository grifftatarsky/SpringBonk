import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ElectionRequest } from '../model/request/election-request.model';
import { DateTimePickerComponent } from '../common/date-time-picker.component';

@Component({
  selector: 'app-election-dialog',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    DateTimePickerComponent,
  ],
  templateUrl: './election-dialog.component.html',
  styleUrls: ['./election-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElectionDialog {
  readonly dialogRef = inject(MatDialogRef<ElectionDialog>);
  private readonly fb = inject(FormBuilder);
  readonly data: ElectionRequest | null = inject(MAT_DIALOG_DATA, {
    optional: true,
  });

  readonly form = this.fb.group({
    title: [this.data?.title ?? '', [Validators.required, Validators.maxLength(160)]],
    endDateTime: [this.data?.endDateTime ?? null],
  });

  readonly headline = this.data ? 'Edit election' : 'Create an election';
  readonly submitLabel = this.data ? 'Save changes' : 'Create';

  onNoClick(): void {
    this.dialogRef.close();
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const { title, endDateTime } = this.form.value;

    let closure: string | null = null;
    const rawValue = endDateTime as unknown;
    if (rawValue instanceof Date) {
      closure = Number.isNaN(rawValue.getTime()) ? null : rawValue.toISOString();
    } else if (typeof rawValue === 'string' && rawValue.trim().length > 0) {
      const parsed = new Date(rawValue);
      closure = Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }

    const payload: ElectionRequest = {
      title: title?.trim() ?? '',
      endDateTime: closure,
    };

    this.dialogRef.close(payload);
  }
}
