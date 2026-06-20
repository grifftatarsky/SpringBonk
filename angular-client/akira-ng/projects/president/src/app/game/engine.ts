import { Card, Rank, RANK_VALUE, sortedHand } from './card';
import { canFollow, Combo, isSingleTwo, isSkip, resolveCombo } from './combo';
import { deal } from './deck';
import { Rng } from './rng';
import { Action, GameEvent } from './actions';
import { GameState, Phase, PlayerId, PlayerState, Role } from './state';

/**
 * The authoritative President rules engine.
 *
 * Design for an eventual online (server-authoritative) system:
 *  - {@link GameState} is plain, serializable data — persist it, ship it.
 *  - The engine is the *only* thing that mutates state, and only via
 *    {@link dispatch}, which validates an {@link Action} and returns the
 *    {@link GameEvent}s it produced. Those map 1:1 onto network commands/events.
 *  - {@link view} returns a per-player redacted state (opponents' cards hidden)
 *    — what a server would actually send to each client.
 *  - Bots and the UI are adapters: they read state / a view and submit actions.
 *    The engine knows nothing about either.
 */
export class GameEngine {
  private constructor(private readonly _state: GameState) {}

  /** Starts a fresh game: deal round one and seat the 3♣ holder as leader. */
  static newGame(playerIds: readonly PlayerId[], seed: number, numDecks = 2): GameEngine {
    if (playerIds.length < 2) {
      throw new Error('President needs at least 2 players');
    }
    const decks = Math.max(1, Math.min(4, Math.round(numDecks)));
    const rng = new Rng(seed);
    const hands = deal(playerIds.length, rng, decks);
    const players: PlayerState[] = playerIds.map((id, seat) => ({
      id,
      seat,
      hand: sortedHand(hands[seat]),
      passed: false,
      finished: false,
      role: null,
    }));
    const state: GameState = {
      round: 1,
      decks,
      players,
      turn: firstLeaderSeat(players),
      trick: { topCombo: null, topOwner: null, plays: [] },
      finishingOrder: [],
      bottomed: [],
      phase: 'playing',
      pendingExchanges: [],
      standings: null,
      rngState: rng.state,
    };
    return new GameEngine(state);
  }

  /** Restore an engine around existing (e.g. persisted) state. */
  static fromState(state: GameState): GameEngine {
    return new GameEngine(state);
  }

  get state(): GameState {
    return this._state;
  }

  get phase(): Phase {
    return this._state.phase;
  }

  get currentPlayerId(): PlayerId {
    return this._state.players[this._state.turn].id;
  }

  /** Per-player redacted state: only `playerId` sees their own hand. */
  view(playerId: PlayerId): GameState {
    const s = this._state;
    return {
      ...s,
      players: s.players.map((p) => (p.id === playerId ? p : { ...p, hand: [] })),
    };
  }

  /** null when the action is legal, otherwise a human-readable reason. */
  validate(action: Action): string | null {
    const s = this._state;
    if (action.type === 'exchange') {
      if (s.phase !== 'exchange') {
        return 'not exchanging cards now';
      }
      const debt = s.pendingExchanges.find((e) => e.from === action.playerId);
      if (!debt) {
        return 'you have no cards to pass';
      }
      if (action.cardUids.length !== debt.count) {
        return `choose exactly ${debt.count} card${debt.count === 1 ? '' : 's'}`;
      }
      const giver = s.players.find((p) => p.id === action.playerId)!;
      return this.resolveCards(giver, action.cardUids) ? null : 'those cards are not in your hand';
    }
    if (s.phase !== 'playing') {
      return 'the round is not in play';
    }
    const player = s.players[s.turn];
    if (action.playerId !== player.id) {
      return 'not your turn';
    }
    if (action.type === 'pass') {
      return s.trick.topCombo === null ? 'cannot pass when leading' : null;
    }
    const cards = this.resolveCards(player, action.cardUids);
    if (!cards) {
      return 'those cards are not in your hand';
    }
    const combo = resolveCombo(cards);
    if (!combo) {
      return 'a play must be a single rank (7s may be wild)';
    }
    const top = s.trick.topCombo;
    if (top === null) {
      return null; // leading — any valid combo sets the count
    }
    if (isSingleTwo(combo)) {
      return null; // a single 2 always ends a trick
    }
    return canFollow(top, combo) ? null : 'must match the count and be equal or higher';
  }

