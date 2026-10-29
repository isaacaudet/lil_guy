import { stamp, T, type Stamp } from './art';
import type { Canvas } from './canvas';

/**
 * Markings on the body. They are painted before the face, and only onto the
 * body itself, so the face always draws over them and nothing sticks out past
 * the outline. They stay quiet on purpose: a busy pattern fights the face,
 * which is the part that carries the character.
 */
export interface Marking {
  name: string;
  draw: (c: Canvas) => void;
}

/** Each single mark, biggest first: a smaller body gets the smaller one. */
const heart = [
  ['r.r', 'rrr', '.r.'],
  ['r.r', '.r.'],
].map(stamp);

const star = [
  ['.y.', 'ywy', '.y.'],
  ['.y.', 'yyy', '.y.'],
  ['y'],
].map(stamp);

const moon = [
  ['.yy', 'y..', 'y..', '.yy'],
  ['.yy', 'y..', '.yy'],
  ['.y', 'y.', '.y'],
].map(stamp);

const bolt = [
  ['..y', '.yy', 'yyy', 'yy.', 'y..'],
  ['..y', 'yyy', 'y..'],
  ['.y', 'yy', 'y.'],
].map(stamp);

/** The cells the eyes and mouth take, as `y * 64 + x`. */
const faceOf = (c: Canvas): Set<number> => {
  const f = c.face, out = new Set<number>();
  if (!f) return out;
  for (let y = f.top; y <= f.line; y++) for (const e of f.eyes) for (let x = e.left; x <= e.right; x++) out.add(y * 64 + x);
  const mx = c.centred(f.mouth);
  f.mouth.forEach((row, dy) => row.forEach((t, dx) => { if (t) out.add((f.mouthTop + dy) * 64 + mx + dx); }));
  return out;
};

/**
 * Where a mark goes: every pixel on the body (with body either side, unless
 * `loose`), and a clear pixel from the eyes and mouth, so it never reads as
 * part of the face. Under the mouth first, then low on either side, then the
 * forehead (where hair or a hat would most often cover it).
 */
const spotFor = (c: Canvas, s: Stamp, loose = false): [number, number] | null => {
  const face = faceOf(c);
  const inside = (x: number, y: number) => c.isBody(x, y) && (loose || (c.isBody(x - 1, y) && c.isBody(x + 1, y)));
  const nearFace = (x: number, y: number) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (face.has((y + dy) * 64 + x + dx)) return true; return false; };
  const fits = (x0: number, y0: number) => s.every((row, dy) => row.every((t, dx) => !t || (inside(x0 + dx, y0 + dy) && !nearFace(x0 + dx, y0 + dy))));
  const w = s[0].length, h = s.length, mid = Math.floor(c.centre) - Math.floor(w / 2), f = c.face;
  const tries: [number, number][] = [];
  if (f) for (let y = f.mouthBottom + 2; y <= c.bottom - h + 1; y++) tries.push([mid, y], [mid - 1, y], [mid + 1, y]);
  if (f) for (let y = c.bottom - h + 1; y >= f.top; y--) for (let off = 2; off <= 6; off++) tries.push([mid + off, y], [mid - off, y]);
  for (let y = c.crown; y <= (f ? f.top - h : c.crown + 1); y++) for (const off of [0, -2, 2, -3, 3]) tries.push([mid + off, y]);
  return tries.find(([x, y]) => fits(x, y)) ?? null;
};

/**
 * A mark drawn as big as there's room for: the full one, else a smaller one
 * of the same thing, so a small body still shows its mark.
 */
const mark = (c: Canvas, sizes: Stamp[]) => {
  // Each size first well inside the body, then out to its edge.
  for (const loose of [false, true]) for (const s of sizes) {
    const at = spotFor(c, s, loose);
    if (at) { c.draw(s, at[0], at[1], true); return; }
  }
};

