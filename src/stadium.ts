/**
 * The stadium: the crowd (./crowd) in the stands behind a game, a venue that grows with it. A handful sit
 * on a porch's steps; fifty fill the bleachers; a hundred a gym's pull-out stands; two hundred a hall; a
 * thousand an arena; five thousand a stadium; ten thousand and more a three-tier bowl. Only who a game
 * adds is there: nobody is made up, and the seats are the people present, packed from the front middle
 * out, so the stand is full however many come.
 *
 * Each venue is laid out for the canvas it is on, half a stadium seen straight on from the other side, so
 * it fills any shape of canvas edge to edge with no bars: the stand runs off both sides, the roof or sky
 * takes the top and the floor the bottom. It is drawn at whole device pixels per world pixel with
 * smoothing off, like the guys, so nothing ever blurs. Each guy is drawn from their own drawing at the
 * size their seat calls for, in their finishes, hazier the further back they sit; a rare one is outlined
 * in their grade's colour or their aura's and glints now and then.
 */
import { CROWD_SIZES, type CrowdSize } from './crowd';
import { hash } from './hash';
import type { GuySpec } from './guy-code';
import { createRender, type Guy, type Scene, type Tint } from './crowd-render';

/** A seat: where a guy stands (their cell's top-left), at what crowd size, and which row they are in (0 nearest). */
export interface StadiumSeat { x: number; y: number; size: CrowdSize; row: number }

/** The venues, smallest first: who fits. */
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

/** Sizes a stand's rows step through, nearest first; neighbouring rows differ by one at most. */
const LADDER: CrowdSize[] = [16, 14, 12, 10, 8, 6, 5, 3, 2];
if (LADDER.some(s => !(CROWD_SIZES as readonly number[]).includes(s))) throw new Error('crowd size missing');

/** How a venue is built: its proportions (fractions of the world's height), its rows and its colours. */
interface Style {
  /** The floor along the bottom, the stand's tallest, and how far the rows bow up in the middle. */
  floor: number; stand: number; bow: number;
  /** The tallest a front-row guy may be, as a fraction of the canvas's CSS height. */
  cap: number;
  /** Front-row sizes this venue takes, largest first. */
  fronts: CrowdSize[];
  /** Guys are half their front size this far above the front row (fraction of height); 0 for no shrinking. */
  depth: number;
  /** Row rise and seat step, as fractions of a guy's size. */
  rise: number; pitch: number;
  /** Seats between stair aisles (0 for none), tier breaks (fractions of the stand), arches in the lower tier. */
  section: number; tiers: number[]; arches: number;
  /** Rows are centred groups (the porch), not edge to edge, and at most this many. */
  centred?: number;
  /** Boards along the front, and how hazy the back rows get, toward what. */
  boards: boolean; haze: string; hazeMax: number;
  /** Seat colours, by tier. */
  seats: string[];
}

const STYLES: Record<VenueId, Style> = {
  porch: { floor: 0.14, stand: 0.6, bow: 0, cap: 0.22, fronts: [16], depth: 0, rise: 0.66, pitch: 1.16, section: 0, tiers: [], arches: 0, centred: 3, boards: false, haze: '#1c2238', hazeMax: 0, seats: ['#a0714a'] },
  bleachers: { floor: 0.15, stand: 0.6, bow: 0, cap: 0.14, fronts: [16, 14, 12, 10], depth: 4, rise: 0.8, pitch: 1.05, section: 0, tiers: [], arches: 0, boards: false, haze: '#3b3358', hazeMax: 0.12, seats: ['#9aa6b8'] },
  gym: { floor: 0.22, stand: 0.52, bow: 0, cap: 0.115, fronts: [16, 14, 12, 10, 8], depth: 2.5, rise: 0.78, pitch: 1, section: 0, tiers: [], arches: 0, boards: false, haze: '#3d3548', hazeMax: 0.15, seats: ['#c58b4f'] },
  hall: { floor: 0.12, stand: 0.74, bow: 0, cap: 0.095, fronts: [16, 14, 12, 10, 8, 6], depth: 1.6, rise: 0.75, pitch: 1, section: 13, tiers: [0.48], arches: 0, boards: false, haze: '#1d1222', hazeMax: 0.25, seats: ['#7a1f35', '#6a1a30'] },
  arena: { floor: 0.13, stand: 0.6, bow: 0.035, cap: 0.07, fronts: [16, 14, 12, 10, 8, 6, 5], depth: 1, rise: 0.8, pitch: 1, section: 14, tiers: [0.56], arches: 3, boards: true, haze: '#141826', hazeMax: 0.3, seats: ['#2a3a5e', '#30345a'] },
  stadium: { floor: 0.13, stand: 0.66, bow: 0.05, cap: 0.045, fronts: [16, 14, 12, 10, 8, 6, 5, 3], depth: 0.7, rise: 0.82, pitch: 1, section: 26, tiers: [0.5], arches: 4, boards: true, haze: '#141a2a', hazeMax: 0.36, seats: ['#2b3e66', '#34305a'] },
  bowl: { floor: 0.12, stand: 0.7, bow: 0.06, cap: 0.035, fronts: [12, 10, 8, 6, 5, 3, 2], depth: 0.5, rise: 0.85, pitch: 1, section: 28, tiers: [0.34, 0.68], arches: 5, boards: true, haze: '#121726', hazeMax: 0.44, seats: ['#2b3e66', '#34305a', '#2a4552'] },
};
/** The club's colours, for boards, banners and fascias. */
const CLUB = ['#e8792f', '#2e8c8a', '#4e7fb3', '#c2403f', '#3fa35b', '#7d4fa6', '#e36a8e', '#e7b53b', '#8a93a0'];
/** The roof or ceiling, as a fraction of height, over the venues that have one. */
const ROOF: Partial<Record<VenueId, number>> = { arena: 0.2, stadium: 0.13, bowl: 0.17 };

/** A row of the stand: its size, step, where its feet are (at the middle, and how they bow), and its sections. */
interface Row { size: CrowdSize; pitch: number; rise: number; lift: number; tier: number; shadow: boolean; aisle: number; section: number }
/** A venue laid out on a world: its rows, seats in fill order, and the lines its picture is drawn to. */
interface Plan {
  id: VenueId; W: number; H: number; cx: number;
  floorTop: number; board: number; standMax: number;
  rows: Row[]; seats: StadiumSeat[]; used: number;
  /** Height above the front at each tier's fascia, and the fascia's height. */
  breaks: { lift: number; h: number }[];
  /** Arches: a section's middle cut out of three rows. */
  arches: { x: number; w: number; row: number }[];
  bowAt(x: number): number;
  /** Where row `r`'s feet are at `x`. */
  feet(r: number, x: number): number;
}

// Far rows (5 and under) sit packed, head over head, with no seat showing between them.
const riseOf = (st: Style, s: number) => (s <= 5 ? s : Math.max(s - 3, Math.round(s * st.rise)));
const pitchOf = (st: Style, s: number) => Math.max(s, Math.round(s * st.pitch));

/**
 * Lays venue `id` out on a `W` × `H` world with front-row guys `front` pixels, for `count` people: rows
 * from the front up, shrinking with distance, until everyone has a seat or the stand is as tall as it
 * gets (on a canvas too small for that, up into the roof). With `countOnly`, just how many fit.
 */
