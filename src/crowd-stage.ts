/**
 * A crowd on a canvas: thousands of guys in rows going back, each drawn at the crowd size their row
 * calls for (./crowd), the far rows tinted toward the backdrop. A game adds chatters as they turn up,
 * hops one when they guess, runs a wave, and pulls a winner out to the front. Guys sitting still are
 * baked into one picture, so a frame redraws only who moves (./crowd-render); sprites are made a few
 * milliseconds a frame as guys arrive, a stand-in in their colours until then.
 */
import { crowdSprite, type CrowdSize } from './crowd';
import { hash } from './hash';
import type { GuySpec } from './guy-code';
import { createRender, lightness, type Render, type Scene, type Tint } from './crowd-render';

/** A seat in the crowd: where a guy stands (their cell's top-left), at what size, in which row (0 is the back). */
export interface CrowdSeat { x: number; y: number; size: CrowdSize; row: number }

/** Sizes rows step through, nearest first; neighbouring rows differ by one at most. */
const LADDER: CrowdSize[] = [16, 14, 12, 10, 8, 6, 5, 3, 2];
/** How far toward the backdrop each size is tinted: the further back, the more. */
const HAZE: Record<CrowdSize, number> = { 16: 0, 14: 0.03, 12: 0.06, 10: 0.1, 8: 0.16, 6: 0.24, 5: 0.3, 4: 0.34, 3: 0.4, 2: 0.48 };

/**
 * The seats of a crowd filling `width` × `height` world pixels: rows from the front (the bottom edge,
 * where the front row's feet are) back to the top, each row's size shrinking with distance, jittered a
 * cell so far rows never line up. In the order a crowd fills them: the front row first, from the middle
 * out, then the row behind. Seats less than three quarters on the canvas are left out. `density` above
 * 1 packs more in (smaller guys sooner); the same arguments give the same seats.
 */
export function crowdSeats(width: number, height: number, density = 1, seed = 'crowd'): CrowdSeat[] {
  const rows: { y: number; size: CrowdSize }[] = [];
  let at = -1;
  for (let feet = height; ;) {
    const d = Math.max(0, feet / height), want = 2 + 15 * Math.pow(d, 2.1) / Math.sqrt(density);
    // The ladder size nearest what this row wants, one step from the row in front at most.
    let best = LADDER.reduce((b, s, i) => (Math.abs(Math.log(s / want)) < Math.abs(Math.log(LADDER[b] / want)) ? i : b), 0);
    if (at >= 0) best = Math.min(at + 1, Math.max(at, best));
    at = best;
    const size = LADDER[at];
    if (feet - size < -size / 4) break;
    rows.push({ y: feet - size, size });
    feet -= Math.max(2, Math.round(size * (size <= 3 ? 0.67 : 0.6)));
  }
  rows.reverse();
  const seats: CrowdSeat[] = [];
  rows.forEach(({ y, size }, row) => {
    const step = size <= 2 ? 3 : size <= 5 ? size : Math.round(size * 0.92);
    const r = (k: number) => hash(`${seed}:${row}:${k}`) % 1000 / 1000;
    let x = -size + Math.floor(r(-1) * step) - ((row % 2) * step >> 1), k = 0;
    while (x < width + size) {
      const sy = y - (size <= 6 ? Math.floor(r(k * 2) * 2) : 0);
      if (x >= -size / 4 && x + size <= width + size / 4 && sy >= -size / 4) seats.push({ x, y: sy, size, row });
      x += step + Math.floor(r(k * 2 + 1) * 2);
      k++;
    }
  });
  const mid = width / 2;
  return seats.sort((a, b) => b.row - a.row || Math.abs(a.x + a.size / 2 - mid) - Math.abs(b.x + b.size / 2 - mid));
}

/** What a game passes for each guy: their name, and their club look when they have one (`seed`, `parts`, `palette`, `equip`). */
export type CrowdGuy = Partial<GuySpec>;

export interface CrowdOptions {
  /** The colour behind the crowd: far rows are tinted toward it. Default the page's background under the canvas (read again as the page changes), else the club's navy. */
  backdrop?: string;
  /** CSS pixels to a world pixel (made a whole number of screen pixels). Default: as big as the crowd allows, never under 3 from 900 CSS pixels wide, else 2. */
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
  /** Seats a guy (by the lowercased name, so a name seats once) in the best free seat. */
  add(name: string, guy?: CrowdGuy): void;
  /** Takes a guy out. Their seat goes to whoever has waited longest past the seats, or the next to come. */
  remove(name: string): void;
  /** Whether a name is in the crowd. */
  has(name: string): boolean;
  /** Makes a guy hop, as when they guess. */
  hop(name: string): void;
  /** Turns the wave on or off. */
  wave(on: boolean): void;
  /** Lifts a guy out to the front, big, with a line under them (their name by default), for `ms`. */
  spotlight(name: string, label?: string, ms?: number): void;
  /** Lays the seats out again for the canvas's size now (keeping who sits where in order). */
  resize(): void;
  /** Stops drawing and lets go of the sprites. */
  destroy(): void;
  /** How many guys are in; past the seats there are, the rest wait undrawn for a seat to free. */
  readonly count: number;
  /** How many seats the crowd has at its size. */
  readonly seats: number;
}

