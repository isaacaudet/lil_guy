import { stamp, T } from './art';
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

const heart = stamp([
  'r.r',
  'rrr',
  '.r.',
]);

const star = stamp([
  '.y.',
  'yyy',
  '.y.',
]);

const moon = stamp([
  '.yy',
  'y..',
  '.yy',
]);

const bolt = stamp([
  '..y',
  'yyy',
  'y..',
]);

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
      c.draw(star, Math.floor(c.centre) - 1, c.eyeLine - 5, true);
    },
  },

  {
    name: 'heart mark',
    draw: c => {
      c.draw(heart, Math.floor(c.centre) - 1, c.eyeLine - 5, true);
    },
  },

  {
    name: 'gleam',
    draw: c => {
      // A second, bigger shine, as if the guy were glazed.
      const r = c.rows[c.crown + 2];
      if (!r) return;
      onBody(c, r.right - 2, c.crown + 2, T.LIGHT);
      onBody(c, r.right - 2, c.crown + 3, T.LIGHT);
    },
  },

  {
    name: 'stripes',
    draw: c => {
      for (let y = c.eyeLine + 3; y <= c.bottom; y += 2) {
        const r = c.rows[y];
        if (r) for (let x = r.left + 1; x < r.right; x++) onBody(c, x, y, T.SHADE);
      }
    },
  },

  {
    name: 'zigzag',
    draw: c => {
      const y = c.eyeLine + 3;
      const r = c.rows[y];
      if (r) for (let x = r.left; x <= r.right; x++) onBody(c, x, y + (x % 2), T.BELLY);
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
      c.draw(moon, Math.floor(c.centre) - 1, c.eyeLine - 5, true);
    },
  },

  {
    name: 'bolt mark',
    draw: c => {
      c.draw(bolt, Math.floor(c.centre) - 1, c.eyeLine - 5, true);
    },
  },

  {
    name: 'starry',
    draw: c => {
      // A night sky on the body: a few white and gold specks.
      const x = Math.floor(c.centre);
      onBody(c, x - 4, c.crown + 2, T.WHITE);
      onBody(c, x + 1, c.crown + 1, T.GOLD);
      onBody(c, x + 3, c.crown + 3, T.WHITE);
      onBody(c, x - 3, c.bottom - 1, T.GOLD);
      onBody(c, x + 4, c.bottom - 2, T.WHITE);
    },
  },
];
