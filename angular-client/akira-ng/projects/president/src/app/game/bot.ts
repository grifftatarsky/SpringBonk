import { Card, Rank, RANK_VALUE } from './card';
import { Combo } from './combo';
import { Action } from './actions';
import { GameEngine } from './engine';
import { PlayerId } from './state';

interface Candidate {
  action: Extract<Action, { type: 'play' }>;
  combo: Combo;
  cost: number;
}

/**
 * A simple, deterministic heuristic opponent. It scores every legal play and
 * picks the cheapest, where "cheap" encodes a few priorities (in order):
 *
 *  1. Don't split a pair/triple/quad — those are worth keeping whole.
 *  2. Don't spend 7s as plain 7s; save them to use as wildcards.
 *  3. Hoard the trump 2s.
 *  4. Otherwise, shed the lowest card you can.
 *
 * So it will play a lone 9 over breaking a pair of 6s, and won't burn a 7 just
 * to get under a low lead. Pure w.r.t. the engine, so it could run server-side.
 */
export function chooseBotAction(engine: GameEngine, botId: PlayerId): Action {
  const state = engine.state;
  const me = state.players.find((p) => p.id === botId)!;
  const top = state.trick.topCombo;
  const held = countByRank(me.hand);

  const candidates: Candidate[] = [];
  for (const action of engine.legalPlays(botId)) {
    if (action.type !== 'play') {
      continue;
    }
    const combo = engine.comboOf(botId, action.cardUids);
    if (combo) {
      candidates.push({ action, combo, cost: playCost(combo, held) });
    }
  }
  if (candidates.length === 0) {
    return { type: 'pass', playerId: botId };
  }

  candidates.sort((a, b) => a.cost - b.cost);
  const best = candidates[0];

  // When following, don't waste a trump 2 to win a minor trick while you still
  // hold plenty of cards — pass and keep it.
  if (top && best.combo.rank === '2' && me.hand.length > 5) {
    return { type: 'pass', playerId: botId };
  }
  return best.action;
}

function countByRank(hand: readonly Card[]): Map<Rank, number> {
  const counts = new Map<Rank, number>();
  for (const card of hand) {
    counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1);
  }
  return counts;
}

function playCost(combo: Combo, held: Map<Rank, number>): number {
  const isNatural7 = combo.rank === '7';
  const wildSevens = isNatural7 ? 0 : combo.cards.filter((c) => c.rank === '7').length;
  const realOfRank = combo.cards.filter((c) => c.rank === combo.rank).length;
  // Cards of this rank left behind if we play this — i.e. how much we'd split.
  const broken = Math.max(0, (held.get(combo.rank) ?? 0) - realOfRank);

  let cost = RANK_VALUE[combo.rank]; // prefer to shed low cards (tie-breaker)
  cost += broken * 200; // strongly avoid splitting a set
  cost += wildSevens * 25; // spend wild 7s only when they buy something
  if (isNatural7) {
    cost += 500; // never burn 7s as plain 7s
  }
  if (combo.rank === '2') {
    cost += 400; // hoard the trump 2s
  }
  return cost;
}
