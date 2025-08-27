import { Component, Inject, OnInit } from '@angular/core';

import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize, map } from 'rxjs/operators';
import { ShelfResponse } from '../../model/response/shelf-response.model';
import { OpenLibraryBookResponse } from '../../model/response/open-library-book-response.model';
import { ShelfHttpService } from '../../service/http/shelves-http.service';
import { BookCoverComponent } from '../../common/book-cover.component';
import { BookHttpService } from '../../service/http/books-http.service';

@Component({
  selector: 'app-book-select-shelf-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    BookCoverComponent,
  ],
  templateUrl: './book-select-shelf-dialog.component.html',
  styleUrls: ['./book-select-shelf-dialog.component.scss'],
})
export class BookSelectShelfDialog implements OnInit {
  shelves: ShelfResponse[] = [];
  shelfControl: FormControl<string | null> = new FormControl<string | null>(
    null,
    [Validators.required]
  );
  loading: boolean = true;
  unshelvedShelf?: ShelfResponse;
  regularShelves: ShelfResponse[] = [];

  constructor(
    public dialogRef: MatDialogRef<
      BookSelectShelfDialog,
      {
        book: OpenLibraryBookResponse;
        shelfId: string;
      }
    >,
    @Inject(MAT_DIALOG_DATA) public data: { book: OpenLibraryBookResponse },
    private shelfHttp: ShelfHttpService,
    public bookHttp: BookHttpService
  ) {}

  ngOnInit(): void {
    this.loadShelves();
  }

  getCoverImageUrl(): string {
    return this.data.book.cover_i
      ? this.bookHttp.getOpenLibraryCoverImageUrl(this.data.book.cover_i, 'L')
      : '';
  }

  getAuthor(): string {
    return this.data.book.author_name?.[0] || 'Unknown author';
  }

  loadShelves(): void {
    this.loading = true;
    this.shelfHttp
      .getUserShelves()
      .pipe(
        map((shelves: ShelfResponse[]): ShelfResponse[] =>
          shelves.filter(
            (shelf: ShelfResponse): boolean => shelf.title !== 'My Nominations'
          )
        ),
        finalize((): boolean => (this.loading = false))
      )
      .subscribe((shelves: ShelfResponse[]): void => {
        this.shelves = shelves;

        const unshelvedIndex: number = shelves.findIndex(
          (shelf: ShelfResponse): boolean => shelf.title === 'Unshelved'
        );

        if (unshelvedIndex !== -1) {
          this.unshelvedShelf = shelves[unshelvedIndex];
          this.regularShelves = [
            ...shelves.slice(0, unshelvedIndex),
            ...shelves.slice(unshelvedIndex + 1),
          ].sort((a, b) => a.title.localeCompare(b.title));
        } else {
          this.regularShelves = [...shelves].sort((a, b) =>
            a.title.localeCompare(b.title)
          );
        }

        const defaultShelf =
          shelves.find(s => s.defaultShelf) ?? this.unshelvedShelf;
        if (defaultShelf) {
          this.shelfControl.setValue(defaultShelf.id);
        }
      });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (this.shelfControl.valid && this.shelfControl.value) {
      this.dialogRef.close({
        book: this.data.book,
        shelfId: this.shelfControl.value,
      });
    }
  }
}
