import { signal } from '@angular/core';
import { REDUCED_MOTION } from './motion';

/**
 * Deep defocus on departure, easing to a light one for the body of the flight,
 * then sharp once the tiles are in.
 *
 * Three discrete states rather than one set of keyframes: a CSS transition
 * cannot interpolate *out* of a forwards-filled animation — the before-change
 * style is computed without it, so there is no delta and the last step snaps.
 * Each phase here is a plain class swap, so every step interpolates.
 */
export type DefocusPhase = 'off' | 'deep' | 'cruise';

/** How long the camera holds full defocus before it starts gathering focus. */
const HOLD_MS = 260;

/**
 * Blurs the basemap for the length of a camera flight, so the detail that
 * streams in at the far end resolves into focus instead of popping in tile by
 * tile.
 *
 * Split out because it is a small state machine with two timers of its own, and
 * both have to be released with the map. Everything it knows about the outside
 * world is when a flight started and when the map went idle; the CSS decides
 * what each phase looks like.
 */
export class Defocus {
  private readonly state = signal<DefocusPhase>('off');
  readonly phase = this.state.asReadonly();

  private holdTimer?: number;
  private failsafeTimer?: number;
  /** Set when the map goes idle before the deep hold is up — see {@link noteIdle}. */
  private settledEarly = false;

  /**
   * @param failsafeMs backstop for an `idle` that never arrives — a source that
   *     errors, or a camera move that starts before the last one settled. Longer
   *     than the flight, so it only ever fires after the picture should be up.
   */
  constructor(private readonly failsafeMs: number) {}

  begin(): void {
    if (REDUCED_MOTION) {
      return;
    }
    this.clearTimers();
    this.settledEarly = false;
    this.state.set('deep');
    this.holdTimer = window.setTimeout(() => {
      // If every tile was already cached the map went idle during the hold.
      // Resolve from there rather than easing into a cruise nobody needs — but
      // still resolve *through* the transition, so it reads as focusing.
      this.state.set(this.settledEarly ? 'off' : 'cruise');
    }, HOLD_MS);
    this.failsafeTimer = window.setTimeout(() => this.end(), this.failsafeMs);
  }

  /**
   * MapLibre fires `idle` once every tile for the current camera is in and
   * nothing is animating — the moment the picture is worth looking at, and so
   * the moment to bring it into focus. An idle that arrives during the deep hold
   * is remembered rather than acted on: snapping back 260ms after the blur
   * appeared reads as a glitch, not as a camera.
   */
  noteIdle(): void {
    switch (this.state()) {
      case 'off':
        return;
      case 'deep':
        this.settledEarly = true;
        return;
      default:
        this.end();
    }
  }

  end(): void {
    this.clearTimers();
    this.state.set('off');
  }

  private clearTimers(): void {
    window.clearTimeout(this.holdTimer);
    window.clearTimeout(this.failsafeTimer);
  }
}