/** The page's background under an element, as #rrggbb, or undefined where none shows. */
function pageBehind(el: Element | null): string | undefined {
  for (let e = el; e && typeof getComputedStyle === 'function'; e = e.parentElement) {
    const m = getComputedStyle(e).backgroundColor.match(/rgba?\(([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.]+))?/);
    if (m && (m[4] === undefined || +m[4] > 0.5)) return '#' + [m[1], m[2], m[3]].map(v => Math.round(+v).toString(16).padStart(2, '0')).join('');
  }
  return undefined;
}

/**
 * A crowd on `canvas`, which the page sizes with CSS. It draws at the screen's own pixels, each world
 * pixel a whole number of them with smoothing off, so guys stay sharp at any size, zoom or density; it
 * follows the canvas's size and the screen's pixel density by itself (`resize()` still works). The canvas
 * stays see-through where nobody stands. Draws only while something moves.
 */
export function createCrowd(canvas: HTMLCanvasElement, options: CrowdOptions = {}): Crowd {
  const behind = () => options.backdrop ?? pageBehind(canvas.parentElement) ?? '#1d2030';
  // Seat numbers let go of, lowest (best) first; past them, the next guy gets the next number.
  // `arrivals` counts guys in, so whoever waits is seated in the order they came.
  const free: number[] = [], arrived = new Map<string, number>();
  let next = 0, arrivals = 0, zoom = 0, seatCount = 0, laidCss = '';
  const counted = new Map<string, number>();
  let render: Render | undefined;
  /** CSS pixels to a world pixel for `count` guys: as big as leaves a third more seats than guys. */
  function zoomFor(cssW: number, cssH: number, count: number, now: number) {
    if (options.scale) return options.scale;
    const least = cssW >= 900 ? 3 : 2, most = Math.max(least, Math.floor(cssH * 0.45 / 16));
    const seatsAt = (z: number) => {
      const key = `${Math.ceil(cssW / z)}x${Math.ceil(cssH / z)}`;
      let n = counted.get(key);
      if (n === undefined) counted.set(key, n = crowdSeats(Math.ceil(cssW / z), Math.ceil(cssH / z), options.density ?? 1).length);
      return n;
    };
    let z = least;
    while (z < most && seatsAt(z + 1) >= count * 1.3) z++;
    // Bigger only once there's clear room, so a crowd near the edge doesn't flip back and forth.
    if (now > z && now <= most && seatsAt(now) >= count * 1.1) return now;
    if (now && z > now && seatsAt(z) < count * 1.6) return Math.max(now, least);
    return z;
  }
  function build(devW: number, devH: number, dpr: number): Scene {
    // The canvas changed size on its own (the page laid it out again): the scale is picked again for it.
    const css = `${devW / dpr}x${devH / dpr}`;
    if (laidCss && css !== laidCss) zoom = zoomFor(devW / dpr, devH / dpr, render?.guys.size ?? 0, zoom);
    laidCss = css;
    const backdrop = behind(), tints: Tint[] = LADDER.map(s => ({ toward: backdrop, amount: HAZE[s], shade: 0 }));
    const k = Math.max(1, Math.round(zoom * dpr)), W = Math.ceil(devW / k), H = Math.ceil(devH / k);
    const seats = crowdSeats(W, H, options.density ?? 1);
    seatCount = seats.length;
    const rows: number[][] = [];
    seats.forEach((s, i) => { (rows[s.row] ??= []).push(i); });
    return {
      width: W, height: H, k, ox: 0, oy: devH - H * k,
      seats, rows: Array.from(rows, r => (r ?? []).sort((a, b) => seats[a].x - seats[b].x)),
      bands: Uint8Array.from(seats, s => LADDER.indexOf(s.size)), tints, backdrop: null,
      // The spotlight dims toward the backdrop on a dark page, toward ink on a light one.
      pitch: Math.max(4, seats[0]?.size ?? 8), shadow: lightness(backdrop) > 0.5 ? '#141820' : backdrop,
    };
  }
  const css = () => [canvas.clientWidth || 300, canvas.clientHeight || 150];
  zoom = zoomFor(css()[0], css()[1], 0, 0);
  render = createRender(canvas, { build, font: options.font, wave: options.wave, idle: options.idle, onLayout: () => settle() });
  const rendered = render;
  // The page's colours can change with the device's light or dark setting.
  const scheme = !options.backdrop && typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
  const onScheme = () => rendered.request('cut');
  scheme?.addEventListener?.('change', onScheme);
  // Whoever waits past the seats takes a free one, longest waiting first.
  function settle() {
    if (!render) return;
    while (free.length && free[0] < seatCount) {
      let waiting: string | undefined;
      for (const g of render.guys.values()) if (g.seat >= seatCount && (!waiting || arrived.get(g.key)! < arrived.get(waiting)!)) waiting = g.key;
      if (!waiting) return;
      const g = render.guys.get(waiting)!, seat = free.shift()!;
      release(g.seat);
      render.move(g, seat);
    }
  }
  function release(seat: number) {
    let i = 0;
    while (i < free.length && free[i] < seat) i++;
    free.splice(i, 0, seat);
  }
  /** Picks the scale again for the crowd now, laying it out again when it changes. */
  function rescale() {
    const [w, h] = css(), z = zoomFor(w, h, rendered.guys.size, zoom);
    if (z === zoom) return;
    zoom = z;
    rendered.relayout(rendered.guys.size > 300 ? 'fade' : 'slide');
  }
  return {
    add(name, guy = {}) {
      const key = name.toLowerCase();
      if (rendered.guys.has(key)) return;
      // A freed number past the seats would put them ahead of guys already waiting.
      const seat = free.length && free[0] < seatCount ? free.shift()! : next++;
      arrived.set(key, arrivals++);
      rendered.join(key, { ...guy, seed: guy.seed ?? key } as GuySpec, seat);
      rescale();
    },
    remove(name) {
      const g = rendered.guys.get(name.toLowerCase());
      if (!g) return;
      rendered.leave(g);
      arrived.delete(g.key);
      release(g.seat);
      settle();
      rescale();
    },
    has: name => rendered.guys.has(name.toLowerCase()),
    hop(name) { const g = rendered.guys.get(name.toLowerCase()); if (g) rendered.hop(g); },
    wave(on) { rendered.wave(on); },
    spotlight(name, label, ms = 2600) { const g = rendered.guys.get(name.toLowerCase()); if (g) rendered.spotlight(g, label ?? name, ms); },
    resize() { const [w, h] = css(); zoom = zoomFor(w, h, rendered.guys.size, zoom); laidCss = ''; rendered.resize(); },
    destroy() { rendered.destroy(); scheme?.removeEventListener?.('change', onScheme); free.length = 0; arrived.clear(); },
    get count() { return rendered.guys.size; },
    get seats() { return seatCount; },
  };
}

