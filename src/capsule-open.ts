/**
 * A capsule opening, played the same in every game and on the lil guys site: the capsule drops in and
 * bounces (or starts still), rocks, its seam cracks and light leaks out in the colour of what's inside,
 * the dome pops off in a burst of pixel rays and sparks, and what's inside rises out and settles over
 * the open half.
 *
 * The build-up tells the grade, as the site's reel does. An Everyday copy pops in about a second; a
 * Special a little later; Prized and up rock more, leak light sooner and burst bigger; Mythic, Grail
 * and Aura most of all, an aura in its own colours. A showpiece or a copy with an unusual effect plays
 * at least as a Prized. With nothing inside it opens to the capsule's own light, for a "you earned a
 * capsule" moment, its toy still standing in the candy.
 *
 * It's the capsule's 64 master on a 96 by 96 stage (room above for the burst and what rises out), the
 * light and sparks in the toy's two-pixel cells, at whole-number scales. It plays once and ends on a
 * still hold frame. Motion plays whatever the device's reduced-motion setting says.
 */
import { FRAME_HEIGHT, FRAME_SLOTS, type AnimationFrame } from './animate';
import { auraColors } from './auras';
import { bakeGuy } from './bake';
import { capsuleById, capsuleLayers, type Capsule, type Pose, type Show } from './capsule';
import { buddyAlone, compose } from './compose';
import { applyFx } from './effects';
import { upscale, type Frames } from './gif';
import { ART_VERSION } from './guy-code';
import { hash } from './hash';
import { dress, itemById, withItems } from './items';
import { lilGuysHost } from './kit';
import { encode, GRADES, gradeOf, slotOf, unusual, type Owned } from './owned';
import { paint } from './paint';
import { paletteOf } from './palette';
import { LAYER } from './parts/art';
import { resolve } from './resolve';
import { shineFrame } from './shine';
import type { AvatarConfig } from './types';

type RGB = [number, number, number];
const WHITE: RGB = [255, 255, 255];
const rgb = (s: string): RGB => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const blend = (a: RGB, b: RGB, t: number): RGB => a.map((v, i) => Math.round(v + (b[i] - v) * t)) as RGB;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const DEG = Math.PI / 180;

// ------------------------------------------------------------ the stage

/** The open's stage at 1×, square: the capsule's 64 master at its foot, room above for the burst and what comes out. */
export const CAPSULE_OPEN_SIZE = 96;
const S = CAPSULE_OPEN_SIZE;
/** The capsule's 64 square on the stage, its foot on the stage's; its middle, its round, and the middle of the candy's rim. */
const AT_X = 16, AT_Y = 32, C = 31.5, R = 29.5, MOUTH_X = 48, MOUTH_Y = 62;
/** The light and sparks are drawn in the toy's cells, two pixels square, so nothing is ever a lone pixel. */
const CELL = 2;
/** Where what comes out stands over the open half: the bottom of the item itself, sitting just over the rim. */
const HOVER = 58;

/** A stage's pixels, each layer laid over what's there as the capsule's halves are stacked. */
class Stage {
  d = new Uint8ClampedArray(S * S * 4);
  put(x: number, y: number, r: number, g: number, b: number, a: number) {
    if (x < 0 || y < 0 || x >= S || y >= S || !a) return;
    const d = this.d, i = (y * S + x) * 4, sa = a / 255, da = d[i + 3] / 255, out = sa + da * (1 - sa);
    d[i] = Math.round((r * sa + d[i] * da * (1 - sa)) / out);
    d[i + 1] = Math.round((g * sa + d[i + 1] * da * (1 - sa)) / out);
    d[i + 2] = Math.round((b * sa + d[i + 2] * da * (1 - sa)) / out);
    d[i + 3] = Math.round(out * 255);
  }
  /** A `w` by `h` picture with its top left at `x`, `y`; rows from `below` down left out (what's still inside the candy). */
  over(src: Uint8ClampedArray, w: number, h: number, x: number, y: number, below = Infinity) {
    for (let sy = 0; sy < h; sy++) {
      const ty = y + sy;
      if (ty < 0 || ty >= S || ty >= below) continue;
      for (let sx = 0; sx < w; sx++) {
        const i = (sy * w + sx) * 4;
        if (src[i + 3]) this.put(x + sx, ty, src[i], src[i + 1], src[i + 2], src[i + 3]);
      }
    }
  }
  /** One cell of light, solid, on the stage's grid of cells. */
  cell(x: number, y: number, c: RGB) {
    const cx = Math.floor(x / CELL) * CELL, cy = Math.floor(y / CELL) * CELL;
    for (let dy = 0; dy < CELL; dy++) for (let dx = 0; dx < CELL; dx++) this.put(cx + dx, cy + dy, c[0], c[1], c[2], 255);
  }
  /** A spark: a cell, or a plus of five. */
  spark(x: number, y: number, c: RGB, big: boolean) {
    this.cell(x, y, c);
    if (big) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) this.cell(x + dx * CELL, y + dy * CELL, c);
  }
  /** A line of cells from `r0` to `r1` out from `x`, `y` at angle `a`, coloured by how far along `length` it is. */
  ray(x: number, y: number, a: number, r0: number, r1: number, length: number, colours: RGB[]) {
    const seen = new Set<number>();
    for (let r = Math.max(0, r0); r <= r1; r += 1) {
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r, key = Math.floor(px / CELL) * 1000 + Math.floor(py / CELL);
      if (seen.has(key)) continue;
      seen.add(key);
      this.cell(px, py, colours[Math.min(colours.length - 1, Math.floor((r / Math.max(1, length)) * colours.length))]);
    }
  }
}

