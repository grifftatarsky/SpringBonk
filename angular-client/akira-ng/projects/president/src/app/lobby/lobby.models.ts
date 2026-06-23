/**
 * Lobby data model. This is a *mock* of what the game-service microservice will
 * own — games live in localStorage for now, so creating/continuing/finding games
 * works end-to-end without a backend. Kept plain + serializable to ease the swap
 * to real HTTP/WebSocket later.
 */

export type GameStatus = 'waiting' | 'active' | 'closed';
export type SeatKind = 'host' | 'human' | 'bot' | 'empty';

export interface Seat {
  /** Seat index (0 = host's seat). */
  readonly index: number;
  kind: SeatKind;
  /** Occupant's user id (null for bot/empty seats) — the reliable "is me" key. */
  userId: string | null;
  /** Occupant display name, or null when empty. */
  name: string | null;
  ready: boolean;
}

export interface LobbyGame {
  readonly id: string;
  /** Owner's user id (for host checks). */
  readonly ownerId: string;
  /** Owner's display name. */
  readonly host: string;
  /** 3–8. */
  readonly maxPlayers: number;
  /** 1–4 decks shuffled together. */
  readonly decks: number;
  status: GameStatus;
  seats: Seat[];
  readonly createdAt: number;
  updatedAt: number;
}

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 8;
export const MIN_DECKS = 1;
export const MAX_DECKS = 4;

/**
 * Suggested deck count for a player count — aim for a deep-ish hand (~16 cards)
 * so pairs/trips/quads actually show up. More decks ⇒ more duplicate ranks.
 */
export function suggestedDecks(maxPlayers: number): number {
  return Math.max(MIN_DECKS, Math.min(MAX_DECKS, Math.round((maxPlayers * 16) / 52)));
}

/** Cards each player is dealt for a given table size + deck count. */
export function cardsPerPlayer(maxPlayers: number, decks: number): number {
  return Math.floor((decks * 52) / maxPlayers);
}