function plan(id: VenueId, W: number, H: number, front: CrowdSize, count: number, countOnly: true, spill?: number, depth?: number): number;
function plan(id: VenueId, W: number, H: number, front: CrowdSize, count: number, countOnly?: false, spill?: number, depth?: number): Plan;
function plan(id: VenueId, W: number, H: number, front: CrowdSize, count: number, countOnly = false, spill = 0, depth = STYLES[id].depth): Plan | number {
  // Packed past that: one tier, no aisles or bow, every pixel of the stand a seat.
  const st = spill >= 3 ? { ...STYLES[id], tiers: [], section: 0, bow: 0, arches: 0 } : STYLES[id], cx = W / 2;
  const floorTop = spill >= 2 ? H : H - Math.round(H * st.floor), board = st.boards ? Math.max(2, Math.round(front * 0.35)) : 0;
  const standMax = H * st.stand, bowH = st.bow * Math.min(H, W * 9 / 16);
  const bowAt = (x: number) => { const u = (x - cx) / (W / 2); return bowH * Math.max(0, 1 - u * u); };
  const rows: Row[] = [], breaks: { lift: number; h: number }[] = [];
  // Rows from the front up: each a step back, smaller with distance, one size at most from the last.
  let lift = 0, at = LADDER.indexOf(front), tier = 0;
  const roof = spill ? 0 : (ROOF[id] ?? 0) * H, room = floorTop - board - bowH - roof - 2;
  for (let r = 0; r < (st.centred || 400); r++) {
    const want = depth ? front / (1 + lift / (depth * H)) : front;
    if (r > 0 && at < LADDER.length - 1 && Math.abs(Math.log(LADDER[at + 1] / want)) < Math.abs(Math.log(LADDER[at] / want))) at++;
    const size = LADDER[at];
    if (lift + size > Math.max(standMax, 0) && lift + size > room) break;
    if (lift + size > standMax && countOnly) break;
    const pitch = pitchOf(st, size), rise = riseOf(st, size);
    rows.push({ size, pitch, rise, lift, tier, shadow: false, aisle: Math.min(2, Math.max(1, Math.round(size * 0.25))), section: st.section });
    lift += rise;
    // A walkway between tiers: a fascia, and the upper tier's shadow over the two rows under it.
    if (tier < st.tiers.length && lift >= st.tiers[tier] * standMax) {
      const h = Math.max(3, Math.round(size * 0.6));
      breaks.push({ lift, h });
      rows.slice(-2).forEach(row => { row.shadow = true; });
      lift += h; tier++;
    }
  }
  const feet = (r: number, x: number) => floorTop - board - bowAt(x) - rows[r].lift;
  // Arches in the lower tier: through the middle of a few sections, three rows tall.
  const arches: Plan['arches'] = [];
  const lower = rows.filter(r => r.tier === 0).length;
  if (st.arches && lower >= 6 && !countOnly && rows[Math.max(1, Math.round(lower * 0.35))].size >= 6) {
    const row = Math.max(1, Math.round(lower * 0.35)), r0 = rows[row], secW = st.section * r0.pitch + r0.aisle;
    for (let v = 0; v < st.arches; v++) {
      const j = Math.round((W * (v + 0.5) / st.arches - cx) / secW);
      if (arches.some(a => a.x === j)) continue;
      arches.push({ x: j, w: 3, row });
    }
  }
  const seats: StadiumSeat[] = [];
  let n = 0;
  rows.forEach((row, r) => {
    if (n >= count && !countOnly) return;
    const s = row.size, p = row.pitch, odd = r % 2 === 1;
    const xs: number[] = [];
    if (st.centred) {
      // The porch: rows as even as they go, centred, each back face between two front ones.
      const per = Math.max(1, Math.floor((W - 4) / p)), left = Math.max(0, count - n), rowsLeft = Math.max(1, Math.ceil(left / per));
      const here = Math.min(per, Math.ceil(left / rowsLeft));
      const prev = seats.filter(q => q.row === r - 1).length;
      const shift = r > 0 && (prev - here) % 2 === 0 ? (r % 2 ? p / 2 : -p / 2) : 0;
      for (let i = 0; i < here; i++) xs.push(Math.round(cx + (i - (here - 1) / 2) * p - s / 2 + shift));
    } else if (row.section) {
      // Sections between stair aisles; odd rows one seat short and half a seat over, so faces sit between heads.
      const secW = row.section * p + row.aisle, inSec = odd ? row.section - 1 : row.section;
      const j0 = Math.floor((-cx) / secW) - 1, j1 = Math.ceil((W - cx) / secW) + 1;
      for (let j = j0; j <= j1; j++) {
        const left = cx + (j - 0.5) * secW + row.aisle / 2 + (odd ? p / 2 : 0);
        const arch = arches.find(a => a.x === j && r >= a.row && r < a.row + 2);
        for (let i = 0; i < inSec; i++) {
          if (arch && Math.abs(i - (inSec - 1) / 2) < arch.w / 2) continue;
          xs.push(Math.round(left + i * p + (p - s) / 2));
        }
      }
    } else {
      const start = cx - s / 2 + (odd ? p / 2 : 0), i0 = Math.ceil(-start / p), i1 = Math.floor((W - s - start) / p);
      for (let i = i0; i <= i1; i++) xs.push(Math.round(start + i * p));
    }
    for (const x0 of xs) {
      // Far guys shuffle a pixel this way or that, so a packed stand never sets into a grid.
      const j = s <= 5 ? ((r * 73856093) ^ (x0 * 19349663)) >>> 0 : 0, x = x0 + (j % 7 === 0 ? 1 : j % 7 === 1 ? -1 : 0);
      if (x < 0 || x + s > W) continue;
      const y = Math.round(feet(r, x0 + s / 2)) - s + (j % 5 === 2 ? 1 : j % 5 === 3 ? -1 : 0);
      if (y < 0) continue;
      n++;
      if (!countOnly) seats.push({ x, y, size: s, row: r });
    }
  });
  if (countOnly) return n;
  // Too many for the stand: up into the roof, then down over the floor, then packed, so nobody goes unseated if it can help it.
  if (seats.length < count && spill < 3) return plan(id, W, H, front, count, false, !spill && (ROOF[id] ?? 0) > 0 ? 1 : Math.max(2, spill + 1), depth);
  seats.sort((p, q) => p.row - q.row || Math.abs(p.x + p.size / 2 - cx) - Math.abs(q.x + q.size / 2 - cx) || p.x - q.x);
  const used = seats.length ? Math.min(rows.length, seats[Math.min(seats.length, count) - 1].row + 1) : 0;
  return { id, W, H, cx, floorTop, board, standMax, rows, seats, used, breaks, arches, bowAt, feet };
}

/** How many seats a venue has on a world at a front size: the same whatever the head count (but on the porch, whose rows centre on who's there), so a growing crowd works each out once. */
const seatCounts = new Map<string, number>();
function seatsAt(id: VenueId, W: number, H: number, front: CrowdSize, count: number, depth = STYLES[id].depth): number {
  if (STYLES[id].centred) return plan(id, W, H, front, count, true, 0, depth);
  const key = `${id} ${W} ${H} ${front} ${depth}`;
  let n = seatCounts.get(key);
  if (n === undefined) { if (seatCounts.size > 4000) seatCounts.clear(); seatCounts.set(key, n = plan(id, W, H, front, count, true, 0, depth)); }
  return n;
}

/**
 * How a venue sits on a canvas `devW` × `devH` device pixels for `count` people: whole device pixels to a
 * world pixel (never under one CSS pixel to one world pixel), and the front-row size, as big as the
 * venue allows while everyone still fits.
 */
