package com.gpt.decks.runtime;

import com.gpt.decks.engine.president.Action;
import com.gpt.decks.engine.president.Card;
import com.gpt.decks.engine.president.ExchangeDebt;
import com.gpt.decks.engine.president.GameEvent;
import com.gpt.decks.engine.president.GameState;
import com.gpt.decks.engine.president.Phase;
import com.gpt.decks.engine.president.PresidentBot;
import com.gpt.decks.engine.president.PresidentEngine;
import com.gpt.decks.engine.president.PlayerState;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.BiConsumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * One live game. The authority for a single game runs on <b>one</b> virtual
 * thread draining a serialized executor — so commands apply in order with no
 * locks and no races (the single-writer model). After a command it drives any
 * bot turns (sleeping on the VT between them, which is cheap), broadcasts the
 * events, and snapshots the state. Reads (per-player views) are served from the
 * persisted snapshot elsewhere, never off the live engine.
 *
 * <p>Structured concurrency wasn't the fit here: this is a long-lived, ordered
 * loop, not request-scoped fork/join — a dedicated serialized VT executor models
 * it directly.
 */
public final class GameSession {

  private static final Logger log = LoggerFactory.getLogger(GameSession.class);

  private final UUID gameId;
  private final PresidentEngine engine;
  private final Set<String> botIds;
  private final GameBroadcaster broadcaster;
  private final BiConsumer<UUID, GameState> persist;
  private final long botDelayMs;
  private final ExecutorService actor;

  public GameSession(UUID gameId, PresidentEngine engine, Set<String> botIds,
                     GameBroadcaster broadcaster, BiConsumer<UUID, GameState> persist, long botDelayMs) {
    this.gameId = gameId;
    this.engine = engine;
    this.botIds = botIds;
    this.broadcaster = broadcaster;
    this.persist = persist;
    this.botDelayMs = botDelayMs;
    this.actor = Executors.newSingleThreadExecutor(Thread.ofVirtual().name("game-" + gameId + "-").factory());
  }

  /** Kick off the round (drive bots if the opening leader is one). */
  public void start() {
    actor.execute(() -> guarded(this::driveBots));
  }

  /** A player's command (play/pass/exchange) — applied in order. */
  public void submit(Action action) {
    actor.execute(() -> guarded(() -> {
      publish(engine.dispatch(action));
      driveBots();
    }));
  }

  /** Begin the next round (re-deal + mandatory takes), then resolve bot swaps. */
  public void nextRound() {
    actor.execute(() -> guarded(() -> {
      publish(engine.beginExchange());
      resolveBotExchanges();
      driveBots();
    }));
  }

  public void dispose() {
    actor.shutdownNow();
  }

  private void driveBots() {
    while (engine.phase() == Phase.PLAYING && botIds.contains(engine.currentPlayerId())) {
      sleep(botDelayMs);
      String botId = engine.currentPlayerId();
      publish(engine.dispatch(PresidentBot.choose(engine, botId)));
    }
  }

  private void resolveBotExchanges() {
    for (int guard = 0; guard < 16; guard++) {
      ExchangeDebt debt = engine.state().getPendingExchanges().stream()
          .filter(d -> botIds.contains(d.from()))
          .findFirst()
          .orElse(null);
      if (debt == null) {
        return;
      }
      PlayerState giver = engine.playerById(debt.from()).orElseThrow();
      List<String> give = PresidentBot.chooseGiveBack(giver.getHand(), debt.count())
          .stream().map(Card::uid).toList();
      publish(engine.dispatch(new Action.Exchange(debt.from(), give)));
    }
  }

  private void publish(List<GameEvent> events) {
    if (!events.isEmpty()) {
      broadcaster.events(gameId, events);
    }
    for (PlayerState p : engine.state().getPlayers()) {
      if (!botIds.contains(p.getId())) {
        broadcaster.state(gameId, p.getId(), engine.view(p.getId()));
      }
    }
    persist.accept(gameId, engine.state());
  }

  private void guarded(Runnable task) {
    try {
      task.run();
    } catch (Exception e) {
      log.error("Game {} action failed", gameId, e);
    }
  }

  private static void sleep(long ms) {
    if (ms <= 0) {
      return;
    }
    try {
      Thread.sleep(ms);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }
  }
}
