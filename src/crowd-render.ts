/**
 * What the crowd (./crowd-stage) and the stadium (./stadium) share: guys in seats on a canvas, sharp
 * and quick at ten thousand.
 *
 * Everything is drawn at whole device pixels per world pixel with smoothing off, so nothing blurs.
 * Everyone sitting still is baked into one picture at the scene's own pixels, with the scene behind
 * them. The canvas keeps what it last showed, so a frame repaints only where something moved or
 * stopped moving (the wave's band, a hop, someone arriving, a glint): there, the scene, then every
 * guy who touches it, back to front, in a clipped patch. A guy is drawn from a stand-in in their own
 * colours until their sprite is made, a few milliseconds a frame, front rows first. Sprites live on
 * one sheet per size, kept as pixels and sent to the canvas once a frame, tinted for how far back
 * they sit. When the seats change, the old picture holds while the new one is put together.
 */
import { crowdBase, crowdLook, crowdSpriteOf, type CrowdLook, type CrowdSize } from './crowd';
import { hash } from './hash';
import type { GuySpec } from './guy-code';

/** A seat: where a guy stands (their cell's top-left), at what crowd size, and in which row. */
export interface Seat { x: number; y: number; size: CrowdSize; row: number }

/** How far-off guys are coloured: `amount` of the way to `toward`, then `shade` darker. */
export interface Tint { toward: string; amount: number; shade: number }

/** A light fixture's bottom, in world pixels, where a spotlight's beam comes from. */
export interface Light { x: number; y: number }

/** A laid-out scene: the world's size and where it lands on the canvas, its seats and its picture. */
export interface Scene {
  width: number; height: number;
  /** Device pixels to a world pixel (whole), and where world (0, 0) lands in device pixels. */
  k: number; ox: number; oy: number;
  /** Seats in the order they fill. */
  seats: Seat[];
  /** Seat numbers by row, back row first, each row left to right. */
  rows: number[][];
  /** Each seat's tint, as an index into `tints`. */
  bands: Uint8Array;
  tints: Tint[];
  /** The scene behind the guys at world pixels, or null for a see-through canvas. */
  backdrop: HTMLCanvasElement | null;
  /** Paints `backdrop` when it is first needed, so a big crowd's new layout is put together over several frames. */
  later?: () => HTMLCanvasElement;
  /** Where lights hang, for a spotlight's beam; with none it is a pool of light alone. */
  lights?: Light[];
  /** A front seat's step, which sets the wave's width unless `wave` does. */
  pitch: number;
  /** How wide the wave's band is, in world pixels. */
  wave?: number;
  /** The colour a spotlight's dimming and its label's pill are drawn in. */
  shadow: string;
}

/** A guy in a crowd. */
export interface Guy {
  key: string; spec: GuySpec;
  /** Their seat number, or -1 while they wait for one. */
  seat: number;
  joined: number; hopAt: number; hopFor: number;
  look: CrowdLook | null;
  base: { body: string; eye: string; ink: string };
  shine: string | null; glint: boolean;
  cells: Map<number, number>;
  /** Fades in and drops into the seat when they arrive. */
  arriving: boolean;
  from?: { x: number; y: number; side: number };
  hash: number;
  /** Their arms' colours for a band of a scene. */
  arm?: [number, Scene, string, string];
  /** How they were last drawn moving (a hop's height, a flash, an arrival's fade), so an unchanged frame skips them. */
  shown?: number;
}

export interface RenderOptions {
  /** Lays the scene out for the canvas's device pixels. */
  build(width: number, height: number, dpr: number): Scene;
  /** The pixel font for a spotlit guy's line, as a CSS font. */
  font?: string;
  /** Guys at 6 pixels and up hop a pixel now and then on their own. */
  idle?: boolean;
  wave?: boolean;
  /** Runs at the start of every frame, before anything is drawn: a stadium lays itself out again here. */
  beforeFrame?(): void;
  /** Runs after every new layout. */
  onLayout?(): void;
}

/** Every crowd sprite sheet, so a test can tell them from other canvases. */
export const sheetCanvases = new WeakSet<object>();

type Rect = [x: number, y: number, w: number, h: number];
interface Sheet {
  canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; size: number;
  /** The sheet's pixels, sent to the canvas once a frame where they changed. */
  data: Uint8ClampedArray; image: ImageData;
  rows: number; next: number; free: number[]; used: number;
  /** Per cell: the sprite's left, right and top (4 bits each), and where its arms go (./arms). */
  ext: Uint16Array; arm: Uint16Array;
  dirty: [x0: number, y0: number, x1: number, y1: number];
}
const COLS = 64, MAX_ROWS = 64, CELLS = COLS * MAX_ROWS;
const TILE = 96, WAVE_MS = 5600, HOP_MS = 400, ARRIVE_MS = 500, SLIDE_MS = 420, FADE_MS = 600;
/** Hops at once, past which a big crowd's chatter waits its turn (a spotlight's and arrivals still go). */
const HOP_CAP = 24;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

