import { heads, eyes, mouths, cheeks, hair, bodies, accessories } from './parts';
import { T } from './parts/art';
import { Canvas } from './parts/canvas';
import type { AvatarConfig, PixelGrid } from './types';
import { GRID_SIZE } from './types';

/**
 * Feet, as columns either side of the centre seam. `null` tucks them away.
 */
export const FOOT_STYLES: (null | { offsets: number[]; token: number })[] = [
  { offsets: [2, 3], token: T.BODY },      // nubs
  { offsets: [2], token: T.BODY },         // tiptoes
  { offsets: [3, 4], token: T.BODY },      // wide stance
  { offsets: [2, 3], token: T.TRIM },      // socks
  null,                                    // tucked
];

/** Arm poses. */
export const ARM_STYLES = ['none', 'sides', 'wave'] as const;

function emptyGrid(): PixelGrid {
  return Array.from({ length: GRID_SIZE }, () => new Array(GRID_SIZE).fill(0));
}

/**
 * Soft light from the upper left: a gleam near the top-left of the head and a
 * shade along the bottom and the lower right. Applied the same way to every
 * shape, which is a lot of what makes the set look like one hand drew it.
 */
function light(c: Canvas): void {
  const middle = (c.crown + c.bottom) / 2;
  for (let y = c.crown; y <= c.bottom; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (!c.isBody(x, y)) continue;
      const rim = !c.isBody(x, y + 1) || (y > middle && !c.isBody(x + 1, y));
      if (rim) c.set(x, y, T.SHADE);
    }
  }
  // The gleam sits one row in, where the head is wide enough to hold it.
  const y = c.crown + 1;
  const r = c.rows[y];
  if (r && r.right - r.left >= 5) {
    c.set(r.left + 1, y, T.LIGHT);
    c.set(r.left + 2, y, T.LIGHT);
    if (c.isBody(r.left + 1, y + 1)) c.set(r.left + 1, y + 1, T.LIGHT);
  }
}

function feet(c: Canvas, style: number): void {
  const spec = FOOT_STYLES[style];
  if (!spec) return;
  const base = c.rows[c.bottom];
  if (!base) return;
  const y = c.bottom + 1;
  const mid = Math.floor(c.centre);
  for (const off of spec.offsets) {
    for (const x of [mid - off, mid + off - 1]) {
      if (x >= base.left && x <= base.right) c.set(x, y, spec.token);
    }
  }
}

function arms(c: Canvas, style: number): void {
  const pose = ARM_STYLES[style];
  if (pose === 'none') return;
  const y = c.eyeLine + 2;
  const r = c.rows[y];
  // Arms need a column for themselves and one more for their outline.
  if (!r || r.left < 2 || r.right > GRID_SIZE - 3) return;

  const nub = (x: number, top: number) => { c.set(x, top, T.BODY); c.set(x, top + 1, T.BODY); };

  nub(r.left - 1, y);
  if (pose === 'sides') nub(r.right + 1, y);
  // A wave is the same nub lifted two rows, beside the cheek.
  if (pose === 'wave') {
    const raised = c.rows[y - 2];
    if (raised) nub(raised.right + 1, y - 2);
  }
}

/**
 * Every empty cell touching something gets the outline colour. Diagonals are
 * left open, which rounds the corners off instead of boxing them in. Lines
 * already drawn in the outline colour — an antenna stalk, a glasses frame —
 * don't get outlined themselves, or they'd come out three pixels thick.
 */
function outline(grid: PixelGrid): void {
  const filled = grid.map(row => row.map(v => v !== 0 && v !== T.OUTLINE));
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (grid[y][x] !== 0) continue;
      if (
        (y > 0 && filled[y - 1][x]) || (y < GRID_SIZE - 1 && filled[y + 1][x]) ||
        (x > 0 && filled[y][x - 1]) || (x < GRID_SIZE - 1 && filled[y][x + 1])
      ) grid[y][x] = T.OUTLINE;
    }
  }
}

function startCanvas(config: AvatarConfig): Canvas {
  const head = heads[config.head];
  const grid = head.art.map(row => [...row]);
  return new Canvas(grid, head.eyes);
}

/**
 * The body and its markings, lit, with no face, hat or accessory on it.
 * The blink frame fills vacated eye cells from here.
 */
export function composeBase(config: AvatarConfig): PixelGrid {
  const c = startCanvas(config);
  light(c);
  bodies[config.body].draw(c);
  return c.grid;
}

/**
 * Composes every part into one 16x16 grid of colour tokens.
 *
 * The order matters and is the same for every guy: the lit body and its
 * markings, then whatever sits on top of the head, then anything worn over
 * the eyes, then the face itself (cheeks, eyes, mouth), then whatever is worn
 * on the body. Feet and arms are added before the outline, and the outline is
 * drawn around the finished shape so hats, ears and arms all get one too.
 */
export function compose(config: AvatarConfig): PixelGrid {
  const head = heads[config.head];
  const c = startCanvas(config);

  light(c);
  if (head.feet) feet(c, config.feet);
  arms(c, config.arms);
  bodies[config.body].draw(c);
  hair[config.hair].draw(c);

  const accessory = accessories[config.accessory];
  if (accessory.layer === 'face') accessory.draw(c);

  const line = c.eyeLine;
  const cheek = cheeks[config.cheeks].art;
  if (cheek.length) c.draw(cheek, c.centred(cheek), line + 1, true);
  const eye = eyes[config.eyes].art;
  c.draw(eye, c.centred(eye), line - eye.length + 1, true);
  const mouth = mouths[config.mouth].art;
  c.draw(mouth, c.centred(mouth), line + 1, true);

  if (accessory.layer === 'body') accessory.draw(c);

  outline(c.grid);

  // Mirror last, so every layer lands where it was authored and only the
  // finished character is flipped.
  if (config.flip) for (const row of c.grid) row.reverse();
  return c.grid;
}

