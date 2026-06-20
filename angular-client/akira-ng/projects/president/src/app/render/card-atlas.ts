import { CardId, faceIds, Rank, Suit, SUIT_GLYPH } from '../game/card';

/** Resolved theme colours (CSS colour strings) pulled from the host's tokens. */
export interface CardTheme {
  /** Page background — the table surface / canvas clear colour (--color-bg). */
  readonly bg: string;
  /** Faint card surface, distinct from the table (--color-bg-subtle). */
  readonly surface: string;
  /** Card outline + rank/suit glyphs (--color-fg). */
  readonly ink: string;
  /** Secondary lines — opponent backs, hatching (--color-fg-muted). */
  readonly muted: string;
  /** Hairlines (--color-rule). */
  readonly faint: string;
}

/** Normalized (0..1) sub-rectangle of the atlas for one card face. */
export interface AtlasRect {
  readonly u: number;
  readonly v: number;
  readonly w: number;
  readonly h: number;
}

export interface CardAtlas {
  readonly source: HTMLCanvasElement;
  readonly width: number;
  readonly height: number;
  /** UV rect per card, plus a card back under key 'BACK'. */
  readonly rects: ReadonlyMap<CardId | 'BACK', AtlasRect>;
}

const COLS = 8;
const CELL_W = 220;
const CELL_H = 308; // 2.5 : 3.5 playing-card ratio
const GUTTER = 6; // transparent margin so neighbours never bleed under sampling
const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/**
 * Renders every card face (plus a card back) into a single offscreen canvas in
 * a flat **wireframe** style — stroked outlines and monochrome glyphs in the
 * site's foreground colour, no fills beyond a faint surface tint — echoing the
 * dice roller. Rebuilt whenever the theme (light/dark) changes; the result is
 * uploaded to a GPUTexture and sampled per-instance.
 */
export function buildCardAtlas(theme: CardTheme): CardAtlas {
  const keys: (CardId | 'BACK')[] = [...faceIds(), 'BACK'];
  const rows = Math.ceil(keys.length / COLS);

  const width = COLS * CELL_W;
  const height = rows * CELL_H;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D context unavailable for card atlas');
  }
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const rects = new Map<CardId | 'BACK', AtlasRect>();

  keys.forEach((key, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = col * CELL_W + GUTTER;
    const y = row * CELL_H + GUTTER;
    const w = CELL_W - GUTTER * 2;
    const h = CELL_H - GUTTER * 2;

    if (key === 'BACK') {
      drawBack(ctx, x, y, w, h, theme);
    } else {
      const rank = key.slice(0, -1) as Rank;
      const suit = key.slice(-1) as Suit;
      drawFace(ctx, x, y, w, h, rank, suit, theme);
    }

    rects.set(key, { u: x / width, v: y / height, w: w / width, h: h / height });
  });

  return { source: canvas, width, height, rects };
}

function cardOutline(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  theme: CardTheme,
): void {
  roundRect(ctx, x, y, w, h, w * 0.09);
  ctx.fillStyle = theme.surface;
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, w * 0.022);
  ctx.strokeStyle = theme.ink;
  ctx.stroke();
}

function drawFace(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rank: Rank,
  suit: Suit,
  theme: CardTheme,
): void {
  cardOutline(ctx, x, y, w, h, theme);
  const glyph = SUIT_GLYPH[suit];
  const pad = w * 0.11;
  ctx.fillStyle = theme.ink;

  // Corner index: rank over a small suit glyph, top-left and (rotated) bottom-right.
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  corner(ctx, rank, glyph, x + pad, y + pad * 0.9, w);
  ctx.save();
  ctx.translate(x + w, y + h);
  ctx.rotate(Math.PI);
  corner(ctx, rank, glyph, pad, pad * 0.9, w);
  ctx.restore();

  // Centre: big rank letter for court cards, big suit pip otherwise.
  const isCourt = rank === 'J' || rank === 'Q' || rank === 'K';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (isCourt) {
    ctx.font = `600 ${w * 0.58}px ${FONT}`;
    ctx.fillText(rank, x + w / 2, y + h / 2);
  } else {
    ctx.font = `${w * 0.62}px ${FONT}`;
    ctx.fillText(glyph, x + w / 2, y + h * 0.52);
  }
}

function corner(
  ctx: CanvasRenderingContext2D,
  rank: string,
  glyph: string,
  x: number,
  y: number,
  w: number,
): void {
  ctx.font = `600 ${w * 0.19}px ${FONT}`;
  ctx.fillText(rank, x, y);
  ctx.font = `${w * 0.16}px ${FONT}`;
  ctx.fillText(glyph, x, y + w * 0.2);
}

function drawBack(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  theme: CardTheme,
): void {
  cardOutline(ctx, x, y, w, h, theme);
  // Inner panel + diagonal hatch in the muted tone — a quiet "back" pattern.
  const ix = x + w * 0.13;
  const iy = y + h * 0.1;
  const iw = w * 0.74;
  const ih = h * 0.8;
  ctx.save();
  roundRect(ctx, ix, iy, iw, ih, w * 0.05);
  ctx.clip();
  ctx.strokeStyle = theme.muted;
  ctx.lineWidth = Math.max(1, w * 0.012);
  const step = w * 0.16;
  for (let d = -ih; d < iw; d += step) {
    ctx.beginPath();
    ctx.moveTo(ix + d, iy + ih);
    ctx.lineTo(ix + d + ih, iy);
    ctx.stroke();
  }
  ctx.restore();
  roundRect(ctx, ix, iy, iw, ih, w * 0.05);
  ctx.strokeStyle = theme.muted;
  ctx.lineWidth = Math.max(1, w * 0.012);
  ctx.stroke();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
