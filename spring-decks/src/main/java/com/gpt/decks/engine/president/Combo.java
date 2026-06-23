package com.gpt.decks.engine.president;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.List;

/**
 * A resolved, legal play: a set of cards reduced to one rank + a count. Sevens
 * are wild only alongside another card (they copy that rank); a lone 7 is a 7;
 * sevens alone are natural 7s. {@link #resolve} returns null for an invalid set.
 */
public record Combo(Rank rank, int count, List<Card> cards) {

  public static Combo resolve(List<Card> cards) {
    if (cards.isEmpty()) {
      return null;
    }
    List<Card> nonSevens = cards.stream().filter(c -> c.rank() != Rank.SEVEN).toList();
    Rank rank;
    if (nonSevens.isEmpty()) {
      rank = Rank.SEVEN; // all sevens → natural sevens
    } else {
      rank = nonSevens.get(0).rank();
      for (Card c : nonSevens) {
        if (c.rank() != rank) {
          return null; // two different real ranks can't form one set
        }
      }
    }
    return new Combo(rank, cards.size(), List.copyOf(cards));
  }

  /** A lone 2 — the universal trick-ender (trump), playable on any count. */
  @JsonIgnore
  public boolean isSingleTwo() {
    return count == 1 && rank == Rank.TWO;
  }

  /** Same count, equal-or-higher rank — the legal-follow test (excl. the trump 2). */
  public static boolean canFollow(Combo top, Combo next) {
    return next.count == top.count && next.rank.value() >= top.rank.value();
  }

  /** Equal rank + count — the move that triggers a skip. */
  public static boolean isSkip(Combo top, Combo next) {
    return next.count == top.count && next.rank.value() == top.rank.value();
  }
}
