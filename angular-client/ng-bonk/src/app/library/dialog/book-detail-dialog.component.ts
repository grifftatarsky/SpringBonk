import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextareaModule } from 'primeng/inputtextarea';
import {
  DynamicDialogConfig,
  DynamicDialogRef,
  DynamicDialogModule,
} from 'primeng/dynamicdialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BookResponse } from '../../model/response/book-response.model';
import { BookHttpService } from '../../service/http/books-http.service';
import { BookRequest } from '../../model/request/book-request.model';
import { BookCoverComponent } from '../../common/book-cover.component';
import { SimpleShelfResponse } from '../../model/response/simple-shelf-response.model';

@Component({
  selector: 'app-book-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextareaModule,
    DynamicDialogModule,
    BookCoverComponent,
  ],
  templateUrl: './book-detail-dialog.component.html',
  styleUrls: ['./book-detail-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookDetailDialog implements OnInit {
  private readonly bookHttp = inject(BookHttpService);
  private readonly destroyRef = inject(DestroyRef);

  readonly ref = inject<DynamicDialogRef<BookResponse | undefined>>(DynamicDialogRef);
  readonly data = inject(DynamicDialogConfig<{ book: BookResponse }>).data;

  readonly blurbControl = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(10)],
  });

  get book(): BookResponse {
    return this.data?.book as BookResponse;
  }

  ngOnInit(): void {
    this.blurbControl.setValue(this.book?.blurb || '');
  }

  cancel(): void {
    this.ref.close();
  }

  save(): void {
    if (!this.book || this.blurbControl.invalid) return;
    const payload: BookRequest = {
      title: this.book.title,
      author: this.book.author,
      imageURL: this.book.imageURL,
      blurb: this.blurbControl.value,
      openLibraryId: this.book.openLibraryId,
      shelfIds: this.book.shelves.map(
        (shelf: SimpleShelfResponse): string => shelf.id
      ),
    };

    this.bookHttp
      .updateBook(this.book.id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(updated => this.ref.close(updated));
  }
}
