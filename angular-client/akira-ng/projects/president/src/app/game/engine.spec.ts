import { describe, expect, it } from 'vitest';
import { Card, Rank, Suit } from './card';
import { GameEngine, firstLeaderSeat } from './engine';
import { GameEvent } from './actions';
import { GameState, PlayerState } from './state';

function card(rank: Rank, suit: Suit): Card {
  return { rank, suit, uid: `${rank}${suit}` };
}
function player(id: string, seat: number, cards: Card[]): PlayerState {
  return { id, seat, hand: cards, passed: false, finished: false, role: null };
}
function gameState(players: PlayerState[], turn: number): GameState {
  return {
    round: 1,
    decks: 2,
    players,
    turn,
    trick: { topCombo: null, topOwner: null, plays: [] },
    finishingOrder: [],
    bottomed: [],
    phase: 'playing',
    pendingExchanges: [],
    standings: null,
    rngState: 0,
  };
}
function play(engine: GameEngine, playerId: string, uids: string[]): GameEvent[] {
  return engine.dispatch({ type: 'play', playerId, cardUids: uids });
}

describe('firstLeaderSeat — game one', () => {
  it('seats the sole 3♣ holder', () => {
    const a = player('A', 0, [card('5', 'C')]);
    const b = player('B', 1, [card('3', 'C'), card('7', 'S')]);
    expect(firstLeaderSeat([a, b])).toBe(1);
  });

  it('breaks a two-deck 3♣ tie by the next-lowest card (3♣3♠ beats 3♣4♠)', () => {
    const a = player('A', 0, [card('3', 'C'), card('4', 'S'), card('9', 'H')]);
    const b = player('B', 1, [card('3', 'C'), card('3', 'S'), card('K', 'H')]);
    const c = player('C', 2, [card('6', 'D'), card('8', 'S')]);
    expect(firstLeaderSeat([a, b, c])).toBe(1);
  });
});

describe('trick resolution', () => {
  it('matching a pair skips the next two players', () => {
    const a = player('A', 0, [card('3', 'C'), card('3', 'D'), card('9', 'S'), card('9', 'H')]);
    const b = player('B', 1, [card('3', 'H'), card('3', 'S'), card('8', 'C'), card('8', 'D')]);
    const c = player('C', 2, [card('4', 'C'), card('4', 'D')]);
    const d = player('D', 3, [card('5', 'C'), card('5', 'D')]);
    const engine = GameEngine.fromState(gameState([a, b, c, d], 0));

    play(engine, 'A', ['3C', '3D']);
    expect(engine.currentPlayerId).toBe('B');

    const events = play(engine, 'B', ['3H', '3S']);
    // C and D are skipped; turn returns to A.
    expect(engine.currentPlayerId).toBe('A');
    expect(events).toContainEqual({ type: 'skipped', playerIds: ['C', 'D'] });
  });

  it('three-of-a-kind on three-of-a-kind closes the trick in a 4-player game', () => {
    const a = player('A', 0, [card('4', 'C'), card('4', 'D'), card('4', 'H'), card('9', 'S')]);
    // B forms three 4s with one 4 and two wild 7s, keeping a filler so it stays in to lead.
    const b = player('B', 1, [card('4', 'S'), card('7', 'C'), card('7', 'D'), card('8', 'C')]);
    const c = player('C', 2, [card('6', 'C'), card('6', 'D'), card('6', 'H')]);
    const d = player('D', 3, [card('9', 'C'), card('9', 'D'), card('9', 'H')]);
    const engine = GameEngine.fromState(gameState([a, b, c, d], 0));

    play(engine, 'A', ['4C', '4D', '4H']);
    expect(engine.currentPlayerId).toBe('B');

    const events = play(engine, 'B', ['4S', '7C', '7D']);
    expect(engine.state.trick.topCombo).toBeNull(); // trick closed
    expect(engine.currentPlayerId).toBe('B'); // winner leads the next trick
    expect(events).toContainEqual({ type: 'trick-won', playerId: 'B' });
  });

  it('a single 2 ends a trick as trump', () => {
    const a = player('A', 0, [card('5', 'C'), card('5', 'D'), card('9', 'S')]);
    const b = player('B', 1, [card('2', 'H'), card('8', 'C'), card('8', 'D')]);
    const engine = GameEngine.fromState(gameState([a, b], 0));

    play(engine, 'A', ['5C', '5D']);
    const events = play(engine, 'B', ['2H']);
    expect(engine.state.trick.topCombo).toBeNull(); // trick cleared
    expect(engine.currentPlayerId).toBe('B'); // winner leads
    expect(events).toContainEqual({ type: 'trick-won', playerId: 'B' });
  });

  it('you cannot win on a 2 — finishing on one drops you to Asshole', () => {
    const a = player('A', 0, [card('2', 'H')]);
    const b = player('B', 1, [card('3', 'C'), card('4', 'D')]);
    const engine = GameEngine.fromState(gameState([a, b], 0));

    const events = play(engine, 'A', ['2H']);
    expect(events).toContainEqual({ type: 'player-bottomed', playerId: 'A' });
    expect(engine.state.phase).toBe('round-over');
    expect(engine.state.standings).toEqual(['B', 'A']);
    expect(engine.state.players[0].role).toBe('asshole');
    expect(engine.state.players[1].role).toBe('president');
  });

  it('a PAIR of 2s as your last cards also drops you to Asshole', () => {
    // C and D are already out; A sheds a pair of 2s while B still holds a card.
    const a = player('A', 0, [card('2', 'C'), card('2', 'D')]);
    const b = player('B', 1, [card('3', 'C')]);
    const c = player('C', 2, []);
    const d = player('D', 3, []);
    c.finished = true;
    d.finished = true;
    const state = gameState([a, b, c, d], 0);
    (state.finishingOrder as string[]).push('C', 'D');
    const engine = GameEngine.fromState(state);

    const events = play(engine, 'A', ['2C', '2D']);

    expect(events).toContainEqual({ type: 'player-bottomed', playerId: 'A' });
    expect(engine.state.phase).toBe('round-over');
    expect(engine.state.standings).toEqual(['C', 'D', 'B', 'A']);
    expect(engine.state.players[0].role).toBe('asshole'); // A, on the pair of 2s
    expect(engine.state.players[1].role).toBe('vice-asshole'); // B, lone survivor
  });
});
