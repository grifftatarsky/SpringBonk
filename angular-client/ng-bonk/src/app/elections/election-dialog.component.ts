import {
  ChangeDetectionStrategy,
  Component,
  inject,
  model,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogModule,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ElectionRequest } from '../model/request/election-request.model';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';

@Component({
  selector: 'app-election-dialog',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatDatepickerModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './election-dialog.component.html',
  styleUrls: ['./election-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElectionDialog {
  readonly dialogRef = inject(MatDialogRef<ElectionDialog>);
  readonly data: ElectionRequest = inject<ElectionRequest>(MAT_DIALOG_DATA);

  // Don't bind to signals in template. Use values directly for ngModel
  titleValue: string = this.data?.title ?? '';
  endDateValue: Date | null = this.data?.endDateTime
    ? new Date(this.data.endDateTime)
    : null;

  onNoClick(): void {
    this.dialogRef.close();
  }

  submit(): void {
    const payload: ElectionRequest = {
      title: this.titleValue,
      endDateTime: this.endDateValue?.toISOString() ?? null,
    };

    this.dialogRef.close(payload);
  }
}
