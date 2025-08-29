import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import {
  MAT_BOTTOM_SHEET_DATA,
  MatBottomSheetRef,
} from '@angular/material/bottom-sheet';
import { BookResponse } from '../../model/response/book-response.model';
import { BookHttpService } from '../../service/http/books-http.service';
import { Store } from '@ngrx/store';
import * as LibraryActions from '../store/library.actions';
import { MatDialog } from '@angular/material/dialog';
import { BookSelectShelfDialog } from '../dialog/book-select-shelf-dialog.component';
import { NotificationService } from '../../service/notification.service';
import { NominateToElectionDialogComponent } from '../../elections/dialog/nominate-to-election-dialog.component';
import { ConfirmDialogComponent } from '../../common/confirm-dialog.component';
import { ElectionHttpService } from '../../service/http/election-http.service';
import { UserService } from '../../service/user.service';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { BookCoverComponent } from '../../common/book-cover.component';
import { BookDetailDialog } from '../dialog/book-detail-dialog.component';
import { MatExpansionModule } from '@angular/material/expansion';

export interface BookDetailSheetData {
  book: BookResponse;
  shelfId: string;
  isNominationsShelf?: boolean;
}

@Component({
  selector: 'app-book-detail-sheet',
  standalone: true,
  imports: [
    MatButtonModule,
    MatExpansionModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    BookCoverComponent,
  ],
  templateUrl: './book-detail.sheet.html',
  styles: [
    `
      :host {
        display: block;
        padding: 12px;
      }
      .sheet-header {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .cover {
        width: 80px;
        height: 112px;
      }
      .meta .title {
        font-weight: 600;
        margin-bottom: 6px;
      }

      .sheet-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        padding-top: 12px;
        flex-wrap: wrap;
      }
      .spacer {
        flex: 1;
      }

      .blurb {
        margin-top: 12px;
      }
      .blurb .blurb-title {
        font-weight: 600;
        margin-bottom: 6px;
      }
      .blurb .blurb-text {
        line-height: 1.35;
        white-space: pre-wrap;
      }
      .blurb .blurb-text.collapsed {
        max-height: 6.5em; /* ~5 lines */
        overflow: hidden;
      }
      .blurb.empty .blurb-text {
        font-style: italic;
        opacity: 0.8;
      }

      @media (max-width: 600px) {
        .sheet-actions {
          flex-direction: column;
          align-items: stretch;
        }
        .sheet-actions button {
          width: 100%;
          justify-content: center;
        }
        .spacer {
          display: none;
        }
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
    private notify: NotificationService,
    private electionHttp: ElectionHttpService,
    private user: UserService
  ) {}

  editDetails(): void {
    const dlg = this.dialog.open(BookDetailDialog, {
      width: '640px',
      data: { book: this.data.book },
    });
    dlg.afterClosed().subscribe((updatedBook?: BookResponse) => {
      if (!updatedBook) return;
      this.data.book = { ...this.data.book, ...updatedBook };
    });
  }

  removeFromShelf(): void {
    const proceed = () => {
      this.store.dispatch(
        LibraryActions.removeBookFromShelf({
          bookId: this.data.book.id,
          shelfId: this.data.shelfId,
        })
      );
      this.notify.success('Removed from shelf');
      this.ref.dismiss(true);
    };

    if (this.data.isNominationsShelf) {
      const dlg = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Remove nomination',
          message:
            'Removing this book from your nominations will remove it from the election where it is nominated, which may change the election results. Continue?',
          confirmText: 'Remove',
          cancelText: 'Keep',
        },
        width: '520px',
      });
      dlg.afterClosed().subscribe(confirm => {
        if (!confirm) return;
        const myId = this.user.current.id;
        this.electionHttp
          .getAllElections()
          .pipe(
            switchMap(elections => {
              const tasks = elections.map(e =>
                this.electionHttp.getCandidatesByElection(e.id).pipe(
                  switchMap(cands => {
                    const mine = cands.filter(
                      c =>
                        c.base.id === this.data.book.id &&
                        c.nominatorId === myId
                    );
                    if (!mine.length) return of(null);
                    return forkJoin(
                      mine.map(c =>
                        this.electionHttp.deleteCandidate(e.id, c.id)
                      )
                    );
                  })
                )
              );
              return tasks.length ? forkJoin(tasks) : of(null);
            })
          )
          .subscribe({ next: () => proceed(), error: () => proceed() });
      });
    } else {
      proceed();
    }
  }

  delete(): void {
    this.store.dispatch(
      LibraryActions.deleteBook({ bookId: this.data.book.id })
    );
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
          next: (): void => {
            this.store.dispatch(
              LibraryActions.removeBookFromShelf({
                bookId: this.data.book.id,
                shelfId: this.data.shelfId,
              })
            );
            this.notify.success('Moved book to new shelf');
            this.ref.dismiss(true);
          },
          error: (): void => this.notify.error('Failed to move book'),
        });
      }
    });
  }

  nominate(): void {
    const dlg = this.dialog.open(NominateToElectionDialogComponent, {
      data: { book: this.data.book },
      width: '640px',
    });
    dlg.afterClosed().subscribe();
  }
}
