package com.gpt.decks.engine.president;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.util.HashSet;
import java.util.List;
import org.junit.jupiter.api.Test;

/** End-to-end: dumb bots play whole games, exercising every engine path. */
class PlaythroughTest {

  private static final List<String> IDS = List.of("p0", "p1", "p2", "p3");

  /** Any legal move (or pass) — enough to drive the game to completion. */
  private static Action botMove(PresidentEngine e, String id) {
    List<Action> plays = e.legalPlays(id);
    return plays.isEmpty() ? new Action.Pass(id) : plays.get(0);
  }

  private static void playRound(PresidentEngine e) {
    int guard = 0;
    while (e.phase() == Phase.PLAYING) {
      e.dispatch(botMove(e, e.currentPlayerId())); // throws if illegal
      if (++guard > 10_000) {
        throw new AssertionError("round did not terminate");
      }
    }
  }

  @Test
  void heuristicBotCompletesGamesWithOnlyLegalMoves() {
    for (int seed = 1; seed <= 15; seed++) {
      PresidentEngine e = PresidentEngine.newGame(IDS, seed, 2);
      int guard = 0;
      while (e.phase() == Phase.PLAYING) {
        e.dispatch(PresidentBot.choose(e, e.currentPlayerId())); // throws if illegal
        if (++guard > 10_000) {
          throw new AssertionError("round did not terminate");
        }
      }
      assertEquals(4, e.state().getStandings().size());
    }
  }

  @Test
  void fourBotsCompleteRoundsWithOnlyLegalMovesAcrossSeeds() {
    for (int seed = 1; seed <= 25; seed++) {
      PresidentEngine e = PresidentEngine.newGame(IDS, seed, 2);
      playRound(e);
      assertNotNull(e.state().getStandings());
      assertEquals(4, e.state().getStandings().size());
      assertEquals(new HashSet<>(IDS), new HashSet<>(e.state().getStandings()));
    }
  }

  @Test
  void nextRoundReDealsExchangesAndAssholeLeads() {
    PresidentEngine e = PresidentEngine.newGame(IDS, 7, 2);
    playRound(e);
    PlayerState asshole = e.state().getPlayers().stream()
        .filter(p -> p.getRole() == Role.ASSHOLE).findFirst().orElseThrow();

    e.beginExchange();
    assertEquals(Phase.EXCHANGE, e.phase());
    int guard = 0;
    while (!e.state().getPendingExchanges().isEmpty()) {
      ExchangeDebt debt = e.state().getPendingExchanges().get(0);
      PlayerState giver = e.playerById(debt.from()).orElseThrow();
      List<String> give = giver.getHand().stream()
          .sorted(Card.ORDER).limit(debt.count()).map(Card::uid).toList();
      e.dispatch(new Action.Exchange(debt.from(), give));
      if (++guard > 10) {
        throw new AssertionError("exchange did not resolve");
      }
    }

    assertEquals(Phase.PLAYING, e.phase());
    assertEquals(2, e.state().getRound());
    assertEquals(asshole.getId(), e.currentPlayerId());
    int total = e.state().getPlayers().stream().mapToInt(p -> p.getHand().size()).sum();
    assertEquals(104, total);
  }
}
