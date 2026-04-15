package com.gpt.springbonk.service;

import com.gpt.springbonk.model.dto.response.ReviewCommentResponse;
import com.gpt.springbonk.model.dto.response.ReviewResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ReviewService {
  ReviewResponse createReview(UUID authorId, UUID bookId, String body, Integer rating);

  ReviewResponse updateReview(UUID authorId, UUID reviewId, String body, Integer rating);

  void deleteReview(UUID authorId, UUID reviewId);

  Page<ReviewResponse> getReviewsForBook(UUID bookId, UUID viewerId, Pageable pageable);

  Page<ReviewResponse> getReviewsByAuthor(UUID authorId, UUID viewerId, Pageable pageable);

  ReviewResponse getReview(UUID reviewId, UUID viewerId);

  // Comments
  ReviewCommentResponse addComment(UUID authorId, UUID reviewId, String body);

  void deleteComment(UUID authorId, UUID commentId);

  List<ReviewCommentResponse> getCommentsForReview(UUID reviewId);

  // Likes
  /** @return the new liked state (true = now liked, false = now unliked). */
  boolean toggleLike(UUID userId, UUID reviewId);
}