/**
 * A still crowd as one picture, with no canvas: `guys` take the seats from the front middle back, and
 * `fill` more fill the rest with made-up guys, dealt from `seed` with nothing on (no pet shop items, no
 * buddies), so a short board still stands in a full stand. Opaque on `backdrop`, far rows tinted toward
 * it as `createCrowd` draws them. `width` × `height` world pixels, RGBA.
 */
export function crowdPicture(guys: CrowdGuy[], width: number, height: number, options: { backdrop?: string; density?: number; fill?: number; seed?: string } = {}): Uint8ClampedArray {
  const seats = crowdSeats(width, height, options.density ?? 1);
  const seed = options.seed ?? 'crowd';
  const count = Math.min(seats.length, guys.length + Math.max(0, options.fill ?? 0));
  const n = parseInt((options.backdrop ?? '#1d2030').slice(1, 7), 16), bg = [n >> 16 & 255, n >> 8 & 255, n & 255];
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < rgba.length; i += 4) { rgba[i] = bg[0]; rgba[i + 1] = bg[1]; rgba[i + 2] = bg[2]; rgba[i + 3] = 255; }
  const sat = Array.from({ length: count }, (_, k) => k).sort((a, b) => seats[a].row - seats[b].row || seats[a].x - seats[b].x);
  for (const k of sat) {
    const seat = seats[k], a = HAZE[seat.size];
    const spec = (k < guys.length ? { ...guys[k], seed: guys[k].seed ?? `${seed}:${k}` } : { seed: `${seed}:${k}` }) as GuySpec;
    const sprite = crowdSprite(spec, seat.size);
    for (let y = 0; y < seat.size; y++) for (let x = 0; x < seat.size; x++) {
      const px = seat.x + x, py = seat.y + y, o = (y * seat.size + x) * 4;
      if (!sprite.rgba[o + 3] || px < 0 || py < 0 || px >= width || py >= height) continue;
      const at = (py * width + px) * 4;
      for (let c = 0; c < 3; c++) rgba[at + c] = Math.round(sprite.rgba[o + c] * (1 - a) + bg[c] * a);
    }
  }
  return rgba;
}
