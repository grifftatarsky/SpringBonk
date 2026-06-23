package com.gpt.decks.engine.president;

import com.fasterxml.jackson.annotation.JsonValue;

public enum Phase {
  PLAYING("playing"),
  EXCHANGE("exchange"),
  ROUND_OVER("round-over");

  private final String label;

  Phase(String label) {
    this.label = label;
  }

  @JsonValue
  public String label() {
    return label;
  }
}
