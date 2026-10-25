import { LAYER, stamp, T, type Stamp } from './parts/art';
import type { Owned } from './owned';
import type { PixelGrid } from './types';
import { GRID_SIZE } from './types';

/**
 * What a copy collects by being worn: pins, earned for things done in the
 * games and stuck onto the item, and tally marks, scratched into it as its
 * tally climbs.
 *
 * - 30 days: two marks along its bottom edge
 * - 100 days: four
 * - 365 days: and its outline turns gold
 *
 * Neither is rolled. The club grants pins and counts the days; the library
 * only draws them, on the item's own pixels, so they move with it.
 */

export interface Pin {
  id: string;
  name: string;
  /** How a player earns it. */
  how: string;
  art: Stamp;
}

/**
 * Each pin is its own silhouette, so the gold ones never read alike: a
 * twinkling star, a zigzag bolt, a crown with a red jewel. Append only: copies
 * store pin ids.
 */
export const PINS: Pin[] = [
  { id: 'star', name: 'Gold star', how: 'A perfect day', art: stamp(['.y.', 'ywy', '.y.']) },
  { id: 'flame', name: 'Flame', how: 'A 7-day streak', art: stamp(['.r.', 'rry', 'ryy']) },
  { id: 'heart', name: 'Heart', how: '100 days played', art: stamp(['r.r', 'rrr', '.r.']) },
  { id: 'bolt', name: 'Bolt', how: 'Fastest of the day', art: stamp(['.yy', '.y.', 'yy.']) },
  { id: 'crown', name: 'Crown', how: 'Top of a board for a day', art: stamp(['y.y', 'yry', 'yyy']) },
  { id: 'leaf', name: 'Leaf', how: 'A first week in the club', art: stamp(['.gg', 'ggg', 'G..']) },
];

/** A copy holds at most this many pins. */
export const MAX_PINS = 3;

export const pinById = (id: string) => PINS.find(p => p.id === id);

/** The tally marks a copy shows for its tally: none, 2 or 4. */
export function tallyMarks(tally: number | undefined): number {
  return (tally ?? 0) >= 100 ? 4 : (tally ?? 0) >= 30 ? 2 : 0;
}

/** A year of days: the item's outline goes gold. */
export const GOLD_RIM_DAYS = 365;

type Slot = 'skin' | 'hat' | 'frame' | 'buddy';
const START: Record<Slot, number> = { skin: LAYER.skin, hat: LAYER.hat, frame: LAYER.frame, buddy: LAYER.buddy };
const own = (slot: Slot, token: number) => token >= START[slot] && token < START[slot] + 10;

/** What a pin keeps clear of: the face it is stuck beside. */
const FACE = new Set<number>([T.EYE, T.BLUSH, T.MOUTH, T.TONGUE]);
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/**
 * Scratches tally marks and sticks pins onto one worn item's pixels.
 *
 * Each pin goes as near its own corner as it fits whole: on an item the first
 * bottom right, the second bottom left, the third top right; on a frame top
 * left, top right, then bottom left, since a buddy sits bottom right. It never
 * covers the face or another pin, and a backing plate in the outline colour
 * goes round it, so it reads as a badge stuck on and not as part of the
 * drawing. A hat is too small to hold one whole, so there a pin may hang off
 * its side into the air, where the outline wraps it.
 */
