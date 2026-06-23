package com.gpt.decks.engine.president;

import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * The complete, authoritative game state — plain, serializable data. Persisted
 * as the game snapshot and (redacted via {@code PresidentEngine.view}) sent to
 * clients.
 */
@Getter
@Setter
@NoArgsConstructor
public class GameState {
  private int round;
  /** 52-card decks shuffled together (1–4). */
  private int decks;
  /** Indexed by seat. */
  private List<PlayerState> players = new ArrayList<>();
  /** Seat whose turn it is. */
  private int turn;
  private TrickState trick = new TrickState();
  /** Players out of cards this round, best finisher first. */
  private List<String> finishingOrder = new ArrayList<>();
  /** Players who emptied their hand on a 2 — forced to the bottom. */
  private List<String> bottomed = new ArrayList<>();
  private Phase phase = Phase.PLAYING;
  /** Give-backs the President/VP still owe (chosen, not automatic). */
  private List<ExchangeDebt> pendingExchanges = new ArrayList<>();
  /** Final standings (best → worst) once the round is over. */
  private List<String> standings;
  /** Serializable RNG state for deterministic re-deals. */
  private int rngState;
}
