package com.gpt.decks.engine.president;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum Suit {
  CLUBS("C"), DIAMONDS("D"), HEARTS("H"), SPADES("S");

  private final String label;

  Suit(String label) {
    this.label = label;
  }

  @JsonValue
  public String label() {
    return label;
  }

  @JsonCreator
  public static Suit of(String label) {
    for (Suit s : values()) {
      if (s.label.equals(label)) {
        return s;
      }
    }
    throw new IllegalArgumentException("Unknown suit: " + label);
  }
}
