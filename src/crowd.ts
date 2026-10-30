/**
 * Crowd sprites: a guy small enough to stand in a crowd of thousands, still themself.
 *
 * At 16 a guy is their still (what they wear included; no frame, buddy or aura). Smaller,
 * the inside of them (everything but the outline) is shrunk so its longer side fits,
 * each cell taking the commonest colour under it, the eyes (and from 8 up the mouth) go
 * back as single cells that never touch, and the outline goes back round them. At 5 a guy
 * is a far face: their top over their body, two eyes and a darker band underneath, so a
 * packed row reads as a line of heads. At 4 and 2 they are their colours (hat or head over
 * body), and at 3 a far silhouette: a head over shoulders in a darker shade. Every sprite
 * sits at the bottom-centre of a square cell, so a crowd draws from a sheet of them with no
 * offsets. Built from the guy's token grid, so it needs no canvas and runs anywhere.
 *
 * What a guy wears is painted in its finish first (Gold reads gold, Prism prism) and the shrink
 * keeps those colours; an aura they wear outlines them in its own colours.
 */
import { resolve } from './resolve';
import { dress, withItems } from './items';
import { compose, faceOf } from './compose';
import { paletteOf } from './palette';
import { T } from './parts/art';
import type { GuySpec } from './guy-code';
import { GRADES, gradeOf } from './owned';
import { paint } from './paint';
import { auraById } from './auras';
import type { AvatarConfig } from './types';

/** The sizes a crowd sprite comes in, in pixels square. Appended to, never reordered. */
export const CROWD_SIZES = [16, 10, 8, 6, 4, 2, 14, 12, 5, 3] as const;
export type CrowdSize = (typeof CROWD_SIZES)[number];

type Make = { inner: number; ring: boolean; eyes: boolean; mouth: boolean };
/** How each shrunk size is made: the inside's longer side, and whether the outline, eyes and mouth go back. */
const MAKE: Record<Exclude<CrowdSize, 16 | 5 | 3>, Make> = {
  14: { inner: 12, ring: true, eyes: true, mouth: true },
  12: { inner: 10, ring: true, eyes: true, mouth: true },
  10: { inner: 8, ring: true, eyes: true, mouth: true },
  8: { inner: 6, ring: true, eyes: true, mouth: true },
  6: { inner: 4, ring: true, eyes: true, mouth: false },
  4: { inner: 3, ring: false, eyes: false, mouth: false },
  2: { inner: 2, ring: false, eyes: false, mouth: false },
};

/** Tokens that make a face; they never decide a cell's colour, the eyes and mouth go back on their own. */
const FACE = new Set<number>([T.EYE, T.WHITE, T.MOUTH, T.TONGUE, T.BLUSH]);
/** The face's features, which 14 and 12 keep cell for cell. */
const FEATURE = new Set<number>([T.EYE, T.WHITE, T.MOUTH, T.TONGUE]);
const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const ROUND = [...SIDES, [1, 1], [-1, 1], [1, -1], [-1, -1]];

/** A crowd sprite: `size` square, RGBA. */
export interface CrowdSprite { size: CrowdSize; rgba: Uint8ClampedArray }

/** How a guy stands out in a crowd: their best copy's grade from Prized up (an aura counts), or the founder's gold. */
export interface CrowdShine { grade: number; color: string }

/**
 * Everything a guy's crowd sprites are made from, worked out once (the costly part is composing
 * the guy), kept small: a crowd of ten thousand holds one each.
 */
export interface CrowdLook {
  /** The grid's side. */
  side: number;
  /** Each cell's token. */
  tokens: Uint8Array;
  /** 1 where a cell is outline, or drawn in the outline's colour. */
  outline: Uint8Array;
  /** Each cell's painted colour as an index into `inks` (0: none). */
  painted: Uint8Array;
  /** Each cell's colour for the shrink: painted, else the palette's. */
  shrunk: Uint8Array;
  /** Where the eyes (1) and mouth (2) are, as they were placed. */
  face: Uint8Array;
  inks: string[];
  ink: string; eye: string; mouth: string; body: string;
  shine: CrowdShine | null;
  /** An aura's colours, when the guy wears one. */
  aura: string[] | null;
}

