/**
 * A crowd on a canvas: thousands of guys in rows going back, each drawn at the
 * crowd size his row calls for (./crowd), the far rows sunk into a haze. A game
 * adds chatters as they turn up, hops one when they guess, runs a wave, and
 * pulls a winner out to the front. One canvas and one copy per guy a frame;
 * sprites are made a few milliseconds a frame as guys arrive.
 */
import { crowdSprite, type CrowdSize } from './crowd';
import { hash } from './hash';
import type { GuySpec } from './guy-code';

/** A seat in the crowd: where a guy stands (his cell's top-left), at what size, in which row (0 is the back). */
export interface CrowdSeat { x: number; y: number; size: CrowdSize; row: number }

/** How much haze lies over everything further back than each size, once that size is drawn. */
const HAZE: Record<CrowdSize, number> = { 2: 0.38, 4: 0.3, 6: 0.2, 8: 0.12, 10: 0.06, 16: 0 };

/**
 * The seats of a crowd filling `width` × `height` world pixels: rows from the back (top) to the
 * front (bottom), each row's size growing with nearness, jittered a cell so far rows never line up.
 * In the order a crowd fills them: the front row first, from the middle out, then the row behind.
 * `density` above 1 packs more in (smaller guys sooner); the same arguments give the same seats.
 */
export function crowdSeats(width: number, height: number, density = 1, seed = 'crowd'): CrowdSeat[] {
  const rows: { y: number; size: CrowdSize }[] = [];
  for (let y = 6; y < height + 4;) {
    const d = Math.min(1, y / height), want = 2 + 15 * Math.pow(d, 2.1) / Math.sqrt(density);
    const size: CrowdSize = want < 3 ? 2 : want < 5 ? 4 : want < 7 ? 6 : want < 9 ? 8 : want < 12.5 ? 10 : 16;
    rows.push({ y, size });
    y += Math.max(2, Math.round(size * (size <= 2 ? 1 : size <= 4 ? 0.75 : 0.6)));
  }
  const seats: CrowdSeat[] = [];
  rows.forEach(({ y, size }, row) => {
    const step = size <= 2 ? 3 : size <= 4 ? size : Math.round(size * 0.92);
    const r = (k: number) => hash(`${seed}:${row}:${k}`) % 1000 / 1000;
    let x = -size + Math.floor(r(-1) * step) - ((row % 2) * step >> 1), k = 0;
    while (x < width + size) {
      seats.push({ x, y: y + (size <= 6 ? Math.floor(r(k * 2) * 2) : 0), size, row });
      x += step + Math.floor(r(k * 2 + 1) * 2);
      k++;
    }
  });
  const mid = width / 2;
  return seats.sort((a, b) => b.row - a.row || Math.abs(a.x + a.size / 2 - mid) - Math.abs(b.x + b.size / 2 - mid));
}

/** What a game passes for each guy: his name, and his club look when he has one (`seed`, `parts`, `palette`, `equip`). */
export type CrowdGuy = Partial<GuySpec>;

export interface CrowdOptions {
  /** The colour behind the crowd: the haze over far rows is drawn in it. Default the club's navy. */
  backdrop?: string;
  /** Screen pixels to a world pixel. Default 3 from 900 CSS pixels wide, else 2. */
  scale?: number;
  /** Above 1 packs the crowd tighter, below 1 looser. */
  density?: number;
  /** A slow stadium wave across the crowd. */
  wave?: boolean;
  /** Guys at 6 pixels and up hop a pixel now and then on their own. */
  idle?: boolean;
  /** The pixel font for a spotlit guy's name, as a CSS font. */
  font?: string;
}

export interface Crowd {
  /** Seats a guy (by the lowercased name, so a name seats once) in the next seat from the front. */
  add(name: string, guy?: CrowdGuy): void;
  /** Whether a name is in the crowd. */
  has(name: string): boolean;
  /** Makes a guy hop, as when he guesses. */
  hop(name: string): void;
  /** Turns the wave on or off. */
  wave(on: boolean): void;
  /** Lifts a guy out to the front, big, with a line under him (his name by default), for `ms`. */
  spotlight(name: string, label?: string, ms?: number): void;
  /** Lays the seats out again for the canvas's size now (keeping who sits where in order). */
  resize(): void;
  /** Stops drawing and lets go of the sprites. */
  destroy(): void;
  /** How many guys have been added; past the seats there are, the rest aren't drawn. */
  readonly count: number;
  /** How many seats the crowd has at its size. */
  readonly seats: number;
}

interface Member { key: string; spec: GuySpec; seat: number; hopAt: number; phase: number; cells: Map<CrowdSize, number> }

/** A sheet canvas of one size's sprites, a cell per guy as he first needs it. */
interface Sheet { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; next: number }
const SHEET_COLUMNS = 64, SHEET_ROWS = 64;