  /** Apply an action, returning the events it produced. Throws if illegal. */
  dispatch(action: Action): GameEvent[] {
    const reason = this.validate(action);
    if (reason) {
      throw new Error(`Illegal action: ${reason}`);
    }
    if (action.type === 'exchange') {
      return this.applyExchange(action);
    }
    const s = this._state;
    const seat = s.turn;
    const player = s.players[seat];
    const events: GameEvent[] = [];

    if (action.type === 'pass') {
      player.passed = true;
      events.push({ type: 'passed', playerId: player.id });
      this.afterPass(seat, events);
      return events;
    }

    const cards = this.resolveCards(player, action.cardUids)!;
    const combo = resolveCombo(cards)!;
    const prevTop = s.trick.topCombo;

    const uids = new Set(action.cardUids);
    setHand(player, player.hand.filter((c) => !uids.has(c.uid)));
    s.trick.plays.push({ playerId: player.id, combo });
    s.trick.topCombo = combo;
    s.trick.topOwner = player.id;
    events.push({ type: 'played', playerId: player.id, combo });

    if (player.hand.length === 0) {
      player.finished = true;
      if (combo.cards.some((c) => c.rank === '2')) {
        // Can't win on a 2 — forced to the bottom instead of finishing.
        s.bottomed.push(player.id);
        events.push({ type: 'player-bottomed', playerId: player.id });
      } else {
        s.finishingOrder.push(player.id);
        events.push({ type: 'player-finished', playerId: player.id, place: s.finishingOrder.length });
      }
    }

    // A single 2 ends the trick outright (trump).
    if (prevTop !== null && isSingleTwo(combo)) {
      this.endTrick(seat, events);
      this.checkRoundOver(events);
      return events;
    }

    // Matching the rank skips players; covering everyone else wins the trick.
    if (prevTop !== null && isSkip(prevTop, combo)) {
      const ring = this.activeRingFrom(seat);
      const others = ring.filter((seatIdx) => seatIdx !== seat);
      if (combo.count >= others.length) {
        if (others.length) {
          events.push({ type: 'skipped', playerIds: others.map((idx) => s.players[idx].id) });
        }
        this.endTrick(seat, events);
        this.checkRoundOver(events);
        return events;
      }
      const skipped = ring.slice(0, combo.count);
      if (skipped.length) {
        events.push({ type: 'skipped', playerIds: skipped.map((idx) => s.players[idx].id) });
      }
      const target = ring[combo.count % ring.length];
      s.turn = target;
      events.push({ type: 'turn-changed', playerId: s.players[target].id });
      this.checkRoundOver(events);
      return events;
    }

    // Normal: a higher play (or the lead) passes to the next active player.
    this.advance(seat, events);
    this.checkRoundOver(events);
    return events;
  }

  /**
   * Begin the next round: re-deal, apply the *mandatory* takes (the Asshole's
   * best cards go up to the President; the Vice-Asshole's best to the VP), and
   * enter the exchange phase recording what the President/VP still owe back —
   * which they get to choose via {@link dispatch} `exchange` actions. With no
   * debts (e.g. nobody had a role), play starts immediately.
   */
  beginExchange(): GameEvent[] {
    const s = this._state;
    if (s.phase !== 'round-over') {
      throw new Error('the current round is not over');
    }
    const events: GameEvent[] = [];

    const rng = Rng.fromState(s.rngState);
    const hands = deal(s.players.length, rng, s.decks);
    s.players.forEach((p, i) => {
      setHand(p, sortedHand(hands[i]));
      p.passed = false;
      p.finished = false;
    });
    s.rngState = rng.state;

    this.mandatoryTakes();
    s.players.forEach((p) => setHand(p, sortedHand(p.hand)));

    s.trick.topCombo = null;
    s.trick.topOwner = null;
    s.trick.plays.length = 0;
    s.finishingOrder.length = 0;
    s.bottomed.length = 0;
    s.standings = null;
    s.round += 1;

    s.pendingExchanges.length = 0;
    const byRole = (role: Role): PlayerState | undefined => s.players.find((p) => p.role === role);
    const president = byRole('president');
    const vp = byRole('vice-president');
    const asshole = byRole('asshole');
    const viceAsshole = byRole('vice-asshole');
    if (president && asshole && president.id !== asshole.id) {
      s.pendingExchanges.push({ from: president.id, to: asshole.id, count: 2 });
    }
    if (vp && viceAsshole && vp.id !== viceAsshole.id) {
      s.pendingExchanges.push({ from: vp.id, to: viceAsshole.id, count: 1 });
    }

    if (s.pendingExchanges.length === 0) {
      this.startPlay(events);
    } else {
      s.phase = 'exchange';
    }
    return events;
  }

