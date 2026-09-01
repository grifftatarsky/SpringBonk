import type { StyleSpecification } from 'maplibre-gl';

// Basemaps come from OpenFreeMap: full-planet OpenStreetMap vector tiles, no API
// key, no signup, no rate limit, on the unmodified OpenMapTiles schema. The
// schema part matters as much as the price — because source-layer names are the
// standard ones, layer-groups.ts can classify a style it has never seen into
// roads / buildings / water / labels instead of hardcoding one vendor's ids.
//
// Licensing is ODbL — attribution is required, and the styles ship no
// attribution field on their sources, so ATTRIBUTION_LINKS below is rendered
// explicitly by the globe component.

/**
 * Rendered as our own element rather than through MapLibre's AttributionControl,
 * so placement and weight are ours to decide — the control stacks in a map
 * corner alongside the other widgets and ends up floating over the globe rather
 * than pinned to the window edge.
 */
export const ATTRIBUTION_LINKS: ReadonlyArray<{ label: string; href: string }> = [
  { label: 'OpenStreetMap', href: 'https://www.openstreetmap.org/copyright' },
  { label: 'OpenFreeMap', href: 'https://openfreemap.org' },
];

/**
 * Whether a basemap is dark or light overall. The sticker marks invert against
 * it — see PALETTES in sticker-layers — so a mark stays legible on Positron and
 * on Dark without anybody choosing a colour per basemap.
 */
export type BasemapTone = 'dark' | 'light';

export interface BasemapDef {
  readonly id: string;
  readonly name: string;
  readonly tone: BasemapTone;
  /** Style URL, or a builder for the keyless offline fallback. */
  readonly url?: string;
  readonly build?: () => StyleSpecification;
  readonly note?: string;
}

const OFM = 'https://tiles.openfreemap.org/styles';

export const BASEMAPS: readonly BasemapDef[] = [
  { id: 'fiord', name: 'Fiord', tone: 'dark', url: `${OFM}/fiord`, note: 'muted blue-grey' },
  { id: 'dark', name: 'Dark', tone: 'dark', url: `${OFM}/dark`, note: 'most contrast under the stickers' },
  { id: 'liberty', name: 'Liberty', tone: 'light', url: `${OFM}/liberty`, note: 'full colour, most detail' },
  { id: 'bright', name: 'Bright', tone: 'light', url: `${OFM}/bright` },
  { id: 'positron', name: 'Positron', tone: 'light', url: `${OFM}/positron`, note: 'light, minimal' },
  { id: 'outline', name: 'Outline only', tone: 'dark', build: outlineStyle, note: 'no tile requests past z4' },
];

export const DEFAULT_BASEMAP = 'fiord';

/** Interpolated so the atmosphere reads strongly from orbit and fades out as you descend. */
export const SKY: NonNullable<StyleSpecification['sky']> = {
  'sky-color': '#0a1a33',
  'horizon-color': '#3d6a9c',
  'fog-color': '#c8dcf0',
  'fog-ground-blend': 0.4,
  // 1 = horizon color only at ground level, 0 = full atmosphere halo from orbit.
  'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 6, 0.6, 12, 0],
};

/** Kept as a fallback for offline work and for judging the globe without tile traffic. */
function outlineStyle(): StyleSpecification {
  return {
    version: 8,
    name: 'jpss outline',
    projection: { type: 'globe' },
    sky: SKY,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      basemap: { type: 'vector', url: 'https://demotiles.maplibre.org/tiles/tiles.json' },
    },
    layers: [
      { id: 'space', type: 'background', paint: { 'background-color': '#05070d' } },
      { id: 'ocean', type: 'background', paint: { 'background-color': '#0c1a2b' } },
      {
        id: 'land',
        type: 'fill',
        source: 'basemap',
        'source-layer': 'countries',
        paint: { 'fill-color': '#1b2637' },
      },
      {
        id: 'borders',
        type: 'line',
        source: 'basemap',
        'source-layer': 'countries',
        paint: { 'line-color': '#33475f', 'line-width': 0.6 },
      },
    ],
  };
}

export function basemapById(id: string): BasemapDef {
  return BASEMAPS.find(b => b.id === id) ?? BASEMAPS[0];
}

export function basemapTone(id: string): BasemapTone {
  return basemapById(id).tone;
}

/** Resolves a basemap id to what MapLibre's `style` option wants. */
export function styleFor(id: string): StyleSpecification | string {
  const basemap = basemapById(id);
  return basemap.url ?? basemap.build?.() ?? outlineStyle();
}

/**
 * True when the resolved style arrives as a URL, so globe projection and sky
 * cannot be declared inline and have to be applied once MapLibre has fetched it.
 */
export function styleIsRemote(id: string): boolean {
  return basemapById(id).url !== undefined;
}