/**
 * A crowd on `canvas`. The canvas keeps its CSS size; its pixels are world pixels, scaled up by CSS
 * (`image-rendering: pixelated` is set on it). Draws only while something moves.
 */
export function createCrowd(canvas: HTMLCanvasElement, options: CrowdOptions = {}): Crowd {
  const ctx = canvas.getContext('2d')!;
  canvas.style.imageRendering = 'pixelated';
  const backdrop = options.backdrop ?? '#1d2030';
  const haze = (a: number) => {
    const n = parseInt(backdrop.slice(1, 7), 16);
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
  };
  const members: Member[] = [], byKey = new Map<string, Member>(), queue: [Member, CrowdSize][] = [];
  const sheets = new Map<CrowdSize, Sheet[]>();
  let order: Member[] | null = null;
  let seats: CrowdSeat[] = [], waving = !!options.wave, frame = 0, start = 0, gone = false;
  let lit: { member: Member; label: string; from: number; until: number } | null = null;

  function sheetFor(size: CrowdSize): [Sheet, number] {
    const list = sheets.get(size) ?? [];
    sheets.set(size, list);
    let s = list[list.length - 1];
    if (!s || s.next >= SHEET_COLUMNS * SHEET_ROWS) {
      const c = document.createElement('canvas');
      c.width = SHEET_COLUMNS * size; c.height = SHEET_ROWS * size;
      s = { canvas: c, ctx: c.getContext('2d')!, next: 0 };
      list.push(s);
    }
    return [s, list.length - 1];
  }
  function make(m: Member, size: CrowdSize) {
    if (m.cells.has(size)) return;
    const [sheet, which] = sheetFor(size), cell = sheet.next++;
    const sprite = crowdSprite(m.spec, size);
    sheet.ctx.putImageData(new ImageData(sprite.rgba, size, size), (cell % SHEET_COLUMNS) * size, Math.floor(cell / SHEET_COLUMNS) * size);
    m.cells.set(size, which * SHEET_COLUMNS * SHEET_ROWS + cell);
  }
  function blit(m: Member, size: CrowdSize, x: number, y: number, scale = 1) {
    const at = m.cells.get(size);
    if (at === undefined) return;
    const sheet = sheets.get(size)![Math.floor(at / (SHEET_COLUMNS * SHEET_ROWS))], cell = at % (SHEET_COLUMNS * SHEET_ROWS);
    ctx.drawImage(sheet.canvas, (cell % SHEET_COLUMNS) * size, Math.floor(cell / SHEET_COLUMNS) * size, size, size, x, y, size * scale, size * scale);
  }

  function layout() {
    const w = canvas.clientWidth || canvas.width, h = canvas.clientHeight || canvas.height;
    const z = options.scale ?? (w >= 900 ? 3 : 2);
    canvas.width = Math.max(1, Math.floor(w / z));
    canvas.height = Math.max(1, Math.floor(h / z));
    seats = crowdSeats(canvas.width, canvas.height, options.density ?? 1);
    order = null;
    for (const m of members) if (m.seat < seats.length) queue.push([m, seats[m.seat].size]);
  }

  function moving(t: number) {
    return waving || options.idle || !!lit || queue.length > 0 || members.some(m => t - m.hopAt < 400);
  }
  function draw(t: number) {
    frame = 0;
    if (gone) return;
    if (!start) start = t;
    // A few milliseconds of sprite making a frame.
    const budget = performance.now() + 4;
    while (queue.length && performance.now() < budget) { const [m, size] = queue.shift()!; make(m, size); }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Back to front, worked out again only when someone sits down or the seats change.
    const shown = order ??= members.filter(m => m.seat < seats.length).sort((a, b) => seats[a.seat].row - seats[b.seat].row);
    const W = canvas.width, wx = ((t - start) / 4200 % 1) * (W + 120) - 60;
    let group: CrowdSize | undefined;
    for (const m of shown) {
      if (lit?.member === m) continue;
      const seat = seats[m.seat];
      if (group !== undefined && seat.size !== group && HAZE[group]) { ctx.fillStyle = haze(HAZE[group]); ctx.fillRect(0, 0, W, seat.y + seat.size); }
      group = seat.size;
      let dy = 0;
      if (waving) { const d = Math.abs(seat.x - wx + seat.row * 0.6); if (d < 26) dy -= Math.round((1 - d / 26) * Math.max(1, seat.size * 0.45)); }
      const since = t - m.hopAt;
      if (since < 400) dy -= Math.round(Math.sin(since / 400 * Math.PI) * Math.max(1, seat.size / 4));
      else if (options.idle && seat.size >= 6 && (t + m.phase) % 3000 < 160) dy -= 1;
      blit(m, seat.size, seat.x, seat.y + dy);
    }
    if (lit) spot(t);
    if (moving(t)) frame = requestAnimationFrame(draw);
  }
  // The spotlit guy: rises from the front edge at twice his full size, holds, sinks back.
  function spot(t: number) {
    const { member, label, from, until } = lit!;
    if (t >= until) { lit = null; return; }
    if (!member.cells.has(16)) make(member, 16);
    const rise = Math.min(1, (t - from) / 350, (until - t) / 350), ease = 1 - Math.pow(1 - rise, 3);
    const scale = Math.max(1, Math.min(3, Math.floor(canvas.height / 40))), side = 16 * scale;
    const x = Math.round((canvas.width - side) / 2), y = Math.round(canvas.height - (side + 14) * ease);
    ctx.fillStyle = haze(0.55 * ease);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    blit(member, 16, x, y, scale);
    if (label) {
      ctx.font = options.font ?? 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const ty = y + side + 2, tw = Math.ceil(ctx.measureText(label).width) + 6;
      ctx.fillStyle = haze(0.9);
      ctx.fillRect(Math.round(canvas.width / 2 - tw / 2), ty - 1, tw, 11);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, Math.round(canvas.width / 2), ty);
    }
  }
  const wake = () => { if (!frame && !gone) frame = requestAnimationFrame(draw); };

  layout();
  return {
    add(name, guy = {}) {
      const key = name.toLowerCase();
      if (byKey.has(key)) return;
      const m: Member = { key, spec: { ...guy, seed: guy.seed ?? key } as GuySpec, seat: members.length, hopAt: -1e9, phase: hash(key) % 3000, cells: new Map() };
      members.push(m); byKey.set(key, m); order = null;
      if (m.seat < seats.length) { queue.push([m, seats[m.seat].size]); wake(); }
    },
    has: name => byKey.has(name.toLowerCase()),
    hop(name) { const m = byKey.get(name.toLowerCase()); if (m) { m.hopAt = performance.now(); wake(); } },
    wave(on) { waving = on; wake(); },
    spotlight(name, label, ms = 2600) {
      const m = byKey.get(name.toLowerCase());
      if (!m) return;
      const now = performance.now();
      lit = { member: m, label: label ?? name, from: now, until: now + ms };
      wake();
    },
    resize() { layout(); wake(); },
    destroy() { gone = true; if (frame) cancelAnimationFrame(frame); sheets.clear(); members.length = 0; byKey.clear(); },
    get count() { return members.length; },
    get seats() { return seats.length; },
  };
}