function fit(id: VenueId, devW: number, devH: number, dpr: number, count: number) {
  const st = STYLES[id], cap = st.cap * devH / dpr, kCss = Math.max(1, Math.ceil(dpr - 1e-6));
  const fronts = [...st.fronts, ...LADDER.filter(s => s < st.fronts[st.fronts.length - 1])];
  // For each whole scale, the biggest front row that seats everyone (and isn't taller than the venue allows).
  const found: { k: number; front: CrowdSize; css: number }[] = [];
  for (let k = 1; k < kCss + 80; k++) {
    const W = Math.ceil(devW / k), H = Math.ceil(devH / k);
    if (H < 20 || fronts[fronts.length - 1] * k / dpr > cap) break;
    for (const front of fronts) {
      const css = front * k / dpr;
      if (css > cap) continue;
      if (seatsAt(id, W, H, front, count) >= count) { found.push({ k, front, css }); break; }
    }
  }
  // At a CSS pixel or more to a world pixel; only a crowd that would be specks there goes down to device
  // pixels, for the most detail. Nothing seats everyone: device pixels and the smallest guys, which seat the most.
  const css = found.filter(f => f.k >= kCss), faces = found.filter(f => f.front >= 5);
  const pool = css.some(f => f.front >= 5) ? css : faces.length ? faces : found;
  if (!pool.length) return { k: 1, front: fronts[fronts.length - 1], css: 0, depth: st.depth };
  // As big on screen as it goes, counting more of each guy's own pixels for more than size: a guy drawn
  // whole at 3 beats a smaller drawing of them at 4, and 14 at 3 beats 10 at 5.
  const score = (f: (typeof found)[number]) => f.css * Math.pow(f.front / 16, 1.5);
  const best = pool.reduce((b, f) => (score(f) > score(b) ? f : b));
  // Rows shrink going back only as fast as they must: a crowd with room to spare keeps its size further up, so it fills the stand.
  const W = Math.ceil(devW / best.k), H = Math.ceil(devH / best.k);
  let lo = st.depth, hi = st.depth * 24;
  if (st.depth) for (let i = 0; i < 7; i++) { const mid = (lo + hi) / 2; if (seatsAt(id, W, H, best.front, count, mid) >= count) lo = mid; else hi = mid; }
  return { ...best, depth: lo };
}

/** How many people a venue is laid out for while `count` are in: in steps of about 15%, so a growing crowd re-seats now and then. */
function stepFor(count: number): number {
  const i = VENUES.findIndex(v => count <= v.upTo), v = VENUES[i < 0 ? VENUES.length - 1 : i];
  if (i >= 0 && i <= 1) return Math.max(1, count);
  const lo = i < 0 ? VENUES[VENUES.length - 1].upTo : VENUES[i - 1].upTo + 1;
  let s = lo;
  while (s < count) s = Math.ceil(s * 1.15);
  return i < 0 ? s : Math.min(s, v.upTo);
}

/**
 * The seats of venue `id`, in the order they fill: the front row first, from the middle out, then the row
 * behind, so a part-full venue is full at the front. Laid out for a canvas (`width` × `height` CSS pixels
 * at `dpr`, 1280 × 720 at 1 unless given) and `count` people (the venue's size unless given), as a
 * stadium on that canvas lays it out.
 */
export function stadiumSeats(id: VenueId, options: { width?: number; height?: number; dpr?: number; count?: number } = {}): StadiumSeat[] {
  const dpr = options.dpr ?? 1, w = Math.round((options.width ?? 1280) * dpr), h = Math.round((options.height ?? 720) * dpr);
  const people = options.count ?? VENUES.find(v => v.id === id)!.upTo, count = venueFor(people) === id ? stepFor(people) : people;
  const f = fit(id, w, h, dpr, count);
  return plan(id, Math.ceil(w / f.k), Math.ceil(h / f.k), f.front, count, false, 0, f.depth).seats;
}

// ------------------------------------------------------------ painting

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** A picture at world pixels, painted by hand: rects, dithered washes and blends, all on whole pixels. */
class Pic {
  px: Uint32Array;
  constructor(public W: number, public H: number) { this.px = new Uint32Array(W * H); }
  private static seen = new Map<string, number>();
  static c(hex: string) {
    let c = Pic.seen.get(hex);
    if (c === undefined) { const n = parseInt(hex.slice(1, 7), 16); Pic.seen.set(hex, c = (255 << 24 | (n & 255) << 16 | (n >> 8 & 255) << 8 | n >> 16) >>> 0); }
    return c;
  }
  rect(x: number, y: number, w: number, h: number, hex: string, level = 16) {
    const c = Pic.c(hex), x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y)), x1 = Math.min(this.W, Math.round(x + w)), y1 = Math.min(this.H, Math.round(y + h));
    if (x1 <= x0) return;
    for (let j = y0; j < y1; j++) {
      if (level >= 16) { this.px.fill(c, j * this.W + x0, j * this.W + x1); continue; }
      // A dither takes the same columns every four, so only those are visited.
      for (let r = 0; r < 4; r++) if (BAYER[(j & 3) * 4 + r] < level) for (let i = x0 + ((r - x0) & 3); i < x1; i += 4) this.px[j * this.W + i] = c;
    }
  }
  dot(x: number, y: number, hex: string) { this.rect(x, y, 1, 1, hex); }
  /** Blends a rect toward a colour by `a`, for lines painted on a floor. */
  mix(x: number, y: number, w: number, h: number, hex: string, a: number) {
    const c = Pic.c(hex), x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y)), x1 = Math.min(this.W, Math.round(x + w)), y1 = Math.min(this.H, Math.round(y + h));
    for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) {
      const o = this.px[j * this.W + i];
      let out = 255 << 24;
      for (let s = 0; s < 24; s += 8) out |= Math.round((o >> s & 255) * (1 - a) + (c >> s & 255) * a) << s;
      this.px[j * this.W + i] = out >>> 0;
    }
  }
  /** Bands from `top` to `bottom` of colours, each dithered into the next. */
  bands(top: number, bottom: number, colours: string[]) {
    const h = bottom - top, n = colours.length;
    for (let j = Math.max(0, Math.floor(top)); j < Math.min(this.H, bottom); j++) {
      const u = (j - top) / h * (n - 1), i = Math.min(n - 2, Math.floor(u)), f = u - i;
      this.rect(0, j, this.W, 1, colours[i]);
      this.rect(0, j, this.W, 1, colours[i + 1], Math.round(f * 16));
    }
  }
  canvas(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.W; c.height = this.H;
    const g = c.getContext('2d')!, img = g.createImageData(this.W, this.H);
    img.data.set(new Uint8ClampedArray(this.px.buffer));
    g.putImageData(img, 0, 0);
    return c;
  }
}

const shades = new Map<string, string>();
/** A colour `f` of the way to white (or, below 0, to black), worked out once. */
const shade = (hex: string, f: number) => {
  const key = hex + f;
  let out = shades.get(key);
  if (out === undefined) { const n = parseInt(hex.slice(1, 7), 16); shades.set(key, out = '#' + [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f)))).toString(16).padStart(2, '0')).join('')); }
  return out;
};

