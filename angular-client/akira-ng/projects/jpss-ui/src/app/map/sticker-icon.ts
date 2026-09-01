import type { StickerFrame } from './sticker-icon-layer';

/**
 * The sticker mark, as a texture atlas.
 *
 * The artwork is the project's sticker glyph — a rounded card with a folded
 * corner and a face on it — carried here as its raw SVG path data rather than as
 * a file. Two reasons: it is drawn with `Path2D` straight onto a canvas, which
 * is synchronous and needs no image decode, no data URI and no atlas packer to
 * go wrong; and being path data it rasterises at whatever size the device pixel
 * ratio asks for instead of resampling a fixed bitmap.
 *
 * Both tiles are drawn in flat white on transparent. Nothing here decides what
 * colour a sticker is — the layer reads coverage from this texture and the
 * colour from the instance — so one atlas serves every state, every selection
 * and both light and dark basemaps.
 */

/** The card silhouette — the first subpath of the glyph's outline, filled. */
const PLATE =
  'm80.066 3.125h-60.133c-9.2695 0-16.809 7.5391-16.809 16.809v60.133c0 9.2695 ' +
  '7.5391 16.809 16.809 16.809h44.098c0.82812 0 1.625-0.32812 2.2109-0.91406l29.719-29.719c0.58594-0.58594 ' +
  '0.91406-1.3828 0.91406-2.2109v-44.098c0-9.2695-7.5391-16.809-16.809-16.809z';

/** The line art that sits on the card: its border, the fold, and the face. */
const FACE = [
  // Outline + folded corner. Two subpaths, wound so the card's interior is a
  // hole — the same nonzero fill rule SVG and canvas both default to.
  'm80.066 3.125h-60.133c-9.2695 0-16.809 7.5391-16.809 16.809v60.133c0 9.2695 ' +
    '7.5391 16.809 16.809 16.809h44.098c0.82812 0 1.625-0.32812 2.2109-0.91406l29.719-29.719c0.58594-0.58594 ' +
    '0.91406-1.3828 0.91406-2.2109v-44.098c0-9.2695-7.5391-16.809-16.809-16.809zm-70.691 76.941v-60.133c0-5.8242 ' +
    '4.7383-10.559 10.559-10.559h60.133c5.8203 0 10.559 4.7344 10.559 10.559v40.973h-12.91c-9.2695 ' +
    '0-16.809 7.5391-16.809 16.809v12.91h-40.973c-5.8203 0-10.559-4.7344-10.559-10.559zm76.832-12.91-19.051 ' +
    '19.047v-8.4922c0-5.8203 4.7383-10.559 10.559-10.559h8.4922z',
  // Smile.
  'm73.559 52.426c1.3398-1.0859 1.5469-3.0547 0.45703-4.3945s-3.0586-1.543-4.3945-0.45703c-5.7852 ' +
    '4.6953-12.57 7.1758-19.621 7.1758s-13.836-2.4805-19.621-7.1758c-1.3398-1.0859-3.3086-0.88281-4.3945 ' +
    '0.45703s-0.88281 3.3086 0.45703 4.3945c6.9141 5.6094 15.059 8.5742 23.559 8.5742s16.648-2.9648 23.559-8.5742z',
  // Left eye.
  'm37.25 38.953c1.7266 0 3.125-1.3984 3.125-3.125v-10.297c0-1.7266-1.3984-3.125-3.125-3.125s-3.125 ' +
    '1.3984-3.125 3.125v10.297c0 1.7266 1.3984 3.125 3.125 3.125z',
  // Right eye.
  'm62.75 38.953c1.7266 0 3.125-1.3984 3.125-3.125v-10.297c0-1.7266-1.3984-3.125-3.125-3.125s-3.125 ' +
    '1.3984-3.125 3.125v10.297c0 1.7266 1.3984 3.125 3.125 3.125z',
];

/** The glyph's own coordinate system, from the source SVG's viewBox. */
const VIEW_BOX = 100;

/**
 * Tile size in the atlas. Comfortably above the largest size a sticker is drawn
 * at (~48px) times a 3x device pixel ratio, so the mark never softens — and a
 * power of two, which matters: deck asks luma for a full mip chain on the icon
 * atlas, and a non-power-of-two texture is where that quietly stops being
 * portable. Two tiles side by side keep the atlas itself 512x256.
 */
const TILE = 256;

/** Keeps the fold and the eyes off the tile edge once the mark is scaled up. */
const PADDING = 6;

export type StickerIconName = 'plate' | 'face';

export interface StickerAtlas {
  readonly image: HTMLCanvasElement;
  /** Each tile as [x, y, width, height] in atlas pixels. */
  readonly frames: Record<StickerIconName, StickerFrame>;
}

let cached: StickerAtlas | null = null;

/**
 * Builds (once) the two-tile atlas both sticker layers draw from.
 *
 * Cached at module scope rather than rebuilt per render: the canvas becomes a
 * GPU texture, and handing deck a new one each time would re-upload it.
 */
export function stickerAtlas(): StickerAtlas {
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = TILE * 2;
  canvas.height = TILE;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('jpss: no 2D context for the sticker atlas');
  }

  // White on transparent. Only the alpha survives — mask icons take their colour
  // from the layer — so this is about coverage, not appearance.
  ctx.fillStyle = '#ffffff';

  const scale = (TILE - PADDING * 2) / VIEW_BOX;

  drawGlyph(ctx, [PLATE], 0, scale);
  drawGlyph(ctx, FACE, TILE, scale);

  cached = {
    image: canvas,
    frames: { plate: [0, 0, TILE, TILE], face: [TILE, 0, TILE, TILE] },
  };
  return cached;
}

function drawGlyph(
  ctx: CanvasRenderingContext2D,
  paths: readonly string[],
  offsetX: number,
  scale: number,
): void {
  ctx.save();
  ctx.translate(offsetX + PADDING, PADDING);
  ctx.scale(scale, scale);
  for (const d of paths) {
    // nonzero, the canvas default, which is also SVG's — so the outline's inner
    // subpath stays a hole rather than filling the card in.
    ctx.fill(new Path2D(d));
  }
  ctx.restore();
}
