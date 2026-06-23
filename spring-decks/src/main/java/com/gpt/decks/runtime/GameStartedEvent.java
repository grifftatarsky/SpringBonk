package com.gpt.decks.runtime;

import java.util.UUID;

/** Published by the lobby when a game starts; consumed after commit. */
public record GameStartedEvent(UUID gameId) {
}
