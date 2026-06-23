/**
 * Tiny seedable PRNG (mulberry32). Deterministic and serializable via its 32-bit
 * {@link Rng.state}, so a server can persist/replay a game and clients can verify
 * shuffles. Not cryptographically secure — it only needs to be reproducible.
 */
export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  /** Resume an RNG from a previously captured {@link state}. */
  static fromState(state: number): Rng {
    return new Rng(state);
  }

  /** Current internal state — store this in serializable game state. */
  get state(): number {
    return this.s >>> 0;
  }

  /** Next float in [0, 1). */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [0, maxExclusive). */
  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  /** Fisher–Yates shuffle in place; returns the same array for convenience. */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
