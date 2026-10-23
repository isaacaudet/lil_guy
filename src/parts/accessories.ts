import { stamp, T } from './art';
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
];
