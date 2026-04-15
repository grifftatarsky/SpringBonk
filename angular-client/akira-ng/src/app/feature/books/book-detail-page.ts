import { DatePipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, HostListener, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { BookDetailStore } from './book-detail.store';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BookStatus } from '../../model/response/user-book-status-response.model';
import { UserService } from '../../auth/user.service';

type WizardStep = 'intent' | 'details' | 'review' | 'done';

@Component({
  selector: 'app-book-detail-page',
  standalone: true,
  imports: [NgIf, RouterLink, ReactiveFormsModule, DatePipe],
  providers: [BookDetailStore],
  templateUrl: './book-detail-page.html',
  styleUrl: './book-detail-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly userService = inject(UserService);
  protected readonly store = inject(BookDetailStore);
  protected readonly vm = this.store.vm;
  protected readonly statusVm = this.store.statusVm;
  protected readonly reviewsVm = this.store.reviewsVm;
  protected readonly commentsVm = this.store.commentsVm;

  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly pitchForm = this.fb.group({ blurb: ['', [Validators.maxLength(1000)]] });

  /** Current user id as a signal (for "is this my review?" checks). */
  private readonly currentUserId = toSignal(
    this.userService.valueChanges.pipe(map((u) => u.id)),
    { initialValue: this.userService.current.id },
  );
  protected readonly myReview = computed(() => {
    const uid = this.currentUserId();
    if (!uid) return null;
    return this.reviewsVm().items.find((r) => r.authorId === uid) ?? null;
  });

  // ---- "I have read it" wizard ---------------------------------------------

  protected readonly wizardOpen = signal(false);
  protected readonly wizardStep = signal<WizardStep>('intent');
  /** User-selected intent from step 1. */
  protected readonly wizardIntent = signal<'finished' | 'reading' | 'abandoned' | null>(null);

  protected readonly wizardForm = this.fb.group({
    finishedAt: [''],
    rating: this.fb.control<number | null>(null),
    reviewBody: [''],
  });

  // ---- Review form (standalone write-your-own) ------------------------------

  protected readonly reviewComposerOpen = signal(false);
  protected readonly reviewEditingId = signal<string | null>(null);
  protected readonly reviewForm = this.fb.group({
    rating: this.fb.control<number | null>(null),
    body: ['', [Validators.required, Validators.maxLength(10000)]],
  });

  // ---- Per-review comment composers -----------------------------------------

  protected readonly commentDrafts = signal<Record<string, string>>({});
  protected readonly expandedComments = signal<Set<string>>(new Set());

  constructor() {
    this.route.paramMap
      .pipe(map((params) => params.get('id') ?? ''), takeUntilDestroyed())
      .subscribe((id) => this.store.load(id));

    effect(() => {
      const book = this.vm().book;
      if (!book) {
        this.pitchForm.patchValue({ blurb: '' }, { emitEvent: false });
        return;
      }
      this.pitchForm.patchValue({ blurb: book.blurb || '' }, { emitEvent: false });
    });
  }

  protected resetPitch(): void {
    const book = this.vm().book;
    this.pitchForm.reset({ blurb: book?.blurb || '' });
  }

  protected async savePitch(): Promise<void> {
    this.pitchForm.markAllAsTouched();
    if (this.pitchForm.invalid || this.vm().savingPitch) {
      return;
    }
    const value = this.pitchForm.controls.blurb.value?.trim() ?? '';
    await this.store.updatePitch(value);
  }

  // region Status

  protected async quickSetStatus(status: BookStatus): Promise<void> {
    if (status === this.statusVm().statusValue) {
      await this.store.clearStatus();
      return;
    }
    await this.store.setStatus(status);
  }

  // endregion

  // region Wizard

  protected openWizard(): void {
    this.wizardOpen.set(true);
    this.wizardStep.set('intent');
    this.wizardIntent.set(null);
    this.wizardForm.reset({ finishedAt: '', rating: null, reviewBody: '' });
  }

  protected closeWizard(): void {
    this.wizardOpen.set(false);
  }

  protected async chooseWizardIntent(intent: 'finished' | 'reading' | 'abandoned'): Promise<void> {
    this.wizardIntent.set(intent);
    if (intent === 'reading') {
      await this.store.setStatus('READING');
      this.wizardStep.set('done');
      return;
    }
    if (intent === 'abandoned') {
      await this.store.setStatus('ABANDONED');
      this.wizardStep.set('done');
      return;
    }
    // Finished — continue to details step.
    this.wizardStep.set('details');
  }

  protected async submitWizardDetails(): Promise<void> {
    const raw = this.wizardForm.getRawValue();
    const finishedIso = raw.finishedAt ? new Date(raw.finishedAt).toISOString() : null;
    try {
      await this.store.setStatus('READ', { finishedAt: finishedIso });
    } catch {
      return;
    }
    // If the user put something in the review body, jump to the confirm step.
    const hasReview = (raw.reviewBody ?? '').trim().length > 0;
    if (hasReview) {
      this.wizardStep.set('review');
    } else {
      this.wizardStep.set('done');
    }
  }

  protected async submitWizardReview(): Promise<void> {
    const raw = this.wizardForm.getRawValue();
    const body = (raw.reviewBody ?? '').trim();
    if (!body) {
      this.wizardStep.set('done');
      return;
    }
    try {
      const existing = this.myReview();
      if (existing) {
        await this.store.updateReview(existing.id, body, raw.rating ?? null);
      } else {
        await this.store.createReview(body, raw.rating ?? null);
      }
      this.wizardStep.set('done');
    } catch {
      // stay on the review step so the user can retry
    }
  }

  protected skipWizardReview(): void {
    this.wizardStep.set('done');
  }

  // endregion

  // region Standalone review composer

  protected openReviewComposer(reviewId: string | null = null): void {
    this.reviewEditingId.set(reviewId);
    if (reviewId) {
      const existing = this.reviewsVm().items.find((r) => r.id === reviewId);
      if (existing) {
        this.reviewForm.reset({ rating: existing.rating, body: existing.body });
      }
    } else {
      this.reviewForm.reset({ rating: null, body: '' });
    }
    this.reviewComposerOpen.set(true);
  }

  protected closeReviewComposer(): void {
    this.reviewComposerOpen.set(false);
    this.reviewEditingId.set(null);
  }

  protected async submitReview(): Promise<void> {
    this.reviewForm.markAllAsTouched();
    if (this.reviewForm.invalid || this.reviewsVm().saving) return;
    const raw = this.reviewForm.getRawValue();
    const body = raw.body.trim();
    if (!body) return;
    try {
      const editingId = this.reviewEditingId();
      if (editingId) {
        await this.store.updateReview(editingId, body, raw.rating ?? null);
      } else {
        await this.store.createReview(body, raw.rating ?? null);
      }
      this.closeReviewComposer();
    } catch {
      // toast handled in store
    }
  }

  protected async deleteReview(reviewId: string): Promise<void> {
    await this.store.deleteReview(reviewId);
  }

  protected toggleLike(reviewId: string): void {
    void this.store.toggleLike(reviewId);
  }

  // endregion

  // region Comments

  protected toggleComments(reviewId: string): void {
    const isOpen = this.expandedComments().has(reviewId);
    this.expandedComments.update((set) => {
      const next = new Set(set);
      if (isOpen) {
        next.delete(reviewId);
      } else {
        next.add(reviewId);
      }
      return next;
    });
    if (!isOpen) {
      void this.store.loadComments(reviewId);
    }
  }

  protected isCommentsOpen(reviewId: string): boolean {
    return this.expandedComments().has(reviewId);
  }

  protected setCommentDraft(reviewId: string, value: string): void {
    this.commentDrafts.update((drafts) => ({ ...drafts, [reviewId]: value }));
  }

  protected commentDraft(reviewId: string): string {
    return this.commentDrafts()[reviewId] ?? '';
  }

  protected async submitComment(reviewId: string): Promise<void> {
    const draft = this.commentDraft(reviewId);
    if (!draft.trim()) return;
    try {
      await this.store.addComment(reviewId, draft);
      this.commentDrafts.update((drafts) => {
        const { [reviewId]: _dropped, ...rest } = drafts;
        return rest;
      });
    } catch {
      // toast handled in store
    }
  }

  protected async removeComment(reviewId: string, commentId: string): Promise<void> {
    await this.store.deleteComment(reviewId, commentId);
  }

  // endregion

  protected isMine(authorId: string): boolean {
    const uid = this.currentUserId();
    return !!uid && uid === authorId;
  }

  /**
   * A book is "custom" (user-editable) when it has no Open Library id,
   * a blank one, or a synthetic `custom-*` id we minted at nomination.
   * Matches the backend rule in BookServiceImpl.isCustomBook.
   */
  protected isCustomBook(): boolean {
    const id = this.vm().book?.openLibraryId;
    return !id || id.trim() === '' || id.startsWith('custom-');
  }

  /** Friendly fallback when a book has no blurb at all. */
  protected blurbFallback(): string {
    if (this.isCustomBook()) {
      return 'This custom book has no blurb nor description.';
    }
    return 'Unfortunately OpenLibrary has no blurb nor description for this book.';
  }

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    if (this.wizardOpen()) {
      this.closeWizard();
      return;
    }
    if (this.reviewComposerOpen()) {
      this.closeReviewComposer();
    }
  }
}
