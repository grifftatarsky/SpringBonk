package com.gpt.springbonk.service.event;

import java.util.UUID;

/**
 * Published when an election is closed and tabulation has run. The winner
 * title may be null if no winner could be determined (ties, errors, etc).
 */
public record ElectionClosedEvent(
    UUID electionId,
    String title,
    String winnerTitle
) {
}
