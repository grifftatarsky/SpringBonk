// Polyhedral dice geometry: each face's ordered 3D transform steps and the
// rotation that brings a given result to the front. Translate values are in
// die-size hundredths — multiply by size/200 to get pixels (see die-3d).
//
// Vertex math adapted from gnuton/css-dice-roller (MIT). Vendored, not
// imported, so we own and can tweak the dice.

export type DieKey = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

export interface TransformStep {
  readonly type:
    | 'rotateX' | 'rotateY' | 'rotateZ'
    | 'translateX' | 'translateY' | 'translateZ'
    | 'scale';
  readonly value: number;
}

export interface DieGeometry {
  readonly faceCount: number;
  readonly faceTransforms: Readonly<Record<number, readonly TransformStep[]>>;
  readonly viewRotations: Readonly<Record<number, { x: number; y: number; z?: number }>>;
}

export const DICE_GEOMETRY: Readonly<Record<DieKey, DieGeometry>> = {
  d4: {
    faceCount: 4,
    faceTransforms: {
      1: [{ type: 'rotateY', value: 0 }, { type: 'rotateX', value: 19.471 }, { type: 'translateZ', value: 20.412 }, { type: 'translateY', value: -14.433 }],
      2: [{ type: 'rotateY', value: 120 }, { type: 'rotateX', value: 19.471 }, { type: 'translateZ', value: 20.412 }, { type: 'translateY', value: -14.433 }],
      3: [{ type: 'rotateY', value: 240 }, { type: 'rotateX', value: 19.471 }, { type: 'translateZ', value: 20.412 }, { type: 'translateY', value: -14.433 }],
      4: [{ type: 'rotateX', value: -90 }, { type: 'rotateZ', value: 180 }, { type: 'translateZ', value: 20.412 }, { type: 'translateY', value: -14.433 }],
    },
    viewRotations: {
      1: { x: -19.471, y: 0 },
      2: { x: -19.471, y: -120 },
      3: { x: -19.471, y: -240 },
      4: { x: 90, y: 0, z: 180 },
    },
  },
  d6: {
    faceCount: 6,
    faceTransforms: {
      1: [{ type: 'rotateY', value: 0 }, { type: 'rotateX', value: 0 }, { type: 'translateZ', value: 50 }],
      2: [{ type: 'rotateY', value: 90 }, { type: 'translateZ', value: 50 }],
      3: [{ type: 'rotateY', value: 180 }, { type: 'translateZ', value: 50 }],
      4: [{ type: 'rotateY', value: 270 }, { type: 'translateZ', value: 50 }],
      5: [{ type: 'rotateX', value: 90 }, { type: 'translateZ', value: 50 }],
      6: [{ type: 'rotateX', value: -90 }, { type: 'translateZ', value: 50 }],
    },
    viewRotations: {
      1: { x: 0, y: 0 },
      2: { x: 0, y: -90 },
      3: { x: 0, y: -180 },
      4: { x: 0, y: -270 },
      5: { x: -90, y: 0 },
      6: { x: 90, y: 0 },
    },
  },
  d8: {
    faceCount: 8,
    faceTransforms: {
      1: [{ type: 'rotateY', value: 0 }, { type: 'rotateX', value: 35.264 }, { type: 'translateZ', value: 40.825 }, { type: 'translateY', value: -14.433 }],
      2: [{ type: 'rotateY', value: 90 }, { type: 'rotateX', value: 35.264 }, { type: 'translateZ', value: 40.825 }, { type: 'translateY', value: -14.433 }],
      3: [{ type: 'rotateY', value: 180 }, { type: 'rotateX', value: 35.264 }, { type: 'translateZ', value: 40.825 }, { type: 'translateY', value: -14.433 }],
      4: [{ type: 'rotateY', value: 270 }, { type: 'rotateX', value: 35.264 }, { type: 'translateZ', value: 40.825 }, { type: 'translateY', value: -14.433 }],
      5: [{ type: 'rotateY', value: 0 }, { type: 'rotateX', value: -35.264 }, { type: 'rotateZ', value: 180 }, { type: 'translateZ', value: 40.825 }, { type: 'translateY', value: -14.433 }],
      6: [{ type: 'rotateY', value: 90 }, { type: 'rotateX', value: -35.264 }, { type: 'rotateZ', value: 180 }, { type: 'translateZ', value: 40.825 }, { type: 'translateY', value: -14.433 }],
      7: [{ type: 'rotateY', value: 180 }, { type: 'rotateX', value: -35.264 }, { type: 'rotateZ', value: 180 }, { type: 'translateZ', value: 40.825 }, { type: 'translateY', value: -14.433 }],
      8: [{ type: 'rotateY', value: 270 }, { type: 'rotateX', value: -35.264 }, { type: 'rotateZ', value: 180 }, { type: 'translateZ', value: 40.825 }, { type: 'translateY', value: -14.433 }],
    },
    viewRotations: {
      1: { x: -35.264, y: 0 },
      2: { x: -35.264, y: -90 },
      3: { x: -35.264, y: -180 },
      4: { x: -35.264, y: -270 },
      5: { x: 35.264, y: 0, z: 180 },
      6: { x: 35.264, y: -90, z: 180 },
      7: { x: 35.264, y: -180, z: 180 },
      8: { x: 35.264, y: -270, z: 180 },
    },
  },
  d10: {
    faceCount: 10,
    faceTransforms: {
      1: [{ type: 'rotateY', value: 0 }, { type: 'translateZ', value: 3 }, { type: 'translateY', value: -31 }, { type: 'rotateX', value: 45 }],
      2: [{ type: 'rotateY', value: -72 }, { type: 'translateZ', value: 3 }, { type: 'translateY', value: -31 }, { type: 'rotateX', value: 45 }],
      3: [{ type: 'rotateY', value: -144 }, { type: 'translateZ', value: 3 }, { type: 'translateY', value: -31 }, { type: 'rotateX', value: 45 }],
      4: [{ type: 'rotateY', value: -216 }, { type: 'translateZ', value: 3 }, { type: 'translateY', value: -31 }, { type: 'rotateX', value: 45 }],
      5: [{ type: 'rotateY', value: -288 }, { type: 'translateZ', value: 3 }, { type: 'translateY', value: -31 }, { type: 'rotateX', value: 45 }],
      6: [{ type: 'rotateY', value: 72 }, { type: 'translateZ', value: -3 }, { type: 'translateY', value: 31 }, { type: 'rotateZ', value: 180 }, { type: 'rotateY', value: 180 }, { type: 'rotateX', value: 45 }],
      7: [{ type: 'rotateY', value: 144 }, { type: 'translateZ', value: -3 }, { type: 'translateY', value: 31 }, { type: 'rotateZ', value: 180 }, { type: 'rotateY', value: 180 }, { type: 'rotateX', value: 45 }],
      8: [{ type: 'rotateY', value: 216 }, { type: 'translateZ', value: -3 }, { type: 'translateY', value: 31 }, { type: 'rotateZ', value: 180 }, { type: 'rotateY', value: 180 }, { type: 'rotateX', value: 45 }],
      9: [{ type: 'rotateY', value: 288 }, { type: 'translateZ', value: -3 }, { type: 'translateY', value: 31 }, { type: 'rotateZ', value: 180 }, { type: 'rotateY', value: 180 }, { type: 'rotateX', value: 45 }],
      10: [{ type: 'rotateY', value: 360 }, { type: 'translateZ', value: -3 }, { type: 'translateY', value: 31 }, { type: 'rotateZ', value: 180 }, { type: 'rotateY', value: 180 }, { type: 'rotateX', value: 45 }],
    },
    viewRotations: {
      1: { x: -45, y: 0 },
      2: { x: -45, y: 72 },
      3: { x: -45, y: 144 },
      4: { x: -45, y: 216 },
      5: { x: -45, y: 288 },
      6: { x: 45, y: -252 },
      7: { x: 45, y: -324 },
      8: { x: 45, y: -396 },
      9: { x: 45, y: -468 },
      10: { x: 45, y: -540 },
    },
  },
  d12: {
    faceCount: 12,
    faceTransforms: {
      1: [{ type: 'rotateX', value: 90 }, { type: 'translateY', value: -5.02 }, { type: 'translateZ', value: 68.819 }],
      2: [{ type: 'rotateX', value: -90 }, { type: 'translateY', value: -5.02 }, { type: 'translateZ', value: 68.819 }],
      3: [{ type: 'rotateY', value: 0 }, { type: 'rotateX', value: 26.565 }, { type: 'rotateZ', value: 180 }, { type: 'translateY', value: -5.02 }, { type: 'translateZ', value: 68.819 }],
      4: [{ type: 'rotateY', value: 72 }, { type: 'rotateX', value: 26.565 }, { type: 'rotateZ', value: 180 }, { type: 'translateY', value: -5.02 }, { type: 'translateZ', value: 68.819 }],
      5: [{ type: 'rotateY', value: 144 }, { type: 'rotateX', value: 26.565 }, { type: 'rotateZ', value: 180 }, { type: 'translateY', value: -5.02 }, { type: 'translateZ', value: 68.819 }],
      6: [{ type: 'rotateY', value: 216 }, { type: 'rotateX', value: 26.565 }, { type: 'rotateZ', value: 180 }, { type: 'translateY', value: -5.02 }, { type: 'translateZ', value: 68.819 }],
      7: [{ type: 'rotateY', value: 288 }, { type: 'rotateX', value: 26.565 }, { type: 'rotateZ', value: 180 }, { type: 'translateY', value: -5.02 }, { type: 'translateZ', value: 68.819 }],
      8: [{ type: 'rotateY', value: 36 }, { type: 'rotateX', value: -26.565 }, { type: 'translateY', value: -5.02 }, { type: 'translateZ', value: 68.819 }],
      9: [{ type: 'rotateY', value: 108 }, { type: 'rotateX', value: -26.565 }, { type: 'translateY', value: -5.02 }, { type: 'translateZ', value: 68.819 }],
      10: [{ type: 'rotateY', value: 180 }, { type: 'rotateX', value: -26.565 }, { type: 'translateY', value: -5.02 }, { type: 'translateZ', value: 68.819 }],
      11: [{ type: 'rotateY', value: 252 }, { type: 'rotateX', value: -26.565 }, { type: 'translateY', value: -5.02 }, { type: 'translateZ', value: 68.819 }],
      12: [{ type: 'rotateY', value: 324 }, { type: 'rotateX', value: -26.565 }, { type: 'translateY', value: -5.02 }, { type: 'translateZ', value: 68.819 }],
    },
    viewRotations: {
      1: { x: -90, y: 0 },
      2: { x: 90, y: 0 },
      3: { x: -26.565, y: 0, z: 180 },
      4: { x: -26.565, y: -72, z: 180 },
      5: { x: -26.565, y: -144, z: 180 },
      6: { x: -26.565, y: -216, z: 180 },
      7: { x: -26.565, y: -288, z: 180 },
      8: { x: 26.565, y: -36 },
      9: { x: 26.565, y: -108 },
      10: { x: 26.565, y: -180 },
      11: { x: 26.565, y: -252 },
      12: { x: 26.565, y: -324 },
    },
  },
  d20: {
    faceCount: 20,
    faceTransforms: {
      1: [{ type: 'rotateY', value: 0 }, { type: 'rotateX', value: 52.622 }, { type: 'translateZ', value: 75.57 }, { type: 'translateY', value: -14.433 }],
      2: [{ type: 'rotateY', value: 72 }, { type: 'rotateX', value: 52.622 }, { type: 'translateZ', value: 75.57 }, { type: 'translateY', value: -14.433 }],
      3: [{ type: 'rotateY', value: 144 }, { type: 'rotateX', value: 52.622 }, { type: 'translateZ', value: 75.57 }, { type: 'translateY', value: -14.433 }],
      4: [{ type: 'rotateY', value: 216 }, { type: 'rotateX', value: 52.622 }, { type: 'translateZ', value: 75.57 }, { type: 'translateY', value: -14.433 }],
      5: [{ type: 'rotateY', value: 288 }, { type: 'rotateX', value: 52.622 }, { type: 'translateZ', value: 75.57 }, { type: 'translateY', value: -14.433 }],
      6: [{ type: 'rotateY', value: 0 }, { type: 'rotateX', value: 10.812 }, { type: 'rotateZ', value: 180 }, { type: 'translateZ', value: 75.57 }, { type: 'translateY', value: -14.433 }],
      7: [{ type: 'rotateY', value: 72 }, { type: 'rotateX', value: 10.812 }, { type: 'rotateZ', value: 180 }, { type: 'translateZ', value: 75.57 }, { type: 'translateY', value: -14.433 }],
      8: [{ type: 'rotateY', value: 144 }, { type: 'rotateX', value: 10.812 }, { type: 'rotateZ', value: 180 }, { type: 'translateZ', value: 75.57 }, { type: 'translateY', value: -14.433 }],
      9: [{ type: 'rotateY', value: 216 }, { type: 'rotateX', value: 10.812 }, { type: 'rotateZ', value: 180 }, { type: 'translateZ', value: 75.57 }, { type: 'translateY', value: -14.433 }],
      10: [{ type: 'rotateY', value: 288 }, { type: 'rotateX', value: 10.812 }, { type: 'rotateZ', value: 180 }, { type: 'translateZ', value: 75.57 }, { type: 'translateY', value: -14.433 }],
      11: [{ type: 'rotateY', value: 36 }, { type: 'rotateX', value: -10.812 }, { type: 'translateZ', value: 75.57 }, { type: 'translateY', value: -14.433 }],
      12: [{ type: 'rotateY', value: 108 }, { type: 'rotateX', value: -10.812 }, { type: 'translateZ', value: 75.57 }, { type: 'translateY', value: -14.433 }],
      13: [{ type: 'rotateY', value: 180 }, { type: 'rotateX', value: -10.812 }, { type: 'translateZ', value: 75.57 }, { type: 'translateY', value: -14.433 }],
      14: [{ type: 'rotateY', value: 252 }, { type: 'rotateX', value: -10.812 }, { type: 'translateZ', value: 75.57 }, { type: 'translateY', value: -14.433 }],
      15: [{ type: 'rotateY', value: 324 }, { type: 'rotateX', value: -10.812 }, { type: 'translateZ', value: 75.57 }, { type: 'translateY', value: -14.433 }],
      16: [{ type: 'rotateY', value: 36 }, { type: 'rotateX', value: -52.622 }, { type: 'rotateZ', value: 180 }, { type: 'translateZ', value: 75.57 }, { type: 'translateY', value: -14.433 }],
      17: [{ type: 'rotateY', value: 108 }, { type: 'rotateX', value: -52.622 }, { type: 'rotateZ', value: 180 }, { type: 'translateZ', value: 75.57 }, { type: 'translateY', value: -14.433 }],
      18: [{ type: 'rotateY', value: 180 }, { type: 'rotateX', value: -52.622 }, { type: 'rotateZ', value: 180 }, { type: 'translateZ', value: 75.57 }, { type: 'translateY', value: -14.433 }],
      19: [{ type: 'rotateY', value: 252 }, { type: 'rotateX', value: -52.622 }, { type: 'rotateZ', value: 180 }, { type: 'translateZ', value: 75.57 }, { type: 'translateY', value: -14.433 }],
      20: [{ type: 'rotateY', value: 324 }, { type: 'rotateX', value: -52.622 }, { type: 'rotateZ', value: 180 }, { type: 'translateZ', value: 75.57 }, { type: 'translateY', value: -14.433 }],
    },
    viewRotations: {
      1: { x: -52.622, y: 0 },
      2: { x: -52.622, y: -72 },
      3: { x: -52.622, y: -144 },
      4: { x: -52.622, y: -216 },
      5: { x: -52.622, y: -288 },
      6: { x: -10.812, y: 0, z: 180 },
      7: { x: -10.812, y: -72, z: 180 },
      8: { x: -10.812, y: -144, z: 180 },
      9: { x: -10.812, y: -216, z: 180 },
      10: { x: -10.812, y: -288, z: 180 },
      11: { x: 10.812, y: -36 },
      12: { x: 10.812, y: -108 },
      13: { x: 10.812, y: -180 },
      14: { x: 10.812, y: -252 },
      15: { x: 10.812, y: -324 },
      16: { x: 52.622, y: -36, z: 180 },
      17: { x: 52.622, y: -108, z: 180 },
      18: { x: 52.622, y: -180, z: 180 },
      19: { x: 52.622, y: -252, z: 180 },
      20: { x: 52.622, y: -324, z: 180 },
    },
  },
};

