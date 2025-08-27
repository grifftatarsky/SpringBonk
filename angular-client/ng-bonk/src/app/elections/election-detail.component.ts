import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, } from '@angular/core';
import { AsyncPipe, CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatBottomSheet, MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { NominateToElectionDialogComponent } from './dialog/nominate-to-election-dialog.component';
import { UserService } from '../service/user.service';
import { ElectionHttpService } from '../service/http/election-http.service';
import { BookHttpService } from '../service/http/books-http.service';
import { ShelfHttpService } from '../service/http/shelves-http.service';
import { CdkDragDrop, DragDropModule, moveItemInArray, } from '@angular/cdk/drag-drop';
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
import { combineLatest, distinctUntilChanged, map, Observable, startWith, Subject, switchMap, take, takeUntil, filter as rxFilter } from 'rxjs';
import { ElectionResult } from '../model/election-result.model';
import { EliminationMessage } from '../model/type/elimination-message.enum';
import { CandidateResponse } from '../model/response/candidate-response.model';
import { ElectionResponse } from '../model/response/election-response.model';
import { ShelfResponse } from '../model/response/shelf-response.model';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Actions, ofType } from '@ngrx/effects';

@Component({
  selector: 'app-election-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatMenuModule,
    MatCardModule,
    MatProgressBarModule,
    MatBottomSheetModule,
    DragDropModule,
    BookCoverComponent,
    DatePipe,
    AsyncPipe,
  ],
  templateUrl: './election-detail.component.html',
  styleUrls: ['./election-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElectionDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);
  private readonly dialog = inject(MatDialog);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly user = inject(UserService);
  private readonly electionHttp = inject(ElectionHttpService);
  private readonly bookHttp = inject(BookHttpService);
  private readonly shelfHttp = inject(ShelfHttpService);

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
  private readonly destroy$ = new Subject<void>();
  private readonly bp = inject(BreakpointObserver);
  private readonly actions$ = inject(Actions);

  ngOnInit(): void {
    const id$ = this.route.paramMap.pipe(
      map(params => params.get('id') || ''),
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
      switchMap(id => rankedFactory$.pipe(map(f => f(id))))
    );
    this.unranked$ = id$.pipe(
      switchMap(id => unrankedFactory$.pipe(map(f => f(id))))
    );
    this.order$ = id$.pipe(
      switchMap(id => orderFactory$.pipe(map(f => f(id))))
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
      this.user.valueChanges,
    ]).pipe(
      map(([cands, u]: [CandidateResponse[], { id: string }]) => {
        const myId: string = u?.id ?? '';
        const mine = cands.find(c => c.nominatorId === myId);
        return mine?.id ?? null;
      }),
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
      .subscribe(() => (this.pending = false));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Drag within ranked list
  dropRanked(event: CdkDragDrop<unknown>, ranked: CandidateResponse[]): void {
    const newOrder = [...ranked.map(c => c.id)];
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
        this.electionHttp
          .deleteCandidate(this.electionId, candidateId)
          .subscribe(() => {
            this.store.dispatch(
              ElectionsActions.loadCandidates({ electionId: this.electionId })
            );
            if (bookId) {
              this.shelfHttp
                .getUserShelves()
                .pipe(take(1))
                .subscribe((shelves: ShelfResponse[]) => {
                  const nominationsShelf = shelves.find(
                    (s: ShelfResponse) => s.title === 'My Nominations'
                  );
                  if (nominationsShelf) {
                    this.bookHttp
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
}