/** The stand under the seats: a tread per row in the seat colour, a riser line under it, a seat back per seat, aisles and arches. */
function paintStand(pic: Pic, p: Plan, top: number) {
  const st = STYLES[p.id], { W } = p;
  // Runs of columns where the bow is level: every row's feet step at the same columns (a row's feet are a whole
  // number of pixels above the front's), so they are found once.
  const runs: number[] = [];
  for (let x = 0; x < W;) {
    const up = Math.round(-p.bowAt(x + 0.5));
    let e = x + 1;
    while (e < W && Math.round(-p.bowAt(e + 0.5)) === up) e++;
    runs.push(x, e, up);
    x = e;
  }
  for (let r = top - 1; r >= 0; r--) {
    const row = p.rows[r], seat = st.seats[Math.min(row.tier, st.seats.length - 1)], tread = shade(seat, -0.25), edge = shade(seat, -0.5), base = Math.round(p.feet(r, 0) + p.bowAt(0));
    for (let i = 0; i < runs.length; i += 3) {
      const x = runs[i], w = runs[i + 1] - x, feet = base + runs[i + 2];
      pic.rect(x, feet - row.rise, w, row.rise, tread);
      pic.rect(x, feet - 1, w, 1, edge);
    }
  }
  // A seat back behind every seat, so an empty one reads as a seat, not a gap.
  for (const s of p.seats) if (s.row < top) {
    const row = p.rows[s.row], seat = st.seats[Math.min(row.tier, st.seats.length - 1)], h = Math.max(1, Math.round(s.size * 0.45));
    pic.rect(s.x + (s.size > 4 ? 1 : 0), s.y + s.size - h - 1, Math.max(1, s.size - (s.size > 4 ? 2 : 0)), h, seat);
    if (s.size >= 6) pic.rect(s.x + 1, s.y + s.size - h - 1, s.size - 2, 1, shade(seat, 0.25));
  }
  // Stair aisles between sections, stepping in toward the middle as the rows go back, a rail post every few rows.
  for (let r = 0; r < top; r++) {
    const row = p.rows[r], secW = row.section * row.pitch + row.aisle;
    if (!row.section) continue;
    for (let j = Math.floor(-p.cx / secW) - 1; j <= Math.ceil((W - p.cx) / secW) + 1; j++) {
      const x = Math.round(p.cx + (j - 0.5) * secW - row.aisle / 2), feet = Math.round(p.feet(r, x));
      pic.rect(x, feet - row.rise, row.aisle, row.rise, shade(st.seats[0], 0.12));
      pic.rect(x, feet - 1, row.aisle, 1, shade(st.seats[0], -0.35));
      if (r % 3 === 1) pic.dot(x + row.aisle, feet - row.rise, '#aeb6c6');
    }
  }
  // Tunnels out of the lower tier: a dark arch in a concrete frame, two rows tall.
  for (const a of p.arches) {
    if (a.row + 1 >= top) continue;
    const r0 = p.rows[a.row], secW = r0.section * r0.pitch + r0.aisle, mid = Math.round(p.cx + a.x * secW), w = Math.round(a.w * r0.pitch) + 1;
    const bottom = Math.round(p.feet(a.row, mid)), topY = Math.round(p.feet(a.row + 1, mid) - p.rows[a.row + 1].rise), x = mid - (w >> 1), rim = shade(st.seats[0], 0.25);
    pic.rect(x - 1, topY - 1, w + 2, bottom - topY + 1, rim);
    pic.rect(x, topY, w, bottom - topY, '#0b0e18');
    pic.rect(x, topY, w, 1, '#141a28');
    pic.dot(x, topY, rim); pic.dot(x + w - 1, topY, rim);
  }
}

/** Tier fascias across the stand: a band in the club's colours with a light top edge, and its shadow on the rows under it. */
function paintBreaks(pic: Pic, p: Plan, top: number, dark: string) {
  p.breaks.forEach(b => {
    if (!p.rows.some((r, i) => i < top && r.lift > b.lift)) return;
    const bw = Math.max(16, Math.round(p.W / 14));
    for (let x = 0; x < p.W; x++) {
      const y = Math.round(p.floorTop - p.board - p.bowAt(x + 0.5) - b.lift - b.h);
      pic.rect(x, y, 1, b.h, dark);
      pic.rect(x, y, 1, 1, '#c9d1de');
      if (b.h >= 4) pic.rect(x, y + 2, 1, b.h - 3, CLUB[Math.floor(x / bw) % CLUB.length], 9);
    }
  });
}

/** Boards along the front in the club's colours, a straight segment each, and the floor under them. */
function paintBoards(pic: Pic, p: Plan, floor: (x: number, y: number, w: number) => void) {
  const bw = Math.max(16, Math.round(p.W / 12));
  for (let x0 = -((p.cx - bw / 2) % bw + bw) % bw; x0 < p.W; x0 += bw) {
    const y = Math.round(p.floorTop - p.board - p.bowAt(x0 + bw / 2));
    pic.rect(x0, y, bw, 1, '#c9d1de');
    pic.rect(x0, y + 1, bw, p.board - 1, CLUB[Math.floor((x0 + 4 * bw) / bw) % CLUB.length]);
    pic.rect(x0, y + p.board - 1, bw, 1, '#0b0e18');
    floor(x0, y + p.board, bw);
  }
}

/** Light hung along the top: a bank of bright cells, a dithered wash under it. */
function lightBank(pic: Pic, x: number, y: number, cell: number, cols: number, rows: number, wash: number, washTo: number, sky: string): { x: number; y: number } {
  const w = cols * (cell + 1) + 1, h = rows * (cell + 1) + 1;
  for (let b = 0; b < 3; b++) {
    const spread = (b + 1) * 0.5, level = [7, 4, 2][b];
    for (let j = y + h; j < washTo; j++) {
      const u = (j - y) / Math.max(1, washTo - y), half = w / 2 + (wash * spread) * u;
      pic.rect(x - half, j, half * 2, 1, shade(sky, 0.18), level);
    }
  }
  pic.rect(x - w / 2 - 1, y - 1, w + 2, h + 2, '#232838');
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const cx = Math.round(x - w / 2 + 1 + i * (cell + 1)), cy = y + 1 + j * (cell + 1);
    pic.rect(cx, cy, cell, cell, '#fff3c4');
    if (cell >= 3) pic.dot(cx + (cell >> 1), cy + (cell >> 1), '#ffffff');
  }
  return { x, y: y + h };
}

/**
 * A scoreboard centred on `cx` from `y`, at most `w` wide and `h` tall: a frame round two numbers in
 * blocky segments, sized from the digit (3 wide at least), two digits where four don't fit, none where
 * two don't. Returns the board's left edge and width.
 */
function scoreboard(pic: Pic, cx: number, y: number, w: number, h: number, c: string, frame: string): [number, number] {
  const dh = Math.max(5, Math.min(h - 4, 11)), t = dh >= 9 ? 2 : 1;
  const fits = (n: number) => Math.min(Math.floor(dh * 0.6), Math.floor((w - 4 - (n - 1) - (n > 2 ? 1 : 0)) / n));
  const n = fits(4) >= 3 ? 4 : fits(2) >= 3 ? 2 : 0, dw = n ? fits(n) : 0;
  const bw = n ? n * dw + (n - 1) + (n > 2 ? 1 : 0) + 4 : Math.min(w, 8), bh = dh + 4, x = Math.round(cx - bw / 2);
  pic.rect(x - 1, y - 1, bw + 2, bh + 2, frame);
  pic.rect(x, y, bw, bh, '#151a26');
  for (let i = 0; i < n; i++) {
    const dx = x + 2 + i * (dw + 1) + (n > 2 && i > 1 ? 1 : 0), on = [0b1110111, 0b0010010, 0b1011101, 0b1011011][(i * 3 + 1) % 4], half = Math.floor(dh / 2);
    const seg = [[0, 0, dw, t], [0, 0, t, half + 1], [dw - t, 0, t, half + 1], [0, half, dw, t], [0, half, t, dh - half], [dw - t, half, t, dh - half], [0, dh - t, dw, t]];
    seg.forEach(([sx, sy, sw, sh], k) => pic.rect(dx + sx, y + 2 + sy, sw, sh, on >> (6 - k) & 1 ? c : shade(c, -0.75)));
  }
  return [x, bw];
}

/** A sagging string of bulbs from `x0` to `x1`, each with a dithered glow; where each bulb hangs. */
function bulbs(pic: Pic, x0: number, x1: number, y: number, sag: number, every: number): { x: number; y: number }[] {
  const at: { x: number; y: number }[] = [];
  for (let x = Math.floor(x0); x <= x1; x++) { const u = (x - x0) / (x1 - x0); pic.dot(x, Math.round(y + 4 * sag * u * (1 - u)), '#14111a'); }
  let n = 0;
  for (let x = x0 + every / 2; x < x1; x += every, n++) {
    const u = (x - x0) / (x1 - x0), by = Math.round(y + 4 * sag * u * (1 - u)) + 1, c = ['#ffd45c', '#ff8a8a', '#8fd8ff', '#b7f28a'][n % 4];
    pic.rect(x - 1, by, 3, 2, shade(c, -0.5)); pic.rect(x, by - 1, 1, 4, shade(c, -0.5));
    pic.rect(x, by, 1, 2, c);
    at.push({ x, y: by + 2 });
  }
  return at;
}

