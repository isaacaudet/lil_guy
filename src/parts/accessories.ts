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

/** Whether a cell is on or next to the mouth. */
function nearMouth(c: Canvas, x: number, y: number): boolean {
  const f = c.face;
  if (!f) return false;
  const mx = c.centred(f.mouth);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (f.mouth[y + dy - f.mouthTop]?.[x + dx - mx]) return true;
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
      // Stuck on the body low down, clear of the face and of anything worn on the head.
      // Where the body has no room, it goes up on the forehead's corner instead.
      const at = clearSpot(c, 3, 3, 1, c.eyeLine + 1) ?? clearSpot(c, 3, 3);
      if (at) { c.draw(star, at[0], at[1], true); return; }
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
      // A round gold rim close round the right eye, its lower edge in shadow and a
      // glint on its top, the eye clear through the glass, and a gold chain
      // swinging down from its outer side in links.
      const f = c.face;
      if (!f || !f.eyes.length) return;
      const e = f.eyes[f.eyes.length - 1];
      const b = { left: e.left - 1, right: e.right + 1, top: f.top - 1, bottom: f.line + 1 };
      for (let y = b.top; y <= b.bottom; y++) for (let x = b.left; x <= b.right; x++) {
        const edgeX = x === b.left || x === b.right, edgeY = y === b.top || y === b.bottom;
        if (edgeX && edgeY) continue;
        if (edgeX || edgeY) c.set(x, y, y === b.bottom || x === b.right ? T.GOLD_SHADE : T.GOLD);
      }
      c.set(b.left + 1, b.top, T.WHITE);
      for (let i = 0, x = b.right + 1, y = b.bottom; y <= c.bottom && c.isBody(x, y); i++, y++) {
        c.set(x, y, i % 2 ? T.GOLD : T.GOLD_SHADE);
        if (i === 1 && c.isBody(x + 1, y + 1)) x++;
      }
    },
  },

  {
    name: 'eye patch',
    layer: 'over',
    draw: c => {
      // A pirate's patch: a rounded dark pad over the left eye with a sheen on
      // it, its strap running from the pad's top corner up across the brow,
      // and from its outer side straight out to the edge of the head.
      const f = c.face;
      if (!f || !f.eyes.length) return;
      const e = f.eyes[0], b = { left: e.left - 1, right: e.right + 1, top: f.top - 1, bottom: f.line };
      for (let y = b.top; y <= b.bottom; y++) for (let x = b.left; x <= b.right; x++) {
        const corner = (x === b.left || x === b.right) && (y === b.top || y === b.bottom);
        if (!corner && c.isBody(x, y)) c.set(x, y, T.OUTLINE);
      }
      c.set(b.left + 1, b.top + 1, T.DEEP);
      for (let x = b.right, y = b.top - 1; y >= b.top - 3 && c.isBody(x, y); x++, y--) c.set(x, y, T.OUTLINE);
      for (let x = b.left - 1, y = b.top + 1; c.isBody(x, y); x--) c.set(x, y, T.OUTLINE);
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
      // Pinned on the chest's side, where it never touches the face: a striped
      // ribbon over a round gold disc with a glint. Under the mouth it read as a tongue.
      // Smaller where a narrow body has no room for it.
      const sizes = [stamp(['aAa', '.y.', 'ywY', '.Y.']), stamp(['.A.', 'ywY', '.Y.']), stamp(['aA', 'wy', 'yY'])];
      for (const art of sizes) {
        const at = clearSpot(c, art[0].length, art.length, 1, c.eyeLine + 1) ?? clearSpot(c, art[0].length, art.length);
        if (at) { c.draw(art, at[0], at[1]); return; }
      }
      const at = clearSpot(c, 2, 3, 0);
      if (at) c.draw(sizes[2], at[0], at[1]);
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
      // Pushed up on the forehead: a strap round the head a clear row above
      // the eyes, and on it a rimmed, tinted lens over each eye with a glint.
      // On a short forehead the lenses stand up off the top of the head, as
      // goggles pushed up do.
      const f = c.face;
      if (!f || !f.eyes.length) return;
      const y = Math.max(3, f.top - 2), r = c.rows[y];
      if (r) for (let x = r.left - 1; x <= r.right + 1; x++) c.set(x, y, T.DEEP);
      for (const e of f.eyes) {
        const x0 = e.left - 1;
        c.set(x0 + 1, y - 2, T.ACCENT_SHADE); c.set(x0 + 2, y - 2, T.ACCENT_SHADE);
        c.set(x0, y - 1, T.ACCENT_SHADE); c.set(x0 + 1, y - 1, T.WHITE); c.set(x0 + 2, y - 1, T.ACCENT); c.set(x0 + 3, y - 1, T.ACCENT_SHADE);
        c.set(x0, y, T.ACCENT_SHADE); c.set(x0 + 1, y, T.ACCENT); c.set(x0 + 2, y, T.ACCENT); c.set(x0 + 3, y, T.ACCENT_SHADE);
      }
    },
  },

  // Chase accessories, one guy in several hundred.
  {
    name: 'gold chain',
    layer: 'body',
    draw: c => {
      // A heavy gold chain hanging in a curve from the neck, its links in two
      // golds, and a big medallion with a glint where it dips lowest.
      const y = c.neck, r = c.rows[y];
      if (!r) return;
      const mid = Math.floor(c.centre), dip = Math.max(0, Math.min(2, c.bottom - y - 2));
      for (let x = r.left; x <= r.right; x++) {
        const k = Math.min(x - r.left, r.right - x), cy = y + Math.min(dip, k >> 1);
        if (c.isBody(x, cy)) wear(c, x, cy, x % 2 ? T.GOLD_SHADE : T.GOLD);
      }
      const ym = y + dip + 1;
      const medallion: [number, number, number][] = [[-2, 0, T.GOLD_SHADE], [-1, 0, T.WHITE], [0, 0, T.GOLD], [1, 0, T.GOLD_SHADE], [-1, 1, T.GOLD], [0, 1, T.GOLD_SHADE]];
      for (const [dx, dy, t] of medallion) if (c.isBody(mid + dx, ym + dy)) wear(c, mid + dx, ym + dy, t);
    },
  },

  {
    name: 'heart shades',
    layer: 'over',
    draw: c => {
      // Heart-shaped sunglasses: dark lenses in red heart frames, a glint on
      // each, a bridge between them and arms out to the sides of the head.
      const f = c.face;
      if (f?.eyes.length !== 2) return;
      const frame = stamp(['rr.rr', 'rwoor', '.ror.']);
      const top = f.line - 2;
      const xs = [f.eyes[0].left - 2, f.eyes[1].right - 2];
      for (const x of xs) frame.forEach((row, dy) => row.forEach((t, dx) => { if (t) c.set(x + dx, top + dy, t); }));
      for (let x = xs[0] + 5; x < xs[1]; x++) c.set(x, top + 1, T.RED);
      const r = c.rows[top];
      if (r) for (let x = r.left; x < xs[0]; x++) c.set(x, top, T.RED);
      if (r) for (let x = xs[1] + 5; x <= r.right; x++) c.set(x, top, T.RED);
      // The point of each heart, where it keeps clear of the mouth.
      for (const x of xs) if (!nearMouth(c, x + 2, top + 3)) c.set(x + 2, top + 3, T.RED);
    },
  },

  {
    name: 'masquerade',
    layer: 'face',
    draw: c => {
      // A gold ball mask round the eyes, its tips swept up at the sides, a
      // ruby between the eyes and a feather rising from one side. Drawn before
      // the eyes, which look out through it.
      const f = c.face;
      if (!f || !f.eyes.length) return;
      const L = f.eyes[0].left - 2, R = f.eyes[f.eyes.length - 1].right + 2, mid = Math.floor(c.centre);
      for (let y = f.top - 1; y <= f.line; y++) for (let x = L; x <= R; x++) {
        // A dip in its lower edge over the nose.
        if (y === f.line && (x === mid - 1 || x === mid)) continue;
        if (c.isBody(x, y)) c.set(x, y, y === f.line ? T.GOLD_SHADE : T.GOLD);
      }
      c.set(L, f.top - 2, T.GOLD); c.set(L - 1, f.top - 3, T.GOLD);
      c.set(R, f.top - 2, T.GOLD); c.set(R + 1, f.top - 3, T.GOLD);
      c.set(L + 1, f.top - 1, T.WHITE);
      if (f.eyes.length === 2) { c.set(mid - 1, f.top - 1, T.RED); c.set(mid, f.top - 1, T.RED); }
      c.set(R, f.top - 3, T.ACCENT); c.set(R, f.top - 4, T.ACCENT); c.set(R - 1, f.top - 5, T.ACCENT_SHADE);
    },
  },
];
