import { DatePipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
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

  protected readonly searchOpen = signal(false);
  protected readonly customOpen = signal(false);
  protected readonly searchInput = this.fb.control('');
  protected readonly searchPitchInput = this.fb.control('');
  protected readonly customForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(160)]],
    author: ['', [Validators.required, Validators.maxLength(120)]],
    imageURL: [''],
    blurb: [''],
  });
  protected readonly customBusy = signal(false);
  protected readonly customError = signal<string | null>(null);
  protected readonly expandedCandidates = signal<Set<string>>(new Set());
  protected readonly commandMenuOpen = signal(false);
  protected readonly candidateMenuOpen = signal<string | null>(null);
  protected readonly shelfModalOpen = signal(false);
  protected readonly deleteConfirmOpen = signal(false);
  protected readonly reopenModalOpen = signal(false);
  protected readonly shelfSearch = signal('');
  protected readonly reopenForm = this.fb.group({
    endDateTime: [''],
  });

  constructor() {
    this.route.paramMap
      .pipe(map((params) => params.get('id') ?? ''), takeUntilDestroyed())
      .subscribe((id) => this.store.init(id));

    this.searchInput.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => {
        const query = (value || '').trim();
        if (!query) {
          void this.searchStore.search('');
          return;
        }
        void this.searchStore.search(query);
      });
  }

  protected openSearch(): void {
    this.searchOpen.set(true);
    this.customOpen.set(false);
    this.searchInput.setValue('');
    this.searchPitchInput.setValue('');
    this.closeMenus();
  }

  protected closeSearch(): void {
    this.searchOpen.set(false);
  }

  protected openCustom(): void {
    this.customOpen.set(true);
    this.searchOpen.set(false);
    this.customForm.reset({ title: '', author: '', imageURL: '', blurb: '' });
    this.customError.set(null);
    this.closeMenus();
  }

  protected closeCustom(): void {
    this.customOpen.set(false);
    this.customBusy.set(false);
    this.customError.set(null);
  }

  protected addFromOpenLibrary(result: OpenLibraryBookResponse): void {
    const pitch = this.searchPitchInput.value ?? '';
    void this.store.nominateFromOpenLibrary(result, pitch).then(() => {
      this.searchPitchInput.setValue('');
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
      this.candidateMenuOpen.set(null);
    }
  }

  protected toggleCandidateMenu(candidateId: string): void {
    this.candidateMenuOpen.update((current) => (current === candidateId ? null : candidateId));
    if (this.candidateMenuOpen()) {
      this.commandMenuOpen.set(false);
    }
  }

  protected closeMenus(): void {
    this.commandMenuOpen.set(false);
    this.candidateMenuOpen.set(null);
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

  protected candidateMenuIsOpen(candidateId: string): boolean {
    return this.candidateMenuOpen() === candidateId;
  }

  protected get anyOverlayActive(): boolean {
    return Boolean(this.commandMenuOpen() || this.candidateMenuOpen());
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

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    this.closeMenus();
    this.closeSearch();
    this.closeCustom();
    this.closeShelfModal();
    this.closeDeleteConfirm();
    this.closeReopenModal();
  }
}
