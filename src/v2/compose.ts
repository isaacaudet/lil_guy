import { FOOT_STYLES } from '../compose';
import { eyes as v1Eyes } from '../parts';
import { measure, type HeadMetrics } from '../parts/metrics';
import type { PartPlacement, PixelGrid } from '../types';
import { GRID_SIZE } from '../types';
import { emptyGridV2, toCells } from './grid';
import {
  headsV2, eyesV2, mouthsV2, topsV2, bodiesV2, accessoriesV2, outfits, held,
  topPlacements, accessoryPlacementsV2, outfitPlacements, heldPlacements, eyeBlinksV2,
} from './parts';
import { CELL, GRID_SIZE_V2 as N, type AvatarConfigV2, type Slot } from './types';

const BODY = 1;
const PATTERN = 3;
const ACCENT = 4;
const EYE_WHITE = 6;
const PUPIL = 7;
const MOUTH = 8;

/**
 * This is v1's compose run at 32x32, and for any v1 part it must produce
 * exactly v1's grid doubled — the parity test holds it to that over every
 * part and ten thousand names.
 *
 * The trick is that geometry is measured in 16x16 cells (see `toCells`) and
 * only applied in pixels. Every offset is therefore a whole cell: v1's
 * rounding happens at v1's resolution, and nothing a doubled part does can
 * land half a cell off where v1 put it. New parts are drawn on the same 2px
 * rhythm, so they sit on the same lattice.
 */

/** Head geometry, in cells. */
export const headMetricsV2: HeadMetrics[] = headsV2.map(h => measure(toCells(h)));
const REFERENCE = headMetricsV2[0];

/** First and last cell rows a part draws on, and its first and last columns. */
interface CellExtent { first: number; last: number; left: number; right: number }
const extentCache = new WeakMap<PixelGrid, CellExtent | null>();
function cellExtent(part: PixelGrid): CellExtent | null {
  if (extentCache.has(part)) return extentCache.get(part)!;
  const cells = toCells(part);
  let first = -1, last = -1, left = GRID_SIZE, right = -1;
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (!cells[y][x]) continue;
      if (first === -1) first = y;
      last = y;
      if (x < left) left = x;
      if (x > right) right = x;
    }
  }
  const extent = first === -1 ? null : { first, last, left, right };
  extentCache.set(part, extent);
  return extent;
}

/**
 * Topmost cell row any v1 pair of eyes occupies; hats are held clear of it.
 * Frozen to v1's eyes on purpose — measuring the v2 array would let one new
 * pair drawn high on the face shove every hat in the library upwards.
 */
const FACE_TOP = v1Eyes.reduce((top, part) => {
  const row = part.findIndex(r => r.some(v => v));
  return row === -1 ? top : Math.min(top, row);
}, GRID_SIZE);

/** What each pixel is and which slot painted it, so tints know what to recolour. */
export interface Composed {
  grid: PixelGrid;
  layers: (Slot | null)[][];
}

class Canvas implements Composed {
  grid = emptyGridV2();
  layers: (Slot | null)[][] = Array.from({ length: N }, () => new Array(N).fill(null));

  put(y: number, x: number, token: number, slot: Slot, keep = 0): void {
    if (y < 0 || y >= N || x < 0 || x >= N) return;
    if (keep && this.grid[y][x] === keep) return;
    this.grid[y][x] = token;
    this.layers[y][x] = slot;
  }
}

function faceOffset(metrics: HeadMetrics): number {
  return Math.round((metrics.top + metrics.bottom - (REFERENCE.top + REFERENCE.bottom)) / 2);
}

/** v1's seat rule, in cells. See the v1 compose for why each clamp exists. */
function seatOffset(part: PixelGrid, dyTop: number, dyFace: number): number {
  const rows = cellExtent(part);
  if (!rows) return dyTop;
  const highest = dyFace + FACE_TOP - 2 - rows.last;
  return Math.max(-rows.first, Math.min(dyTop, Math.max(0, highest)));
}

/** Paints every pixel `dy` pixels down. */
function mergeLayer(c: Canvas, source: PixelGrid, dy: number, slot: Slot, keep = 0): void {
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const token = source[y][x];
      if (token) c.put(y + dy, x, token, slot, keep);
    }
  }
}

/** Paints only where the head is, so face parts never drift into empty space. */
function mergeOnSilhouette(c: Canvas, source: PixelGrid, dy: number, head: PixelGrid, slot: Slot, keep = 0, dx = 0): void {
  for (let y = 0; y < N; y++) {
    const row = y + dy;
    if (row < 0 || row >= N) continue;
    for (let x = 0; x < N; x++) {
      const token = source[y][x];
      const col = x + dx;
      if (token && col >= 0 && col < N && head[row][col]) c.put(row, col, token, slot, keep);
    }
  }
}

/** Paints only over pixels holding `mask` — body patterns stay on the body. */
function maskMerge(c: Canvas, source: PixelGrid, mask: number, slot: Slot): void {
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const token = source[y][x];
      if (token && c.grid[y][x] === mask) c.put(y, x, token, slot);
    }
  }
}

