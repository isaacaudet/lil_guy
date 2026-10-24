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

export const PINS: Pin[] = [
  { id: 'star', name: 'Gold star', how: 'A perfect day', art: stamp(['.y.', 'yYy', '.y.']) },
  { id: 'flame', name: 'Flame', how: 'A 7-day streak', art: stamp(['.r', 'rr', 'ry']) },
  { id: 'heart', name: 'Heart', how: '100 days played', art: stamp(['r.r', 'rrr', '.r.']) },
  { id: 'bolt', name: 'Bolt', how: 'Fastest of the day', art: stamp(['.y', 'yy', 'y.']) },
  { id: 'crown', name: 'Crown', how: 'Top of a board for a day', art: stamp(['y.y', 'yyy']) },
  { id: 'leaf', name: 'Leaf', how: 'A first week in the club', art: stamp(['gg', '.G']) },
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

type Slot = 'skin' | 'hat' | 'frame';
const START: Record<Slot, number> = { skin: LAYER.skin, hat: LAYER.hat, frame: LAYER.frame };
const own = (slot: Slot, token: number) => token >= START[slot] && token < START[slot] + 10;

/** Scratches tally marks and sticks pins onto one worn item's pixels. */
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

  // Pins: bottom right, bottom left, top right — wherever most of the pin lands on the item.
  (copy.pins ?? []).slice(0, MAX_PINS).forEach((id, k) => {
    const pin = pinById(id);
    if (!pin) return;
    const h = pin.art.length, w = pin.art[0].length;
    // A frame's pins go in its corners; an item's sit just inside its edges.
    const anchors: [number, number][] = slot === 'frame'
      ? [[GRID_SIZE - w, GRID_SIZE - h], [0, GRID_SIZE - h], [GRID_SIZE - w, 0]]
      : [[right - w, bottom - h - 1], [left + 1, bottom - h - 1], [right - w, top + 1]];
    let [ax, ay] = anchors[k];
    for (let tries = 0; tries < (slot === 'frame' ? 0 : 4); tries++) {
      let on = 0, total = 0;
      pin.art.forEach((row, dy) => row.forEach((t, dx) => {
        if (!t) return;
        total++;
        if (own(slot, grid[ay + dy]?.[ax + dx] ?? 0)) on++;
      }));
      if (on === total) break;
      ax += ax > (left + right) / 2 ? -1 : 1;
      ay += ay > (top + bottom) / 2 ? -1 : 1;
    }
    pin.art.forEach((row, dy) => row.forEach((t, dx) => {
      const x = ax + dx, y = ay + dy;
      if (t && y >= 0 && y < GRID_SIZE && x >= 0 && x < GRID_SIZE && own(slot, grid[y][x])) grid[y][x] = t;
    }));
  });
}

/** After a year of days, the outline around an item goes gold; a frame's edge does. */
export function goldRim(grid: PixelGrid, slot: Slot): void {
  const edge = (x: number, y: number) => x === 0 || y === 0 || x === GRID_SIZE - 1 || y === GRID_SIZE - 1;
  const set: [number, number][] = [];
  grid.forEach((row, y) => row.forEach((t, x) => {
    if (slot === 'frame') { if (own('frame', t) && edge(x, y)) set.push([x, y]); return; }
    if (t !== T.OUTLINE) return;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => own(slot, grid[y + dy]?.[x + dx] ?? 0))) set.push([x, y]);
  }));
  for (const [x, y] of set) grid[y][x] = (x + y) % 2 ? T.GOLD : T.GOLD_SHADE;
}
