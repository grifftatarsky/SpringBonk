import { computed, inject, Injectable, signal } from '@angular/core';
import { BookHttpService } from '../../common/http/book-http.service';
import { BookResponse } from '../../model/response/book-response.model';
import { firstValueFrom } from 'rxjs';
import { BookRequest } from '../../model/request/book-request.model';
import { BookStatusHttpService } from '../../common/http/book-status-http.service';
import { ReviewHttpService } from '../../common/http/review-http.service';
import {
  BookStatus,
  UserBookStatusRequest,
  UserBookStatusResponse,
} from '../../model/response/user-book-status-response.model';
import {
  ReviewCommentResponse,
  ReviewRequest,
  ReviewResponse,
} from '../../model/response/review-response.model';
import { NotificationService } from '../../common/notification/notification.service';
import { mapSpringPagedResponse } from '../../common/util/pagination.util';

@Injectable()
export class BookDetailStore {
  private readonly http = inject(BookHttpService);
  private readonly statusHttp = inject(BookStatusHttpService);
  private readonly reviewHttp = inject(ReviewHttpService);
  private readonly notifications = inject(NotificationService);

  private readonly loading = signal(false);
  private readonly error = signal<string | null>(null);
  private readonly book = signal<BookResponse | null>(null);
  private readonly savingPitch = signal(false);
  private readonly saveError = signal<string | null>(null);

  // Reading status
  private readonly status = signal<UserBookStatusResponse | null>(null);
  private readonly statusBusy = signal(false);

  // Reviews
  private readonly reviews = signal<ReviewResponse[]>([]);
  private readonly reviewsLoading = signal(false);
  private readonly reviewsError = signal<string | null>(null);
  private readonly reviewSaving = signal(false);

  // Comments (keyed by review id)
  private readonly commentsByReview = signal<Record<string, ReviewCommentResponse[]>>({});
  private readonly commentsLoading = signal<Record<string, boolean>>({});

  readonly vm = computed(() => ({
    loading: this.loading(),
    error: this.error(),
    book: this.book(),
    savingPitch: this.savingPitch(),
    saveError: this.saveError(),
  }));

  readonly statusVm = computed(() => ({
    status: this.status(),
    statusValue: (this.status()?.status ?? 'UNREAD') as BookStatus,
    busy: this.statusBusy(),
  }));

  readonly reviewsVm = computed(() => ({
    items: this.reviews(),
    loading: this.reviewsLoading(),
    error: this.reviewsError(),
    saving: this.reviewSaving(),
  }));

  readonly commentsVm = computed(() => ({
    byReview: this.commentsByReview(),
    loadingByReview: this.commentsLoading(),
  }));

  async load(id: string): Promise<void> {
    if (!id) {
      this.error.set('Book not found.');
      this.book.set(null);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const [book, status] = await Promise.all([
        firstValueFrom(this.http.getBookById(id)),
        firstValueFrom(this.statusHttp.getMyStatus(id)),
      ]);
      this.book.set(book);
      this.status.set(status);
    } catch (error) {
      console.error('[BookDetailStore] Failed to load book', error);
      this.error.set('Unable to load book.');
      this.book.set(null);
    } finally {
      this.loading.set(false);
    }

    // Reviews are non-blocking — load after the main book resolves.
    void this.loadReviews(id);
  }

  async updatePitch(blurb: string): Promise<void> {
    const book = this.book();
    if (!book || this.savingPitch()) {
      return;
    }

    this.savingPitch.set(true);
    this.saveError.set(null);

    const request: BookRequest = {
      title: book.title,
      author: book.author,
      imageURL: book.imageURL,
      blurb,
      openLibraryId: book.openLibraryId,
      shelfIds: book.shelves.map((shelf) => shelf.id),
    };

    try {
      const updated = await firstValueFrom(this.http.updateBook(book.id, request));
      this.book.set(updated);
    } catch (error) {
      console.error('[BookDetailStore] Failed to update pitch', error);
      this.saveError.set('Unable to save pitch right now.');
      throw error;
    } finally {
      this.savingPitch.set(false);
    }
  }

  // region Reading status

  async setStatus(
    status: BookStatus,
    extras: { startedAt?: string | null; finishedAt?: string | null; abandonedAt?: string | null } = {},
  ): Promise<void> {
    const book = this.book();
    if (!book || this.statusBusy()) return;
    this.statusBusy.set(true);
    try {
      const payload: UserBookStatusRequest = {
        status,
        startedAt: extras.startedAt ?? null,
        finishedAt: extras.finishedAt ?? null,
        abandonedAt: extras.abandonedAt ?? null,
      };
      const saved = await firstValueFrom(this.statusHttp.setMyStatus(book.id, payload));
      this.status.set(saved);
      this.notifications.success(this.statusMessage(status));
    } catch (error) {
      console.error('[BookDetailStore] Failed to set status', error);
      this.notifications.error('Unable to update status right now.');
      throw error;
    } finally {
      this.statusBusy.set(false);
    }
  }

  async clearStatus(): Promise<void> {
    const book = this.book();
    if (!book || this.statusBusy()) return;
    this.statusBusy.set(true);
    try {
      await firstValueFrom(this.statusHttp.clearMyStatus(book.id));
      this.status.set(null);
      this.notifications.success('Status cleared');
    } catch (error) {
      console.error('[BookDetailStore] Failed to clear status', error);
      this.notifications.error('Unable to clear status right now.');
    } finally {
      this.statusBusy.set(false);
    }
  }

