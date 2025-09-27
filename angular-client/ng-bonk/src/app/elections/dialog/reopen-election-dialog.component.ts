import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  inject,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
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
    MatDialogModule,
    MatButtonModule,
    ReactiveFormsModule,
    DateTimePickerComponent,
  ],
  templateUrl: './reopen-election-dialog.component.html',
  styleUrls: ['./reopen-election-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReopenElectionDialogComponent {
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    endDateTime: [null, Validators.required],
  });

  constructor(
    private readonly ref: MatDialogRef<
      ReopenElectionDialogComponent,
      ReopenElectionDialogResult
    >,
    @Inject(MAT_DIALOG_DATA) public readonly data: ReopenElectionDialogData
  ) {}

  close(): void {
    this.ref.close();
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const endDateTime = this.form.value.endDateTime;
    if (!endDateTime) return;

    let closure: string | null = null;
    const rawValue = endDateTime as unknown;
    if (rawValue instanceof Date) {
      closure = Number.isNaN(rawValue.getTime()) ? null : rawValue.toISOString();
    } else if (typeof rawValue === 'string' && rawValue.trim().length > 0) {
      const parsed = new Date(rawValue);
      closure = Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }

    if (!closure) return;

    this.ref.close({ endDateTime: closure });
  }
}
