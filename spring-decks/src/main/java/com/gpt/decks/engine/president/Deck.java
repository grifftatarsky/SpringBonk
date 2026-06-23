package com.gpt.decks.engine.president;

import java.util.ArrayList;
import java.util.List;

/** Builds N standard decks (no jokers) and deals them round-robin. */
public final class Deck {

  private Deck() {
  }

  public static List<Card> build(int numDecks) {
    List<Card> cards = new ArrayList<>();
    for (int copy = 0; copy < numDecks; copy++) {
      for (Suit suit : Suit.values()) {
        for (Rank rank : Rank.values()) {
          cards.add(new Card(rank, suit, rank.label() + suit.label() + "#" + copy));
        }
      }
    }
    return cards;
  }

  public static List<List<Card>> deal(int players, Rng rng, int numDecks) {
    List<Card> shoe = build(numDecks);
    rng.shuffle(shoe);
    List<List<Card>> hands = new ArrayList<>();
    for (int i = 0; i < players; i++) {
      hands.add(new ArrayList<>());
    }
    for (int i = 0; i < shoe.size(); i++) {
      hands.get(i % players).add(shoe.get(i));
    }
    return hands;
  }
}
