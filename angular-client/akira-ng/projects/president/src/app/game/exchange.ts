import { Card, Rank, RANK_VALUE } from './card';

/**
 * Picks `k` cards to give back down the table (President → Asshole, VP → Vice-
 * Asshole). You hand over your weakest cards — but never break a triple or quad
 * to do it if you can avoid it: keeping four 3s together is worth more than the
 * two lowest cards. Used by bots, and offered to the human as a starting point.
 */
export function chooseGiveBack(hand: readonly Card[], k: number): Card[] {
  const byRank = new Map<Rank, number>();
  for (const c of hand) {
    byRank.set(c.rank, (byRank.get(c.rank) ?? 0) + 1);
  }
  const ranked = [...hand].sort((a, b) => {
    const protectA = (byRank.get(a.rank) ?? 0) >= 3 ? 1 : 0;
    const protectB = (byRank.get(b.rank) ?? 0) >= 3 ? 1 : 0;
    // Give up non-set cards first, lowest rank first; break sets only if forced.
    return protectA - protectB || RANK_VALUE[a.rank] - RANK_VALUE[b.rank];
  });
  return ranked.slice(0, k);
}
