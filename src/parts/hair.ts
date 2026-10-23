import { stamp, T, width, type Stamp } from './art';
import type { Canvas } from './canvas';

/**
 * Whatever sits on top of the head.
 *
 * Most are small drawings seated on the crown: the bottom row of the drawing
 * overlaps the top of the head so it looks attached rather than balanced on
 * it. Ears and other pairs are drawn once, for the left, and mirrored. Hats
 * that hug the head are painted onto the head's own top rows, so a beanie
 * always fits whatever shape it lands on.
 */
export interface Topper {
  name: string;
  draw: (c: Canvas) => void;
}

/**
 * Seats a drawing on the head: its bottom row lands on the highest body row
 * beneath it. A tall part on a tall head is pushed down rather than allowed to
 * touch the top of the grid, where it would lose its outline.
 */
function seat(c: Canvas, s: Stamp, x: number, sink = 1): void {
  const last = s.length - 1;
  let top = Infinity;
  s[last].forEach((token, dx) => {
    if (!token) return;
    const t = c.topOf(x + dx);
    if (t !== null) top = Math.min(top, t);
  });
  if (top === Infinity) top = c.crown;
  c.draw(s, x, Math.max(1, top + sink - 1 - last));
}

const mirror = (s: Stamp): Stamp => s.map(row => [...row].reverse());

/** A drawing centred on the crown, nudged `dx` columns to the right. */
const centre = (name: string, rows: string[], dx = 0, sink = 1): Topper => {
  const s = stamp(rows);
  return { name, draw: c => seat(c, s, c.centred(s) + dx, sink) };
};

/**
 * A pair drawn once for the left side. Each piece is placed `inset` columns in
 * from the edge of the head's shoulder row, so ears stay on narrow and wide
 * heads alike.
 */
const pair = (name: string, rows: string[], inset = 0, sink = 1): Topper => {
  const left = stamp(rows);
  const right = mirror(left);
  return {
    name,
    draw: c => {
      const r = c.rows[c.shoulder()]!;
      seat(c, left, r.left + inset, sink);
      seat(c, right, r.right - inset - width(right) + 1, sink);
    },
  };
};

/** Paints the top `n` rows of the head, shading the right-hand edge. */
function capRows(c: Canvas, n: number, fill: number, shade: number): void {
  for (let y = c.crown; y < c.crown + n; y++) {
    c.paintRow(y, fill);
    const r = c.rows[y];
    if (r) c.set(r.right, y, shade);
  }
}

