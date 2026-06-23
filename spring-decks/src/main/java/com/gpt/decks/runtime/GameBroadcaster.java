package com.gpt.decks.runtime;

import com.gpt.decks.engine.president.GameEvent;
import com.gpt.decks.engine.president.GameState;
import java.util.List;
import java.util.UUID;

/** Pushes engine events + per-player state out to a game's subscribers. */
public interface GameBroadcaster {

  /** Public events for the game's topic (animations, log, who-did-what). */
  void events(UUID gameId, List<GameEvent> events);

  /** One player's redacted authoritative state, pushed to just them. */
  default void state(UUID gameId, String playerId, GameState view) {
  }
}
