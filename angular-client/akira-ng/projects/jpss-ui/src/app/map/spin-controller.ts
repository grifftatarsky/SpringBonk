import type { Map as MapLibreMap } from 'maplibre-gl';
import { REDUCED_MOTION } from './motion';

/** Degrees of longitude per second while the globe idles. */
const DEGREES_PER_SECOND = 6;

/** How long the pull-back to the resting zoom takes. The rotation runs throughout, not after. */
const SETTLE_MS = REDUCED_MOTION ? 0 : 1800;

const STOP_ON = ['pointerdown', 'wheel', 'keydown'] as const;
const LISTENER_OPTIONS = { capture: true, passive: true } as const;

/**
 * Pulls the camera back to the whole earth and rotates it, for as long as it is
 * left running.
 *
 * Owns exactly one animation frame handle and one set of DOM listeners, which is
 * why it is a class rather than a few methods on the component: both have to be
 * released together, and the component already juggles several other timers.
 * {@link stop} is idempotent and safe to call when nothing is running.
 */
export class SpinController {
  private frame = 0;

  /**
   * @param map the camera to drive
   * @param onReachForMap called when the user touches the map, so the owner can
   *     decide whether that means stop — the controller does not stop itself,
   *     because "the user grabbed the globe" is a fact and "so stop spinning" is
   *     a policy.
   */
  constructor(
    private readonly map: MapLibreMap,
    private readonly onReachForMap: () => void,
  ) {}

  get running(): boolean {
    return this.frame !== 0;
  }

  /**
   * Everything — longitude, zoom, pitch, bearing — is driven from one rAF loop
   * writing `jumpTo`, rather than an `easeTo` out followed by a rotation. That is
   * not stylistic: `jumpTo` cancels an in-flight camera animation, so a
   * per-frame rotation started during an `easeTo` kills the pull-back on its
   * first frame and the globe spins at whatever zoom it happened to be at.
   * Driving both from the same frame means they compose, and the earth is
   * already turning as it recedes.
   *
   * The rotation is rate-based (degrees × elapsed seconds) rather than a fixed
   * step per frame, so it runs at one speed on a 60Hz and a 120Hz display.
   *
   * @param restingZoom where the pull-back ends, read once so a resize mid-flight
   *     cannot move the target under it.
   */
  start(restingZoom: number): void {
    if (this.frame) {
      return;
    }

    const map = this.map;
    const start = performance.now();
    const from = { zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() };
    let previous = start;
    let settled = SETTLE_MS === 0;

    const step = (now: number): void => {
      const seconds = (now - previous) / 1000;
      previous = now;

      const progress = SETTLE_MS === 0 ? 1 : Math.min(1, (now - start) / SETTLE_MS);
      // Ease-out: most of the pull-back happens early, then it settles rather
      // than arriving abruptly.
      const eased = 1 - (1 - progress) ** 3;
      const center = map.getCenter();
      const turned: [number, number] = [
        wrapLongitude(center.lng + seconds * DEGREES_PER_SECOND),
        center.lat,
      ];

      if (settled) {
        // Longitude only from here. Writing zoom every frame past this point
        // would fight anyone using the navigation control, and that is the
        // difference between "the spin owns the camera" and "the zoom buttons
        // are broken".
        map.jumpTo({ center: turned });
      } else {
        map.jumpTo({
          center: turned,
          zoom: from.zoom + (restingZoom - from.zoom) * eased,
          // Levelled off on the way out; a tilted camera reads as a wobble once turning.
          pitch: from.pitch * (1 - eased),
          bearing: from.bearing * (1 - eased),
        });
        if (progress >= 1) settled = true;
      }

      this.frame = requestAnimationFrame(step);
    };

    this.frame = requestAnimationFrame(step);

    /*
     * Reaching for the map is the clearest "I want the camera back" there is, so
     * the spin stops rather than fights — and it listens for raw DOM input
     * rather than for MapLibre's own camera events.
     *
     * That is the whole point. `jumpTo` fires the full movestart/move/moveend
     * cascade, so this loop is opening and closing a "move" sixty times a
     * second, and a drag beginning in the middle of that churn races our own
     * events for `movestart`. Inferring user intent from a stream this loop is
     * also writing to cannot be made reliable. A pointerdown is a finger or a
     * mouse; nothing can synthesize one.
     *
     * The container rather than the canvas, so the navigation control counts as
     * reaching for the map too. Capture phase, because MapLibre's own handlers
     * stop propagation on several of these before they would bubble.
     */
    const container = map.getContainer();
    for (const type of STOP_ON) {
      container.addEventListener(type, this.onReachForMap, LISTENER_OPTIONS);
    }
  }

  stop(): void {
    if (this.frame) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    }
    const container = this.map.getContainer();
    for (const type of STOP_ON) {
      container.removeEventListener(type, this.onReachForMap, LISTENER_OPTIONS);
    }
  }
}

/** Keeps longitude in [-180, 180) so a long spin does not accumulate into the thousands. */
function wrapLongitude(longitude: number): number {
  return ((((longitude + 180) % 360) + 360) % 360) - 180;
}
