package com.gpt.springbonk.service.event;

import java.util.UUID;

/**
 * Published when a user posts a comment on a review. The notification
 * listener uses this to ping the review author (but not the commenter
 * themselves if they're commenting on their own review).
 */
public record ReviewCommentedEvent(
    UUID reviewId,
    UUID commenterUserId,
    String commenterName,
    UUID reviewAuthorId,
    UUID bookId,
    String bookTitle
) {
}
