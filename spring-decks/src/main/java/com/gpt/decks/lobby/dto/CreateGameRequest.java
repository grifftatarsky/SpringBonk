package com.gpt.decks.lobby.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/** Create-a-game payload; the owner comes from the JWT, not the body. */
public record CreateGameRequest(
    @Min(3) @Max(8) int maxPlayers,
    @Min(1) @Max(4) int decks) {
}
