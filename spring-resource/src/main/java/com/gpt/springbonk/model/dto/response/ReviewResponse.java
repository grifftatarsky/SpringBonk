package com.gpt.springbonk.model.dto.response;

import com.gpt.springbonk.model.Review;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Data;

@Data
public class ReviewResponse {
  private UUID id;
  private UUID authorId;
  private String authorName;
  private UUID bookId;
  private String bookTitle;
  private String bookAuthor;
  private String bookImageUrl;
  private Integer rating;
  private String body;
  private LocalDateTime createdDate;
  private LocalDateTime updatedDate;
  private long likeCount;
  private boolean likedByMe;
  private int commentCount;

  public ReviewResponse(
      Review review,
      long likeCount,
      boolean likedByMe
  ) {
    this.id = review.getId();
    this.authorId = review.getAuthor().getId();
    this.authorName = review.getAuthor().getUsername();
    this.bookId = review.getBook().getId();
    this.bookTitle = review.getBook().getTitle();
    this.bookAuthor = review.getBook().getAuthor();
    this.bookImageUrl = review.getBook().getImageURL();
    this.rating = review.getRating();
    this.body = review.getBody();
    this.createdDate = review.getCreatedDate();
    this.updatedDate = review.getUpdatedDate();
    this.likeCount = likeCount;
    this.likedByMe = likedByMe;
    this.commentCount = review.getComments() == null ? 0 : review.getComments().size();
  }
}
