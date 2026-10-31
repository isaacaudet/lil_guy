/**
 * The capsule a copy comes out of, drawn the same everywhere: a clear dome over a candy half in its
 * machine's colour, the machine's toy showing through the plastic, lit from the top left, in an ink
 * outline. Every game, the Worker's pictures and the lil guys site draw it from here, so the capsule a
 * game shows is the one its player opens on the site: a machine's, the mystery one, today's free one or
 * a season's.
 *
 * Machines are the club's games (and the Pet shop). Three more are the club's own: `mystery` (an item
 * from any machine: candy in every machine's colour and a question mark inside), `free` (the daily
 * one: ivory with a coral band and the club's stamp inside) and each season's (`season.pumpkin`: the
 * season's colour with its hat inside).
 *
 * Each comes `closed` (still), `wobble` (a short loop: about to open) or `open` (cracked, warm light
 * leaking out). It's pixel art on four grids: 64 is the master, and 16, 24 and 32 are drawn on their
 * own, simpler grids so a capsule still reads as one in a chip or a pill. A bigger size is one of
 * those grids scaled up by whole pixels.
 */
import { compose } from './compose';
import { upscale, type Frames } from './gif';
import { GAMES, SET_COLORS, dress, gameItems, items, machineName, withItems, type Item } from './items';
import { lilGuysHost } from './kit';
import { ART_VERSION } from './guy-code';
import { paint } from './paint';
import { getPalette, shadePalette } from './palette';
import { resolve } from './resolve';
import type { GameId } from './types';

type RGB = [number, number, number];
const WHITE: RGB = [255, 255, 255], INK: RGB = [22, 18, 34];
const rgb = (s: string): RGB => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const blend = (a: RGB, b: RGB, t: number): RGB => a.map((v, i) => Math.round(v + (b[i] - v) * t)) as RGB;

// ------------------------------------------------------------ what there is

/** How a capsule is showing: shut, wobbling (about to open), or cracked open with light leaking out. */
export type CapsuleState = 'closed' | 'wobble' | 'open';
export const CAPSULE_STATES: readonly CapsuleState[] = ['closed', 'wobble', 'open'];

/** The grids a capsule is drawn on. 64 is the master; the small ones have their own simpler drawing. */
export const CAPSULE_GRIDS = [16, 24, 32, 64] as const;
export type CapsuleGrid = typeof CAPSULE_GRIDS[number];

/** One kind of capsule: a machine's, or one of the club's own. */
export interface Capsule {
  /** Its id in an address and the manifest: a game id, `mystery`, `free` or `season.<name>`. */
  id: string;
  name: string;
  kind: 'machine' | 'mystery' | 'free' | 'season';
  /** The colour that marks it, to tint a chip with: its candy's (a machine's or a season's), or the club's coral for the club's own. */
  colour: string;
  /** A machine's game. */
  game?: GameId;
  /** A season's hat, and the days it drops (`MM-DD`, in UTC). */
  item?: string;
  from?: string;
  to?: string;
}

const CORAL = '#fe5f55', IVORY = '#f3ead6', NAVY = '#11151b';
const seasonal = items.filter(i => i.season);

/** How much lighter a colour is than another, as WCAG measures it (1 to 21). */
function contrast(a: string, b: string): number {
  const lum = (h: string) => { const c = rgb(h).map(v => v / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
const hex = (c: RGB) => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
/** A season's candy: its hat's first colour, lifted toward white when it's too dark to read on the club's navy (New Year's black hat makes a silver capsule). */
function seasonColour(i: Item): string {
  let c = i.colors[0].toLowerCase();
  for (let t = 0.05; contrast(c, NAVY) < 4 && t <= 1; t += 0.05) c = hex(blend(rgb(i.colors[0]), WHITE, t));
  return c;
}

/** Every capsule: the machines in the order they joined, then mystery, free, and each season's. */
export const CAPSULES: readonly Capsule[] = [
  ...GAMES.map(g => ({ id: g, name: machineName(g), kind: 'machine' as const, colour: SET_COLORS[g], game: g })),
  { id: 'mystery', name: 'Mystery', kind: 'mystery', colour: CORAL },
  { id: 'free', name: 'Free daily', kind: 'free', colour: CORAL },
  ...seasonal.map(i => ({ id: seasonId(i), name: i.name, kind: 'season' as const, colour: seasonColour(i), item: i.id, from: i.season!.from, to: i.season!.to })),
];

function seasonId(i: Item): string { return 'season.' + i.id.replace(/^club\./, ''); }

/**
 * A capsule by its id (`puttsies`, `mystery`, `free`, `season.pumpkin`), or by `season` and a
 * seasonal item's id (`club.pumpkin` or `pumpkin`). Undefined for anything else.
 */
export function capsuleById(id: string, season?: string): Capsule | undefined {
  if (id === 'season' && season) id = 'season.' + season.replace(/^(club|season)\./, '');
  return CAPSULES.find(c => c.id === id);
}

// ------------------------------------------------------------ pixels

/** A square of RGBA pixels that blends what's set over what's there, as the site's capsule was drawn. */
class Px {
  d: Uint8ClampedArray;
  constructor(public w: number) { this.d = new Uint8ClampedArray(w * w * 4); }
  set(x: number, y: number, c: RGB, a = 255) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.w) return;
    const d = this.d, i = (y * this.w + x) * 4, k = a / 255;
    if (a >= 255 || !d[i + 3]) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = a; return; }
    d[i] += (c[0] - d[i]) * k; d[i + 1] += (c[1] - d[i + 1]) * k; d[i + 2] += (c[2] - d[i + 2]) * k; d[i + 3] = Math.max(d[i + 3], a);
  }
  alpha(x: number, y: number) { return x < 0 || y < 0 || x >= this.w || y >= this.w ? 0 : this.d[(y * this.w + x) * 4 + 3]; }
  /** Ink round everything solid: each empty pixel beside one that's mostly there. */
  outline(c: RGB) {
    const add: [number, number][] = [];
    for (let y = 0; y < this.w; y++) for (let x = 0; x < this.w; x++) {
      if (this.alpha(x, y)) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => this.alpha(x + dx, y + dy) > 150)) add.push([x, y]);
    }
    for (const [x, y] of add) this.set(x, y, c);
  }
  /** Moved by whole pixels, what slides off the edge lost. */
  shifted(dx: number, dy: number): Px {
    const out = new Px(this.w);
    for (let y = 0; y < this.w; y++) for (let x = 0; x < this.w; x++) {
      const sx = x - dx, sy = y - dy;
      if (sx < 0 || sy < 0 || sx >= this.w || sy >= this.w) continue;
      out.d.set(this.d.subarray((sy * this.w + sx) * 4, (sy * this.w + sx) * 4 + 4), (y * this.w + x) * 4);
    }
    return out;
  }
}

