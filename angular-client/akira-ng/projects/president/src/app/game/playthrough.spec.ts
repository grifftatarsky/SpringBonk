import { describe, expect, it } from 'vitest';
import { GameEngine } from './engine';
import { chooseBotAction } from './bot';
import { chooseGiveBack } from './exchange';

const IDS = ['p0', 'p1', 'p2', 'p3'];

function playRound(engine: GameEngine): void {
  let guard = 0;
  while (engine.phase === 'playing') {
    engine.dispatch(chooseBotAction(engine, engine.currentPlayerId)); // throws if illegal
    if (++guard > 10000) {
      throw new Error('round did not terminate');
    }
  }
}

describe('full bot playthrough', () => {
  it('four bots play a round to completion with only legal moves, across seeds', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const engine = GameEngine.newGame(IDS, seed);
      playRound(engine);
      expect(engine.state.standings).not.toBeNull();
      expect(engine.state.standings!.length).toBe(4);
      expect(new Set(engine.state.standings)).toEqual(new Set(IDS));
    }
  });

  it('the next round re-deals, exchanges, and is led by the Asshole', () => {
    const engine = GameEngine.newGame(IDS, 7);
    playRound(engine);
    const asshole = engine.state.players.find((p) => p.role === 'asshole')!;

    engine.beginExchange();
    expect(engine.phase).toBe('exchange');
    // Resolve every owed give-back with the set-protecting heuristic.
    let guard = 0;
    while (engine.state.pendingExchanges.length > 0) {
      const debt = engine.state.pendingExchanges[0];
      const giver = engine.state.players.find((p) => p.id === debt.from)!;
      const give = chooseGiveBack(giver.hand, debt.count);
      engine.dispatch({ type: 'exchange', playerId: debt.from, cardUids: give.map((c) => c.uid) });
      if (++guard > 10) {
        throw new Error('exchange did not resolve');
      }
    }

    expect(engine.phase).toBe('playing');
    expect(engine.state.round).toBe(2);
    expect(engine.currentPlayerId).toBe(asshole.id);
    const total = engine.state.players.reduce((sum, p) => sum + p.hand.length, 0);
    expect(total).toBe(104);
  });
});
