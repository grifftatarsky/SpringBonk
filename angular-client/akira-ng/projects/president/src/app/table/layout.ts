import { CardSprite } from '../render/card-renderer';
import { Card, cardFace } from '../game/card';
import { GameState, PlayerId } from '../game/state';

/** A render sprite plus a stable id (the card uid) for the animator to track. */
export interface IdSprite extends CardSprite {
  readonly id: string;
}

/** A clickable region for one of the human's cards, in CSS-pixel space. */
export interface PickRect {
  readonly uid: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly rot: number;
}

export interface TableLayout {
  readonly sprites: IdSprite[];
  /** Hit regions for the human's hand (topmost last, for reverse hit-testing). */
  readonly picks: PickRect[];
}

const DEG = Math.PI / 180;
/** Space reserved at the bottom for the controls bar (so the hand clears it). */
const BOTTOM_RESERVE = 108;
const EDGE_MARGIN = 14;
/** Width of the left info sidebar — kept in sync with the CSS panel width. */
const SIDEBAR_WIDTH = 200;

interface Seat {
  cx: number;
  cy: number;
  ax: number; // unit vector the hand spreads along
  ay: number;
  lx: number; // unit vector toward table centre (lift / bow)
  ly: number;
  rot: number;
  /** Max length the fan may occupy along its spread axis. */
  span: number;
}

/**
 * Builds every sprite for the current game state. Cards are sized to the smaller
 * window dimension and every fan is bounded — heavy overlap for big hands rather
 * than spilling off-screen — so a 26-card hand still fits. The human's hand sits
 * in a band above the controls bar, fully visible and clickable.
 */
export function layoutTable(
  state: GameState,
  humanId: PlayerId,
  selected: ReadonlySet<string>,
  hovered: string | null,
  sidebarOpen: boolean,
  w: number,
  h: number,
): TableLayout {
  const sprites: IdSprite[] = [];
  const picks: PickRect[] = [];

  const n = state.players.length;
  // Cards shrink as the table fills so up to 8 hands still fit.
  const maxCard = n <= 4 ? 86 : n <= 6 ? 74 : 62;
  const cardH = clamp(Math.min(w, h) * 0.12, 46, maxCard);
  const cardW = cardH * (2.5 / 3.5);

  const humanSeat = state.players.find((p) => p.id === humanId)?.seat ?? 0;

  // Reserve a strip on the left for the info sidebar (only while it's open), and
  // centre the table in the remaining space so nothing is drawn under the panel.
  const padLeft = sidebarOpen ? Math.min(SIDEBAR_WIDTH, w * 0.24) : 0;
  const midX = (padLeft + w) / 2;
  const midY = (h - BOTTOM_RESERVE) / 2;
  const horizSpan = (w - padLeft) * 0.8;

  // The human always sits South (bottom). Opponents sit on an ellipse arcing
  // across the top, left → right, so any 3–8 player table fits.
  const rx = (w - padLeft) / 2 - cardH * 1.15;
  const ry = midY - cardH * 1.15;
  const opp = n - 1;
  const oppSpan = clamp(
    (Math.min(w - padLeft, h - BOTTOM_RESERVE) * 0.5) / Math.max(1, Math.sqrt(opp)),
    52,
    horizSpan,
  );

  for (const player of state.players) {
    const offset = (player.seat - humanSeat + n) % n;
    const isHuman = player.id === humanId;
    const isActive = state.phase === 'playing' && state.turn === player.seat;
    const seat: Seat =
      offset === 0
        ? { cx: midX, cy: h - BOTTOM_RESERVE - cardH * 0.5, ax: 1, ay: 0, lx: 0, ly: -1, rot: 0, span: horizSpan }
        : opponentSeat(offset - 1, opp, midX, midY, rx, ry, oppSpan);

    fan(sprites, picks, {
      seat,
      cards: player.hand,
      faceUp: isHuman,
      selected: isHuman ? selected : null,
      hovered: isHuman ? hovered : null,
      cardW,
      cardH,
      shade: isHuman ? 1 : isActive ? 1 : 0.68,
      spread: 11 * DEG,
    });
  }

  // The current trick: each play cascades onto the pile so you can follow the
  // sequence — newest centred and bright, earlier plays stepped up-left and dim.
  const shown = state.trick.plays.slice(-5);
  const m = shown.length;
  const cx0 = midX;
  const cy0 = (h - BOTTOM_RESERVE) / 2;
  const stepX = cardW * 0.55;
  const stepY = cardH * 0.18;
  shown.forEach((play, i) => {
    const back = m - 1 - i; // 0 = newest (front), larger = older
    const cards = play.combo.cards;
    fan(sprites, picks, {
      seat: {
        cx: cx0 - back * stepX,
        cy: cy0 - back * stepY,
        ax: 1,
        ay: 0,
        lx: 0,
        ly: -1,
        rot: (i % 2 === 0 ? -1 : 1) * back * 4 * DEG,
        span: Math.max(cardW * 1.4, cardW * 0.7 * cards.length),
      },
      cards,
      faceUp: true,
      selected: null,
      hovered: null,
      cardW: cardW * 1.05,
      cardH: cardH * 1.05,
      shade: back === 0 ? 1 : 0.42,
      spread: 5 * DEG,
    });
  });

  return { sprites, picks };
}

