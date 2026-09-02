import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
// maplibre-gl ships one UMD bundle and no ESM entry point, so what a named
// import resolves to depends on who did the bundling. esbuild interops the
// CommonJS namespace into named exports; Native Federation republishes the same
// file as a module whose only export is `default`. `import { Map }` therefore
// type-checks, builds, and then throws "does not provide an export named 'Map'"
// the moment the remote is loaded through the shell.
//
// The default import is the one form both agree on. Types still come from the
// named declarations, as type-only imports — they are erased, so they never
// reach the module that does not have them.
import maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, MapMouseEvent, StyleSpecification } from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { MapView, _GlobeView as GlobeView } from '@deck.gl/core';
import type { Layer, View } from '@deck.gl/core';
import { ATTRIBUTION_LINKS, SKY, styleFor, styleIsRemote } from './basemap';
import { STICKER_PICK_LAYER } from './sticker-layers';
import {
  applyGroupVisibility,
  classifyLayers,
  defaultVisibility,
  emptyStyleGroups,
} from './layer-groups';
import type { GroupVisibility, LayerGroupId, StyleGroups } from './layer-groups';
import { REDUCED_MOTION } from './motion';

/**
 * Which projection *deck* draws in, by zoom. MapLibre is never told anything: it
 * stays on `'globe'` from load to teardown.
 *
 * That split is the whole point. MapLibre's `'globe'` is sugar for
 * `["interpolate",["linear"],["zoom"],11,"vertical-perspective",12,"mercator"]`,
 * and it blends the two per-frame in the shader. Left alone that is continuous
 * and invisible; calling `setProjection` to force one and then force it back
 * re-projects the world in a single step and reloads every tile manager.
 *
 * deck has to be steered because `getDefaultView()` reads `map.getProjection()`,
 * MapLibre answers `'globe'` at every zoom, and deck therefore pins itself to
 * GlobeView even above z12 where the map is already flat — where GlobeView loses
 * precision and marks drift off their coordinates. Handing deck a view under its
 * own MAPBOX_VIEW_ID decides it directly, and MapLibre never has to be lied to.
 *
 * So the crossover sits at the edges of MapLibre's own blend rather than in the
 * middle of it, and the two thresholds double as hysteresis: sitting inside the
 * band keeps whichever side the camera came from instead of flipping every frame.
 */
const TO_MERCATOR_ZOOM = 12;
const TO_GLOBE_ZOOM = 11;

/**
 * deck's own id for the view it syncs to the basemap camera. Supplying a view
 * under this id is what takes the projection choice away from deck's sniffing:
 * `MapboxOverlay._getViews()` returns `props.views` verbatim when one carries
 * this id, and resolves through it before it would fall back to reading the
 * map's declared projection.
 */
const MAPBOX_VIEW_ID = 'mapbox';

type DeckView = 'globe' | 'mercator';

/** Hoisted so the identity is stable; a new View instance per render is churn deck has to diff. */
const VIEWS: Record<DeckView, View[]> = {
  globe: [new GlobeView({ id: MAPBOX_VIEW_ID })],
  mercator: [new MapView({ id: MAPBOX_VIEW_ID })],
};

/**
 * How far out the camera may pull back. MapLibre's default is 0, where the globe
 * is a small sphere in a large void — technically the whole earth, but it reads
 * as a bug rather than as a view. Raise it and the globe fills more of the frame
 * but the poles crop on a short viewport; lower it and the void comes back.
 */
const MIN_ZOOM = 1.5;

/**
 * Cross-fades the whole GL container on first load and on every basemap swap,
 * both of which otherwise show the same unfinished paint: background, then
 * sources, then tiles arriving piecemeal.
 *
 * The sequence matters. The container fades out while still showing the *old*
 * style — complete and correct, just dimming — and the new style is applied only
 * once opacity has reached zero, so the entire teardown and repaint happens
 * off-screen. One CSS opacity transition, no framebuffer readback.
 */
const FADE_MS = REDUCED_MOTION ? 0 : 350;

/** Degrees of longitude per second for the idle spin — a full revolution a minute. */
const SPIN_DEGREES_PER_SECOND = 6;

/** How long the pull-back to {@link MIN_ZOOM} takes. The rotation runs throughout, not after. */
const SPIN_SETTLE_MS = REDUCED_MOTION ? 0 : 1800;

