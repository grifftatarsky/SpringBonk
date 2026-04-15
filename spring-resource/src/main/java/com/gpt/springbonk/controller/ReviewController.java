package com.gpt.springbonk.controller;

import com.gpt.springbonk.model.dto.request.ReviewCommentRequest;
import com.gpt.springbonk.model.dto.request.ReviewRequest;
import com.gpt.springbonk.model.dto.response.ReviewCommentResponse;
import com.gpt.springbonk.model.dto.response.ReviewResponse;
import com.gpt.springbonk.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PagedResourcesAssembler;
import org.springframework.hateoas.PagedModel;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Review Suite")
@RequestMapping("review")
public class ReviewController {
  private final ReviewService reviewService;

  // region Review CRUD

  @PostMapping
  @Operation(summary = "Create a review for a book")
  public ResponseEntity<ReviewResponse> createReview(
      @Valid @RequestBody ReviewRequest request,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    ReviewResponse created = reviewService.createReview(
        userId, request.bookId(), request.body(), request.rating());
    return ResponseEntity.ok(created);
  }

  @PatchMapping("/{id}")
  @Operation(summary = "Update an existing review (author only)")
  public ResponseEntity<ReviewResponse> updateReview(
      @PathVariable UUID id,
      @Valid @RequestBody ReviewRequest request,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    ReviewResponse updated = reviewService.updateReview(
        userId, id, request.body(), request.rating());
    return ResponseEntity.ok(updated);
  }

  @DeleteMapping("/{id}")
  @Operation(summary = "Delete a review (author only)")
  public ResponseEntity<Void> deleteReview(
      @PathVariable UUID id,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    reviewService.deleteReview(userId, id);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/{id}")
  @Operation(summary = "Get a review by id (authenticated club members only)")
  public ResponseEntity<ReviewResponse> getReview(
      @PathVariable UUID id,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    return ResponseEntity.ok(reviewService.getReview(id, userId));
  }

  // endregion

  // region Listings

  @GetMapping("/book/{bookId}")
  @Operation(summary = "List reviews for a book, newest first (authenticated club members only)")
  public ResponseEntity<PagedModel<ReviewResponse>> getReviewsForBook(
      @PathVariable UUID bookId,
      Pageable pageable,
      PagedResourcesAssembler assembler,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    Page<ReviewResponse> page = reviewService.getReviewsForBook(bookId, userId, pageable);
    return ResponseEntity.ok(assembler.toModel(page));
  }

  @GetMapping("/author/{authorId}")
  @Operation(summary = "List reviews by an author, newest first (authenticated club members only)")
  public ResponseEntity<PagedModel<ReviewResponse>> getReviewsByAuthor(
      @PathVariable UUID authorId,
      Pageable pageable,
      PagedResourcesAssembler assembler,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    Page<ReviewResponse> page = reviewService.getReviewsByAuthor(authorId, userId, pageable);
    return ResponseEntity.ok(assembler.toModel(page));
  }

  // endregion

  // region Comments

  @GetMapping("/{id}/comments")
  @Operation(summary = "List comments on a review (authenticated club members only)")
  public ResponseEntity<List<ReviewCommentResponse>> getCommentsForReview(
      @PathVariable UUID id,
      @AuthenticationPrincipal Jwt jwt
  ) {
    // jwt is validated by spring-addons at the filter level; receiving it
    // here explicitly documents the requirement.
    UUID.fromString(jwt.getSubject());
    return ResponseEntity.ok(reviewService.getCommentsForReview(id));
  }

  @PostMapping("/{id}/comments")
  @Operation(summary = "Post a comment on a review")
  public ResponseEntity<ReviewCommentResponse> addComment(
      @PathVariable UUID id,
      @Valid @RequestBody ReviewCommentRequest request,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    ReviewCommentResponse created = reviewService.addComment(userId, id, request.body());
    return ResponseEntity.ok(created);
  }

  @DeleteMapping("/comments/{commentId}")
  @Operation(summary = "Delete a comment (author or review owner)")
  public ResponseEntity<Void> deleteComment(
      @PathVariable UUID commentId,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    reviewService.deleteComment(userId, commentId);
    return ResponseEntity.noContent().build();
  }

  // endregion

  // region Likes

  @PostMapping("/{id}/like")
  @Operation(summary = "Toggle a like on a review")
  public ResponseEntity<Map<String, Boolean>> toggleLike(
      @PathVariable UUID id,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    boolean liked = reviewService.toggleLike(userId, id);
    return ResponseEntity.ok(Map.of("liked", liked));
  }

  // endregion
}
