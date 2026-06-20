import { describe, expect, it } from 'vitest';
import { Card, Rank, Suit } from './card';
import { canFollow, isSingleTwo, isSkip, resolveCombo } from './combo';

let seq = 0;
function c(rank: Rank, suit: Suit = 'C'): Card {
  return { rank, suit, uid: `${rank}${suit}#${seq++}` };
}

describe('resolveCombo — the wild 7', () => {
  it('a lone 7 is a natural 7', () => {
    expect(resolveCombo([c('7')])).toMatchObject({ rank: '7', count: 1 });
  });

  it('a 7 with another card copies that rank (3 + 7 = pair of 3s)', () => {
    expect(resolveCombo([c('3'), c('7')])).toMatchObject({ rank: '3', count: 2 });
  });

  it('J + J + 7 = three Jacks', () => {
    expect(resolveCombo([c('J'), c('J'), c('7')])).toMatchObject({ rank: 'J', count: 3 });
  });

  it('two 7s alone are a natural pair of 7s', () => {
    expect(resolveCombo([c('7'), c('7')])).toMatchObject({ rank: '7', count: 2 });
  });

  it('two different real ranks cannot form one set', () => {
    expect(resolveCombo([c('3'), c('5')])).toBeNull();
  });

  it('an empty play is invalid', () => {
    expect(resolveCombo([])).toBeNull();
  });

  it('a single 2 is recognised as the trump ender', () => {
    const combo = resolveCombo([c('2')])!;
    expect(isSingleTwo(combo)).toBe(true);
  });
});

describe('following and skipping', () => {
  it('equal-or-higher of the same count may follow', () => {
    const top = resolveCombo([c('5'), c('5')])!;
    expect(canFollow(top, resolveCombo([c('5'), c('5')])!)).toBe(true); // equal
    expect(canFollow(top, resolveCombo([c('K'), c('K')])!)).toBe(true); // higher
    expect(canFollow(top, resolveCombo([c('4'), c('4')])!)).toBe(false); // lower
    expect(canFollow(top, resolveCombo([c('K')])!)).toBe(false); // wrong count
  });

  it('matching the rank is a skip; beating higher is not', () => {
    const top = resolveCombo([c('5'), c('5')])!;
    expect(isSkip(top, resolveCombo([c('5'), c('5')])!)).toBe(true);
    expect(isSkip(top, resolveCombo([c('K'), c('K')])!)).toBe(false);
  });
});
