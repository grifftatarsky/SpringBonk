package com.gpt.decks.engine.president;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.Comparator;

/**
 * A physical card. With multiple decks, rank+suit isn't unique, so {@link #uid}
 * (e.g. "3C#0", "3C#1") identifies the individual card.
 */
public record Card(Rank rank, Suit suit, String uid) {

  /** Total order: President rank, then suit, then uid — for sorting/tie-breaks. */
  public static final Comparator<Card> ORDER = Comparator
      .comparingInt((Card c) -> c.rank().value())
      .thenComparingInt(c -> c.suit().ordinal())
      .thenComparing(Card::uid);

  @JsonIgnore
  public boolean isSeven() {
    return rank == Rank.SEVEN;
  }

  @JsonIgnore
  public boolean isTwo() {
    return rank == Rank.TWO;
  }
}
