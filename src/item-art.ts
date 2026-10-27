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
 * A hat made `d` rows shorter, the way `elastic` makes one narrower: the
 * plainest row, the one most like the row under it, comes out, again and
 * again. The bottom row (the brim, the band, what it stands on) always stays,
 * so a top hat loses a row of its crown and a gem a row of its facets, and
 * neither is ever chopped off at the brim.
 */
export function squeeze(s: Stamp, d: number): Stamp {
  let out = s.map(r => [...r]);
  for (let k = 0; k < d && out.length > 1; k++) {
    const w = width(out), mid = (out.length - 2) / 2;
    const cost = (y: number) => { let n = 0; for (let x = 0; x < w; x++) if ((out[y][x] ?? 0) !== (out[y + 1][x] ?? 0)) n++; return n; };
    let best = 0, bestCost = Infinity;
    for (let y = 0; y < out.length - 1; y++) {
      const c = cost(y);
      if (c < bestCost || (c === bestCost && Math.abs(y - mid) < Math.abs(best - mid))) { best = y; bestCost = c; }
    }
    out.splice(best, 1);
  }
  return out;
}

/**
 * A hat fitted to the room above the face: rows 1 to the floor (row 0 is the
 * grid's border, where nothing gets an outline), and 14 columns. Most heads
 * leave four rows, and a hat drawn taller is squeezed to them rather than
 * having the rows that don't fit cut off.
 */
export const fitRoom = (c: Canvas, s: Stamp): Stamp => {
  const room = Math.max(1, c.floor);
  const tall = s.length > room ? squeeze(s, s.length - room) : s;
  const over = width(tall) - (GRID_SIZE - 2);
  return over > 0 ? elastic(tall, -over) : tall;
};

/** Seats a small hat on the crown, as `seat` does, once it fits the room (`fitRoom`). */
export const sit = (c: Canvas, s: Stamp, dx = 0, sink = 1): void => {
  const fitted = fitRoom(c, s);
  const x = Math.max(1, Math.min(GRID_SIZE - 1 - width(fitted), c.centred(fitted) + dx));
  seat(c, fitted, x, sink);
};

/**
 * Puts a hat on, fitted to the head the way a cap fits. A hat that rests
 * across the head (a crown, a cap, a helmet: its bottom row 8 or more across)
 * comes down to the forehead line and is stretched to the head's width there,
 * a cell of brim either side, so it sits on a narrow head and a wide one
 * alike. A small thing that stands on top (a gem, a flag) sits on the crown.
 * Either is first fitted to the room above the face (`fitRoom`).
 */
export function wear(c: Canvas, s: Stamp, dx: number, sink: number): void {
  if (span(s[s.length - 1]) < 8) { sit(c, s, dx, sink); return; }
  const tall = fitRoom(c, s), last = tall.length - 1, bottom = span(tall[last]);
  const r = c.rows[c.floor] ?? c.rows[c.crown + 2] ?? c.rows[c.crown];
  const head = r ? r.right - r.left + 1 : 10;
  const want = Math.max(6, Math.min(GRID_SIZE - 2, head + 2));
  const fitted = elastic(tall, Math.max(-4, Math.min(4, want - bottom, GRID_SIZE - 2 - width(tall))));
  const y = Math.max(1, c.floor - last);
  c.draw(fitted, Math.max(1, Math.min(GRID_SIZE - 1 - width(fitted), c.centred(fitted) + dx)), y);
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
    const r = c.rows[c.shoulder()]!, l = fitRoom(c, left), rr = fitRoom(c, right);
    seat(c, l, r.left + inset);
    seat(c, rr, r.right - inset - width(rr) + 1);
  };
};

export const L = (n: number) => LOCAL + n - 1;

/**
 * The biggest a buddy is drawn: its art, inside the outline compose gives it.
 * It stands in front of the guy in his bottom-right corner (no head leaves
 * room beside him; see `buddySpot` in ./compose), and this is as big as it
 * gets there without coming up to his face.
 */
export const BUDDY_BOX = { width: 6, height: 5 } as const;

/**
 * A buddy's drawing: at most `BUDDY_BOX`, with a pixel round it for its
 * outline. `o` is an eye, in the guy's outline colour, so it stays dark
 * whatever finish the buddy has.
 */
export const pet = (name: string, rows: string[]): Stamp => {
  if (rows.length > BUDDY_BOX.height || rows.some(r => r.length > BUDDY_BOX.width)) throw new Error(`Buddy "${name}" must fit in ${BUDDY_BOX.width} across and ${BUDDY_BOX.height} tall`);
  return stamp(rows);
};

