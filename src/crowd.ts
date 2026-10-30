/**
 * Crowd sprites: a guy small enough to stand in a crowd of thousands, still him.
 *
 * At 16 he is his still (what he wears included; no frame, buddy or aura). Smaller,
 * the inside of him (everything but his outline) is shrunk so its longer side
 * fits, each cell taking the commonest colour under it, his eyes (and at 10 and 8
 * his mouth) go back as single cells, and his outline goes back round him. At 4
 * and 2 he is his colours: hat or head over body. Every sprite sits at the
 * bottom-centre of a square cell, so a crowd draws from a sheet of them with no
 * offsets. Built from his token grid, so it needs no canvas and runs anywhere.
 *
 * What he wears is painted in its finish first (Gold reads gold, Prism prism) and the shrink keeps
 * those colours; an aura he wears outlines him in its own colours.
 */
import { resolve } from './resolve';
import { dress, withItems } from './items';
import { compose } from './compose';
import { paletteOf } from './palette';
import { T } from './parts/art';
import type { GuySpec } from './guy-code';
import { GRADES, gradeOf } from './owned';
import { paint } from './paint';
import { auraById } from './auras';

/** The sizes a crowd sprite comes in, in pixels square. */
export const CROWD_SIZES = [16, 10, 8, 6, 4, 2] as const;
export type CrowdSize = (typeof CROWD_SIZES)[number];

/** How each size is made: the inside's longer side, and whether the outline, eyes and mouth go back. */
const MAKE: Record<Exclude<CrowdSize, 16>, { inner: number; ring: boolean; eyes: boolean; mouth: boolean }> = {
  10: { inner: 8, ring: true, eyes: true, mouth: true },
  8: { inner: 6, ring: true, eyes: true, mouth: true },
  6: { inner: 4, ring: true, eyes: true, mouth: false },
  4: { inner: 3, ring: false, eyes: false, mouth: false },
  2: { inner: 2, ring: false, eyes: false, mouth: false },
};

/** Tokens that make a face; they never decide a cell's colour, the eyes and mouth go back on their own. */
const FACE = new Set<number>([T.EYE, T.WHITE, T.MOUTH, T.TONGUE, T.BLUSH]);
const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const ROUND = [...SIDES, [1, 1], [-1, 1], [1, -1], [-1, -1]];

/** A crowd sprite: `size` square, RGBA. */
export interface CrowdSprite { size: CrowdSize; rgba: Uint8ClampedArray }

/** How a guy stands out in a crowd: his best copy's grade from Prized up (an aura counts), or the founder's gold. */
export interface CrowdShine { grade: number; color: string }

/**
 * Whether a guy stands out in a crowd, and in what colour: the grade of the best copy he wears, from
 * Prized up, or Grail gold for the founder. Everyday and Special copies, and nothing worn, don't.
 */
export function crowdShine(spec: GuySpec): CrowdShine | null {
  const config = dress(resolve(spec.seed, spec.parts), { equip: spec.equip }, spec.seed);
  const grades = Object.values(config.owned ?? {}).filter(Boolean).map(o => GRADES.findIndex(g => g.id === gradeOf(o!).id));
  const grade = Math.max(-1, ...grades, config.founder ? 4 : -1);
  return grade >= 2 ? { grade, color: GRADES[grade].color } : null;
}

/**
 * The guy as he stands in a crowd, `size` pixels square, bottom-centred. A guy who stands out
 * (`crowdShine`) is outlined in his grade's colour where he has an outline, and further back, where he
 * is only his colours, his top cell takes it. `shine: false` leaves that off.
 */