/** Paints only where the bare body is — markings never leave the silhouette. */
function onBody(c: Canvas, x: number, y: number, token: number): void {
  if (c.isBody(x, y)) c.set(x, y, token);
}

export const bodies: Marking[] = [
  { name: 'plain', draw: () => {} },

  {
    name: 'belly',
    draw: c => {
      const x = Math.floor(c.centre);
      for (let dx = -2; dx < 2; dx++) onBody(c, x + dx, c.bottom - 1, T.BELLY);
      for (let dx = -3; dx < 3; dx++) onBody(c, x + dx, c.bottom, T.BELLY);
    },
  },

  {
    name: 'two tone',
    draw: c => {
      for (let y = c.eyeLine + 2; y <= c.bottom; y++) {
        const r = c.rows[y];
        if (r) for (let x = r.left + 1; x < r.right; x++) onBody(c, x, y, T.BELLY);
      }
    },
  },

  {
    name: 'tabby',
    draw: c => {
      const x = Math.floor(c.centre);
      for (const dx of [-3, -1, 0, 2]) {
        onBody(c, x + dx, c.crown + 1, T.SHADE);
        onBody(c, x + dx, c.crown + 2, T.SHADE);
      }
    },
  },

  {
    name: 'spots',
    draw: c => {
      const x = Math.floor(c.centre);
      const y = c.crown + 1;
      onBody(c, x - 3, y + 1, T.SHADE);
      onBody(c, x - 2, y + 1, T.SHADE);
      onBody(c, x - 3, y + 2, T.SHADE);
      onBody(c, x + 2, y, T.SHADE);
      const low = c.rows[c.bottom - 1];
      if (low) {
        onBody(c, low.right - 1, c.bottom - 1, T.SHADE);
        onBody(c, low.right - 2, c.bottom - 1, T.SHADE);
      }
    },
  },

  {
    name: 'star mark',
    draw: c => {
      mark(c, star);
    },
  },

  {
    name: 'heart mark',
    draw: c => {
      mark(c, heart);
    },
  },

  {
    name: 'gleam',
    draw: c => {
      // A second, bigger shine, as if the guy were glazed: a white streak
      // curving down the upper right, the opposite side from his own gleam.
      // Three pixels in a column were barely there.
      const r = c.rows[c.crown + 1], r2 = c.rows[c.crown + 2], r3 = c.rows[c.crown + 3];
      if (!r || !r2 || !r3) return;
      onBody(c, r.right - 3, c.crown + 1, T.LIGHT);
      onBody(c, r.right - 2, c.crown + 1, T.WHITE);
      onBody(c, r2.right - 2, c.crown + 2, T.LIGHT);
      onBody(c, r2.right - 1, c.crown + 2, T.WHITE);
      onBody(c, r3.right - 1, c.crown + 3, T.LIGHT);
    },
  },

  {
    name: 'stripes',
    draw: c => {
      for (let y = c.eyeLine + 3; y <= c.bottom; y += 2) {
        const r = c.rows[y];
        if (r) for (let x = r.left + 1; x < r.right; x++) onBody(c, x, y, T.ACCENT);
      }
    },
  },

  {
    name: 'zigzag',
    draw: c => {
      // Under the mouth, with a row of skin between, where a big mouth reaches low and the body has room.
      const low = (c.face?.mouthBottom ?? 0) + 2;
      const y = low > c.eyeLine + 3 && low < c.bottom ? low : c.eyeLine + 3;
      const r = c.rows[y];
      if (r) for (let x = r.left; x <= r.right; x++) onBody(c, x, y + (x % 2), T.ACCENT);
    },
  },

  {
    name: 'split',
    draw: c => {
      // The left half a shade lighter, like a two-colour toy.
      for (let y = c.crown; y <= c.bottom; y++) {
        const r = c.rows[y];
        if (r) for (let x = r.left; x < Math.floor(c.centre); x++) if (c.get(x, y) === T.BODY) onBody(c, x, y, T.BELLY);
      }
    },
  },

  {
    name: 'moon mark',
    draw: c => {
      mark(c, moon);
    },
  },

  {
    name: 'bolt mark',
    draw: c => {
      mark(c, bolt);
    },
  },

  {
    name: 'starry',
    draw: c => {
      // A night sky on the body: two gold twinkles with white hearts, and a
      // few specks. Single specks alone vanished on a light body.
      const x = Math.floor(c.centre);
      for (const [sx, sy] of [[x + 3, c.crown + 2], [x - 4, c.bottom - 1]]) {
        for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) onBody(c, sx + dx, sy + dy, T.GOLD);
        onBody(c, sx, sy, T.WHITE);
      }
      onBody(c, x - 3, c.crown + 2, T.GOLD);
      onBody(c, x + 4, c.bottom - 1, T.WHITE);
      onBody(c, x - 1, c.crown + 1, T.WHITE);
    },
  },

  {
    name: 'polka dots',
    draw: c => {
      const x = Math.floor(c.centre);
      const dots = [[-4, c.crown + 2], [-1, c.crown + 1], [2, c.crown + 2], [5, c.crown + 4],
        [-5, c.eyeLine + 2], [-2, c.bottom - 1], [1, c.bottom], [4, c.bottom - 1]];
      for (const [dx, y] of dots) onBody(c, x + dx, y, T.ACCENT);
    },
  },

  {
    name: 'blaze',
    draw: c => {
      // A pale stripe down the middle of the forehead, like a pony's.
      const x = Math.floor(c.centre);
      for (let y = c.crown; y <= c.eyeLine - 1; y++) { onBody(c, x - 1, y, T.BELLY); onBody(c, x, y, T.BELLY); }
    },
  },

  {
    name: 'sprinkles',
    draw: c => {
      const x = Math.floor(c.centre);
      const bits: [number, number, number][] = [[-4, c.crown + 2, T.ACCENT], [-1, c.crown + 1, T.GOLD], [2, c.crown + 2, T.BLUSH],
        [5, c.crown + 4, T.LEAF], [-5, c.eyeLine + 2, T.GOLD], [-2, c.bottom - 1, T.LEAF], [1, c.bottom, T.ACCENT], [4, c.bottom - 1, T.BLUSH]];
      for (const [dx, y, t] of bits) onBody(c, x + dx, y, t);
    },
  },

  // Chase markings, one guy in several hundred.
  {
    name: 'kintsugi',
    draw: c => {
      // Mended with gold: two cracks filled with it, like a treasured bowl.
      const x = Math.floor(c.centre);
      const cracks = [
        [[1, c.crown], [2, c.crown + 1], [2, c.crown + 2], [3, c.crown + 3], [4, c.crown + 3], [5, c.crown + 4], [5, c.crown + 5]],
        [[-6, c.bottom - 3], [-5, c.bottom - 2], [-4, c.bottom - 2], [-3, c.bottom - 1], [-3, c.bottom], [-2, c.bottom]],
      ];
      for (const crack of cracks) crack.forEach(([dx, y], i) => onBody(c, x + dx, y, i % 3 === 1 ? T.GOLD_SHADE : T.GOLD));
    },
  },

  {
    name: 'gold dipped',
    draw: c => {
      // Dipped feet first in gold: the bottom of the body gilded, its edge
      // uneven where the gold ran.
      const x = Math.floor(c.centre);
      for (let y = c.bottom - 2; y <= c.bottom; y++) {
        const r = c.rows[y];
        if (r) for (let gx = r.left; gx <= r.right; gx++) onBody(c, gx, y, y === c.bottom ? T.GOLD_SHADE : T.GOLD);
      }
      for (const dx of [-4, -1, 3]) onBody(c, x + dx, c.bottom - 3, T.GOLD);
      onBody(c, x - 4, c.bottom - 4, T.GOLD);
    },
  },
];
