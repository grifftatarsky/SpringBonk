import type { LayerSpecification, Map as MapLibreMap } from 'maplibre-gl';

// Groups a style's layers into things a person would actually want to switch
// off, without knowing anything about the specific style. Classification is by
// OpenMapTiles `source-layer`, which every OpenFreeMap style uses unmodified, so
// this keeps working across all of them and across style swaps.
//
// Classification happens once per style, not once per event. `map.getStyle()` is
// `style.serialize()` — a full rebuild of every source and layer, over a hundred
// of them on Liberty — and MapLibre fires `styledata` on essentially every tile
// and source update during a pan. The layer list can only change when the style
// itself is replaced, so it is classified on load and everything after that
// works from ids.

export type LayerGroupId = 'labels' | 'roads' | 'buildings' | 'water' | 'land' | 'boundaries';

export interface LayerGroupDef {
  readonly id: LayerGroupId;
  readonly name: string;
  readonly hint: string;
}

export const LAYER_GROUPS: readonly LayerGroupDef[] = [
  { id: 'roads', name: 'Roads & rail', hint: 'street geometry, runways, paths' },
  { id: 'labels', name: 'Labels', hint: 'place names, road names, POIs' },
  { id: 'buildings', name: 'Buildings', hint: 'footprints, from about z14' },
  { id: 'water', name: 'Water', hint: 'oceans, lakes, rivers' },
  { id: 'land', name: 'Land cover', hint: 'parks, woodland, residential' },
  { id: 'boundaries', name: 'Boundaries', hint: 'country and state lines' },
];

const BY_SOURCE_LAYER: Readonly<Record<string, LayerGroupId>> = {
  transportation: 'roads',
  aeroway: 'roads',
  building: 'buildings',
  water: 'water',
  waterway: 'water',
  landcover: 'land',
  landuse: 'land',
  park: 'land',
  boundary: 'boundaries',
};

export type GroupVisibility = Record<LayerGroupId, boolean>;

/**
 * Labels start off. Place names compete with the stickers for the same few
 * pixels — the marks are what the page is about — and symbol layers are the
 * most expensive thing in these styles to lay out, so the globe spins cheaper
 * too. Everything else stays on; the tools menu turns labels back on.
 */
export function defaultVisibility(): GroupVisibility {
  return { roads: true, labels: false, buildings: true, water: true, land: true, boundaries: true };
}

/** Which layer ids each group owns in the loaded style. Built once per style by {@link classifyLayers}. */
export interface StyleGroups {
  ids: Record<LayerGroupId, string[]>;
  /** Layer counts, for the menu's dimmed state. Derived from `ids`, so the two cannot disagree. */
  sizes: Partial<Record<LayerGroupId, number>>;
}

export function emptyStyleGroups(): StyleGroups {
  return {
    ids: { labels: [], roads: [], buildings: [], water: [], land: [], boundaries: [] },
    sizes: {},
  };
}

/**
 * Every symbol layer is a label regardless of which source-layer it draws from,
 * and turning text off is the most common thing anyone wants from a control like
 * this — so type is checked before source-layer. A layer belongs to exactly one
 * group; overlapping groups would fight over visibility.
 */
function groupOf(layer: { type: string; 'source-layer'?: string }): LayerGroupId | null {
  if (layer.type === 'symbol') return 'labels';
  const sourceLayer = layer['source-layer'];
  if (!sourceLayer) return null;
  return BY_SOURCE_LAYER[sourceLayer] ?? null;
}

/**
 * Sorts one style's layers into groups. Takes the already-serialized layer list
 * rather than the map, so the caller can spend its single `getStyle()` once and
 * use the result for both this and its own "has the new style arrived yet" check.
 *
 * Unclassified layers — background, shaded relief, anything a style adds that
 * this does not recognize — are left out rather than hidden, so an unfamiliar
 * style degrades to "some toggles do less" instead of a blank map.
 */
export function classifyLayers(layers: readonly LayerSpecification[]): StyleGroups {
  const groups = emptyStyleGroups();

  for (const layer of layers) {
    const group = groupOf(layer);
    if (group) groups.ids[group].push(layer.id);
  }

  for (const group of Object.keys(groups.ids) as LayerGroupId[]) {
    const count = groups.ids[group].length;
    if (count > 0) groups.sizes[group] = count;
  }

  return groups;
}

/** Applies group visibility from the cached classification — no style serialization involved. */
export function applyGroupVisibility(
  map: MapLibreMap,
  groups: StyleGroups,
  visibility: GroupVisibility,
): void {
  for (const group of Object.keys(groups.ids) as LayerGroupId[]) {
    const wanted = visibility[group] ? 'visible' : 'none';
    for (const id of groups.ids[group]) {
      // The style can be mid-swap when this runs, so the layer may be gone;
      // getLayer is the cheap check.
      if (!map.getLayer(id)) continue;
      // Reading first avoids a needless style diff, which would fire styledata again.
      if (map.getLayoutProperty(id, 'visibility') !== wanted) {
        map.setLayoutProperty(id, 'visibility', wanted);
      }
    }
  }
}
