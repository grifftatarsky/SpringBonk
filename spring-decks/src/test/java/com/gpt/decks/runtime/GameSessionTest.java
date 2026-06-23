package com.gpt.decks.runtime;

import static java.util.concurrent.TimeUnit.SECONDS;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.gpt.decks.engine.president.GameEvent;
import com.gpt.decks.engine.president.GameState;
import com.gpt.decks.engine.president.Phase;
import com.gpt.decks.engine.president.PresidentEngine;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import org.junit.jupiter.api.Test;

/** The per-game actor drives an all-bot game to completion on its own VT. */
class GameSessionTest {

  @Test
  void allBotGameRunsItselfToRoundOver() throws Exception {
    List<String> ids = List.of("bot:0", "bot:1", "bot:2", "bot:3");
    PresidentEngine engine = PresidentEngine.newGame(ids, 7, 2);

    List<GameEvent> seen = Collections.synchronizedList(new ArrayList<>());
    CountDownLatch roundOver = new CountDownLatch(1);
    GameBroadcaster broadcaster = (id, events) -> {
      seen.addAll(events);
      if (events.stream().anyMatch(e -> e instanceof GameEvent.RoundOver)) {
        roundOver.countDown();
      }
    };

    GameSession session = new GameSession(
        UUID.randomUUID(), engine, Set.copyOf(ids), broadcaster, (id, state) -> { }, 0L);
    session.start();

    assertTrue(roundOver.await(5, SECONDS), "all-bot game should reach round-over");
    assertEquals(Phase.ROUND_OVER, engine.phase());
    assertTrue(seen.stream().anyMatch(e -> e instanceof GameEvent.Played));
    session.dispose();
  }

  @Test
  void gameStateSerializesAndRebuilds() throws Exception {
    PresidentEngine engine = PresidentEngine.newGame(List.of("a", "b", "c"), 3, 2);
    // Play a move so the snapshot contains a Combo on the pile.
    engine.dispatch(engine.legalPlays(engine.currentPlayerId()).get(0));

    // Use the same Jackson 3 mapper Boot autoconfigures (production path).
    tools.jackson.databind.ObjectMapper mapper =
        tools.jackson.databind.json.JsonMapper.builder().build();
    String json = mapper.writeValueAsString(engine.state());
    GameState back = mapper.readValue(json, GameState.class);

    assertEquals(engine.state().getPlayers().size(), back.getPlayers().size());
    assertEquals(engine.state().getTrick().getTopCombo().rank(), back.getTrick().getTopCombo().rank());
    assertEquals(engine.currentPlayerId(), PresidentEngine.fromState(back).currentPlayerId());
  }
}
