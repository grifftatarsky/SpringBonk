package com.gpt.decks.engine.president;

import java.util.List;

/**
 * Seedable mulberry32 PRNG — deterministic and serializable via its 32-bit
 * {@link #state()}, so a game can be persisted/replayed. A faithful port of the
 * TS engine's RNG; authority now lives here, so determinism is JVM-internal.
 */
public final class Rng {

  private int s;

  public Rng(int seed) {
    this.s = seed;
  }

  public static Rng fromState(int state) {
    return new Rng(state);
  }

  public int state() {
    return s;
  }

  /** Next float in [0, 1). */
  public double next() {
    s = s + 0x6d2b79f5; // int overflow wraps == TS's >>> 0 on the state bits
    int t = s;
    t = (t ^ (t >>> 15)) * (t | 1);
    t ^= t + (t ^ (t >>> 7)) * (t | 61);
    return ((t ^ (t >>> 14)) & 0xFFFFFFFFL) / 4294967296.0;
  }

  /** Integer in [0, maxExclusive). */
  public int nextInt(int maxExclusive) {
    return (int) (next() * maxExclusive);
  }

  /** Fisher–Yates shuffle in place. */
  public <T> void shuffle(List<T> list) {
    for (int i = list.size() - 1; i > 0; i--) {
      int j = nextInt(i + 1);
      T tmp = list.get(i);
      list.set(i, list.get(j));
      list.set(j, tmp);
    }
  }
}
