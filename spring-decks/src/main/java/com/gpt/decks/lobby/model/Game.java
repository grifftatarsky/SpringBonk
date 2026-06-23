package com.gpt.decks.lobby.model;

import com.gpt.decks.keycloak.KeycloakUser;
import com.gpt.decks.model.BaseEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A table: an owner, a fixed number of seats, a deck count, and a status. The
 * {@code gameState} (authoritative engine state) lands here in the game-runtime
 * phase; for now the aggregate is the lobby. The inherited {@code @Version}
 * gives optimistic locking on the snapshot once that exists.
 */
@Entity
@Table(name = "game")
@Getter
@Setter
@NoArgsConstructor
public class Game extends BaseEntity {

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "owner_id", nullable = false)
  private KeycloakUser owner;

  @Column(name = "max_players", nullable = false)
  private int maxPlayers;

  @Column(nullable = false)
  private int decks;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private GameStatus status = GameStatus.WAITING;

  /** Deal seed for the authoritative engine (set when the game starts). */
  @Column
  private Long seed;

  /** Serialized engine {@code GameState} snapshot, written on every action. */
  @Column(name = "game_state", columnDefinition = "text")
  private String gameState;

  @OneToMany(mappedBy = "game", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("index ASC")
  private List<Seat> seats = new ArrayList<>();

  public Game(KeycloakUser owner, int maxPlayers, int decks) {
    this.owner = owner;
    this.maxPlayers = maxPlayers;
    this.decks = decks;
  }

  public boolean isOwnedBy(java.util.UUID userId) {
    return owner != null && owner.getId().equals(userId);
  }

  public boolean hasEmptySeat() {
    return seats.stream().anyMatch(s -> s.getKind() == SeatKind.EMPTY);
  }

  /** All seats filled and everyone ready — the host may start. */
  public boolean canStart() {
    return !seats.isEmpty()
        && seats.stream().allMatch(s -> s.getKind() != SeatKind.EMPTY && s.isReady());
  }
}
