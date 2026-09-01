import { ScatterplotLayer } from '@deck.gl/layers';
import type { Layer, PickingInfo } from '@deck.gl/core';
import { StickerIconLayer } from './sticker-icon-layer';
import type { Coordinate, Sticker } from '../stickers/sticker.models';
import { stickerAtlas } from './sticker-icon';
import type { BasemapTone } from './basemap';

/**
 * Every sticker on the globe, in two draw calls.
 *
 * Both are {@link StickerIconLayer}s over the same atlas: a card silhouette and
 * the line art that sits on it. That split is what lets one piece of artwork
 * cover every state and both kinds of basemap — the texture supplies coverage
 * and the layer supplies colour, so a sticker becomes light-on-dark or
 * dark-on-light by changing four numbers rather than by loading a second image.
 *
 * The cost of drawing does not depend on how many stickers there are. Position,
 * colour and size go up as instanced attributes and the GPU draws the lot in one
 * pass per layer, which is the whole reason this is deck and not markers.
 */

export type StickerColor = readonly [number, number, number, number];

interface Palette {
  readonly plate: StickerColor;
  readonly face: StickerColor;
  readonly minePlate: StickerColor;
  readonly mineFace: StickerColor;
  readonly selectedPlate: StickerColor;
  readonly selectedFace: StickerColor;
}

/**
 * One palette per basemap tone. The stickers have to hold their own against
 * whatever is underneath them, and "underneath" is a choice the viewer makes in
 * the tools menu — so the mark inverts with the map rather than with the app
 * theme, which says nothing about the ground it is standing on.
 */
const PALETTES: Record<BasemapTone, Palette> = {
  dark: {
    plate: [244, 244, 245, 236],
    face: [10, 14, 22, 255],
    minePlate: [251, 191, 36, 240],
    mineFace: [10, 14, 22, 255],
    selectedPlate: [96, 165, 250, 255],
    selectedFace: [5, 7, 13, 255],
  },
  light: {
    plate: [17, 21, 30, 236],
    face: [244, 244, 245, 255],
    minePlate: [180, 83, 9, 245],
    mineFace: [255, 255, 255, 255],
    selectedPlate: [37, 99, 235, 255],
    selectedFace: [255, 255, 255, 255],
  },
};

/** Screen-space size of the mark, in pixels, by state. */
const SIZE = { base: 34, hovered: 40, selected: 48 } as const;

/** Picking runs against the card silhouette — the largest, most forgiving target. */
export const STICKER_PICK_LAYER = 'sticker-plate';

export interface StickerLayerOptions {
  readonly stickers: readonly Sticker[];
  readonly selectedId: string | null;
  readonly hoveredId: string | null;
  /** Ids the signed-in user owns, so their stickers read as theirs. */
  readonly ownedIds: ReadonlySet<string>;
  /** Whether the loaded basemap is dark or light. */
  readonly tone: BasemapTone;
  /** The spot the composer is aimed at, drawn until it becomes a sticker. */
  readonly pending: Coordinate | null;
  readonly onHover: (sticker: Sticker | null) => void;
}

function sizeOf(sticker: Sticker, selectedId: string | null, hoveredId: string | null): number {
  if (sticker.id === selectedId) return SIZE.selected;
  if (sticker.id === hoveredId) return SIZE.hovered;
  return SIZE.base;
}

export function stickerLayers({
  stickers,
  selectedId,
  hoveredId,
  ownedIds,
  tone,
  pending,
  onHover,
}: StickerLayerOptions): Layer[] {
  const atlas = stickerAtlas();
  const palette = PALETTES[tone];
  const data = stickers as Sticker[];

  // Hoisted so both layers agree, and so the update triggers below only have to
  // name the things that actually change.
  const size = (d: Sticker) => sizeOf(d, selectedId, hoveredId);
  const sizeTrigger = [selectedId, hoveredId];

  const shared = {
    data,
    // The canvas goes straight in as deck's `image` prop type, which uploads it
    // once and hands back a texture. No fetch, no decode, no atlas packer.
    atlas: atlas.image,
    getPosition: (d: Sticker) => [d.longitude, d.latitude] as [number, number],
    getSize: size,
  };

  const layers: Layer[] = [
    new StickerIconLayer<Sticker>({
      ...shared,
      id: STICKER_PICK_LAYER,
      // The one hit target. Putting picking on both layers would let a click
      // land on the card of one sticker and the face of its neighbour.
      pickable: true,
      frame: atlas.frames.plate,
      getColor: d =>
        d.id === selectedId
          ? palette.selectedPlate
          : ownedIds.has(d.id)
            ? palette.minePlate
            : palette.plate,
      onHover: (info: PickingInfo) => onHover((info.object as Sticker | undefined) ?? null),
      updateTriggers: {
        getSize: sizeTrigger,
        getColor: [selectedId, ownedIds, tone],
      },
    }),
    new StickerIconLayer<Sticker>({
      ...shared,
      id: 'sticker-face',
      pickable: false,
      frame: atlas.frames.face,
      getColor: d =>
        d.id === selectedId
          ? palette.selectedFace
          : ownedIds.has(d.id)
            ? palette.mineFace
            : palette.face,
      updateTriggers: {
        getSize: sizeTrigger,
        getColor: [selectedId, ownedIds, tone],
      },
    }),
  ];

  if (pending) {
    layers.push(
      new ScatterplotLayer<Coordinate>({
        id: 'sticker-pending',
        data: [pending],
        pickable: false,
        radiusUnits: 'pixels',
        lineWidthUnits: 'pixels',
        stroked: true,
        filled: true,
        // Billboarded, so the ring stays a circle on the sphere instead of
        // flattening into an ellipse as it moves away from the globe's centre.
        billboard: true,
        getPosition: d => [d.longitude, d.latitude],
        getRadius: 15,
        getFillColor: [96, 165, 250, 60],
        getLineColor: [96, 165, 250, 230],
        getLineWidth: 2.5,
      }),
    );
  }

  return layers;
}