/** Backstop so a style that never finishes loading cannot leave the map permanently invisible. */
const FADE_FAILSAFE_MS = 4000;

/** How long the camera takes to reach a sticker. */
const FLY_MS = REDUCED_MOTION ? 0 : 2200;

/**
 * The defocus is cleared by MapLibre's `idle` event — every tile in, nothing
 * animating. This is the backstop for the case where idle never comes: a source
 * that errors, or a camera move that starts before the last one settled. Longer
 * than the flight, so it only ever fires after the picture should already be up.
 */
const SETTLE_FAILSAFE_MS = FLY_MS + 900;

/** How long the camera holds full defocus before it starts gathering focus. */
const DEFOCUS_HOLD_MS = 260;

/**
 * Deep defocus on departure, easing to a light one for the body of the flight,
 * then sharp once the tiles are in. Three discrete states rather than one set of
 * keyframes: a CSS transition cannot interpolate *out* of a forwards-filled
 * animation — the before-change style is computed without it, so there is no
 * delta and the last step snaps. Each phase here is a plain class swap, so every
 * step interpolates.
 */
type SettlePhase = 'off' | 'deep' | 'cruise';

/**
 * Ceiling on the device pixel ratio deck renders at. `true` would follow the
 * device, which on a modern phone means 3.
 */
const DECK_MAX_PIXEL_RATIO =
  typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 2);

const INITIAL_VIEW = {
  center: [-30, 25] as [number, number],
  // Far enough out that the globe reads as a globe on first paint.
  zoom: 2.2,
  pitch: 0,
  bearing: 0,
};

/** A click on the globe, with whatever deck had under the cursor. */
export interface GlobeClick {
  readonly longitude: number;
  readonly latitude: number;
  /** The picked deck object, or null when the click landed on bare map. */
  readonly picked: unknown;
}

export type CameraTarget =
  | {
      readonly kind: 'center';
      readonly longitude: number;
      readonly latitude: number;
      readonly zoom: number;
      /**
       * Pixels to shift the target away from the centre of the map, for when
       * something is covering part of it — the sidebar. Without this, opening a
       * sticker flies it to the middle of the stage and then puts a panel on top
       * of it.
       */
      readonly offset?: [number, number];
    }
  /** [[west, south], [east, north]] — frames whatever a result actually contains. */
  | { readonly kind: 'bounds'; readonly bounds: [[number, number], [number, number]] };

/**
 * The globe: MapLibre in vertical-perspective projection, with the camera
 * behaviour ported from terminalGL — the cross-fade on every style swap, the
 * idle spin that stops the moment anyone reaches for the map, and the layer
 * groups the tools menu switches on and off.
 *
 * It draws the earth; deck.gl draws everything standing on it, through a
 * {@link MapboxOverlay} that stays synced to this camera.
 *
 * {@link ViewEncapsulation.None} because MapLibre builds its own DOM inside the
 * container at runtime — canvas, controls, the lot — and Angular's emulated
 * encapsulation only stamps its attribute onto elements that came from a
 * template, so scoped rules would never reach any of it.
 */
@Component({
  selector: 'jpss-globe',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: './globe.css',
  template: `
    <div class="jpss-globe">
      <div
        class="jpss-globe__canvas"
        [class.jpss-globe__canvas--hidden]="!ready()"
        [class.jpss-globe__canvas--defocus-deep]="settlePhase() === 'deep'"
        [class.jpss-globe__canvas--defocus-cruise]="settlePhase() === 'cruise'"
        [style.transition-duration.ms]="fadeMs"
        #container></div>

      <!-- ODbL requires the credit; nothing requires it to shout. -->
      <p class="jpss-globe__attribution">
        @for (link of attribution; track link.href; let first = $first) {
          @if (!first) {<span aria-hidden="true"> · </span>}
          <a [href]="link.href" target="_blank" rel="noreferrer">{{ link.label }}</a>
        }
      </p>

      <ng-content />
    </div>
  `,
})
export class Globe {
  private readonly container = viewChild.required<ElementRef<HTMLDivElement>>('container');
  private readonly destroyRef = inject(DestroyRef);