function shineOf(config: AvatarConfig): CrowdShine | null {
  const grades = Object.values(config.owned ?? {}).filter(Boolean).map(o => GRADES.findIndex(g => g.id === gradeOf(o!).id));
  const grade = Math.max(-1, ...grades, config.founder ? 4 : -1);
  return grade >= 2 ? { grade, color: GRADES[grade].color } : null;
}

/**
 * Whether a guy stands out in a crowd, and in what colour: the grade of the best copy they wear, from
 * Prized up, or Grail gold for the founder. Everyday and Special copies, and nothing worn, don't.
 */
export function crowdShine(spec: GuySpec): CrowdShine | null {
  return shineOf(dress(resolve(spec.seed, spec.parts), { equip: spec.equip }, spec.seed));
}

/**
 * A guy's crowd colours without composing them (cheap): body, eyes and outline from their palette,
 * and whether they stand out. A crowd draws a stand-in from these until the real sprite is made.
 */
export function crowdBase(spec: GuySpec): { body: string; eye: string; ink: string; shine: CrowdShine | null } {
  const config = dress(resolve(spec.seed, spec.parts), { equip: spec.equip }, spec.seed);
  const base = spec.palette !== undefined ? paletteOf({ ...config, palette: spec.palette }) : paletteOf(config);
  const colors = base.colors as Record<number, string>;
  return { body: colors[T.BODY], eye: colors[T.EYE], ink: colors[T.OUTLINE], shine: shineOf(config) };
}

/** A guy's crowd look: composed and painted once, for any number of sprites after. */
export function crowdLook(spec: GuySpec): CrowdLook {
  const config = dress(resolve(spec.seed, spec.parts), { equip: spec.equip }, spec.seed);
  const grid = compose({ ...config, frame: undefined, aura: undefined, buddy: undefined }) as number[][];
  const base = spec.palette !== undefined ? paletteOf({ ...config, palette: spec.palette }) : paletteOf(config);
  const palette = withItems(base, config), colors = palette.colors as Record<number, string>;
  // Every cell in its finish, as the guy's still paints it.
  const painted = paint(grid, { ...config, aura: undefined }, palette, false, true);
  const side = grid.length, n = side * side, ink = colors[T.OUTLINE];
  const inks = [''], index = new Map<string, number>();
  const at = (c: string | null | undefined) => {
    if (!c) return 0;
    let i = index.get(c);
    if (i === undefined) { i = inks.length; inks.push(c); index.set(c, i); }
    return i;
  };
  const look: CrowdLook = {
    side, tokens: new Uint8Array(n), outline: new Uint8Array(n), painted: new Uint8Array(n), shrunk: new Uint8Array(n), face: new Uint8Array(n), inks,
    ink, eye: colors[T.EYE], mouth: colors[T.MOUTH], body: colors[T.BODY], shine: shineOf(config), aura: auraById(config.aura)?.colors ?? null,
  };
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
    const t = grid[y][x], i = y * side + x;
    look.tokens[i] = t;
    look.outline[i] = t && (t === T.OUTLINE || (colors[t] !== undefined && colors[t] === ink)) ? 1 : 0;
    look.painted[i] = at(painted[y][x]);
    look.shrunk[i] = at(painted[y][x] ?? colors[t]);
    if (FEATURE.has(t)) look.face[i] = t === T.MOUTH || t === T.TONGUE ? 2 : 1;
  }
  // The eyes and mouth wherever they were placed, in whatever they're drawn in (stars in gold, hearts in red):
  // each eye's columns over the eye rows, and the mouth's own cells, centred under them.
  const f = faceOf(config), mark = (x: number, y: number, v: number) => { if (x >= 0 && y >= 0 && x < side && y < side && grid[y][x] && !look.face[y * side + x]) look.face[y * side + x] = v; };
  for (const e of f.eyes) for (let y = f.top; y <= f.line; y++) for (let x = e.left; x <= e.right; x++) mark(x, y, 1);
  if (f.eyes.length) {
    const centre = (f.eyes[0].left + f.eyes[f.eyes.length - 1].right + 1) / 2, w = f.mouth.reduce((m, r) => Math.max(m, r.length), 0), mx = Math.floor(centre - w / 2);
    f.mouth.forEach((row, dy) => row.forEach((t, dx) => { if (t) mark(mx + dx, f.mouthTop + dy, 2); }));
  }
  return look;
}