  private applyExchange(action: Extract<Action, { type: 'exchange' }>): GameEvent[] {
    const s = this._state;
    const events: GameEvent[] = [];
    const idx = s.pendingExchanges.findIndex((e) => e.from === action.playerId);
    const debt = s.pendingExchanges[idx];
    const from = s.players.find((p) => p.id === debt.from)!;
    const to = s.players.find((p) => p.id === debt.to)!;
    const cards = this.resolveCards(from, action.cardUids)!;
    moveCards(from, to, cards);
    setHand(from, sortedHand(from.hand));
    setHand(to, sortedHand(to.hand));
    s.pendingExchanges.splice(idx, 1);
    events.push({ type: 'exchanged', from: debt.from, to: debt.to, count: debt.count });
    if (s.pendingExchanges.length === 0) {
      this.startPlay(events);
    }
    return events;
  }

  private mandatoryTakes(): void {
    const s = this._state;
    const byRole = (role: Role): PlayerState | undefined => s.players.find((p) => p.role === role);
    const president = byRole('president');
    const vp = byRole('vice-president');
    const asshole = byRole('asshole');
    const viceAsshole = byRole('vice-asshole');
    if (president && asshole && president.id !== asshole.id) {
      moveCards(asshole, president, takeBest(asshole, 2));
    }
    if (vp && viceAsshole && vp.id !== viceAsshole.id) {
      moveCards(viceAsshole, vp, takeBest(viceAsshole, 1));
    }
  }

  /** Finalise the exchange: sort hands, seat the Asshole, and start play. */
  private startPlay(events: GameEvent[]): void {
    const s = this._state;
    s.players.forEach((p) => setHand(p, sortedHand(p.hand)));
    s.phase = 'playing';
    const asshole = s.players.find((p) => p.role === 'asshole');
    s.turn = asshole ? asshole.seat : 0;
    events.push({ type: 'round-started', round: s.round, leaderId: s.players[s.turn].id });
    events.push({ type: 'turn-changed', playerId: s.players[s.turn].id });
  }

