package com.gpt.springbonk.model.dto.response;

import com.gpt.springbonk.model.ReviewComment;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Data;

@Data
public class ReviewCommentResponse {
  private UUID id;
  private UUID reviewId;
  private UUID authorId;
  private String authorName;
  private String body;
  private LocalDateTime createdDate;

  public ReviewCommentResponse(ReviewComment source) {
    this.id = source.getId();
    this.reviewId = source.getReview().getId();
    this.authorId = source.getAuthor().getId();
    this.authorName = source.getAuthor().getUsername();
    this.body = source.getBody();
    this.createdDate = source.getCreatedDate();
  }
}