export const hair: Topper[] = [
  { name: 'none', draw: () => {} },

  pair('cat ears', [
    '#..',
    '#c.',
    '###',
  ]),

  pair('bear ears', [
    '##',
    '#c',
    '##',
  ]),

  pair('bunny ears', [
    '##',
    '#c',
    '#c',
    '##',
  ], 1),

  pair('bug antennae', [
    'a..',
    '.o.',
    '..o',
  ], 1),

  pair('horns', [
    'x.',
    'xx',
    'xx',
  ], 1),

  pair('space buns', [
    'aa',
    'aA',
    'aa',
  ]),

  centre('sprout', [
    'gg.gg',
    '.GgG.',
    '..g..',
  ]),

  centre('apple stem', [
    '..gg',
    '.oG.',
    '.o..',
  ]),

  centre('flower', [
    '.a.',
    'aya',
    '.a.',
  ], 3),

  centre('bow', [
    'aa.aa',
    'aaAaa',
    'a...a',
  ], 3),

  centre('crown', [
    'y.y.y',
    'yyyyy',
    'YYrYY',
  ]),

  centre('party hat', [
    '..x..',
    '.aaA.',
    '.xxx.',
    'aaaAa',
  ]),

  centre('antenna', [
    'aa',
    'aA',
    'o.',
  ], 1),

  centre('unicorn horn', [
    '.y',
    'yY',
    'yY',
  ]),

  centre('star clip', [
    '.y.',
    'yyy',
    '.y.',
  ], -3),

  centre('tuft', [
    '#.',
    '.#',
    '.#',
  ], 1),

  centre('chick tuft', [
    '#.#',
    '.#.',
    '.#.',
  ]),

  {
    name: 'beanie',
    draw: c => {
      capRows(c, 2, T.ACCENT, T.ACCENT_SHADE);
      c.paintRow(c.crown + 2, T.TRIM);
      const x = Math.floor(c.centre) - 1;
      c.set(x, c.crown - 1, T.TRIM);
      c.set(x + 1, c.crown - 1, T.TRIM);
    },
  },

  {
    name: 'cap',
    draw: c => {
      capRows(c, 2, T.ACCENT, T.ACCENT_SHADE);
      // The brim sticks out two columns where there is room, one where not.
      const r = c.rows[c.crown + 1]!;
      for (let x = r.right + 1; x <= Math.min(r.right + 2, 14); x++) c.set(x, c.crown + 1, T.ACCENT_SHADE);
      c.set(Math.floor(c.centre) - 1, c.crown, T.TRIM);
    },
  },

  {
    name: 'bob',
    draw: c => {
      capRows(c, 2, T.ACCENT, T.ACCENT_SHADE);
      const r = c.rows[c.crown + 2]!;
      // A fringe: every other column hangs one row lower.
      for (let x = r.left; x <= r.right; x++) {
        if ((x - r.left) % 3 !== 1) c.set(x, c.crown + 2, T.ACCENT);
      }
      c.set(r.left, c.crown + 3, T.ACCENT);
      c.set(r.right, c.crown + 3, T.ACCENT_SHADE);
    },
  },

  {
    name: 'mushroom',
    draw: c => {
      capRows(c, 3, T.RED, T.RED);
      const r = c.rows[c.crown + 2]!;
      c.set(r.left - 1, c.crown + 2, T.RED);
      c.set(r.right + 1, c.crown + 2, T.RED);
      const x = Math.floor(c.centre);
      c.set(x - 3, c.crown + 1, T.WHITE);
      c.set(x, c.crown, T.WHITE);
      c.set(x + 2, c.crown + 2, T.WHITE);
    },
  },

  {
    name: 'eggshell',
    draw: c => {
      capRows(c, 2, T.WHITE, T.WHITE);
      const r = c.rows[c.crown + 2]!;
      for (let x = r.left; x <= r.right; x += 2) c.set(x, c.crown + 2, T.WHITE);
    },
  },

  {
    name: 'frosting',
    draw: c => {
      capRows(c, 2, T.TRIM, T.TRIM);
      const r = c.rows[c.crown + 2]!;
      c.set(r.left + 1, c.crown + 2, T.TRIM);
      c.set(r.left + 4, c.crown + 2, T.TRIM);
      c.set(r.right - 2, c.crown + 2, T.TRIM);
      c.set(r.right - 2, c.crown + 3, T.TRIM);
      const x = Math.floor(c.centre);
      c.set(x - 3, c.crown + 1, T.ACCENT);
      c.set(x - 1, c.crown, T.GOLD);
      c.set(x + 1, c.crown + 1, T.LEAF);
      c.set(x + 3, c.crown, T.ACCENT);
    },
  },

  {
    name: 'leafy top',
    draw: c => {
      c.paintRow(c.crown, T.LEAF);
      const r = c.rows[c.crown + 1]!;
      for (let x = r.left; x <= r.right; x += 2) c.set(x, c.crown + 1, T.LEAF_SHADE);
      const x = Math.floor(c.centre);
      c.set(x, c.crown - 1, T.LEAF);
      c.set(x - 1, c.crown - 2, T.LEAF);
    },
  },

  {
    name: 'beret',
    draw: c => {
      capRows(c, 1, T.ACCENT, T.ACCENT);
      const r = c.rows[c.crown]!;
      c.set(r.left - 1, c.crown, T.ACCENT);
      c.set(r.left - 2, c.crown + 1, T.ACCENT_SHADE);
      c.set(r.left - 1, c.crown + 1, T.ACCENT_SHADE);
      for (let x = r.left; x <= r.right; x++) c.set(x, c.crown - 1, T.ACCENT);
      c.set(Math.floor(c.centre), c.crown - 2, T.ACCENT_SHADE);
    },
  },

  {
    name: 'witch hat',
    draw: c => {
      const cone = stamp([
        '..aa.',
        '.aaA.',
        '.xxx.',
        'aaaaA',
      ]);
      seat(c, cone, c.centred(cone));
      const r = c.rows[c.crown]!;
      for (let x = r.left - 1; x <= r.right + 1; x++) c.set(x, c.crown, T.ACCENT);
    },
  },

  {
    name: 'propeller',
    draw: c => {
      capRows(c, 2, T.ACCENT, T.ACCENT_SHADE);
      c.paintRow(c.crown + 1, T.TRIM);
      const prop = stamp([
        'xxoaa',
        '..o..',
      ]);
      c.draw(prop, c.centred(prop), c.crown - 2);
    },
  },
];