/** `layers` stacked, each over the one before, into one picture. */
function stack(w: number, layers: Px[]): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * w * 4);
  for (const l of layers) for (let i = 0; i < out.length; i += 4) {
    const sa = l.d[i + 3] / 255;
    if (!sa) continue;
    const da = out[i + 3] / 255, a = sa + da * (1 - sa);
    for (let k = 0; k < 3; k++) out[i + k] = Math.round((l.d[i + k] * sa + out[i + k] * da * (1 - sa)) / a);
    out[i + 3] = Math.round(a * 255);
  }
  return out;
}

// ------------------------------------------------------------ what's inside

type Cells = (string | null)[][];

/** A grid of rows of letters, painted from `key`; '.' is see-through. */
const sprite = (key: Record<string, string>, rows: string[]): Cells => rows.map(r => [...r].map(ch => key[ch] ?? null));

const toys = new Map<string, Cells>();
/** A guy as a toy: the 'mystery' guy (the same face in every capsule) in a machine's skin or a season's hat. */
function guyToy(equip: string): Cells {
  if (!toys.has(equip)) {
    const cfg = dress(resolve('mystery'), { equip: [equip] });
    toys.set(equip, paint(compose(cfg), cfg, withItems(shadePalette(getPalette(cfg.palette), cfg.shade), cfg)));
  }
  return toys.get(equip)!;
}

/** A toy at half size for the 16 grid: each two by two the colour most of it is, the darker on a tie. */
function halved(cells: Cells): Cells {
  const out: Cells = [];
  for (let y = 0; y < cells.length; y += 2) {
    const row: (string | null)[] = [];
    for (let x = 0; x < cells[0].length; x += 2) {
      const n = new Map<string, number>();
      for (const c of [cells[y][x], cells[y][x + 1], cells[y + 1]?.[x], cells[y + 1]?.[x + 1]]) if (c) n.set(c, (n.get(c) ?? 0) + 1);
      const lum = (h: string) => { const [r, g, b] = rgb(h); return r * 0.3 + g * 0.59 + b * 0.11; };
      const best = [...n].sort((a, b) => b[1] - a[1] || lum(a[0]) - lum(b[0]))[0];
      row.push(best && best[1] >= 2 ? best[0] : null);
    }
    out.push(row);
  }
  return out;
}

// The club's question mark, for a mystery capsule: coral in ink, lit top left.
const QKEY = { k: '#161222', c: CORAL, l: '#ff9b8c', s: '#c63f3a' };
const QUESTION = sprite(QKEY, [
  '................',
  '.....kkkkkk.....',
  '....kllllcck....',
  '...kllkkkkcsk...',
  '...kckk..kcsk...',
  '...kkk..kccsk...',
  '.......kccsk....',
  '......kccsk.....',
  '......kcsk......',
  '......kkkk......',
  '......kcsk......',
  '......kkkk......',
  '................',
  '................',
  '................',
  '................',
]);
const QUESTION_24 = sprite(QKEY, [
  '................',
  '.....kkkkkk.....',
  '....kllllcck....',
  '....kkkk.kcsk...',
  '........kccsk...',
  '.......kcsk.....',
  '.......kkk......',
  '.......kcsk.....',
  '.......kkkk.....',
]);
const QUESTION_16 = sprite(QKEY, [
  '........',
  '...ccc..',
  '.....s..',
  '....c...',
  '........',
  '....c...',
]);

