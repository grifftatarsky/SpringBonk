package com.gpt.decks.engine.president;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Heuristic opponent (port of the client bot). Scores legal plays and picks the
 * cheapest, where cheap means: don't split a pair/triple/quad, don't burn 7s as
 * plain 7s (save them as wildcards), hoard the trump 2s, else shed the lowest.
 */
public final class PresidentBot {

  private PresidentBot() {
  }

  private record Candidate(Action.Play action, Combo combo, int cost) {
  }

  public static Action choose(PresidentEngine engine, String botId) {
    GameState state = engine.state();
    Combo top = state.getTrick().getTopCombo();
    PlayerState me = engine.playerById(botId).orElseThrow();
    Map<Rank, Integer> held = countByRank(me.getHand());

    List<Candidate> candidates = new ArrayList<>();
    for (Action action : engine.legalPlays(botId)) {
      if (action instanceof Action.Play play) {
        Combo combo = engine.comboOf(botId, play.cardUids());
        if (combo != null) {
          candidates.add(new Candidate(play, combo, cost(combo, held)));
        }
      }
    }
    if (candidates.isEmpty()) {
      return new Action.Pass(botId);
    }
    candidates.sort(Comparator.comparingInt(Candidate::cost));
    Candidate best = candidates.get(0);

    // Don't spend a trump 2 to win a minor trick while still holding plenty.
    if (top != null && best.combo().rank() == Rank.TWO && me.getHand().size() > 5) {
      return new Action.Pass(botId);
    }
    return best.action();
  }

  /**
   * Cards to give back down the table (President→Asshole, VP→Vice-Asshole):
   * the weakest cards that aren't part of a triple/quad, so strong sets survive.
   */
  public static List<Card> chooseGiveBack(List<Card> hand, int k) {
    Map<Rank, Integer> byRank = countByRank(hand);
    return hand.stream()
        .sorted(Comparator
            .comparingInt((Card c) -> byRank.getOrDefault(c.rank(), 0) >= 3 ? 1 : 0)
            .thenComparingInt(c -> c.rank().value()))
        .limit(k)
        .toList();
  }

  private static Map<Rank, Integer> countByRank(List<Card> hand) {
    Map<Rank, Integer> counts = new HashMap<>();
    for (Card c : hand) {
      counts.merge(c.rank(), 1, Integer::sum);
    }
    return counts;
  }

  private static int cost(Combo combo, Map<Rank, Integer> held) {
    boolean isNatural7 = combo.rank() == Rank.SEVEN;
    long wildSevens = isNatural7 ? 0 : combo.cards().stream().filter(c -> c.rank() == Rank.SEVEN).count();
    long realOfRank = combo.cards().stream().filter(c -> c.rank() == combo.rank()).count();
    int broken = Math.max(0, held.getOrDefault(combo.rank(), 0) - (int) realOfRank);

    int cost = combo.rank().value(); // shed low cards (tie-breaker)
    cost += broken * 200; // strongly avoid splitting a set
    cost += (int) wildSevens * 25; // spend wild 7s only when they buy something
    if (isNatural7) {
      cost += 500; // never burn 7s as plain 7s
    }
    if (combo.rank() == Rank.TWO) {
      cost += 400; // hoard the trump 2s
    }
    return cost;
  }
}