const rgbOf = (c: string) => { const n = parseInt(c.slice(1, 7), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const hexOf = (r: number, g: number, b: number) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
/** How light a colour is, 0 to 1. */
export const lightness = (c: string) => { const [r, g, b] = rgbOf(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
/** A colour through a tint. */
export function tinted(c: string, t: Tint | undefined): string {
  if (!t || (!t.amount && !t.shade)) return c;
  const [r, g, b] = rgbOf(c), [hr, hg, hb] = rgbOf(t.toward), a = t.amount, f = 1 - t.shade;
  return hexOf((r + (hr - r) * a) * f, (g + (hg - g) * a) * f, (b + (hb - b) * a) * f);
}
const meets = (a: Rect, b: Rect) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];

/**
 * A stand-in for a guy whose sprite isn't made yet: a round shape in their body colour, outlined from
 * 6 up, two eyes a cell apart, and the far shapes' darker band underneath.
 */
function standIn(size: CrowdSize, base: Guy['base']): (string | null)[][] {
  const shade = tinted(base.body, { toward: '#000000', amount: 0, shade: 0.35 }), b = base.body, e = base.eye;
  if (size <= 2) return [[b, b], [shade, shade]];
  if (size === 3) return [[null, b, null], [b, b, b], [shade, shade, shade]];
  if (size <= 5) return [[null, b, b, b, null], [b, b, b, b, b], [b, e, b, e, b], [b, b, b, b, b], [null, shade, shade, shade, null]];
  const w = Math.max(4, Math.round(size * 0.8)), h = Math.max(4, Math.round(size * 0.78));
  const out: (string | null)[][] = Array.from({ length: h }, () => Array(w).fill(null));
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const u = (i + 0.5) / w * 2 - 1, v = (j + 0.5) / h * 2 - 1;
    if (u * u + v * v * 0.8 <= 1.05) out[j][i] = b;
  }
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (out[j][i] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !out[j + dy]?.[i + dx])) out[j][i] = base.ink;
  const ey = Math.round(h * 0.42), gap = Math.max(1, Math.round(w * 0.2)), mid = Math.floor(w / 2);
  if (out[ey]) { out[ey][mid - 1 - Math.floor(gap / 2)] = e; out[ey][mid + Math.ceil(gap / 2)] = e; }
  return out;
}

/** The renderer: guys, their sprites, the baked picture and the frame loop. */
export function createRender(canvas: HTMLCanvasElement, options: RenderOptions) {
  const ctx = canvas.getContext('2d')!;
  const guys = new Map<string, Guy>();
  let devW = 1, devH = 1, dpr = 1;
  let scene!: Scene;
  let bySeat: (Guy | undefined)[] = [];
  // Per seat: its row (as an index into the scene's rows) and place in that row; per row, its bounds.
  let biggest = 1, standTop = 0, standBottom = 0, farBig = 0, farBottom = 0, nearTop = Infinity, rowOf = new Int32Array(0), placeOf = new Int32Array(0), rowTop: number[] = [], rowBottom: number[] = [], rowXs: Float64Array[] = [], rowBig: number[] = [];
  let still: HTMLCanvasElement = document.createElement('canvas'), stillCtx = still.getContext('2d')!, stillPainted = false;
  // The still picture's changed patches, or all of it; and the canvas: whether all of it is drawn afresh next frame.
  let stale: Rect[] | 'all' = 'all', whole = true;
  // A new layout's rows still to be put together (the old picture holds meanwhile), and a layout waiting for the next frame.
  let building: { next: number; all: boolean } | null = null, wanted: 'cut' | 'slide' | 'fade' | null = null;
  let fade: { canvas: HTMLCanvasElement; k: number; ox: number; oy: number; until: number; ms: number } | null = null;
  let tintKey = '';
  let slide: { until: number } | null = null;
  let waving = !!options.wave, waveStart = 0, frame = 0, gone = false, lastFrame = 0;
  let lit: { guy: Guy; label: string; from: number; until: number; overlay: { canvas: HTMLCanvasElement; x: number; y: number } | null; aim: string; pose?: string; level: number; landed: boolean; drawn: Rect | null } | null = null;
  const moving = new Set<Guy>(), rare = new Set<Guy>();
  const sheets = new Map<number, (Sheet | null)[]>(), stand = new Map<string, [CrowdSize, number]>();
  // Seats whose guy changed how they look at rest, for the next frame to put into the picture.
  const restless = new Set<number>();
  // What was drawn live last frame (world rects), for this frame to put back.
  let shown: Rect[] = [];
  // Guys waiting for a sprite, best seats first, and how far through them making has got.
  let queue: Guy[] = [], made = 0;
  const queued = new Set<Guy>();

  // ------------------------------------------------------------ sprites
  const code = (size: CrowdSize, band: number) => size * 64 + band;
  function sheetsOf(size: number) { let l = sheets.get(size); if (!l) sheets.set(size, l = []); return l; }
  function newSheet(size: number, rows: number): Sheet {
    const c = document.createElement('canvas');
    c.width = COLS * size; c.height = rows * size;
    sheetCanvases.add(c);
    const data = new Uint8ClampedArray(c.width * c.height * 4);
    return { canvas: c, ctx: c.getContext('2d')!, size, data, image: new ImageData(data as Uint8ClampedArray<ArrayBuffer>, c.width, c.height), rows, next: 0, free: [], used: 0, ext: new Uint16Array(CELLS), arm: new Uint16Array(CELLS), dirty: [Infinity, Infinity, -1, -1] };
  }
  /** A sheet with room for more rows of cells (it starts small; a crowd of one size fills more). */
  function grow(s: Sheet) {
    const rows = Math.min(MAX_ROWS, s.rows * 2), data = new Uint8ClampedArray(s.canvas.width * rows * s.size * 4);
    data.set(s.data);
    s.canvas.height = rows * s.size;
    s.data = data; s.image = new ImageData(data as Uint8ClampedArray<ArrayBuffer>, s.canvas.width, s.canvas.height); s.rows = rows;
    s.dirty = [0, 0, s.canvas.width, s.canvas.height];
  }
  function alloc(size: CrowdSize): number {
    const list = sheetsOf(size);
    for (let n = 0; n < list.length; n++) {
      const s = list[n];
      if (!s) continue;
      if (s.free.length) { s.used++; return n * CELLS + s.free.pop()!; }
      if (s.next < CELLS) { if (s.next >= s.rows * COLS) grow(s); s.used++; return n * CELLS + s.next++; }
    }
    let n = list.indexOf(null);
    if (n < 0) n = list.length;
    const s = list[n] = newSheet(size, 2);
    s.used = 1; s.next = 1;
    return n * CELLS;
  }
  /** Gives a cell back; a sheet nobody draws from any more goes. */
  function release(size: number, id: number) {
    const list = sheetsOf(size), n = Math.floor(id / CELLS), s = list[n];
    if (!s) return;
    s.free.push(id % CELLS);
    if (--s.used <= 0) list[n] = null;
  }
  /** Writes a sprite into its cell, tinted, and notes its extent and where its arms go. */
  function put(size: CrowdSize, id: number, rgba: Uint8ClampedArray, tint: Tint | undefined) {
    const s = sheetsOf(size)[Math.floor(id / CELLS)]!, cell = id % CELLS, cx = (cell % COLS) * size, cy = Math.floor(cell / COLS) * size, W = s.canvas.width;
    let left: number = size, right = -1, top: number = size;
    const [hr, hg, hb] = tint ? rgbOf(tint.toward) : [0, 0, 0], a = tint?.amount ?? 0, f = 1 - (tint?.shade ?? 0), d = s.data;
    const lefts = new Int8Array(size).fill(-1), rights = new Int8Array(size).fill(-1);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const o = (y * size + x) * 4, p = ((cy + y) * W + cx + x) * 4;
      if (!rgba[o + 3]) { d[p + 3] = 0; continue; }
      if (x < left) left = x; if (x > right) right = x; if (y < top) top = y;
      if (lefts[y] < 0) lefts[y] = x; rights[y] = x;
      d[p] = (rgba[o] + (hr - rgba[o]) * a) * f; d[p + 1] = (rgba[o + 1] + (hg - rgba[o + 1]) * a) * f; d[p + 2] = (rgba[o + 2] + (hb - rgba[o + 2]) * a) * f; d[p + 3] = 255;
    }
    s.ext[cell] = right < 0 ? 0 : left | right << 4 | top << 8 | 1 << 12;
    // Arms come out of the sides at the shoulder (under halfway down), clear of the widest part above it.
    if (right >= 0 && size >= 6) {
      const sy = Math.min(size - 1, top + Math.round((size - top) * 0.45));
      let l: number = size, r = -1;
      for (let y = top; y <= sy; y++) if (lefts[y] >= 0) { l = Math.min(l, lefts[y]); r = Math.max(r, rights[y]); }
      s.arm[cell] = l | r << 4 | sy << 8 | 1 << 12;
    } else s.arm[cell] = 0;
    const dirty = s.dirty;
    dirty[0] = Math.min(dirty[0], cx); dirty[1] = Math.min(dirty[1], cy); dirty[2] = Math.max(dirty[2], cx + size); dirty[3] = Math.max(dirty[3], cy + size);
  }
  /** Sends a sheet's changed pixels to its canvas, once, before anything draws from it. */
  function upload(s: Sheet) {
    const [x0, y0, x1, y1] = s.dirty;
    if (x1 <= x0) return;
    s.ctx.putImageData(s.image, 0, 0, x0, y0, x1 - x0, y1 - y0);
    s.dirty = [Infinity, Infinity, -1, -1];
  }
  function uploadAll() { for (const list of sheets.values()) for (const s of list) if (s) upload(s); }
  function rgbaOf(cells: (string | null)[][], size: number) {
    const rgba = new Uint8ClampedArray(size * size * 4), h = cells.length, w = cells[0]?.length ?? 0, ox = Math.floor((size - w) / 2), oy = size - h;
    cells.forEach((row, j) => row.forEach((c, i) => { if (c) rgba.set([...rgbOf(c), 255], ((oy + j) * size + ox + i) * 4); }));
    return rgba;
  }
  /** The sheet cell a guy is drawn from in a seat: their own sprite, else a stand-in in their colours. */
  function cellOf(g: Guy, seat: number): number {
    const s = scene.seats[seat], band = scene.bands[seat], c = code(s.size, band), own = g.cells.get(c);
    if (own !== undefined) return own;
    const key = `${c}${g.base.body}${g.base.eye}${g.base.ink}`;
    let at = stand.get(key);
    if (!at) { at = [s.size, alloc(s.size)]; put(s.size, at[1], rgbaOf(standIn(s.size, g.base), s.size), scene.tints[band]); stand.set(key, at); }
    return at[1];
  }
  function want(g: Guy) {
    if (g.seat < 0 || g.seat >= scene.seats.length || queued.has(g)) return;
    const s = scene.seats[g.seat];
    if (!g.cells.has(code(s.size, scene.bands[g.seat]))) { queued.add(g); queue.push(g); }
  }
  function make(g: Guy) {
    queued.delete(g);
    if (guys.get(g.key) !== g || g.seat < 0 || g.seat >= scene.seats.length) return;
    const s = scene.seats[g.seat], band = scene.bands[g.seat], c = code(s.size, band);
    if (g.cells.has(c)) return;
    g.look ??= crowdLook(g.spec);
    const id = alloc(s.size);
    put(s.size, id, crowdSpriteOf(g.look, s.size).rgba, scene.tints[band]);
    g.cells.set(c, id);
    if (!moving.has(g)) restIn(g.seat);
  }
  function forget(g: Guy, keep?: number) {
    for (const [c, id] of g.cells) if (c !== keep) { release(Math.floor(c / 64), id); g.cells.delete(c); }
  }
  function sheetOf(size: number, id: number) {
    const s = sheetsOf(size)[Math.floor(id / CELLS)]!;
    if (s.dirty[2] > s.dirty[0]) upload(s);
    return s;
  }
  function blit(target: CanvasRenderingContext2D, size: number, id: number, x: number, y: number, w = size) {
    const cell = id % CELLS;
    target.drawImage(sheetOf(size, id).canvas, (cell % COLS) * size, Math.floor(cell / COLS) * size, size, size, x, y, w, w);
  }
  const extOf = (size: number, id: number) => sheetsOf(size)[Math.floor(id / CELLS)]!.ext[id % CELLS];
  const armOf = (size: number, id: number) => sheetsOf(size)[Math.floor(id / CELLS)]!.arm[id % CELLS];

  // ------------------------------------------------------------ the scene
  function index() {
    const n = scene.seats.length;
    rowOf = new Int32Array(n).fill(-1); placeOf = new Int32Array(n);
    rowTop = []; rowBottom = []; rowXs = []; rowBig = [];
    scene.rows.forEach((row, r) => {
      let top = Infinity, bottom = -Infinity, big = 0;
      const xs = new Float64Array(row.length);
      row.forEach((i, p) => { const s = scene.seats[i]; rowOf[i] = r; placeOf[i] = p; xs[p] = s.x; top = Math.min(top, s.y); bottom = Math.max(bottom, s.y + s.size); big = Math.max(big, s.size); });
      rowTop.push(top); rowBottom.push(bottom); rowXs.push(xs); rowBig.push(big);
    });
    bySeat = Array(n);
    for (const g of guys.values()) if (g.seat >= 0 && g.seat < n) bySeat[g.seat] = g;
    biggest = Math.max(1, ...rowBig);
    standTop = Math.min(scene.height, ...rowTop); standBottom = Math.max(0, ...rowBottom);
    // Far rows (8 and under) only sit or stand in the wave; nearer ones rise in steps.
    farBig = 0; farBottom = 0; nearTop = Infinity;
    rowBig.forEach((b, r) => { if (!rowXs[r].length) return; if (b <= 8) { farBig = Math.max(farBig, b); farBottom = Math.max(farBottom, rowBottom[r]); } else nearTop = Math.min(nearTop, rowTop[r]); });
    glintsDue = true;
  }
  /**
   * Lays the scene out again now: `slide` moves guys to their new seats, `fade` holds the old picture
   * while the new one is put together over a few frames, then cross-fades it out; `cut` swaps at once.
   */
  function relayout(how: 'cut' | 'slide' | 'fade' = 'cut', reseat?: () => void) {
    const before = scene, now = performance.now();
    // Nothing of the old layout ever showed, and no older picture holds: there's nothing to move or fade from.
    if (!stillPainted && !fade) how = 'cut';
    if (how === 'slide') for (const g of guys.values()) {
      if (g.seat < 0 || g.seat >= before.seats.length) { delete g.from; continue; }
      const s = before.seats[g.seat];
      g.from = { x: before.ox + s.x * before.k, y: before.oy + s.y * before.k, side: s.size * before.k };
    }
    // The old picture fades out over the new one at its own scale, never stretched: when guys slide, only the scene
    // behind them. One still being put together never showed, so whatever is on screen now keeps holding.
    if (!(how === 'fade' && building && fade)) {
      const old = how === 'slide' ? before.backdrop : how === 'fade' && stillPainted ? still : null;
      fade = old ? { canvas: old, k: before.k, ox: before.ox, oy: before.oy, until: how === 'fade' ? Infinity : now + SLIDE_MS, ms: how === 'fade' ? FADE_MS : SLIDE_MS } : null;
    }
    reseat?.();
    scene = options.build(devW, devH, dpr);
    index();
    if (how !== 'fade') ensureBackdrop();
    // Stand-ins and sprites were tinted for the old scene's distances.
    const key = JSON.stringify(scene.tints);
    for (const [size, id] of stand.values()) release(size, id);
    stand.clear();
    if (key !== tintKey) { tintKey = key; for (const g of guys.values()) forget(g); }
    still = document.createElement('canvas');
    still.width = scene.width; still.height = scene.height;
    stillCtx = still.getContext('2d')!;
    stillPainted = false;
    stale = 'all';
    layTiles();
    building = { next: 0, all: how !== 'fade' };
    slide = how === 'slide' ? { until: now + SLIDE_MS } : null;
    if (lit) { lit.overlay = null; lit.aim = ''; lit.drawn = null; }
    queue = []; made = 0; queued.clear(); restless.clear(); shown = []; waveCrest = NaN; glintStep = -1;
    const seated = [...guys.values()].filter(g => g.seat >= 0 && g.seat < scene.seats.length).sort((a, b) => a.seat - b.seat);
    for (const g of seated) { want(g); if (how !== 'slide') delete g.from; }
    if (how === 'cut') tidy();
    whole = true;
    options.onLayout?.();
    wake();
  }
  /** Paints the scene's backdrop if it waits to be. */
  function ensureBackdrop() {
    const paint = scene.later;
    if (paint) { scene.later = undefined; scene.backdrop = paint(); }
  }
  /** Lays the scene out again at the next frame, however many times it's asked for before then. */
  function request(how: 'cut' | 'slide' | 'fade') {
    wanted = wanted === 'cut' || how === 'cut' ? 'cut' : how;
    wake();
  }
  /** Sprites for sizes no seat calls for any more go back to their sheets. */
  function tidy() {
    for (const g of guys.values()) forget(g, g.seat >= 0 && g.seat < scene.seats.length ? code(scene.seats[g.seat].size, scene.bands[g.seat]) : -1);
  }

  // ------------------------------------------------------------ the baked rows
  // Each row's guys at rest live in tiles on one sheet, a tile per `TILE` world pixels across, as tall as
  // the row there: the baked picture is the scene with the rows laid on it, and a patch copies a row's
  // run of seats in one go (lifted, for the wave), not a guy at a time.
  interface Tile { x: number; top: number; h: number; ax: number; ay: number }
  let tiles: (Tile | null)[][] = [], atlas: HTMLCanvasElement | null = null, atlasCtx: CanvasRenderingContext2D | null = null;
  const rectOf = (seat: number, lift = 0): Rect => { const s = scene.seats[seat]; return [s.x - 3, s.y - lift - 3, s.size + 6, s.size + lift + 4]; };
  /** Whether a guy is part of the baked picture: seated, made or standing in, and not moving. */
  const atRest = (g: Guy) => lit?.guy !== g && !moving.has(g) && !slide;
  /** Seats of row `r` whose cells reach across world x `from` to `to`, as places in the row. */
  function span(r: number, from: number, to: number): [number, number] {
    const xs = rowXs[r];
    let lo = 0, hi = xs.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (xs[m] + rowBig[r] <= from) lo = m + 1; else hi = m; }
    let end = lo;
    while (end < xs.length && xs[end] < to) end++;
    return [lo, end];
  }
  /** Where every row's tiles go on the atlas; their guys are drawn into them as the layout is built. */
  function layTiles() {
    tiles = [];
    const AW = 2048, n = Math.ceil(scene.width / TILE);
    let ax = 0, ay = 0, shelf = 0;
    scene.rows.forEach((row, r) => {
      const list: (Tile | null)[] = [];
      for (let i = 0; i < n; i++) {
        const x = i * TILE, [a, b] = span(r, x, x + TILE);
        let top = Infinity, bottom = -Infinity;
        for (let p = a; p < b; p++) { const s = scene.seats[row[p]]; top = Math.min(top, s.y); bottom = Math.max(bottom, s.y + s.size); }
        if (a >= b) { list.push(null); continue; }
        if (ax + TILE > AW) { ax = 0; ay += shelf; shelf = 0; }
        list.push({ x, top, h: bottom - top, ax, ay });
        ax += TILE; shelf = Math.max(shelf, bottom - top);
      }
      tiles.push(list);
    });
    atlas = document.createElement('canvas');
    atlas.width = AW; atlas.height = Math.max(1, ay + shelf);
    atlasCtx = atlas.getContext('2d')!;
  }
  /** Draws row `r`'s guys at rest between world x `from` and `to` into its tiles, afresh. */
  function retile(r: number, from: number, to: number) {
    const g = atlasCtx!, row = scene.rows[r];
    for (let i = Math.max(0, Math.floor(from / TILE)); i <= Math.min(tiles[r].length - 1, Math.floor((to - 1) / TILE)); i++) {
      const t = tiles[r][i];
      if (!t) continue;
      const x0 = Math.max(from, t.x), x1 = Math.min(to, t.x + TILE), [a, b] = span(r, x0, x1);
      g.save();
      g.beginPath(); g.rect(t.ax + x0 - t.x, t.ay, x1 - x0, t.h); g.clip();
      g.clearRect(t.ax + x0 - t.x, t.ay, x1 - x0, t.h);
      g.setTransform(1, 0, 0, 1, t.ax - t.x, t.ay - t.top);
      for (let p = a; p < b; p++) { const i2 = row[p], guy = bySeat[i2]; if (guy && atRest(guy)) blit(g, scene.seats[i2].size, cellOf(guy, i2), scene.seats[i2].x, scene.seats[i2].y); }
      g.restore();
    }
  }
  /** Makes the stand-ins a set of rows will draw, so they reach their sheets in one go. */
  function standInsFor(rows: number[]) {
    for (const r of rows) for (const i of scene.rows[r]) { const g = bySeat[i]; if (g && atRest(g)) cellOf(g, i); }
    uploadAll();
  }
  /** A seat's guy changed how they look at rest (made, gone, moving or still again): the next frame redraws them there. */
  function restIn(seat: number) {
    // A row not yet put together will be made as they are now.
    if (seat >= 0 && seat < scene.seats.length && !(building && rowOf[seat] >= building.next)) restless.add(seat);
    wake();
  }
  /** Copies row `r`'s guys at rest from `from` to `to`, `dy` up or down. */
  function blitRow(target: CanvasRenderingContext2D, r: number, from: number, to: number, dy: number) {
    for (let i = Math.max(0, Math.floor(from / TILE)); i <= Math.min(tiles[r].length - 1, Math.floor((to - 1) / TILE)); i++) {
      const t = tiles[r][i];
      if (!t || !t.h) continue;
      const x0 = Math.max(from, t.x), x1 = Math.min(to, t.x + TILE);
      if (x1 > x0) target.drawImage(atlas!, t.ax + x0 - t.x, t.ay, x1 - x0, t.h, x0, t.top + dy, x1 - x0, t.h);
    }
  }
  /**
   * Puts the layout's rows together, all at once or (a big crowd's re-seat) a few milliseconds a frame, and the
   * baked picture with them: the scene, then each row as it is made, back to front. True when done.
   */
  function buildRows(until: number): boolean {
    const b = building!, n = scene.rows.length;
    if (!b.next) {
      stillCtx.setTransform(1, 0, 0, 1, 0, 0);
      stillCtx.clearRect(0, 0, still.width, still.height);
      if (scene.backdrop) stillCtx.drawImage(scene.backdrop, 0, 0);
    }
    while (b.next < n) {
      const r = b.next++;
      standInsFor([r]);
      retile(r, 0, scene.width);
      blitRow(stillCtx, r, 0, scene.width, 0);
      if (!b.all && performance.now() > until) return b.next >= n;
    }
    return true;
  }
  /** The baked picture: all of it after a new layout, else the patches whose guys changed. */
  function paintStill(): Rect[] {
    if (stale === 'all') {
      stillCtx.setTransform(1, 0, 0, 1, 0, 0);
      stillCtx.clearRect(0, 0, still.width, still.height);
      if (scene.backdrop) stillCtx.drawImage(scene.backdrop, 0, 0);
      scene.rows.forEach((_, r) => blitRow(stillCtx, r, 0, scene.width, 0));
      stale = [];
      stillPainted = true;
      whole = true;
      return [];
    }
    const out = stale;
    for (const r of out) patch(stillCtx, r, -1);
    stale = [];
    return out;
  }
  /** Seats whose guy changed: their rows' tiles, then the still, follow. Returns what changed in the still. */
  function settleRests(): Rect[] {
    if (!restless.size) return paintStill();
    const seats = [...restless].filter(seat => rowOf[seat] >= 0);
    restless.clear();
    // The stand-ins these patches draw, made first so they reach their sheets in one go.
    for (const seat of seats) {
      const r = rowOf[seat], s = scene.seats[seat], [a, b] = span(r, s.x - 1, s.x + s.size + 1), row = scene.rows[r];
      for (let p = a; p < b; p++) { const g = bySeat[row[p]]; if (g && atRest(g)) cellOf(g, row[p]); }
    }
    uploadAll();
    const rects: Rect[] = [];
    for (const seat of seats) { const s = scene.seats[seat]; retile(rowOf[seat], s.x - 1, s.x + s.size + 1); rects.push(rectOf(seat, 2)); }
    if (stale !== 'all') { stale.push(...merge(rects)); if (stale.length > 300) stale = 'all'; }
    return paintStill();
  }
  /** Repaints world rects: the scene under them, then every row touching them, back to front, moved as at `t` (-1: at rest). */
  function patch(target: CanvasRenderingContext2D, rect: Rect | Rect[], t: number, dimmed = t >= 0) {
    const rects = (typeof rect[0] === 'number' ? [rect] : rect) as Rect[];
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    target.save();
    target.beginPath();
    for (const [x, y, w, h] of rects) {
      const a = Math.floor(x), b = Math.floor(y), c = Math.ceil(x + w), d = Math.ceil(y + h);
      target.rect(a, b, c - a, d - b);
      x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d);
    }
    target.clip();
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(scene.width, x1); y1 = Math.min(scene.height, y1);
    if (x1 > x0 && y1 > y0) {
      if (scene.backdrop) target.drawImage(scene.backdrop, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0); else target.clearRect(x0, y0, x1 - x0, y1 - y0);
    }
    const reach = t >= 0 && waving ? biggest + 2 : 8;
    for (let r = 0; r < scene.rows.length; r++) {
      if (rowBottom[r] < y0 || rowTop[r] - reach > y1) continue;
      let from = Infinity, to = -Infinity;
      for (const [x, y, w, h] of rects) if (rowBottom[r] >= y && rowTop[r] - reach <= y + h) { from = Math.min(from, Math.floor(x)); to = Math.max(to, Math.ceil(x + w)); }
      if (from >= to) continue;
      if (t >= 0 && waving) waveRow(target, r, from, to); else blitRow(target, r, from, to, 0);
      if (t < 0) continue;
      const [a, b] = span(r, from, to), row = scene.rows[r];
      for (let p = a; p < b; p++) { const g = bySeat[row[p]]; if (g && moving.has(g) && lit?.guy !== g) drawLive(target, g, row[p], t); }
    }
    if (t >= 0 && waving) swathe(target);
    if (dimmed && lit?.overlay) dim(target, x0, y0, x1 - x0, y1 - y0);
    target.restore();
  }

  // ------------------------------------------------------------ the wave
  // The wave's crest, in world x; a band of seats either side of it stands: fast ahead, slowly behind.
  const band = () => scene.wave ?? scene.pitch * 9.5;
  const waveX = (t: number) => { const b = band(), span = scene.width + 2.5 * b; return ((t - waveStart) / WAVE_MS % 1) * span - 1.3 * b; };
  let crest = 0, waveCrest = NaN;
  /** How far up the wave has a seat at `x`. */
  function waveUp(x: number) {
    const d = (x - crest) / (band() / 9.5);
    return d > 0 ? Math.max(0, 1 - d / 1.5) : d > -8 ? Math.pow(1 + d / 8, 1.5) : 0;
  }
  // Far guys sit or stand (their whole height at 5 and under, most of it to 8), so the band shows as a swathe
  // at the back too, and a far row's band is three runs to copy; near ones rise a third of their height in three steps.
  const liftOf = (e: number, size: number) => {
    if (size <= 8) return e < 0.45 ? 0 : Math.round(size * (size <= 5 ? 1 : 0.6));
    const q = e <= 0.15 ? 0 : e < 0.45 ? 1 / 3 : e < 0.75 ? 2 / 3 : 1;
    return q && Math.max(1, Math.round(q * size * 0.4));
  };
  /**
   * Where the far rows stand, a lighter swathe over them: standing up a row's height alone looks the same in a
   * packed stand, so the wave shows as light running through it, brightest in its middle, from the back row's
   * heads to the front far row's feet there (only over guys and stand, never a see-through canvas).
   */
  function swathe(target: CanvasRenderingContext2D) {
    const far: number[] = [];
    rowBig.forEach((b, r) => { if (b <= 8 && rowXs[r].length) far.push(r); });
    if (!far.length) return;
    const u = band() / 9.5, at = (r: number) => { const [a] = span(r, crest, crest + 1), s = scene.seats[scene.rows[r][Math.min(a, scene.rows[r].length - 1)]]; return s; };
    const back = at(far[0]), front = at(far[far.length - 1]), top = back.y - back.size, bottom = front.y + front.size;
    if (bottom <= top) return;
    target.globalCompositeOperation = 'source-atop'; target.fillStyle = '#ffffff';
    target.globalAlpha = 0.1; target.fillRect(Math.floor(crest - 3.3 * u), top, Math.ceil(4.1 * u), bottom - top);
    target.globalAlpha = 0.08; target.fillRect(Math.floor(crest - 2.2 * u), top, Math.ceil(2.6 * u), bottom - top);
    target.globalCompositeOperation = 'source-over'; target.globalAlpha = 1;
  }
  /** The wave's band at crest `c`, from the top row's raised heads to the front row's feet (one plain rect is quicker to clip to than a rect a row). */
  function waveRect(c = crest): Rect {
    const u = band() / 9.5, top = Math.max(0, standTop - biggest - 4);
    return [c - 8 * u - biggest - 4, top, 9.5 * u + 2 * biggest + 8, Math.max(1, standBottom + 2 - top)];
  }
  /**
   * What the wave changed as its crest went from `from` to `to`: the near rows' whole band (they rise in steps and
   * put their arms up), and for the far rows, which only stand or sit under one swathe, just where its edges passed.
   */
  function waveMoved(from: number, to: number): Rect[] {
    const u = band() / 9.5;
    if (Number.isNaN(from)) return [waveRect(to)];
    if (!farBig || to < from || to - from > u) return [waveRect(from), waveRect(to)];
    const out: Rect[] = [], [x, , w] = waveRect(from);
    if (nearTop < Infinity) { const top = Math.max(0, nearTop - Math.ceil(biggest * 0.4) - 4); out.push([x, top, w + to - from, standBottom + 2 - top]); }
    // The far rows stand from 3.3 bands behind the crest to 0.83 ahead, and the swathe's lighter middle runs from 2.2 behind to 0.4 ahead.
    const top = Math.max(0, standTop - biggest - 4), h = farBottom + 2 - top, pad = farBig + 3;
    for (const [a, b] of [[-3.31, -2.2], [0.4, 0.83]]) out.push([from + a * u - pad, top, to - from + (b - a) * u + 2 * pad, h]);
    return out;
  }
  /** Row `r` from `from` to `to` in the wave: runs of seats lifted alike copied in one go, arms up and lighter at the crest. */
  const runs: number[] = [], up: number[] = [];
  function waveRow(target: CanvasRenderingContext2D, r: number, from: number, to: number) {
    const row = scene.rows[r], u = band() / 9.5;
    // Only seats near the crest stand; either side of them the row is copied as it is.
    const [a, b] = span(r, Math.max(from, crest - 8 * u - rowBig[r]), Math.min(to, crest + 1.5 * u + 1));
    let start = from, key = 0;
    runs.length = 0; up.length = 0;
    for (let p = a; p < b; p++) {
      // Near rows lighten at the crest too; far ones show it by standing.
      const s = scene.seats[row[p]], e = waveUp(s.x + s.size / 2), l = liftOf(e, s.size), k = l * 2 + (e >= 0.75 && s.size >= 10 ? 1 : 0);
      if (k !== key) { if (s.x > start) runs.push(start, s.x, key); start = Math.max(start, s.x); key = k; }
      if (e >= 0.75 && s.size >= 12) up.push(row[p]);
    }
    runs.push(start, to, key);
    for (let n = 0; n < runs.length; n += 3) blitRow(target, r, runs[n], runs[n + 1], -(runs[n + 2] >> 1));
    target.globalCompositeOperation = 'lighter'; target.globalAlpha = 0.28;
    for (let n = 0; n < runs.length; n += 3) if (runs[n + 2] & 1) blitRow(target, r, runs[n], runs[n + 1], -(runs[n + 2] >> 1));
    target.globalCompositeOperation = 'source-over'; target.globalAlpha = 1;
    for (const i of up) {
      const g = bySeat[i];
      if (!g || !atRest(g)) continue;
      const s = scene.seats[i], id = cellOf(g, i);
      arms(target, g, i, s.x, s.y - liftOf(waveUp(s.x + s.size / 2), s.size), s.size, id);
    }
  }
  /**
   * Arms up for the wave (the front rows' guys, 12 and up), out of their sides at the shoulder: in their
   * body colour just clear of their head, bending out a pixel halfway, to a hand just over it, in their ink.
   */
  function arms(target: CanvasRenderingContext2D, g: Guy, i: number, x: number, y: number, size: number, id: number) {
    const info = armOf(size, id), ext = extOf(size, id);
    if (!info || !ext) return;
    const bandI = scene.bands[i], left = x + (info & 15) - 1, right = x + (info >> 4 & 15) + 1, shoulder = y + (info >> 8 & 15), top = y + (ext >> 8 & 15);
    if (g.arm?.[0] !== bandI || g.arm[1] !== scene) g.arm = [bandI, scene, tinted(g.base.body, scene.tints[bandI]), tinted(g.base.ink, scene.tints[bandI])];
    const hand = top - (size >= 12 ? 1 : 0), bend = Math.round((shoulder + hand) / 2), wide = size >= 12, [, , body, ink] = g.arm;
    for (const [ax, out] of [[left, -1], [right, 1]]) {
      const up = ax + out;
      target.fillStyle = body;
      target.fillRect(ax, bend, 1, shoulder - bend + 1);
      target.fillRect(up, hand, 1, bend - hand + 1);
      target.fillStyle = ink;
      target.fillRect(up, hand - 1, 1, 1);
      if (wide) { target.fillRect(ax + out, bend + 1, 1, shoulder - bend); target.fillRect(up + out, hand, 1, bend - hand + 1); }
    }
  }
  /** How a moving guy is drawn at `t`: lifted by the wave or a hop, flashing, fading in, arms up. */
  function liveOf(g: Guy, s: Seat, t: number) {
    let dy = 0, bright = 0, up = false;
    if (waving) {
      const e = waveUp(s.x + s.size / 2);
      dy -= liftOf(e, s.size); bright = e >= 0.75 && s.size >= 10 ? 0.28 : 0; up = e >= 0.75;
    }
    const since = t - g.hopAt;
    if (since >= 0 && since < g.hopFor) {
      const lift = g.hopFor < HOP_MS ? 1 : Math.max(1, s.size / 4);
      dy -= Math.max(1, Math.round(Math.sin(since / g.hopFor * Math.PI) * lift));
      if (s.size <= 6 && since < 120) bright = Math.max(bright, 0.3);
    }
    let alpha = 1;
    if (g.arriving) {
      const a = Math.min(1, (t - g.joined) / ARRIVE_MS);
      alpha = a; dy -= Math.round((1 - a) * s.size * 0.6);
    }
    return { dy, bright, up, alpha, key: (dy + 64) * 4 + (bright ? 2 : 0) + (up ? 1 : 0) + (alpha < 1 ? Math.round(alpha * 64) * 1024 : 0) };
  }
  function drawLive(target: CanvasRenderingContext2D, g: Guy, i: number, t: number) {
    const s = scene.seats[i], id = cellOf(g, i), { dy, bright, up, alpha } = liveOf(g, s, t);
    if (alpha < 1) target.globalAlpha = alpha;
    if (up && s.size >= 12) arms(target, g, i, s.x, s.y + dy, s.size, id);
    blit(target, s.size, id, s.x, s.y + dy);
    if (bright) { target.globalCompositeOperation = 'lighter'; target.globalAlpha = bright; blit(target, s.size, id, s.x, s.y + dy); target.globalCompositeOperation = 'source-over'; }
    target.globalAlpha = 1;
  }

  // ------------------------------------------------------------ glints
  // A rare guy glints over their head now and then; far back, a dot in their grade's colour blinks above them.
  // Each blinks on its own beat, so they're kept by when in the beat they start, and a frame looks only at those due.
  const SLOTS = 40;
  let glintsDue = true, beats: { period: number; dur: number; slots: Guy[][] }[] = [], glintStep = -1, glintNow: [Guy, Rect][] = [];
  function sortGlints() {
    glintsDue = false;
    const far = { period: 4000, dur: 260, slots: Array.from({ length: SLOTS }, () => [] as Guy[]) }, near = { period: 5400, dur: 180, slots: Array.from({ length: SLOTS }, () => [] as Guy[]) };
    for (const g of rare) {
      if (g.seat < 0 || g.seat >= scene.seats.length || !g.shine) continue;
      const small = scene.seats[g.seat].size <= 5;
      if (!small && !g.glint) continue;
      const b = small ? far : near, at = startOf(g, small);
      b.slots[Math.floor(at / b.period * SLOTS) % SLOTS].push(g);
    }
    beats = [far, near];
  }
  const startOf = (g: Guy, small: boolean) => (small ? (4000 - g.hash % 4000) % 4000 : 90 * ((60 - (g.hash % 97) % 60) % 60));
  /** The glints showing at `t`, as [guy, rect]. */
  function glintsAt(t: number): [Guy, Rect][] {
    if (glintsDue) sortGlints();
    const out: [Guy, Rect][] = [];
    for (const b of beats) {
      const now = t % b.period, first = Math.floor((now - b.dur) / b.period * SLOTS), last = Math.floor(now / b.period * SLOTS);
      for (let k = first; k <= last; k++) for (const g of b.slots[((k % SLOTS) + SLOTS) % SLOTS]) {
        if (g.seat < 0 || g.seat >= scene.seats.length || lit?.guy === g || moving.has(g) || bySeat[g.seat] !== g) continue;
        const small = b.period === 4000, since = ((now - startOf(g, small)) % b.period + b.period) % b.period;
        if (since >= b.dur) continue;
        const s = scene.seats[g.seat];
        out.push([g, small ? [s.x + (s.size >> 1), s.y - 2, 1, 1] : [s.x + s.size - 1, s.y - 1, 1, 1]]);
      }
    }
    return out;
  }

  // ------------------------------------------------------------ frames
  function draw(t: number) {
    frame = 0;
    if (gone) return;
    const dt = lastFrame ? Math.min(100, t - lastFrame) : 16;
    lastFrame = t;
    const before = scene;
    options.beforeFrame?.();
    if (wanted) { const how = wanted; wanted = null; relayout(how); }
    // A big crowd's new layout is put together over the next frames while the old picture holds: its backdrop, then its rows.
    if (scene !== before && building && !building.all) { wake(); return; }
    // A few milliseconds of sprites a frame, best seats first; none while a new layout is put together, which would
    // only have to draw them again.
    const budget = building && !building.all ? 0 : performance.now() + (moving.size || waving || lit ? 4 : 7);
    while (made < queue.length && performance.now() < budget) make(queue[made++]);
    if (made >= queue.length) { queue = []; made = 0; } else if (made > 4096) { queue = queue.slice(made); made = 0; }
    // Guys sliding to new seats are drawn one by one, so the rows are put together once they land.
    if (slide && t >= slide.until) { slide = null; for (const g of guys.values()) delete g.from; tidy(); building = { next: 0, all: true }; }
    if (building) {
      if (scene.later) { ensureBackdrop(); if (!building.all && !slide) { wake(); return; } }
      // A big crowd's new layout is put together a few milliseconds a frame while the old picture holds.
      if (!slide && !buildRows(performance.now() + 6)) { wake(); return; }
      building = null;
      // Built, the picture is whole; while guys slide, it is the scene alone, made at the next settle.
      if (slide) stale = 'all';
      else { stale = []; stillPainted = true; whole = true; }
      if (fade && fade.until === Infinity) fade.until = t + fade.ms;
    }
    if (fade && t >= fade.until) { fade = null; tidy(); whole = true; }
    if (options.idle) idleHops(dt, t);
    // The wave steps thirty times a second: the frames between leave its band as drawn.
    crest = waveX(Math.floor(t / 33.3) * 33.3);
    // Moving guys whose drawing changed this frame, and those it didn't (a far hop holds its pixel for most of its time).
    const live: Rect[] = [], held: Rect[] = [];
    for (const g of moving) {
      const done = t - g.hopAt >= g.hopFor && !(g.arriving && t - g.joined < ARRIVE_MS);
      if (done) { moving.delete(g); g.arriving = false; restIn(g.seat); continue; }
      if (slide || g.seat < 0 || g.seat >= scene.seats.length) continue;
      const key = liveOf(g, scene.seats[g.seat], t).key, r = rectOf(g.seat, Math.ceil(scene.seats[g.seat].size * 0.7));
      if (key !== g.shown) { g.shown = key; live.push(r); } else held.push(r);
    }
    const changed = settleRests();
    // Rare guys glint while the stands move; a stand at rest stops drawing. A glint is a pixel drawn over the frame,
    // so only one that has gone out needs putting back. They change thirty times a second, with the wave.
    const step = Math.floor(t / 33.3);
    if (step !== glintStep) { glintStep = step; glintNow = slide || !busy() ? [] : glintsAt(step * 33.3); }
    const glints = glintNow, glowing = new Set(glints.map(([, r]) => `${r[0]},${r[1]}`));
    const dark = shown.filter(r => !glowing.has(`${r[0]},${r[1]}`));
    const sweep = waving && !slide ? waveRect() : null, swept = sweep && crest !== waveCrest ? waveMoved(waveCrest, crest) : [];
    waveCrest = sweep ? crest : NaN;
    const spotNow = lit ? spotFrame(t) : null;
    const { k, ox, oy } = scene;
    ctx.imageSmoothingEnabled = false;
    // Whether anything was painted over: glints already showing are drawn again only then; and the spotlit guy.
    let painted = true, spotPaint = true;
    if (whole || fade || slide || spotNow?.whole) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (!scene.backdrop) ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(k, 0, 0, k, ox, oy);
      ctx.drawImage(still, 0, 0);
      if (fade) {
        ctx.setTransform(fade.k, 0, 0, fade.k, fade.ox, fade.oy);
        ctx.globalAlpha = Math.max(0, Math.min(1, (fade.until - t) / fade.ms));
        ctx.drawImage(fade.canvas, 0, 0);
        ctx.globalAlpha = 1;
        ctx.setTransform(k, 0, 0, k, ox, oy);
      }
      if (slide) drawSlide(t);
      else {
        // The still has no one who moves: all of them, and the wave.
        for (const r of merge([...live, ...held, ...(sweep ? [sweep] : [])])) patch(ctx, r, t, false);
        if (lit?.overlay) dim(ctx, 0, 0, scene.width, scene.height);
      }
      whole = false;
    } else {
      // Only what moved, what stopped and what changed in the picture; the canvas keeps the rest.
      const dirty = merge([...dark, ...live, ...changed]);
      spotPaint = !!spotNow && (!lit!.drawn || spotNow.moved || [...dirty, ...swept].some(r => meets(r, lit!.drawn!)));
      if (spotPaint && lit!.drawn) dirty.push(lit!.drawn);
      ctx.setTransform(k, 0, 0, k, ox, oy);
      painted = dirty.length + swept.length > 0;
      for (const r of merge(dirty)) patch(ctx, r, t);
      // The wave's strips in one clip, never merged into one box, which would take in all that didn't change between them.
      if (swept.length) patch(ctx, swept, t);
    }
    const was = new Set(shown.map(r => `${r[0]},${r[1]}`));
    for (const [g, [x, y, w, h]] of glints) {
      if ((!painted && was.has(`${x},${y}`)) || (lit?.drawn && meets([x, y, w, h], lit.drawn))) continue;
      ctx.fillStyle = scene.seats[g.seat].size <= 5 ? g.shine! : '#ffffff'; ctx.fillRect(x, y, w, h);
    }
    shown = glints.map(([, r]) => r);
    if (lit) spot(t, spotNow!, spotPaint);
    // One frame is asked for at most (what ran this frame may have asked already).
    if (busy() || whole || shown.length) wake();
  }
  const busy = () => !!(waving || lit || fade || slide || building || wanted || restless.size || made < queue.length || moving.size || options.idle);
  function drawSlide(t: number) {
    const e = 1 - Math.pow(1 - Math.min(1, 1 - (slide!.until - t) / SLIDE_MS), 3), { k, ox, oy } = scene;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const row of scene.rows) for (const i of row) {
      const g = bySeat[i];
      if (!g || lit?.guy === g) continue;
      const s = scene.seats[i], tx = ox + s.x * k, ty = oy + s.y * k, side = s.size * k, f = g.from ?? { x: tx, y: ty + side, side: 0 };
      const x = Math.round(f.x + (tx - f.x) * e), y = Math.round(f.y + f.side - (f.y + f.side - ty - side) * e - side);
      if (!g.from) ctx.globalAlpha = e;
      blit(ctx, s.size, cellOf(g, i), x, y, side);
      ctx.globalAlpha = 1;
    }
    ctx.setTransform(k, 0, 0, k, ox, oy);
  }
  /** Rects that touch become one, so neighbours hopping together are drawn once. */
  function merge(rects: Rect[]): Rect[] {
    const out: Rect[] = [];
    for (const r of rects) {
      let [x, y, w, h] = r;
      for (let i = 0; i < out.length; i++) {
        const [a, b, c, d] = out[i];
        if (x <= a + c && a <= x + w && y <= b + d && b <= y + h) {
          const nx = Math.min(x, a), ny = Math.min(y, b);
          w = Math.max(x + w, a + c) - nx; h = Math.max(y + h, b + d) - ny; x = nx; y = ny;
          out.splice(i, 1); i = -1;
        }
      }
      out.push([x, y, w, h]);
    }
    return out;
  }
  function idleHops(dt: number, t: number) {
    const n = scene.seats.length;
    if (!n) return;
    let picks = Math.min(30, Math.round(guys.size * dt / 3000 + Math.random() * 0.5));
    for (let tries = 0; picks > 0 && tries < 60; tries++) {
      const i = Math.floor(Math.random() * n), g = bySeat[i];
      if (!g || scene.seats[i].size < 6 || moving.has(g)) continue;
      hopGuy(g, t, 160); picks--;
    }
  }

  // ------------------------------------------------------------ the spotlight
  // A spotlit guy rises out of their seat to the front, big, at a whole scale, with a line under them; the
  // stand dims round a beam from the nearest light that follows them there. Someone without a seat rises
  // from the bottom edge, into a pool of light.
  let spotSprite: HTMLCanvasElement | null = null, spotFor: Guy | null = null;
  /** Where the spotlit guy is at `t`, in device pixels, and whether the canvas must be drawn whole for it. */
  function spotFrame(now: number) {
    // They move thirty times a second, like the wave, so the frames between leave them as drawn.
    const t = Math.floor(now / 33.3) * 33.3;
    const { guy, from, until } = lit!, seated = guy.seat >= 0 && guy.seat < scene.seats.length;
    const s = seated ? scene.seats[guy.seat] : null, { k, ox, oy } = scene;
    const rise = Math.max(0, Math.min(1, (t - from) / 450, (until - t) / 350));
    const lineH = lit!.label ? Math.round(30 * dpr) : 0, pad = Math.round(8 * dpr);
    const seatSide = s ? s.size * k : 16;
    const F = Math.max(1, Math.min(Math.floor(Math.min(devH * 0.6, devH - lineH - pad * 2) / 16), Math.max(Math.floor(Math.min(devH * 0.36, devW * 0.3) / 16), Math.ceil(seatSide * 2 / 16))));
    const ex = devW / 2, eb = devH - pad - lineH;
    const sx = s ? ox + (s.x + s.size / 2) * k : ex, sb = s ? oy + (s.y + s.size) * k : devH + 16 * F;
    const lift = s ? Math.max(0, Math.min(1, (t - from - 250) / 450)) : 1, e2 = 1 - Math.pow(1 - Math.min(lift, rise), 3);
    const startSide = s ? seatSide : 16 * F, side = startSide + (16 * F - startSide) * e2, cx = sx + (ex - sx) * e2, bottom = sb + (eb - sb) * e2;
    // The light is on their seat, then swings to where they land once they're halfway up (and back as they go).
    const [tx, tb, ts] = !s || e2 >= 0.5 ? [ex, eb, 16 * F] : [sx, sb, seatSide];
    const aim = `${Math.round((tx - ox) / k)},${Math.round((tb - oy) / k)},${Math.round(ts / k)}`, swung = aim !== lit!.aim;
    if (swung || !lit!.overlay) { lit!.overlay = overlayFor((tx - ox) / k, (tb - oy) / k, ts / k); lit!.aim = aim; }
    const pose = `${Math.round(cx)},${Math.round(bottom)},${Math.round(side)},${Math.round(rise * 32)}`, moved = pose !== lit!.pose;
    lit!.pose = pose;
    // The stand dims in four steps and comes back in four; at each step, and as the light swings, it is drawn whole,
    // otherwise only where they moved or something else did.
    const level = Math.round(4 * Math.max(0, Math.min(1, (now - from) / 250, (until - now) / 250))) / 4, stepped = level !== lit!.level;
    lit!.level = level;
    return { cx, bottom, side, F, lineH, pad, rise, e2, seatSide, whole: stepped || swung, moved };
  }
  /** Dims a world rect for the spotlight: its overlay, at the step it has faded to. */
  function dim(target: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    const { level, overlay: o } = lit!;
    if (!o || w <= 0 || h <= 0 || !level) return;
    target.globalCompositeOperation = 'source-atop';
    target.globalAlpha = 0.62 * level;
    target.fillStyle = scene.shadow;
    // Plain shadow outside the light's box (up to four strips round it), the beam's own picture inside.
    const ix0 = Math.max(x, o.x), iy0 = Math.max(y, o.y), ix1 = Math.min(x + w, o.x + o.canvas.width), iy1 = Math.min(y + h, o.y + o.canvas.height);
    if (ix1 <= ix0 || iy1 <= iy0) target.fillRect(x, y, w, h);
    else {
      if (iy0 > y) target.fillRect(x, y, w, iy0 - y);
      if (y + h > iy1) target.fillRect(x, iy1, w, y + h - iy1);
      if (ix0 > x) target.fillRect(x, iy0, ix0 - x, iy1 - iy0);
      if (x + w > ix1) target.fillRect(ix1, iy0, x + w - ix1, iy1 - iy0);
      target.drawImage(o.canvas, ix0 - o.x, iy0 - o.y, ix1 - ix0, iy1 - iy0, ix0, iy0, ix1 - ix0, iy1 - iy0);
    }
    target.globalAlpha = 1;
    target.globalCompositeOperation = 'source-over';
  }
  /**
   * The spotlight's dimming round its light, at world pixels: a box holding a beam from the light
   * nearest `cx` down onto a pool round a guy `side` wide standing at `bottom`, dithered at its edge,
   * in the shadow colour everywhere else (as everything outside the box is).
   */
  function overlayFor(cx: number, bottom: number, side: number): { canvas: HTMLCanvasElement; x: number; y: number } {
    const W = scene.width, H = scene.height, c = lit?.overlay?.canvas ?? document.createElement('canvas');
    const lights = scene.lights ?? [], light = lights.length ? lights.reduce((best, l) => (Math.abs(l.x - cx) < Math.abs(best.x - cx) ? l : best)) : null;
    const wTop = Math.max(2, side * 0.3), wBottom = side * 0.85, poolW = side * 1.25, poolH = side * 0.55, poolY = bottom - side * 0.1;
    const top = Math.max(0, Math.floor(light ? Math.min(light.y, bottom - side * 1.6) : bottom - side * 1.6)), end = Math.min(H, Math.ceil(poolY + poolH + 2));
    const left = Math.max(0, Math.floor(Math.min(light?.x ?? cx, cx - poolW) - wTop - 3)), right = Math.min(W, Math.ceil(Math.max(light?.x ?? cx, cx + poolW) + wTop + 3));
    if (end <= top || right <= left) { c.width = c.height = 0; return { canvas: c, x: 0, y: 0 }; }
    const bw = right - left, bh = end - top;
    if (c.width !== bw || c.height !== bh) { c.width = bw; c.height = bh; }
    const g = c.getContext('2d')!, img = g.createImageData(bw, bh), px = new Uint32Array(img.data.buffer);
    const [r, gg, b] = rgbOf(scene.shadow), dimC = (255 << 24 | b << 16 | gg << 8 | r) >>> 0;
    px.fill(dimC);
    for (let y = top; y < end; y++) {
      // The beam runs from the light's bottom to the guy's middle; with no light, the pool alone, with a glow over it.
      const u = light ? Math.max(0, Math.min(1, (y - light.y) / Math.max(1, bottom - side * 0.5 - light.y))) : 0;
      const mid = light ? light.x + (cx - light.x) * u : cx, half = light && y >= light.y && y <= bottom ? wTop + (wBottom - wTop) * u : -1;
      // Only where the row meets the beam, the pool or the glow is worked out pixel by pixel; the rest stays in shadow.
      const reach = (h: number) => { const v = 1 - ((y - poolY) / h) ** 2; return v > 0 ? poolW * Math.sqrt(v) : -1; };
      const pw = Math.max(reach(poolH), light ? -1 : reach(side * 1.4));
      let lo = Infinity, hi = -Infinity;
      if (half >= 0) { lo = mid - half; hi = mid + half; }
      if (pw >= 0) { lo = Math.min(lo, cx - pw); hi = Math.max(hi, cx + pw); }
      if (hi < lo) continue;
      // What is lit through (the beam's middle, the pool's) is cleared in one go; only the dithered edges go pixel by pixel.
      const row = (y - top) * bw - left, a0 = half >= 0 ? Math.ceil(mid - half + 2) : 0, a1 = half >= 0 ? Math.floor(mid + half - 2) : -1;
      const vp = 0.5 - ((y - poolY) / poolH) ** 2, inPool = vp > 0 ? poolW * Math.sqrt(vp) : -1;
      const b0 = inPool >= 0 ? Math.ceil(cx - inPool) : 0, b1 = inPool >= 0 ? Math.floor(cx + inPool) : -1;
      for (const [p0, p1] of [[a0, a1], [b0, b1]]) if (p1 >= p0) px.fill(0, row + Math.max(left, p0), row + Math.min(right - 1, p1) + 1);
      for (let x = Math.max(left, Math.floor(lo)); x < Math.min(right, Math.ceil(hi) + 1); x++) {
        if ((x >= a0 && x <= a1) || (x >= b0 && x <= b1)) continue;
        const beam = half < 0 ? 9 : Math.abs(x - mid) - half;
        const pool = ((x - cx) / poolW) ** 2 + ((y - poolY) / poolH) ** 2 - 1, glow = light ? 9 : ((x - cx) / poolW) ** 2 + ((y - poolY) / (side * 1.4)) ** 2 - 1;
        const edge = Math.min(beam / 2, pool * 2, glow * 3);
        px[(y - top) * bw + x - left] = edge <= -1 ? 0 : edge >= 0 ? dimC : (-edge * 16 > BAYER[(y & 3) * 4 + (x & 3)] ? 0 : dimC);
      }
    }
    g.putImageData(img, 0, 0);
    return { canvas: c, x: left, y: top };
  }
  /** The spotlight's turn of a frame: it ends, the neighbours hop, and (when `paint`) the guy and their line are drawn. */
  function spot(t: number, f: ReturnType<typeof spotFrame>, paint: boolean) {
    const { guy, label, from, until } = lit!;
    if (t >= until || guys.get(guy.key) !== guy) { lit = null; restIn(guy.seat); whole = true; return; }
    const seated = guy.seat >= 0 && guy.seat < scene.seats.length, { k, ox, oy } = scene;
    // The light lands on the seat first, the neighbours jump, then the guy rises out of it to the front.
    if (!lit!.landed && t - from > 300) {
      lit!.landed = true;
      if (seated) {
        const r = rowOf[guy.seat], p = placeOf[guy.seat], row = scene.rows[r] ?? [];
        [-1, 1, -2, 2, -3, 3].forEach((d, n) => { const g = bySeat[row[p + d]]; if (g) hopGuy(g, t + 40 * n, HOP_MS, true); });
      }
    }
    if (!paint) return;
    if (spotFor !== guy) {
      guy.look ??= crowdLook(guy.spec);
      spotSprite ??= document.createElement('canvas');
      spotSprite.width = spotSprite.height = 16;
      spotSprite.getContext('2d')!.putImageData(new ImageData(crowdSpriteOf(guy.look, 16).rgba as Uint8ClampedArray<ArrayBuffer>, 16, 16), 0, 0);
      spotFor = guy;
    }
    // Device pixels from here: the guy at a whole scale, about a third of the canvas tall, over a line that stays on the canvas.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const { cx, bottom, side, rise } = f, ease = 1 - Math.pow(1 - rise, 3);
    let gx: number, gy: number, gs: number;
    if (seated && (side < 16 || f.e2 <= 0)) {
      const s = scene.seats[guy.seat];
      gs = s.size * k; gx = Math.round(cx - gs / 2); gy = Math.round(bottom - gs);
      blit(ctx, s.size, cellOf(guy, guy.seat), gx, gy, gs);
    } else {
      const sc = Math.max(1, Math.round(side / 16));
      gs = 16 * sc; gx = Math.round(cx - 8 * sc); gy = Math.round(bottom - 16 * sc);
      ctx.drawImage(spotSprite!, 0, 0, 16, 16, gx, gy, gs, gs);
    }
    let lx0 = gx, lx1 = gx + gs, ly1 = gy + gs;
    if (label && ease > 0.05) {
      const [x, y, w, h] = drawLabel(label, cx, Math.min(devH - f.lineH / 2 - 2 * dpr, bottom + f.lineH / 2 + 2 * dpr), ease);
      lx0 = Math.min(lx0, x); lx1 = Math.max(lx1, x + w); ly1 = Math.max(ly1, y + h);
    }
    // What was drawn, as a world rect, for the next frame to put back where it changes.
    const wx = Math.floor((lx0 - ox) / k) - 1, wy = Math.floor((gy - oy) / k) - 1;
    lit!.drawn = [wx, wy, Math.ceil((lx1 - ox) / k) + 1 - wx, Math.ceil((ly1 - oy) / k) + 1 - wy];
    ctx.setTransform(k, 0, 0, k, ox, oy);
  }
  /** The spotlit guy's line, in a pill that fits the canvas: smaller type first, then a shorter name, the score kept. Returns its box in device pixels. */
  function drawLabel(text: string, dcx: number, dcy: number, alpha: number): Rect {
    // In CSS pixels, so a game's `font` reads as it would on the page.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = devW / dpr, cy = dcy / dpr, maxW = W - 16;
    let px = 15, line = text;
    const font = (size: number) => options.font ?? `700 ${size}px system-ui, sans-serif`;
    ctx.font = font(px);
    while (!options.font && px > 11 && ctx.measureText(line).width + 20 > maxW) ctx.font = font(--px);
    const cut = line.lastIndexOf(' · '), tail = cut > 0 ? line.slice(cut) : '';
    let head = cut > 0 ? line.slice(0, cut) : line;
    while (head.length > 1 && ctx.measureText(line).width + 20 > maxW) { head = head.slice(0, -1); line = head.trimEnd() + '…' + tail; }
    const tw = Math.min(maxW, Math.ceil(ctx.measureText(line).width) + 20);
    const x = Math.max(8 + tw / 2, Math.min(W - 8 - tw / 2, dcx / dpr));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = scene.shadow;
    ctx.beginPath(); ctx.roundRect(x - tw / 2, cy - 13, tw, 26, 13); ctx.fill();
    ctx.fillStyle = lightness(scene.shadow) > 0.5 ? '#141414' : '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(line, x, cy + 1);
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return [(x - tw / 2) * dpr - 2, (cy - 13) * dpr - 2, tw * dpr + 4, 26 * dpr + 4];
  }

  // ------------------------------------------------------------ size
  // A canvas the page doesn't size takes its CSS size from its own pixels, so setting them would grow it on
  // every tick: when the CSS size jumps to exactly what was just set, the canvas keeps the size it had.
  let cssBefore: [number, number] = [0, 0], justSet = false;
  function measure(entry?: ResizeObserverEntry) {
    dpr = globalThis.devicePixelRatio || 1;
    let cssW = entry?.contentRect.width || canvas.clientWidth || 300, cssH = entry?.contentRect.height || canvas.clientHeight || 150;
    if (justSet && dpr !== 1 && cssBefore[0] && Math.abs(cssW - canvas.width) < 1 && Math.abs(cssH - canvas.height) < 1 && (Math.abs(cssW - cssBefore[0]) >= 1 || Math.abs(cssH - cssBefore[1]) >= 1)) {
      [cssW, cssH] = cssBefore;
      if (canvas.style) { canvas.style.width = `${cssW}px`; canvas.style.height = `${cssH}px`; }
      entry = undefined;
    }
    justSet = false;
    // The exact device pixels when the browser reports them (and they agree with the CSS size), else the CSS size times the pixel ratio.
    const box = (entry as { devicePixelContentBoxSize?: readonly { inlineSize: number; blockSize: number }[] } | undefined)?.devicePixelContentBoxSize?.[0];
    const exact = box && Math.abs(box.inlineSize - cssW * dpr) <= 2 && Math.abs(box.blockSize - cssH * dpr) <= 2;
    const w = Math.max(1, exact ? box.inlineSize : Math.round(cssW * dpr)), h = Math.max(1, exact ? box.blockSize : Math.round(cssH * dpr));
    const changed = w !== devW || h !== devH;
    devW = w; devH = h;
    if (canvas.width !== devW) { canvas.width = devW; justSet = true; }
    if (canvas.height !== devH) { canvas.height = devH; justSet = true; }
    cssBefore = [cssW, cssH];
    if (changed) whole = true;
    return changed;
  }
  let watch: ResizeObserver | null = null, media: MediaQueryList | null = null;
  const onMedia = () => { listenDpr(); measure(); request('cut'); };
  function listenDpr() {
    media?.removeEventListener?.('change', onMedia);
    media = typeof matchMedia === 'function' ? matchMedia(`(resolution: ${globalThis.devicePixelRatio || 1}dppx)`) : null;
    media?.addEventListener?.('change', onMedia);
  }

  function wake() { if (!frame && !gone) frame = requestAnimationFrame(draw); }
  function hopGuy(g: Guy, at: number, ms = HOP_MS, force = false) {
    if (moving.has(g) && at - g.hopAt < g.hopFor) return;
    if (!force && !moving.has(g) && moving.size >= HOP_CAP && guys.size > 2000) return;
    g.hopAt = at; g.hopFor = ms;
    if (!moving.has(g)) { moving.add(g); restIn(g.seat); }
  }

  measure();
  scene = options.build(devW, devH, dpr);
  ensureBackdrop();
  tintKey = JSON.stringify(scene.tints);
  index();
  still.width = scene.width; still.height = scene.height;
  layTiles();
  building = { next: 0, all: true };
  // Watching the canvas starts once the first layout stands, so a canvas too small for one leaves nothing behind.
  if (typeof ResizeObserver === 'function') {
    watch = new ResizeObserver(entries => { if (measure(entries[entries.length - 1])) request('cut'); });
    try { watch.observe(canvas, { box: 'device-pixel-content-box' }); } catch { watch.observe(canvas); }
  }
  listenDpr();
  wake();

  return {
    guys,
    get scene() { return scene; },
    get dpr() { return dpr; },
    get size() { return [devW, devH] as const; },
    relayout,
    request,
    /** Seats a new guy (their seat already set), animated in when `arrive`. */
    join(key: string, spec: GuySpec, seat: number, arrive = true): Guy {
      const b = crowdBase(spec), now = performance.now();
      const g: Guy = { key, spec, seat, joined: now, hopAt: -1e9, hopFor: HOP_MS, look: null, base: { body: b.body, eye: b.eye, ink: b.ink }, shine: b.shine?.color ?? null, glint: (b.shine?.grade ?? 0) >= 3, cells: new Map(), arriving: false, hash: hash(key) };
      guys.set(key, g);
      if (b.shine) { rare.add(g); glintsDue = true; }
      if (seat >= 0 && seat < scene.seats.length) {
        bySeat[seat] = g;
        // Arrivals drop in where there's room to watch them; in a big crowd they just appear.
        if (arrive && scene.seats[seat].size >= 6 && moving.size < 160) { g.arriving = true; moving.add(g); }
        restIn(seat);
        want(g);
      }
      wake();
      return g;
    },
    leave(g: Guy) {
      guys.delete(g.key); moving.delete(g); queued.delete(g);
      if (rare.delete(g)) glintsDue = true;
      if (lit?.guy === g) { lit = null; whole = true; }
      if (g.seat >= 0 && bySeat[g.seat] === g) { bySeat[g.seat] = undefined; restIn(g.seat); }
      forget(g);
      wake();
    },
    /** Moves a seated guy (or a waiting one) to `seat`. */
    move(g: Guy, seat: number) {
      if (g.seat >= 0 && bySeat[g.seat] === g) { bySeat[g.seat] = undefined; restIn(g.seat); }
      g.seat = seat;
      if (rare.has(g)) glintsDue = true;
      if (seat >= 0 && seat < scene.seats.length) { bySeat[seat] = g; restIn(seat); want(g); }
      wake();
    },
    hop(g: Guy) {
      const now = performance.now();
      hopGuy(g, now, g.seat >= 0 && g.seat < scene.seats.length && scene.seats[g.seat].size <= 5 ? 300 : HOP_MS);
      // Far back a hop is a pixel; a couple of neighbours catch it, so chat reads as clusters moving.
      if (moving.has(g) && g.seat >= 0 && g.seat < scene.seats.length && scene.seats[g.seat].size <= 6) {
        const row = scene.rows[rowOf[g.seat]] ?? [], p = placeOf[g.seat];
        [[1, 80], [-1, 110]].forEach(([d, ms]) => { const n = bySeat[row[p + d]]; if (n) hopGuy(n, now + ms, 300); });
      }
      wake();
    },
    wave(on: boolean) { if (on && !waving) waveStart = performance.now(); if (!on && waving) whole = true; waving = on; wake(); },
    spotlight(g: Guy, label: string, ms: number) {
      const now = performance.now();
      const was = lit?.guy;
      lit = { guy: g, label, from: now, until: now + ms, overlay: lit?.overlay ?? null, aim: '', level: -1, landed: false, drawn: null };
      if (was) restIn(was.seat);
      restIn(g.seat);
      whole = true;
      wake();
    },
    /** Measures the canvas again and lays the scene out for it at the next frame. */
    resize() { measure(); request('cut'); },
    wake,
    destroy() {
      gone = true;
      if (frame) cancelAnimationFrame(frame);
      watch?.disconnect(); media?.removeEventListener?.('change', onMedia);
      sheets.clear(); stand.clear(); guys.clear(); moving.clear(); rare.clear();
    },
  };
}

export type Render = ReturnType<typeof createRender>;
