package com.gpt.decks.engine;

/**
 * Game-engine SPI — the seam that makes this service <em>spring-decks</em> and
 * not spring-president. The next phase ports the (server-authoritative,
 * deterministic) President engine from the Angular client behind this interface:
 * a fresh state from a seed + config, validated command application that returns
 * events, and a per-player redacted view. Lobby / identity / realtime are all
 * reused per game type; a new card game is a new implementation.
 *
 * <p>Type parameters land with the port (State, Action, Event); kept as a marker
 * for now so the package + intent exist while step 3 is built.
 */
public interface CardGame {

  /** Stable identifier for this game type (e.g. {@code "president"}). */
  String type();
}
