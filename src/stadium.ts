/**
 * The stadium: the crowd (./crowd) in the stands behind a game, a venue that grows with it. A handful sit on a porch; fifty fill
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

/** A venue's grandstand: its rows, how they bow and rise, the sizes front to back, and its colours. */
interface Grandstand { W: number; rows: number; a: number; da: number; b: number; db: number; rise: number; front: number; back: number; breaks: number[]; floor: string; sky: string; concrete: string; rail: string; lights: number }

/**
 * Every venue: one grandstand round the far side of a floor, a backdrop a game stands in front of. All
 * 16:9; the bigger the crowd, the more rows and the further back the camera, so the guys are smaller.
 * Rows bow away from you in the middle and come round toward you at the ends; `breaks` are the
 * walkways between tiers.
 */
const STANDS: Record<VenueId, Grandstand> = {
  porch: { W: 200, rows: 2, a: 150, da: 0, b: 4, db: 0, rise: 13, front: 16, back: 16, breaks: [], floor: '#6b4a33', sky: '#1c2238', concrete: '#5a3d2a', rail: '#8a5f3e', lights: 0 },
  bleachers: { W: 256, rows: 5, a: 150, da: 4, b: 12, db: 1, rise: 9, front: 16, back: 10, breaks: [], floor: '#2f7a43', sky: '#1e2a44', concrete: '#4c566b', rail: '#9aa6b8', lights: 0 },
  gym: { W: 320, rows: 8, a: 170, da: 5, b: 26, db: 2, rise: 7, front: 10, back: 8, breaks: [], floor: '#c58b4f', sky: '#2a2433', concrete: '#3d3548', rail: '#7a6a8e', lights: 0 },
  hall: { W: 384, rows: 12, a: 190, da: 6, b: 46, db: 3, rise: 6, front: 10, back: 8, breaks: [], floor: '#3b2f4f', sky: '#181d2e', concrete: '#2c2a40', rail: '#ff7a5c', lights: 0 },
  arena: { W: 512, rows: 22, a: 230, da: 7, b: 78, db: 3, rise: 4.6, front: 8, back: 6, breaks: [13], floor: '#1d4f8a', sky: '#141826', concrete: '#29314a', rail: '#5b6478', lights: 2 },
  stadium: { W: 768, rows: 36, a: 320, da: 8, b: 120, db: 3.4, rise: 3.7, front: 6, back: 4, breaks: [16], floor: '#1f6b3e', sky: '#10131f', concrete: '#262d42', rail: '#5b6478', lights: 4 },
  bowl: { W: 1024, rows: 56, a: 400, da: 9, b: 160, db: 3.2, rise: 3.1, front: 6, back: 2, breaks: [18, 37], floor: '#1f6b3e', sky: '#0d1019', concrete: '#232a3e', rail: '#5b6478', lights: 6 },
};
/** How far up row `r` sits: its rise, and a walkway's worth more past each break. */
const liftOf = (g: Grandstand, r: number) => r * g.rise + g.breaks.filter(k => k <= r).length * g.rise * 2.5;
/** How far back the curve bows at `x` for row `r`: 1 in the middle, 0 at its ends and past them. */
const bowOf = (g: Grandstand, cx: number, r: number, x: number) => { const u = Math.min(1, Math.abs(x - cx) / (g.a + r * g.da)); return Math.sqrt(1 - u * u); };

/** Every venue's seats and its picture, in world pixels. */
function layout(id: VenueId): Layout {
  const g = STANDS[id], W = g.W, H = Math.round(W * 9 / 16), cx = W / 2;
  // The stands rise from just above the bottom, round a hollow of floor the game stands in.
  const floorY = Math.round(H * 0.84), wall = Math.max(3, Math.round(H * 0.025)), baseY = floorY - wall;
  const seats: StadiumSeat[] = [];
  // A deep bow puts the middle well back, so it draws smaller; a shallow one barely.
  const shrink = 0.3 * Math.min(1, g.b / (H * 0.3));
  const yOf = (r: number, x: number) => baseY - (g.b + r * g.db) * bowOf(g, cx, r, x) - liftOf(g, r);
  for (let r = 0; r < g.rows; r++) {
    const px = g.front + (g.back - g.front) * (g.rows > 1 ? r / (g.rows - 1) : 0);
    // Seats step across; the middle is further away, so a little smaller.
    for (let x = (r * 3) % 5; x < W;) {
      const size = sizeNear(px * (1 - shrink * bowOf(g, cx, r, x)));
      const y = Math.round(yOf(r, x + size / 2) - size);
      if (x + size <= W && y >= 0) seats.push({ x, y, size, row: r });
      x += Math.max(2, Math.round(size * 0.92));
    }
  }
  const colours = ['#e8792f', '#2e8c8a', '#4e7fb3', '#c2403f', '#3fa35b', '#7d4fa6', '#e36a8e', '#e7b53b', '#8a93a0'];
  return { width: W, height: H, seats, paint: p => {
    p.rect(0, 0, W, H, g.sky);
    const top = g.rows - 1, back = (x: number) => Math.round(yOf(top, x) - g.back * 1.5);
    for (let x = 0; x < W; x++) {
      // The stands' concrete from the back row down to the floor, each walkway a lighter step.
      const y0 = Math.max(0, back(x));
      p.rect(x, y0, 1, floorY - y0, g.concrete);
      for (const k of g.breaks) p.rect(x, Math.round(yOf(k, x) + 1), 1, 1, g.rail);
      // Under the front row, a strip of boards in the games' colours, then the floor in the bowl's hollow.
      const yw = Math.round(yOf(0, x)) + 1;
      p.rect(x, yw, 1, 1, g.rail);
      p.rect(x, yw + 1, 1, wall, colours[Math.floor(x / Math.max(16, W / 12)) % colours.length]);
      p.rect(x, yw + 1 + wall, 1, H - yw - 1 - wall, g.floor);
      if (g.floor === '#1f6b3e' && Math.floor(x / Math.max(12, W / 24)) % 2) p.rect(x, yw + 1 + wall, 1, H - yw - 1 - wall, '#237646');
    }
    // Floodlights on poles over the top of the stands.
    for (let i = 0; i < g.lights; i++) { const x = Math.round(W * (i + 0.5) / g.lights), y = Math.max(4, back(x) - 30); p.rect(x, y, 2, 30, '#3a4258'); p.rect(x - 6, y - 2, 14, 4, '#fff3c4'); }
    if (id === 'porch') for (let i = 0; i < 12; i++) p.rect(8 + i * 16, 10 + (i % 2) * 2, 2, 2, ['#ffd45c', '#ff8a8a', '#8fd8ff'][i % 3]);
  } };
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