interface FanArgs {
  seat: Seat;
  cards: readonly Card[];
  faceUp: boolean;
  selected: ReadonlySet<string> | null; // non-null only for the human's hand
  hovered: string | null;
  cardW: number;
  cardH: number;
  shade: number;
  spread: number;
}

function fan(sprites: IdSprite[], picks: PickRect[], a: FanArgs): void {
  const count = a.cards.length;
  if (count <= 0) {
    return;
  }
  const half = (count - 1) / 2;
  // Fit the whole fan within the seat's span (overlap as needed).
  const spacing = count > 1 ? Math.min(a.cardW * 0.5, (a.seat.span - a.cardW) / (count - 1)) : 0;
  const bow = a.cardH * 0.05;
  const selectLift = a.cardH * 0.34;
  const hoverLift = a.cardH * 0.16;

  for (let i = 0; i < count; i++) {
    const card = a.cards[i];
    const off = i - half;
    const norm = half === 0 ? 0 : off / half;
    const along = off * spacing;
    const bowMag = norm * norm * bow;

    let x = a.seat.cx + a.seat.ax * along - a.seat.lx * bowMag;
    let y = a.seat.cy + a.seat.ay * along - a.seat.ly * bowMag;
    const rot = a.seat.rot + norm * a.spread;

    const isSelected = a.selected != null && a.selected.has(card.uid);
    const isHovered = !isSelected && a.hovered === card.uid;
    const lift = isSelected ? selectLift : isHovered ? hoverLift : 0;
    if (lift) {
      x += a.seat.lx * lift;
      y += a.seat.ly * lift;
    }

    sprites.push({
      id: card.uid,
      key: a.faceUp ? cardFace(card) : 'BACK',
      x,
      y,
      w: a.cardW,
      h: a.cardH,
      rot,
      shade: isSelected ? 1.14 : a.shade,
    });

    if (a.faceUp && a.selected) {
      picks.push({ uid: card.uid, x, y, w: a.cardW, h: a.cardH, rot });
    }
  }
}

/** Point-in-rotated-rect test, for click-to-select. */
export function hitTest(picks: readonly PickRect[], px: number, py: number): string | null {
  for (let i = picks.length - 1; i >= 0; i--) {
    const r = picks[i];
    const dx = px - r.x;
    const dy = py - r.y;
    const c = Math.cos(-r.rot);
    const s = Math.sin(-r.rot);
    const lx = dx * c - dy * s;
    const ly = dx * s + dy * c;
    if (Math.abs(lx) <= r.w / 2 && Math.abs(ly) <= r.h / 2) {
      return r.uid;
    }
  }
  return null;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Places opponent `j` of `opp` total on the table's top ellipse, fanning toward
 * the centre. j=0 is the leftmost seat, j=opp-1 the rightmost; for 3 opponents
 * this lands them at left / top / right (the classic West / North / East).
 */
function opponentSeat(
  j: number,
  opp: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  span: number,
): Seat {
  const t = opp <= 1 ? 0.5 : j / (opp - 1);
  const angle = (180 + t * 180) * DEG; // 180° (left) → 360° (right), over the top
  const radX = Math.cos(angle);
  const radY = Math.sin(angle);
  return {
    cx: cx + rx * radX,
    cy: cy + ry * radY,
    ax: -radY, // tangent to the ellipse — cards fan along it
    ay: radX,
    lx: -radX, // toward table centre — selection/bow direction
    ly: -radY,
    rot: Math.atan2(-radX, radY), // card "up" points to the centre
    span,
  };
}