  /** deck layers to draw over the basemap. */
  readonly layers = input<Layer[]>([]);
  readonly basemap = input.required<string>();
  readonly visibility = input<GroupVisibility>(defaultVisibility());
  /** Pulls back to the whole earth and rotates until cleared, or until the map is touched. */
  readonly spinning = input(false);
  /** Swapped to a crosshair while the composer is waiting for a spot. */
  readonly picking = input(false);

  readonly globeClick = output<GlobeClick>();
  /** Fired when the spin ends on its own — somebody grabbed the map — so the menu can follow. */
  readonly spinStop = output<void>();
  readonly groupSizes = output<Partial<Record<LayerGroupId, number>>>();
  /** True from the moment a style starts loading until its fade-in has finished. */
  readonly loadingChange = output<boolean>();

  protected readonly attribution = ATTRIBUTION_LINKS;
  protected readonly fadeMs = FADE_MS;
  protected readonly ready = signal(false);
  /** How far through resolving a camera flight is — see {@link beginSettle}. */
  protected readonly settlePhase = signal<SettlePhase>('off');
  private settleTimer?: number;
  private cruiseTimer?: number;
  /** Set when the map goes idle before the deep hold is up — see {@link onIdle}. */
  private settledEarly = false;

  private map?: MapLibreMap;
  private overlay?: MapboxOverlay;
  /** Which projection deck is drawing in. A signal so the layer effect follows it. */
  private readonly deckView = signal<DeckView>('globe');
  private groups: StyleGroups = emptyStyleGroups();
  /** The basemap whose per-style setup has already been applied. */
  private patched: string | null = null;
  /** The style actually handed to MapLibre — lags the input across a fade. */
  private readonly applied = signal<string | null>(null);

  private spinFrame = 0;
  private fadeTimer = 0;
  private failsafeTimer = 0;
  private loadingTimer = 0;

  constructor() {
    afterNextRender(() => this.create());

    // Deferring the style swap until the container has finished fading out is
    // the whole trick; changing it while visible is what makes a rebuild ugly.
    effect(() => {
      const wanted = this.basemap();
      const current = this.applied();
      if (current === null || current === wanted) return;

      this.ready.set(false);
      window.clearTimeout(this.fadeTimer);
      this.fadeTimer = window.setTimeout(() => this.applyStyle(wanted), FADE_MS);
    });

    // Layers and the projection travel together: both are deck props, and the
    // view has to be read here so a crossover re-runs this rather than waiting
    // for the next layer change.
    effect(() => {
      const layers = this.layers();
      const view = this.deckView();
      this.overlay?.setProps({ layers, views: VIEWS[view] } as never);
    });

    effect(() => {
      const visibility = this.visibility();
      const map = this.map;
      // `patched` is set exactly when a style has been classified, so it is also
      // the test for "there are layer ids to apply this to".
      if (!map || this.patched === null) return;
      applyGroupVisibility(map, this.groups, visibility);
    });

    effect(() => {
      if (this.spinning()) this.startSpin();
      else this.stopSpin();
    });

    effect(() => {
      const cursor = this.picking() ? 'crosshair' : 'grab';
      this.map?.getCanvas().style.setProperty('cursor', cursor);
    });

    // Held until the fade-in has actually finished rather than dropped the
    // moment the style reports ready — otherwise the indicator vanishes while
    // the map is still visibly arriving.
    effect(() => {
      window.clearTimeout(this.loadingTimer);
      if (!this.ready()) {
        this.loadingChange.emit(true);
        return;
      }
      this.loadingTimer = window.setTimeout(() => this.loadingChange.emit(false), FADE_MS);
    });

    this.destroyRef.onDestroy(() => this.teardown());
  }

  /** Eases the camera to a point. A long ease reads as the globe turning under you. */
  flyTo(target: CameraTarget): void {
    const map = this.map;
    if (!map) return;

    this.beginSettle();

    if (target.kind === 'center') {
      map.flyTo({
        center: [target.longitude, target.latitude],
        zoom: target.zoom,
        offset: target.offset ?? [0, 0],
        duration: FLY_MS,
        essential: true,
      });
      return;
    }
    // maxZoom matters for the degenerate case: a single sticker has a zero-area
    // box, and fitBounds would otherwise slam the camera to full zoom on a dot.
    map.fitBounds(target.bounds, {
      padding: 90,
      maxZoom: 12,
      duration: FLY_MS,
      essential: true,
    });
  }