/** Paints a venue's picture for its plan (everything behind the guys), and where its lights hang, for a spotlight. */
function paintVenue(p: Plan): { canvas: HTMLCanvasElement; lights: { x: number; y: number }[] } {
  const { W, H, id } = p, pic = new Pic(W, H), st = STYLES[id], lights: { x: number; y: number }[] = [];
  // Too small a canvas for a single row: the venue's wall alone.
  if (!p.rows.length) { pic.rect(0, 0, W, H, '#1d2333'); return { canvas: pic.canvas(), lights }; }
  // Empty benches above the people where a venue has them (bleachers, a gym's pull-outs), never past the stand's height.
  let top = Math.max(1, Math.min(p.rows.length, p.used));
  for (let extra = id === 'bleachers' ? 2 : id === 'gym' ? 1 : 0; extra > 0 && top < p.rows.length && p.rows[top].lift + p.rows[top].size <= p.standMax; extra--) top++;
  const r = top - 1, standTop = (x: number) => Math.round(p.feet(r, x) - p.rows[r].rise - (p.rows[r].size - p.rows[r].rise));
  const fr = Math.max(1, Math.round(H / 90));
  if (id === 'porch') {
    // A house's porch at night: lap siding, a lit window and a door behind the steps, string lights under the eave.
    pic.rect(0, 0, W, H, '#3b4a5e');
    for (let y = 0; y < H; y += Math.max(3, fr * 3)) { pic.rect(0, y, W, 1, '#2f3c4f'); pic.rect(0, y + 1, W, 1, '#45566c'); }
    const eave = Math.round(H * 0.11), winW = Math.round(W * 0.18), winH = Math.round(H * 0.22), wx = Math.round(W * 0.16), wy = Math.round(H * 0.24);
    pic.rect(wx - 4, wy - 4, winW + 8, winH + 8, '#4f5560'); pic.rect(wx - 2, wy - 2, winW + 4, winH + 4, '#6b6862');
    pic.rect(wx - 1, wy - 1, winW + 2, winH + 2, '#2a2230');
    pic.rect(wx, wy, winW, winH, '#ffd27a');
    pic.rect(wx, wy + winH - Math.round(winH * 0.3), winW, Math.round(winH * 0.3), '#f2b45a');
    pic.rect(wx + Math.round(winW / 2), wy, 1, winH, '#2a2230'); pic.rect(wx, wy + Math.round(winH / 2), winW, 1, '#2a2230');
    const dw = Math.round(W * 0.12), dx = Math.round(W * 0.68), dy = Math.round(H * 0.2);
    pic.rect(dx - 2, dy - 2, dw + 4, H, '#2b2433');
    pic.rect(dx, dy, dw, H, '#6b4a33');
    pic.rect(dx + 2, dy + 3, dw - 4, Math.round(H * 0.18), '#5a3d2a');
    pic.rect(dx + dw - 4, Math.round(H * 0.42), 2, 2, '#e7b53b');
    pic.rect(0, 0, W, eave, '#1c2238');
    pic.rect(0, eave - 2, W, 2, '#2a2230');
    pic.rect(0, eave, W, 1, '#5a4a3a');
    for (const px of [0, W - Math.max(3, Math.round(W * 0.025))]) { const pw = Math.max(3, Math.round(W * 0.025)); pic.rect(px, eave, pw, H, '#8a5f3e'); pic.rect(px + 1, eave, 1, H, '#a8794f'); }
    lights.push(...bulbs(pic, W * 0.03, W * 0.97, eave + 1, H * 0.05, Math.max(8, Math.round(W / 14))));
  } else if (id === 'bleachers') {
    // Dusk over a field: three bands of sky, a tree line, a scoreboard on a post.
    const horizon = Math.round(standTop(p.cx) + H * 0.03);
    pic.bands(0, horizon, ['#26284a', '#4a3a68', '#8a4f6e', '#e0876a']);
    for (let x = 0; x < W; x++) { const t = Math.round(H * 0.07 + (hash('tree' + Math.floor(x / 5)) % 7) + 3 * Math.sin(x / 9)); pic.rect(x, horizon - t, 1, H, '#1d2a2a'); }
    const sbx = Math.round(W * 0.87), sby = Math.round(H * 0.12);
    pic.rect(sbx - 1, sby, 2, horizon, '#2a2f3d');
    scoreboard(pic, sbx, sby, Math.round(W * 0.14), Math.round(H * 0.09), '#ff7a3c', '#2a2f3d');
  } else if (id === 'gym') {
    // A gym: block walls, high windows, banners in the club's colours, a scoreboard.
    pic.rect(0, 0, W, H, '#b3a891');
    for (let y = 0; y < H; y += 3 * fr) { pic.rect(0, y, W, 1, '#a39883'); for (let x = ((y / (3 * fr)) % 2) * 4 * fr; x < W; x += 8 * fr) pic.rect(x, y, 1, 3 * fr, '#a39883'); }
    const wallTop = Math.round(H * 0.04);
    pic.rect(0, 0, W, wallTop, '#2a2630');
    const winY = Math.round(H * 0.07), winH = Math.round(H * 0.1), n = Math.max(3, Math.round(W / 80)), ww = Math.round(W / n * 0.55);
    for (let i = 0; i < n; i++) {
      const x = Math.round((i + 0.5) * W / n - ww / 2);
      pic.rect(x - 1, winY - 1, ww + 2, winH + 2, '#4a4f5c'); pic.rect(x, winY, ww, winH, '#9ec3e6'); pic.rect(x, winY, ww, Math.round(winH / 3), '#b9d6f0');
      for (let m = 1; m < 3; m++) pic.rect(x + Math.round(ww * m / 3), winY, 1, winH, '#4a4f5c');
    }
    pic.rect(0, Math.round(H * 0.24), W, Math.max(2, fr * 2), '#2c3a5e');
    // Lamps on chains between the banners, over the stands.
    for (const u of [0.35, 0.65]) {
      const x = Math.round(W * u), lw = Math.max(5, Math.round(W * 0.03)) | 1, ly = wallTop + Math.max(3, Math.round(H * 0.06)), lh = Math.max(2, lw >> 1);
      pic.rect(x, 0, 1, ly, '#3a3640');
      for (let j = 0; j < lh; j++) { const half = (lw >> 1) - (lh - 1 - j); pic.rect(x - Math.max(1, half), ly + j, Math.max(1, half) * 2 + 1, 1, j ? '#3d4452' : '#5a6272'); }
      pic.rect(x - 1, ly + lh, 3, 1, '#fff3c4');
      for (let j = 1; j < 6; j++) pic.rect(x - j * 2, ly + lh + j, j * 4 + 1, 1, '#e7d9a8', 2);
      lights.push({ x, y: ly + lh + 1 });
    }
    [0.2, 0.5, 0.8].forEach((u, i) => {
      if (i === 1) { scoreboard(pic, Math.round(W * u), Math.round(H * 0.06), Math.round(W * 0.2), Math.round(H * 0.1), '#ff5a4a', '#0d0f16'); return; }
      const bw = Math.round(W * 0.07), bh = Math.round(H * 0.17), bx = Math.round(W * u - bw / 2), c = CLUB[i * 2];
      pic.rect(bx, wallTop, bw, bh, c); pic.rect(bx, wallTop + Math.round(bh * 0.25), bw, Math.max(1, fr), shade(c, 0.45));
      for (let k = 0; k < bw / 2; k++) pic.rect(bx + k, wallTop + bh + k * 0 , 1, Math.round(bw / 2 - k) * 0.6 + 1, c), pic.rect(bx + bw - 1 - k, wallTop + bh, 1, Math.round(bw / 2 - k) * 0.6 + 1, c);
      pic.rect(bx + bw / 2 - 1, wallTop + bh, 2, Math.round(bw * 0.3), '#b3a891');
    });
  } else if (id === 'hall') {
    // A theatre from its stage: a coffered ceiling and its chandeliers, plum walls between pilasters, sconces.
    pic.rect(0, 0, W, H, '#2e1c33');
    const ceil = Math.round(H * 0.08), cw = Math.max(6, Math.round(W / 18)), ch = Math.max(2, Math.round(ceil / 3));
    pic.rect(0, 0, W, ceil, '#1d1222');
    for (let x = Math.round(cw / 4); x < W; x += cw) for (let y = 2; y + ch <= ceil - 2; y += ch + 2) { pic.rect(x, y, cw - 3, ch, '#281830'); pic.rect(x, y + ch - 1, cw - 3, 1, '#35223c'); }
    pic.rect(0, ceil, W, Math.max(1, fr), '#b58a3a'); pic.rect(0, ceil + Math.max(1, fr), W, 1, '#6e5022');
    const n = Math.max(4, Math.round(W / 60)), wall = standTop(p.cx);
    for (let i = 0; i <= n; i++) {
      const x = Math.round(i * W / n), pw = Math.max(3, Math.round(W * 0.025));
      pic.rect(x - pw / 2, ceil + 2, pw, H, '#3a2440'); pic.rect(x - pw / 2, ceil + 2, 1, H, '#4a2f50');
      const sy = Math.round(ceil + (wall - ceil) * 0.62);
      if (sy + 4 < wall) { pic.rect(x - 3, sy - 2, 7, 6, '#4d3040'); pic.rect(x - 2, sy - 1, 5, 4, '#6a4045'); pic.rect(x - 1, sy, 3, 2, '#ffcf6b'); pic.dot(x, sy, '#fff6d8'); }
    }
    // Chandeliers from the ceiling, as big as the wall leaves room for.
    const room = wall - ceil - 4, cn = W > 260 ? 3 : 1;
    for (let i = 0; i < cn && room >= 6; i++) {
      const x = Math.round(W * (i + 0.5) / cn), cwid = Math.max(7, Math.min(Math.round(W * 0.07), room * 2)) | 1, drop = Math.max(2, Math.round(room * 0.3));
      const y = ceil + 2 + drop, half = cwid >> 1, th = Math.max(3, Math.round(cwid * 0.35));
      for (let j = -th * 2; j <= th * 2; j++) { const span = Math.round(cwid * Math.sqrt(Math.max(0, 1 - (j / (th * 2)) ** 2))); pic.rect(x - span, y + j, span * 2 + 1, 1, '#5a3a40', 3); }
      pic.rect(x, ceil + 2, 1, drop, '#8a6a2a');
      pic.rect(x - half, y, cwid, 1, '#d9a441'); pic.rect(x - half + 1, y + 1, cwid - 2, 1, '#8a6a2a');
      for (let c = -half; c <= half; c += 2) { pic.rect(x + c, y - 2, 1, 2, '#f2e6c8'); pic.dot(x + c, y - 3, '#ffd27a'); }
      for (let r = 0; r < th; r++) { const w2 = Math.max(1, half - r * 2); pic.rect(x - w2, y + 2 + r, w2 * 2 + 1, 1, r % 2 ? '#b58a3a' : '#e8d8b0'); }
      lights.push({ x, y: y + 2 + th });
    }
  } else {
    // Big venues: night sky or a ceiling, then a roof with floodlight banks or a hanging scoreboard.
    const roof = Math.round((ROOF[id] ?? 0.15) * H), sky = id === 'arena' ? '#0f121c' : '#0d1019';
    pic.bands(0, H, id === 'arena' ? ['#0c0f18', '#141826', '#161b2a'] : ['#0a0d16', '#111727', '#1a2033']);
    if (id === 'arena') {
      pic.rect(0, 0, W, roof, '#0c0f18');
      for (let x = 0; x < W; x++) { const u = x % 12; pic.dot(x, Math.round(roof * 0.3) + Math.abs(u - 6), '#1e2434'); pic.dot(x, Math.round(roof * 0.3), '#232a3b'); pic.dot(x, Math.round(roof * 0.3) + 6, '#232a3b'); }
      const sw = Math.round(W * 0.2), sh = Math.round(roof * 0.62), sx = Math.round(p.cx - sw / 2), sy = Math.round(roof * 0.18);
      pic.rect(sx + 3, 0, 1, sy, '#2a3042'); pic.rect(sx + sw - 4, 0, 1, sy, '#2a3042');
      pic.rect(sx, sy, sw, sh, '#232838');
      for (let i = 0; i < 2; i++) { const qx = sx + 2 + i * Math.floor((sw - 2) / 2), qw = Math.floor((sw - 2) / 2) - 2; pic.rect(qx, sy + 2, qw, sh - 4, '#0f2a4a'); pic.rect(qx, sy + 2, qw, 1, '#5fb4ff'); pic.rect(qx + 2, sy + 4, qw * 0.4, Math.max(2, sh * 0.25), '#ff7a5c', 10); pic.rect(qx + qw * 0.55, sy + 4, qw * 0.35, Math.max(2, sh * 0.25), '#ffd45c', 10); }
      pic.rect(sx, sy + sh, sw, 1, '#5fb4ff');
      [0.18, 0.82].forEach(u => lights.push(lightBank(pic, Math.round(W * u), Math.round(roof * 0.45), Math.max(1, Math.round(Math.min(H, W * 9 / 16) * 0.008)), 3, 1, W * 0.05, standTop(W * u), sky)));
    } else {
      const banks = id === 'bowl' ? 6 : 4, cell = Math.max(1, Math.round(Math.min(H, W * 9 / 16) * 0.009)), bh = 2 * (cell + 1) + 1;
      // The stadium's roof is a cantilever with the night sky over it; the bowl's closes over the top, screens in its corners.
      const from = id === 'stadium' ? Math.round(roof * 0.45) : 0;
      // Each bank hangs under the roof's edge, or higher where the stand's back wall reaches up past it, so it always shows.
      const bankY = (x: number) => Math.max(from + 1, Math.min(roof + 1, standTop(x) - Math.max(2, fr * 2) - bh - 2));
      const bankAt = Array.from({ length: banks }, (_, i) => { const x = Math.round(W * (i + 0.5) / banks); return { x, y: bankY(x) }; });
      for (const b of bankAt) lights.push(lightBank(pic, b.x, b.y, cell, 4, 2, W * 0.06, standTop(b.x), sky));
      if (from) for (let i = 0; i < W * from / 40; i++) { const h = hash('star' + i); pic.dot(h % W, (h >> 12) % from, i % 5 ? '#3a4466' : '#c9d1de'); }
      pic.rect(0, from, W, roof - from, '#151a28');
      for (let y = from + 3; y < roof - 4; y += 5) pic.rect(0, y, W, 1, '#1a2030');
      for (let x = Math.round(W / 48); x < W; x += Math.max(4, Math.round(W / 24))) pic.rect(x, from, 1, roof - 3 - from, '#1e2536');
      if (id === 'bowl') for (const u of [0.035, 0.785]) {
        const sw = Math.round(W * 0.18), sh = Math.round(Math.min(roof * 0.5, W * 0.06)), sx = Math.round(W * u), sy = Math.round(roof * 0.18);
        pic.rect(sx - 1, sy - 1, sw + 2, sh + 2, '#2a3042'); pic.rect(sx, sy, sw, sh, '#0f2a4a'); pic.rect(sx, sy, sw, 1, '#5fb4ff');
        for (let i = 0; i < 6; i++) pic.rect(sx + 2 + i * Math.floor((sw - 4) / 6), sy + 3, Math.floor((sw - 4) / 6) - 1, sh - 6, CLUB[(i + (u > 0.5 ? 3 : 0)) % CLUB.length], 10);
      }
      for (let x = 0; x < W; x++) { const u = x % 8; pic.dot(x, roof - 3 + (u < 4 ? 0 : 0), '#2d3448'); pic.dot(x, roof - 1, '#3a4258'); pic.dot(x, roof - 3 + Math.round(Math.abs(u - 4) / 2), '#3d4560'); }
      // The banks again, over the roof's edge lines.
      for (const { x, y } of bankAt) {
        const w = 4 * (cell + 1) + 1;
        pic.rect(x - w / 2 - 1, y - 2, w + 2, bh + 2, '#232838');
        for (let j = 0; j < 2; j++) for (let q = 0; q < 4; q++) { const bx = Math.round(x - w / 2 + 1 + q * (cell + 1)), by = y - 1 + j * (cell + 1); pic.rect(bx, by, cell, cell, '#fff3c4'); if (cell >= 3) pic.dot(bx + (cell >> 1), by + (cell >> 1), '#ffffff'); }
      }
    }
  }
  // The stand: its back wall above the top row, then the rows.
  const wallC = id === 'porch' ? '#4a3a32' : id === 'bleachers' ? '#3a4152' : id === 'gym' ? '#7a5634' : id === 'hall' ? '#3a1c2a' : '#1d2333';
  const wallTopC = shade(wallC, 0.3);
  if (!st.centred && id !== 'bleachers') for (let x = 0; x < W; x++) {
    const y = standTop(x) - Math.max(2, fr * 2), y1 = Math.round(p.feet(r, x + 0.5)) - p.rows[r].rise;
    pic.rect(x, y, 1, y1 - y, wallC); pic.dot(x, y, wallTopC);
  }
  if (id === 'porch') {
    // Steps: a tread and a riser each, the rows standing on them.
    const steps = Math.max(2, p.used);
    for (let s = steps - 1; s >= 0; s--) {
      const row = p.rows[Math.min(s, p.rows.length - 1)], feet = Math.round(p.feet(Math.min(s, p.rows.length - 1), p.cx)), tread = Math.max(2, Math.round(row.size * 0.18));
      pic.rect(0, feet - tread, W, H, '#7a5234');
      pic.rect(0, feet - tread, W, tread, '#a0714a'); pic.rect(0, feet - tread, W, 1, '#c08a5c');
      pic.rect(0, feet, W, H, '#6b4a33');
    }
    const ground = p.floorTop;
    pic.rect(0, ground, W, H - ground, '#24301f');
    for (let x = 0; x < W; x++) if (hash('g' + x) % 3 === 0) pic.dot(x, ground, '#2f3d28');
    pic.rect(p.cx - W * 0.12, ground, W * 0.24, H - ground, '#5a5550'); pic.rect(p.cx - W * 0.12, ground, W * 0.24, 1, '#6e6862');
    return { canvas: pic.canvas(), lights };
  }
  if (id === 'bleachers') {
    // Aluminium planks: a light top, a darker face, a shadow gap; legs and braces under the front.
    for (let r = top - 1; r >= 0; r--) {
      const row = p.rows[r], feet = Math.round(p.feet(r, p.cx)), plank = Math.max(2, Math.round(row.size * 0.2));
      pic.rect(0, feet - row.rise, W, row.rise, '#262b38');
      pic.rect(0, feet - plank, W, plank, '#9aa6b8'); pic.rect(0, feet - plank, W, 1, '#d7dde6'); pic.rect(0, feet - 1, W, 1, '#5d6778');
    }
    const front = Math.round(p.feet(0, p.cx)), leg = Math.max(8, Math.round(W / 10));
    for (let x = Math.round(leg / 2); x < W; x += leg) { pic.rect(x, front, 2, p.floorTop - front, '#5d6778'); for (let j = 0; j < p.floorTop - front; j++) pic.dot(x + 2 + Math.round(j * 0.8), front + j, '#4c566b'); }
    pic.rect(0, p.floorTop, W, H - p.floorTop, '#2f7a43');
    for (let x = 0; x < W; x++) if (Math.floor(x / Math.max(10, W / 16)) % 2) pic.rect(x, p.floorTop, 1, H, '#2a7040');
    pic.mix(0, p.floorTop + Math.round((H - p.floorTop) * 0.4), W, 1, '#ffffff', 0.7);
    return { canvas: pic.canvas(), lights };
  }
  if (id === 'gym') {
    // Pull-out bleachers: wood planks, a tread line and a darker riser each.
    for (let r = top - 1; r >= 0; r--) {
      const row = p.rows[r], feet = Math.round(p.feet(r, p.cx)), plank = Math.max(2, Math.round(row.size * 0.22));
      pic.rect(0, feet - row.rise, W, row.rise, '#8f5f33');
      pic.rect(0, feet - plank, W, plank, '#c58b4f'); pic.rect(0, feet - plank, W, 1, '#e0b07a');
    }
    const front = Math.round(p.feet(0, p.cx));
    pic.rect(0, front, W, p.floorTop - front, '#5a3b22');
    // A hardwood court: planks in two close tones, lines in white at 60%.
    for (let y = p.floorTop; y < H; y++) pic.rect(0, y, W, 1, Math.floor((y - p.floorTop) / Math.max(2, fr * 2)) % 2 ? '#c08950' : '#c9925a');
    for (let y = p.floorTop; y < H; y += Math.max(2, fr * 2)) for (let x = (hash('s' + y) % 40); x < W; x += 40) pic.dot(x, y, '#a8743f');
    const line = (x: number, y: number, w: number, h: number) => pic.mix(x, y, w, h, '#ffffff', 0.6);
    const sy = p.floorTop + Math.max(2, fr * 2);
    line(0, sy, W, 1); line(p.cx, sy, 1, H - sy);
    const rx = Math.round(W * 0.1), ry = Math.max(4, Math.round((H - sy) * 0.45));
    for (let a = 0; a <= 180; a += 0.5) { const t = a * Math.PI / 180; line(Math.round(p.cx + Math.cos(t) * rx), Math.round(sy + Math.sin(t) * ry), 1, 1); }
    for (const kx of [Math.round(W * 0.06), Math.round(W * 0.82)]) { line(kx, sy, Math.round(W * 0.12), 1); line(kx, sy, 1, H - sy); line(kx + Math.round(W * 0.12), sy, 1, H - sy); }
    return { canvas: pic.canvas(), lights };
  }
  paintStand(pic, p, top);
  if (id === 'hall') {
    // A theatre rake: velvet rows with a seat-back line each, lit aisle steps, a balcony with gold trim.
    for (let r = 0; r < top; r++) {
      const row = p.rows[r], feet = Math.round(p.feet(r, p.cx));
      pic.rect(0, feet - row.rise, W, 1, '#e0675a'); pic.rect(0, feet - row.rise + 1, W, Math.max(1, Math.round(row.size * 0.15)), '#8c2a3c');
    }
    p.breaks.forEach(b => {
      if (!p.rows.some((r, i) => i < top && r.lift > b.lift)) return;
      const y = Math.round(p.floorTop - p.board - b.lift - b.h);
      pic.rect(0, y, W, b.h, '#4a1f2e'); pic.rect(0, y, W, 1, '#d9a441'); pic.rect(0, y + b.h - 1, W, 1, '#8a6a2a');
      for (let x = 2; x < W; x += 6) pic.dot(x, y + (b.h >> 1), '#d9a441');
      pic.rect(0, y + b.h, W, Math.max(1, Math.round(b.h * 0.5)), '#2a1220');
    });
    for (let r = 0; r < top; r++) {
      const row = p.rows[r], secW = row.section * row.pitch + row.aisle;
      if (row.section) for (let j = Math.floor(-p.cx / secW) - 1; j <= Math.ceil((W - p.cx) / secW) + 1; j++) { const x = Math.round(p.cx + (j - 0.5) * secW - row.aisle / 2), feet = Math.round(p.feet(r, x)); pic.rect(x, feet - row.rise, row.aisle, row.rise, '#3a2a30'); pic.dot(x, feet - 1, '#ffd27a'); }
    }
    const lip = p.floorTop;
    pic.rect(0, lip, W, H - lip, '#3a2a22');
    for (let y = lip + 2; y < H; y += Math.max(2, fr * 2)) pic.rect(0, y, W, 1, '#33241d');
    pic.rect(0, lip, W, 1, '#f2d6a0');
    for (let x = Math.round(W / 32); x < W; x += Math.max(4, Math.round(W / 16))) { pic.rect(x - 3, lip - 2, 7, 4, '#ffd27a', 4); pic.rect(x - 1, lip, 3, 1, '#ffd27a'); pic.dot(x, lip, '#fff6d8'); }
    return { canvas: pic.canvas(), lights };
  }
  paintBreaks(pic, p, top, '#161b29');
  // The floor: a court or a pitch, mown in stripes, with a touchline and the light pooled on it.
  const pitch = id === 'arena' ? '#1d4f8a' : '#1f6b3e', stripe = id === 'arena' ? '#1b4a82' : '#237646';
  paintBoards(pic, p, (x, y, w) => {
    const sw = Math.max(12, W / 24);
    for (let i = x; i < x + w;) { const band = Math.floor(i / sw), e = Math.min(x + w, Math.ceil((band + 1) * sw)); pic.rect(i, y, e - i, H - y, band % 2 ? stripe : pitch); i = e; }
  });
  const touch = Math.round(p.floorTop + (H - p.floorTop) * 0.3);
  pic.mix(0, touch, W, 1, '#ffffff', 0.7);
  pic.mix(p.cx, touch, 1, H - touch, '#ffffff', 0.7);
  const rx = Math.round(W * 0.09), ry = Math.max(3, Math.round((H - touch) * 0.6));
  for (let a = 0; a <= 180; a += 0.4) { const t = a * Math.PI / 180; pic.mix(Math.round(p.cx + Math.cos(t) * rx), Math.round(touch + Math.sin(t) * ry), 1, 1, '#ffffff', 0.7); }
  if (id !== 'arena') {
    // Light pooled on the grass under each bank.
    const banks = id === 'bowl' ? 6 : 4, cy = (p.floorTop + H) / 2, ry = (H - p.floorTop) / 2;
    for (let i = 0; i < banks; i++) for (let y = Math.ceil(p.floorTop); y < H; y++) {
      const half = W * 0.06 * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2));
      pic.rect(W * (i + 0.5) / banks - half, y, half * 2, 1, '#3a9a58', 4);
    }
  }
  return { canvas: pic.canvas(), lights };
}