/**
 * A still crowd as one picture, with no canvas: `guys` take the seats from the front middle back, and
 * `fill` more fill the rest with made-up guys, dealt from `seed` with nothing on (no pet shop items, no
 * buddies), so a short board still stands in a full stand. Opaque on `backdrop`, haze and all, as
 * `createCrowd` draws it. `width` × `height` world pixels, RGBA.
 */
export function crowdPicture(guys: CrowdGuy[], width: number, height: number, options: { backdrop?: string; density?: number; fill?: number; seed?: string } = {}): Uint8ClampedArray {
  const seats = crowdSeats(width, height, options.density ?? 1);
  const seed = options.seed ?? 'crowd';
  const count = Math.min(seats.length, guys.length + Math.max(0, options.fill ?? 0));
  const n = parseInt((options.backdrop ?? '#1d2030').slice(1, 7), 16), bg = [n >> 16 & 255, n >> 8 & 255, n & 255];
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < rgba.length; i += 4) { rgba[i] = bg[0]; rgba[i + 1] = bg[1]; rgba[i + 2] = bg[2]; rgba[i + 3] = 255; }
  const sat = Array.from({ length: count }, (_, k) => k).sort((a, b) => seats[a].row - seats[b].row);
  let group: CrowdSize | undefined;
  for (const k of sat) {
    const seat = seats[k];
    if (group !== undefined && seat.size !== group && HAZE[group]) {
      const a = HAZE[group], bottom = Math.min(height, seat.y + seat.size);
      for (let i = 0; i < bottom * width * 4; i += 4) for (let c = 0; c < 3; c++) rgba[i + c] = Math.round(rgba[i + c] * (1 - a) + bg[c] * a);
    }
    group = seat.size;
    const spec = (k < guys.length ? { ...guys[k], seed: guys[k].seed ?? `${seed}:${k}` } : { seed: `${seed}:${k}` }) as GuySpec;
    const sprite = crowdSprite(spec, seat.size);
    for (let y = 0; y < seat.size; y++) for (let x = 0; x < seat.size; x++) {
      const px = seat.x + x, py = seat.y + y, o = (y * seat.size + x) * 4;
      if (!sprite.rgba[o + 3] || px < 0 || py < 0 || px >= width || py >= height) continue;
      rgba.set(sprite.rgba.subarray(o, o + 4), (py * width + px) * 4);
    }
  }
  return rgba;
}