  /**
   * Defocuses the basemap for the duration of a camera flight, so the detail
   * that streams in at the far end resolves into focus instead of popping in
   * tile by tile. Only the MapLibre canvas is blurred: deck draws to its own
   * canvas under `interleaved: false`, so the sticker marks stay sharp
   * throughout and the effect reads as the ground coming into focus behind
   * them rather than as the whole view going soft.
   *
   * Cleared by `idle` — MapLibre fires it once every tile for the current
   * camera is in and nothing is animating, which is precisely the moment the
   * picture is worth looking at. `flyTo` is only ever called to zoom *in*;
   * the pull-back is driven by the spin, whose per-frame `jumpTo` would keep
   * the map from ever going idle.
   */
  private beginSettle(): void {
    if (REDUCED_MOTION) return;
    this.clearSettleTimers();
    this.settledEarly = false;
    this.settlePhase.set('deep');
    this.cruiseTimer = window.setTimeout(() => {
      // If every tile was already cached the map went idle during the hold.
      // Resolve from there rather than easing into a cruise nobody needs — but
      // still resolve *through* the transition, so it reads as focusing.
      this.settlePhase.set(this.settledEarly ? 'off' : 'cruise');
    }, DEFOCUS_HOLD_MS);
    this.settleTimer = window.setTimeout(() => this.endSettle(), SETTLE_FAILSAFE_MS);
  }

  /**
   * MapLibre fires `idle` once every tile for the current camera is in and
   * nothing is animating — the moment the picture is worth looking at, and so
   * the moment to bring it into focus. An idle that arrives during the deep
   * hold is remembered rather than acted on: snapping back 260ms after the blur
   * appeared reads as a glitch, not as a camera.
   */
  private readonly onIdle = (): void => {
    if (this.settlePhase() === 'off') return;
    if (this.settlePhase() === 'deep') {
      this.settledEarly = true;
      return;
    }
    this.endSettle();
  };

  private endSettle(): void {
    this.clearSettleTimers();
    this.settlePhase.set('off');
  }

  private clearSettleTimers(): void {
    window.clearTimeout(this.settleTimer);
    window.clearTimeout(this.cruiseTimer);
  }

  // region map lifecycle

  private create(): void {
    const basemap = this.basemap();
    const map = new maplibregl.Map({
      container: this.container().nativeElement,
      style: styleFor(basemap),
      center: INITIAL_VIEW.center,
      zoom: INITIAL_VIEW.zoom,
      pitch: INITIAL_VIEW.pitch,
      bearing: INITIAL_VIEW.bearing,
      // The globe interpolates itself into Mercator around z11-12, so one camera
      // covers whole-earth to street level with no mode switch.
      minZoom: MIN_ZOOM,
      maxZoom: 20,
      // Supplied below, outside the map, so its placement is not at the mercy of
      // MapLibre's corner stacking.
      attributionControl: false,
    });
    this.map = map;
    this.applied.set(basemap);

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    // Overlaid, not interleaved, and not configurable. MapboxOverlay reads
    // `interleaved` in its constructor only, so flipping it later leaves deck
    // holding GPU buffers created against a context it no longer draws into.
    // Overlaid also means a basemap style swap cannot delete deck's layers.
    this.overlay = new MapboxOverlay({
      interleaved: false,
      layers: this.layers(),
      views: VIEWS.globe,
      // Phones report a device pixel ratio of 3, which is 2.25x the fragments of
      // 2 for marks that are flat colour over a 256px glyph — no visible gain,
      // and it is the single biggest lever on a mobile GPU. MapLibre keeps its
      // own ratio for the basemap, where the extra density does show in labels.
      useDevicePixels: DECK_MAX_PIXEL_RATIO,
    } as never);
    map.addControl(this.overlay);

    map.on('styledata', this.onStyleData);
    map.on('idle', this.onIdle);
    map.on('styleimagemissing', this.onMissingImage);
    map.on('move', this.onMove);
    map.on('click', this.onClick);
    map.on('error', this.onError);

    this.armFailsafe();
    this.onStyleData();
    if (this.spinning()) this.startSpin();
  }

