package com.gpt.decks.runtime;

import java.util.UUID;

/** Published by the lobby when a game is closed; disposes its live session. */
public record GameClosedEvent(UUID gameId) {
}
