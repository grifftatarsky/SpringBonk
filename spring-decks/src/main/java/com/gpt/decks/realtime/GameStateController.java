package com.gpt.decks.realtime;

import com.gpt.decks.engine.president.GameState;
import com.gpt.decks.engine.president.PresidentEngine;
import com.gpt.decks.keycloak.KeycloakUser;
import com.gpt.decks.keycloak.KeycloakUserService;
import com.gpt.decks.lobby.GameRepository;
import com.gpt.decks.lobby.model.Game;
import com.gpt.decks.runtime.GamePersistence;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Initial sync / reconnect: the caller's redacted view of an active game, served
 * from the persisted snapshot (never the live engine — no race with the actor).
 * The client subscribes to the STOMP topic, then GETs this to seed its state.
 */
@RestController
@RequestMapping("/games")
@RequiredArgsConstructor
public class GameStateController {

  private final GameRepository games;
  private final GamePersistence persistence;
  private final KeycloakUserService users;

  @GetMapping("/{id}/state")
  public GameState state(@PathVariable UUID id, Authentication auth) {
    KeycloakUser me = users.ensure(auth);
    Game game = games.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Game not found"));
    if (game.getGameState() == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Game has not started");
    }
    GameState snapshot = persistence.deserialize(game.getGameState());
    return PresidentEngine.fromState(snapshot).view(me.getId().toString());
  }
}
