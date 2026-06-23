package com.gpt.decks.runtime;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Registry of live {@link GameSession}s. A game's authority lives on exactly one
 * session (one VT). Sessions are created when a game starts (after the lobby
 * transaction commits) and rebuilt on demand from the persisted snapshot (e.g.
 * after a restart) when a command arrives.
 */
@Service
@RequiredArgsConstructor
public class GameRuntime {

  private static final Logger log = LoggerFactory.getLogger(GameRuntime.class);
  private static final long BOT_DELAY_MS = 650;

  private final GameLoader loader;
  private final GameBroadcaster broadcaster;
  private final GamePersistence persistence;
  private final Map<UUID, GameSession> sessions = new ConcurrentHashMap<>();

  /** Stand up the session once the game is committed ACTIVE. */
  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
  public void onGameStarted(GameStartedEvent event) {
    log.info("Starting game {} — fresh deal", event.gameId());
    GameLoader.Loaded loaded = loader.initialize(event.gameId());
    GameSession session = newSession(event.gameId(), loaded);
    GameSession prior = sessions.put(event.gameId(), session);
    if (prior != null) {
      prior.dispose();
    }
    session.start();
  }

  /** The live session for a game, rebuilt from the snapshot if not in memory. */
  public Optional<GameSession> session(UUID gameId) {
    GameSession existing = sessions.get(gameId);
    if (existing != null) {
      return Optional.of(existing);
    }
    GameLoader.Loaded loaded = loader.resume(gameId);
    if (loaded == null) {
      return Optional.empty();
    }
    log.info("Resuming game {} from snapshot", gameId);
    GameSession session = newSession(gameId, loaded);
    GameSession prior = sessions.putIfAbsent(gameId, session);
    if (prior != null) {
      session.dispose();
      return Optional.of(prior);
    }
    session.start(); // resume any pending bot turns
    return Optional.of(session);
  }

  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
  public void onGameClosed(GameClosedEvent event) {
    close(event.gameId());
  }

  public void close(UUID gameId) {
    GameSession session = sessions.remove(gameId);
    if (session != null) {
      session.dispose();
    }
  }

  private GameSession newSession(UUID gameId, GameLoader.Loaded loaded) {
    return new GameSession(gameId, loaded.engine(), loaded.botIds(), broadcaster, persistence::save, BOT_DELAY_MS);
  }
}
