/**
 * The stadium: the crowd (./crowd) in a venue that grows with it. A handful sit on a porch; fifty fill
 * the bleachers; a hundred a gym; two hundred a hall; a thousand an arena; five thousand a stadium; ten
 * thousand and more a three-tier bowl. Only who a game adds is there: nobody is made up. Each guy is drawn
 * from his own drawing at the size his seat calls for, in his finishes, a rare one outlined in his grade's
 * colour or his aura's, glinting now and then. The venue is drawn once at its own pixels and scaled by whole
 * screen pixels with smoothing off, like the guys, so everything stays sharp at any size or zoom.
 */
import { crowdSprite, crowdShine, type CrowdSize } from './crowd';
import { hash } from './hash';
import type { GuySpec } from './guy-code';

/** A seat: where a guy stands (his cell's top-left), at what crowd size, and which row he is in (0 nearest). */
export interface StadiumSeat { x: number; y: number; size: CrowdSize; row: number }

/** The venues, smallest first: who fits, and how big the picture of it is in world pixels. */
export const VENUES = [
  { id: 'porch', name: 'The porch', upTo: 20 },
  { id: 'bleachers', name: 'The bleachers', upTo: 50 },
  { id: 'gym', name: 'The gym', upTo: 100 },
  { id: 'hall', name: 'The hall', upTo: 200 },
  { id: 'arena', name: 'The arena', upTo: 1000 },
  { id: 'stadium', name: 'The stadium', upTo: 5000 },
  { id: 'bowl', name: 'The bowl', upTo: 12000 },
] as const;
export type VenueId = (typeof VENUES)[number]['id'];

/** The venue for `count` people: the smallest that seats them all (the bowl past its size). */
export const venueFor = (count: number): VenueId => (VENUES.find(v => count <= v.upTo) ?? VENUES[VENUES.length - 1]).id;

interface Layout { width: number; height: number; seats: StadiumSeat[]; paint: (put: Painter) => void }
type Painter = { rect: (x: number, y: number, w: number, h: number, c: string) => void; oval: (cx: number, cy: number, a: number, b: number, c: string) => void; stripes: (cx: number, cy: number, a: number, b: number, w: number, c: string) => void };

const SIZES: CrowdSize[] = [2, 4, 6, 8, 10, 16];
const sizeNear = (px: number): CrowdSize => SIZES.reduce((best, s) => (Math.abs(s - px) < Math.abs(best - px) ? s : best), SIZES[0]);

/** Straight rows of seats, nearest first, `size` from the front row's to the back row's. */
function rows(x0: number, x1: number, yFront: number, count: number, front: number, back: number, seats: StadiumSeat[], up = true): void {
  for (let r = 0, y = yFront; r < count; r++) {
    const size = sizeNear(front + (back - front) * (count > 1 ? r / (count - 1) : 0));
    const step = Math.max(2, Math.round(size * 0.9));
    for (let x = x0 + (r % 2) * (step >> 1); x + size <= x1; x += step) seats.push({ x, y: y - size, size, row: r });
    y += up ? -Math.max(2, Math.round(size * 0.62)) : Math.max(2, Math.round(size * 0.62));
  }
}

/**
 * An oval of stands round a centre, raked back: `count` rows from the front, sizes bigger on the near
 * side; `gap` leaves the bottom of the oval open (a stage end), as a fraction of the turn.
 */
function oval(cx: number, cy: number, a0: number, b0: number, count: number, da: number, db: number, rise: number, near: number, far: number, seats: StadiumSeat[], gap = 0, first = 0): void {
  for (let r = 0; r < count; r++) {
    const a = a0 + r * da, b = b0 + r * db;
    for (let t = 0; t < Math.PI * 2;) {
      const sin = Math.sin(t), cos = Math.cos(t);
      const px = far + (near - far) * (sin + 1) / 2, size = sizeNear(px * (1 - r * 0.004));
      const open = gap > 0 && Math.abs(t - Math.PI / 2) < gap * Math.PI;
      if (!open) seats.push({ x: Math.round(cx + a * cos - size / 2), y: Math.round(cy + b * sin - r * rise - size), size, row: first + r });
      t += Math.max(0.004, (size * 0.95) / Math.hypot(a * sin, b * cos));
    }
  }
}

