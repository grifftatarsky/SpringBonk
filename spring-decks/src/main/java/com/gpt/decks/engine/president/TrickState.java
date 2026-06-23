package com.gpt.decks.engine.president;

import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class TrickState {
  /** The set currently on top, or null at the start of a trick. */
  private Combo topCombo;
  /** Who laid the top set. */
  private String topOwner;
  /** Plays made during the current trick, oldest first. */
  private List<Play> plays = new ArrayList<>();

  public record Play(String playerId, Combo combo) {
  }
}
