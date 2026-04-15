import { DatePipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, HostListener, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ElectionDetailStore, CandidateListItem } from './election-detail.store';
import { BookSearchStore } from '../shelves/book-search.store';
import { OpenLibraryBookResponse } from '../../model/response/open-library-book-response.model';

@Component({
  selector: 'app-election-detail-page',
  standalone: true,
  imports: [NgIf, RouterLink, ReactiveFormsModule, DatePipe, DragDropModule],
  providers: [ElectionDetailStore, BookSearchStore],
  templateUrl: './election-detail-page.html',
  styleUrl: './election-detail-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElectionDetailPage {
  private readonly route = inject(ActivatedRoute);
  protected readonly store = inject(ElectionDetailStore);
  protected readonly searchStore = inject(BookSearchStore);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);

  protected readonly electionVm = this.store.electionVm;
  protected readonly candidatesVm = this.store.candidatesVm;
  protected readonly searchVm = this.searchStore.vm;
  protected readonly shelfVm = this.store.shelfOptionsVm;
  protected readonly resultsVm = this.store.resultsVm;
  protected readonly myNominationsVm = this.store.myNominationsVm;

  protected readonly searchOpen = signal(false);
  protected readonly customOpen = signal(false);
  protected readonly searchInput = this.fb.control('');
  protected readonly searchPitchInput = this.fb.control('');
  // Two-step search: null = searching, non-null = book selected, awaiting pitch/confirm
  protected readonly selectedSearchResult = signal<OpenLibraryBookResponse | null>(null);
  protected readonly customForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(160)]],
    author: ['', [Validators.required, Validators.maxLength(120)]],
    imageURL: [''],
    blurb: [''],
    pitch: [''],
  });
  protected readonly customBusy = signal(false);
  protected readonly customError = signal<string | null>(null);
  protected readonly expandedCandidates = signal<Set<string>>(new Set());
  protected readonly commandMenuOpen = signal(false);
  protected readonly nominateMenuOpen = signal(false);
  protected readonly shelfModalOpen = signal(false);
  protected readonly deleteConfirmOpen = signal(false);
  protected readonly reopenModalOpen = signal(false);
  protected readonly shelfSearch = signal('');
  protected readonly reopenForm = this.fb.group({
    endDateTime: [''],
  });

  /**
   * My nominations section state.
   * - `myNominationsOpen`: whether the collapsible section is expanded
   * - `pitchDrafts`: per-candidate draft text while editing
   * - `pitchEditingId`: which candidate's pitch is currently being edited (null = none)
   */
  protected readonly myNominationsOpen = signal(true);
  protected readonly pitchDrafts = signal<Record<string, string>>({});
  protected readonly pitchEditingId = signal<string | null>(null);
  protected readonly removeNominationConfirmId = signal<string | null>(null);

  /**
   * Voting wizard stage.
   *
   * The page is structured as three sequential-but-non-gated steps:
   *   nominate → rank → review
   *
   * `voteStageOverride` is set when the user explicitly clicks a pill or
   * a Next/Back button. When null, `voteStage` auto-derives from state:
   * if no candidates exist, land on nominate; if nothing is ranked yet,
   * land on rank; otherwise review.
   */
  private readonly voteStageOverride = signal<'nominate' | 'rank' | 'review' | null>(null);

  protected readonly voteStage = computed<'nominate' | 'rank' | 'review'>(() => {
    const override = this.voteStageOverride();
    if (override) return override;
    const state = this.candidatesVm();
    if (state.items.length === 0) return 'nominate';
    if (state.rankedItems.length === 0) return 'rank';
    return 'review';
  });

  /**
   * Per-step progress metadata for the progress strip.
   * `active` = current step. `complete` = step has something showing
   * real progress (not blocking — users can navigate freely).
   */
  protected readonly stepProgress = computed(() => {
    const state = this.candidatesVm();
    const mine = this.myNominationsVm();
    const stage = this.voteStage();
    const rankedCount = state.rankedItems.length;
    const totalCandidates = state.items.length;
    return {
      nominate: {
        active: stage === 'nominate',
        complete: totalCandidates > 0,
        countLabel: totalCandidates === 0
          ? null
          : (mine.count > 0 ? `${totalCandidates} (${mine.count} yours)` : `${totalCandidates}`),
      },
      rank: {
        active: stage === 'rank',
        complete: rankedCount > 0,
        countLabel: totalCandidates === 0
          ? null
          : `${rankedCount}/${totalCandidates}`,
      },
      review: {
        active: stage === 'review',
        complete: rankedCount > 0,
        countLabel: rankedCount > 0 ? 'saved' : null,
      },
    };
  });

  constructor() {
    this.route.paramMap
      .pipe(map((params) => params.get('id') ?? ''), takeUntilDestroyed())
      .subscribe((id) => this.store.init(id));

    // The store debounces internally; component just forwards keystrokes.
    this.searchInput.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => {
        this.searchStore.setQuery(value || '');
      });
  }

  protected openSearch(): void {
    this.searchOpen.set(true);
    this.customOpen.set(false);
    this.searchInput.setValue('');
    this.searchPitchInput.setValue('');
    this.selectedSearchResult.set(null);
    void this.searchStore.search('');
    this.closeMenus();
  }

  protected closeSearch(): void {
    this.searchOpen.set(false);
    this.selectedSearchResult.set(null);
    this.searchPitchInput.setValue('');
  }

  protected selectSearchBook(result: OpenLibraryBookResponse): void {
    this.selectedSearchResult.set(result);
    this.searchPitchInput.setValue('');
  }

  protected clearSelectedSearchBook(): void {
    this.selectedSearchResult.set(null);
    this.searchPitchInput.setValue('');
  }

  protected openCustom(): void {
    this.customOpen.set(true);
    this.searchOpen.set(false);
    this.customForm.reset({ title: '', author: '', imageURL: '', blurb: '', pitch: '' });
    this.customError.set(null);
    this.closeMenus();
  }

  protected closeCustom(): void {
    this.customOpen.set(false);
    this.customBusy.set(false);
    this.customError.set(null);
  }

  protected confirmSearchNomination(): void {
    const result = this.selectedSearchResult();
    if (!result) return;
    const pitch: string = this.searchPitchInput.value ?? '';
    void this.store.nominateFromOpenLibrary(result, pitch).then(() => {
      this.closeSearch();
    });
  }

  protected async addCustomBook(): Promise<void> {
    this.customForm.markAllAsTouched();
    if (this.customForm.invalid || this.customBusy()) return;
    this.customBusy.set(true);
    this.customError.set(null);
    const rawValue = this.customForm.getRawValue();
    const payload = {
      title: rawValue.title.trim(),
      author: rawValue.author.trim(),
      imageURL: rawValue.imageURL.trim(),
      blurb: rawValue.blurb.trim(),
      pitch: rawValue.pitch.trim(),
    };
    try {
      await this.store.nominateCustomBook(payload);
      this.closeCustom();
    } catch {
      this.customError.set('Unable to nominate custom book right now.');
    } finally {
      this.customBusy.set(false);
    }
  }

  protected removeCandidate(candidateId: string): void {
    void this.store.removeCandidate(candidateId);
    this.closeMenus();
  }

  protected refreshCandidates(): void {
    this.store.refreshCandidates();
    this.closeMenus();
  }

  protected refreshVotes(): void {
    this.store.refreshVotes();
  }

  protected loadMoreSearch(): void {
    void this.searchStore.loadMore();
  }

  protected selectShelf(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.store.selectShelfForExisting(value);
  }

  protected nominateExisting(bookId: string): void {
    void this.store.nominateExistingBook(bookId);
    this.closeShelfModal();
  }

  protected toggleCandidateDetails(candidateId: string): void {
    this.expandedCandidates.update((current) => {
      const next = new Set(current);
      if (next.has(candidateId)) {
        next.delete(candidateId);
      } else {
        next.add(candidateId);
      }
      return next;
    });
  }

  protected isCandidateExpanded(candidateId: string): boolean {
    return this.expandedCandidates().has(candidateId);
  }

  protected async handleBallotDrop(event: CdkDragDrop<CandidateListItem[]>): Promise<void> {
    const state = this.candidatesVm();
    if (state.reorderBusy || state.votesLoading) {
      return;
    }
    const sourceId = event.previousContainer.id;
    const targetId = event.container.id;
    const rankedOrder = state.rankedItems.map((item) => item.id);
    const dragged = (event.item.data as CandidateListItem).id;

    if (sourceId === 'ranked-list' && targetId === 'ranked-list') {
      moveItemInArray(rankedOrder, event.previousIndex, event.currentIndex);
      await this.store.reorderBallot(rankedOrder);
      return;
    }

    if (sourceId === 'pool-list' && targetId === 'ranked-list') {
      const updated = [...rankedOrder];
      updated.splice(event.currentIndex, 0, dragged);
      await this.store.reorderBallot(updated);
      return;
    }

    if (sourceId === 'ranked-list' && targetId === 'pool-list') {
      const updated = rankedOrder.filter((id) => id !== dragged);
      await this.store.reorderBallot(updated);
    }
  }

  protected async addCandidateToBallot(candidateId: string): Promise<void> {
    const state = this.candidatesVm();
    if (state.reorderBusy || state.votesLoading) {
      return;
    }
    const order = state.rankedItems.map((item) => item.id);
    if (order.includes(candidateId)) {
      return;
    }
    order.push(candidateId);
    await this.store.reorderBallot(order);
  }

  protected async removeFromBallot(candidateId: string): Promise<void> {
    const state = this.candidatesVm();
    if (state.reorderBusy || state.votesLoading) {
      return;
    }
    const order = state.rankedItems.map((item) => item.id).filter((id) => id !== candidateId);
    await this.store.reorderBallot(order);
  }

  protected async nudgeRank(candidateId: string, direction: 'up' | 'down'): Promise<void> {
    const state = this.candidatesVm();
    if (state.reorderBusy || state.votesLoading) {
      return;
    }
    const order = state.rankedItems.map((item) => item.id);
    const index = order.indexOf(candidateId);
    if (index === -1) {
      return;
    }
    const targetIndex = direction === 'up' ? Math.max(0, index - 1) : Math.min(order.length - 1, index + 1);
    if (index === targetIndex) {
      return;
    }
    const [item] = order.splice(index, 1);
    order.splice(targetIndex, 0, item);
    await this.store.reorderBallot(order);
  }

  protected customFieldError(controlName: 'title' | 'author'): string | null {
    const control = this.customForm.controls[controlName];
    if (!control.touched) {
      return null;
    }
    if (control.hasError('required')) {
      return controlName === 'title' ? 'Title is required.' : 'Author is required.';
    }
    if (control.hasError('maxlength')) {
      return controlName === 'title'
        ? 'Title must be 160 characters or fewer.'
        : 'Author must be 120 characters or fewer.';
    }
    return null;
  }

  protected toggleCommandMenu(): void {
    this.commandMenuOpen.update((open) => !open);
    if (this.commandMenuOpen()) {
      this.nominateMenuOpen.set(false);
    }
  }

  protected toggleNominateMenu(): void {
    this.nominateMenuOpen.update((open) => !open);
    if (this.nominateMenuOpen()) {
      this.commandMenuOpen.set(false);
    }
  }

  protected closeMenus(): void {
    this.commandMenuOpen.set(false);
    this.nominateMenuOpen.set(false);
  }

  protected openShelfModal(): void {
    this.shelfModalOpen.set(true);
    this.closeMenus();
  }

  protected closeShelfModal(): void {
    this.shelfModalOpen.set(false);
  }

  protected async clearBallot(): Promise<void> {
    await this.store.clearBallot();
    this.closeMenus();
  }

  protected async deleteElection(): Promise<void> {
    const deleted = await this.store.deleteElection();
    this.deleteConfirmOpen.set(false);
    if (deleted) {
      await this.router.navigate(['/elections']);
    }
  }

  protected openDeleteConfirm(): void {
    this.deleteConfirmOpen.set(true);
    this.closeMenus();
  }

  protected closeDeleteConfirm(): void {
    this.deleteConfirmOpen.set(false);
  }

  protected openReopenModal(): void {
    this.reopenForm.reset({ endDateTime: '' });
    this.reopenModalOpen.set(true);
    this.closeMenus();
  }

  protected closeReopenModal(): void {
    this.reopenModalOpen.set(false);
  }

  protected async submitReopen(): Promise<void> {
    if (this.reopenForm.invalid) {
      return;
    }
    const value = this.reopenForm.controls.endDateTime.value;
    const payload = {
      endDateTime: value ? new Date(value).toISOString() : null,
    };
    try {
      await this.store.reopenElection(payload);
      this.reopenModalOpen.set(false);
    } catch {
      // handled via notifications
    }
  }

  protected showResultsRefresh(): void {
    this.store.refreshResults();
  }

  protected toggleCandidateDetailsArrow(candidateId: string): void {
    this.toggleCandidateDetails(candidateId);
  }

  protected get anyOverlayActive(): boolean {
    return this.commandMenuOpen() || this.nominateMenuOpen();
  }

  protected showClosedState(electionStatus: string | undefined): boolean {
    return electionStatus === 'CLOSED';
  }

  protected openAction(action: 'open-library' | 'custom' | 'shelf'): void {
    switch (action) {
      case 'open-library':
        this.openSearch();
        break;
      case 'custom':
        this.openCustom();
        break;
      case 'shelf':
        this.openShelfModal();
        break;
    }
  }

  protected async closeElectionNow(): Promise<void> {
    try {
      await this.store.closeElection();
    } finally {
      this.closeMenus();
    }
  }

  // region Vote stage navigation

  protected setVoteStage(stage: 'nominate' | 'rank' | 'review'): void {
    this.voteStageOverride.set(stage);
    // Scroll to the top of the ballot block after a nav — honor reduced-motion.
    if (typeof window !== 'undefined') {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    }
  }

  protected advanceVoteStage(): void {
    const current = this.voteStage();
    if (current === 'nominate') this.setVoteStage('rank');
    else if (current === 'rank') this.setVoteStage('review');
  }

  protected retreatVoteStage(): void {
    const current = this.voteStage();
    if (current === 'review') this.setVoteStage('rank');
    else if (current === 'rank') this.setVoteStage('nominate');
  }

  // endregion

  // region My nominations

  protected toggleMyNominations(): void {
    this.myNominationsOpen.update((open) => !open);
  }

  protected startEditPitch(candidateId: string, currentBlurb: string): void {
    this.pitchDrafts.update((drafts) => ({ ...drafts, [candidateId]: currentBlurb ?? '' }));
    this.pitchEditingId.set(candidateId);
  }

  protected cancelEditPitch(candidateId: string): void {
    this.pitchDrafts.update((drafts) => {
      const { [candidateId]: _dropped, ...rest } = drafts;
      return rest;
    });
    if (this.pitchEditingId() === candidateId) {
      this.pitchEditingId.set(null);
    }
  }

  protected updatePitchDraft(candidateId: string, value: string): void {
    this.pitchDrafts.update((drafts) => ({ ...drafts, [candidateId]: value }));
  }

  protected pitchDraftFor(candidateId: string): string {
    return this.pitchDrafts()[candidateId] ?? '';
  }

  protected isEditingPitch(candidateId: string): boolean {
    return this.pitchEditingId() === candidateId;
  }

  protected async savePitch(candidateId: string): Promise<void> {
    const draft = this.pitchDrafts()[candidateId] ?? '';
    try {
      await this.store.updateCandidatePitch(candidateId, draft);
      this.cancelEditPitch(candidateId);
    } catch {
      // notification handled in store
    }
  }

  protected confirmRemoveMyNomination(candidateId: string): void {
    this.removeNominationConfirmId.set(candidateId);
  }

  protected cancelRemoveMyNomination(): void {
    this.removeNominationConfirmId.set(null);
  }

  protected async confirmedRemoveMyNomination(): Promise<void> {
    const id = this.removeNominationConfirmId();
    if (!id) return;
    try {
      await this.store.removeCandidate(id);
    } finally {
      this.removeNominationConfirmId.set(null);
    }
  }

  // endregion

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    this.closeMenus();
    this.closeSearch();
    this.closeCustom();
    this.closeShelfModal();
    this.closeDeleteConfirm();
    this.closeReopenModal();
    if (this.pitchEditingId()) {
      this.cancelEditPitch(this.pitchEditingId()!);
    }
    if (this.removeNominationConfirmId()) {
      this.cancelRemoveMyNomination();
    }
  }
}
