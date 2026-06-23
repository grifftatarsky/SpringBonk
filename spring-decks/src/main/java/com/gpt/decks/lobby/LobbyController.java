package com.gpt.decks.lobby;

import com.gpt.decks.keycloak.KeycloakUser;
import com.gpt.decks.keycloak.KeycloakUserService;
import com.gpt.decks.lobby.dto.CreateGameRequest;
import com.gpt.decks.lobby.dto.GameResponse;
import com.gpt.decks.lobby.dto.ReadyRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Lobby HTTP API (reached via the BFF at {@code /dck/games/**}). Authenticated
 * endpoints provision the caller's thin user record first, then delegate to
 * {@link LobbyService}, which enforces host-only rules. {@code GET /games/open}
 * is public (server browser + the frontend down-detector ping).
 */
@RestController
@RequestMapping("/games")
@RequiredArgsConstructor
public class LobbyController {

  private final LobbyService lobby;
  private final KeycloakUserService users;

  @GetMapping("/open")
  public List<GameResponse> open() {
    return lobby.openGames();
  }

  @GetMapping("/mine")
  public List<GameResponse> mine(Authentication auth) {
    return lobby.myGames(me(auth));
  }

  @GetMapping("/{id}")
  public GameResponse get(@PathVariable UUID id, Authentication auth) {
    me(auth); // ensure provisioned
    return lobby.get(id);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public GameResponse create(@Valid @RequestBody CreateGameRequest req, Authentication auth) {
    return lobby.create(me(auth), req.maxPlayers(), req.decks());
  }

  @PostMapping("/{id}/join")
  public GameResponse join(@PathVariable UUID id, Authentication auth) {
    return lobby.join(id, me(auth));
  }

  @PostMapping("/{id}/fill-bots")
  public GameResponse fillBots(@PathVariable UUID id, Authentication auth) {
    return lobby.fillWithBots(id, me(auth));
  }

  @PostMapping("/{id}/seats/{index}/bot")
  public GameResponse addBot(@PathVariable UUID id, @PathVariable int index, Authentication auth) {
    return lobby.addBot(id, index, me(auth));
  }

  @DeleteMapping("/{id}/seats/{index}")
  public GameResponse clearSeat(@PathVariable UUID id, @PathVariable int index, Authentication auth) {
    return lobby.clearSeat(id, index, me(auth));
  }

  @PostMapping("/{id}/ready")
  public GameResponse ready(@PathVariable UUID id, @RequestBody ReadyRequest body, Authentication auth) {
    return lobby.setReady(id, me(auth), body.ready());
  }

  @PostMapping("/{id}/start")
  public GameResponse start(@PathVariable UUID id, Authentication auth) {
    return lobby.start(id, me(auth));
  }

  @PostMapping("/{id}/close")
  public GameResponse close(@PathVariable UUID id, Authentication auth) {
    return lobby.close(id, me(auth));
  }

  /** Provision (JIT) the caller and return their stable id. */
  private UUID me(Authentication auth) {
    KeycloakUser user = users.ensure(auth);
    return user.getId();
  }
}