/** A sprite with ink round it: every empty cell beside a filled one. */
function inked(cells: Cells, ink = '#161222'): Cells {
  const at = (x: number, y: number) => cells[y]?.[x] ?? null;
  return cells.map((row, y) => row.map((c, x) => c ?? ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at(x + dx, y + dy) && at(x + dx, y + dy) !== ink) ? ink : null)));
}

// The club's stamp, for the free capsule: the coral stamp with the gold stamp's star, its edge perforated.
const SKEY = { e: IVORY, c: CORAL, s: '#d9473f', w: '#fff6d8' };
const STAMP = inked(sprite(SKEY, [
  '................',
  '...e.e.e.e.e....',
  '....eeeeeeeee...',
  '...eeccccccsee..',
  '....ecccwccse...',
  '...eeccwwwcsee..',
  '....ecwwwwwse...',
  '...eeccwcwcsee..',
  '....eccccccse...',
  '...eesssssssee..',
  '....eeeeeeeee...',
  '...e.e.e.e.e....',
  '................',
  '................',
  '................',
  '................',
]));
const STAMP_24 = inked(sprite(SKEY, [
  '................',
  '....e.e.e.e.....',
  '.....eeeeeee....',
  '....eeccccsee...',
  '.....eccwcse....',
  '....eecwwwsee...',
  '.....ecwcwse....',
  '....eesssssee...',
  '.....eeeeeee....',
  '....e.e.e.e.....',
]));
const STAMP_16 = sprite(SKEY, [
  '........',
  '........',
  '..eeee..',
  '..ecwe..',
  '..ecce..',
  '..eeee..',
]);

// ------------------------------------------------------------ looks

interface Look {
  /** The candy's colour at a point on it: `u`, `v` its pixels from the middle, in its own turn (so a pattern turns with it). */
  candy: (u: number, v: number, grid: CapsuleGrid) => RGB;
  /** What shows through the dome on each grid. */
  toy: (grid: CapsuleGrid) => Cells;
}

// The mystery capsule's candy: a segment of each machine's colour round it, like a beach ball (fewer on a small grid).
const RAINBOW = ['#ff6b6b', '#ff8a3d', '#ffd447', '#74d97c', '#4fd6c4', '#5fb4ff', '#a98bff', '#ff7eb6'].map(rgb);
const SEGMENTS: Record<CapsuleGrid, number[]> = { 16: [0, 2, 5, 7], 24: [0, 2, 3, 5, 6, 7], 32: [0, 1, 2, 3, 4, 5, 6, 7], 64: [0, 1, 2, 3, 4, 5, 6, 7] };
const RADIUS: Record<CapsuleGrid, number> = { 16: 6.5, 24: 10.5, 32: 14.5, 64: 29.5 };
function segment(u: number, v: number, grid: CapsuleGrid): RGB {
  const R = RADIUS[grid], along = u / R / Math.sqrt(Math.max(0.05, 1 - (v / R) ** 2)), lon = Math.asin(Math.max(-1, Math.min(1, along)));
  const of = SEGMENTS[grid], k = Math.min(of.length - 1, Math.floor(((lon + Math.PI / 2) / Math.PI) * of.length));
  return RAINBOW[of[k]];
}

/** The band round the club's own capsules (a season's, the free one): rows below the seam, in pixels from the middle. */
const BAND: Record<CapsuleGrid, [number, number]> = { 16: [1.5, 3.5], 24: [2.5, 5.5], 32: [3.5, 7.5], 64: [6.5, 14.5] };
const band = (v: number, grid: CapsuleGrid) => v >= BAND[grid][0] && v < BAND[grid][1];

/** Of a hat's colours, the one furthest from its first: the season's band. */
function bandColour(colors: string[]): RGB {
  const a = rgb(colors[0]);
  return colors.map(rgb).reduce((best, c) => (Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]) > Math.hypot(best[0] - a[0], best[1] - a[1], best[2] - a[2]) ? c : best), a);
}

const looks = new Map<string, Look>();
function lookOf(c: Capsule): Look {
  if (looks.has(c.id)) return looks.get(c.id)!;
  const toyOf = (equip: string) => (grid: CapsuleGrid) => (grid === 16 ? halved(guyToy(equip)) : guyToy(equip));
  const candy = rgb(c.colour);
  let look: Look;
  if (c.kind === 'machine') look = { candy: () => candy, toy: toyOf(gameItems(c.game!).find(i => i.slot === 'skin')!.id) };
  else if (c.kind === 'season') {
    const stripe = bandColour([c.colour, ...items.find(i => i.id === c.item)!.colors.slice(1)]);
    look = { candy: (_, v, grid) => (band(v, grid) ? stripe : candy), toy: toyOf(c.item!) };
  } else if (c.kind === 'mystery') look = { candy: segment, toy: grid => (grid === 16 ? QUESTION_16 : grid === 24 ? QUESTION_24 : QUESTION) };
  else {
    const ivory = rgb(IVORY);
    look = { candy: (_, v, grid) => (band(v, grid) ? candy : ivory), toy: grid => (grid === 16 ? STAMP_16 : grid === 24 ? STAMP_24 : STAMP) };
  }
  looks.set(c.id, look);
  return look;
}