/**
 * The guy as they stand in a crowd, `size` pixels square, bottom-centred. A guy who stands out
 * (`crowdShine`) is outlined in their grade's colour where they have an outline, and further back,
 * where they are only colours, their top cell takes it. `shine: false` leaves that off.
 */
export function crowdSprite(spec: GuySpec, size: CrowdSize, options: { shine?: boolean } = {}): CrowdSprite {
  return crowdSpriteOf(crowdLook(spec), size, options);
}

/** `crowdSprite` from a look already worked out (`crowdLook`), for many sizes of one guy. */
export function crowdSpriteOf(look: CrowdLook, size: CrowdSize, options: { shine?: boolean } = {}): CrowdSprite {
  const S = look.side;
  const full = () => Array.from({ length: S }, (_, y) => Array.from({ length: S }, (_, x) => look.inks[look.painted[y * S + x]] || null));
  const drawn = size === 16 ? full() : size === 5 || size === 3 ? far(look, size)
    : (size === 14 || size === 12 ? carve(look, full(), size) : null) ?? shrink(look, MAKE[size as Exclude<CrowdSize, 16 | 5 | 3>]);
  // Empty rows above and below go, so the guy stands on the cell's floor.
  const lit = drawn.map(row => row.some(Boolean)), first = lit.indexOf(true), last = lit.lastIndexOf(true);
  const cells = first < 0 ? [] : drawn.slice(first, last + 1);
  const shine = options.shine === false ? null : look.shine;
  if (shine && cells.length) {
    const aura = look.aura;
    // An aura's own colours round them, by turns; otherwise their grade's.
    const edge = (i: number, j: number) => (aura ? aura[(i + j) % aura.length] : shine.color);
    if (size >= 6) {
      cells.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === look.ink && isEdge(cells, j, i)) row[i] = edge(i, j); });
    } else {
      const top = cells[0], mid = top.findIndex(Boolean) + Math.floor(top.filter(Boolean).length / 2);
      top[Math.max(0, mid)] = aura ? aura[0] : shine.color;
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

/** Whether an outline cell is on the outside edge (beside nothing), so lines inside keep their ink. */
function isEdge(cells: (string | null)[][], j: number, i: number): boolean {
  return SIDES.some(([dx, dy]) => !cells[j + dy]?.[i + dx]);
}

/** A colour `amount` of the way to black. */
function darker(c: string, amount: number): string {
  const n = parseInt(c.slice(1, 7), 16), f = 1 - amount;
  return '#' + [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => Math.round(v * f).toString(16).padStart(2, '0')).join('');
}

/** The inside's bounds (everything but outline), or null for an empty guy. */
function insideOf(look: CrowdLook) {
  const S = look.side;
  let x0 = S, x1 = -1, y0 = S, y1 = -1;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x;
    if (look.tokens[i] && !look.outline[i]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  }
  return x1 < 0 ? null : { x0, x1, y0, y1 };
}

/** The commonest non-face colour of the inside between rows `from` and `to` (fractions of its height). */
function commonest(look: CrowdLook, box: { x0: number; x1: number; y0: number; y1: number }, from: number, to: number): string | undefined {
  const S = look.side, h = box.y1 - box.y0 + 1, count = new Map<number, number>();
  for (let y = box.y0 + Math.floor(h * from); y <= Math.min(box.y1, box.y0 + Math.ceil(h * to) - 1); y++) for (let x = box.x0; x <= box.x1; x++) {
    const i = y * S + x, t = look.tokens[i];
    if (!t || look.outline[i] || FACE.has(t) || !look.shrunk[i]) continue;
    count.set(look.shrunk[i], (count.get(look.shrunk[i]) ?? 0) + 1);
  }
  let best = 0, most = 0;
  for (const [c, v] of count) if (v > most) { best = c; most = v; }
  return best ? look.inks[best] : undefined;
}

/**
 * A far guy, for the back of a big crowd: a small shape in the guy's own colours, so a packed row
 * reads as a line of heads. At 5: their top in the colour of their top (a hat when it covers most of
 * it), their body below with two eyes a cell apart, and a band in a darker shade of the body
 * underneath. At 3: their top over a row of body and a row of the darker shade. The top row follows
 * their outline (ears at the corners, a hat's point in the middle, a flat head across), so no two
 * rows of them are the same.
 */
function far(look: CrowdLook, size: 5 | 3): (string | null)[][] {
  const box = insideOf(look);
  if (!box) return [[]];
  const body = commonest(look, box, 0.35, 0.85) ?? look.body;
  const top = commonest(look, box, 0, 0.3) ?? body, shade = darker(body, 0.35);
  const crown = crownOf(look, size), head = crown.some(Boolean) ? crown.map(on => (on ? top : null)) : size === 3 ? [null, top, null] : [null, top, top, top, null];
  if (size === 3) return [head, [body, body, body], [shade, shade, shade]];
  return [
    head,
    [top, top, top, top, top],
    [body, look.eye, body, look.eye, body],
    [body, body, body, body, body],
    [null, shade, shade, shade, null],
  ];
}

/** Which of `n` columns across the guy their top fills: the drawn cells in their top fifth, by column band. */
function crownOf(look: CrowdLook, n: number): boolean[] {
  const S = look.side;
  let x0 = S, x1 = -1, y0 = S;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (look.painted[y * S + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); }
  if (x1 < 0) return Array(n).fill(false);
  const w = x1 - x0 + 1, rows = 3;
  return Array.from({ length: n }, (_, i) => {
    const a = x0 + Math.floor(w * i / n), b = x0 + Math.floor(w * (i + 1) / n);
    let on = 0;
    for (let y = y0; y < y0 + rows; y++) for (let x = a; x < Math.max(b, a + 1); x++) if (look.painted[y * S + x]) on++;
    return on >= Math.max(b - a, 1) * rows * 0.5;
  });
}

/**
 * A guy at 14 or 12 with their face as drawn at 16: rows and columns of the rest of them that most
 * repeat a neighbour are taken out until they fit (columns in mirrored pairs, so a guy drawn
 * symmetric stays so), never one through the eyes or mouth, nor one that would close the gap between
 * two features. Null when the face leaves too little to take out.
 */
function carve(look: CrowdLook, cells: (string | null)[][], size: 14 | 12): (string | null)[][] | null {
  const S = look.side;
  let feature = Array.from({ length: S }, (_, y) => Array.from({ length: S }, (_, x) => look.face[y * S + x] > 0));
  // Down to what's drawn.
  const lit = cells.map(r => r.some(Boolean)), y0 = lit.indexOf(true), y1 = lit.lastIndexOf(true);
  if (y0 < 0) return null;
  let x0 = S, x1 = -1;
  for (const row of cells) row.forEach((c, x) => { if (c) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); } });
  cells = cells.slice(y0, y1 + 1).map(r => r.slice(x0, x1 + 1));
  feature = feature.slice(y0, y1 + 1).map(r => r.slice(x0, x1 + 1));
  // Height first, on the guy turned on its side, then width; over the face (ears, hats) last.
  const faceRows = feature.map(r => r.some(Boolean)), f0 = faceRows.indexOf(true);
  const tall = narrow(turn(cells), turn(feature), size, x => (f0 >= 0 && x < f0 ? 0.6 : 0), false);
  if (!tall) return null;
  return narrow(turn(tall[0]), turn(tall[1]), size, () => 0, true)?.[0] ?? null;
}

