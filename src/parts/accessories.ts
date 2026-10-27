import { stamp, T, width } from './art';
import type { Canvas } from './canvas';

/**
 * Small things a guy wears. Each says when it is drawn: `face` pieces go on
 * before the eyes, so the eyes always show through a pair of glasses; `body`
 * pieces go on after the face but never over the mouth, so a scarf can't hide
 * a smile.
 */
export interface Accessory {
  name: string;
  /** `face` goes on before the eyes, `over` after them (it covers an eye), `body` after the face. */
  layer: 'face' | 'over' | 'body';
  draw: (c: Canvas) => void;
}

/**
 * The box round one eye that a lens frames: a column of glass either side of
 * the eye and a rim round that. Built from where the eyes really are, so any
 * eyes on any head sit in the middle of their lens.
 */
function lensBox(c: Canvas, k: number) {
  const f = c.face!, e = f.eyes[k];
  return { left: e.left - 2, right: e.right + 2, top: f.top - 1, bottom: f.line + 1 };
}

/** A rim round a box with its corners cut, so a lens reads round. */
function rim(c: Canvas, b: { left: number; right: number; top: number; bottom: number }, token: number, fill?: number): void {
  for (let y = b.top; y <= b.bottom; y++) for (let x = b.left; x <= b.right; x++) {
    const edgeX = x === b.left || x === b.right, edgeY = y === b.top || y === b.bottom;
    if (edgeX && edgeY) continue;
    if (edgeX || edgeY) c.set(x, y, token);
    else if (fill !== undefined) c.set(x, y, fill);
  }
}

/** Glasses that fit the eyes: a lens round each, a bridge, and arms to the side of the head. */
function fittedGlasses(c: Canvas, frame: number, glass: number | undefined, glint: number): void {
  const f = c.face;
  if (!f || !f.eyes.length) return;
  const boxes = f.eyes.map((_, k) => lensBox(c, k));
  boxes.forEach(b => { rim(c, b, frame, glass); c.set(b.left + 1, b.top + 1, glint); });
  // The bridge, level with the top of the eyes, where the lenses don't already meet.
  if (boxes.length === 2) for (let x = boxes[0].right + 1; x < boxes[1].left; x++) c.set(x, f.top, frame);
  // Arms out to the edge of the head.
  const r = c.rows[f.top];
  if (r) {
    for (let x = r.left; x < boxes[0].left; x++) c.set(x, f.top, frame);
    for (let x = boxes[boxes.length - 1].right + 1; x <= r.right; x++) c.set(x, f.top, frame);
  }
}


const bowtie = stamp([
  'aa..aa',
  'aAxxAa',
  'aa..aa',
]);

const star = stamp([
  '.y.',
  'yyy',
  '.y.',
]);

const heart = stamp([
  'r.r',
  'rrr',
  '.r.',
]);


const flower = stamp([
  '.a.',
  'aya',
  '.a.',
]);

/** Paints a body cell unless the mouth is already there. */
function wear(c: Canvas, x: number, y: number, token: number): void {
  if (c.get(x, y) === T.MOUTH || c.get(x, y) === T.TONGUE) return;
  c.set(x, y, token);
}

/** Whether a cell is on or next to an eye or the mouth. */
function nearFace(c: Canvas, x: number, y: number, gap = 1): boolean {
  const f = c.face;
  if (!f) return false;
  const mx = c.centred(f.mouth);
  for (let dy = -gap; dy <= gap; dy++) for (let dx = -gap; dx <= gap; dx++) {
    const px = x + dx, py = y + dy;
    if (py >= f.top && py <= f.line && f.eyes.some(e => px >= e.left && px <= e.right)) return true;
    if (f.mouth[py - f.mouthTop]?.[px - mx]) return true;
  }
  return false;
}

/**
 * Where a `w` by `h` piece goes on the chest: every cell on the body and a cell clear of the face. Low on the wearer's right first, then their left, then under the mouth.
 */
