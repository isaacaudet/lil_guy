import { LAYER, LOCAL, stamp, width, type Stamp } from './parts/art';
import type { Canvas } from './parts/canvas';
import { mirror, seat } from './parts/hair';
import type { Item } from './items';
import { GRID_SIZE } from './types';

/**
 * The tools items are drawn with: a skin's 16x16 grid, a hat fitted to the
 * head, a buddy's little stamp. Shared by ./items and each machine's set in
 * ./sets, so every machine draws the same way.
 */

/** A machine's set (./sets): new items, items it takes out of its machine, and items it redraws. */
export interface MachineSet {
  /** New items, slot included. */
  add: Item[];
  /**
   * Ids leaving the machine. They stay in the list (copies people own still
   * read and draw), but never come out of a capsule again.
   */
  retire: string[];
  /** Redrawn or renamed items, by id: the parts given replace the old ones; the id never changes. */
  redraw: Record<string, Partial<Omit<Item, 'id' | 'game' | 'slot'>>>;
}

export const grid16 = (name: string, rows: string[]): Stamp => {
  if (rows.length !== GRID_SIZE || rows.some(r => r.length !== GRID_SIZE)) {
    throw new Error(`Skin "${name}" must be drawn on a 16x16 grid`);
  }
  return stamp(rows);
};

/** How many cells a row spans, first filled to last. */
export const span = (row: number[]) => { const xs = row.map((t, i) => (t ? i : -1)).filter(i => i >= 0); return xs.length ? xs[xs.length - 1] - xs[0] + 1 : 0; };

/**
 * A hat made `d` columns wider (or narrower), the way a cap stretches: the
 * plainest columns, each the same as the one beside it, are repeated or taken
 * out, a side at a time from the middle outwards, so a buckle, a jewel or a
 * crown's points stay as drawn.
 */
export function elastic(s: Stamp, d: number): Stamp {
  let out = s.map(r => [...r]);
  for (let k = 0; k < Math.abs(d); k++) {
    const w = width(out), mid = (w - 1) / 2, left = k % 2 === 0;
    const cost = (x: number) => out.reduce((a, r) => a + ((r[x] ?? 0) !== (r[x - 1] ?? 0) ? 1 : 0), 0);
    let best = -1, bestCost = Infinity, bestDist = Infinity;
    for (let x = 2; x <= w - 3; x++) {
      if (left ? x > mid : x < mid) continue;
      const c = cost(x), dist = Math.abs(x - mid);
      if (c < bestCost || (c === bestCost && dist < bestDist)) { best = x; bestCost = c; bestDist = dist; }
    }
    if (best < 0) break;
    out = out.map(r => { const row = [...r]; if (d < 0) row.splice(best, 1); else row.splice(best, 0, row[best]); return row; });
  }
  return out;
}

/**
 * Puts a hat on, fitted to the head the way a cap fits. A hat that rests
 * across the head (a crown, a cap, a helmet: its bottom row 8 or more across)
 * comes down to the forehead line and is stretched to the head's width there,
 * a cell of brim either side, so it sits on a narrow head and a wide one
 * alike. A small thing that stands on top (a gem, a flag) sits on the crown.
 */
export function wear(c: Canvas, s: Stamp, dx: number, sink: number): void {
  const last = s.length - 1, bottom = span(s[last]);
  if (bottom < 8) { seat(c, s, c.centred(s) + dx, sink); return; }
  const r = c.rows[c.floor] ?? c.rows[c.crown + 2] ?? c.rows[c.crown];
  const head = r ? r.right - r.left + 1 : 10;
  const want = Math.max(6, Math.min(GRID_SIZE - 2, head + 2));
  const fitted = elastic(s, Math.max(-4, Math.min(4, want - bottom)));
  const y = Math.max(1, c.floor - last);
  c.draw(fitted, c.centred(fitted) + dx, y);
  // The head is inside the hat: a tip or a point that would poke out over the top goes under it.
  for (let yy = 0; yy < y; yy++) for (let x = 0; x < GRID_SIZE; x++) if (c.grid[yy][x] && c.grid[yy][x] < LAYER.skin) c.grid[yy][x] = 0;
}

export const on = (rows: string[], dx = 0, sink = 1) => {
  const s = stamp(rows);
  return (c: Canvas) => wear(c, s, dx, sink);
};

export const onPair = (rows: string[], inset = 0) => {
  const left = stamp(rows);
  const right = mirror(left);
  return (c: Canvas) => {
    const r = c.rows[c.shoulder()]!;
    seat(c, left, r.left + inset);
    seat(c, right, r.right - inset - width(right) + 1);
  };
};

export const L = (n: number) => LOCAL + n - 1;

/**
 * A buddy's drawing: at most 5x5, the corner the guy leaves it (with a
 * pixel round it for its outline). `o` is an eye, in the guy's outline
 * colour, so it stays dark whatever finish the buddy has.
 */
export const pet = (name: string, rows: string[]): Stamp => {
  if (rows.length > 5 || rows.some(r => r.length > 6)) throw new Error(`Buddy "${name}" must fit in 6 across and 5 tall`);
  return stamp(rows);
};

