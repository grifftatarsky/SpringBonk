import { AsyncPipe, CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import {
  DynamicDialogConfig,
  DynamicDialogRef,
  DynamicDialogModule,
} from 'primeng/dynamicdialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest, of, switchMap } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { BookResponse } from '../../model/response/book-response.model';
import { ElectionResponse } from '../../model/response/election-response.model';
import { ShelfResponse } from '../../model/response/shelf-response.model';
import { NotificationService } from '../../service/notification.service';
import { ElectionHttpService } from '../../service/http/election-http.service';
import { ShelfHttpService } from '../../service/http/shelves-http.service';
import { BookHttpService } from '../../service/http/books-http.service';
import { BookCoverComponent } from '../../common/book-cover.component';
import { TagModule } from 'primeng/tag';
import { DialogService } from 'primeng/dynamicdialog';
import { BookBlurbDialogComponent } from './book-blurb-dialog.component';

interface NominateDialogData {
  electionId?: string;
  book?: BookResponse;
}

@Component({
  selector: 'app-nominate-to-election-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AsyncPipe,
    ButtonModule,
    DropdownModule,
    ProgressSpinnerModule,
    DynamicDialogModule,
    TagModule,
    BookCoverComponent,
  ],
  templateUrl: './nominate-to-election-dialog.component.html',
  styleUrls: ['./nominate-to-election-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NominateToElectionDialogComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly electionHttp = inject(ElectionHttpService);
  private readonly shelfHttp = inject(ShelfHttpService);
  private readonly bookHttp = inject(BookHttpService);
  private readonly notification = inject(NotificationService);
  private readonly dialog = inject(DialogService);

  private readonly ref = inject<DynamicDialogRef<boolean | undefined>>(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig<NominateDialogData>);

  private readonly shelvesSubject = new BehaviorSubject<ShelfResponse[]>([]);
  private readonly booksSubject = new BehaviorSubject<BookResponse[]>([]);
  private readonly selectedBookSubject = new BehaviorSubject<BookResponse | null>(
    this.config.data?.book ?? null
  );

  readonly shelves$ = this.shelvesSubject.asObservable();
  readonly books$ = this.booksSubject.asObservable();
  readonly selectedBook$ = this.selectedBookSubject.asObservable();
  readonly loadingShelves$ = new BehaviorSubject<boolean>(true);
  readonly loadingBooks$ = new BehaviorSubject<boolean>(false);

  readonly electionControl = new FormControl<string | null>(
    this.config.data?.electionId ?? null,
    { validators: [Validators.required] }
  );

  readonly shelfControl = new FormControl<string | null>(null);
  readonly bookControl = new FormControl<string | null>(this.config.data?.book?.id ?? null);

  elections$ = this.electionHttp.getAllElections().pipe(
    map(list => {
      const now = new Date();
      return list
        .filter(election => !election.endDateTime || new Date(election.endDateTime) > now)
        .sort(
          (a, b) =>
            new Date(b.createDate).getTime() - new Date(a.createDate).getTime()
        );
    })
  );

  readonly existingCandidate$ = combineLatest([
    this.selectedBook$,
    this.electionControl.valueChanges.pipe(startWith(this.electionControl.value)),
  ]).pipe(
    switchMap(([book, electionId]) => {
      if (!book || !electionId) return of(null);
      return this.electionHttp.getCandidatesByElection(electionId).pipe(
        map(candidates => candidates.find(candidate => candidate.base.id === book.id) ?? null)
      );
    })
  );

  nominating = false;

  constructor() {
    if (this.config.data?.book) {
      this.selectedBookSubject.next(this.config.data.book);
    }
  }

  ngOnInit(): void {
    this.configureInitialElection();
    this.configureShelves();
    this.configureBookSelection();
  }

  get selectedBook(): BookResponse | null {
    return this.selectedBookSubject.value;
  }

  cancel(): void {
    this.ref.close();
  }

  nominate(): void {
    const electionId = this.electionControl.value;
    const book = this.selectedBookSubject.value;
    if (!electionId || !book || this.nominating) return;

    this.nominating = true;
    this.electionHttp
      .nominateCandidate(electionId, book.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.nominating = false;
          this.notification.success(`"${book.title}" nominated.`);
          this.ref.close(true);
        },
        error: err => {
          this.nominating = false;
          const msg = err?.error?.message || 'Unable to nominate the book.';
          this.notification.error(msg);
        },
      });
  }

  removeNomination(candidateId: string): void {
    const electionId = this.electionControl.value;
    if (!electionId) return;
    this.electionHttp
      .deleteCandidate(electionId, candidateId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notification.success('Nomination removed.');
          this.ref.close(true);
        },
        error: () => this.notification.error('Failed to remove nomination.'),
      });
  }

  viewBlurb(book: BookResponse): void {
    if (!book?.blurb) return;
    this.dialog.open(BookBlurbDialogComponent, {
      header: book.title,
      width: 'min(560px, 90vw)',
      data: { title: book.title, blurb: book.blurb },
    });
  }

  private configureInitialElection(): void {
    if (!this.config.data?.electionId) {
      this.elections$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(list => {
          if (list.length > 0 && !this.electionControl.value) {
            this.electionControl.setValue(list[0].id);
          }
        });
    }
  }

  private configureShelves(): void {
    if (this.config.data?.book) {
      this.loadingShelves$.next(false);
      return;
    }

    this.shelfHttp
      .getUserShelves()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: shelves => {
          this.loadingShelves$.next(false);
          const filtered = shelves.filter(shelf => shelf.title !== 'My Nominations');
          this.shelvesSubject.next(filtered);
          if (filtered.length > 0) {
            const initialId = filtered[0].id;
            this.shelfControl.setValue(initialId);
            this.loadBooksForShelf(initialId);
          }
        },
        error: () => {
          this.loadingShelves$.next(false);
          this.notification.error('Failed to load shelves.');
        },
      });

    this.shelfControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(id => {
        if (id) {
          this.loadBooksForShelf(id);
        } else {
          this.booksSubject.next([]);
          this.bookControl.setValue(null);
          this.selectedBookSubject.next(null);
        }
      });
  }

  private configureBookSelection(): void {
    this.bookControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(id => {
        const currentList = this.booksSubject.value;
        const found = currentList.find(book => book.id === id);
        this.selectedBookSubject.next(found ?? this.config.data?.book ?? null);
      });

    if (this.config.data?.book) {
      this.bookControl.setValue(this.config.data.book.id, { emitEvent: false });
    }
  }

  private loadBooksForShelf(shelfId: string): void {
    this.loadingBooks$.next(true);
    this.booksHttp
      .getBooksByShelfId(shelfId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: books => {
          this.loadingBooks$.next(false);
          this.booksSubject.next(books);
          if (!this.config.data?.book) {
            const first = books[0];
            this.bookControl.setValue(first?.id ?? null);
            this.selectedBookSubject.next(first ?? null);
          }
        },
        error: () => {
          this.loadingBooks$.next(false);
          this.notification.error('Failed to load books.');
        },
      });
  }
}
