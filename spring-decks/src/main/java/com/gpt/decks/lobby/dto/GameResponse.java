package com.gpt.decks.lobby.dto;

import com.gpt.decks.lobby.model.Game;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record GameResponse(
    UUID id,
    UUID ownerId,
    String ownerName,
    int maxPlayers,
    int decks,
    String status,
    List<SeatResponse> seats,
    Instant createdAt,
    Instant updatedAt) {

  /** Map within a transaction — touches lazy owner/seats. */
  public static GameResponse from(Game game) {
    return new GameResponse(
        game.getId(),
        game.getOwner().getId(),
        game.getOwner().getUsername(),
        game.getMaxPlayers(),
        game.getDecks(),
        game.getStatus().name(),
        game.getSeats().stream().map(SeatResponse::from).toList(),
        game.getCreatedAt(),
        game.getUpdatedAt());
  }
}
