import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from './base-http.service';
import {
  ReviewCommentRequest,
  ReviewCommentResponse,
  ReviewRequest,
  ReviewResponse,
} from '../../model/response/review-response.model';
import { SpringPagedResponse } from '../../model/response/spring-paged-response.model';

@Injectable({ providedIn: 'root' })
export class ReviewHttpService extends BaseHttpService {
  private readonly baseUrl: string = `${this.apiBase}/review`;

  // Reviews

  createReview(request: ReviewRequest): Observable<ReviewResponse> {
    return this.post<ReviewResponse>(this.baseUrl, request);
  }

  updateReview(id: string, request: ReviewRequest): Observable<ReviewResponse> {
    return this.patch<ReviewResponse>(`${this.baseUrl}/${id}`, request);
  }

  deleteReview(id: string): Observable<void> {
    return this.delete<void>(`${this.baseUrl}/${id}`);
  }

  getReviewsForBook(
    bookId: string,
    page = 0,
    size = 10,
  ): Observable<SpringPagedResponse<ReviewResponse>> {
    return this.get<SpringPagedResponse<ReviewResponse>>(
      `${this.baseUrl}/book/${bookId}`,
      { page, size },
    );
  }

  getReviewsByAuthor(
    authorId: string,
    page = 0,
    size = 10,
  ): Observable<SpringPagedResponse<ReviewResponse>> {
    return this.get<SpringPagedResponse<ReviewResponse>>(
      `${this.baseUrl}/author/${authorId}`,
      { page, size },
    );
  }

  // Comments

  getComments(reviewId: string): Observable<ReviewCommentResponse[]> {
    return this.get<ReviewCommentResponse[]>(`${this.baseUrl}/${reviewId}/comments`);
  }

  addComment(
    reviewId: string,
    request: ReviewCommentRequest,
  ): Observable<ReviewCommentResponse> {
    return this.post<ReviewCommentResponse>(`${this.baseUrl}/${reviewId}/comments`, request);
  }

  deleteComment(commentId: string): Observable<void> {
    return this.delete<void>(`${this.baseUrl}/comments/${commentId}`);
  }

  // Likes

  toggleLike(reviewId: string): Observable<{ liked: boolean }> {
    return this.post<{ liked: boolean }>(`${this.baseUrl}/${reviewId}/like`, {});
  }
}