type Grid = (string | null)[][];
const turn = <V>(grid: V[][]): V[][] => (grid[0] ?? []).map((_, x) => grid.map(r => r[x]));

/**
 * Takes seams down `cells` (one cell a row, moving at most one across from row to row) until it is
 * `size` wide, the cheapest first: a cell costs nothing where it repeats a neighbour, and a seam that
 * steps sideways costs what it puts out of line. Never through a feature, nor the last cell between
 * two. `pairs` takes them a seam each side of the middle where it can, so a symmetric guy stays so;
 * `extra(x)` adds to a column's cost.
 */
function narrow(cells: Grid, feature: boolean[][], size: number, extra: (x: number) => number, pairs: boolean): [Grid, boolean[][]] | null {
  const h = cells.length;
  while (cells[0].length > size) {
    const w = cells[0].length, at = (y: number, x: number) => (x < 0 || x >= w ? null : cells[y][x]);
    // Where a seam may not go: the face's box (its first feature to its last, both ways), but for a
    // column clear of features from top to bottom of it, with another clear one beside it.
    const rowsWith = feature.map(r => r.some(Boolean)), r0 = rowsWith.indexOf(true), r1 = rowsWith.lastIndexOf(true);
    const clear = Array.from({ length: w }, (_, x) => { for (let y = r0; y <= r1; y++) if (feature[y][x]) return false; return true; });
    const c0 = clear.indexOf(false), c1 = clear.lastIndexOf(false);
    const open = clear.map((c, x) => c && (x < c0 || x > c1 || clear[x - 1] || clear[x + 1]));
    const blocked = (y: number, x: number) => r0 >= 0 && y >= r0 && y <= r1 && !open[x];
    const seam = (lo: number, hi: number): number[] | null => {
      const n = hi - lo + 1, M = new Float64Array(h * n).fill(Infinity), from = new Int8Array(h * n);
      for (let y = 0; y < h; y++) for (let x = lo; x <= hi; x++) {
        if (blocked(y, x)) continue;
        const c = cells[y][x], e = (c === at(y, x - 1) || c === at(y, x + 1) ? 0 : 1) + extra(x);
        if (!y) { M[x - lo] = e; continue; }
        let best = M[(y - 1) * n + x - lo], step = 0;
        // Stepping sideways puts the cell beside the seam under the row above's cell here.
        if (x + 1 <= hi) { const v = M[(y - 1) * n + x + 1 - lo] + (cells[y - 1][x] !== at(y, x + 1) ? 1 : 0.25); if (v < best) { best = v; step = 1; } }
        if (x - 1 >= lo) { const v = M[(y - 1) * n + x - 1 - lo] + (cells[y - 1][x] !== at(y, x - 1) ? 1 : 0.25); if (v < best) { best = v; step = -1; } }
        M[y * n + x - lo] = best + e; from[y * n + x - lo] = step;
      }
      let x = -1, best = Infinity;
      for (let i = 0; i < n; i++) if (M[(h - 1) * n + i] < best) { best = M[(h - 1) * n + i]; x = i; }
      if (x < 0) return null;
      const path = Array<number>(h);
      for (let y = h - 1; y >= 0; y--) { path[y] = x + lo; x += from[y * n + x]; }
      return path;
    };
    const half = Math.floor(w / 2), cut: number[][] = [];
    if (pairs && w - size >= 2) {
      const right = seam(w - half, w - 1), left = seam(0, half - 1);
      if (left && right) cut.push(right, left);
    }
    if (!cut.length) { const one = seam(0, w - 1); if (!one) return null; cut.push(one); }
    for (const path of cut) for (let y = 0; y < h; y++) { cells[y].splice(path[y], 1); feature[y].splice(path[y], 1); }
  }
  return [cells, feature];
}