  private teardown(): void {
    this.stopSpin();
    window.clearTimeout(this.fadeTimer);
    window.clearTimeout(this.failsafeTimer);
    window.clearTimeout(this.loadingTimer);
    this.clearSettleTimers();

    const map = this.map;
    if (!map) return;
    map.off('styledata', this.onStyleData);
    map.off('idle', this.onIdle);
    map.off('styleimagemissing', this.onMissingImage);
    map.off('move', this.onMove);
    map.off('click', this.onClick);
    map.off('error', this.onError);
    // Releases the WebGL context along with everything deck built against it.
    map.remove();
    this.map = undefined;
    this.overlay = undefined;
  }

  private applyStyle(basemap: string): void {
    // Forces the per-style setup below to run again for the new style.
    this.patched = null;
    this.groups = emptyStyleGroups();
    this.applied.set(basemap);
    this.armFailsafe();
    this.map?.setStyle(styleFor(basemap) as StyleSpecification | string);
  }

  /** Re-armed per style, so a style that never reports ready cannot leave a black pane. */
  private armFailsafe(): void {
    window.clearTimeout(this.failsafeTimer);
    this.failsafeTimer = window.setTimeout(() => this.ready.set(true), FADE_FAILSAFE_MS);
  }

  // endregion

  // region map events

  /**
   * Everything per-style is re-run here because swapping the basemap replaces
   * the whole style, discarding the projection, the sky and the visibility
   * overrides with it. The `patched` guard is what keeps it to once per style:
   * MapLibre fires styledata on essentially every tile and source update, and
   * each of these calls mutates the style, which fires styledata again.
   */
  private readonly onStyleData = (): void => {
    const map = this.map;
    if (!map) return;

    // Cheap guard first, and it is the one that matters for cost: MapLibre fires
    // styledata on essentially every tile and source update, and this returns
    // for all but the handful of events between a style being requested and it
    // being parsed.
    const basemap = this.applied();
    if (basemap === null || this.patched === basemap) return;

    // `getStyle()` returns undefined until the style JSON has been parsed and
    // its layers built — which is precisely "has the new style arrived".
    //
    // Not `isStyleLoaded()`, which additionally waits for every source to finish
    // loading tiles. That is a different question, and one that has no answer
    // while the globe is turning: the spin requests new tiles every frame, so
    // the map is never quiet and this whole block would never run.
    const style = map.getStyle();
    if (!style) return;
    this.patched = basemap;

    if (styleIsRemote(basemap)) {
      // A style fetched from a URL says nothing about projection or sky; both
      // are imposed once it lands. The comparison is not a micro-optimisation:
      // setProjection reloads every tile manager, so setting it unconditionally
      // throws away the tiles that just arrived.
      if (map.getProjection()?.type !== 'globe') {
        map.setProjection({ type: 'globe' });
      }
      map.setSky(SKY);
    }

    // The one serialize per style. Everything downstream works from the
    // classified ids, so a pan never touches the style again.
    this.groups = classifyLayers(style.layers);
    applyGroupVisibility(map, this.groups, this.visibility());
    this.groupSizes.emit(this.groups.sizes);

    // Reported after the reapplication above: fading in on a style that still
    // has the wrong projection would just animate the wrong picture into view.
    this.ready.set(true);
  };

  /**
   * OpenFreeMap's dark and fiord styles ask for hyphenated sprite icons
   * (`circle-11`) while their sprite ships the underscored names (`circle_11`) —
   * an upstream mismatch that logs once per missing icon. Aliasing resolves it
   * from the sprite already in memory; a transparent pixel is the fallback so an
   * unknown name stops warning instead of repeating.
   */
  private readonly onMissingImage = (event: { id: string }): void => {
    const map = this.map;
    if (!map || map.hasImage(event.id)) return;

    const aliased = event.id.replace(/-/g, '_');
    if (aliased !== event.id && map.hasImage(aliased)) {
      // getImage returns metadata plus an RGBAImage under `data`; addImage wants
      // the raw pixels, and the sprite's pixelRatio and sdf flag have to travel
      // with them — an SDF icon re-registered as a plain one renders as a black box.
      const source = map.getImage(aliased);
      if (source?.data) {
        map.addImage(event.id, source.data, { pixelRatio: source.pixelRatio, sdf: source.sdf });
        return;
      }
    }
    map.addImage(event.id, { width: 1, height: 1, data: new Uint8Array(4) });
  };

