package com.gpt.decks.engine.president;

import static com.gpt.decks.engine.president.Fixtures.c;
import static com.gpt.decks.engine.president.Fixtures.player;
import static com.gpt.decks.engine.president.Fixtures.state;
import static com.gpt.decks.engine.president.Fixtures.uids;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

class EngineTest {

  private static List<GameEvent> play(PresidentEngine e, String id, List<String> cards) {
    return e.dispatch(new Action.Play(id, cards));
  }

  @Test
  void firstLeaderSeatsSole3Club() {
    var a = player("A", 0, c("5", "C"));
    var b = player("B", 1, c("3", "C"), c("7", "S"));
    assertEquals(1, PresidentEngine.firstLeaderSeat(List.of(a, b)));
  }

  @Test
  void firstLeaderBreaksTieByNextLowest() {
    var a = player("A", 0, c("3", "C"), c("4", "S"), c("9", "H"));
    var b = player("B", 1, c("3", "C"), c("3", "S"), c("K", "H"));
    var d = player("C", 2, c("6", "D"), c("8", "S"));
    assertEquals(1, PresidentEngine.firstLeaderSeat(List.of(a, b, d))); // 3♣3♠ beats 3♣4♠
  }

  @Test
  void matchingPairSkipsTwoPlayers() {
    var a = player("A", 0, c("3", "C"), c("3", "D"), c("9", "S"), c("9", "H"));
    var b = player("B", 1, c("3", "H"), c("3", "S"), c("8", "C"), c("8", "D"));
    var cc = player("C", 2, c("4", "C"), c("4", "D"));
    var d = player("D", 3, c("5", "C"), c("5", "D"));
    var e = PresidentEngine.fromState(state(0, a, b, cc, d));

    play(e, "A", uids("3C", "3D"));
    assertEquals("B", e.currentPlayerId());

    var events = play(e, "B", uids("3H", "3S"));
    assertEquals("A", e.currentPlayerId());
    assertTrue(events.contains(new GameEvent.Skipped(List.of("C", "D"))));
  }

  @Test
  void threeOfAKindClosesTheTrick() {
    var a = player("A", 0, c("4", "C"), c("4", "D"), c("4", "H"), c("9", "S"));
    var b = player("B", 1, c("4", "S"), c("7", "C"), c("7", "D"), c("8", "C"));
    var cc = player("C", 2, c("6", "C"), c("6", "D"), c("6", "H"));
    var d = player("D", 3, c("9", "C"), c("9", "D"), c("9", "H"));
    var e = PresidentEngine.fromState(state(0, a, b, cc, d));

    play(e, "A", uids("4C", "4D", "4H"));
    var events = play(e, "B", uids("4S", "7C", "7D")); // three 4s via wild 7s
    assertNull(e.state().getTrick().getTopCombo());
    assertEquals("B", e.currentPlayerId());
    assertTrue(events.contains(new GameEvent.TrickWon("B")));
  }

  @Test
  void singleTwoEndsTrick() {
    var a = player("A", 0, c("5", "C"), c("5", "D"), c("9", "S"));
    var b = player("B", 1, c("2", "H"), c("8", "C"), c("8", "D"));
    var e = PresidentEngine.fromState(state(0, a, b));

    play(e, "A", uids("5C", "5D"));
    var events = play(e, "B", uids("2H"));
    assertNull(e.state().getTrick().getTopCombo());
    assertEquals("B", e.currentPlayerId());
    assertTrue(events.contains(new GameEvent.TrickWon("B")));
  }

  @Test
  void cannotWinOnASingleTwo() {
    var a = player("A", 0, c("2", "H"));
    var b = player("B", 1, c("3", "C"), c("4", "D"));
    var e = PresidentEngine.fromState(state(0, a, b));

    var events = play(e, "A", uids("2H"));
    assertTrue(events.contains(new GameEvent.PlayerBottomed("A")));
    assertEquals(Phase.ROUND_OVER, e.state().getPhase());
    assertEquals(List.of("B", "A"), e.state().getStandings());
    assertEquals(Role.ASSHOLE, e.state().getPlayers().get(0).getRole());
    assertEquals(Role.PRESIDENT, e.state().getPlayers().get(1).getRole());
  }

  @Test
  void cannotWinOnAPairOfTwos() {
    var a = player("A", 0, c("2", "C"), c("2", "D"));
    var b = player("B", 1, c("3", "C"));
    var cc = player("C", 2);
    var d = player("D", 3);
    cc.setFinished(true);
    d.setFinished(true);
    var s = state(0, a, b, cc, d);
    s.getFinishingOrder().add("C");
    s.getFinishingOrder().add("D");
    var e = PresidentEngine.fromState(s);

    var events = play(e, "A", uids("2C", "2D"));
    assertTrue(events.contains(new GameEvent.PlayerBottomed("A")));
    assertEquals(Phase.ROUND_OVER, e.state().getPhase());
    assertEquals(List.of("C", "D", "B", "A"), e.state().getStandings());
    assertEquals(Role.ASSHOLE, e.state().getPlayers().get(0).getRole());
    assertEquals(Role.VICE_ASSHOLE, e.state().getPlayers().get(1).getRole());
  }
}
