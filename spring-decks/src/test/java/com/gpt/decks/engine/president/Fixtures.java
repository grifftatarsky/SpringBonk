package com.gpt.decks.engine.president;

import java.util.ArrayList;
import java.util.List;

/** Test helpers for crafting cards, players and states. */
final class Fixtures {

  private Fixtures() {
  }

  static Card c(String rank, String suit) {
    return new Card(Rank.of(rank), Suit.of(suit), rank + suit);
  }

  static PlayerState player(String id, int seat, Card... cards) {
    return new PlayerState(id, seat, new ArrayList<>(List.of(cards)));
  }

  static GameState state(int turn, PlayerState... players) {
    GameState s = new GameState();
    s.setRound(1);
    s.setDecks(2);
    s.setPlayers(new ArrayList<>(List.of(players)));
    s.setTurn(turn);
    return s;
  }

  static List<String> uids(String... uids) {
    return List.of(uids);
  }
}
