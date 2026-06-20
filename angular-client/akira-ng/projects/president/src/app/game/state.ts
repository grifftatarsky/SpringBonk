import { Card } from './card';
import { Combo } from './combo';

export type PlayerId = string;

/** Standings roles, assigned at the end of each round. */
export type Role = 'president' | 'vice-president' | 'citizen' | 'vice-asshole' | 'asshole';

export type Phase = 'playing' | 'exchange' | 'round-over';

/** An owed card transfer the giver still gets to *choose* (the President/VP). */
export interface ExchangeDebt {
  readonly from: PlayerId;
  readonly to: PlayerId;
  readonly count: number;
}

export interface PlayerState {
  readonly id: PlayerId;
  /** Fixed seat index (turn order). */
  readonly seat: number;
  readonly hand: Card[];
  /** Passed this trick — locked out until it ends. */
  passed: boolean;
  /** Out of cards (no longer in the round). */
  finished: boolean;
  /** Role carried from the previous round; drives the card swap. */
  role: Role | null;
}

export interface TrickState {
  /** The set currently on top, or null at the start of a trick. */
  topCombo: Combo | null;
  /** Who laid the top set. */
  topOwner: PlayerId | null;
  /** Plays made during the current trick, oldest first. */
  readonly plays: { playerId: PlayerId; combo: Combo }[];
}

/**
 * The complete, authoritative game state. Plain data only — fully serializable
 * for persistence and for sending (a redacted view of) it to networked clients.
 */
export interface GameState {
  round: number;
  /** Number of 52-card decks shuffled together for this game (1–4). */
  readonly decks: number;
  /** Indexed by seat. */
  readonly players: PlayerState[];
  /** Seat whose turn it is. */
  turn: number;
  trick: TrickState;
  /** Players out of cards this round, best finisher first. */
  readonly finishingOrder: PlayerId[];
  /** Players who emptied their hand on a 2 — forced to the bottom. */
  readonly bottomed: PlayerId[];
  phase: Phase;
  /** Card give-backs the President/VP still owe (chosen, not automatic). */
  readonly pendingExchanges: ExchangeDebt[];
  /** Final standings (best → worst) once the round is over. */
  standings: PlayerId[] | null;
  /** Serializable RNG state for deterministic re-deals. */
  rngState: number;
}