export function markItem(grid: PixelGrid, slot: Slot, copy: Owned): void {
  const cells: [number, number][] = [];
  grid.forEach((row, y) => row.forEach((t, x) => { if (own(slot, t)) cells.push([x, y]); }));
  if (!cells.length) return;
  const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]);
  const [left, right, top, bottom] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];

  // Tally marks: every other pixel along the item's lowest rows, bottom first.
  let marks = tallyMarks(copy.tally);
  for (let y = bottom; y >= top && marks > 0; y--) {
    const row = cells.filter(([, cy]) => cy === y).map(([x]) => x).sort((a, b) => a - b);
    for (let i = 1; i < row.length - 1 && marks > 0; i += 2, marks--) grid[y][row[i]] = T.WHITE;
  }

  const frame = slot === 'frame', hat = slot === 'hat';
  const at = (x: number, y: number) => grid[y]?.[x] ?? 0;
  const air = (x: number, y: number) => hat && at(x, y) === 0 && x > 0 && y > 0 && x < GRID_SIZE - 1 && y < GRID_SIZE - 1;
  // Cells a pin or its plate already holds.
  const taken = new Set<number>();
  // The cell each pin's corner aims for, and which of its corners that is (0 left or top, 1 right or bottom).
  const corners: [number, number, number, number][] = frame
    ? [[1, 1, 0, 0], [GRID_SIZE - 2, 1, 1, 0], [1, GRID_SIZE - 2, 0, 1]]
    : [[right, bottom - 1, 1, 1], [left, bottom - 1, 0, 1], [right, top + 1, 1, 0]];

  (copy.pins ?? []).slice(0, MAX_PINS).forEach((id, k) => {
    const pin = pinById(id);
    if (!pin) return;
    const h = pin.art.length, w = pin.art[0].length;
    const [cx, cy, sx, sy] = corners[k];
    let best: { x: number; y: number; score: number } | undefined;
    for (let ay = 0; ay <= GRID_SIZE - h; ay++) for (let ax = 0; ax <= GRID_SIZE - w; ax++) {
      let onItem = 0, inAir = 0, lost = 0, crowded = 0;
      pin.art.forEach((row, dy) => row.forEach((t, dx) => {
        if (!t) return;
        const x = ax + dx, y = ay + dy;
        if (taken.has(y * GRID_SIZE + x)) lost++;
        else if (own(slot, at(x, y))) onItem++;
        else if (air(x, y)) inAir++;
        else lost++;
        // Nothing of the face beside it, nor of the head under a hat.
        for (const [nx, ny] of N4) {
          const n = at(x + nx, y + ny);
          if (FACE.has(n) || (hat && n !== 0 && n !== T.OUTLINE && !own(slot, n) && !taken.has((y + ny) * GRID_SIZE + x + nx))) crowded++;
        }
      }));
      // Whole, on the item (or a hat's partly off it) and clear of the face
      // wins; failing that, as much of the pin as will show.
      if (!onItem || inAir > onItem) continue;
      const d = Math.abs(ax + sx * (w - 1) - cx) + Math.abs(ay + sy * (h - 1) - cy);
      const score = lost * 300 + crowded * 100 + inAir * 4 + d;
      if (!best || score < best.score) best = { x: ax, y: ay, score };
    }
    if (!best) return;

    const placed: [number, number][] = [];
    pin.art.forEach((row, dy) => row.forEach((t, dx) => {
      const x = best!.x + dx, y = best!.y + dy;
      if (!t || taken.has(y * GRID_SIZE + x) || !(own(slot, at(x, y)) || air(x, y))) return;
      grid[y][x] = t;
      placed.push([x, y]);
    }));
    for (const [x, y] of placed) taken.add(y * GRID_SIZE + x);
    // The backing plate, on the item's own pixels; never on its edge, which
    // the guy's outline needs.
    const inside = (x: number, y: number) => frame || N4.every(([dx, dy]) => at(x + dx, y + dy) !== 0);
    for (const [x, y] of placed) for (const [dx, dy] of N4) {
      const nx = x + dx, ny = y + dy;
      if (own(slot, at(nx, ny)) && inside(nx, ny)) grid[ny][nx] = T.OUTLINE;
      taken.add(ny * GRID_SIZE + nx);
    }
  });
}

/**
 * After a year of days, the outline around an item goes gold; a frame's edge
 * does. A pin's backing plate stays dark, so a gold pin still stands out.
 */
export function goldRim(grid: PixelGrid, slot: Slot): void {
  const edge = (x: number, y: number) => x === 0 || y === 0 || x === GRID_SIZE - 1 || y === GRID_SIZE - 1;
  const set: [number, number][] = [];
  grid.forEach((row, y) => row.forEach((t, x) => {
    if (slot === 'frame') { if (own('frame', t) && edge(x, y)) set.push([x, y]); return; }
    if (t !== T.OUTLINE) return;
    // A plate sits inside the item, with no empty cell beside it.
    if (!edge(x, y) && N4.every(([dx, dy]) => grid[y + dy][x + dx] !== 0)) return;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => own(slot, grid[y + dy]?.[x + dx] ?? 0))) set.push([x, y]);
  }));
  for (const [x, y] of set) grid[y][x] = (x + y) % 2 ? T.GOLD : T.GOLD_SHADE;
}
