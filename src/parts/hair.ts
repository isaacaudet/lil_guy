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

/** The first row from the crown down at least `min` wide: where a hat's band goes. Never past the floor. */
function brow(c: Canvas, min = 6): number {
  for (let y = c.crown; y <= c.floor; y++) {
    const r = c.rows[y];
    if (r && r.right - r.left + 1 >= min) return y;
  }
  return Math.min(c.crown, c.floor);
}

/** How wide the head is on a row. */
const across = (c: Canvas, y: number) => { const r = c.rows[y]; return r ? r.right - r.left + 1 : 0; };

/**
 * Draws a hat centred with its bottom row on row `y`: pushed down where it
 * would leave the grid, and never past the floor, where it would reach the eyes.
 */
function wear(c: Canvas, s: Stamp, y: number, dx = 0): void {
  let top = Math.max(1, y - s.length + 1);
  if (top + s.length - 1 > c.floor) top = Math.max(1, c.floor - s.length + 1);
  c.draw(s, c.centred(s) + dx, top);
}

/** Picks the widest drawing that fits on a row the given width across, so a hat suits a narrow head and a wide one. */
const fitted = (sizes: Stamp[], room: number): Stamp => sizes.find(s => width(s) <= room) ?? sizes[sizes.length - 1];

/** A hat drawn in a few widths, worn with its bottom row a row into the head. */
const hat = (name: string, sizes: string[][], sink = 1, dx = 0): Topper => {
  const stamps = sizes.map(stamp);
  return {
    name,
    draw: c => {
      const y = Math.min(brow(c) + sink - 1, c.floor);
      wear(c, fitted(stamps, across(c, y) + 2), y, dx);
    },
  };
};

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

  // Two feelers, curling outwards, each tipped with a round bobble.
  pair('bug antennae', [
    'wa...',
    'aA...',
    '.oo..',
    '..o..',
    '..o..',
  ]),

  // Little devil's horns, curving up and out from a broad base.
  pair('horns', [
    'r..',
    'r..',
    'rr.',
    '.rr',
  ]),

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

  // A gold crown with three points and a jewel in its band, as wide as the head it's on.
  hat('crown', [
    ['y..yy..y', 'yyyyyyyy', 'YYYrrYYY'],
    ['y.yy.y', 'yyyyyy', 'YYrrYY'],
  ]),

  // A striped cone with a pompom, worn at a jaunty tilt.
  hat('party hat', [[
    '..xx..',
    '..aA..',
    '.axaA.',
    '.aaaA.',
    'axaxaA',
  ]], 1),

  // A short stalk with a glowing bobble.
  centre('antenna', [
    'wa',
    'aA',
    '.o',
    '.o',
  ], 0),

  // A spiralled golden horn.
  centre('unicorn horn', [
    '.y',
    'yY',
    'Yy',
    'yY',
    'Yy',
  ], 0, 2),

  // A five-pointed star clipped in at the side.
  centre('star clip', [
    '..y..',
    'yyyyy',
    '.ywY.',
    '.Y.Y.',
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
      // A glossy bob: the top of the head in hair with a shine, a blunt
      // fringe cut straight across, and the sides falling past it.
      const fringe = Math.min(c.crown + 2, c.floor);
      for (let y = Math.min(c.tip, c.crown); y <= fringe; y++) {
        c.paintRow(y, T.ACCENT);
        const r = c.rows[y];
        if (r) { c.set(r.left - 1, y, T.ACCENT); c.set(r.right + 1, y, T.ACCENT_SHADE); c.set(r.right, y, T.ACCENT_SHADE); }
      }
      const r = c.rows[c.crown + 1];
      if (r) { c.set(r.left + 2, c.crown, T.LIGHT); c.set(r.left + 3, c.crown, T.LIGHT); }
      // The sides hang down outside the face to the eyes.
      for (let y = fringe + 1; y <= c.eyeLine; y++) {
        const row = c.rows[y];
        if (!row) continue;
        c.set(row.left - 1, y, T.ACCENT);
        c.set(row.right + 1, y, T.ACCENT_SHADE);
      }
    },
  },

  // A toadstool cap: red, spotted white, overhanging the head.
  hat('mushroom', [
    ['...rrrr...', '.rrwwrrrr.', 'rwwrrrrwwr', 'rrrrrrrrrr'],
    ['..rrrr..', '.rwwrrr.', 'rrrrrwwr', 'rrrrrrrr'],
  ], 2),

  {
    name: 'eggshell',
    draw: c => {
      // The top of a broken shell, its edge cracked into points.
      capRows(c, 2, T.WHITE, T.WHITE);
      const r = c.rows[c.crown + 2];
      if (r) for (let x = r.left; x <= r.right; x += 2) c.set(x, c.crown + 2, T.WHITE);
    },
  },

  // A dollop of icing, dripping, with sprinkles and a cherry on top.
  hat('frosting', [
    ['.....r...', '....r....', '.xxxrxx..', 'xxaxxxgxx', 'xxxxyxxxx', 'x.xx.xx.x', 'x..x..x..'],
    ['....r..', '...r...', '.xxrxx.', 'xaxxxgx', 'xxxyxxx', 'x.xx.xx', 'x..x...'],
  ], 4),

  // A pineapple's crown: a fan of spiky leaves.
  hat('leafy top', [[
    '..g..g..',
    'g.gG.G.g',
    '.gGgGgG.',
    '..gGgG..',
    '...gG...',
  ]], 1),

  // A floppy beret slumped to one side, with a stalk on top.
  hat('beret', [
    ['......A...', '...aaaaaa.', '.aaaaaaaaA', 'AaaaaaaaA.'],
    ['.....A..', '..aaaaa.', 'aaaaaaaA', 'AaaaaaA.'],
  ], 1),

  // A tall pointed hat, its tip bent over, a buckled band, and a wide brim.
  hat('witch hat', [
    ['......aA..', '.....aaA..', '....aaaA..', '....aaaA..', '...xxyxx..', 'aaaaaaaaaA'],
    ['.....aA.', '....aaA.', '...aaaA.', '...aaaA.', '..xxyxx.', 'aaaaaaaA'],
  ], 1),

  {
    name: 'propeller',
    draw: c => {
      // A beanie in two colours with a propeller spinning on a post on top.
      capRows(c, 2, T.ACCENT, T.ACCENT_SHADE);
      c.paintRow(c.crown + 1, T.TRIM);
      const prop = stamp([
        'xxyaa',
        '..y..',
      ]);
      const x = c.centred(prop) + 1, top = c.topOf(x + 2) ?? c.crown;
      c.draw(prop, x, Math.max(1, top - 2));
    },
  },

  {
    name: 'mohawk',
    draw: c => {
      // A strip of hair down the middle of the head, standing up in spikes.
      const mid = Math.floor(c.centre);
      for (let y = c.crown; y <= c.floor; y++) for (let x = mid - 2; x <= mid + 1; x++) if (c.isBody(x, y)) c.set(x, y, x === mid + 1 ? T.ACCENT_SHADE : T.ACCENT);
      const top = c.topOf(mid) ?? c.crown;
      c.draw(stamp(['.a.a.', 'aa.aA', 'aaaAA']), mid - 3, Math.max(1, top - 3));
    },
  },

  {
    name: 'headphones',
    draw: c => {
      // A band arched over the head and a big cushioned cup on each side of
      // its top, where they never reach the face.
      const y = brow(c), r = c.rows[y]!;
      const top = Math.max(1, y - 2);
      for (let x = r.left + 1; x <= r.right - 1; x++) c.set(x, top, T.ACCENT_SHADE);
      for (const [x, dir] of [[r.left - 1, 1], [r.right + 1, -1]] as const) {
        for (let dy = 0; dy < 3; dy++) {
          const cy = top + 1 + dy;
          c.set(x, cy, T.ACCENT);
          c.set(x + dir, cy, dy === 1 ? T.TRIM : T.ACCENT);
        }
        c.set(x, top, T.ACCENT_SHADE);
      }
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
      // A garland of leaves round the top of the head, following its curve.
      const y = brow(c), r = c.rows[y]!;
      for (let x = r.left - 1; x <= r.right + 1; x++) {
        const top = c.topOf(x);
        c.set(x, top === null || top > y ? y : top, (x + y) % 2 ? T.LEAF : T.LEAF_SHADE);
      }
      // A flower either side, petals round a gold heart, and a bud in the middle.
      const mid = Math.floor(c.centre);
      for (const fx of [mid - 3, mid + 2]) {
        const fy = Math.min(c.topOf(fx) ?? y, y) - 1;
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1]]) c.set(fx + dx, fy + dy, T.ACCENT);
        c.set(fx, fy, T.GOLD);
      }
      for (const bx of [mid - 1, mid]) c.set(bx, Math.min(c.topOf(bx) ?? y, y) - 1, T.BLUSH);
    },
  },

  {
    name: 'antlers',
    draw: c => {
      // A pair of antlers, each a beam with two tines, rising from either side of the top of the head.
      const y = brow(c), r = c.rows[y]!;
      const left = stamp(['Y..y', 'Y..Y', '.YYY', '...Y']);
      seat(c, left, r.left - 2);
      seat(c, mirror(left), r.right - 1);
    },
  },

  // A puffed chef's toque on a pleated band.
  hat('chef hat', [
    ['.ww.ww..', 'wwwwwwww', 'wwwwwwwh', '.wwwwwh.', '.xhxhxh.'],
  ], 1),

  // Chase toppers, one guy in several hundred.
  // A victor's wreath: two leafy sprays meeting at the front over gold berries.
  hat('laurel', [
    ['.gy....yg.', 'gGyg..gyGg', 'G.gGyyGg.G'],
    ['.g....g.', 'gGy..yGg', 'GgGyyGgG'],
  ], 1),

  // A tiara: a big gold star in the middle of a silver band, a little one either side where there's room.
  hat('star crown', [
    ['.....yy.....', '....yyyy....', '.y.yywyyy.y.', 'yyy.yyyy.yyy', '.y..y..y..y.', 'xxxxxxxxxxxx'],
    ['...yy...', '..ywyy..', '.yyyyyy.', '..yyyy..', '.xyxxyx.'],
  ], 1),

  // Flames licking up off the head: red outside, gold within, white-hot at the heart.
  hat('on fire', [
    ['.....r....', '....rr..r.', '.r..ryr.rr', '.rr.ryyrry', 'rryrryyyyr', 'ryyyywwyyr'],
    ['....r...', '...rr.r.', '.r.ryrrr', 'rrrryyyr', 'ryyywwyr'],
  ], 2),
];
