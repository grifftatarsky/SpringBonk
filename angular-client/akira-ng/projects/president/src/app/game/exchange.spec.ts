import { describe, expect, it } from 'vitest';
import { Card, Rank, Suit } from './card';
import { chooseGiveBack } from './exchange';

let seq = 0;
function c(rank: Rank, suit: Suit = 'C'): Card {
  return { rank, suit, uid: `${rank}${suit}#${seq++}` };
}
function ranks(cards: Card[]): Rank[] {
  return cards.map((x) => x.rank).sort();
}

describe('chooseGiveBack — protect your sets', () => {
  it('keeps a quad of 3s and gives the next-lowest singles instead', () => {
    const hand = [c('3', 'C'), c('3', 'D'), c('3', 'H'), c('3', 'S'), c('4'), c('5')];
    // Naive "lowest two" would hand over two 3s; we must keep the quad.
    expect(ranks(chooseGiveBack(hand, 2))).toEqual(['4', '5']);
  });

  it('keeps a triple intact when there are non-set cards to spare', () => {
    const hand = [c('5', 'C'), c('5', 'D'), c('5', 'H'), c('8'), c('9')];
    expect(ranks(chooseGiveBack(hand, 1))).toEqual(['8']);
  });

  it('gives the genuine lowest cards when nothing is a set', () => {
    const hand = [c('3'), c('4'), c('6'), c('9'), c('K')];
    expect(ranks(chooseGiveBack(hand, 2))).toEqual(['3', '4']);
  });

  it('breaks a set only when forced (the whole hand is one quad)', () => {
    const hand = [c('3', 'C'), c('3', 'D'), c('3', 'H'), c('3', 'S')];
    expect(chooseGiveBack(hand, 2)).toHaveLength(2);
    expect(ranks(chooseGiveBack(hand, 2))).toEqual(['3', '3']);
  });
});
