import { CardSprite } from '../render/card-renderer';
import { IdSprite } from './layout';

interface AnimState {
  x: number;
  y: number;
  rot: number;
  shade: number;
}

/** Time constant (seconds) for the exponential ease toward a card's target. */
const TAU = 0.075;

/**
 * Eases each card toward its target position/rotation/shade frame to frame,
 * keyed by stable card id. A card that keeps its id but changes target (its hand
 * reflows, it flies to the pile) glides; a brand-new id snaps in at its target;
 * an id that disappears is dropped. This is what turns the state-driven layout
 * into motion without the engine knowing anything about animation.
 */
export class Animator {
  private readonly current = new Map<string, AnimState>();

  step(targets: readonly IdSprite[], dt: number): CardSprite[] {
    const k = dt > 0 ? 1 - Math.exp(-dt / TAU) : 1;
    const alive = new Set<string>();
    const out: CardSprite[] = [];

    for (const t of targets) {
      alive.add(t.id);
      const targetShade = t.shade ?? 1;
      let s = this.current.get(t.id);
      if (!s) {
        s = { x: t.x, y: t.y, rot: t.rot, shade: targetShade };
        this.current.set(t.id, s);
      } else {
        s.x += (t.x - s.x) * k;
        s.y += (t.y - s.y) * k;
        s.rot += (t.rot - s.rot) * k;
        s.shade += (targetShade - s.shade) * k;
      }
      out.push({ key: t.key, x: s.x, y: s.y, w: t.w, h: t.h, rot: s.rot, shade: s.shade });
    }

    for (const id of this.current.keys()) {
      if (!alive.has(id)) {
        this.current.delete(id);
      }
    }
    return out;
  }
}
