import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { BookResponse } from '../../model/response/book-response.model';
import { BookHttpService } from '../../service/http/books-http.service';
import { Store } from '@ngrx/store';
import * as LibraryActions from '../store/library.actions';
import { MatDialog } from '@angular/material/dialog';
import { BookSelectShelfDialog } from '../dialog/book-select-shelf-dialog.component';
import { NotificationService } from '../../service/notification.service';
import { BookNominateDialog } from '../dialog/book-nominate.component';

export interface BookDetailSheetData {
  book: BookResponse;
  shelfId: string;
}

@Component({
  selector: 'app-book-detail-sheet',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
  ],
  template: `
    <div class="sheet-header">
      <div class="cover"><img [src]="data.book.imageURL" alt="{{ data.book.title }} cover" /></div>
      <div class="meta">
        <div class="title">{{ data.book.title }}</div>
        <mat-chip-set>
          <mat-chip appearance="outlined">{{ data.book.author }}</mat-chip>
          <mat-chip appearance="outlined">{{ data.book.publishedYear ?? '—' }}</mat-chip>
        </mat-chip-set>
      </div>
    </div>
    <mat-divider></mat-divider>
    <div class="sheet-actions">
      <button mat-stroked-button color="primary" (click)="reshelve()">
        <mat-icon>swap_horiz</mat-icon>
        Reshelve
      </button>
      <button mat-stroked-button (click)="nominate()">
        <mat-icon>star</mat-icon>
        Nominate
      </button>
      <span class="spacer"></span>
      <button mat-button color="warn" (click)="removeFromShelf()">
        <mat-icon>remove_circle</mat-icon>
        Remove from shelf
      </button>
      <button mat-flat-button color="warn" (click)="delete()">
        <mat-icon>delete</mat-icon>
        Delete
      </button>
    </div>
  `,
  styles: [
    `
      :host { display: block; padding: 12px; }
      .sheet-header { display: flex; align-items: center; gap: 12px; }
      .cover { width: 80px; height: 112px; border: 1px solid #00ff41; overflow: hidden; }
      .cover img { width: 100%; height: 100%; object-fit: cover; }
      .meta .title { font-weight: 600; margin-bottom: 6px; }
      .sheet-actions { display: flex; align-items: center; gap: 8px; padding-top: 12px; flex-wrap: wrap; }
      .spacer { flex: 1; }
      @media (max-width: 600px) {
        .sheet-actions { flex-direction: column; align-items: stretch; }
        .sheet-actions button { width: 100%; justify-content: center; }
        .spacer { display: none; }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookDetailSheetComponent {
  constructor(
    private ref: MatBottomSheetRef<BookDetailSheetComponent>,
    @Inject(MAT_BOTTOM_SHEET_DATA) public data: BookDetailSheetData,
    private bookHttp: BookHttpService,
    private store: Store,
    private dialog: MatDialog,
    private notify: NotificationService
  ) {}

  removeFromShelf(): void {
    this.store.dispatch(
      LibraryActions.removeBookFromShelf({ bookId: this.data.book.id, shelfId: this.data.shelfId })
    );
    this.notify.success('Removed from shelf');
    this.ref.dismiss(true);
  }

  delete(): void {
    this.store.dispatch(LibraryActions.deleteBook({ bookId: this.data.book.id }));
    this.notify.success('Deleted book');
    this.ref.dismiss(true);
  }

  reshelve(): void {
    const dlg = this.dialog.open(BookSelectShelfDialog, {
      data: { book: this.data.book },
      width: '500px',
    });
    dlg.afterClosed().subscribe(result => {
      if (result && result.shelfId) {
        const toShelf = result.shelfId as string;
        this.bookHttp.addBookToShelf(this.data.book.id, toShelf).subscribe({
          next: () => {
            // Remove from current shelf to complete move
            this.store.dispatch(
              LibraryActions.removeBookFromShelf({ bookId: this.data.book.id, shelfId: this.data.shelfId })
            );
            this.notify.success('Moved book to new shelf');
            this.ref.dismiss(true);
          },
          error: () => this.notify.error('Failed to move book'),
        });
      }
    });
  }

  nominate(): void {
    const dlg = this.dialog.open(BookNominateDialog, { data: { book: this.data.book }, width: '500px' });
    dlg.afterClosed().subscribe();
  }
}