/** Every venue's seats and its picture, in world pixels. */
function layout(id: VenueId): Layout {
  const seats: StadiumSeat[] = [];
  switch (id) {
    case 'porch': {
      const W = 200, H = 80;
      rows(14, W - 14, 66, 2, 16, 16, seats);
      return { width: W, height: H, seats, paint: p => {
        p.rect(0, 0, W, H, '#1c2238'); for (let i = 0; i < 9; i++) p.rect(10 + i * 15, 8 + (i % 2) * 2, 2, 2, ['#ffd45c', '#ff8a8a', '#8fd8ff'][i % 3]);
        p.rect(0, 9, W, 1, '#3a3f55'); p.rect(0, 40, W, 40, '#6b4a33'); for (let x = 0; x < W; x += 10) p.rect(x, 40, 1, 40, '#5a3d2a');
        p.rect(8, 50, W - 16, 4, '#8a5f3e'); p.rect(8, 66, W - 16, 4, '#8a5f3e'); p.rect(0, 74, W, 6, '#4a3324');
      } };
    }
    case 'bleachers': {
      const W = 200, H = 110;
      rows(8, W - 8, 92, 4, 14, 10, seats);
      return { width: W, height: H, seats, paint: p => {
        p.rect(0, 0, W, H, '#1e2a44'); p.rect(0, 0, W, 40, '#22304e');
        for (let i = 0; i < 4; i++) p.rect(4, 92 - i * 8, W - 8, 2, '#9aa6b8');
        p.rect(0, 94, W, 16, '#2f7a43'); p.rect(0, 100, W, 1, '#3f9455');
      } };
    }
    case 'gym': {
      const W = 260, H = 160;
      rows(10, W - 10, 46, 3, 10, 8, seats, true);
      rows(10, W - 10, 150, 3, 14, 12, seats, true);
      return { width: W, height: H, seats, paint: p => {
        p.rect(0, 0, W, H, '#2a2433'); p.rect(0, 48, W, 64, '#c58b4f');
        for (let x = 0; x < W; x += 12) p.rect(x, 48, 1, 64, '#b47c44');
        p.rect(20, 52, W - 40, 56, '#d39a5c'); p.oval(W / 2, 80, 16, 10, '#e9b47a'); p.rect(W / 2, 52, 1, 56, '#f3e6d0');
        p.rect(4, 70, 6, 20, '#e8792f'); p.rect(W - 10, 70, 6, 20, '#e8792f');
      } };
    }
    case 'hall': {
      const W = 320, H = 200, cx = W / 2, cy = 120;
      oval(cx, cy, 70, 38, 7, 12, 7, 2.6, 12, 8, seats, 0.18);
      return { width: W, height: H, seats, paint: p => {
        p.rect(0, 0, W, H, '#181d2e'); p.oval(cx, cy - 6, 168, 92, '#262d44');
        p.oval(cx, cy, 62, 32, '#3b2f4f'); p.rect(cx - 40, cy + 18, 80, 30, '#4e3a63'); p.rect(cx - 40, cy + 18, 80, 2, '#ff7a5c');
      } };
    }
    case 'arena': {
      const W = 440, H = 280, cx = W / 2, cy = 150;
      oval(cx, cy, 104, 50, 13, 9, 5.2, 2.6, 10, 6, seats);
      return { width: W, height: H, seats, paint: p => {
        p.rect(0, 0, W, H, '#141826'); p.oval(cx, cy - 18, 228, 124, '#232a3b'); p.oval(cx, cy - 14, 212, 112, '#2c3448');
        p.oval(cx, cy, 98, 46, '#1d4f8a'); p.oval(cx, cy, 84, 38, '#2a62a3'); p.rect(cx - 1, cy - 38, 2, 76, '#e9eef7');
        p.rect(cx - 22, cy - 98, 44, 18, '#0b0e18'); p.rect(cx - 20, cy - 96, 40, 14, '#29364f'); p.rect(cx - 1, cy - 112, 2, 14, '#5b6478');
      } };
    }
    case 'stadium': {
      const W = 680, H = 420, cx = W / 2, cy = 225;
      oval(cx, cy, 196, 88, 22, 8, 4.6, 2.4, 8, 4, seats);
      return { width: W, height: H, seats, paint: p => {
        p.rect(0, 0, W, H, '#10131f'); p.oval(cx, cy - 26, 340, 182, '#202737'); p.oval(cx, cy - 22, 324, 170, '#29314a');
        p.oval(cx, cy, 186, 82, '#1f6b3e'); p.stripes(cx, cy, 186, 82, 26, '#237646');
        p.rect(cx - 1, cy - 78, 2, 156, '#d9f0de'); p.oval(cx, cy, 26, 12, '#2f8a51');
        for (const sx of [24, W - 30]) { p.rect(sx, 20, 6, 120, '#3a4258'); p.rect(sx - 8, 14, 22, 8, '#fff3c4'); }
      } };
    }
    default: {
      const W = 1120, H = 640, cx = W / 2, cy = 350;
      oval(cx, cy, 250, 110, 16, 7, 4, 2.2, 8, 4, seats);
      oval(cx, cy - 46, 372, 176, 14, 6, 3.4, 2.2, 6, 2, seats, 0, 16);
      oval(cx, cy - 92, 470, 230, 10, 5, 2.8, 2.2, 4, 2, seats, 0, 30);
      return { width: W, height: H, seats, paint: p => {
        p.rect(0, 0, W, H, '#0d1019'); p.oval(cx, cy - 70, 548, 300, '#1d2333'); p.oval(cx, cy - 64, 532, 288, '#262d42');
        p.oval(cx, cy, 240, 104, '#1f6b3e'); p.stripes(cx, cy, 240, 104, 28, '#237646');
        p.rect(cx - 1, cy - 100, 2, 200, '#d9f0de'); p.oval(cx, cy, 34, 15, '#2f8a51');
        for (const sx of [20, 230, W - 236, W - 26]) { p.rect(sx, 10, 6, 150, '#3a4258'); p.rect(sx - 10, 4, 26, 8, '#fff3c4'); }
      } };
    }
  }
}

