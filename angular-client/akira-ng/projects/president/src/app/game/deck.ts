import { Card, RANKS, SUITS } from './card';
import { Rng } from './rng';

/** Builds `numDecks` standard 52-card decks (no jokers) with unique uids. */
export function buildDeck(numDecks = 2): Card[] {
  const cards: Card[] = [];
  for (let copy = 0; copy < numDecks; copy++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ rank, suit, uid: `${rank}${suit}#${copy}` });
      }
    }
  }
  return cards;
}

/**
 * Shuffles a fresh two-deck shoe and deals it round-robin to `playerCount`
 * players. Hands may differ in size by one card when 104 doesn't divide evenly.
 */
export function deal(playerCount: number, rng: Rng, numDecks = 2): Card[][] {
  const shoe = rng.shuffle(buildDeck(numDecks));
  const hands: Card[][] = Array.from({ length: playerCount }, () => []);
  shoe.forEach((card, i) => hands[i % playerCount].push(card));
  return hands;
}
