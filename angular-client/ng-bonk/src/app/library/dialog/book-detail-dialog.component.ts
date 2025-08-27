import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit,
} from '@angular/core';

import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BookResponse } from '../../model/response/book-response.model';
import { BookHttpService } from '../../service/http/books-http.service';
import { BookRequest } from '../../model/request/book-request.model';
import { BookCoverComponent } from '../../common/book-cover.component';

@Component({
  selector: 'app-book-detail-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    BookCoverComponent,
  ],
  templateUrl: './book-detail-dialog.component.html',
  styleUrls: ['./book-detail-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookDetailDialog implements OnInit {
  blurbControl = new FormControl('', [Validators.required]);

  constructor(
    public dialogRef: MatDialogRef<BookDetailDialog, BookResponse>,
    @Inject(MAT_DIALOG_DATA) public data: { book: BookResponse },
    private bookHttp: BookHttpService
  ) {}

  ngOnInit(): void {
    // Initialize form control after component is initialized
    this.blurbControl.setValue(this.data.book.blurb || '');
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.blurbControl.valid) {
      const updatedBook: BookRequest = {
        title: this.data.book.title,
        author: this.data.book.author,
        imageURL: this.data.book.imageURL,
        blurb: this.blurbControl.value || '',
        openLibraryId: this.data.book.openLibraryId,
        shelfIds: this.data.book.shelves.map(shelf => shelf.id),
      };

      this.bookHttp
        .updateBook(this.data.book.id, updatedBook)
        .subscribe(response => {
          this.dialogRef.close(response);
        });
    }
  }
}
