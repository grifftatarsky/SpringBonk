/**
 * Card domain — the single source of truth for ranks, suits and cards, shared by
 * the rules engine and the renderer. Pure and serializable: no classes with
 * behaviour, just plain data + free functions, so a card crosses the wire (and a
 * future server boundary) unchanged.
 *
 * House rules: two standard decks, no jokers.
 */

export const SUITS = ['C', 'D', 'H', 'S'] as const;
export type Suit = (typeof SUITS)[number];

/**
 * Ranks ordered by President strength, weakest (3) to strongest. The 2 sits
 * above the Ace because a 2 beats everything and ends a trick.
 */
export const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'] as const;
export type Rank = (typeof RANKS)[number];

/** Strength of each rank (0 = weakest 3 … 12 = strongest 2). */
export const RANK_VALUE: Readonly<Record<Rank, number>> = RANKS.reduce(
  (acc, rank, i) => ((acc[rank] = i), acc),
  {} as Record<Rank, number>,
);

const SUIT_VALUE: Readonly<Record<Suit, number>> = SUITS.reduce(
  (acc, suit, i) => ((acc[suit] = i), acc),
  {} as Record<Suit, number>,
);

export const SUIT_GLYPH: Readonly<Record<Suit, string>> = {
  C: '♣',
  D: '♦',
  H: '♥',
  S: '♠',
};

/** Rank+suit identity, used for the renderer's atlas (52 distinct faces). */
export type CardId = `${Rank}${Suit}`;

/**
 * A physical card. Because two decks are in play, rank+suit is not unique — the
 * {@link Card.uid} identifies the individual card (e.g. when a player plays one
 * of their two 3♣).
 */
export interface Card {
  readonly rank: Rank;
  readonly suit: Suit;
  /** Stable per-physical-card id, e.g. "3C#0", "3C#1". */
  readonly uid: string;
}

export function cardFace(card: Card): CardId {
  return `${card.rank}${card.suit}`;
}

export function isSeven(card: Card): boolean {
  return card.rank === '7';
}

export function isTwo(card: Card): boolean {
  return card.rank === '2';
}

export function rankValue(rank: Rank): number {
  return RANK_VALUE[rank];
}

/**
 * Total order over cards: by President rank, then suit, then uid. Used for
 * sorting hands and for the game-one "lowest hand" lead tie-break.
 */
export function compareCards(a: Card, b: Card): number {
  return (
    RANK_VALUE[a.rank] - RANK_VALUE[b.rank] ||
    SUIT_VALUE[a.suit] - SUIT_VALUE[b.suit] ||
    (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0)
  );
}

/** Ascending copy of a hand (weakest card first). */
export function sortedHand(cards: readonly Card[]): Card[] {
  return [...cards].sort(compareCards);
}

/** The 52 distinct faces in atlas order (the game plays two of each). */
export function faceIds(): CardId[] {
  const ids: CardId[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      ids.push(`${rank}${suit}`);
    }
  }
  return ids;
}
