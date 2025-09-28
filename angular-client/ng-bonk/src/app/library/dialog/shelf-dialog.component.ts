import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import {
  DynamicDialogConfig,
  DynamicDialogRef,
  DynamicDialogModule,
} from 'primeng/dynamicdialog';
import { ShelfRequest } from '../../model/request/shelf-request.model';

@Component({
  selector: 'app-shelf-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    DynamicDialogModule,
  ],
  templateUrl: './shelf-dialog.component.html',
  styleUrls: ['./shelf-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShelfDialog {
  readonly data: ShelfRequest;
  titleValue = '';

  constructor(
    private readonly ref: DynamicDialogRef,
    @Inject(DynamicDialogConfig)
    config: DynamicDialogConfig<ShelfRequest>
  ) {
    this.data = config.data ?? { title: '' };
    this.titleValue = this.data.title ?? '';
  }

  onCancel(): void {
    this.ref.close();
  }

  submit(): void {
    const payload: ShelfRequest = {
      title: this.titleValue.trim(),
    };
    this.ref.close(payload);
  }
}