/** Pixels left with one neighbour or none (a dome's sliver at the stage's edge) are taken out, so nothing reads as a speck. */
function despeckle(d: Uint8ClampedArray) {
  const lit = (x: number, y: number) => x >= 0 && y >= 0 && x < S && y < S && d[(y * S + x) * 4 + 3] > 0;
  for (let pass = 0; pass < 12; pass++) {
    const gone: number[] = [];
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      if (!lit(x, y)) continue;
      let n = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) if (lit(x + dx, y + dy)) n++;
      if (n <= 1) gone.push((y * S + x) * 4);
    }
    if (!gone.length) return;
    for (const i of gone) d.fill(0, i, i + 4);
  }
}

/** A seeded run of numbers in [0, 1), so an open plays the same every time it's drawn. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ------------------------------------------------------------ how big it plays

/** How big an open plays for a copy: its grade (0 Everyday to 5 Aura), a showpiece or an unusual effect at least Prized; null with nothing inside. */
export function capsuleOpenTier(copy?: Owned): number | null {
  if (!copy) return null;
  const grade = GRADES.findIndex(g => g.id === gradeOf(copy).id);
  return Math.max(grade, unusual(copy) ? 2 : 0);
}

/**
 * Each tier's build-up and burst. `rocks`: each rock's furthest turn in degrees, its step in ms and
 * how much light leaks through it (0 none, 1 the whole dome lit); `beat` the pause between rocks as
 * the light swells; `tremble` quick shakes before the crack; `crack` each frame of the dome lifting.
 * Then the burst: rays, how far they reach, sparks, rings, falling glitter, the fan of light left
 * behind what rose out, and the twinkles round it.
 */
interface Build {
  rest: number;
  rocks: [deg: number, step: number, leak: number][];
  beat: number;
  tremble: number;
  crack: number[];
  rays: number;
  reach: number;
  sparks: number;
  rings: number;
  rain: number;
  fan: number;
  stars: number;
  rise: number;
}
const BUILDS: Build[] = [
  // Everyday: one rock, a quick crack, a small pop.
  { rest: 220, rocks: [[10, 40, 0]], beat: 0, tremble: 0, crack: [90, 110], rays: 6, reach: 20, sparks: 6, rings: 0, rain: 0, fan: 0, stars: 0, rise: 300 },
  // Special: a second rock that lets a little light out.
  { rest: 240, rocks: [[11, 40, 0], [12, 40, 0.25]], beat: 80, tremble: 0, crack: [100, 120], rays: 8, reach: 26, sparks: 10, rings: 0, rain: 0, fan: 0, stars: 0, rise: 320 },
  // Prized: light from the first rock, three of them, a ring and a fan of light behind it.
  { rest: 250, rocks: [[11, 40, 0.15], [13, 40, 0.35], [14, 40, 0.55]], beat: 120, tremble: 0, crack: [100, 110, 130], rays: 10, reach: 32, sparks: 16, rings: 1, rain: 0, fan: 6, stars: 2, rise: 340 },
  // Mythic: four rocks, faster as they go, a tremble, a full burst all round.
  { rest: 260, rocks: [[12, 40, 0.2], [13, 40, 0.4], [14, 30, 0.6], [14, 30, 0.75]], beat: 140, tremble: 6, crack: [110, 120, 140], rays: 12, reach: 38, sparks: 22, rings: 1, rain: 0, fan: 8, stars: 3, rise: 360 },
  // Grail: gold, longer, two rings and a rain of glitter.
  { rest: 270, rocks: [[12, 40, 0.2], [13, 40, 0.35], [14, 30, 0.5], [15, 30, 0.65], [15, 30, 0.8]], beat: 150, tremble: 8, crack: [120, 130, 150, 170], rays: 14, reach: 44, sparks: 28, rings: 2, rain: 14, fan: 10, stars: 4, rise: 400 },
  // Aura: the longest, in the aura's own colours.
  { rest: 280, rocks: [[12, 40, 0.2], [13, 40, 0.35], [14, 30, 0.5], [15, 30, 0.65], [16, 30, 0.8], [16, 30, 0.9]], beat: 160, tremble: 10, crack: [130, 140, 160, 180], rays: 16, reach: 46, sparks: 32, rings: 2, rain: 18, fan: 12, stars: 5, rise: 440 },
];

/** The light an open plays in: the bright core, the middle and the deep edge, and the sparks' colours. */
interface Light { hot: RGB; mid: RGB; deep: RGB; sparks: RGB[] }

const WARM: Light = { hot: [255, 248, 222], mid: [255, 210, 112], deep: [255, 178, 72], sparks: [] };
const GOLD: Light = { hot: rgb('#fff3c4'), mid: rgb('#f7c23e'), deep: rgb('#d4961f'), sparks: ['#fff3c4', '#ffd45a', '#e4ae39', '#b07818'].map(rgb) };

