import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ShelfHttpService } from '../../service/http/shelves-http.service';
import { ShelfResponse } from '../../model/response/shelf-response.model';
import { BookHttpService } from '../../service/http/books-http.service';
import { OpenLibraryBookResponse } from '../../model/response/open-library-book-response.model';
import { BookCoverComponent } from '../../common/book-cover.component';
import { NotificationService } from '../../service/notification.service';

export interface NominationFinalizeDialogData {
  book: OpenLibraryBookResponse;
}

export interface NominationFinalizeDialogResult {
  shelfId: string | null;
  pitch: string;
}

@Component({
  selector: 'app-nomination-finalize-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    ReactiveFormsModule,
    BookCoverComponent,
  ],
  templateUrl: './nomination-finalize-dialog.component.html',
  styleUrls: ['./nomination-finalize-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NominationFinalizeDialogComponent implements OnInit {
  readonly pitchControl = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.maxLength(1200)],
  });

  readonly shelfControl = new FormControl<string | null>(null);

  shelves: ShelfResponse[] = [];
  loadingShelves = true;

  constructor(
    private readonly dialogRef: MatDialogRef<
      NominationFinalizeDialogComponent,
      NominationFinalizeDialogResult
    >,
    @Inject(MAT_DIALOG_DATA) public readonly data: NominationFinalizeDialogData,
    private readonly shelvesHttp: ShelfHttpService,
    private readonly bookHttp: BookHttpService,
    private readonly notify: NotificationService
  ) {}

  ngOnInit(): void {
    this.shelvesHttp.getUserShelves().subscribe({
      next: shelves => {
        this.shelves = shelves
          .filter(shelf => shelf.title !== 'My Nominations')
          .sort((a, b) => a.title.localeCompare(b.title));
        this.loadingShelves = false;
      },
      error: () => {
        this.loadingShelves = false;
        this.notify.error('Unable to load your shelves');
      },
    });
  }

  get coverUrl(): string {
    const coverId = this.data.book.cover_i;
    return coverId
      ? this.bookHttp.getOpenLibraryCoverImageUrl(coverId, 'L')
      : '';
  }

  get author(): string {
    return this.data.book.author_name?.[0] ?? 'Unknown';
  }

  cancel(): void {
    this.dialogRef.close();
  }

  confirm(): void {
    if (this.pitchControl.invalid) {
      this.pitchControl.markAsTouched();
      return;
    }

    this.dialogRef.close({
      shelfId: this.shelfControl.value,
      pitch: this.pitchControl.value,
    });
  }
}
