package com.gpt.springbonk.service.event;

import java.util.UUID;

/**
 * Published when an election is first created or reopened. Listeners
 * (e.g. NotificationService) use this to notify the electorate.
 */
public record ElectionOpenedEvent(UUID electionId, String title) {
}