function lightOf(capsule: Capsule, copy: Owned | undefined, tier: number | null): Light {
  if (tier === null) {
    // Nothing inside: the capsule's own warm light, its sparks in its own colour.
    const own = rgb(capsule.colour);
    return { ...WARM, deep: blend(own, WARM.deep, 0.35), sparks: [WARM.hot, WARM.mid, own, blend(own, WHITE, 0.4)] };
  }
  if (tier === 4) return GOLD;
  if (tier === 5 && copy && slotOf(copy) === 'aura') {
    const own = auraColors(copy.item, copy.finish, copy.print).map(rgb), teal = rgb(GRADES[5].color);
    const mid = own[0], deep = own[1] ?? teal;
    return { hot: blend(mid, WHITE, 0.6), mid, deep, sparks: [...own, teal, blend(mid, WHITE, 0.6)] };
  }
  const g = rgb(GRADES[tier].color), hot = blend(g, WHITE, 0.8), mid = blend(g, WHITE, 0.42);
  return { hot, mid, deep: g, sparks: [hot, mid, g, WHITE] };
}

// ------------------------------------------------------------ what comes out

/** What rises out of the capsule: `w` by `h` stage pixels, drawn at `ms` into its own clock; `foot` the rows under the item itself. */
interface Art { w: number; h: number; foot: number; at(ms: number): Uint8ClampedArray }

const OUTLINE = '#1a1626';

/**
 * A copy on its own, as the lil guys site shows one: the pixels that are the item (by layer, or by
 * what changes when a guy puts it on), outlined, its finish moving and its effect playing, scaled up
 * by whole cells to a size that reads over the capsule. An aura has nothing to show on its own, so
 * it comes out round the guy who wears it.
 */
function itemArt(copy: Owned, seed: string): Art | null {
  const slot = slotOf(copy);
  if (!slot) return null;
  if (slot === 'aura') return auraArt(copy, seed);
  const base = resolve(seed), code = encode(copy), want = FRAME_SLOTS.indexOf(slot) + 1, lo = LAYER[slot];
  const draw = (equip: string[]) => {
    const cfg = dress(base, { equip });
    const grid = (slot === 'buddy' && buddyAlone(cfg)) || compose(cfg);
    return { grid, colors: paint(grid, cfg, withItems(paletteOf(cfg), cfg), false, false) };
  };
  const worn = draw([code]);
  let mask = worn.grid.map(row => row.map(t => t >= lo && t < lo + 10));
  if (!mask.some(r => r.some(Boolean))) {
    // A skin redraws the whole guy in its own colours, so it is whatever changed.
    const bare = draw([]);
    mask = worn.colors.map((row, y) => row.map((c, x) => !!c && c !== bare.colors[y][x]));
  }
  const W = worn.grid[0].length, H = FRAME_HEIGHT, top = H - worn.grid.length;
  const colors: (string | null)[][] = Array.from({ length: H }, () => new Array(W).fill(null));
  const slots: number[][] = Array.from({ length: H }, () => new Array(W).fill(0));
  worn.colors.forEach((row, y) => row.forEach((c, x) => { if (mask[y][x] && c) { colors[y + top][x] = c; slots[y + top][x] = want; } }));
  const edge: [number, number][] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!colors[y][x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => slots[y + dy]?.[x + dx])) edge.push([x, y]);
  for (const [x, y] of edge) colors[y][x] = OUTLINE;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  colors.forEach((row, y) => row.forEach((c, x) => { if (c) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } }));
  if (x1 < 0) return null;
  // The item's own box sets its size; an effect gets room round it for what it draws (rising embers, a tube, bolts).
  const k = clamp(Math.floor(Math.min(40 / (x1 - x0 + 1), 34 / (y1 - y0 + 1))), 2, 4);
  const ownBottom = y1;
  if (copy.fx) {
    const up = ['embers', 'bubbles', 'hearts'].includes(copy.fx) ? 7 : copy.fx === 'electric' ? 3 : 1;
    y0 = Math.max(0, y0 - up); x0 = Math.max(0, x0 - 1); x1 = Math.min(W - 1, x1 + 1); y1 = Math.min(H - 1, y1 + 1);
  }
  const owned: AvatarConfig['owned'] = { [slot]: copy };
  const copies = FRAME_SLOTS.map(s => owned[s]);
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  return {
    w: bw * k, h: bh * k, foot: (y1 - ownBottom) * k,
    at(ms) {
      const frame: AnimationFrame = { colors: copy.fx ? applyFx(colors, slots, copies, ms) : colors, slots, ms: 0 };
      const shone = shineFrame(frame, owned, ms), out = new Uint8ClampedArray(bw * bh * 4);
      for (let y = 0; y < bh; y++) out.set(shone.subarray(((y0 + y) * W + x0) * 4, ((y0 + y) * W + x1 + 1) * 4), y * bw * 4);
      return upscale(out, bw, bh, k);
    },
  };
}

