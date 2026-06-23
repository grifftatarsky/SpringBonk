package com.gpt.decks.engine.president;

import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class PlayerState {
  private String id;
  private int seat;
  private List<Card> hand = new ArrayList<>();
  /** Passed this trick — locked out until it ends. */
  private boolean passed;
  /** Out of cards this round. */
  private boolean finished;
  /** Role carried from the previous round; drives the card swap. */
  private Role role;

  public PlayerState(String id, int seat, List<Card> hand) {
    this.id = id;
    this.seat = seat;
    this.hand = hand;
  }
}