  /**
   * Every legal play for the player on turn, one representative per rank+count
   * (the specific duplicate copy chosen doesn't matter). Used by bots and to
   * offer the human legal moves. Passing is legal whenever this list is allowed
   * to be empty and a trick is in progress.
   */
  legalPlays(playerId: PlayerId): Action[] {
    const s = this._state;
    if (s.phase !== 'playing' || s.players[s.turn].id !== playerId) {
      return [];
    }
    const hand = s.players[s.turn].hand;
    const sevens = hand.filter((c) => c.rank === '7');
    const byRank = new Map<Rank, Card[]>();
    for (const c of hand) {
      if (c.rank === '7') {
        continue;
      }
      const list = byRank.get(c.rank);
      if (list) {
        list.push(c);
      } else {
        byRank.set(c.rank, [c]);
      }
    }

    const top = s.trick.topCombo;
    const minRank = top ? RANK_VALUE[top.rank] : -1;
    const plays: Action[] = [];
    const add = (cards: Card[]): void => {
      plays.push({ type: 'play', playerId, cardUids: cards.map((c) => c.uid) });
    };

    // A single 2 is always a legal trump ender when following a multi-card trick
    // (the count==1 case is already enumerated as a normal rank below).
    if (top && top.count > 1) {
      const two = hand.find((c) => c.rank === '2');
      if (two) {
        add([two]);
      }
    }

    const emit = (real: Card[], rankValue: number): void => {
      if (top && rankValue < minRank) {
        return;
      }
      const maxWith = real.length + sevens.length;
      const counts = top ? (top.count <= maxWith ? [top.count] : []) : range(1, maxWith);
      for (const k of counts) {
        const useReal = real.slice(0, Math.min(real.length, k));
        const need = k - useReal.length;
        if (useReal.length >= 1 && need >= 0 && need <= sevens.length) {
          add([...useReal, ...sevens.slice(0, need)]);
        }
      }
    };

    for (const [rank, cards] of byRank) {
      emit(cards, RANK_VALUE[rank]);
    }
    // Pure sevens (a natural 7 / pair of 7s …).
    if (sevens.length > 0) {
      const rv = RANK_VALUE['7'];
      if (!top || rv >= minRank) {
        const counts = top ? (top.count <= sevens.length ? [top.count] : []) : range(1, sevens.length);
        for (const k of counts) {
          add(sevens.slice(0, k));
        }
      }
    }
    return plays;
  }

  /** Resolve a player's chosen card uids to the Combo they'd form, or null. */
  comboOf(playerId: PlayerId, uids: readonly string[]): Combo | null {
    const player = this._state.players.find((p) => p.id === playerId);
    if (!player) {
      return null;
    }
    const cards = this.resolveCards(player, uids);
    return cards ? resolveCombo(cards) : null;
  }

  // --- internals -----------------------------------------------------------

  private resolveCards(player: PlayerState, uids: readonly string[]): Card[] | null {
    if (uids.length === 0) {
      return null;
    }
    const cards: Card[] = [];
    const seen = new Set<string>();
    for (const uid of uids) {
      if (seen.has(uid)) {
        return null;
      }
      seen.add(uid);
      const card = player.hand.find((c) => c.uid === uid);
      if (!card) {
        return null;
      }
      cards.push(card);
    }
    return cards;
  }

  /** Active (not passed, not finished) seats, cyclically ordered after `seat`. */
  private activeRingFrom(seat: number): number[] {
    const active = this._state.players
      .filter((p) => !p.passed && !p.finished)
      .map((p) => p.seat)
      .sort((a, b) => a - b);
    if (active.length === 0) {
      return [];
    }
    let start = active.findIndex((sIdx) => sIdx > seat);
    if (start === -1) {
      start = 0;
    }
    return active.map((_, i) => active[(start + i) % active.length]);
  }

  private advance(fromSeat: number, events: GameEvent[]): void {
    const ring = this.activeRingFrom(fromSeat);
    if (ring.length === 0) {
      return;
    }
    this._state.turn = ring[0];
    events.push({ type: 'turn-changed', playerId: this._state.players[ring[0]].id });
  }

  private afterPass(passerSeat: number, events: GameEvent[]): void {
    const s = this._state;
    const ring = this.activeRingFrom(passerSeat);
    if (ring.length === 0) {
      if (s.trick.topOwner) {
        this.endTrick(this.seatOf(s.trick.topOwner), events);
        this.checkRoundOver(events);
      }
      return;
    }
    const next = ring[0];
    if (s.trick.topOwner && s.players[next].id === s.trick.topOwner) {
      // Back to the player who holds the top — everyone else passed.
      this.endTrick(next, events);
      this.checkRoundOver(events);
    } else {
      s.turn = next;
      events.push({ type: 'turn-changed', playerId: s.players[next].id });
    }
  }

  private endTrick(winnerSeat: number, events: GameEvent[]): void {
    const s = this._state;
    events.push({ type: 'trick-won', playerId: s.players[winnerSeat].id });
    s.trick.topCombo = null;
    s.trick.topOwner = null;
    s.trick.plays.length = 0;
    for (const p of s.players) {
      if (!p.finished) {
        p.passed = false;
      }
    }
    // The winner leads next; if they just went out, the next player with cards does.
    let lead = winnerSeat;
    if (s.players[winnerSeat].finished) {
      lead = this.nextWithCardsFrom(winnerSeat);
    }
    if (lead >= 0) {
      s.turn = lead;
      events.push({ type: 'turn-changed', playerId: s.players[lead].id });
    }
  }