// ------------------------------------------------------------ drawing

/**
 * How it's standing. `turn` rocks the whole capsule (the seam and pattern tilt, the toy moves by whole
 * pixels, the light stays). Cracked open, the dome tips back by `lid` and rises `lift` pixels while the
 * toy stays put in the candy, which sinks `drop` pixels.
 */
export interface Pose { turn: number; lid: number; lift: number; drop?: number }
const SHUT: Pose = { turn: 0, lid: 0, lift: 0 };

/** What of the top half is drawn: the toy standing in the candy, the dome's glass, or both (a picture's). */
export interface Show { toy: boolean; dome: boolean }
const ALL: Show = { toy: true, dome: true };

/** Where the toy's top left sits on each grid (at two pixels a cell on 64). */
const TOY_AT: Record<CapsuleGrid, { x: number; y: number }> = { 16: { x: 4, y: 1 }, 24: { x: 4, y: 2 }, 32: { x: 8, y: 3 }, 64: { x: 16, y: 6 } };
/** The middle of each grid's capsule. */
const CENTRE: Record<CapsuleGrid, number> = { 16: 7.5, 24: 11.5, 32: 15.5, 64: 31.5 };

/** Which part of the capsule a point is in, from how far below the middle it is along the capsule's own up. */
const partAt = (v: number, grid: CapsuleGrid): 'dome' | 'seam' | 'seam2' | 'candy' =>
  v < -1 ? 'dome' : v < 0 ? 'seam' : v < 1 && grid !== 16 && grid !== 24 ? 'seam2' : 'candy';

/**
 * How far the toy moves as the capsule rocks, in whole pixels: it rides along with the dome but stays
 * upright, so a face, a question mark or a stamp never breaks up into loose pixels mid-rock.
 */
function toyShift(grid: CapsuleGrid, turn: number): [number, number] {
  const v = -RADIUS[grid] * 0.45, c = Math.cos(turn), s = Math.sin(turn);
  return [Math.round(-s * v) || 0, Math.round(c * v - v) || 0];
}

/** A point on the body and on the dome, each turned back to the capsule's own upright: what the halves draw from. */
function places(grid: CapsuleGrid, pose: Pose, x: number, y: number) {
  const C = CENTRE[grid], turn = (t: number, yy: number) => { const c = Math.cos(t), s = Math.sin(t); return [C + (x - C) * c + (yy - C) * s, C - (x - C) * s + (yy - C) * c]; };
  const [bu, bv] = turn(pose.turn, y), [, dv] = turn(pose.turn + pose.lid, y + pose.lift);
  return { bu, bv, body: partAt(bv - C, grid), dome: partAt(dv - C, grid) === 'dome', lip: pose.lid !== 0 && dv - C >= (grid === 64 ? -3 : -2) && dv - C < -1 };
}

/**
 * The master, at 64: the site's capsule exactly as it was drawn there, a clear dome over a candy half,
 * shaded as a sphere lit from the top left, with the toy showing through. The halves come back apart,
 * each outlined.
 */
function master(look: Look, pose: Pose, show: Show = ALL): { top: Px; bot: Px } {
  const top = new Px(64), bot = new Px(64), R = 29.5, C = 31.5, L = [-0.48, -0.6, 0.64], toy = look.toy(64), [ox, oy] = toyShift(64, pose.turn);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const p = places(64, pose, x, y);
    // The toy sits in the candy half, so it's drawn from the body even where the dome has lifted off it.
    if (show.toy && p.body === 'dome' && Math.hypot(x - C, y - C) < R - 2) {
      const hex = toy[Math.floor((y - oy - 6) / 2)]?.[Math.floor((x - ox - 16) / 2)];
      if (hex) top.set(x, y, blend(rgb(hex), [228, 238, 255], 0.16));
    }
    const ly = y + pose.lift, ldx = (x - C) / R, ldy = (ly - C) / R, lr2 = ldx * ldx + ldy * ldy;
    if (show.dome && p.dome && lr2 <= 1) {
      const rim = Math.pow(lr2, 3), ang = Math.atan2(ldy, ldx);
      top.set(x, y, blend([214, 228, 250], [120, 140, 190], rim * 0.5), Math.round(28 + rim * 175));
      if (lr2 > 0.6 && lr2 < 0.78 && ang < -1.8 && ang > -2.75) top.set(x, y, WHITE, 215);
      if (lr2 > 0.6 && lr2 < 0.7 && ang > -0.6 && ang < -0.25) top.set(x, y, WHITE, 90);
      if (p.lip) top.set(x, y, [167, 184, 220], 220);
    }
    const dx = (x - C) / R, dy = (y - C) / R, r2 = dx * dx + dy * dy;
    if (r2 > 1 || p.body === 'dome') continue;
    const candy = look.candy(p.bu - C, p.bv - C, 64);
    if (p.body !== 'candy') { bot.set(x, y, blend(candy, WHITE, p.body === 'seam' ? 0.55 : 0.18)); continue; }
    const nz = Math.sqrt(1 - r2), lit = Math.max(0, dx * L[0] + dy * L[1] + nz * L[2]);
    let c = lit < 0.55 ? blend(candy, INK, (0.55 - lit) * 1.1) : blend(candy, WHITE, (lit - 0.55) * 0.55);
    if (r2 > 0.88) c = blend(c, INK, 0.3);
    if (Math.hypot(dx + 0.5, dy - 0.2) < 0.09) c = blend(c, WHITE, 0.6);
    bot.set(x, y, c);
  }
  if (show.dome) for (const [x, y, a] of [[17, 12, 255], [18, 12, 255], [17, 13, 255], [22, 9, 170]]) if (places(64, pose, x, y - pose.lift).dome) top.set(x, y - pose.lift, WHITE, a);
  top.outline(INK); bot.outline(INK);
  return { top, bot };
}