/** Rests a topper on the crown, trimmed to the skull's width plus a cell of slack. */
function mergeTopper(c: Canvas, source: PixelGrid, dyCells: number, metrics: HeadMetrics, slot: Slot, keep = 0): void {
  let lowest = -1;
  for (let y = 0; y < N; y++) if (source[y].some(v => v)) lowest = y;
  if (lowest === -1) return;

  const dy = dyCells * CELL;
  let seat = null;
  for (let y = lowest + dy; y < N && !seat; y++) seat = metrics.rows[y >> 1];
  if (!seat) return;

  const from = (seat.left - 1) * CELL;
  const to = (seat.right + 1) * CELL + CELL - 1;
  for (let y = 0; y <= lowest; y++) {
    for (let x = Math.max(0, from); x <= Math.min(N - 1, to); x++) {
      const token = source[y][x];
      if (token) c.put(y + dy, x, token, slot, keep);
    }
  }
}

/** Hovers a part just above the head, centred and untrimmed (the halo). */
function mergeFloating(c: Canvas, source: PixelGrid, metrics: HeadMetrics, slot: Slot): void {
  const extent = cellExtent(source);
  const seat = metrics.rows[metrics.top];
  if (!extent || !seat) return;
  const dy = Math.max(-extent.first, metrics.top - extent.last) * CELL;
  const dx = Math.round((seat.left + seat.right) / 2 - (extent.left + extent.right) / 2) * CELL;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const token = source[y][x];
      if (token) c.put(y + dy, x + dx, token, slot);
    }
  }
}

/** Slides each half of a part sideways to hug the edges of the head it lands on. */
function mergeAgainstEdges(c: Canvas, source: PixelGrid, dyCells: number, metrics: HeadMetrics, slot: Slot, keep = 0): void {
  const dy = dyCells * CELL;
  for (let y = 0; y < N; y++) {
    const row = y + dy;
    if (row < 0 || row >= N) continue;
    const extent = metrics.rows[row >> 1];
    const reference = REFERENCE.rows[y >> 1];
    if (!extent || !reference) continue;
    const shiftLeft = (extent.left - reference.left) * CELL;
    const shiftRight = (extent.right - reference.right) * CELL;
    for (let x = 0; x < N; x++) {
      const token = source[y][x];
      if (token) c.put(row, x + (x < N / 2 ? shiftLeft : shiftRight), token, slot, keep);
    }
  }
}

function fillCell(c: Canvas, cy: number, cx: number, token: number, slot: Slot, onlyEmpty = false): void {
  for (let y = cy * CELL; y < cy * CELL + CELL; y++) {
    for (let x = cx * CELL; x < cx * CELL + CELL; x++) {
      if (onlyEmpty && c.grid[y]?.[x] !== 0) continue;
      c.put(y, x, token, slot);
    }
  }
}

/** v1's foot styles, in cells. Bails before clearing when a style does not fit. */
function applyFeet(c: Canvas, metrics: HeadMetrics, style: number): void {
  const spec = FOOT_STYLES[style];
  if (!spec) return;
  const base = metrics.rows[metrics.bottom];
  if (!base) return;

  const left = GRID_SIZE / 2 - spec.inner - spec.width;
  const right = GRID_SIZE - 1 - left;
  if (left < base.left || right > base.right) return;

  for (let y = (metrics.bottom + 1) * CELL; y < N; y++) {
    c.grid[y].fill(0);
    c.layers[y].fill(null);
  }
  for (let r = 0; r < spec.rows; r++) {
    const row = metrics.bottom + 1 + r;
    if (row >= GRID_SIZE) break;
    for (let i = 0; i < spec.width; i++) {
      fillCell(c, row, left + i, BODY, 'head');
      fillCell(c, row, GRID_SIZE - 1 - left - i, BODY, 'head');
    }
  }
}

/**
 * Stubby arms raised in a cheer: three cells a side, stepping up and out from
 * low on the body. Derived from the head's own outline, so every silhouette
 * gets a pair without any per-head art, and drawn only where nothing else is
 * so they never cover a part.
 *
 * The shoulder sits two cells above the base: any higher and on most heads
 * the arms come out beside the eyes and read as ears. Each step is diagonal
 * from the last, so the arm stays joined to the body even where the rows
 * above the shoulder are narrower than it.
 */
function raiseArms(c: Canvas, metrics: HeadMetrics): void {
  const row = Math.max(metrics.crown + 1, metrics.bottom - 2);
  const edge = metrics.rows[row];
  if (!edge) return;
  const steps: [number, number][] = [[0, 1], [-1, 2], [-2, 2]];
  for (const [dy, out] of steps) {
    const cy = row + dy;
    if (cy < 0) continue;
    if (edge.left - out >= 0) fillCell(c, cy, edge.left - out, BODY, 'head', true);
    if (edge.right + out < GRID_SIZE) fillCell(c, cy, edge.right + out, BODY, 'head', true);
  }
}

interface Offsets { face: number; top: number; lower: number; edge: number }