export type DieShape = 'tri' | 'square' | 'kite' | 'penta';

/** Map any rollable die (incl. d100) to the geometry key that draws it. */
export function geometryKey(die: number): DieKey {
  switch (die) {
    case 4:
      return 'd4';
    case 6:
      return 'd6';
    case 8:
      return 'd8';
    case 12:
      return 'd12';
    case 20:
      return 'd20';
    default:
      // d10 and d100 (percentile) share the pentagonal trapezohedron.
      return 'd10';
  }
}

const SHAPES: Readonly<Record<DieKey, DieShape>> = {
  d4: 'tri',
  d8: 'tri',
  d20: 'tri',
  d6: 'square',
  d10: 'kite',
  d12: 'penta',
};

const POINTS: Readonly<Record<DieShape, string>> = {
  tri: '50,0 0,100 100,100',
  square: '0,0 100,0 100,100 0,100',
  kite: '50,0 100,80.65 50,100 0,80.65',
  penta: '50,0 100,38.2 80.9,100 19.1,100 0,38.2',
};

export function shapeOf(die: number): DieShape {
  return SHAPES[geometryKey(die)];
}

export function pointsOf(die: number): string {
  return POINTS[shapeOf(die)];
}

export interface Face {
  readonly index: number;
  readonly transform: string;
  /** d10 only: top ring (1) or bottom ring (2); 0 for every other die. */
  readonly ring: 0 | 1 | 2;
}

/**
 * Build the per-face CSS transform strings for a die at a given pixel size.
 * Mirrors the reference's transform assembly: rotations in degrees, translates
 * scaled by size/200 (the geometry stores die-size hundredths).
 */
export function buildFaces(die: number, size: number): readonly Face[] {
  const key = geometryKey(die);
  const geo = DICE_GEOMETRY[key];
  const a = size / 200;
  const faces: Face[] = [];
  for (let n = 1; n <= geo.faceCount; n++) {
    const steps = geo.faceTransforms[n] ?? [];
    let t = '';
    for (const s of steps) {
      switch (s.type) {
        case 'rotateX':
        case 'rotateY':
        case 'rotateZ':
          t += ` ${s.type}(${s.value}deg)`;
          break;
        case 'translateX':
        case 'translateY':
        case 'translateZ':
          t += ` ${s.type}(${s.value * a}px)`;
          break;
        case 'scale':
          t += ` scale(${s.value})`;
          break;
      }
    }
    const ring: 0 | 1 | 2 = key === 'd10' ? (n <= 5 ? 1 : 2) : 0;
    faces.push({ index: n, transform: t.trim(), ring });
  }
  return faces;
}
