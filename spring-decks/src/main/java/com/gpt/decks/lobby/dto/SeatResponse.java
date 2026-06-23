package com.gpt.decks.lobby.dto;

import com.gpt.decks.lobby.model.Seat;
import java.util.UUID;

public record SeatResponse(int index, String kind, UUID userId, String name, boolean ready) {

  public static SeatResponse from(Seat seat) {
    return new SeatResponse(
        seat.getIndex(),
        seat.getKind().name(),
        seat.userId(),
        seat.displayName(),
        seat.isReady());
  }
}