function place(c: Canvas, part: PixelGrid, placement: PartPlacement, at: Offsets, head: PixelGrid, metrics: HeadMetrics, slot: Slot, keep = 0): void {
  switch (placement) {
    case 'face': return mergeOnSilhouette(c, part, at.face * CELL, head, slot, keep);
    case 'edge': return mergeAgainstEdges(c, part, at.edge, metrics, slot, keep);
    case 'top': return mergeTopper(c, part, seatOffset(part, at.top, at.face), metrics, slot, keep);
    case 'lower': return mergeLayer(c, part, at.lower * CELL, slot, keep);
    case 'float': return mergeFloating(c, part, metrics, slot);
    default: return mergeLayer(c, part, 0, slot, keep);
  }
}

/**
 * What an animation frame changes. Parts don't carry per-frame art: a state
 * swaps the eyes or mouth for another part, closes or slides the eyes, or
 * raises the arms, and everything else is a transform of the finished guy.
 */
export interface FrameOverrides {
  eyes?: number;
  mouth?: number;
  /** Close the eyes: the part's own blink frame, or one derived from it. */
  blink?: boolean;
  /** Slide the eyes this many pixels sideways, to look left or right. */
  eyeShift?: number;
  arms?: 'up';
}

/** Closes the eyes by dropping each column of eye to its lowest cell. */
function deriveBlink(c: Canvas, under: Composed): void {
  for (let x = 0; x < N; x++) {
    let lowest = -1;
    for (let y = 0; y < N; y++) {
      const t = c.grid[y][x];
      if (c.layers[y][x] === 'eyes' && (t === EYE_WHITE || t === PUPIL)) lowest = y;
    }
    if (lowest === -1) continue;
    const lid = lowest - (lowest % CELL); // top pixel of the lowest cell
    for (let y = 0; y < N; y++) {
      const t = c.grid[y][x];
      if (c.layers[y][x] !== 'eyes' || (t !== EYE_WHITE && t !== PUPIL)) continue;
      if (y >= lid) {
        c.grid[y][x] = PUPIL;
      } else {
        c.grid[y][x] = under.grid[y][x];
        c.layers[y][x] = under.layers[y][x];
      }
    }
  }
}

/** Composes a v2 config into a 32x32 grid plus the slot that painted each pixel. */
export function composeLayersV2(config: AvatarConfigV2, frame: FrameOverrides = {}): Composed {
  const head = headsV2[config.head];
  const metrics = headMetricsV2[config.head];
  const c = new Canvas();

  mergeLayer(c, head, 0, 'head');
  applyFeet(c, metrics, config.feet ?? 0);
  maskMerge(c, bodiesV2[config.body], BODY, 'body');
  if (config.patternTone === 1) {
    for (const row of c.grid) for (let x = 0; x < N; x++) if (row[x] === PATTERN) row[x] = ACCENT;
  }

  const face = faceOffset(metrics);
  const at: Offsets = {
    face,
    // Raw, not clamped: seatOffset clamps in both directions.
    top: metrics.crown - REFERENCE.crown,
    lower: metrics.bottom - REFERENCE.bottom,
    edge: face,
  };

  // Outfits go on before the face, so the eyes and mouth always read over them.
  const outfit = config.outfit ?? 0;
  if (outfit) place(c, outfits[outfit], outfitPlacements[outfit], at, head, metrics, 'outfit');

  const eyeIndex = frame.eyes ?? config.eyes;
  const authoredBlink = frame.blink ? eyeBlinksV2[eyeIndex] : undefined;
  const under: Composed | null = frame.blink && !authoredBlink
    ? { grid: c.grid.map(r => [...r]), layers: c.layers.map(r => [...r]) }
    : null;
  mergeOnSilhouette(c, authoredBlink ?? eyesV2[eyeIndex], face * CELL, head, 'eyes', 0, frame.eyeShift ?? 0);
  if (under) deriveBlink(c, under);

  mergeOnSilhouette(c, mouthsV2[frame.mouth ?? config.mouth], face * CELL, head, 'mouth');

  const top = topsV2[config.hair];
  const seat = seatOffset(top, at.top, at.face);
  place(c, top, topPlacements[config.hair], { ...at, edge: seat }, head, metrics, 'top');

  // Nothing worn may paint over the mouth — see the v1 compose.
  place(c, accessoriesV2[config.accessory], accessoryPlacementsV2[config.accessory], at, head, metrics, 'accessory', MOUTH);

  const item = config.held ?? 0;
  if (item) place(c, held[item], heldPlacements[item], { ...at, edge: at.lower }, head, metrics, 'held', MOUTH);

  if (frame.arms === 'up') raiseArms(c, metrics);

  if (config.flip) {
    for (const row of c.grid) row.reverse();
    for (const row of c.layers) row.reverse();
  }
  return c;
}

/** Composes a v2 config into a 32x32 grid of colour tokens. */
export function composeV2(config: AvatarConfigV2, frame?: FrameOverrides): PixelGrid {
  return composeLayersV2(config, frame).grid;
}
