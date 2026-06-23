package com.gpt.decks.engine.president;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Ranks in President strength order, weakest (3) to strongest. The 2 sits above
 * the Ace because a 2 beats everything and ends a trick. {@link #value()} is the
 * comparison key; the label is the wire/display form ("3", "J", "2").
 */
public enum Rank {
  THREE("3"), FOUR("4"), FIVE("5"), SIX("6"), SEVEN("7"), EIGHT("8"), NINE("9"),
  TEN("10"), JACK("J"), QUEEN("Q"), KING("K"), ACE("A"), TWO("2");

  private final String label;

  Rank(String label) {
    this.label = label;
  }

  @JsonValue
  public String label() {
    return label;
  }

  /** 0 (weakest, 3) … 12 (strongest, 2). */
  public int value() {
    return ordinal();
  }

  @JsonCreator
  public static Rank of(String label) {
    for (Rank r : values()) {
      if (r.label.equals(label)) {
        return r;
      }
    }
    throw new IllegalArgumentException("Unknown rank: " + label);
  }
}
