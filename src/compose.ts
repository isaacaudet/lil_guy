import { heads, eyes, mouths, hair, bodies, accessories } from './parts';
import { accessoryPlacements } from './parts/accessories';
import { hairPlacements } from './parts/hair';
import { headMetrics, REFERENCE, type HeadMetrics } from './parts/metrics';
import type { AvatarConfig, PixelGrid } from './types';
import { GRID_SIZE } from './types';

const BODY = 1;
const PATTERN = 3;
const ACCENT = 4;

/**
 * Foot styles, as runs of columns measured outwards from the centre seam.
 * Index 0 means "leave the head's own feet alone", which is what keeps the
 * ghost's drips and the tri's stumps intact.
 */
export const FOOT_STYLES: (null | { inner: number; width: number; rows: number })[] = [
  null,                              // as drawn
  { inner: 1, width: 2, rows: 1 },   // nubs
  { inner: 2, width: 3, rows: 1 },   // wide, set further apart
  { inner: 1, width: 1, rows: 2 },   // thin stilts
];

/** First and last rows a part actually draws on, or null if it draws nothing. */
function extentRows(part: PixelGrid): { first: number; last: number } | null {
  let first = -1;
  let last = -1;
  for (let y = 0; y < GRID_SIZE; y++) {
    if (part[y].some(v => v)) {
      if (first === -1) first = y;
      last = y;
    }
  }
  return first === -1 ? null : { first, last };
}

/**
 * Topmost row any pair of eyes occupies. Nothing worn on the head is allowed
 * to be pushed down onto it.
 */
const FACE_TOP = eyes.reduce((top, part) => {
  const rows = extentRows(part);
  return rows ? Math.min(top, rows.first) : top;
}, GRID_SIZE);

/**
 * Creates an empty 16x16 grid of zeros (transparent).
 */
function emptyGrid(): PixelGrid {
  return Array.from({ length: GRID_SIZE }, () => new Array(GRID_SIZE).fill(0));
}

/**
 * How far to move the face block (eyes, mouth, eyewear) so it stays centred on
 * a head that is taller or shorter than the reference.
 */
function faceOffset(metrics: HeadMetrics): number {
  const span = metrics.top + metrics.bottom;
  const reference = REFERENCE.top + REFERENCE.bottom;
  return Math.round((span - reference) / 2);
}

/**
 * Merges a source layer onto a target grid.
 * Non-zero pixels in the source overwrite the target, `dy` rows down.
 */
function mergeLayer(target: PixelGrid, source: PixelGrid, dy = 0): void {
  for (let y = 0; y < GRID_SIZE; y++) {
    const row = y + dy;
    if (row < 0 || row >= GRID_SIZE) continue;
    for (let x = 0; x < GRID_SIZE; x++) {
      const token = source[y][x];
      // Truthiness, not `!== 0`: a short part row yields `undefined` here, and
      // `undefined !== 0` would write it straight into the grid as a hole.
      if (token) target[row][x] = token;
    }
  }
}

/**
 * Merges source pixels onto target only where the head silhouette covers them,
 * so face parts can never drift off into empty space.
 */
function mergeOnSilhouette(target: PixelGrid, source: PixelGrid, dy: number, head: PixelGrid): void {
  for (let y = 0; y < GRID_SIZE; y++) {
    const row = y + dy;
    if (row < 0 || row >= GRID_SIZE) continue;
    for (let x = 0; x < GRID_SIZE; x++) {
      const token = source[y][x];
      if (token && head[row][x]) target[row][x] = token;
    }
  }
}

/**
 * Merges source pixels onto target only where target holds the given mask
 * token. Used to keep body patterns inside the body silhouette.
 */
function maskMergeLayer(target: PixelGrid, source: PixelGrid, maskToken: number): void {
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const token = source[y][x];
      if (token && target[y][x] === maskToken) target[y][x] = token;
    }
  }
}

/**
 * Where a topper actually sits, given where the crown says it should.
 *
 * Toppers are authored to rest on the reference crown, and the raw shift is
 * the difference between that crown and this head's. Two corrections:
 *
 * A head that wears its ears or horns above the main mass (horned, eared,
 * cloud) has a crown one row lower, and the raw shift pushed the brim of every
 * hat straight onto the eye row — a cap reading as a stripe across the face.
 * Nothing worn on the head may be pushed onto the face block.
 *
 * A head that starts a row higher (tall, spire) buried the hat a row deeper
 * than it was drawn for. A topper that leaves its own top row empty can move
 * up to compensate; one that draws on row 0 has nowhere to go and stays put.
 */
function seatOffset(part: PixelGrid, dyTop: number, dyFace: number): number {
  const rows = extentRows(part);
  if (!rows) return dyTop;
  const highest = dyFace + FACE_TOP - 1 - rows.last;
  return Math.max(-rows.first, Math.min(dyTop, Math.max(0, highest)));
}

/**
 * Merges a topper so it rests on the crown of the head, trimmed to how wide
 * the skull actually is at the row it sits on — otherwise a wide hat hangs in
 * the air beside a narrow crown. Its lowest row gets one column of slack on
 * each side, which is what lets the cap keep a brim.
 */