/*
 * The small grids, drawn by hand: where the light falls on a sphere this small, one letter a pixel.
 * The dome or the candy takes each pixel by where the seam is, so it can tilt. '#' the ink round it
 * (each half's outline draws it), 'e' the rim, 'H' the dome's shine, 'l' 'm' 'd' lit, mid and shaded,
 * 's' the candy's glint, '.' nothing.
 */
const SMALL: Record<16 | 24 | 32, string[]> = {
  16: [
    '................',
    '.....######.....',
    '...##eeeeee##...',
    '..#eeHHllmmee#..',
    '..#eHllllmmme#..',
    '.#eHllllmmmmde#.',
    '.#ellllmmmmdde#.',
    '.#elllmmmmmdde#.',
    '.#emmmmmmmddde#.',
    '.#emsmmmmdddde#.',
    '.#emmmmdddddde#.',
    '..#edddddddde#..',
    '..#eeddddddee#..',
    '...##eeeeee##...',
    '.....######.....',
    '................',
  ],
  24: [
    '........................',
    '........########........',
    '......##eeeeeeee##......',
    '.....#eeHHlllmmmee#.....',
    '....#eHHHHlllmmmmme#....',
    '...#eHHHlllllmmmmmde#...',
    '..#eHHHllllllmmmmmdde#..',
    '..#eHHlllllllmmmmmdde#..',
    '.#elllllllllmmmmmmddde#.',
    '.#ellllllllmmmmmmdddde#.',
    '.#elllllllmmmmmmmdddde#.',
    '.#emllllmmmmmmmmddddde#.',
    '.#emmmmmmmmmmmmdddddde#.',
    '.#emmmssmmmmmmddddddde#.',
    '.#emmmssmmmmmdddddddde#.',
    '.#emmmmmmmmmddddddddde#.',
    '..#emmmmmddddddddddde#..',
    '..#edddddddddddddddde#..',
    '...#edddddddddddddde#...',
    '....#edddddddddddde#....',
    '.....#eeddddddddee#.....',
    '......##eeeeeeee##......',
    '........########........',
    '........................',
  ],
  32: [
    '................................',
    '...........##########...........',
    '.........##eeeeeeeeee##.........',
    '.......##eeHlllllmmmmee##.......',
    '......#eeHHHHlllllmmmmmee#......',
    '.....#elHHHHHlllllmmmmmmde#.....',
    '....#elHHHHHllllllmmmmmmdde#....',
    '...#elHHHHllllllllmmmmmmmdde#...',
    '...#eHHHHlllllllllmmmmmmmdde#...',
    '..#eHHHHlllllllllmmmmmmmdddde#..',
    '..#eHHHllllllllllmmmmmmmdddde#..',
    '.#elllHlllllllllmmmmmmmmddddde#.',
    '.#ellllllllllllmmmmmmmmmddddde#.',
    '.#elllllllllllmmmmmmmmmdddddde#.',
    '.#emllllllllmmmmmmmmmmddddddde#.',
    '.#emmlllllmmmmmmmmmmmmddddddde#.',
    '.#emmmmmmmmmmmmmmmmmmdddddddde#.',
    '.#emmmmmssmmmmmmmmmmddddddddde#.',
    '.#emmmmsssmmmmmmmmmdddddddddde#.',
    '.#emmmmsssmmmmmmmmddddddddddde#.',
    '.#emmmmmmmmmmmmmddddddddddddde#.',
    '..#emmmmmmmmmmdddddddddddddde#..',
    '..#eddmmmmmddddddddddddddddde#..',
    '...#edddddddddddddddddddddde#...',
    '...#edddddddddddddddddddddde#...',
    '....#edddddddddddddddddddde#....',
    '.....#edddddddddddddddddde#.....',
    '......#eeddddddddddddddee#......',
    '.......##eeddddddddddee##.......',
    '.........##eeeeeeeeee##.........',
    '...........##########...........',
    '................................',
  ],
};

