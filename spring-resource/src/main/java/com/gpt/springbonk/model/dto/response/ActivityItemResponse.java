package com.gpt.springbonk.model.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * A single event in the activity feed. Derived server-side from recent
 * reviews + reading-status transitions — there's no `activity_items` table.
 *
 * `type` is one of:
 *   REVIEW_POSTED
 *   STARTED_READING
 *   FINISHED_READING
 *   ABANDONED
 */
@Data
@AllArgsConstructor
public class ActivityItemResponse {
  private String type;
  private LocalDateTime occurredAt;
  private UUID actorId;
  private String actorName;
  private UUID bookId;
  private String bookTitle;
  private String bookAuthor;
  private String bookImageUrl;
  // Review-specific fields — null for status events.
  private UUID reviewId;
  private Integer reviewRating;
  private String reviewExcerpt;
}
