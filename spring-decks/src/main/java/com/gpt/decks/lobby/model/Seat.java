package com.gpt.decks.lobby.model;

import com.gpt.decks.keycloak.KeycloakUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One chair at a table. A human/host seat references a {@link KeycloakUser}; a
 * bot seat carries only a {@code botName}; an empty seat carries neither. The
 * occupant's display name is read live from the user (or the bot name).
 */
@Entity
@Table(name = "seat")
@Getter
@Setter
@NoArgsConstructor
public class Seat {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(updatable = false, nullable = false)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "game_id", nullable = false)
  private Game game;

  @Column(name = "seat_index", nullable = false)
  private int index;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private SeatKind kind;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id")
  private KeycloakUser user;

  @Column(name = "bot_name")
  private String botName;

  @Column(nullable = false)
  private boolean ready;

  public Seat(Game game, int index, SeatKind kind) {
    this.game = game;
    this.index = index;
    this.kind = kind;
  }

  /** Display name for whoever holds the seat, or null when empty. */
  public String displayName() {
    if (user != null) {
      return user.getUsername();
    }
    return botName;
  }

  /** The occupant's user id, or null for bot/empty seats. */
  public UUID userId() {
    return user != null ? user.getId() : null;
  }

  public void empty() {
    this.kind = SeatKind.EMPTY;
    this.user = null;
    this.botName = null;
    this.ready = false;
  }

  public void seatUser(KeycloakUser occupant, SeatKind asKind) {
    this.kind = asKind;
    this.user = occupant;
    this.botName = null;
    this.ready = false;
  }

  public void seatBot(String name) {
    this.kind = SeatKind.BOT;
    this.user = null;
    this.botName = name;
    this.ready = true; // bots are always ready
  }
}
