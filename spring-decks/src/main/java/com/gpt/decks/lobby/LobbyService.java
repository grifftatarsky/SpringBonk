package com.gpt.decks.lobby;

import com.gpt.decks.keycloak.KeycloakUser;
import com.gpt.decks.keycloak.KeycloakUserRepository;
import com.gpt.decks.lobby.dto.GameResponse;
import com.gpt.decks.runtime.GameClosedEvent;
import com.gpt.decks.runtime.GameStartedEvent;
import com.gpt.decks.lobby.model.Game;
import com.gpt.decks.lobby.model.GameStatus;
import com.gpt.decks.lobby.model.Seat;
import com.gpt.decks.lobby.model.SeatKind;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Lobby application service — the real version of the Angular mock. All
 * mutations enforce server-side rules: only the owner may add/fill bots, clear
 * seats, start, or close. Returns DTOs mapped inside the transaction.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class LobbyService {

  private static final List<String> BOT_NAMES =
      List.of("Maple", "Cinder", "Juniper", "Onyx", "Sage", "Bramble", "Pixel");

  private final GameRepository games;
  private final KeycloakUserRepository users;
  private final ApplicationEventPublisher events;

  public GameResponse create(UUID ownerId, int maxPlayers, int decks) {
    KeycloakUser owner = loadUser(ownerId);
    Game game = new Game(owner, clamp(maxPlayers, 3, 8), clamp(decks, 1, 4));
    for (int i = 0; i < game.getMaxPlayers(); i++) {
      Seat seat = new Seat(game, i, SeatKind.EMPTY);
      if (i == 0) {
        seat.seatUser(owner, SeatKind.HOST);
      }
      game.getSeats().add(seat);
    }
    return GameResponse.from(games.save(game));
  }

  public List<GameResponse> openGames() {
    return games.findByStatusOrderByUpdatedAtDesc(GameStatus.WAITING).stream()
        .filter(Game::hasEmptySeat)
        .map(GameResponse::from)
        .toList();
  }

  public List<GameResponse> myGames(UUID userId) {
    return games.findActiveForUser(userId).stream().map(GameResponse::from).toList();
  }

  public GameResponse get(UUID id) {
    return GameResponse.from(load(id));
  }

  public GameResponse join(UUID id, UUID userId) {
    KeycloakUser user = loadUser(userId);
    Game game = load(id);
    requireWaiting(game);
    boolean seated = game.getSeats().stream().anyMatch(s -> user.getId().equals(s.userId()));
    if (!seated) {
      Seat empty = firstEmpty(game)
          .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Table is full"));
      empty.seatUser(user, SeatKind.HUMAN);
    }
    return GameResponse.from(game);
  }

  public GameResponse addBot(UUID id, int seatIndex, UUID requesterId) {
    Game game = load(id);
    requireHost(game, requesterId);
    requireWaiting(game);
    Seat seat = seat(game, seatIndex);
    if (seat.getKind() == SeatKind.EMPTY) {
      seat.seatBot(nextBotName(game));
    }
    return GameResponse.from(game);
  }

  public GameResponse fillWithBots(UUID id, UUID requesterId) {
    Game game = load(id);
    requireHost(game, requesterId);
    requireWaiting(game);
    for (Seat seat : game.getSeats()) {
      if (seat.getKind() == SeatKind.EMPTY) {
        seat.seatBot(nextBotName(game));
      }
    }
    return GameResponse.from(game);
  }

  public GameResponse clearSeat(UUID id, int seatIndex, UUID requesterId) {
    Game game = load(id);
    requireHost(game, requesterId);
    requireWaiting(game);
    Seat seat = seat(game, seatIndex);
    if (seat.getKind() == SeatKind.HOST) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Can't clear the host seat");
    }
    seat.empty();
    return GameResponse.from(game);
  }

  public GameResponse setReady(UUID id, UUID userId, boolean ready) {
    Game game = load(id);
    requireWaiting(game);
    Seat seat = game.getSeats().stream()
        .filter(s -> userId.equals(s.userId()))
        .findFirst()
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "You're not seated here"));
    seat.setReady(ready);
    return GameResponse.from(game);
  }

  public GameResponse start(UUID id, UUID requesterId) {
    Game game = load(id);
    requireHost(game, requesterId);
    // Only a waiting game deals — re-calling start on an ACTIVE game must not
    // re-deal over an in-progress one (that would wipe the resume snapshot).
    requireWaiting(game);
    if (!game.canStart()) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "All seats must be filled and ready");
    }
    game.setStatus(GameStatus.ACTIVE);
    events.publishEvent(new GameStartedEvent(game.getId())); // runtime starts after commit
    return GameResponse.from(game);
  }

  public GameResponse close(UUID id, UUID requesterId) {
    Game game = load(id);
    requireHost(game, requesterId);
    game.setStatus(GameStatus.CLOSED);
    events.publishEvent(new GameClosedEvent(game.getId()));
    return GameResponse.from(game);
  }

  // --- internals -----------------------------------------------------------

  private Game load(UUID id) {
    return games.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Game not found"));
  }

  private KeycloakUser loadUser(UUID id) {
    return users.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unknown user"));
  }

  private void requireHost(Game game, UUID requesterId) {
    if (!game.isOwnedBy(requesterId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the host can do that");
    }
  }

  private void requireWaiting(Game game) {
    if (game.getStatus() != GameStatus.WAITING) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Game is not in the lobby");
    }
  }

  private Seat seat(Game game, int index) {
    return game.getSeats().stream()
        .filter(s -> s.getIndex() == index)
        .findFirst()
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No such seat"));
  }

  private java.util.Optional<Seat> firstEmpty(Game game) {
    return game.getSeats().stream().filter(s -> s.getKind() == SeatKind.EMPTY).findFirst();
  }

  private String nextBotName(Game game) {
    Set<String> taken = game.getSeats().stream()
        .map(Seat::getBotName)
        .filter(Objects::nonNull)
        .collect(Collectors.toSet());
    return BOT_NAMES.stream()
        .filter(n -> !taken.contains(n))
        .findFirst()
        .orElse("Bot " + game.getSeats().size());
  }

  private int clamp(int v, int lo, int hi) {
    return Math.max(lo, Math.min(hi, v));
  }
}