/**
 * The seats of venue `id`, in the order they fill: the front row first, all the way round, from the
 * middle of the near side out, then the row behind, so a part-full venue is full at the front.
 */
export function stadiumSeats(id: VenueId): StadiumSeat[] {
  const l = layout(id);
  const mid = l.width / 2;
  return [...l.seats].sort((p, q) => p.row - q.row || q.size - p.size || Math.abs(p.x - mid) - Math.abs(q.x - mid));
}

export interface StadiumOptions {
  /** A slow wave round the stands. */
  wave?: boolean;
  /** Called when the crowd moves to a bigger (or smaller) venue. */
  onVenue?: (id: VenueId) => void;
  /** The pixel font for a spotlit guy's name, as a CSS font. */
  font?: string;
}

export interface Stadium {
  /** Seats a guy by name (lowercased, once), in his club look when given. The venue grows to fit. */
  add(name: string, guy?: Partial<GuySpec>): void;
  /** Takes a guy out; the venue shrinks again if it can. */
  remove(name: string): void;
  has(name: string): boolean;
  /** Makes a guy hop, as when he guesses. */
  hop(name: string): void;
  wave(on: boolean): void;
  /** Lifts a guy out of his seat, big, with a line under him, for `ms`. */
  spotlight(name: string, label?: string, ms?: number): void;
  resize(): void;
  destroy(): void;
  readonly count: number;
  readonly venue: VenueId;
}

interface Fan { key: string; spec: GuySpec; joined: number; hopAt: number; glint: boolean }

/**
 * A stadium on `canvas` (sized with CSS). Guys are seated best seats first in the order they arrive; when
 * the venue changes they take their places in the new one, the old venue fading out under it.
 */
