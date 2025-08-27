import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit,
} from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { ElectionHttpService } from '../../service/http/election-http.service';
import { ShelfHttpService } from '../../service/http/shelves-http.service';
import { BookHttpService } from '../../service/http/books-http.service';
import { ElectionResponse } from '../../model/response/election-response.model';
import { ShelfResponse } from '../../model/response/shelf-response.model';
import { BookResponse } from '../../model/response/book-response.model';
import { CandidateResponse } from '../../model/response/candidate-response.model';
import { BookCoverComponent } from '../../common/book-cover.component';
import { NotificationService } from '../../service/notification.service';

export interface NominateToElectionDialogData {
  electionId?: string; // If provided, election is fixed and selector is hidden
  book?: BookResponse; // If provided, skip tree and show book details only
}

@Component({
  selector: 'app-nominate-to-election-dialog',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatProgressBarModule,
    BookCoverComponent,
  ],
  templateUrl: './nominate-to-election-dialog.component.html',
  styleUrls: ['./nominate-to-election-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NominateToElectionDialogComponent implements OnInit {
  // Election selection
  elections$!: Observable<ElectionResponse[]>;
  selectedElectionId$ = new BehaviorSubject<string | null>(null);
  candidatesForElection$!: Observable<CandidateResponse[]>;
  existingCandidate$!: Observable<CandidateResponse | null>;

  // Book selection
  selectedBook$ = new BehaviorSubject<BookResponse | null>(null);

  // Dropdown data
  shelves$ = new BehaviorSubject<ShelfResponse[]>([]);
  selectedShelfId$ = new BehaviorSubject<string | null>(null);
  booksForSelectedShelf$ = new BehaviorSubject<BookResponse[]>([]);
  loadingShelves$ = new BehaviorSubject<boolean>(true);
  loadingBooks$ = new BehaviorSubject<boolean>(false);

  // Action states
  nominating = false;
  removing = false;

  constructor(
    private dialogRef: MatDialogRef<NominateToElectionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: NominateToElectionDialogData,
    private electionsHttp: ElectionHttpService,
    private shelvesHttp: ShelfHttpService,
    private booksHttp: BookHttpService,
    private notify: NotificationService
  ) {}

  ngOnInit(): void {
    // Elections stream (hidden if electionId provided)
    this.elections$ = this.electionsHttp.getAllElections().pipe(
      map(list => {
        const now = new Date();
        return list
          .filter(e => !e.endDateTime || new Date(e.endDateTime) > now)
          .sort(
            (a, b) =>
              new Date(b.createDate).getTime() -
              new Date(a.createDate).getTime()
          );
      }),
      tap(list => {
        if (
          !this.data.electionId &&
          list.length > 0 &&
          !this.selectedElectionId$.value
        ) {
          this.selectedElectionId$.next(list[0].id);
        }
      })
    );

    // Selection state
    if (this.data.electionId) {
      this.selectedElectionId$.next(this.data.electionId);
    }
    if (this.data.book) {
      this.selectedBook$.next(this.data.book);
    }

    // Load candidates for selected election so we can detect existing nominations
    this.candidatesForElection$ = this.selectedElectionId$.pipe(
      switchMap(id =>
        id ? this.electionsHttp.getCandidatesByElection(id) : of([])
      )
    );

    // Compute if the currently selected book is already nominated in the selected election
    this.existingCandidate$ = combineLatest([
      this.selectedBook$,
      this.candidatesForElection$,
    ]).pipe(
      map(([book, candidates]) => {
        if (!book) return null;
        return candidates.find(c => c.base.id === book.id) ?? null;
      })
    );

    // Load shelves (only if book not provided)
    if (!this.data.book) {
      this.shelvesHttp.getUserShelves().subscribe({
        next: (shelves: ShelfResponse[]) => {
          const filtered = shelves.filter(s => s.title !== 'My Nominations');
          this.shelves$.next(filtered);
          this.loadingShelves$.next(false);
        },
        error: () => {
          this.loadingShelves$.next(false);
          this.notify.error('Failed to load shelves');
        },
      });
    } else {
      this.loadingShelves$.next(false);
    }
  }

  onShelfSelected(shelfId: string): void {
    this.selectedShelfId$.next(shelfId);
    this.booksForSelectedShelf$.next([]);
    this.loadingBooks$.next(true);
    this.booksHttp.getBooksByShelfId(shelfId).subscribe({
      next: (books) => {
        this.booksForSelectedShelf$.next(books);
        this.loadingBooks$.next(false);
      },
      error: () => {
        this.loadingBooks$.next(false);
        this.notify.error('Failed to load books for shelf');
      },
    });
  }

  nominate(): void {
    const electionId = this.selectedElectionId$.value;
    const book = this.selectedBook$.value;
    if (!electionId || !book) {
      return;
    }
    this.nominating = true;
    this.electionsHttp.nominateCandidate(electionId, book.id).subscribe({
      next: () => {
        this.nominating = false;
        this.notify.success('Nominated successfully');
        this.dialogRef.close(true);
      },
      error: err => {
        this.nominating = false;
        const msg = err?.error?.message || 'Failed to nominate';
        this.notify.error(msg);
      },
    });
  }

  removeNomination(candidateId: string): void {
    const electionId = this.selectedElectionId$.value;
    if (!electionId) return;
    this.removing = true;
    this.electionsHttp.deleteCandidate(electionId, candidateId).subscribe({
      next: () => {
        this.removing = false;
        this.notify.success('Removed nomination');
        this.dialogRef.close(true);
      },
      error: () => {
        this.removing = false;
        this.notify.error('Failed to remove nomination');
      },
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
