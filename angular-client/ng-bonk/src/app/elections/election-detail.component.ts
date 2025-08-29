import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { AsyncPipe, CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, ParamMap, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import {
  MatBottomSheet,
  MatBottomSheetModule,
} from '@angular/material/bottom-sheet';
import { NominateToElectionDialogComponent } from './dialog/nominate-to-election-dialog.component';
import { UserService } from '../service/user.service';
import { ElectionHttpService } from '../service/http/election-http.service';
import { BookHttpService } from '../service/http/books-http.service';
import { ShelfHttpService } from '../service/http/shelves-http.service';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { BookCoverComponent } from '../common/book-cover.component';
import * as ElectionsActions from './store/elections.actions';
import {
  selectBallotOrder,
  selectCandidates,
  selectCurrentElection,
  selectLoadingCandidates,
  selectLoadingElection,
  selectRankedCandidates,
  selectRunning,
  selectRunResult,
  selectSubmitting,
  selectUnrankedCandidates,
} from './store/elections.selectors';
import {
  combineLatest,
  distinctUntilChanged,
  filter as rxFilter,
  map,
  Observable,
  startWith,
  Subject,
  switchMap,
  take,
  takeUntil,
} from 'rxjs';
import { ElectionResult } from '../model/election-result.model';
import { CandidateResponse } from '../model/response/candidate-response.model';
import { ElectionResponse } from '../model/response/election-response.model';
import { ShelfResponse } from '../model/response/shelf-response.model';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Actions, ofType } from '@ngrx/effects';
import { BookBlurbDialogComponent } from './dialog/book-blurb-dialog.component';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-election-detail',
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    BookCoverComponent,
    DatePipe,
    AsyncPipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatMenuModule,
    MatCardModule,
    MatProgressBarModule,
    MatBottomSheetModule,
    MatToolbarModule,
    MatTooltipModule,
  ],
  templateUrl: './election-detail.component.html',
  styleUrls: ['./election-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElectionDetailComponent implements OnInit, OnDestroy {
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  // TODO __ Remove use of any.
  private readonly store: Store<any> = inject(Store);
  private readonly dialog: MatDialog = inject(MatDialog);
  private readonly bottomSheet: MatBottomSheet = inject(MatBottomSheet);
  private readonly userService: UserService = inject(UserService);
  private readonly electionHttpService: ElectionHttpService =
    inject(ElectionHttpService);
  private readonly bookHttpService: BookHttpService = inject(BookHttpService);
  private readonly shelfHttpService: ShelfHttpService =
    inject(ShelfHttpService);

  election$!: Observable<ElectionResponse | null>;
  loadingElection$!: Observable<boolean>;
  loadingCandidates$!: Observable<boolean>;
  submitting$!: Observable<boolean>;
  running$!: Observable<boolean>;
  runResult$!: Observable<ElectionResult | null>;

  ranked$!: Observable<CandidateResponse[]>;
  unranked$!: Observable<CandidateResponse[]>;
  order$!: Observable<string[]>;
  myNominationId$!: Observable<string | null>;
  isHandset$!: Observable<boolean>;
  private pending = false;

  electionId!: string;
  private readonly destroy$: Subject<void> = new Subject<void>();
  private readonly bp: BreakpointObserver = inject(BreakpointObserver);
  // TODO __ Remove use of any.
  private readonly actions$: Actions<any> = inject(Actions);

  ngOnInit(): void {
    const id$: Observable<string> = this.route.paramMap.pipe(
      map((params: ParamMap): string => params.get('id') || ''),
      takeUntil(this.destroy$)
    );

    // React to id changes: dispatch loads and update local id
    id$.pipe(takeUntil(this.destroy$)).subscribe(id => {
      this.electionId = id;
      if (id) {
        this.store.dispatch(ElectionsActions.loadElection({ electionId: id }));
        this.store.dispatch(
          ElectionsActions.loadCandidates({ electionId: id })
        );
        this.store.dispatch(ElectionsActions.loadMyBallot({ electionId: id }));
      }
    });

    this.election$ = this.store.select(selectCurrentElection);
    this.loadingElection$ = this.store.select(selectLoadingElection);
    this.loadingCandidates$ = this.store.select(selectLoadingCandidates);
    this.submitting$ = this.store.select(selectSubmitting);

    const rankedFactory$ = this.store.select(selectRankedCandidates);
    const unrankedFactory$ = this.store.select(selectUnrankedCandidates);
    const orderFactory$ = this.store.select(selectBallotOrder);

    this.ranked$ = id$.pipe(
      switchMap(
        (id: string): Observable<CandidateResponse[]> =>
          rankedFactory$.pipe(map(f => f(id)))
      )
    );
    this.unranked$ = id$.pipe(
      switchMap(
        (id: string): Observable<CandidateResponse[]> =>
          unrankedFactory$.pipe(map(f => f(id)))
      )
    );
    this.order$ = id$.pipe(
      switchMap(
        (id: string): Observable<string[]> =>
          orderFactory$.pipe(map(f => f(id)))
      )
    );

    this.running$ = this.store.select(selectRunning);
    this.runResult$ = this.store.select(selectRunResult);

    // Responsive toolbar behavior
    this.isHandset$ = this.bp
      .observe([Breakpoints.XSmall, Breakpoints.Small])
      .pipe(
        map(state => state.matches),
        startWith(false)
      );

    // Terminal output moved to bottom sheet.

    // Determine if the current user has a nomination in this election
    this.myNominationId$ = combineLatest([
      this.store.select(selectCandidates),
      this.userService.valueChanges,
    ]).pipe(
      map(
        ([candidates, u]: [CandidateResponse[], { id: string }]):
          | string
          | null => {
          const myId: string = u?.id ?? '';
          const mine: CandidateResponse | undefined = candidates.find(
            (c: CandidateResponse): boolean => c.nominatorId === myId
          );
          return mine?.id ?? null;
        }
      ),
      distinctUntilChanged()
    );

    // When save or reset succeed for this election, clear pending flag
    this.actions$
      .pipe(
        ofType(
          ElectionsActions.submitBallotSuccess,
          ElectionsActions.resetBallotSuccess
        ),
        rxFilter(a => a.electionId === this.electionId),
        takeUntil(this.destroy$)
      )
      .subscribe((): boolean => (this.pending = false));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Drag within ranked list
  dropRanked(event: CdkDragDrop<unknown>, ranked: CandidateResponse[]): void {
    const newOrder: string[] = [
      ...ranked.map((c: CandidateResponse): string => c.id),
    ];
    moveItemInArray(newOrder, event.previousIndex, event.currentIndex);
    this.store.dispatch(
      ElectionsActions.setBallotOrder({
        electionId: this.electionId,
        orderedCandidateIds: newOrder,
      })
    );
    this.pending = true;
  }

  // Move from unranked to ranked (append at end)
  addToRanked(candidateId: string, ranked: CandidateResponse[]): void {
    const newOrder = [...ranked.map(c => c.id), candidateId];
    this.store.dispatch(
      ElectionsActions.setBallotOrder({
        electionId: this.electionId,
        orderedCandidateIds: newOrder,
      })
    );
    this.pending = true;
  }

  // Remove from ranked
  removeFromRanked(candidateId: string, ranked: CandidateResponse[]): void {
    const newOrder = ranked.map(c => c.id).filter(id => id !== candidateId);
    this.store.dispatch(
      ElectionsActions.setBallotOrder({
        electionId: this.electionId,
        orderedCandidateIds: newOrder,
      })
    );
    this.pending = true;
  }

  trackByCandidate(_index: number, c: CandidateResponse): string {
    return c.id;
  }

  // TODO __ why is this unused...
  clearBallot(): void {
    this.store.dispatch(
      ElectionsActions.clearBallot({ electionId: this.electionId })
    );
  }

  resetBallot(): void {
    this.store.dispatch(
      ElectionsActions.resetBallot({ electionId: this.electionId })
    );
  }

  submitBallot(): void {
    this.store.dispatch(
      ElectionsActions.submitBallot({ electionId: this.electionId })
    );
  }

  hasPendingChanges(): boolean {
    return this.pending;
  }

  getElectionId(): string {
    return this.electionId;
  }

  openNominateDialog(): void {
    this.dialog
      .open(NominateToElectionDialogComponent, {
        width: '720px',
        data: { electionId: this.electionId },
      })
      .afterClosed()
      .subscribe(changed => {
        if (changed) {
          // Refresh candidates
          this.store.dispatch(
            ElectionsActions.loadCandidates({ electionId: this.electionId })
          );
        }
      });
  }

  removeMyNomination(candidateId: string): void {
    // Find bookId for candidate so we can also remove it from "My Nominations" shelf
    this.store
      .select(selectCandidates)
      .pipe(take(1))
      .subscribe((cands: CandidateResponse[]) => {
        const cand = cands.find((c: CandidateResponse) => c.id === candidateId);
        const bookId = cand?.base?.id;
        this.electionHttpService
          .deleteCandidate(this.electionId, candidateId)
          .subscribe(() => {
            this.store.dispatch(
              ElectionsActions.loadCandidates({ electionId: this.electionId })
            );
            if (bookId) {
              this.shelfHttpService
                .getUserShelves()
                .pipe(take(1))
                .subscribe((shelves: ShelfResponse[]) => {
                  const nominationsShelf = shelves.find(
                    (s: ShelfResponse) => s.title === 'My Nominations'
                  );
                  if (nominationsShelf) {
                    this.bookHttpService
                      .removeBookFromShelf(bookId, nominationsShelf.id)
                      .pipe(take(1))
                      .subscribe({ next: () => {}, error: () => {} });
                  }
                });
            }
          });
      });
  }

  runElection(): void {
    // Open fun results sheet instead of inline
    import('./sheet/election-run.sheet').then(m => {
      this.bottomSheet.open(m.ElectionRunSheetComponent, {
        data: { electionId: this.electionId },
        disableClose: false,
      });
    });
  }

  moveUp(index: number, ranked: CandidateResponse[]): void {
    if (index <= 0) return;
    const order = [...ranked.map(c => c.id)];
    const tmp = order[index - 1];
    order[index - 1] = order[index];
    order[index] = tmp;
    this.store.dispatch(
      ElectionsActions.setBallotOrder({
        electionId: this.electionId,
        orderedCandidateIds: order,
      })
    );
    this.pending = true;
  }

  moveDown(index: number, ranked: CandidateResponse[]): void {
    if (index >= ranked.length - 1) return;
    const order = [...ranked.map(c => c.id)];
    const tmp = order[index + 1];
    order[index + 1] = order[index];
    order[index] = tmp;
    this.store.dispatch(
      ElectionsActions.setBallotOrder({
        electionId: this.electionId,
        orderedCandidateIds: order,
      })
    );
    this.pending = true;
  }

  openBlurb(c: CandidateResponse): void {
    this.dialog.open(BookBlurbDialogComponent, {
      width: '640px',
      data: { title: c.base.title, blurb: c.base.blurb },
    });
  }
}