// ------------------------------------------------------------ the stadium on a canvas

export interface StadiumOptions {
  /** A slow wave round the stands. */
  wave?: boolean;
  /** Called when the crowd moves to a bigger (or smaller) venue. */
  onVenue?: (id: VenueId) => void;
  /** The pixel font for a spotlit guy's name, as a CSS font. */
  font?: string;
}

export interface Stadium {
  /** Seats a guy by name (lowercased, once), in their club look when given. The venue grows to fit. */
  add(name: string, guy?: Partial<GuySpec>): void;
  /** Takes a guy out; the venue shrinks again if it can. */
  remove(name: string): void;
  has(name: string): boolean;
  /** Makes a guy hop, as when they guess. */
  hop(name: string): void;
  wave(on: boolean): void;
  /** Lifts a guy out of their seat, big, with a line under them, for `ms`. */
  spotlight(name: string, label?: string, ms?: number): void;
  resize(): void;
  destroy(): void;
  readonly count: number;
  readonly venue: VenueId;
}

/**
 * A stadium on `canvas` (sized with CSS). Guys are seated best seats first in the order they arrive; as
 * the crowd grows the venue is laid out again for it (and changes when it outgrows one), guys sliding to
 * their new seats, or in a big crowd the old picture fading out under the new.
 */
