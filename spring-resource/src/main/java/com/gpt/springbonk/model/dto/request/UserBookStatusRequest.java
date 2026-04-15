package com.gpt.springbonk.model.dto.request;

import com.gpt.springbonk.constant.enumeration.reading.BookStatus;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

/**
 * Upsert body for a user's book status. `startedAt`/`finishedAt`/
 * `abandonedAt` are optional — the service will fall back to "now" on
 * meaningful transitions if the caller omits them.
 */
public record UserBookStatusRequest(
    @NotNull BookStatus status,
    LocalDateTime startedAt,
    LocalDateTime finishedAt,
    LocalDateTime abandonedAt
) {
}
