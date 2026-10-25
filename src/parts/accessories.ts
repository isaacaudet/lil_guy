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
  layer: 'face' | 'body';
  draw: (c: Canvas) => void;
}

const glasses = stamp([
  '.oo....oo.',
  'o..oooo..o',
  'o..o..o..o',
  '.oo....oo.',
]);

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

const monocle = stamp([
  '.oo.',
  'o..o',
  'o..o',
  '.oo.',
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

export const accessories: Accessory[] = [
  { name: 'none', layer: 'body', draw: () => {} },

  {
    name: 'glasses',
    layer: 'face',
    draw: c => c.draw(glasses, c.centred(glasses), c.eyeLine - 2),
  },

  {
    name: 'scarf',
    layer: 'body',
    draw: c => {
      const y = c.eyeLine + 3;
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
      const y = c.eyeLine + 3;
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
        if (token) wear(c, x + dx, c.eyeLine + 3 + dy, token);
      }));
    },
  },

  {
    name: 'bandana',
    layer: 'body',
    draw: c => {
      const y = c.eyeLine + 3;
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
      // Around the right eye, where a pair of glasses has its right lens, on a gold chain.
      const x = c.centred(glasses) + 6;
      c.draw(monocle, x, c.eyeLine - 2);
      c.set(x + 3, c.eyeLine + 2, T.GOLD);
      c.set(x + 3, c.eyeLine + 3, T.GOLD_SHADE);
    },
  },

  {
    name: 'eye patch',
    layer: 'body',
    draw: c => {
      // A rounded patch over the left eye, and a thin strap from it running
      // up and away across the forehead. A strap straight across the top of
      // the head read as a fringe of hair.
      const x = c.centred(glasses), y = c.eyeLine;
      for (const [dx, dy] of [[1, -2], [2, -2], [0, -1], [1, -1], [2, -1], [3, -1], [1, 0], [2, 0]]) wear(c, x + dx, y + dy, T.OUTLINE);
      // The strap stops a row short of the top, where it would take the
      // body cell that a topper's thin stalk is joined to.
      for (let i = 1; c.isBody(x + 3 + i, y - 3 - i); i++) wear(c, x + 3 + i, y - 2 - i, T.OUTLINE);
      if (c.isBody(x - 1, y - 1)) wear(c, x - 1, y - 1, T.OUTLINE);
    },
  },

  {
    name: 'necklace',
    layer: 'body',
    draw: c => {
      const y = c.eyeLine + 3;
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
      const x = Math.floor(c.centre) - 1, y = c.eyeLine + 3;
      wear(c, x, y, T.ACCENT);
      wear(c, x + 1, y, T.ACCENT_SHADE);
      wear(c, x, y + 1, T.GOLD);
      wear(c, x + 1, y + 1, T.GOLD_SHADE);
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
      const x = Math.floor(c.centre) - 1, y = c.eyeLine + 3;
      wear(c, x, y, T.ACCENT_SHADE);
      wear(c, x + 1, y, T.ACCENT_SHADE);
      for (let ty = y + 1; ty < c.bottom; ty++) { wear(c, x, ty, T.ACCENT); wear(c, x + 1, ty, T.ACCENT); }
      wear(c, x, c.bottom, T.ACCENT_SHADE);
      wear(c, x + 1, c.bottom, T.ACCENT_SHADE);
    },
  },

  {
    name: 'lei',
    layer: 'body',
    draw: c => {
      // A garland of flowers in turn the accent, blush and gold, on leaves.
      const y = c.eyeLine + 3;
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
      // Pushed up on the forehead: a strap round the head and two lenses.
      const y = Math.max(c.crown + 1, c.eyeLine - 5);
      const r = c.rows[y + 1];
      if (!r) return;
      for (let x = r.left; x <= r.right; x++) c.set(x, y + 1, T.DEEP);
      const lens = stamp([
        'wa....wa',
        'aA....aA',
      ]);
      c.draw(lens, c.centred(lens), y, true);
    },
  },

  // Chase accessories, one guy in several hundred.
  {
    name: 'gold chain',
    layer: 'body',
    draw: c => {
      // A heavy gold chain and a big medallion with a glint.
      const y = c.eyeLine + 3;
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
    layer: 'face',
    draw: c => {
      const shades = stamp([
        'r.r..r.r',
        'rrrrrrrr',
        'rwr..rwr',
        '.r....r.',
      ]);
      c.draw(shades, c.centred(shades), c.eyeLine - 2);
    },
  },

  {
    name: 'masquerade',
    layer: 'face',
    draw: c => {
      // A gold ball mask, its tips swept up past the eyes, with a jewel
      // between them. Drawn before the eyes, which look out through it.
      const mask = stamp([
        'y........y',
        'yy..yy..yy',
        'yyyyrryyyy',
        '.yyy..yyy.',
      ]);
      c.draw(mask, c.centred(mask), c.eyeLine - 2, true);
    },
  },
];