function shrink(look: CrowdLook, make: Make): (string | null)[][] {
  const S = look.side, ink = look.ink, tok = (x: number, y: number) => (x >= 0 && y >= 0 && x < S && y < S ? look.tokens[y * S + x] : 0);
  const box = insideOf(look);
  if (!box) return [[]];
  const { x0, y0 } = box, bw = box.x1 - x0 + 1, bh = box.y1 - y0 + 1, k = Math.max(bw, bh) / make.inner;
  const w = Math.max(1, Math.round(bw / k)), h = Math.max(1, Math.round(bh / k));
  const P = make.ring ? 1 : 0, W = w + 2 * P, H = h + 2 * P;
  const out: (string | null)[][] = Array.from({ length: H }, () => Array(W).fill(null));
  const ox = x0 + (bw - w * k) / 2, oy = y0 + (bh - h * k) / 2;
  // Each cell covers a k-by-k patch: in if the guy fills most of it, coloured by what fills it most.
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const sx0 = ox + i * k, sx1 = sx0 + k, sy0 = oy + j * k, sy1 = sy0 + k;
    const weight = new Map<string, number>();
    let cover = 0;
    for (let y = Math.floor(sy0); y < Math.ceil(sy1); y++) for (let x = Math.floor(sx0); x < Math.ceil(sx1); x++) {
      const a = (Math.min(x + 1, sx1) - Math.max(x, sx0)) * (Math.min(y + 1, sy1) - Math.max(y, sy0));
      const t = tok(x, y);
      if (a <= 0 || !t || look.outline[y * S + x]) continue;
      cover += a;
      const c = look.inks[look.shrunk[y * S + x]];
      if (!FACE.has(t) && c) weight.set(c, (weight.get(c) ?? 0) + a);
    }
    if (cover < k * k * 0.45) continue;
    let best = look.body, most = -1;
    for (const [c, v] of weight) if (v > most) { best = c; most = v; }
    out[j + P][i + P] = best;
  }
  const inside = out.map(row => row.map(Boolean));
  // Where a feature's middle falls on the small grid.
  const spot = (cells: number[][]) => {
    const mx = cells.reduce((s, c) => s + c[0], 0) / cells.length + 0.5, my = cells.reduce((s, c) => s + c[1], 0) / cells.length + 0.5;
    return [Math.min(w - 1, Math.max(0, Math.floor((mx - ox) / k))) + P, Math.min(h - 1, Math.max(0, Math.floor((my - oy) / k))) + P];
  };
  const parts = (want: (t: number, i: number) => boolean) => {
    const seen = new Set<number>(), found: number[][][] = [];
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      if (!want(tok(x, y), y * S + x) || seen.has(y * S + x)) continue;
      const stack = [[x, y]], cells: number[][] = [];
      seen.add(y * S + x);
      while (stack.length) {
        const [cx, cy] = stack.pop()!;
        cells.push([cx, cy]);
        for (const [dx, dy] of ROUND) {
          const nx = cx + dx, ny = cy + dy;
          if (nx >= 0 && ny >= 0 && nx < S && ny < S && want(tok(nx, ny), ny * S + nx) && !seen.has(ny * S + nx)) { seen.add(ny * S + nx); stack.push([nx, ny]); }
        }
      }
      found.push(cells);
    }
    return found;
  };
  const taken = new Set<string>();
  if (make.eyes) {
    // Eyes drawn in something else (stars in gold, hearts in red) are found where the eyes were placed, in their own colour.
    let eye = look.eye, found = parts(t => t === T.EYE);
    if (!found.length) {
      const drawn = (i: number) => look.face[i] === 1 && !!look.painted[i] && look.inks[look.painted[i]] !== look.body;
      found = parts((_, i) => drawn(i));
      const count = new Map<number, number>();
      for (const cells of found) for (const [x, y] of cells) count.set(look.painted[y * S + x], (count.get(look.painted[y * S + x]) ?? 0) + 1);
      let most = 0;
      for (const [c, n] of count) if (n > most) { most = n; eye = look.inks[c]; }
    }
    const spots = found.sort((a, b) => b.length - a.length).slice(0, 2).map(spot).sort((a, b) => a[0] - b[0]);
    // Two eyes never touch: a cell of face between them, set wide on a small face (a 2-cell bar reads as a visor).
    if (spots.length === 2 && Math.abs(spots[0][1] - spots[1][1]) <= 1 && spots[1][0] - spots[0][0] < 2) {
      // On a row too narrow for a gap, one row down (or up) where the face is wider.
      const width = (j: number) => (inside[j] ? inside[j].lastIndexOf(true) - inside[j].indexOf(true) + 1 : 0);
      let row = Math.max(spots[0][1], spots[1][1]);
      if (width(row) < 3) row = [row + 1, row - 1].find(j => width(j) >= 3) ?? row;
      spots[0][1] = spots[1][1] = row;
      const lo = inside[row].indexOf(true), hi = inside[row].lastIndexOf(true);
      while (spots[1][0] - spots[0][0] < 2) {
        if (spots[0][0] - 1 >= lo && spots[0][0] - lo >= hi - spots[1][0]) spots[0][0]--;
        else if (spots[1][0] + 1 <= hi) spots[1][0]++;
        else if (spots[0][0] - 1 >= lo) spots[0][0]--;
        else break;
      }
    }
    for (const [i, j] of spots) if (inside[j]?.[i]) { out[j][i] = eye; taken.add(`${i},${j}`); }
  }
  if (make.mouth) {
    const mouth = parts(t => t === T.MOUTH || t === T.TONGUE).sort((a, b) => b.length - a.length)[0];
    // Never beside an eye, where it would read as a wider eye: a row lower, or left off.
    const near = (i: number, j: number) => [...taken].some(t => { const [a, b] = t.split(',').map(Number); return Math.abs(a - i) <= 1 && Math.abs(b - j) <= 1; });
    if (mouth) { let [i, j] = spot(mouth); if (near(i, j)) j++; if (inside[j]?.[i] && !near(i, j)) out[j][i] = look.mouth; }
  }
  if (make.ring) for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    if (!inside[j][i] && SIDES.some(([dx, dy]) => inside[j + dy]?.[i + dx])) out[j][i] = ink;
  }
  return out;
}