  private readonly onMove = (): void => {
    const zoom = this.map?.getZoom();
    if (zoom === undefined) return;

    const current = this.deckView();
    const next: DeckView =
      current === 'globe' && zoom >= TO_MERCATOR_ZOOM
        ? 'mercator'
        : current === 'mercator' && zoom < TO_GLOBE_ZOOM
          ? 'globe'
          : current;

    // A deck viewport swap, not a MapLibre projection migration, so it is cheap
    // enough to belong on the gesture rather than deferred to its end.
    if (next !== current) this.deckView.set(next);
  };

  /**
   * One click path for both jobs a click can mean, and the ordering is decided
   * here rather than inferred.
   *
   * Picking explicitly instead of through a layer's own `onClick`: MapboxOverlay
   * forwards the map's click into deck as well, so a layer callback and this
   * handler would both fire for a click on a sticker, and whichever ran second
   * would have to guess whether the other had already claimed it.
   */
  private readonly onClick = (event: MapMouseEvent): void => {
    const info = this.overlay?.pickObject({
      x: event.point.x,
      y: event.point.y,
      // A finger is not a pixel.
      radius: 8,
      layerIds: [STICKER_PICK_LAYER],
    });
    this.globeClick.emit({
      longitude: event.lngLat.lng,
      latitude: event.lngLat.lat,
      picked: info?.object ?? null,
    });
  };

  /**
   * MapLibre reports a failed style, sprite, glyph or tile here. Unhandled, it
   * logs to the console and the failsafe eventually reveals a blank map with no
   * explanation — which on a keyless public tile service with no SLA is a
   * plausible Tuesday. Revealing immediately is strictly better than four more
   * seconds of black: a half-drawn map at least says what failed.
   */
  private readonly onError = (event: { error?: { message?: string } }): void => {
    console.warn('[jpss basemap]', event.error?.message ?? 'map error', event.error);
    this.ready.set(true);
  };

  // endregion

  // region spin

  /**
   * Pulls the camera back to the whole earth and rotates it, for as long as
   * `spinning` holds.
   *
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
   */
  private startSpin(): void {
    const map = this.map;
    if (!map || this.spinFrame) return;

    const start = performance.now();
    const from = { zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() };
    let previous = start;
    let settled = SPIN_SETTLE_MS === 0;

    const step = (now: number): void => {
      const seconds = (now - previous) / 1000;
      previous = now;

      const progress = SPIN_SETTLE_MS === 0 ? 1 : Math.min(1, (now - start) / SPIN_SETTLE_MS);
      // Ease-out: most of the pull-back happens early, then it settles rather
      // than arriving abruptly.
      const eased = 1 - (1 - progress) ** 3;
      const center = map.getCenter();
      const turned: [number, number] = [
        wrapLongitude(center.lng + seconds * SPIN_DEGREES_PER_SECOND),
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
          zoom: from.zoom + (MIN_ZOOM - from.zoom) * eased,
          // Levelled off on the way out; a tilted camera reads as a wobble once turning.
          pitch: from.pitch * (1 - eased),
          bearing: from.bearing * (1 - eased),
        });
        if (progress >= 1) settled = true;
      }

      this.spinFrame = requestAnimationFrame(step);
    };

    this.spinFrame = requestAnimationFrame(step);

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
    for (const type of STOP_SPIN_ON) {
      container.addEventListener(type, this.onReachForMap, LISTENER_OPTIONS);
    }
  }

  private stopSpin(): void {
    if (this.spinFrame) {
      cancelAnimationFrame(this.spinFrame);
      this.spinFrame = 0;
    }
    const container = this.map?.getContainer();
    if (!container) return;
    for (const type of STOP_SPIN_ON) {
      container.removeEventListener(type, this.onReachForMap, LISTENER_OPTIONS);
    }
  }

  private readonly onReachForMap = (): void => {
    if (this.spinning()) this.spinStop.emit();
  };

  // endregion
}

const STOP_SPIN_ON = ['pointerdown', 'wheel', 'keydown'] as const;
const LISTENER_OPTIONS = { capture: true, passive: true } as const;

/** Keeps longitude in [-180, 180) so a long spin does not accumulate into the thousands. */
function wrapLongitude(longitude: number): number {
  return ((((longitude + 180) % 360) + 360) % 360) - 180;
}