export function createStadium(canvas: HTMLCanvasElement, options: StadiumOptions = {}): Stadium {
  const ctx = canvas.getContext('2d')!;
  const fans: Fan[] = [], byKey = new Map<string, Fan>();
  let venue: VenueId = 'porch', seats = stadiumSeats(venue), lay = layout(venue), backdrop = paintVenue(lay);
  let fading: { picture: HTMLCanvasElement; until: number } | null = null;
  let waving = !!options.wave, frame = 0, gone = false, dpr = 1, k = 1, ox = 0, oy = 0;
  let lit: { fan: Fan; label: string; from: number; until: number } | null = null;
  let order: (readonly [Fan, StadiumSeat])[] | null = null;
  const sprites = new Map<string, HTMLCanvasElement>(), queue: [Fan, CrowdSize][] = [], queued = new Set<string>();

  function paintVenue(l: Layout): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = l.width; c.height = l.height;
    const g = c.getContext('2d')!;
    // Ovals are filled a row at a time, so their edges are whole pixels.
    const span = (a: number, b: number, y: number) => Math.round(a * Math.sqrt(Math.max(0, 1 - (y / b) ** 2)));
    l.paint({
      rect: (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); },
      oval: (cx, cy, a, b, col) => { g.fillStyle = col; for (let y = -b; y <= b; y++) { const w = span(a, b, y); g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 1); } },
      // A pitch's mowing: every other band of `w`, inside the oval only.
      stripes: (cx, cy, a, b, w, col) => {
        g.fillStyle = col;
        for (let y = -b; y <= b; y++) { const half = span(a, b, y); for (let x = -half; x < half; x++) if (Math.floor((x + 10000 * w) / w) % 2) g.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1); }
      },
    });
    return c;
  }
  function layoutCanvas() {
    const w = canvas.clientWidth || 300, h = canvas.clientHeight || 150;
    dpr = globalThis.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(w * dpr)); canvas.height = Math.max(1, Math.round(h * dpr));
    // Whole screen pixels to a world pixel, as big as the venue fits.
    k = Math.max(1, Math.floor(Math.min(canvas.width / lay.width, canvas.height / lay.height)));
    ox = Math.round((canvas.width - lay.width * k) / 2); oy = Math.round((canvas.height - lay.height * k) / 2);
  }
  function reseat() {
    const next = venueFor(fans.length);
    if (next === venue) return;
    fading = { picture: backdrop, until: performance.now() + 900 };
    venue = next; seats = stadiumSeats(venue); lay = layout(venue); backdrop = paintVenue(lay); order = null;
    layoutCanvas();
    options.onVenue?.(venue);
  }
  function sprite(f: Fan, size: CrowdSize): HTMLCanvasElement | undefined {
    const key = f.key + ':' + size, have = sprites.get(key);
    if (!have && !queued.has(key)) { queued.add(key); queue.push([f, size]); }
    return have;
  }
  function make(f: Fan, size: CrowdSize) {
    const key = f.key + ':' + size;
    queued.delete(key);
    if (sprites.has(key) || !byKey.has(f.key)) return;
    const s = crowdSprite(f.spec, size), c = document.createElement('canvas');
    c.width = c.height = size;
    c.getContext('2d')!.putImageData(new ImageData(s.rgba, size, size), 0, 0);
    sprites.set(key, c);
  }

  function draw(now: number) {
    frame = 0;
    if (gone) return;
    const budget = performance.now() + 5;
    while (queue.length && performance.now() < budget) { const [f, size] = queue.shift()!; make(f, size); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b0e18'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(k, 0, 0, k, ox, oy);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(backdrop, 0, 0);
    if (fading) {
      const left = (fading.until - now) / 900;
      if (left <= 0) fading = null;
      else { ctx.globalAlpha = left; ctx.drawImage(fading.picture, 0, 0, lay.width, lay.height); ctx.globalAlpha = 1; }
    }
    // Back rows first; the nearest last, so they stand in front.
    // Back to front, worked out again only when someone comes, goes or the venue changes.
    const shown = order ??= fans.slice(0, seats.length).map((f, i) => [f, seats[i]] as const).sort((p, q) => p[1].y + p[1].size - (q[1].y + q[1].size));
    const wave = ((now / 7000) % 1) * (lay.width + 80) - 40;
    for (const [f, seat] of shown) {
      if (lit?.fan === f) continue;
      const s = sprite(f, seat.size) ?? smaller(f, seat.size);
      if (!s) continue;
      let dy = 0;
      if (waving) { const d = Math.abs(seat.x - wave); if (d < 30) dy -= Math.round((1 - d / 30) * Math.max(1, seat.size * 0.45)); }
      const since = now - f.hopAt;
      if (since < 400) dy -= Math.round(Math.sin(since / 400 * Math.PI) * Math.max(1, seat.size / 4));
      const arrive = Math.min(1, (now - f.joined) / 500);
      if (arrive < 1) { ctx.globalAlpha = arrive; dy -= Math.round((1 - arrive) * seat.size * 0.6); }
      ctx.drawImage(s, seat.x, seat.y + dy, seat.size, seat.size);
      ctx.globalAlpha = 1;
      // A rare guy glints now and then over his head, while the stands are moving.
      if (f.glint && (now / 90 + hash(f.key) % 97) % 60 < 2) { ctx.fillStyle = '#ffffff'; ctx.fillRect(seat.x + seat.size - 1, seat.y + dy - 1, 1, 1); }
    }
    if (lit) spot(now);
    if (waving || lit || fading || queue.length || fans.some(f => now - f.hopAt < 400 || now - f.joined < 500)) frame = requestAnimationFrame(draw);
  }
  // Until his own size is made, a smaller one stands in.
  function smaller(f: Fan, size: CrowdSize) { for (const s of [...SIZES].reverse()) if (s < size && sprites.has(f.key + ':' + s)) return sprites.get(f.key + ':' + s); return undefined; }
  function spot(now: number) {
    const { fan, label, from, until } = lit!;
    if (now >= until) { lit = null; return; }
    const big = sprite(fan, 16);
    if (!big) return;
    const rise = Math.min(1, (now - from) / 350, (until - now) / 350), ease = 1 - Math.pow(1 - rise, 3);
    const scale = Math.max(2, Math.min(5, Math.floor(lay.height / 40))), side = 16 * scale;
    ctx.fillStyle = `rgba(11,14,24,${0.55 * ease})`; ctx.fillRect(0, 0, lay.width, lay.height);
    const x = Math.round((lay.width - side) / 2), y = Math.round(lay.height - (side + 14) * ease);
    ctx.drawImage(big, x, y, side, side);
    if (label) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const css = k / dpr, cx = (ox / dpr) + lay.width * css / 2, cy = (oy / dpr) + (y + side + 1) * css + 12;
      ctx.font = options.font ?? '700 15px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tw = Math.ceil(ctx.measureText(label).width) + 20;
      ctx.fillStyle = 'rgba(11,14,24,.92)'; ctx.beginPath(); ctx.roundRect(cx - tw / 2, cy - 13, tw, 26, 13); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillText(label, cx, cy + 1);
    }
  }
  const wake = () => { if (!frame && !gone) frame = requestAnimationFrame(draw); };

  layoutCanvas();
  return {
    add(name, guy = {}) {
      const key = name.toLowerCase();
      if (byKey.has(key)) return;
      const spec = { ...guy, seed: guy.seed ?? key } as GuySpec;
      const f: Fan = { key, spec, joined: performance.now(), hopAt: -1e9, glint: (crowdShine(spec)?.grade ?? 0) >= 3 };
      fans.push(f); byKey.set(key, f); order = null;
      reseat(); wake();
    },
    remove(name) {
      const f = byKey.get(name.toLowerCase());
      if (!f) return;
      byKey.delete(f.key); fans.splice(fans.indexOf(f), 1); order = null;
      for (const s of SIZES) sprites.delete(f.key + ':' + s);
      reseat(); wake();
    },
    has: name => byKey.has(name.toLowerCase()),
    hop(name) { const f = byKey.get(name.toLowerCase()); if (f) { f.hopAt = performance.now(); wake(); } },
    wave(on) { waving = on; wake(); },
    spotlight(name, label, ms = 2600) { const f = byKey.get(name.toLowerCase()); if (!f) return; const now = performance.now(); lit = { fan: f, label: label ?? name, from: now, until: now + ms }; wake(); },
    resize() { layoutCanvas(); wake(); },
    destroy() { gone = true; if (frame) cancelAnimationFrame(frame); sprites.clear(); fans.length = 0; byKey.clear(); },
    get count() { return fans.length; },
    get venue() { return venue; },
  };
}