/** A small grid, from its letters: the toy, the glass, the seam and the candy, then each half outlined. */
function small(look: Look, grid: 16 | 24 | 32, pose: Pose, show: Show = ALL): { top: Px; bot: Px } {
  const rows = SMALL[grid], C = CENTRE[grid], R = C - 1, at = TOY_AT[grid], toy = look.toy(grid), [ox, oy] = toyShift(grid, pose.turn);
  const top = new Px(grid), bot = new Px(grid), letter = (x: number, y: number) => rows[y]?.[x] ?? '.';
  for (let y = 0; y < grid; y++) for (let x = 0; x < grid; x++) {
    const p = places(grid, pose, x, y), body = letter(x, y), dome = letter(x, y + pose.lift);
    // The toy, from the body: inside the glass, and on the 16 grid over its rim too, the only room it has.
    // Lifted straight off (the smallest grids, open), it stands against the light behind it.
    if (show.toy && p.body === 'dome' && (body === 'e' ? grid === 16 && y > 1 : body !== '.' && body !== '#')) {
      const hex = toy[y - oy - at.y]?.[x - ox - at.x];
      if (hex) top.set(x, y, blend(rgb(hex), pose.lift && !pose.lid ? [255, 226, 170] : [228, 238, 255], 0.16));
    }
    if (show.dome && p.dome && dome !== '.') {
      const r2 = ((x - C) ** 2 + (y + pose.lift - C) ** 2) / (R * R), rim = Math.min(1, r2) ** 3, toyHere = top.alpha(x, y) === 255;
      if (dome === '#') continue;
      if (dome === 'e' && !toyHere) top.set(x, y, [167, 184, 220], 210);
      else top.set(x, y, blend([214, 228, 250], [120, 140, 190], rim * 0.5), Math.round(28 + rim * 175));
      if (dome === 'H') top.set(x, y, WHITE, 215);
      if (p.lip) top.set(x, y, [167, 184, 220], 220);
    }
    if (p.body === 'dome' || body === '.' || body === '#') continue;
    const candy = look.candy(p.bu - C, p.bv - C, grid);
    if (p.body !== 'candy') { bot.set(x, y, blend(candy, WHITE, p.body === 'seam' ? 0.55 : 0.18)); continue; }
    bot.set(x, y, body === 'e' ? blend(candy, INK, 0.38) : body === 'd' ? blend(candy, INK, 0.2) : body === 'l' || body === 'H' ? blend(candy, WHITE, 0.22) : body === 's' ? blend(candy, WHITE, 0.6) : candy);
  }
  top.outline(INK); bot.outline(INK);
  return { top, bot };
}

const halvesAt = (look: Look, grid: CapsuleGrid, pose: Pose, show: Show = ALL) => (grid === 64 ? master(look, pose, show) : small(look, grid, pose, show));

/**
 * Warm light from a capsule cracked open, drawn behind both halves and only where light can come from:
 * a glow behind the dome's glass (brightest by the crack, so the toy stands dark against it), white-hot
 * in the gap between dome and candy, and out of the crack past the side on 32 and 64. On 16 and 24 the
 * dome lifts straight off, so it glows all over, like a bulb, over a white-hot line.
 */
function light(grid: CapsuleGrid, pose: Pose, top: Px, bot: Px): Px {
  const g = new Px(grid), C = CENTRE[grid], R = RADIUS[grid] + 1;
  const hot: RGB = [255, 248, 222], warm: RGB = [255, 210, 112];
  // Tipped back, the crack opens on one side; lifted straight off (the small grids), all the way round.
  const tilt = pose.lid ? (pose.lid < 0 ? 1 : -1) : 0;
  const mouth = { x: C + tilt * (R - 1), y: C - 1 - pose.lift - Math.abs(Math.sin(pose.lid)) * R * 0.5 };
  for (let y = 0; y < grid; y++) for (let x = 0; x < grid; x++) {
    if (top.alpha(x, y)) {
      // Behind the glass: tipped, hot by the crack and amber away from it; lifted, the whole dome a bulb.
      const t = Math.min(1, Math.max(0, tilt ? (C - y) / (R * 2) + 0.12 - 0.3 * tilt * (x - C) / R : (C - 1 - pose.lift - y) / (R * 1.4)));
      g.set(x, y, tilt ? blend(hot, [255, 186, 84], t) : blend([255, 236, 170], [255, 194, 80], t), Math.round(250 - (tilt ? 50 : 40) * t));
      continue;
    }
    if (bot.alpha(x, y) || !tilt) continue;
    const p = places(grid, pose, x, y);
    // Inside the capsule's outline, only the gap: under the dome's seam and over the candy's.
    if (Math.hypot(x - C, y - C) <= R || Math.hypot(x - C, y + pose.lift - C) <= R) { if (!p.dome && p.body === 'dome' && y < C + 1) g.set(x, y, hot); continue; }
    const d = Math.hypot(x - mouth.x, y - mouth.y), ang = Math.atan2(mouth.y - y, (x - mouth.x) * tilt);
    const ray = ang > -0.2 && [0.15, 0.6, 1.1].some(a => Math.abs(ang - a) * d < (grid === 64 ? 1.4 : 0.7)) && d < R * 0.75;
    if (ray || d < (grid === 64 ? 4 : 1.5)) g.set(x, y, blend(hot, warm, d / R), Math.round(240 * Math.max(0.25, 1 - d / (R * 0.75))));
  }
  // Lifted straight off: in each column, the gap from the dome's rim down to the candy's, white-hot.
  if (!tilt) for (let x = 0; x < grid; x++) {
    let under = -1, over: number = grid;
    for (let y = 0; y < grid; y++) { if (top.alpha(x, y)) under = y; if (bot.alpha(x, y) && over === grid) over = y; }
    if (under >= 0 && over < grid) for (let y = under + 1; y < over; y++) g.set(x, y, hot);
  }
  // Where the light past the side meets the frame's edge, a pixel left on its own reads as a speck.
  const near = (x: number, y: number) => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]
    .filter(([dx, dy]) => g.alpha(x + dx, y + dy) || top.alpha(x + dx, y + dy) || bot.alpha(x + dx, y + dy)).length;
  for (let y = 0; y < grid; y++) for (let x = 0; x < grid; x++) if (g.alpha(x, y) && !top.alpha(x, y) && !bot.alpha(x, y) && near(x, y) <= 1) g.d.fill(0, (y * grid + x) * 4, (y * grid + x) * 4 + 4);
  return g;
}