  private nextWithCardsFrom(seat: number): number {
    const withCards = this._state.players
      .filter((p) => !p.finished)
      .map((p) => p.seat)
      .sort((a, b) => a - b);
    if (withCards.length === 0) {
      return -1;
    }
    let idx = withCards.findIndex((sIdx) => sIdx > seat);
    if (idx === -1) {
      idx = 0;
    }
    return withCards[idx];
  }

  private seatOf(playerId: PlayerId): number {
    return this._state.players.findIndex((p) => p.id === playerId);
  }

  private checkRoundOver(events: GameEvent[]): void {
    const s = this._state;
    if (s.phase !== 'playing') {
      return;
    }
    const withCards = s.players.filter((p) => !p.finished);
    if (withCards.length > 1) {
      return;
    }
    const standings: PlayerId[] = [...s.finishingOrder];
    if (withCards.length === 1) {
      standings.push(withCards[0].id);
    }
    standings.push(...s.bottomed); // ended on a 2 → worst, asshole last
    s.standings = standings;
    s.phase = 'round-over';

    const roles = assignRoles(standings);
    for (const p of s.players) {
      p.role = roles.get(p.id) ?? 'citizen';
    }
    events.push({ type: 'round-over', standings, roles });
  }

}

// --- module-private helpers ------------------------------------------------

function setHand(player: PlayerState, cards: Card[]): void {
  player.hand.length = 0;
  player.hand.push(...cards);
}

function moveCards(from: PlayerState, to: PlayerState, cards: Card[]): void {
  const uids = new Set(cards.map((c) => c.uid));
  setHand(from, from.hand.filter((c) => !uids.has(c.uid)));
  to.hand.push(...cards);
}

function takeBest(player: PlayerState, k: number): Card[] {
  return sortedHand(player.hand).slice(-k);
}

function assignRoles(standings: readonly PlayerId[]): Map<PlayerId, Role> {
  const roles = new Map<PlayerId, Role>();
  const n = standings.length;
  standings.forEach((id) => roles.set(id, 'citizen'));
  if (n >= 1) {
    roles.set(standings[0], 'president');
  }
  if (n >= 2) {
    roles.set(standings[n - 1], 'asshole');
  }
  if (n >= 4) {
    roles.set(standings[1], 'vice-president');
    roles.set(standings[n - 2], 'vice-asshole');
  }
  return roles;
}

/**
 * Game-one lead: the holder of the 3♣. With two decks, two players can hold a
 * 3♣ — break the tie by whoever's hand is lower comparing next-lowest cards by
 * rank (3♣ 3♠ leads over 3♣ 4♠).
 */
export function firstLeaderSeat(players: readonly PlayerState[]): number {
  const candidates = players.filter((p) =>
    p.hand.some((c) => c.rank === '3' && c.suit === 'C'),
  );
  if (candidates.length === 0) {
    return 0;
  }
  let best = candidates[0];
  for (let i = 1; i < candidates.length; i++) {
    if (compareHandsByRank(candidates[i].hand, best.hand) < 0) {
      best = candidates[i];
    }
  }
  return best.seat;
}

/** Lexicographic compare of two hands by ascending rank (suit/uid ignored). */
function compareHandsByRank(a: readonly Card[], b: readonly Card[]): number {
  const ra = a.map((c) => RANK_VALUE[c.rank]).sort((x, y) => x - y);
  const rb = b.map((c) => RANK_VALUE[c.rank]).sort((x, y) => x - y);
  const n = Math.min(ra.length, rb.length);
  for (let i = 0; i < n; i++) {
    if (ra[i] !== rb[i]) {
      return ra[i] - rb[i];
    }
  }
  return ra.length - rb.length;
}

function range(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let i = lo; i <= hi; i++) {
    out.push(i);
  }
  return out;
}
