package com.gpt.decks.engine.president;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import java.util.List;
import java.util.Map;

/**
 * What happened as a result of an action — the outputs the engine emits and the
 * server broadcasts (server→client over STOMP, discriminated by {@code type}).
 */
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
    @JsonSubTypes.Type(value = GameEvent.Played.class, name = "played"),
    @JsonSubTypes.Type(value = GameEvent.Passed.class, name = "passed"),
    @JsonSubTypes.Type(value = GameEvent.Skipped.class, name = "skipped"),
    @JsonSubTypes.Type(value = GameEvent.TrickWon.class, name = "trick-won"),
    @JsonSubTypes.Type(value = GameEvent.TurnChanged.class, name = "turn-changed"),
    @JsonSubTypes.Type(value = GameEvent.PlayerFinished.class, name = "player-finished"),
    @JsonSubTypes.Type(value = GameEvent.PlayerBottomed.class, name = "player-bottomed"),
    @JsonSubTypes.Type(value = GameEvent.RoundOver.class, name = "round-over"),
    @JsonSubTypes.Type(value = GameEvent.Exchanged.class, name = "exchanged"),
    @JsonSubTypes.Type(value = GameEvent.RoundStarted.class, name = "round-started"),
})
public sealed interface GameEvent {

  record Played(String playerId, Combo combo) implements GameEvent {
  }

  record Passed(String playerId) implements GameEvent {
  }

  record Skipped(List<String> playerIds) implements GameEvent {
  }

  record TrickWon(String playerId) implements GameEvent {
  }

  record TurnChanged(String playerId) implements GameEvent {
  }

  record PlayerFinished(String playerId, int place) implements GameEvent {
  }

  record PlayerBottomed(String playerId) implements GameEvent {
  }

  record RoundOver(List<String> standings, Map<String, Role> roles) implements GameEvent {
  }

  record Exchanged(String from, String to, int count) implements GameEvent {
  }

  record RoundStarted(int round, String leaderId) implements GameEvent {
  }
}
