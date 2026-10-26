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
export function seat(c: Canvas, s: Stamp, x: number, sink = 1): void {
  const last = s.length - 1;
  let top = Infinity;
  s[last].forEach((token, dx) => {
    if (!token) return;
    const t = c.topOf(x + dx);
    if (t !== null) top = Math.min(top, t);
  });
  if (top === Infinity) top = c.crown;
  // Lifted if it would come down past the floor: a tall hat on a short
  // forehead sits higher rather than over the eyes.
  let y = Math.max(1, top + sink - 1 - last);
  if (y + last > c.floor) y = Math.max(1, c.floor - last);
  c.draw(s, x, y);
}

export const mirror = (s: Stamp): Stamp => s.map(row => [...row].reverse());

/** A drawing centred on the crown, nudged `dx` columns to the right. */
export const centre = (name: string, rows: string[], dx = 0, sink = 1): Topper => {
  const s = stamp(rows);
  return { name, draw: c => seat(c, s, c.centred(s) + dx, sink) };
};

/**
 * A pair drawn once for the left side. Each piece is placed `inset` columns in
 * from the edge of the head's shoulder row, so ears stay on narrow and wide
 * heads alike.
 */
export const pair = (name: string, rows: string[], inset = 0, sink = 1): Topper => {
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

/**
 * Paints the top `n` rows of the head, shading the right-hand edge. A point
 * above them is painted too, so on a pointed head a beanie is pointed.
 */
export function capRows(c: Canvas, n: number, fill: number, shade: number): void {
  for (let y = Math.min(c.tip, c.crown); y < Math.min(c.crown + n, c.floor + 1); y++) {
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
      // The pompom sits on whatever is under it, which on a crab is its back,
      // not the tips of its claws.
      const x = Math.floor(c.centre) - 1;
      const top = Math.min(c.topOf(x) ?? c.crown, c.topOf(x + 1) ?? c.crown);
      c.set(x, top - 1, T.TRIM);
      c.set(x + 1, top - 1, T.TRIM);
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
      if (c.crown > 2) c.set(x - 1, c.crown - 2, T.LEAF);
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
      if (c.crown > 2) c.set(Math.floor(c.centre), c.crown - 2, T.ACCENT_SHADE);
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
      // On a tall head there's no room above, so the propeller sits lower.
      c.draw(prop, c.centred(prop), Math.max(1, c.crown - 2));
    },
  },
  centre('mohawk', [
    '.aa.',
    '.aA.',
    '.aA.',
    'aaAA',
  ]),

  {
    name: 'headphones',
    draw: c => {
      // Big cups over the ears, standing out past the sides of the head, and
      // a band in the accent's shade hugging the top of the head between
      // them. A band in the outline colour and one-pixel cups melted into
      // the head.
      const cup = c.eyeLine - 3;
      const r = c.rows[cup + 1]!;
      const [left, right] = [r.left, r.right];
      for (let y = cup; y < cup + 3; y++) {
        c.set(left - 1, y, T.ACCENT_SHADE);
        c.set(left, y, T.ACCENT);
        c.set(right, y, T.ACCENT);
        c.set(right + 1, y, T.ACCENT_SHADE);
      }
      for (let y = c.crown; y < cup; y++) {
        const row = c.rows[y];
        if (!row) continue;
        c.set(row.left - 1, y, T.ACCENT_SHADE);
        c.set(row.right + 1, y, T.ACCENT_SHADE);
      }
      const top = c.rows[c.crown]!;
      for (let x = top.left; x <= top.right; x++) c.set(x, c.crown - 1, T.ACCENT_SHADE);
    },
  },

  centre('cherries', [
    '..gG..',
    '.g..g.',
    'rr..rr',
    'rr..rr',
  ], 0, 0),

  {
    name: 'flower crown',
    draw: c => {
      // Leaves along the top of the head, following its curve, and a flower
      // every third column, in turn the accent, gold and blush.
      const r = c.rows[c.crown + 1]!;
      const flowers = [T.ACCENT, T.GOLD, T.BLUSH];
      for (let x = r.left; x <= r.right; x++) {
        const top = c.topOf(x);
        if (top === null) continue;
        c.set(x, top, T.LEAF);
        if ((x - r.left) % 3 === 1) c.set(x, top - 1, flowers[Math.floor((x - r.left) / 3) % 3]);
      }
    },
  },

  pair('antlers', [
    'x.x',
    'xx.',
    '.x.',
  ], 1),

  centre('chef hat', [
    '.ww.ww.',
    'wwwwwww',
    'wwwwwww',
    '.xxxxx.',
  ]),

  // Chase toppers, one guy in several hundred.
  {
    name: 'laurel',
    draw: c => {
      // A victor's wreath in gold: leaves along the top of the head, open
      // at the middle, running down past its sides.
      const r = c.rows[c.crown + 1]!;
      const mid = Math.floor(c.centre);
      for (let x = r.left; x <= r.right; x++) {
        if (x === mid - 1 || x === mid) continue;
        const top = c.topOf(x);
        if (top === null) continue;
        c.set(x, top - 1, T.GOLD_SHADE);
        // Each leaf's tip points out and away from the middle.
        if ((x - r.left) % 2 === 0) c.set(x + (x < mid ? -1 : 1), top - 2, T.GOLD);
      }
      for (let dy = 1; dy <= 3; dy++) {
        const row = c.rows[c.crown + dy];
        if (!row) continue;
        c.set(row.left - 1, c.crown + dy, dy % 2 ? T.GOLD : T.GOLD_SHADE);
        c.set(row.right + 1, c.crown + dy, dy % 2 ? T.GOLD : T.GOLD_SHADE);
      }
    },
  },

  centre('star crown', [
    '....y....',
    '.y.yyy.y.',
    'yyy.y.yyy',
    '.y.....y.',
  ], 0, 0),

  centre('on fire', [
    '...y...',
    '..yr.y.',
    '.yrry..',
    'yrryrry',
  ]),
];
