package com.gpt.decks.engine.president;

import static com.gpt.decks.engine.president.Fixtures.c;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

class ComboTest {

  @Test
  void loneSevenIsNatural() {
    Combo combo = Combo.resolve(List.of(c("7", "C")));
    assertEquals(Rank.SEVEN, combo.rank());
    assertEquals(1, combo.count());
  }

  @Test
  void sevenWithAnotherCopiesThatRank() {
    Combo combo = Combo.resolve(List.of(c("3", "C"), c("7", "S")));
    assertEquals(Rank.THREE, combo.rank());
    assertEquals(2, combo.count());
  }

  @Test
  void jackJackSevenIsThreeJacks() {
    Combo combo = Combo.resolve(List.of(c("J", "C"), c("J", "D"), c("7", "S")));
    assertEquals(Rank.JACK, combo.rank());
    assertEquals(3, combo.count());
  }

  @Test
  void twoSevensAreNaturalPair() {
    Combo combo = Combo.resolve(List.of(c("7", "C"), c("7", "D")));
    assertEquals(Rank.SEVEN, combo.rank());
    assertEquals(2, combo.count());
  }

  @Test
  void twoDifferentRanksInvalid() {
    assertNull(Combo.resolve(List.of(c("3", "C"), c("5", "D"))));
  }

  @Test
  void emptyInvalid() {
    assertNull(Combo.resolve(List.of()));
  }

  @Test
  void singleTwoIsTrumpEnder() {
    assertTrue(Combo.resolve(List.of(c("2", "C"))).isSingleTwo());
  }

  @Test
  void followAndSkip() {
    Combo top = Combo.resolve(List.of(c("5", "C"), c("5", "D")));
    assertTrue(Combo.canFollow(top, Combo.resolve(List.of(c("5", "H"), c("5", "S"))))); // equal
    assertTrue(Combo.canFollow(top, Combo.resolve(List.of(c("K", "C"), c("K", "D"))))); // higher
    assertFalse(Combo.canFollow(top, Combo.resolve(List.of(c("4", "C"), c("4", "D"))))); // lower
    assertFalse(Combo.canFollow(top, Combo.resolve(List.of(c("K", "C"))))); // wrong count
    assertTrue(Combo.isSkip(top, Combo.resolve(List.of(c("5", "H"), c("5", "S")))));
    assertFalse(Combo.isSkip(top, Combo.resolve(List.of(c("K", "C"), c("K", "D")))));
  }
}