/** One frame: the halves in a pose, stacked, shifted by `dx`, with the light behind them when it's open. */
function frame(look: Look, grid: CapsuleGrid, pose: Pose, dx = 0): Uint8ClampedArray {
  const { top, bot } = halvesAt(look, grid, pose);
  if (!pose.lift) return stack(grid, [bot.shifted(dx, 0), top.shifted(dx, 0)]);
  // Lifted straight off, the groove's ink over the seam is light now.
  if (!pose.lid) for (let y = 0; y < Math.ceil(CENTRE[grid] - 1); y++) bot.d.fill(0, y * grid * 4, (y + 1) * grid * 4);
  const candy = pose.drop ? bot.shifted(0, pose.drop) : bot;
  return stack(grid, [light(grid, pose, top, candy), candy, top]);
}

/**
 * Cracked open: on 32 and 64 the dome tips back on its left edge, light pouring out on the right; on 16
 * and 24, too small for that to read, the halves part a pixel each way round a line of light and the
 * dome glows.
 */
const openPose = (grid: CapsuleGrid): Pose => (grid >= 32 ? { turn: 0, lid: (-14 * Math.PI) / 180, lift: 1 } : { turn: 0, lid: 0, lift: 1, drop: 1 });

/*
 * The wobble: a rest on the shut capsule, then two quick rocks either way, back where it started. Each
 * step is a share of the grid's furthest rock: 13 degrees on 32 and 64; on the small grids no more than
 * tips the seam a pixel, with the whole capsule nudged a pixel at the far ends instead.
 */
const ROCK = [0, 0.5, 1, 0.5, 0, -0.5, -1, -0.5, 0, 0.5, 1, 0.5, 0, -0.5, -1, -0.5];
const ROCK_DEGREES: Record<CapsuleGrid, number> = { 16: 9, 24: 6, 32: 13, 64: 13 };
const REST_MS = 700, ROCK_MS = 50;

/** The base grid and whole-number scale for a size: 16, 24, 32 or 64, or a whole multiple of one (64 first). */
function gridFor(size: number, grid?: CapsuleGrid): { grid: CapsuleGrid; scale: number } | null {
  if (!Number.isInteger(size) || size < 16) return null;
  if (grid) return CAPSULE_GRIDS.includes(grid) && size % grid === 0 ? { grid, scale: size / grid } : null;
  const fit = [64, 32, 24, 16].find(g => size % g === 0) as CapsuleGrid | undefined;
  return fit ? { grid: fit, scale: size / fit } : null;
}

/** What `capsuleFrames` takes. */
export interface CapsuleOptions {
  /** A capsule's id (`puttsies`, `pets`, `mystery`, `free`, `season.pumpkin`), or `season` with `season`. */
  machine: string;
  state?: CapsuleState;
  /** Its side in pixels: 16, 24, 32 or 64 draws that grid; a whole multiple of one scales it up (64 first). 64 if not given. */
  size?: number;
  /** The grid to draw it on, when a size could be more than one (48 is 24 or 16 scaled). */
  grid?: CapsuleGrid;
  /** A seasonal hat's id (`club.pumpkin`, or `pumpkin`) for `machine: 'season'`. */
  season?: string;
}

/**
 * A capsule as frames: one still frame `closed` or `open`, or the `wobble`'s loop (a rest, then two
 * quick rocks either way, back where it started). Null for a machine, state or size there isn't.
 */
