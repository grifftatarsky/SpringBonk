import { Card, Rank, RANK_VALUE } from './card';

/**
 * A resolved, legal play: a set of cards reduced to a single rank and a count.
 * Sevens are wild *only alongside another card* — they copy the rank of the
 * non-seven cards. So `3 + 7` resolves to a pair of 3s; `J J 7` to three Jacks;
 * `7` to a single 7; `7 7` to a natural pair of 7s.
 */
export interface Combo {
  readonly rank: Rank;
  readonly count: number;
  readonly cards: readonly Card[];
}

/**
 * Resolves a set of cards into a {@link Combo}, or returns null when it isn't a
 * single rank (e.g. mixing a 3 and a 5 with no wild bridge between them).
 */
export function resolveCombo(cards: readonly Card[]): Combo | null {
  if (cards.length === 0) {
    return null;
  }
  const nonSevens = cards.filter((c) => c.rank !== '7');
  let rank: Rank;
  if (nonSevens.length === 0) {
    rank = '7'; // all sevens → natural sevens
  } else {
    rank = nonSevens[0].rank;
    if (!nonSevens.every((c) => c.rank === rank)) {
      return null; // two different real ranks can't form one set
    }
  }
  return { rank, count: cards.length, cards: [...cards] };
}

/** A lone 2 — the universal trick-ender (trump), playable on any count. */
export function isSingleTwo(combo: Combo): boolean {
  return combo.count === 1 && combo.rank === '2';
}

/**
 * Whether `next` may legally be played on top of `top` in an ongoing trick:
 * same count, equal-or-higher rank. A single 2 is handled separately by the
 * engine (it can always be played to end a trick) and is not required here.
 */
export function canFollow(top: Combo, next: Combo): boolean {
  return next.count === top.count && RANK_VALUE[next.rank] >= RANK_VALUE[top.rank];
}

/** True when `next` ties `top`'s rank — the move that triggers a skip. */
export function isSkip(top: Combo, next: Combo): boolean {
  return next.count === top.count && RANK_VALUE[next.rank] === RANK_VALUE[top.rank];
}

const COUNT_WORD = ['', 'Single', 'Pair', 'Three', 'Four', 'Five', 'Six'] as const;

/** Friendly label for a combo, e.g. "Pair of 5s", "Three Js (wild 7)". */
export function describeCombo(combo: Combo): string {
  const word = COUNT_WORD[combo.count] ?? `${combo.count}×`;
  const wild = combo.rank !== '7' && combo.cards.some((c) => c.rank === '7') ? ' (wild 7)' : '';
  const noun = combo.count === 1 ? `a ${combo.rank}` : `${combo.rank}s`;
  return combo.count === 1 ? `${combo.rank}${wild}` : `${word} of ${noun}${wild}`;
}