export function crowdSprite(spec: GuySpec, size: CrowdSize, options: { shine?: boolean } = {}): CrowdSprite {
  const config = dress(resolve(spec.seed, spec.parts), { equip: spec.equip }, spec.seed);
  const grid = compose({ ...config, frame: undefined, aura: undefined, buddy: undefined }) as number[][];
  const base = spec.palette !== undefined ? paletteOf({ ...config, palette: spec.palette }) : paletteOf(config);
  const palette = withItems(base, config), colors = palette.colors as Record<number, string>;
  // Every cell in its finish, as his still paints it.
  const painted = paint(grid, { ...config, aura: undefined }, palette, false, true);
  const drawn = size === 16 ? painted.map(row => [...row]) : shrink(grid, colors, MAKE[size], painted);
  // Empty rows above and below him go, so he stands on the cell's floor.
  const lit = drawn.map(row => row.some(Boolean)), first = lit.indexOf(true), last = lit.lastIndexOf(true);
  const cells = first < 0 ? [] : drawn.slice(first, last + 1);
  const shine = options.shine === false ? null : crowdShine(spec);
  if (shine && cells.length) {
    const ink = colors[T.OUTLINE], aura = auraById(config.aura);
    // An aura's own colours round him, by turns; otherwise his grade's.
    const edge = (i: number, j: number) => (aura ? aura.colors[(i + j) % aura.colors.length] : shine.color);
    if (size === 16 || size >= 6) {
      cells.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === ink && isEdge(cells, row, i)) row[i] = edge(i, j); });
    } else {
      const top = cells[0], mid = top.findIndex(Boolean) + Math.floor(top.filter(Boolean).length / 2);
      top[Math.max(0, mid)] = aura ? aura.colors[0] : shine.color;
    }
  }
  const rgba = new Uint8ClampedArray(size * size * 4);
  const h = cells.length, w = cells[0]?.length ?? 0;
  const ox = Math.floor((size - w) / 2), oy = size - h;
  cells.forEach((row, j) => row.forEach((c, i) => {
    const x = ox + i, y = oy + j;
    if (!c || x < 0 || y < 0 || x >= size || y >= size) return;
    rgba.set([parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 255], (y * size + x) * 4);
  }));
  return { size, rgba };
}

/**
 * Many guys at one size on one sheet, `columns` to a row, in the order given: guy `n` is the cell at
 * column `n % columns`, row `floor(n / columns)`. A crowd draws each from it with one copy.
 */
export function crowdSheet(specs: GuySpec[], size: CrowdSize, columns = 64, options: { shine?: boolean } = {}): { width: number; height: number; columns: number; rgba: Uint8ClampedArray } {
  const cols = Math.max(1, Math.min(columns, specs.length)), rows = Math.ceil(specs.length / cols);
  const width = cols * size, height = rows * size, rgba = new Uint8ClampedArray(width * height * 4);
  specs.forEach((spec, n) => {
    const s = crowdSprite(spec, size, options), ox = (n % cols) * size, oy = Math.floor(n / cols) * size;
    for (let y = 0; y < size; y++) rgba.set(s.rgba.subarray(y * size * 4, (y + 1) * size * 4), ((oy + y) * width + ox) * 4);
  });
  return { width, height, columns: cols, rgba };
}

/** Whether an outline cell is on his outside edge (beside nothing), so lines inside him keep their ink. */
function isEdge(cells: (string | null)[][], row: (string | null)[], i: number): boolean {
  const j = cells.indexOf(row);
  return SIDES.some(([dx, dy]) => !cells[j + dy]?.[i + dx]);
}