function clearSpot(c: Canvas, w: number, h: number, gap = 1, top = c.eyeLine - 1): [number, number] | null {
  const mid = Math.floor(c.centre) - 1;
  const fits = (x0: number, y0: number) => {
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) if (!c.isBody(x0 + dx, y0 + dy) || nearFace(c, x0 + dx, y0 + dy, gap)) return false;
    return true;
  };
  const tries: [number, number][] = [];
  for (let off = 2; off <= 6; off++) for (let y = c.bottom - h + 1; y >= top; y--) tries.push([mid + off, y], [mid - off + 2 - w, y]);
  for (let y = (c.face?.mouthBottom ?? c.eyeLine) + 2; y <= c.bottom - h + 1; y++) tries.push([mid, y]);
  return tries.find(([x, y]) => fits(x, y)) ?? null;
}

export const accessories: Accessory[] = [
  { name: 'none', layer: 'body', draw: () => {} },

  {
    name: 'glasses',
    layer: 'face',
    // Lenses in the skin's own highlight, so the eyes read through a frame on any skin.
    draw: c => fittedGlasses(c, T.ACCENT_SHADE, T.LIGHT, T.WHITE),
  },

  {
    name: 'scarf',
    layer: 'body',
    draw: c => {
      const y = c.neck;
      const r = c.rows[y];
      if (!r) return;
      for (let x = r.left; x <= r.right; x++) wear(c, x, y, (x - r.left) % 4 < 2 ? T.ACCENT : T.TRIM);
      wear(c, r.right - 2, y + 1, T.ACCENT);
      wear(c, r.right - 2, y + 2, T.ACCENT_SHADE);
    },
  },

  {
    name: 'bell collar',
    layer: 'body',
    draw: c => {
      const y = c.neck;
      const r = c.rows[y];
      if (!r) return;
      for (let x = r.left; x <= r.right; x++) wear(c, x, y, T.ACCENT);
      const x = Math.floor(c.centre);
      wear(c, x - 1, y + 1, T.GOLD);
      wear(c, x, y + 1, T.GOLD_SHADE);
    },
  },

  {
    name: 'bowtie',
    layer: 'body',
    draw: c => {
      const x = c.centred(bowtie);
      bowtie.forEach((row, dy) => row.forEach((token, dx) => {
        if (token) wear(c, x + dx, c.neck + dy, token);
      }));
    },
  },

  {
    name: 'bandana',
    layer: 'body',
    draw: c => {
      const y = c.neck;
      const r = c.rows[y];
      if (!r) return;
      for (let x = r.left; x <= r.right; x++) wear(c, x, y, T.ACCENT);
      const x = Math.floor(c.centre);
      for (let dx = -2; dx < 2; dx++) wear(c, x + dx, y + 1, T.ACCENT);
      wear(c, x - 1, y + 2, T.ACCENT_SHADE);
      wear(c, x, y + 2, T.ACCENT_SHADE);
    },
  },

  {
    name: 'star sticker',
    layer: 'body',
    draw: c => {
      const r = c.rows[c.eyeLine - 3];
      if (r) c.draw(star, r.right - 3, c.eyeLine - 4, true);
    },
  },

  {
    name: 'heart badge',
    layer: 'body',
    draw: c => {
      const r = c.rows[c.bottom - 1];
      if (!r) return;
      heart.forEach((row, dy) => row.forEach((token, dx) => {
        const x = r.right - 3 + dx, y = c.bottom - 2 + dy;
        if (token && c.isBody(x, y)) wear(c, x, y, token);
      }));
    },
  },

  {
    name: 'monocle',
    layer: 'face',
    draw: c => {
      // A gold rim round the right eye, on a chain that hangs from it.
      const f = c.face;
      if (!f || !f.eyes.length) return;
      const b = lensBox(c, f.eyes.length - 1);
      rim(c, b, T.GOLD, T.LIGHT);
      c.set(b.left + 1, b.top + 1, T.WHITE);
      for (let y = b.bottom + 1; y <= Math.min(b.bottom + 2, c.bottom); y++) c.set(b.right, y, y % 2 ? T.GOLD : T.GOLD_SHADE);
    },
  },

  {
    name: 'eye patch',
    layer: 'over',
    draw: c => {
      // A pirate's patch: a dark pad over the left eye, a cell bigger than it all round on the outside
      // with a glint so it reads as worn, not as a hole, and a strap running up across the forehead.
      const f = c.face;
      if (!f || !f.eyes.length) return;
      const e = f.eyes[0], left = e.left - 1, top = f.top - 1;
      for (let y = top; y <= f.line; y++) for (let x = left; x <= e.right; x++) if (c.isBody(x, y)) c.set(x, y, T.EYE);
      if (c.isBody(left, top)) c.set(left, top, T.WHITE);
      for (let i = 1, x = e.right, y = top; c.isBody(x + i, y - i + 1) && y - i + 1 > c.tip; i++) c.set(x + i, y - i + 1, T.EYE);
    },
  },

  {
    name: 'necklace',
    layer: 'body',
    draw: c => {
      const y = c.neck;
      const r = c.rows[y];
      if (!r) return;
      for (let x = r.left + 1; x < r.right; x += 2) wear(c, x, y, T.WHITE);
      wear(c, Math.floor(c.centre) - 1, y + 1, T.GOLD);
    },
  },

  {
    name: 'medal',
    layer: 'body',
    draw: c => {
      // Pinned on the chest's side, as a medal is, where it never touches the face: a striped
      // ribbon over a gold disc with a glint. Under the mouth it read as a tongue.
      // Where a narrow body has no room for the tall one, a shorter ribbon, then a cell nearer the face.
      const tall = [[T.ACCENT, T.ACCENT_SHADE], [T.ACCENT, T.ACCENT_SHADE], [T.WHITE, T.GOLD], [T.GOLD_SHADE, T.GOLD_SHADE]];
      const short = [tall[0], tall[2], tall[3]];
      let art = tall, at = clearSpot(c, 2, 4, 1, c.eyeLine + 1);
      if (!at) { art = short; at = clearSpot(c, 2, 3) ?? clearSpot(c, 2, 3, 0); }
      if (!at) return;
      art.forEach((row, dy) => row.forEach((t, dx) => c.set(at[0] + dx, at[1] + dy, t)));
    },
  },

  {
    name: 'flower pin',
    layer: 'body',
    draw: c => {
      const r = c.rows[c.eyeLine - 3];
      if (r) c.draw(flower, r.left + 1, c.eyeLine - 4, true);
    },
  },

  {
    name: 'headband',
    layer: 'face',
    draw: c => {
      const y = c.eyeLine - 4;
      const r = c.rows[y];
      if (!r) return;
      for (let x = r.left; x <= r.right; x++) c.set(x, y, x === r.right ? T.ACCENT_SHADE : T.ACCENT);
    },
  },

  {
    name: 'necktie',
    layer: 'body',
    draw: c => {
      // A dark tie with the accent striped across it, knotted between the two points of a white
      // collar a row clear of the mouth, and hanging a row past the bottom: under a mouth, a
      // tie in the accent colour read as a tongue.
      // Where the mouth reaches the bottom row but one, the knot goes right under it.
      const low = c.face?.mouthBottom ?? 0, x = Math.floor(c.centre) - 1, y = Math.min(Math.max(c.neck, low + 2), c.bottom);
      if (y <= low) return;
      for (const cx of [x - 1, x + 2]) if (c.isBody(cx, y) && !nearFace(c, cx, y)) c.set(cx, y, T.WHITE);
      wear(c, x, y, T.EYE);
      wear(c, x + 1, y, T.EYE);
      for (let ty = y + 1; ty <= c.bottom + 1; ty++) {
        const k = ty - y;
        wear(c, x, ty, k % 2 ? T.ACCENT : T.EYE);
        wear(c, x + 1, ty, k % 2 ? T.EYE : T.ACCENT);
      }
    },
  },

  {
    name: 'lei',
    layer: 'body',
    draw: c => {
      // A garland of flowers in turn the accent, blush and gold, on leaves.
      const y = c.neck;
      const r = c.rows[y];
      if (!r) return;
      const flowers = [T.ACCENT, T.BLUSH, T.GOLD];
      for (let x = r.left; x <= r.right; x++) {
        const i = x - r.left;
        wear(c, x, y, i % 2 ? T.LEAF : flowers[(i / 2) % 3]);
      }
    },
  },

  {
    name: 'goggles',
    layer: 'face',
    draw: c => {
      // Pushed up on the forehead, a clear row above the eyes: a strap round
      // the head and two round lenses over where the eyes are. On a head with
      // no forehead to spare they sit up on top of it, never across the eyes.
      const f = c.face;
      if (!f || !f.eyes.length) return;
      const y = Math.max(1, f.top - 3);
      const r = c.rows[y + 1];
      if (r) for (let x = r.left; x <= r.right; x++) if (c.isBody(x, y + 1)) c.set(x, y + 1, T.DEEP);
      for (const e of f.eyes) {
        const x0 = e.left - (e.right - e.left < 1 ? 1 : 0), x1 = Math.max(e.right, x0 + 1);
        for (let x = x0; x <= x1; x++) { c.set(x, y, x === x0 ? T.WHITE : T.ACCENT); c.set(x, y + 1, T.ACCENT_SHADE); }
      }
    },
  },

  // Chase accessories, one guy in several hundred.
  {
    name: 'gold chain',
    layer: 'body',
    draw: c => {
      // A heavy gold chain and a big medallion with a glint.
      const y = c.neck;
      const r = c.rows[y];
      if (!r) return;
      for (let x = r.left; x <= r.right; x++) wear(c, x, y, (x - r.left) % 2 ? T.GOLD_SHADE : T.GOLD);
      const x = Math.floor(c.centre) - 1;
      for (const [dx, dy, t] of [[-1, 1, T.GOLD], [0, 1, T.WHITE], [1, 1, T.GOLD], [2, 1, T.GOLD_SHADE], [0, 2, T.GOLD], [1, 2, T.GOLD_SHADE]] as const) {
        if (c.isBody(x + dx, y + dy)) wear(c, x + dx, y + dy, t);
      }
    },
  },

  {
    name: 'heart shades',
    layer: 'over',
    draw: c => {
      // A red heart over each eye, a glint in each, and a bar between them.
      const f = c.face;
      if (!f || !f.eyes.length) return;
      const heart = stamp(['r.r', 'rrr', '.r.']);
      const xs = f.eyes.map(e => Math.round((e.left + e.right) / 2) - 1);
      const y = f.line - 1;
      for (const x of xs) { heart.forEach((row, dy) => row.forEach((t, dx) => { if (t) c.set(x + dx, y - 1 + dy, t); })); c.set(x, y, T.WHITE); }
      if (xs.length === 2) for (let x = xs[0] + 3; x < xs[1]; x++) c.set(x, y - 1, T.RED);
    },
  },

  {
    name: 'masquerade',
    layer: 'face',
    draw: c => {
      // A gold ball mask round the eyes, its tips swept up at the sides, a
      // jewel between them. Drawn before the eyes, which look out through it.
      const f = c.face;
      if (!f || !f.eyes.length) return;
      const boxes = f.eyes.map((_, k) => lensBox(c, k));
      for (const b of boxes) for (let y = b.top + 1; y < b.bottom; y++) for (let x = b.left; x <= b.right; x++) if (c.isBody(x, y)) c.set(x, y, T.GOLD);
      const l = boxes[0].left, r = boxes[boxes.length - 1].right;
      for (let x = l; x <= r; x++) if (c.isBody(x, f.line) && x > boxes[0].right && x < boxes[boxes.length - 1].left) c.set(x, f.line, T.GOLD_SHADE);
      if (boxes.length === 2) { const mid = Math.floor(c.centre); c.set(mid - 1, f.top, T.RED); c.set(mid, f.top, T.RED); }
      c.set(l, f.top - 1, T.GOLD); c.set(r, f.top - 1, T.GOLD);
    },
  },
];
