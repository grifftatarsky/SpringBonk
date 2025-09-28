import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import {
  DynamicDialogConfig,
  DynamicDialogRef,
  DynamicDialogModule,
} from 'primeng/dynamicdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ShelfResponse } from '../../model/response/shelf-response.model';
import { OpenLibraryBookResponse } from '../../model/response/open-library-book-response.model';
import { ShelfHttpService } from '../../service/http/shelves-http.service';
import { BookCoverComponent } from '../../common/book-cover.component';
import { BookHttpService } from '../../service/http/books-http.service';

interface BookSelectShelfResult {
  book: OpenLibraryBookResponse;
  shelfId: string;
}

@Component({
  selector: 'app-book-select-shelf-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DropdownModule,
    ButtonModule,
    DividerModule,
    DynamicDialogModule,
    ProgressSpinnerModule,
    BookCoverComponent,
  ],
  templateUrl: './book-select-shelf-dialog.component.html',
  styleUrls: ['./book-select-shelf-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookSelectShelfDialog implements OnInit {
  private readonly shelfHttp = inject(ShelfHttpService);
  private readonly bookHttp = inject(BookHttpService);
  private readonly destroyRef = inject(DestroyRef);

  readonly ref = inject<DynamicDialogRef<BookSelectShelfResult | undefined>>(DynamicDialogRef);
  readonly data = inject(DynamicDialogConfig<{ book: OpenLibraryBookResponse }>).data;

  readonly shelfControl = new FormControl<string | null>(null, {
    nonNullable: false,
    validators: [Validators.required],
  });

  shelves: ShelfResponse[] = [];
  loading = true;

  ngOnInit(): void {
    this.loadShelves();
  }

  get book(): OpenLibraryBookResponse {
    return this.data?.book;
  }

  get coverUrl(): string {
    return this.book?.cover_i
      ? this.bookHttp.getOpenLibraryCoverImageUrl(this.book.cover_i, 'L')
      : '';
  }

  get author(): string {
    return this.book?.author_name?.[0] || 'Unknown author';
  }

  loadShelves(): void {
    this.loading = true;
    this.shelfHttp
      .getUserShelves()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: shelves => {
          this.loading = false;
          const filtered = shelves.filter(
            shelf => shelf.title !== 'My Nominations'
          );
          this.shelves = [...filtered].sort((a, b) => a.title.localeCompare(b.title));
          const preferred =
            this.shelves.find(shelf => shelf.defaultShelf) ?? this.shelves[0];
          if (preferred) {
            this.shelfControl.setValue(preferred.id);
          }
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  cancel(): void {
    this.ref.close();
  }

  confirm(): void {
    if (this.shelfControl.valid && this.shelfControl.value) {
      this.ref.close({
        book: this.book,
        shelfId: this.shelfControl.value,
      });
    }
  }
}