  private statusMessage(status: BookStatus): string {
    switch (status) {
      case 'READ':
        return 'Marked as read';
      case 'READING':
        return 'Marked as reading';
      case 'ABANDONED':
        return 'Marked as abandoned';
      default:
        return 'Status updated';
    }
  }

  // endregion

  // region Reviews

  async loadReviews(bookId: string): Promise<void> {
    this.reviewsLoading.set(true);
    this.reviewsError.set(null);
    try {
      const response = await firstValueFrom(this.reviewHttp.getReviewsForBook(bookId, 0, 20));
      const result = mapSpringPagedResponse<ReviewResponse>(response);
      this.reviews.set([...(result.items ?? [])]);
    } catch (error) {
      console.error('[BookDetailStore] Failed to load reviews', error);
      this.reviewsError.set('Unable to load reviews right now.');
      this.reviews.set([]);
    } finally {
      this.reviewsLoading.set(false);
    }
  }

  async createReview(body: string, rating: number | null): Promise<void> {
    const book = this.book();
    if (!book || this.reviewSaving()) return;
    const trimmed = body.trim();
    if (!trimmed) return;
    this.reviewSaving.set(true);
    try {
      const request: ReviewRequest = { bookId: book.id, body: trimmed, rating };
      const created = await firstValueFrom(this.reviewHttp.createReview(request));
      this.reviews.update((list) => [created, ...list]);
      this.notifications.success('Review posted');
    } catch (error) {
      console.error('[BookDetailStore] Failed to create review', error);
      this.notifications.error('Unable to post review right now.');
      throw error;
    } finally {
      this.reviewSaving.set(false);
    }
  }

  async updateReview(reviewId: string, body: string, rating: number | null): Promise<void> {
    const book = this.book();
    if (!book) return;
    try {
      const request: ReviewRequest = { bookId: book.id, body: body.trim(), rating };
      const updated = await firstValueFrom(this.reviewHttp.updateReview(reviewId, request));
      this.reviews.update((list) => list.map((r) => (r.id === reviewId ? updated : r)));
      this.notifications.success('Review updated');
    } catch (error) {
      console.error('[BookDetailStore] Failed to update review', error);
      this.notifications.error('Unable to save review right now.');
      throw error;
    }
  }

  async deleteReview(reviewId: string): Promise<void> {
    try {
      await firstValueFrom(this.reviewHttp.deleteReview(reviewId));
      this.reviews.update((list) => list.filter((r) => r.id !== reviewId));
      this.commentsByReview.update((map) => {
        const { [reviewId]: _dropped, ...rest } = map;
        return rest;
      });
      this.notifications.success('Review deleted');
    } catch (error) {
      console.error('[BookDetailStore] Failed to delete review', error);
      this.notifications.error('Unable to delete review right now.');
    }
  }

  async toggleLike(reviewId: string): Promise<void> {
    // Optimistic flip.
    const snapshot = this.reviews();
    this.reviews.update((list) =>
      list.map((r) =>
        r.id === reviewId
          ? {
              ...r,
              likedByMe: !r.likedByMe,
              likeCount: r.likedByMe ? Math.max(0, r.likeCount - 1) : r.likeCount + 1,
            }
          : r,
      ),
    );
    try {
      await firstValueFrom(this.reviewHttp.toggleLike(reviewId));
    } catch (error) {
      console.error('[BookDetailStore] Failed to toggle like', error);
      this.reviews.set(snapshot);
      this.notifications.error('Unable to update like right now.');
    }
  }

  // endregion

  // region Comments

  async loadComments(reviewId: string): Promise<void> {
    if (this.commentsLoading()[reviewId]) return;
    this.commentsLoading.update((map) => ({ ...map, [reviewId]: true }));
    try {
      const comments = await firstValueFrom(this.reviewHttp.getComments(reviewId));
      this.commentsByReview.update((map) => ({ ...map, [reviewId]: comments ?? [] }));
    } catch (error) {
      console.error('[BookDetailStore] Failed to load comments', error);
    } finally {
      this.commentsLoading.update((map) => {
        const { [reviewId]: _dropped, ...rest } = map;
        return rest;
      });
    }
  }

  async addComment(reviewId: string, body: string): Promise<void> {
    const trimmed = body.trim();
    if (!trimmed) return;
    try {
      const created = await firstValueFrom(this.reviewHttp.addComment(reviewId, { body: trimmed }));
      this.commentsByReview.update((map) => ({
        ...map,
        [reviewId]: [...(map[reviewId] ?? []), created],
      }));
      // Bump the commentCount on the review.
      this.reviews.update((list) =>
        list.map((r) => (r.id === reviewId ? { ...r, commentCount: r.commentCount + 1 } : r)),
      );
    } catch (error) {
      console.error('[BookDetailStore] Failed to add comment', error);
      this.notifications.error('Unable to post comment right now.');
      throw error;
    }
  }

  async deleteComment(reviewId: string, commentId: string): Promise<void> {
    try {
      await firstValueFrom(this.reviewHttp.deleteComment(commentId));
      this.commentsByReview.update((map) => ({
        ...map,
        [reviewId]: (map[reviewId] ?? []).filter((c) => c.id !== commentId),
      }));
      this.reviews.update((list) =>
        list.map((r) =>
          r.id === reviewId ? { ...r, commentCount: Math.max(0, r.commentCount - 1) } : r,
        ),
      );
    } catch (error) {
      console.error('[BookDetailStore] Failed to delete comment', error);
      this.notifications.error('Unable to delete comment right now.');
    }
  }

  // endregion
}