export function createStadium(canvas: HTMLCanvasElement, options: StadiumOptions = {}): Stadium {
  let venue: VenueId = 'porch', laidFor = 1;
  const free: number[] = [];
  let next = 0;
  // The scene for the canvas and the people in now.
  function build(devW: number, devH: number, dpr: number): Scene {
    const id = venueFor(laidFor), f = fit(id, devW, devH, dpr, laidFor), W = Math.ceil(devW / f.k), H = Math.ceil(devH / f.k);
    const p = plan(id, W, H, f.front, laidFor, false, 0, f.depth), st = STYLES[id];
    const rows: number[][] = [];
    p.seats.forEach((s, i) => { (rows[s.row] ??= []).push(i); });
    const order = Array.from(rows, r => (r ?? []).sort((a, b) => p.seats[a].x - p.seats[b].x)).reverse();
    // Haze in four steps back through the stand, and the upper tiers' shadow over the rows under them.
    const tints: Tint[] = [];
    for (let b = 0; b < 8; b++) tints.push({ toward: st.haze, amount: st.hazeMax * (b % 4) / 3, shade: b >= 4 ? 0.2 : 0 });
    const bands = new Uint8Array(p.seats.length);
    p.seats.forEach((s, i) => { const row = p.rows[s.row]; bands[i] = Math.min(3, Math.floor(row.lift / Math.max(1, p.standMax) * 4)) + (row.shadow ? 4 : 0); });
    const scene: Scene = {
      width: W, height: H, k: f.k, ox: Math.floor((devW - W * f.k) / 2), oy: devH - H * f.k,
      seats: p.seats, rows: order, bands, tints, backdrop: null, lights: [],
      // The venue is painted when first needed: a big crowd's re-seat paints it in a frame of its own.
      later: () => { const venue = paintVenue(p); scene.lights = venue.lights; return venue.canvas; },
      pitch: p.rows[0]?.pitch ?? 8, shadow: '#0b0e18',
      // From the arena up, the wave is a tenth of the stand wide, so it reads as a swathe.
      wave: id === 'arena' || id === 'stadium' || id === 'bowl' ? W * 0.1 : undefined,
    };
    return scene;
  }
  const render = createRender(canvas, { build, font: options.font, wave: options.wave, beforeFrame: () => { if (due) regrow(); } });
  /** Lays the venue out again when the crowd has grown or shrunk past a step, everyone re-seated in the order they sit. */
  let due = false;
  function regrow() {
    due = false;
    const n = render.guys.size, want = stepFor(n);
    if (want === laidFor) return;
    render.relayout(n > 300 ? 'fade' : 'slide', () => {
      laidFor = want;
      const seated = [...render.guys.values()].sort((a, b) => (a.seat < 0 ? 1e9 : a.seat) - (b.seat < 0 ? 1e9 : b.seat) || a.joined - b.joined);
      seated.forEach((g, i) => { g.seat = i; });
      free.length = 0; next = seated.length;
    });
  }
  /** The crowd passed a step: the venue is laid out again at the next frame, once however many come before it; the venue's name changes now. */
  function grown() {
    due = true;
    render.wake();
    const now = venueFor(Math.max(1, render.guys.size));
    if (now !== venue) { venue = now; options.onVenue?.(venue); }
  }
  return {
    add(name, guy = {}) {
      const key = name.toLowerCase();
      if (render.guys.has(key)) return;
      const spec = { ...guy, seed: guy.seed ?? key } as GuySpec;
      const before = stepFor(render.guys.size + 1) !== laidFor;
      render.join(key, spec, before ? next : (free.length ? free.shift()! : next++), !before);
      if (before) { next++; grown(); }
    },
    remove(name) {
      const g = render.guys.get(name.toLowerCase());
      if (!g) return;
      render.leave(g);
      if (g.seat >= 0) { let i = 0; while (i < free.length && free[i] < g.seat) i++; free.splice(i, 0, g.seat); }
      if (stepFor(render.guys.size) !== laidFor) grown();
    },
    has: name => render.guys.has(name.toLowerCase()),
    hop(name) { const g = render.guys.get(name.toLowerCase()); if (g) render.hop(g); },
    wave(on) { render.wave(on); },
    spotlight(name, label, ms = 2600) { const g = render.guys.get(name.toLowerCase()); if (g) render.spotlight(g, label ?? name, ms); },
    resize() { render.resize(); },
    destroy() { render.destroy(); },
    get count() { return render.guys.size; },
    get venue() { return venue; },
  };
}

export type { Guy };
