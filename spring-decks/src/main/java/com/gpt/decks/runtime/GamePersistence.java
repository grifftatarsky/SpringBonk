package com.gpt.decks.runtime;

import com.gpt.decks.engine.president.GameState;
import com.gpt.decks.lobby.GameRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

/**
 * Write-through persistence of the authoritative {@link GameState} onto the game
 * aggregate (jsonb-ish text column). Called by the per-game actor after each
 * action, so a crash/restart can rebuild the session from the snapshot.
 */
@Service
@RequiredArgsConstructor
public class GamePersistence {

  private final GameRepository games;
  private final ObjectMapper mapper;

  @Transactional
  public void initialize(UUID gameId, long seed, GameState state) {
    games.findById(gameId).ifPresent(g -> {
      g.setSeed(seed);
      g.setGameState(serialize(state));
    });
  }

  @Transactional
  public void save(UUID gameId, GameState state) {
    games.findById(gameId).ifPresent(g -> g.setGameState(serialize(state)));
  }

  public String serialize(GameState state) {
    try {
      return mapper.writeValueAsString(state);
    } catch (Exception e) {
      throw new IllegalStateException("Failed to serialize game state", e);
    }
  }

  public GameState deserialize(String json) {
    try {
      return mapper.readValue(json, GameState.class);
    } catch (Exception e) {
      throw new IllegalStateException("Failed to deserialize game state", e);
    }
  }
}