export function capsuleFrames(options: CapsuleOptions): Frames | null {
  const c = capsuleById(options.machine, options.season), state = options.state ?? 'closed', fit = gridFor(options.size ?? options.grid ?? 64, options.grid);
  if (!c || !fit || !CAPSULE_STATES.includes(state)) return null;
  const look = lookOf(c), { grid, scale } = fit;
  const frames = state === 'wobble'
    ? ROCK.map(f => frame(look, grid, { ...SHUT, turn: (f * ROCK_DEGREES[grid] * Math.PI) / 180 }, grid < 32 && Math.abs(f) === 1 ? f : 0))
    : [frame(look, grid, state === 'open' ? openPose(grid) : SHUT)];
  return {
    width: grid * scale, height: grid * scale,
    frames: frames.map(f => upscale(f, grid, grid, scale)),
    delays: state === 'wobble' ? ROCK.map((_, k) => (k === 0 ? REST_MS : ROCK_MS)) : [1000],
  };
}

/**
 * A shut capsule's two halves apart, each `grid` square and outlined on its own, for a page that
 * moves them itself (the site twists the dome off and drops the candy away). The dome is drawn over
 * the candy. Null for a capsule there isn't.
 */
export function capsuleHalves(machine: string, options: { season?: string; grid?: CapsuleGrid } = {}): { top: Uint8ClampedArray; bottom: Uint8ClampedArray; size: number } | null {
  const c = capsuleById(machine, options.season), grid = options.grid ?? 64;
  if (!c || !CAPSULE_GRIDS.includes(grid)) return null;
  const { top, bot } = halvesAt(lookOf(c), grid, SHUT);
  return { top: top.d, bottom: bot.d, size: grid };
}

/**
 * A capsule's halves in any pose, each `grid` square and outlined on its own, the toy and the dome's
 * glass drawn or left out (`show`): what ./capsule-open plays its open from. Not in the library's
 * index; a page plays the open, or moves `capsuleHalves` itself.
 */
export function capsuleLayers(id: string, pose: Pose, show: Show = ALL, grid: CapsuleGrid = 64): { top: Uint8ClampedArray; bottom: Uint8ClampedArray } | null {
  const c = capsuleById(id);
  if (!c || !CAPSULE_GRIDS.includes(grid)) return null;
  const { top, bot } = halvesAt(lookOf(c), grid, pose, show);
  return { top: top.d, bottom: bot.d };
}

// ------------------------------------------------------------ addresses

/**
 * A capsule's picture from the lil guys Worker (`setLilGuysHost` moves it): `/g/<art version>/capsule/<id>-<state>-<grid>@<scale>.png`,
 * an animated PNG for the wobble. Only PNG: a GIF has no see-through glass.
 */
export function capsuleUrl(id: string, state: CapsuleState = 'closed', grid: CapsuleGrid = 64, options: { scale?: number; host?: string } = {}): string {
  const { scale = 1, host = lilGuysHost() } = options;
  return `${host}/g/${ART_VERSION}/capsule/${id}-${state}-${grid}${scale > 1 ? '@' + scale : ''}.png`;
}

/** The plain files of the capsule pack (`/capsules/`): every capsule shut, at 16, 32, 64 and 128. */
export const CAPSULE_FILE_SIZES = [16, 32, 64, 128] as const;
export const capsuleFile = (id: string, size: number) => `${id}-${size}.png`;

/** What `/capsules/manifest.json` says: every capsule, its name and colour, and where each picture is. */
export interface CapsuleManifest {
  version: number;
  grids: readonly number[];
  states: readonly CapsuleState[];
  /** Any capsule's picture: fill in `{id}`, `{state}`, `{grid}` and `{scale}` (`@2`, or nothing for 1). */
  url: string;
  capsules: (Capsule & { files: Record<string, string>; closed: Record<string, string>; wobble: Record<string, string>; open: Record<string, string> })[];
}

/**
 * The manifest a game reads to show capsules: each one's plain files (shut, 16 to 128) and its Worker
 * pictures in every state on each grid, 128 being the master at 2×. Wobble's are animated PNGs.
 */
export function capsuleManifest(host = lilGuysHost()): CapsuleManifest {
  const sizes = (id: string, state: CapsuleState) => Object.fromEntries([...CAPSULE_GRIDS.map(g => [String(g), capsuleUrl(id, state, g, { host })]), ['128', capsuleUrl(id, state, 64, { host, scale: 2 })]]);
  return {
    version: ART_VERSION,
    grids: CAPSULE_GRIDS,
    states: CAPSULE_STATES,
    url: `${host}/g/${ART_VERSION}/capsule/{id}-{state}-{grid}{scale}.png`,
    capsules: CAPSULES.map(c => ({
      ...c,
      files: Object.fromEntries(CAPSULE_FILE_SIZES.map(s => [String(s), `${host}/capsules/${capsuleFile(c.id, s)}`])),
      closed: sizes(c.id, 'closed'), wobble: sizes(c.id, 'wobble'), open: sizes(c.id, 'open'),
    })),
  };
}
