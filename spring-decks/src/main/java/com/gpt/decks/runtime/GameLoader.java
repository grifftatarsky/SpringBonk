package com.gpt.decks.runtime;

import com.gpt.decks.engine.president.PresidentEngine;
import com.gpt.decks.lobby.GameRepository;
import com.gpt.decks.lobby.model.Game;
import com.gpt.decks.lobby.model.GameStatus;
import com.gpt.decks.lobby.model.Seat;
import com.gpt.decks.lobby.model.SeatKind;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Transactional bridge from the lobby aggregate to the engine — kept in its own
 * bean so the {@code @Transactional} proxy applies (no self-invocation), and so
 * seats are read inside a transaction. Returns a materialized engine; the actor
 * never touches JPA entities.
 */
@Service
@RequiredArgsConstructor
public class GameLoader {

  private final GameRepository games;
  private final GamePersistence persistence;

  public record Loaded(PresidentEngine engine, Set<String> botIds) {
  }

  /** Build a fresh engine from a just-started game and persist the initial state. */
  @Transactional
  public Loaded initialize(UUID gameId) {
    Game game = games.findById(gameId).orElseThrow();
    List<String> playerIds = new ArrayList<>();
    Set<String> botIds = new HashSet<>();
    seatsInOrder(game).forEach(seat -> {
      if (seat.getKind() == SeatKind.EMPTY) {
        return;
      }
      String id = enginePlayerId(seat);
      playerIds.add(id);
      if (seat.getKind() == SeatKind.BOT) {
        botIds.add(id);
      }
    });
    long seed = ThreadLocalRandom.current().nextInt();
    PresidentEngine engine = PresidentEngine.newGame(playerIds, (int) seed, game.getDecks());
    game.setSeed(seed);
    game.setGameState(persistence.serialize(engine.state())); // managed → committed on return
    return new Loaded(engine, botIds);
  }

  /** Rebuild an engine from the persisted snapshot (resume / after restart). */
  @Transactional(readOnly = true)
  public Loaded resume(UUID gameId) {
    Game game = games.findById(gameId).orElse(null);
    if (game == null || game.getStatus() != GameStatus.ACTIVE || game.getGameState() == null) {
      return null;
    }
    PresidentEngine engine = PresidentEngine.fromState(persistence.deserialize(game.getGameState()));
    Set<String> botIds = new HashSet<>();
    seatsInOrder(game).forEach(seat -> {
      if (seat.getKind() == SeatKind.BOT) {
        botIds.add(enginePlayerId(seat));
      }
    });
    return new Loaded(engine, botIds);
  }

  private static List<Seat> seatsInOrder(Game game) {
    return game.getSeats().stream().sorted(Comparator.comparingInt(Seat::getIndex)).toList();
  }

  /** Engine player id: a bot's seat slot, or a human's Keycloak subject. */
  static String enginePlayerId(Seat seat) {
    return seat.getKind() == SeatKind.BOT ? "bot:" + seat.getIndex() : seat.getUser().getId().toString();
  }
}