function shrink(grid: number[][], colors: Record<number, string>, make: (typeof MAKE)[keyof typeof MAKE], painted: (string | null)[][]): (string | null)[][] {
  const S = grid.length, ink = colors[T.OUTLINE];
  const isOutline = (t: number) => t === T.OUTLINE || (colors[t] !== undefined && colors[t] === ink);
  let x0 = S, x1 = -1, y0 = S, y1 = -1;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const t = grid[y][x];
    if (t && !isOutline(t)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  }
  if (x1 < 0) return [[]];
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, k = Math.max(bw, bh) / make.inner;
  const w = Math.max(1, Math.round(bw / k)), h = Math.max(1, Math.round(bh / k));
  const P = make.ring ? 1 : 0, W = w + 2 * P, H = h + 2 * P;
  const out: (string | null)[][] = Array.from({ length: H }, () => Array(W).fill(null));
  const ox = x0 + (bw - w * k) / 2, oy = y0 + (bh - h * k) / 2;
  // Each cell covers a k-by-k patch of him: in if he fills most of it, coloured by what fills it most.
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const sx0 = ox + i * k, sx1 = sx0 + k, sy0 = oy + j * k, sy1 = sy0 + k;
    const weight = new Map<string, number>();
    let cover = 0;
    for (let y = Math.floor(sy0); y < Math.ceil(sy1); y++) for (let x = Math.floor(sx0); x < Math.ceil(sx1); x++) {
      const a = (Math.min(x + 1, sx1) - Math.max(x, sx0)) * (Math.min(y + 1, sy1) - Math.max(y, sy0));
      const t = grid[y]?.[x];
      if (a <= 0 || !t || isOutline(t)) continue;
      cover += a;
      const c = painted[y]?.[x] ?? colors[t];
      if (!FACE.has(t) && c) weight.set(c, (weight.get(c) ?? 0) + a);
    }
    if (cover < k * k * 0.45) continue;
    let best = colors[T.BODY], most = -1;
    for (const [c, v] of weight) if (v > most) { best = c; most = v; }
    out[j + P][i + P] = best;
  }
  const inside = out.map(row => row.map(Boolean));
  // Where a feature's middle falls on the small grid.
  const spot = (cells: number[][]) => {
    const mx = cells.reduce((s, c) => s + c[0], 0) / cells.length + 0.5, my = cells.reduce((s, c) => s + c[1], 0) / cells.length + 0.5;
    return [Math.min(w - 1, Math.max(0, Math.floor((mx - ox) / k))) + P, Math.min(h - 1, Math.max(0, Math.floor((my - oy) / k))) + P];
  };
  const parts = (want: (t: number) => boolean) => {
    const seen = new Set<number>(), found: number[][][] = [];
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      if (!want(grid[y][x]) || seen.has(y * S + x)) continue;
      const stack = [[x, y]], cells: number[][] = [];
      seen.add(y * S + x);
      while (stack.length) {
        const [cx, cy] = stack.pop()!;
        cells.push([cx, cy]);
        for (const [dx, dy] of ROUND) {
          const nx = cx + dx, ny = cy + dy;
          if (nx >= 0 && ny >= 0 && nx < S && ny < S && want(grid[ny][nx]) && !seen.has(ny * S + nx)) { seen.add(ny * S + nx); stack.push([nx, ny]); }
        }
      }
      found.push(cells);
    }
    return found;
  };
  const taken = new Set<string>();
  if (make.eyes) {
    const spots = parts(t => t === T.EYE).sort((a, b) => b.length - a.length).slice(0, 2).map(spot).sort((a, b) => a[0] - b[0]);
    // Two eyes never share a cell.
    if (spots.length === 2 && spots[0][0] === spots[1][0] && spots[0][1] === spots[1][1]) {
      spots[0][0] = Math.max(P, spots[0][0] - 1);
      spots[1][0] = Math.min(W - 1 - P, spots[1][0] + 1);
    }
    for (const [i, j] of spots) if (inside[j]?.[i]) { out[j][i] = colors[T.EYE]; taken.add(`${i},${j}`); }
  }
  if (make.mouth) {
    const mouth = parts(t => t === T.MOUTH || t === T.TONGUE).sort((a, b) => b.length - a.length)[0];
    if (mouth) { const [i, j] = spot(mouth); if (inside[j]?.[i] && !taken.has(`${i},${j}`)) out[j][i] = colors[T.MOUTH]; }
  }
  if (make.ring) for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    if (!inside[j][i] && SIDES.some(([dx, dy]) => inside[j + dy]?.[i + dx])) out[j][i] = ink;
  }
  return out;
}