function mergeTopper(target: PixelGrid, source: PixelGrid, dy: number, metrics: HeadMetrics): void {
  let lowest = -1;
  for (let y = 0; y < GRID_SIZE; y++) {
    if (source[y].some(v => v !== 0)) lowest = y;
  }
  if (lowest === -1) return;

  // A topper whose lowest row sits above the crown — a tuft, a pair of ears —
  // has no head under it to measure, so walk down to the first row that does.
  // Without this the part is silently dropped on every head narrow enough to
  // leave that row empty.
  let seat = null;
  for (let y = lowest + dy; y < GRID_SIZE && !seat; y++) seat = metrics.rows[y];
  if (!seat) return;

  for (let y = 0; y <= lowest; y++) {
    const row = y + dy;
    if (row < 0 || row >= GRID_SIZE) continue;
    const slack = y === lowest ? 1 : 0;
    for (let x = seat.left - slack; x <= seat.right + slack; x++) {
      if (x < 0 || x >= GRID_SIZE) continue;
      const token = source[y][x];
      if (token) target[row][x] = token;
    }
  }
}

/**
 * Merges a layer authored against the left and right edges of the reference
 * silhouette, sliding each half sideways to hug the head it lands on. Cheek
 * marks stay on the face instead of hanging off a narrow head.
 */
function mergeAgainstEdges(target: PixelGrid, source: PixelGrid, dy: number, metrics: HeadMetrics): void {
  for (let y = 0; y < GRID_SIZE; y++) {
    const row = y + dy;
    if (row < 0 || row >= GRID_SIZE) continue;

    const extent = metrics.rows[row];
    const reference = REFERENCE.rows[y];
    if (!extent || !reference) continue;

    const shiftLeft = extent.left - reference.left;
    const shiftRight = extent.right - reference.right;

    for (let x = 0; x < GRID_SIZE; x++) {
      const token = source[y][x];
      if (!token) continue;
      const shifted = x + (x < GRID_SIZE / 2 ? shiftLeft : shiftRight);
      if (shifted >= 0 && shifted < GRID_SIZE) {
        target[row][shifted] = token;
      }
    }
  }
}

/**
 * Replaces whatever the head was drawn standing on with the chosen foot style.
 *
 * Everything below `metrics.bottom` is feet or drips, so it can be cleared and
 * redrawn without touching the body. Feet are centred on the seam and kept
 * inside the width of the bottom row, so they never stick out past the body.
 */
function applyFeet(grid: PixelGrid, metrics: HeadMetrics, style: number): void {
  const spec = FOOT_STYLES[style];
  if (!spec) return;

  for (let y = metrics.bottom + 1; y < GRID_SIZE; y++) grid[y].fill(0);

  const base = metrics.rows[metrics.bottom];
  if (!base) return;

  const centre = GRID_SIZE / 2;
  const left = centre - spec.inner - spec.width;
  const right = GRID_SIZE - 1 - left;
  // Both sides, not just the left: a head with an asymmetric base (bean) has
  // its bottom row off-centre, so a centred foot can clear one edge and
  // overhang the other.
  if (left < base.left || right > base.right) return;

  for (let r = 0; r < spec.rows; r++) {
    const row = metrics.bottom + 1 + r;
    if (row >= GRID_SIZE) break;
    for (let i = 0; i < spec.width; i++) {
      grid[row][left + i] = BODY;
      grid[row][GRID_SIZE - 1 - left - i] = BODY;
    }
  }
}

/**
 * The head and its body pattern, with no face, topper or accessory on top.
 * Useful when something needs to know what sits underneath a face part — the
 * blink frame fills vacated eye cells from here.
 */
/**
 * Composes all part layers into a single 16x16 grid of colour tokens.
 *
 * Head first (base body shape), then body patterns masked onto body pixels,
 * then eyes, mouth, hair and accessories on top. Everything above the head is
 * positioned relative to that head's geometry — toppers rest on its crown, the
 * face block follows its centre, cheek marks hug its edges — so the parts stay
 * in register across all eight shapes instead of floating.
 */
export function composeBase(config: AvatarConfig): PixelGrid {
  const grid = emptyGrid();
  mergeLayer(grid, heads[config.head]);              // base body shape
  applyFeet(grid, headMetrics[config.head], config.feet ?? 0);
  maskMergeLayer(grid, bodies[config.body], BODY);   // patterns only ON the body

  if (config.patternTone === 1) {
    for (const row of grid) {
      for (let x = 0; x < GRID_SIZE; x++) if (row[x] === PATTERN) row[x] = ACCENT;
    }
  }

  return grid;
}

export function compose(config: AvatarConfig): PixelGrid {
  const head = heads[config.head];
  const metrics = headMetrics[config.head];
  const grid = composeBase(config);
  const dyFace = faceOffset(metrics);
  const dyTop = Math.max(0, metrics.crown - REFERENCE.crown);
  const dyLower = metrics.bottom - REFERENCE.bottom;

  mergeOnSilhouette(grid, eyes[config.eyes], dyFace, head);
  mergeOnSilhouette(grid, mouths[config.mouth], dyFace, head);
  if (hairPlacements[config.hair] === 'edge') {
    mergeAgainstEdges(grid, hair[config.hair], dyTop, metrics);
  } else {
    mergeTopper(grid, hair[config.hair], seatOffset(hair[config.hair], dyTop, dyFace), metrics);
  }

  const accessory = accessories[config.accessory];
  switch (accessoryPlacements[config.accessory]) {
    case 'face':
      mergeOnSilhouette(grid, accessory, dyFace, head);
      break;
    case 'edge':
      mergeAgainstEdges(grid, accessory, dyFace, metrics);
      break;
    case 'top':
      mergeTopper(grid, accessory, seatOffset(accessory, dyTop, dyFace), metrics);
      break;
    case 'lower':
      mergeLayer(grid, accessory, dyLower);
      break;
    default:
      mergeLayer(grid, accessory);
  }

  // Mirror last, so every layer lands on the side it was authored for and only
  // the finished character is flipped.
  if (config.flip) for (const row of grid) row.reverse();

  return grid;
}
