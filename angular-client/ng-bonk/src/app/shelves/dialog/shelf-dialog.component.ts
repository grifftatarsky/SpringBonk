import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ShelfRequest } from '../../model/request/shelf-request.model';

@Component({
  selector: 'app-shelf-dialog',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
  ],
  templateUrl: './shelf-dialog.component.html',
  styleUrls: ['./shelf-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShelfDialog {
  readonly dialogRef = inject(MatDialogRef<ShelfDialog>);
  readonly data: ShelfRequest = inject<ShelfRequest>(MAT_DIALOG_DATA);

  titleValue: string = this.data?.title ?? '';

  onCancel(): void {
    this.dialogRef.close();
  }

  submit(): void {
    const payload: ShelfRequest = {
      title: this.titleValue,
    };

    this.dialogRef.close(payload);
  }
}