/** An aura round the guy who wears it, playing as his baked picture does, cropped to everything it ever lights. */
function auraArt(copy: Owned, seed: string): Art {
  const f = bakeGuy({ seed, equip: [encode(copy)] }, 'idle');
  let x0 = f.width, y0 = f.height, x1 = -1, y1 = -1;
  for (const px of f.frames) for (let y = 0; y < f.height; y++) for (let x = 0; x < f.width; x++) if (px[(y * f.width + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, k = 2, total = f.delays.reduce((a, b) => a + b, 0);
  return {
    w: bw * k, h: bh * k, foot: 0,
    at(ms) {
      let t = ((ms % total) + total) % total, i = 0;
      while (t >= f.delays[i] && i < f.frames.length - 1) t -= f.delays[i++];
      const out = new Uint8ClampedArray(bw * bh * 4);
      for (let y = 0; y < bh; y++) out.set(f.frames[i].subarray(((y0 + y) * f.width + x0) * 4, ((y0 + y) * f.width + x1 + 1) * 4), y * bw * 4);
      return upscale(out, bw, bh, k);
    },
  };
}

// ------------------------------------------------------------ the open

/** What `capsuleOpenFrames` takes. */
export interface CapsuleOpenOptions {
  /** The capsule's id: a machine's (`puttsies`, `pets`), `mystery`, `free` or a season's (`season.pumpkin`). */
  capsule: string;
  /** What's inside. Left out, it opens to the capsule's own light, its toy standing in the candy. */
  copy?: Owned;
  /** The stage's side in pixels: 96, or a whole multiple of it. 96 if not given. */
  size?: number;
  /** `drop`: it falls in and bounces first. `still`: it's already standing there (a capsule a game showed waiting). */
  from?: 'drop' | 'still';
  /** Whose guy a skin, a hat or an aura comes out on (the player's seed); the capsule's own toy guy if not given. */
  guy?: string;
}

/** The moments a game can hang a sound on. */
export type CapsuleOpenBeat = 'land' | 'rock' | 'crack' | 'pop' | 'hold';

/** An open's frames, with when each moment lands and where what came out stands in the hold. */
export interface CapsuleOpen extends Frames {
  /** In ms from the start: the landing (a drop's), each rock, the crack, the pop and the hold frame. */
  beats: { land?: number; rocks: number[]; crack: number; pop: number; hold: number };
  /** 0 Everyday to 5 Aura, as it played; null with nothing inside. */
  tier: number | null;
  /** Where what came out stands in the hold frame, in the frames' pixels. */
  item?: { x: number; y: number; width: number; height: number };
}

/** The rock: a half lean, all the way, half, upright, then the same the other way. */
const ROCK = [0.5, 1, 0.5, 0, -0.5, -1, -0.5, 0];
/** How long the hold frame shows: it's the last, so it stays. */
const HOLD_MS = 1000;
const SHUT_POSE: Pose = { turn: 0, lid: 0, lift: 0 };
const ALL: Show = { toy: true, dome: true };

/**
 * A capsule opening, as frames: what's inside's grade sets how long it builds and how big it bursts.
 * It plays once; the last frame is the hold, what came out standing over the open half. Null for a
 * capsule there isn't, a copy of an item there isn't, or a size that isn't a whole multiple of 96.
 */
export function capsuleOpenFrames(options: CapsuleOpenOptions): CapsuleOpen | null {
  const capsule = capsuleById(options.capsule), size = options.size ?? S, copy = options.copy;
  if (!capsule || !Number.isInteger(size) || size < S || size % S) return null;
  if (copy && !itemById(copy.item)) return null;
  const art = copy ? itemArt(copy, options.guy ?? 'mystery') : null;
  if (copy && !art) return null;
  const tier = capsuleOpenTier(copy), light = lightOf(capsule, copy, tier);
  // Nothing inside plays as an Everyday, with a fan of the capsule's light behind its toy.
  const build = tier === null ? { ...BUILDS[0], fan: 4 } : BUILDS[tier];
  const random = seeded(hash(`${capsule.id}|${copy ? encode(copy) : 'none'}`));

  // ---------------------------------------------------------- the capsule in a pose
  const kept = new Map<string, { top: Uint8ClampedArray; bottom: Uint8ClampedArray }>();
  const layers = (pose: Pose, show: Show = ALL) => {
    const key = `${pose.turn.toFixed(4)},${pose.lid.toFixed(4)},${pose.lift},${show.toy},${show.dome}`;
    let l = kept.get(key);
    if (!l) kept.set(key, l = capsuleLayers(capsule.id, pose, show)!);
    return l;
  };

  /**
   * Light inside the capsule, behind both halves: the glass filling with it from the seam up as far as
   * `leak` reaches (in three bands, hot by the seam), and white-hot in any gap between the halves.
   */
  const glow = (pose: Pose, top: Uint8ClampedArray, bottom: Uint8ClampedArray, leak: number) => {
    const g = new Uint8ClampedArray(64 * 64 * 4), sn = Math.sin(pose.turn), cs = Math.cos(pose.turn), reach = leak * 2 * R;
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const i = (y * 64 + x) * 4, above = -(-(x - C) * sn + (y - C) * cs) - 1;
      let c: RGB | null = null;
      if (top[i + 3]) { if (above >= -1 && above <= reach) c = above < reach / 3 ? light.hot : above < (reach * 2) / 3 ? light.mid : light.deep; }
      else if (pose.lift && !bottom[i + 3] && Math.hypot(x - C, y - C) <= R + 0.5 && above > -2) c = light.hot;
      if (c) g.set([...c, 255], i);
    }
    return g;
  };

  /** The capsule shut or cracked, rocked `turn`, `leak` of its light showing, moved `dx`, `dy` on the stage. */
  const capsuleFrame = (pose: Pose, leak: number, dx = 0, dy = 0, more?: (st: Stage) => void) => {
    const st = new Stage(), { top, bottom } = layers(pose), x = AT_X + dx, y = AT_Y + dy;
    if (leak > 0 || pose.lift) st.over(glow(pose, top, bottom, pose.lift ? 1 : leak), 64, 64, x, y);
    st.over(bottom, 64, 64, x, y);
    if (leak > 0 && !pose.lift) seamLight(st, pose.turn, leak, x, y);
    st.over(top, 64, 64, x, y);
    more?.(st);
    return st.d;
  };

  /** The seam lit from the middle out as far as `leak`, and past the sides once it's bright, light leaking out of the crack. */
  const seamLight = (st: Stage, turn: number, leak: number, x: number, y: number) => {
    const sn = Math.sin(turn), cs = Math.cos(turn), half = leak * (R - 1);
    for (let u = -half; u <= half; u += 0.5) for (const v of [-0.5, 0.5]) {
      const px = Math.round(x + C + u * cs - v * sn), py = Math.round(y + C + u * sn + v * cs);
      st.put(px, py, ...light.hot, 255);
    }
    if (leak < 0.3) return;
    // Out of each end of the seam, along it, then up and out of it as it brightens.
    for (const side of [-1, 1]) {
      const ex = x + C + side * (R + 2) * cs + 0.5 * sn, ey = y + C + side * (R + 2) * sn - 0.5 * cs;
      const along = Math.atan2(side * sn, side * cs), up = side > 0 ? -1 : 1, len = Math.round(leak * 12);
      st.ray(ex, ey, along, 0, len, len, [light.hot, light.mid]);
      if (leak >= 0.6) st.ray(ex, ey, along + up * 0.5, 0, len - 4, len, [light.hot, light.mid, light.deep]);
    }
  };

  // ---------------------------------------------------------- the frames
  const frames: Uint8ClampedArray[] = [], delays: number[] = [];
  const beats: CapsuleOpen['beats'] = { rocks: [], crack: 0, pop: 0, hold: 0 };
  let clock = 0;
  const push = (px: Uint8ClampedArray, ms: number) => { despeckle(px); frames.push(px); delays.push(ms); clock += ms; };

  // 1. It falls in, lands with a puff either side and bounces twice; or it's already standing there.
  if ((options.from ?? 'drop') === 'drop') {
    for (const dy of [-80, -66, -48, -26]) push(capsuleFrame(SHUT_POSE, 0, 0, dy), 30);
    beats.land = clock;
    const dust = (st: Stage, k: number) => {
      // Two puffs at its foot, drifting out and thinning.
      for (const side of [-1, 1]) {
        const x = MOUTH_X + side * (22 + k * 5), y = 90 - k * 2;
        st.cell(x, y, [214, 206, 190]);
        if (k < 2) st.cell(x + side * CELL, y + CELL, [158, 150, 136]);
        if (k < 2) st.cell(x, y + CELL, [214, 206, 190]);
        if (k < 1) st.cell(x - side * CELL, y + CELL, [158, 150, 136]);
      }
    };
    [[0, 60], [-6, 40], [-8, 40], [-6, 40], [0, 50], [-2, 40], [0, 40]].forEach(([dy, ms], k) =>
      push(capsuleFrame(SHUT_POSE, 0, 0, dy, k < 3 ? st => dust(st, k) : undefined), ms));
  }
  push(capsuleFrame(SHUT_POSE, 0), build.rest);

  // 2. The rocks, the light leaking out sooner and further the rarer what's inside, swelling between them.
  build.rocks.forEach(([deg, step, leak], r) => {
    beats.rocks.push(clock);
    for (const f of ROCK) push(capsuleFrame({ turn: f * deg * DEG, lid: 0, lift: 0 }, leak), step);
    const next = build.rocks[r + 1];
    if (next && build.beat) push(capsuleFrame(SHUT_POSE, (leak + next[2]) / 2), build.beat);
  });

  // 3. A tremble, side to side a pixel at a time, the light all but full.
  const lastLeak = build.rocks[build.rocks.length - 1][2];
  for (let k = 0; k < build.tremble; k++) {
    const leak = lastLeak + ((0.95 - lastLeak) * (k + 1)) / build.tremble;
    push(capsuleFrame({ turn: (k % 2 ? -2 : 2) * DEG, lid: 0, lift: 0 }, leak, k % 2 ? -1 : 1), 40);
  }

  // 4. The crack: the dome lifts and tips back, the capsule lit inside like a bulb, light pouring out of the side.
  beats.crack = clock;
  const crackLids = build.crack.map((_, k) => -((k + 1) * 14) / build.crack.length);
  build.crack.forEach((ms, k) => {
    const pose: Pose = { turn: 0, lid: crackLids[k] * DEG, lift: 1 };
    push(capsuleFrame(pose, 1, 0, 0, st => {
      const len = 6 + k * 4 + (tier ?? 0) * 2;
      for (const a of [-0.15, -0.6, -1.1]) st.ray(AT_X + C + R, AT_Y + C - 2, a, 1, len, len, [light.hot, light.mid, light.deep]);
    }), ms);
  });

  // 5. The pop: the dome flies off spinning, a flash and a burst of rays and sparks, and what's inside rises out.
  beats.pop = clock;
  const t5 = tier ?? 0, lid0 = crackLids[crackLids.length - 1] * DEG;
  const rayLife = 240 + 40 * t5, riseAt = 80, riseEnd = riseAt + build.rise;
  const rays = Array.from({ length: build.rays }, (_, i) => {
    // A fan out of the top below Mythic; all the way round from Mythic up, behind the capsule, none along the rim.
    const a = t5 >= 3 ? -Math.PI / 2 + (2 * Math.PI * (i + 0.5)) / build.rays : -Math.PI * 0.9 + (Math.PI * 0.8 * i) / Math.max(1, build.rays - 1);
    return { a, length: build.reach * (i % 2 ? 0.62 : 1) };
  });
  const sparks = Array.from({ length: build.sparks }, (_, i) => ({
    a: -Math.PI / 2 + (random() - 0.5) * (t5 >= 3 ? Math.PI * 1.7 : Math.PI * 1.1),
    v: 0.07 + random() * 0.09 + t5 * 0.01,
    life: 220 + random() * (140 + 60 * t5),
    colour: light.sparks[i % light.sparks.length],
    big: i % 3 === 0,
  }));
  const rain = Array.from({ length: build.rain }, (_, i) => ({ x: 8 + random() * 80, from: 140 + random() * 360, v: 0.08 + random() * 0.04, colour: light.sparks[i % light.sparks.length] }));
  const sparkEnd = Math.max(0, ...sparks.map(s => s.life));
  const rainEnd = rain.length ? Math.max(...rain.map(d => d.from + 100 / d.v)) : 0;
  const settle = copy ? riseEnd : 0;
  const end = Math.max(rayLife, sparkEnd, settle, Math.min(rainEnd, riseEnd + 320), 260);

  // What came out: its own bottom over the rim, centred. It rises from behind the candy's rim, overshoots and settles.
  const itemX = art ? Math.round(MOUTH_X - art.w / 2) : 0;
  const hoverTop = art ? HOVER + art.foot - art.h : 0;
  const itemTop = (t: number) => {
    const p = clamp((t - riseAt) / build.rise, 0, 1), s = 1.7, e = 1 + (s + 1) * (p - 1) ** 3 + s * (p - 1) ** 2;
    return Math.round(MOUTH_Y + (hoverTop - MOUTH_Y) * e);
  };

  const { bottom: candy, top: toy } = layers(SHUT_POSE, { toy: !copy, dome: false });
  const fanAt = (st: Stage, grow: number) => {
    for (let i = 0; i < build.fan; i++) {
      const a = -Math.PI * 0.86 + (Math.PI * 0.72 * i) / Math.max(1, build.fan - 1), len = (16 + 3 * t5) * (i % 2 ? 0.7 : 1) * grow;
      if (len >= CELL) st.ray(MOUTH_X, MOUTH_Y - 2, a, 12, 12 + len, 12 + len, i % 2 ? [light.mid] : [light.deep]);
    }
  };
  const pool = (st: Stage, grow: number) => {
    // The light at the mouth: a low mound over the rim, each row narrower, the top one the middle colour.
    const rows = t5 >= 3 ? 3 : t5 >= 1 ? 2 : 1;
    for (let r = 0; r < rows; r++) {
      const half = Math.round(((34 + 2 * t5) / 2) * grow * (1 - r * 0.3));
      for (let x = -half; x < half; x += CELL) st.cell(MOUTH_X + x, MOUTH_Y - CELL * (r + 1), r === rows - 1 && rows > 1 ? light.mid : light.hot);
    }
  };

  /** The flash as the dome pops: a star of light out of the mouth, hot in the middle to a deep edge, its rows from `below` down left out. */
  const flash = (st: Stage, below: number) => {
    const outer = 24 + 4 * t5, inner = 12 + t5;
    for (let y = MOUTH_Y - outer; y <= MOUTH_Y + outer && y < below; y += CELL) for (let x = MOUTH_X - outer; x <= MOUTH_X + outer; x += CELL) {
      const dx = x + 1 - MOUTH_X, dy = y + 1 - MOUTH_Y, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      const edge = inner + (outer - inner) * Math.abs(Math.cos(4 * a)) ** 4;
      if (r <= edge) st.cell(x, y, r < edge - 3 * CELL ? light.hot : r < edge - CELL ? light.mid : light.deep);
    }
  };

  const popFrame = (t: number) => {
    const st = new Stage();
    // Behind: the flash's lower spikes, the rays, the rings, the fan.
    if (t === 0) flash(st, MOUTH_Y + 64);
    for (const ray of rays) {
      if (t === 0 || t > rayLife) continue;
      const head = 10 + ray.length * Math.min(1, (t + 80) / 200), tail = 10 + ray.length * clamp((t - 100) / (rayLife - 100), 0, 1);
      if (head - tail >= CELL) st.ray(MOUTH_X, MOUTH_Y, ray.a, tail, head, 10 + ray.length, [light.hot, light.mid, light.deep]);
    }
    for (let j = 0; j < build.rings; j++) {
      const at = t - 40 - 110 * j;
      if (at < 0 || at > 260) continue;
      const r = 10 + at * 0.16, colour = j ? light.hot : light.mid;
      for (let a = 0; a < Math.PI * 2; a += CELL / r / 1.6) if (!j || Math.floor((a * r) / (CELL * 3)) % 2 === 0) st.cell(MOUTH_X + Math.cos(a) * r, MOUTH_Y + Math.sin(a) * r, colour);
    }
    if (build.fan && t >= riseAt) fanAt(st, clamp((t - riseAt) / build.rise, 0, 1));
    pool(st, clamp(t / 80, 0.5, 1));
    // What's inside, rising out from behind the rim; then the candy, and the toy still standing in it with nothing inside.
    if (art && t >= riseAt) st.over(art.at(beats.pop + t), art.w, art.h, itemX, itemTop(t), MOUTH_Y);
    st.over(candy, 64, 64, AT_X, AT_Y);
    if (!copy) st.over(toy, 64, 64, AT_X, AT_Y);
    // The dome, flying off up and to the left, spinning back, gone in a fifth of a second; then the flash in front of it.
    const p = (t + 30) / 230;
    if (p < 1) {
      const dome = layers({ turn: 0, lid: lid0 - 2.6 * p, lift: 0 }, { toy: false, dome: true }).top;
      st.over(dome, 64, 64, AT_X + Math.round(-38 * p), AT_Y - 1 + Math.round(-(120 * p - 36 * p * p)));
    }
    if (t === 0) flash(st, MOUTH_Y);
    // In front: sparks flung out and falling, and a Grail's or an aura's glitter coming down.
    for (const s of sparks) {
      if (t === 0 || t > s.life) continue;
      const out = 12 + s.v * t, x = MOUTH_X + Math.cos(s.a) * out, y = MOUTH_Y + Math.sin(s.a) * out + 0.00035 * t * t;
      st.spark(x, y, s.colour, s.big && t < s.life / 2);
    }
    for (const d of rain) {
      if (t < d.from) continue;
      const y = -2 + (t - d.from) * d.v;
      if (y < 88) st.cell(d.x + Math.sin((t - d.from) / 90) * 2, y, d.colour);
    }
    return st.d;
  };

  push(popFrame(0), 60);
  for (let t = 60; t < end; t += 40) push(popFrame(t), 40);

  // 6. The hold: what came out over the open half in its fan of light, twinkles round it; or the toy, lit.
  const hold = new Stage();
  if (build.fan) fanAt(hold, 1);
  pool(hold, 1);
  if (art) hold.over(art.at(clock), art.w, art.h, itemX, hoverTop);
  hold.over(candy, 64, 64, AT_X, AT_Y);
  if (!copy) hold.over(toy, 64, 64, AT_X, AT_Y);
  const box = art ? { x: itemX, y: hoverTop, w: art.w, h: art.h } : { x: MOUTH_X - 14, y: 30, w: 28, h: 30 };
  for (let k = 0, tries = 0; k < build.stars && tries < 200; tries++) {
    // Placed clear of what came out and of the capsule, never at the stage's edge.
    const x = 6 + random() * (S - 12), y = 6 + random() * (MOUTH_Y - 14);
    if (x > box.x - 8 && x < box.x + box.w + 8 && y > box.y - 8 && y < box.y + box.h + 8) continue;
    hold.spark(x, y, k % 2 ? light.deep : light.mid, true);
    k++;
  }
  push(hold.d, HOLD_MS);

  // Frames that came out the same are one, shown for their time together.
  const merged: Frames = { width: S, height: S, frames: [], delays: [] };
  const same = (a: Uint8ClampedArray, b: Uint8ClampedArray) => { for (let j = 0; j < a.length; j++) if (a[j] !== b[j]) return false; return true; };
  frames.forEach((f, i) => {
    const last = merged.frames.length - 1;
    if (last >= 0 && same(merged.frames[last], f)) merged.delays[last] += delays[i];
    else { merged.frames.push(f); merged.delays.push(delays[i]); }
  });
  // The hold starts with the first frame that shows it, and stays.
  merged.delays[merged.delays.length - 1] = HOLD_MS;
  beats.hold = merged.delays.slice(0, -1).reduce((a, b) => a + b, 0);
  const k = size / S;
  return {
    width: size, height: size,
    frames: merged.frames.map(f => upscale(f, S, S, k)),
    delays: merged.delays,
    beats, tier,
    item: art ? { x: itemX * k, y: hoverTop * k, width: art.w * k, height: art.h * k } : undefined,
  };
}

// ------------------------------------------------------------ playing it on a canvas

/** What `playCapsuleOpen` takes: the open, and how it's drawn. */
export interface CapsuleOpenPlayOptions extends Omit<CapsuleOpenOptions, 'size'> {
  /** Device pixels to a stage pixel, a whole number. Left out, the most that fit the canvas's CSS box (give it one). */
  scale?: number;
  /** Called as each moment shows, for a game's sounds; a skip calls `hold` alone. */
  onBeat?: (beat: CapsuleOpenBeat) => void;
}

/** A playing open: `done` once the hold frame shows (or it's skipped or destroyed), `skip` to the hold, `destroy` to stop drawing. */
export interface CapsuleOpenPlayer {
  done: Promise<void>;
  skip(): void;
  destroy(): void;
}

/**
 * Plays an open on a canvas, once, at whole device pixels with smoothing off, centred in the canvas,
 * and leaves the hold frame showing. A canvas the page gives a CSS size is filled at the most whole
 * pixels that fit; give `scale` for a set size. Throws for a capsule or copy there isn't.
 */
export function playCapsuleOpen(canvas: HTMLCanvasElement | OffscreenCanvas, options: CapsuleOpenPlayOptions): CapsuleOpenPlayer {
  const open = capsuleOpenFrames({ ...options, size: S });
  if (!open) throw new Error(`No capsule open for "${options.capsule}"${options.copy ? ` with ${encode(options.copy)}` : ''}`);
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!ctx) throw new Error('No 2D context on that canvas');

  // The canvas's size in device pixels, and the whole scale that fits it.
  const dpr = (globalThis as { devicePixelRatio?: number }).devicePixelRatio || 1;
  const el = canvas as HTMLCanvasElement;
  const cssW = el.clientWidth || 0, cssH = el.clientHeight || 0;
  let k: number;
  if (options.scale !== undefined) {
    k = Math.max(1, Math.floor(options.scale));
    canvas.width = S * k; canvas.height = S * k;
    if (el.style) { el.style.width = `${(S * k) / dpr}px`; el.style.height = `${(S * k) / dpr}px`; }
  } else if (cssW && cssH) {
    // A canvas with no CSS size of its own takes it from its pixels: keep it where it was before they change.
    if (el.style && dpr !== 1 && cssW === canvas.width && cssH === canvas.height) { el.style.width = `${cssW}px`; el.style.height = `${cssH}px`; }
    canvas.width = Math.max(1, Math.round(cssW * dpr)); canvas.height = Math.max(1, Math.round(cssH * dpr));
    k = Math.max(1, Math.floor(Math.min(canvas.width / S, canvas.height / S)));
  } else {
    k = Math.max(1, Math.round(dpr));
    canvas.width = S * k; canvas.height = S * k;
  }
  const ox = Math.floor((canvas.width - S * k) / 2), oy = Math.floor((canvas.height - S * k) / 2);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const starts: number[] = [];
  open.delays.reduce((t, d) => { starts.push(t); return t + d; }, 0);
  const last = open.frames.length - 1;
  const order: [CapsuleOpenBeat, number][] = [
    ...(open.beats.land !== undefined ? [['land', open.beats.land] as [CapsuleOpenBeat, number]] : []),
    ...open.beats.rocks.map(t => ['rock', t] as [CapsuleOpenBeat, number]),
    ['crack', open.beats.crack], ['pop', open.beats.pop], ['hold', open.beats.hold],
  ];
  let shown = -1, fired = 0, began = -1, handle: unknown = null, over = false, finish!: () => void;
  const done = new Promise<void>(r => { finish = r; });
  const raf = (globalThis as { requestAnimationFrame?: (cb: (t: number) => void) => number }).requestAnimationFrame;
  const caf = (globalThis as { cancelAnimationFrame?: (h: number) => void }).cancelAnimationFrame;
  const later = (cb: (t: number) => void) => (raf ? raf(cb) : setTimeout(() => cb(performance.now()), 16));
  const cancel = () => { if (handle === null) return; if (raf && caf) caf(handle as number); else clearTimeout(handle as ReturnType<typeof setTimeout>); handle = null; };

  const show = (i: number) => {
    if (i === shown) return;
    shown = i;
    const px = upscale(open.frames[i], S, S, k), w = S * k;
    let image: ImageData;
    if (typeof ImageData === 'function') image = new ImageData(px as Uint8ClampedArray<ArrayBuffer>, w, w);
    else { image = ctx.createImageData(w, w); image.data.set(px); }
    ctx.putImageData(image, ox, oy);
  };
  const end = () => { if (over) return; over = true; cancel(); finish(); };
  const tick = (now: number) => {
    handle = null;
    if (over) return;
    if (began < 0) began = now;
    const t = now - began;
    let i = shown < 0 ? 0 : shown;
    while (i < last && t >= starts[i + 1]) i++;
    show(i);
    while (fired < order.length && t >= order[fired][1]) options.onBeat?.(order[fired++][0]);
    if (i === last) { end(); return; }
    handle = later(tick);
  };
  handle = later(tick);
  return {
    done,
    skip() { if (over) return; show(last); fired = order.length; options.onBeat?.('hold'); end(); },
    destroy() { end(); },
  };
}

// ------------------------------------------------------------ addresses

/**
 * An open's picture from the lil guys Worker (`setLilGuysHost` moves it):
 * `/g/<art version>/capsule-open/<capsule>-<copy or none>[-still]@<scale>.png`, an animated PNG that plays
 * once and stays on its hold frame. `sheet` gives the sprite sheet's `.sheet.png`, or its `.sheet.json`
 * with each frame's time and the beats.
 */
export function capsuleOpenUrl(capsule: string, copy?: Owned | null, options: { scale?: number; from?: 'drop' | 'still'; sheet?: 'png' | 'json'; host?: string } = {}): string {
  const { scale = 1, host = lilGuysHost(), from = 'drop', sheet } = options;
  return `${host}/g/${ART_VERSION}/capsule-open/${capsule}-${copy ? encode(copy) : 'none'}${from === 'still' ? '-still' : ''}${sheet ? '.sheet' : ''}${scale > 1 ? '@' + scale : ''}.${sheet === 'json' ? 'json' : 'png'}`;
}
