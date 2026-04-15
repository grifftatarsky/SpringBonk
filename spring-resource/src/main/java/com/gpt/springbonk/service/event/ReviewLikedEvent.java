package com.gpt.springbonk.service.event;

import java.util.UUID;

/**
 * Published when a user adds (not removes) a like on a review. The
 * notification listener uses this to ping the review author.
 */
public record ReviewLikedEvent(
    UUID reviewId,
    UUID likerUserId,
    String likerName,
    UUID reviewAuthorId,
    UUID bookId,
    String bookTitle
) {
}
