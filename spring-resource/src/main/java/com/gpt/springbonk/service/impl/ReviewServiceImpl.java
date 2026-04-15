package com.gpt.springbonk.service.impl;

import com.gpt.springbonk.exception.ResourceNotFoundException;
import com.gpt.springbonk.exception.SelfLikeException;
import com.gpt.springbonk.keycloak.KeycloakUser;
import com.gpt.springbonk.keycloak.KeycloakUserService;
import com.gpt.springbonk.model.Book;
import com.gpt.springbonk.model.Review;
import com.gpt.springbonk.model.ReviewComment;
import com.gpt.springbonk.model.ReviewLike;
import com.gpt.springbonk.model.dto.response.ReviewCommentResponse;
import com.gpt.springbonk.model.dto.response.ReviewResponse;
import com.gpt.springbonk.repository.ReviewCommentRepository;
import com.gpt.springbonk.repository.ReviewLikeRepository;
import com.gpt.springbonk.repository.ReviewRepository;
import com.gpt.springbonk.service.BookService;
import com.gpt.springbonk.service.ReviewService;
import com.gpt.springbonk.service.event.ReviewCommentedEvent;
import com.gpt.springbonk.service.event.ReviewLikedEvent;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotNull;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class ReviewServiceImpl implements ReviewService {
  private final ReviewRepository reviewRepository;
  private final ReviewCommentRepository commentRepository;
  private final ReviewLikeRepository likeRepository;
  private final BookService bookService;
  private final KeycloakUserService keycloakUserService;
  private final ApplicationEventPublisher eventPublisher;

  // region Review CRUD

  @Override
  public ReviewResponse createReview(
      @NotNull UUID authorId,
      @NotNull UUID bookId,
      @NotNull String body,
      Integer rating
  ) {
    reviewRepository.findByAuthor_IdAndBook_Id(authorId, bookId).ifPresent(existing -> {
      throw new IllegalStateException(
          "You already have a review for this book. Edit it instead.");
    });
    KeycloakUser author = keycloakUserService.getUserById(authorId);
    Book book = bookService.getBookById(bookId);
    Review review = new Review(author, book, body, rating);
    Review saved = reviewRepository.saveAndFlush(review);
    log.info("[ReviewService] user={} created review {} for book {}", authorId, saved.getId(), bookId);
    return toResponse(saved, authorId);
  }

  @Override
  public ReviewResponse updateReview(
      @NotNull UUID authorId,
      @NotNull UUID reviewId,
      @NotNull String body,
      Integer rating
  ) {
    Review review = getReviewOrThrow(reviewId);
    if (!review.getAuthor().getId().equals(authorId)) {
      throw new AccessDeniedException("Only the author can edit this review.");
    }
    review.setBody(body);
    review.setRating(rating);
    Review saved = reviewRepository.saveAndFlush(review);
    return toResponse(saved, authorId);
  }

  @Override
  public void deleteReview(@NotNull UUID authorId, @NotNull UUID reviewId) {
    Review review = getReviewOrThrow(reviewId);
    if (!review.getAuthor().getId().equals(authorId)) {
      throw new AccessDeniedException("Only the author can delete this review.");
    }
    reviewRepository.delete(review);
  }

  @Override
  public Page<ReviewResponse> getReviewsForBook(
      @NotNull UUID bookId,
      UUID viewerId,
      @NotNull Pageable pageable
  ) {
    Page<Review> page = reviewRepository.findByBook_IdOrderByCreatedDateDesc(bookId, pageable);
    return hydrateLikes(page, viewerId);
  }

  @Override
  public Page<ReviewResponse> getReviewsByAuthor(
      @NotNull UUID authorId,
      UUID viewerId,
      @NotNull Pageable pageable
  ) {
    Page<Review> page = reviewRepository.findByAuthor_IdOrderByCreatedDateDesc(authorId, pageable);
    return hydrateLikes(page, viewerId);
  }

  @Override
  public ReviewResponse getReview(@NotNull UUID reviewId, UUID viewerId) {
    return toResponse(getReviewOrThrow(reviewId), viewerId);
  }

  // endregion

  // region Comments

  @Override
  public ReviewCommentResponse addComment(
      @NotNull UUID authorId,
      @NotNull UUID reviewId,
      @NotNull String body
  ) {
    Review review = getReviewOrThrow(reviewId);
    KeycloakUser author = keycloakUserService.getUserById(authorId);
    ReviewComment comment = new ReviewComment(review, author, body);
    ReviewComment saved = commentRepository.saveAndFlush(comment);

    eventPublisher.publishEvent(new ReviewCommentedEvent(
        review.getId(),
        authorId,
        author.getUsername(),
        review.getAuthor().getId(),
        review.getBook().getId(),
        review.getBook().getTitle()
    ));

    return new ReviewCommentResponse(saved);
  }

  @Override
  public void deleteComment(@NotNull UUID authorId, @NotNull UUID commentId) {
    ReviewComment comment = commentRepository.findById(commentId)
        .orElseThrow(() -> new ResourceNotFoundException("Comment does not exist."));
    UUID commentAuthorId = comment.getAuthor().getId();
    UUID reviewAuthorId = comment.getReview().getAuthor().getId();
    // Commenter or review author can delete a comment.
    if (!commentAuthorId.equals(authorId) && !reviewAuthorId.equals(authorId)) {
      throw new AccessDeniedException("Not permitted to delete this comment.");
    }
    commentRepository.delete(comment);
  }

  @Override
  public List<ReviewCommentResponse> getCommentsForReview(@NotNull UUID reviewId) {
    return commentRepository.findByReview_IdOrderByCreatedDateAsc(reviewId).stream()
        .map(ReviewCommentResponse::new)
        .toList();
  }

  // endregion

  // region Likes

  @Override
  public boolean toggleLike(@NotNull UUID userId, @NotNull UUID reviewId) {
    Review review = getReviewOrThrow(reviewId);
    // Authoritative backend guard: you cannot like your own review, even
    // if the client forgot to hide the button.
    if (review.getAuthor().getId().equals(userId)) {
      throw new SelfLikeException("No self-likes! Ever!");
    }
    return likeRepository.findByReview_IdAndUser_Id(reviewId, userId)
        .map(existing -> {
          likeRepository.delete(existing);
          return false;
        })
        .orElseGet(() -> {
          KeycloakUser user = keycloakUserService.getUserById(userId);
          likeRepository.saveAndFlush(new ReviewLike(review, user));
          // Fire the event only on the "now liked" branch so we don't
          // notify on un-likes.
          eventPublisher.publishEvent(new ReviewLikedEvent(
              review.getId(),
              userId,
              user.getUsername(),
              review.getAuthor().getId(),
              review.getBook().getId(),
              review.getBook().getTitle()
          ));
          return true;
        });
  }

  // endregion

  // region Helpers

  private Review getReviewOrThrow(UUID reviewId) {
    return reviewRepository.findById(reviewId)
        .orElseThrow(() -> new ResourceNotFoundException("Review does not exist."));
  }

  private ReviewResponse toResponse(Review review, UUID viewerId) {
    long likeCount = likeRepository.countByReview_Id(review.getId());
    boolean likedByMe = viewerId != null
        && likeRepository.existsByReview_IdAndUser_Id(review.getId(), viewerId);
    return new ReviewResponse(review, likeCount, likedByMe);
  }

  private Page<ReviewResponse> hydrateLikes(Page<Review> page, UUID viewerId) {
    List<Review> content = page.getContent();
    if (content.isEmpty()) {
      return page.map(r -> new ReviewResponse(r, 0L, false));
    }
    Set<UUID> likedByMe = new HashSet<>();
    if (viewerId != null) {
      Set<UUID> ids = new HashSet<>();
      for (Review r : content) ids.add(r.getId());
      likedByMe.addAll(likeRepository.findLikedReviewIdsByUser(viewerId, ids));
    }
    return page.map(r -> new ReviewResponse(
        r,
        likeRepository.countByReview_Id(r.getId()),
        likedByMe.contains(r.getId())
    ));
  }

  // endregion
}
