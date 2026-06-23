package com.gpt.decks.engine.president;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import java.util.List;

/**
 * The only inputs that mutate a game — a player's intent. Serializable, so the
 * same type is the client→server STOMP command (discriminated by {@code type}).
 */
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
    @JsonSubTypes.Type(value = Action.Play.class, name = "play"),
    @JsonSubTypes.Type(value = Action.Pass.class, name = "pass"),
    @JsonSubTypes.Type(value = Action.Exchange.class, name = "exchange"),
})
public sealed interface Action {

  String playerId();

  record Play(String playerId, List<String> cardUids) implements Action {
  }

  record Pass(String playerId) implements Action {
  }

  record Exchange(String playerId, List<String> cardUids) implements Action {
  }
}
