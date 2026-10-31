import { hash } from './hash';
import { AURAS, AURA_ODDS } from './auras';
import { EFFECTS, FX_IDS, rollFx, type Fx } from './effects';
import { GAMES, gameItems, freeItem, inSeason, itemById, itemWeight, type Item, type Slot } from './items';
import { MAX_PINS, pinById } from './pins';
import { PAINT_IDS, type PaintId } from './paints';
import { LAYER } from './parts/art';
import type { GameId } from './types';

/**
 * Owned copies of items, collected like toys.
 *
 * An item (`puttsies.ball`) is a design. A copy someone owns adds:
 *
 * - a **finish**: the paint job. Plain is common; Sunset, Tempered, Nebula,
 *   Prism, Negative and Gold are progressively rarer, and three graphic ones,
 *   Op, Impossible and Grid, are Grails beside Gold
 * - a **scuff** between 0 and 1: how worn it is. Low is pristine, high is
 *   battered. The condition (Box Fresh … Battered) is a range of it, and
 *   the scuffs really show: paint chips off as it rises
 * - a **print** number between 0 and 999: where the finish lands. Most prints
 *   are ordinary; a few are famous (a Deep Blue Tempered, a Red Giant or
 *   Black Hole Nebula)
 * - sometimes a **tally**: a counter of the days its owner finished the game
 *   while wearing it (a Strange copy, as TF2 calls it)
 * - a **craft number** if it was crafted from metal (see ./craft), and a
 *   **paint** if someone painted it (see ./paints)
 *
 * Two copies of the same item are almost never the same: the scuff alone has
 * millions of values. Everything is deterministic from the stored numbers, so
 * a copy looks the same everywhere it is drawn.
 */

export type Finish = 'plain' | 'sunset' | 'tempered' | 'nebula' | 'prism' | 'negative' | 'gold'
  | 'classic' | 'fade' | 'frost' | 'toxic' | 'shadow' | 'sapphire' | 'ruby' | 'pearl'
  | 'op' | 'impossible' | 'grid';

export interface Owned {
  item: string;
  finish: Finish;
  /** 0–1, how worn. */
  scuff: number;
  /** 0–999, where the finish and the scuffs land. */
  print: number;
  /** Days the owner finished the game wearing it, if it keeps a tally. */
  tally?: number;
  /** Pins earned and stuck on it (see ./pins), at most three. */
  pins?: string[];
  /** A seasonal copy's drop day, `YYYY-MM-DD`; it is part of what the copy is. */
  date?: string;
  /** A souvenir: the day's free capsule for finishing every game, and that day. */
  souvenir?: string;
  /** A rare effect on top of the finish (see ./effects). */
  fx?: Fx;
  /** Crafted from metal: which craft it was, counting every copy ever crafted. */
  craft?: number;
  /** A hat or a buddy's paint (see ./paints). */
  paint?: PaintId;
}

export const GRADES = [
  { id: 'everyday', name: 'Everyday', color: '#4B69FF' },
  { id: 'special', name: 'Special', color: '#8847FF' },
  { id: 'prized', name: 'Prized', color: '#D32CE6' },
  { id: 'mythic', name: 'Mythic', color: '#EB4B4B' },
  { id: 'grail', name: '★ Grail', color: '#E4AE39' },
  { id: 'aura', name: '★ Aura', color: '#19D3C5' },
] as const;
export type Grade = (typeof GRADES)[number];

/**
 * Each finish: its grade, the chance a capsule rolls it, and the scuff range
 * it can come in. The flashy finishes only exist barely worn, so there is no
 * Battered Nebula. Append only: a copy stores its finish's id, and a capsule
 * rolls them in this order.
 */
export const FINISHES: Record<Finish, { name: string; grade: number; odds: number; scuffs: [number, number]; aura?: number }> = {
  'plain':    { name: 'Plain',    grade: 0, odds: 79.87, scuffs: [0, 1] },
  'sunset':   { name: 'Sunset',   grade: 1, odds: 15.97, scuffs: [0, 0.08] },
  'tempered': { name: 'Tempered', grade: 2, odds: 1.6,   scuffs: [0, 1] },
  'nebula':   { name: 'Nebula',   grade: 2, odds: 1.6,   scuffs: [0, 0.08] },
  'prism':    { name: 'Prism',    grade: 3, odds: 0.5,   scuffs: [0, 0.08] },
  'negative': { name: 'Negative', grade: 3, odds: 0.2,   scuffs: [0, 0.08] },
  'gold':     { name: 'Gold',     grade: 4, odds: 0.1,   scuffs: [0, 0.08] },
  // An aura's own finishes (./auras): never rolled on an item; `aura` is each
  // one's share of auras, in percent. Any float, since a worn aura shows it.
  'classic':  { name: 'Classic',  grade: 5, odds: 0, aura: 50,  scuffs: [0, 1] },
  'fade':     { name: 'Fade',     grade: 5, odds: 0, aura: 22,  scuffs: [0, 1] },
  'frost':    { name: 'Frost',    grade: 5, odds: 0, aura: 12,  scuffs: [0, 1] },
  'toxic':    { name: 'Toxic',    grade: 5, odds: 0, aura: 8,   scuffs: [0, 1] },
  'shadow':   { name: 'Shadow',   grade: 5, odds: 0, aura: 5,   scuffs: [0, 1] },
  'sapphire': { name: 'Deep sea · Sapphire', grade: 5, odds: 0, aura: 1.5, scuffs: [0, 1] },
  'ruby':     { name: 'Deep sea · Ruby', grade: 5, odds: 0, aura: 1.2, scuffs: [0, 1] },
  'pearl':    { name: 'Deep sea · Black pearl', grade: 5, odds: 0, aura: 0.3, scuffs: [0, 1] },
  // ---------------------------------------------------------------- added Oct 30, 2026 (append only)
  // Graphic finishes in the club's ink, ivory and coral: concentric rings, bands that turn at the middle, panes.
  // Grails beside Gold, each rarer than any Mythic finish. Gold went from 0.25 to 0.1 and Sunset from 15.98
  // to 15.97, so every Grail is rarer than every Mythic.
  'op':         { name: 'Op',         grade: 4, odds: 0.06, scuffs: [0, 0.08] },
  'impossible': { name: 'Impossible', grade: 4, odds: 0.05, scuffs: [0, 0.08] },
  'grid':       { name: 'Grid',       grade: 4, odds: 0.05, scuffs: [0, 0.08] },
};

/** The graphic finishes: a pattern of their own across the item, in ink, ivory and coral. */
export const GRAPHIC_FINISHES: readonly Finish[] = ['op', 'impossible', 'grid'];

/** Condition, by scuff, in the words toy collectors use. */
export const WEAR = [
  { name: 'Box Fresh', short: 'BF', max: 0.07 },
  { name: 'Like New', short: 'LN', max: 0.15 },
  { name: 'Played With', short: 'PW', max: 0.38 },
  { name: 'Well Loved', short: 'WL', max: 0.45 },
  { name: 'Battered', short: 'BT', max: 1.01 },
] as const;

export function wearOf(scuff: number) {
  return WEAR.find(w => scuff < w.max)!;
}

/** The famous prints. A Tempered copy with one of these comes out nearly all blue. */
export const DEEP_BLUE_PRINTS = [661, 670, 321, 387, 955];

/**
 * Tempered steel's tints, darkest to lightest. The print picks one; the famous
 * Deep Blue prints are the only all-blue ones.
 */
const TINTS: Record<string, [string, string, string]> = {
  'Steel': ['#3A5FC0', '#86A8E8', '#E2BC5A'],
  'Rose': ['#B8456F', '#F09AB8', '#F2CF7A'],
  'Emerald': ['#16806A', '#4FCB9E', '#CFE68A'],
  'Copper': ['#94401F', '#E0773A', '#F6C978'],
  'Violet': ['#5A3CB0', '#9F82F0', '#7FC6F2'],
  'Deep Blue': ['#1B3A9E', '#2F5FD0', '#6F9BF5'],
};

/** A Tempered copy's tint, from its print. */
export function temperTint(print: number): string {
  return DEEP_BLUE_PRINTS.includes(print) ? 'Deep Blue' : ['Steel', 'Rose', 'Emerald', 'Copper', 'Violet'][print % 5];
}

/** A Nebula copy's look, from its print: three rare ones, otherwise one of four. */
export function nebulaPhase(print: number): string {
  const p = print % 20;
  return p === 0 ? 'Red Giant' : p === 1 ? 'Blue Moon' : p === 2 ? 'Black Hole' : `Nebula ${['I', 'II', 'III', 'IV'][print % 4]}`;
}

const RARE_PHASES = ['Red Giant', 'Blue Moon', 'Black Hole'];

/** What makes this copy special beyond its finish, if anything. */
export function special(o: Owned): string | undefined {
  if (o.finish === 'tempered' && DEEP_BLUE_PRINTS.includes(o.print)) return 'Deep Blue';
  if (o.finish === 'nebula' && RARE_PHASES.includes(nebulaPhase(o.print))) return nebulaPhase(o.print);
  return undefined;
}

export function gradeOf(o: Owned): Grade {
  if (FINISHES[o.finish].grade === 5) return GRADES[5];
  // A famous print lifts a copy one grade, as far as Grail.
  return GRADES[Math.min(4, FINISHES[o.finish].grade + (special(o) ? 1 : 0))];
}

/** An effect at least this rare (one copy in this many) makes its copy an Unusual (`unusual`). */
export const UNUSUAL_ONE_IN = 250;

/**
 * Whether a copy is an Unusual: a showpiece, or a copy with an effect rarer
 * than about one in 250 that isn't its showpiece's own (rated on the aura
 * ladder for an aura). What its card, its reveal and a board celebrate,
 * whatever its grade; the grade itself (`gradeOf`) is unchanged.
 */
export function unusual(o: Owned): boolean {
  const item = itemById(o.item);
  if (item?.showpiece) return true;
  if (!o.fx || o.fx === item?.signature || !EFFECTS[o.fx]) return false;
  return EFFECTS[o.fx][FINISHES[o.finish]?.aura ? 'aura' : 'item'] >= UNUSUAL_ONE_IN;
}

/** The name as it would show on an inventory card. */
export function nameOf(o: Owned): string {
  const item = itemById(o.item);
  const base = (o.date ? `${o.date.slice(0, 4)} ` : '') + (item?.name ?? o.item);
  const tally = (o.souvenir ? 'Souvenir ' : '') + (o.fx && o.fx !== item?.signature ? `${EFFECTS[o.fx].name} ` : '') + (o.tally !== undefined ? 'Strange ' : '');
  if (FINISHES[o.finish].aura) return `${tally}★ ${base}${o.finish === 'classic' ? '' : ` | ${FINISHES[o.finish].name}`}`;
  if (o.finish === 'plain') return tally + base;
  const look = o.finish === 'nebula' ? nebulaPhase(o.print)
    : o.finish === 'tempered' ? (special(o) ? 'Deep Blue' : `${temperTint(o.print)} Tempered`) : FINISHES[o.finish].name;
  return `${tally}${base} | ${look}`;
}

// ---------------------------------------------------------------- storage

/**
 * A copy as one short string, to store or put in a URL:
 * `puttsies.ball~nebula~0.0123456~20`; with a tally `…~20~t412`; with pins
 * `…~p` and their ids joined by `+`, as in `…~t412~pstar+flame`.
 */
export function encode(o: Owned): string {
  const parts = [o.item, o.finish, o.scuff.toFixed(7), String(o.print)];
  if (o.tally !== undefined) parts.push(`t${o.tally}`);
  if (o.pins?.length) parts.push(`p${o.pins.slice(0, MAX_PINS).join('+')}`);
  if (o.date) parts.push(`d${o.date}`);
  if (o.souvenir) parts.push(`s${o.souvenir}`);
  if (o.fx) parts.push(`x${o.fx}`);
  if (o.craft !== undefined) parts.push(`c${o.craft}`);
  if (o.paint) parts.push(`k${o.paint}`);
  return parts.join('~');
}

export function decode(s: string): Owned | null {
  const [item, finish, scuff, print, ...extra] = s.split('~');
  if (!itemById(item) || !(finish in FINISHES)) return null;
  const f = Number(scuff), p = Number(print);
  if (!(f >= 0 && f <= 1) || !Number.isInteger(p) || p < 0 || p > 999) return null;
  const o: Owned = { item, finish: finish as Finish, scuff: f, print: p };
  for (const part of extra) {
    if (part.startsWith('t') && /^\d+$/.test(part.slice(1))) o.tally = Number(part.slice(1));
    if (part.startsWith('d') && /^\d{4}-\d{2}-\d{2}$/.test(part.slice(1))) o.date = part.slice(1);
    if (part.startsWith('s') && /^\d{4}-\d{2}-\d{2}$/.test(part.slice(1))) o.souvenir = part.slice(1);
    if (part.startsWith('x') && (FX_IDS as string[]).includes(part.slice(1))) o.fx = part.slice(1) as Fx;
    if (part.startsWith('c') && /^\d{1,9}$/.test(part.slice(1))) o.craft = Number(part.slice(1));
    if (part.startsWith('k') && (PAINT_IDS as string[]).includes(part.slice(1))) o.paint = part.slice(1) as PaintId;
    if (part.startsWith('p')) {
      const pins = part.slice(1).split('+').filter(id => pinById(id)).slice(0, MAX_PINS);
      if (pins.length) o.pins = pins;
    }
  }
  return o;
}

// ---------------------------------------------------------------- getting one

/** A uniform number in [0, 1) from a string, for deterministic rolls. */
function unit(seed: string): number {
  return hash(seed) / 4294967296;
}

/**
 * The copy every player has from the start: their game's free hat, plain, with
 * a scuff and print taken from their name. Everyone gets one, and everyone's
 * is a little different — a lucky name gets a 0.003 Box Fresh.
 */
export function starter(name: string, game: GameId): Owned {
  return {
    item: freeItem(game).id,
    finish: 'plain',
    scuff: Math.round(unit(`${name}|${game}|float`) * 1e7) / 1e7,
    print: hash(`${name}|${game}|pattern`) % 1000,
  };
}

/**
 * Opens a capsule for a game: one of its items (the free hat aside), with a
 * finish, scuff, print and maybe a tally, all rolled from `seed`.
 *
 * The seed decides everything, so the same seed always opens the same thing.
 * In production the seed must come from the server — a random value made at
 * drop time and stored with the copy — never from anything a player picks.
 */
export function roll(seed: string, game: GameId): Owned {
  if (unit(`${seed}|aura`) < AURA_ODDS) return rollAura(seed);
  return rollFrom(gameItems(game).filter(i => !i.free), seed);
}

/**
 * The machine a mystery capsule comes from: any of them, each as likely as its
 * share of every machine's capsule pool (the items a capsule can give, by
 * weight), so every item across the machines is as likely as it is in its own.
 * Then `roll(seed, game)` opens it as that machine's capsule.
 */
export function mysteryMachine(seed: string): GameId {
  const pools = GAMES.map(game => gameItems(game).filter(i => !i.free).reduce((a, i) => a + itemWeight(i), 0));
  let r = unit(`${seed}|machine`) * pools.reduce((a, b) => a + b, 0);
  return GAMES.find((_, i) => (r -= pools[i]) < 0) ?? GAMES[GAMES.length - 1];
}

/** An aura, from any machine: which one, its finish by share, any float, a print and maybe a tally. */
function rollAura(seed: string): Owned {
  const aura = AURAS[hash(`${seed}|which`) % AURAS.length];
  let r = unit(`${seed}|finish`) * 100;
  let finish: Finish = 'classic';
  for (const [id, f] of Object.entries(FINISHES) as [Finish, (typeof FINISHES)[Finish]][]) {
    if (!f.aura) continue;
    r -= f.aura;
    if (r < 0) { finish = id; break; }
  }
  const o: Owned = { item: aura.id, finish, scuff: Math.round(unit(`${seed}|float`) * 1e7) / 1e7, print: hash(`${seed}|pattern`) % 1000 };
  if (unit(`${seed}|stattrak`) < 0.1) o.tally = 0;
  const fx = rollFx(unit(`${seed}|fx`), true);
  if (fx) o.fx = fx;
  return o;
}

/**
 * A seasonal drop: one of the hats in season on `day` (`YYYY-MM-DD`), rolled
 * like a capsule and stamped with the day. Null when nothing is in season.
 */
export function rollSeason(seed: string, day: string): Owned | null {
  const pool = inSeason(day);
  if (!pool.length) return null;
  return { ...rollFrom(pool, seed), date: day.slice(0, 10) };
}

function rollFrom(pool: Item[], seed: string): Owned {
  // A plain pool draws evenly as it always has; one with a showpiece weighs it lighter.
  let item = pool[hash(`${seed}|item`) % pool.length];
  if (pool.some(i => i.showpiece)) {
    let r = unit(`${seed}|item`) * pool.reduce((a, i) => a + itemWeight(i), 0);
    item = pool.find(i => (r -= itemWeight(i)) < 0) ?? pool[pool.length - 1];
  }

  let r = unit(`${seed}|finish`) * 100;
  let finish: Finish = 'plain';
  for (const [id, f] of Object.entries(FINISHES) as [Finish, (typeof FINISHES)[Finish]][]) {
    r -= f.odds;
    if (r < 0) { finish = id; break; }
  }

  const [lo, hi] = FINISHES[finish].scuffs;
  const scuff = Math.round((lo + unit(`${seed}|float`) * (hi - lo)) * 1e7) / 1e7;
  const print = hash(`${seed}|pattern`) % 1000;
  const o: Owned = { item: item.id, finish, scuff, print };
  if (unit(`${seed}|stattrak`) < 0.1) o.tally = 0;
  const fx = rollFx(unit(`${seed}|fx`), false) ?? item.signature;
  if (fx) o.fx = fx;
  return o;
}

/** Which slot a copy goes in. */
export function slotOf(o: Owned): Slot | undefined {
  return itemById(o.item)?.slot;
}

// ---------------------------------------------------------------- painting

type RGB = [number, number, number];
const rgb = (h: string): RGB => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) as RGB;
const hex = (c: RGB) => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map(i => a[i] + (b[i] - a[i]) * t) as RGB;
const lum = (c: RGB) => (0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]) / 255;

/** A well-mixed number in [0, 1) for a cell, so neighbouring cells don't correlate. */
function cellNoise(...n: number[]): number {
  let h = 0x9e3779b9;
  for (const v of n) {
    h = Math.imul(h ^ v, 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return (h >>> 0) / 4294967296;
}

/**
 * Shades a finish colour by how light the item's own colour was there: dark
 * parts go deep, light parts go towards white. The full range keeps the
 * item's own drawing (a golf ball's dimples, a brick's studs) showing through
 * the finish instead of flattening it to one colour.
 */
const shaded = (c: RGB, l: number) => {
  const t = Math.max(0, Math.min(1, (l - 0.15) / 0.75));
  return t < 0.5 ? mix(mix(c, [0, 0, 0], 0.5), c, t * 2) : mix(c, mix(c, [255, 255, 255], 0.6), (t - 0.5) * 2);
};

/** A colour along a ramp of stops, `t` 0 to 1, blended smoothly between them. */
const ramp = (stops: RGB[], t: number): RGB => {
  const at = Math.max(0, Math.min(1, t)) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(at));
  return mix(stops[i], stops[i + 1], at - i);
};

/** A colour taken through its tone: `t` 0 its shadow, 0.5 itself, 1 its highlight. */
const toned = (c: RGB, t: number, deep: RGB = [16, 12, 34]) =>
  t < 0.5 ? mix(mix(c, deep, 0.62), c, t * 2) : mix(c, mix(c, [255, 255, 255], 0.72), (t - 0.5) * 2);

const hsl = (h: number, s: number, l: number): RGB => {
  const k = (n: number) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  return [0, 8, 4].map(n => 255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)))) as RGB;
};
const hueOf = (c: RGB): { h: number; s: number } => {
  const [r, g, b] = c.map(v => v / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d < 1e-6) return { h: 0, s: 0 };
  const l = (max + min) / 2, s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s };
};

/** Rich polished gold, from a deep amber shade through saturated warm yellows to a light highlight. */
const GOLD = ['#7A3E00', '#B06A04', '#E09A12', '#F8C424', '#FFDD4A', '#FFEFA0', '#FFF8D8'].map(rgb);
const WHITE_GOLD = ['#3A3226', '#76695A', '#B3A58E', '#DDD2BC', '#F2EBDC', '#FFFBF2', '#FFFFFF'].map(rgb);

/**
 * A colour's tone with some of its own lightness kept: a pale item stays pale in a dark finish and a
 * dark part stays darker than it, so a big costume keeps its light and dark instead of one blob.
 */
const lit = (tone: number, l: number) => tone * 0.6 + l * 0.4;

/** How far across the item a cell is, corner to corner, about 0 to 1: what a finish's sweep runs along. */
const across = (x: number, y: number) => (x + y * 0.8) / 26;

/** Where one of an item's own colours sits for a finish (`toneOf`). */
export interface Tone {
  /** 0 deep shadow to 1 highlight, its main colour at 0.5. */
  tone: number;
  /** 0 the main colour's own hue to 1 a part in another colour altogether (a fox's white chest on its orange). */
  part: number;
}

/**
 * Where each of an item's own colours sits for a finish: its main colour (the
 * first) in the middle, the rest by how much lighter or darker than it they
 * are, and how far their colour is from it. A finish paints by these, so the
 * item's shading and its parts (a hood, its lining, the ears' insides) keep
 * the steps the artist drew between them.
 */
export function toneOf(colors: string[]): Map<string, Tone> {
  const ls = colors.map(c => lum(rgb(c))), main = ls[0] ?? 0.5;
  // Subtle shading is opened up a little; an item whose colours run far from its main one is fitted into the range.
  const down = 0.47 / Math.max(0.33, main - Math.min(...ls)), up = 0.47 / Math.max(0.33, Math.max(...ls) - main);
  const chroma = (c: RGB) => { const g = (c[0] + c[1] + c[2]) / 3; return c.map(v => v - g); };
  const key = colors[0] ? chroma(rgb(colors[0])) : [0, 0, 0];
  return new Map(colors.map((c, i) => {
    const k = chroma(rgb(c));
    return [c.toUpperCase(), { tone: 0.5 + (ls[i] - main) * (ls[i] < main ? down : up), part: Math.min(1, Math.hypot(k[0] - key[0], k[1] - key[1], k[2] - key[2]) / 120) }];
  }));
}

/**
 * Where an item sits on the grid it is painted on: its first and last column
 * and row. A finish runs its sweep across this box, so a small hat shows a
 * whole rainbow and a skin no more than one. `paintCell` is given it; without
 * it, the box the item's slot usually takes stands in (`boxOf`).
 */
export interface ItemBox { left: number; top: number; right: number; bottom: number }

/** An item's box, measured: its corner, size and middle, and on a skin the row its eyes sit on (`Item.eyes`). */
interface Box { x0: number; y0: number; w: number; h: number; cx: number; cy: number; eyes?: number }

const measured = (b: ItemBox, eyes?: number): Box => {
  const w = Math.max(1, b.right - b.left + 1), h = Math.max(1, b.bottom - b.top + 1);
  return { x0: b.left, y0: b.top, w, h, cx: b.left + (w - 1) / 2, cy: b.top + (h - 1) / 2, eyes };
};

/**
 * Where a face sits on a skin, by row from its eyes' line: the columns its
 * eyes and mouth, and the cells touching them, take on nearly every guy (the
 * face is drawn centred on the grid). A finish that would bury the face in
 * ink or in a void keeps these cells light, so the face reads at any size.
 */
const FACE_WINDOW: Record<number, [number, number]> = { [-3]: [4, 11], [-2]: [3, 12], [-1]: [3, 12], 0: [3, 12], 1: [4, 11], 2: [4, 11], 3: [5, 10], 4: [6, 9] };
const inFace = (b: Box, x: number, y: number) => {
  const span = b.eyes === undefined ? undefined : FACE_WINDOW[y - b.eyes];
  return !!span && x >= span[0] && x <= span[1];
};
/** A graphic finish's colour in a face's window: the same pattern, gone pale, so the face's ink reads on every cell of it. */
const paled = (c: RGB, b: Box, x: number, y: number): RGB => (inFace(b, x, y) ? mix(c, IVORY_RGB, 0.56) : c);

/**
 * Where each worn item sits on a composed grid, read off its layer's tokens
 * (`LAYER` in ./parts/art: a skin's 20s, a hat's 30s, a frame's 40s, a
 * buddy's 50s): the boxes `paintCell` sweeps each copy's finish across.
 */
export function boxesIn(grid: number[][]): Partial<Record<'skin' | 'hat' | 'frame' | 'buddy', ItemBox>> {
  const out: Partial<Record<'skin' | 'hat' | 'frame' | 'buddy', ItemBox>> = {};
  grid.forEach((row, y) => row.forEach((t, x) => {
    const slot = (['skin', 'hat', 'frame', 'buddy'] as const).find(k => t >= LAYER[k] && t < LAYER[k] + 10);
    if (!slot) return;
    const b = out[slot];
    if (!b) out[slot] = { left: x, top: y, right: x, bottom: y };
    else { b.left = Math.min(b.left, x); b.right = Math.max(b.right, x); b.top = Math.min(b.top, y); b.bottom = Math.max(b.bottom, y); }
  }));
  return out;
}

const boxes = new Map<string, ItemBox>();
/**
 * The box an item usually takes when nobody measured it: a skin's own art (it
 * is drawn on the whole grid), a frame's whole grid, a buddy's art where it
 * stands beside the guy (`buddyAlone`), and a hat over the middle of the head.
 */
export function boxOf(itemId: string): ItemBox {
  let b = boxes.get(itemId);
  if (b) return b;
  const item = itemById(itemId), art = item?.art;
  const lit = (rows: number[][]) => {
    let left = 99, right = -1, top = 99, bottom = -1;
    rows.forEach((row, y) => row.forEach((v, x) => { if (v) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); } }));
    return right < 0 ? null : { left, right, top, bottom };
  };
  const own = art ? lit(art) : null;
  b = item?.slot === 'frame' ? { left: 0, top: 0, right: 15, bottom: 15 }
    : item?.slot === 'skin' && own ? own
      : item?.slot === 'buddy' && own ? { left: 19, top: 15 - (own.bottom - own.top + 1), right: 18 + (own.right - own.left + 1), bottom: 14 }
        : { left: 3, top: 1, right: 12, bottom: 5 };
  boxes.set(itemId, b);
  return b;
}

/** Where a cell sits across its item's box, corner to corner, 0 to 1, along a slope (`dy` per column). */
const sweepOf = (x: number, y: number, b: Box, dy: number) => ((x - b.x0) + (y - b.y0) * dy) / Math.max(1, (b.w - 1) + (b.h - 1) * dy);

/** The club's ink, ivory and coral, and the primaries a Grid finish fills its panes with. */
const INK_RGB = rgb('#17131F'), IVORY_RGB = rgb('#F4EFE4'), CORAL = rgb('#EE6A50');
const PRIMARIES = ['#D9402E', '#2C55C8', '#F2C230'].map(rgb);

/** The famous prints' own looks, drawn in place of their finish's: what makes a one in a million look it. */
const FAMOUS: Record<string, (x: number, y: number, tone: number, p: number, l: number, b: Box) => RGB> = {
  // Saturated sapphire with one white caustic line across it, a soft blue either side.
  'Deep Blue': (x, y, tone, p, l, b) => {
    // It lies the way the finish's moving sheen does, so the sheen runs along it rather than across it.
    const line = (x - b.x0) + (y - b.y0) * 0.9 - ((b.w - 1) + (b.h - 1) * 0.9) * (0.3 + (p % 5) * 0.1);
    if (line >= 0 && line < 1) return rgb('#EEF6FF');
    if (line >= -1 && line < 2) return mix(ramp(SAPPHIRE, lit(tone, l)), rgb('#9CC8FF'), 0.55);
    return ramp(SAPPHIRE, 0.1 + lit(tone, l) * 0.75);
  },
  // A void: near-black, its rim lit like an accretion disc (ivory above, orange below), one hot band across it.
  'Black Hole': (x, y, tone, p, l, b) => {
    if (b.eyes !== undefined) {
      // On a skin the void is a dome over the face, the disc's hot edge a line across just above the
      // eyes, and below it the face in the disc's light, warm going down: as an eclipse rising.
      const edge = b.eyes - 4, d = Math.hypot((x - b.cx) / Math.max(1.5, b.w * 0.3), (y - edge - 0.5) / Math.max(1, edge - b.y0 + 0.5));
      if (y <= edge && d < 1) return mix(rgb('#07060B'), rgb('#231C33'), lit(tone, l) * 0.7);
      if (y <= edge) return ramp(['#FFF3D2', '#FFB45C', '#E2581F', '#8A2A12'].map(rgb), Math.min(1, (d - 1) * 0.8));
      if (y === edge + 1) return mix(rgb('#FFF3D2'), rgb('#FF8A30'), Math.min(1, Math.abs(x - b.cx) / Math.max(1, b.w / 2)));
      const t = (y - edge - 1) / Math.max(1, b.y0 + b.h - edge - 1) + (0.5 - lit(tone, l)) * 0.25;
      return ramp(['#FFE6B0', '#FFB45C', '#E2581F', '#8A2A12'].map(rgb), Math.max(0, Math.min(inFace(b, x, y) ? 0.5 : 1, t)));
    }
    const dx = (x - b.cx) / Math.max(1, b.w / 2), dy = (y - b.cy) / Math.max(1, b.h / 2), tilt = ((p >> 2) % 3 - 1) * 0.25;
    if (Math.abs((y - b.cy) - (x - b.cx) * tilt) < 0.5) return mix(rgb('#FFF3D2'), rgb('#FF8A30'), Math.min(1, Math.abs(dx) * 1.1));
    if (Math.hypot(dx, dy) > 0.8 || tone > 0.72) return mix(rgb('#FFE6B0'), rgb('#E2581F'), Math.max(0, Math.min(1, (dy + 1) / 2)));
    return mix(rgb('#07060B'), rgb('#231C33'), lit(tone, l) * 0.7);
  },
  // A swollen star: a white-gold core through orange to deep red at its edge.
  'Red Giant': (x, y, tone, _p, l, b) => {
    const r = Math.hypot((x - b.cx) / Math.max(1, b.w / 2), (y - b.cy) / Math.max(1, b.h / 2));
    return ramp(['#FFF1C2', '#FFB347', '#F0602E', '#C41E2C', '#5E0A1A'].map(rgb), Math.min(1, r * 0.78 + (0.55 - lit(tone, l)) * 0.6));
  },
  // A pale moon: silver blue, a few craters the print sets, its far side in shadow.
  'Blue Moon': (x, y, tone, p, l, b) => {
    const shade = ((x - b.cx) * (p % 2 ? 1 : -1)) / Math.max(1, b.w / 2);
    const crater = cellNoise(p, x, y, 21) > 0.82 && tone < 0.7;
    const t = Math.max(0, Math.min(1, 0.2 + lit(tone, l) * 0.75 - Math.max(0, shade - 0.35) * 0.9 - (crater ? 0.18 : 0)));
    return ramp(['#1E2F78', '#4E6CC8', '#9DB4EE', '#DCE6FF', '#FFFFFF'].map(rgb), t);
  },
};
/** Deep Blue's sapphire, deep to light. */
const SAPPHIRE = ['#05124F', '#0B2EA8', '#1A50E6', '#4C86FF', '#A9CBFF'].map(rgb);

/**
 * Each finish as a clean, premium version of the item: its colours mapped
 * through the finish's own ramp by tone, so the item's shading and parts all
 * still read, and any colour shift runs in smooth bands across the item's own
 * box (`ItemBox`), never pixel by pixel: every Prism shows its whole rainbow
 * and every Sunset its three colours, on a hat as on a skin. The shaders
 * (./finish-shader) move a sheen over it.
 */
const PAINT: Record<Finish, (x: number, y: number, tone: number, p: number, original: RGB, l: number, part: number, b: Box) => RGB> = {
  'plain': (_x, _y, _t, _p, original) => original,
  'sunset': (x, y, _t, p, _o, l, _part, b) => {
    const t = Math.max(0, Math.min(1, sweepOf(x, y, b, 0.5) * 1.1 - 0.05 + ((p % 100) / 100 - 0.5) * 0.2));
    const c = t < 0.5 ? mix(rgb('#F5C542'), rgb('#E55AA8'), t * 2) : mix(rgb('#E55AA8'), rgb('#7A4BE0'), (t - 0.5) * 2);
    return shaded(c, l);
  },
  'tempered': (x, y, tone, p, _o, l, part, b) => {
    if (DEEP_BLUE_PRINTS.includes(p)) return FAMOUS['Deep Blue'](x, y, tone, p, l, b);
    // Case-hardened steel: soft bands of heat tint running across the item,
    // through the print's tint (blue, its pale, straw gold, its pale again).
    const [a, bb, c] = TINTS[temperTint(p)].map(rgb);
    // Its darkest parts stay well off black, so a big item keeps its light and dark and never sinks into one blob.
    const s = (across(x, y) * 1.5 + (p % 11) / 11 + part * 0.4) % 1, k = (1 - Math.cos(s * Math.PI * 2)) / 2;
    const band = s < 0.5 ? mix(a, bb, k) : mix(c, bb, 1 - k);
    return toned(band, 0.28 + lit(tone, l) * 0.5, [10, 16, 40]);
  },
  'nebula': (x, y, tone, p, _o, l, part, b) => {
    const phase = nebulaPhase(p);
    if (FAMOUS[phase]) return FAMOUS[phase](x, y, tone, p, l, b);
    // Deep space: two of the phase's colours drifting into each other in soft
    // clouds across the item, dark in its shadows and lit pink in its lights.
    // A part drawn in another colour takes the second one, so it still stands apart.
    const [a, c] = [['#7A2AB8', '#3A3AD0'], ['#3A2AB0', '#8A3AC8'], ['#2A5AC0', '#6A2AB0'], ['#A82A8A', '#4A2AB8']][p % 4];
    const cloud = Math.min(1, (0.5 + 0.5 * Math.sin(x * 0.5 + p) * Math.cos(y * 0.42 - p * 0.7)) * (1 - part) + part * 0.95);
    // Its darkest parts are the cloud's deep, not black, so a big item keeps its light and dark and never sinks into one blob.
    const t = 0.2 + lit(Math.pow(tone, 1.1), l) * 0.72, sky = mix(rgb(a), rgb(c), cloud);
    return ramp([mix(sky, [8, 6, 22], 0.6), sky, mix(sky, rgb('#FFC4EC'), 0.5), rgb('#FFF0FA')], t);
  },
  'prism': (x, y, tone, p, _o, _l, _part, b) => {
    // One smooth rainbow sweeping corner to corner of the item, the item's own
    // tones from its shadows to near white, pearly.
    const h = (sweepOf(x, y, b, 0.8) * 300 + p * 7) % 360;
    return mix(hsl(h, 0.6, 0.3 + 0.58 * tone), [255, 255, 255], 0.14);
  },
  'negative': (x, y, tone, p, _o, _l, part, b) => {
    // A photographic negative, split hard down the item: one side ink, the
    // other ivory, each with the item's lights and darks swapped, and where
    // they meet a cyan and a magenta edge, as a print slipped out of register.
    // A skin's face sits on the ivory side, the split running on above and below it.
    const d = (x - b.cx) - (y - b.cy) * 0.35 * (p % 2 ? 1 : -1), face = inFace(b, x, y), dark = (d < 0) !== (p % 4 >= 2) && !face;
    if (d >= -1 && d < 0 && !face) return rgb('#D9468F');
    if (d >= 0 && d < 1 && !face) return rgb('#3BB8CF');
    if (dark) return tone < 0.35 ? rgb('#8E88A4') : part > 0.45 ? rgb('#3A3448') : tone > 0.62 ? rgb('#0C0A12') : rgb('#1C1826');
    return tone > 0.62 ? rgb('#5C566E') : part > 0.45 ? rgb('#CFC8D8') : tone < 0.35 ? rgb('#FFFFFF') : rgb('#F3EDE0');
  },
  // Auras are coloured by ./auras, not here.
  'classic': (_x, _y, _t, _p, original) => original,
  'fade': (_x, _y, _t, _p, original) => original,
  'frost': (_x, _y, _t, _p, original) => original,
  'toxic': (_x, _y, _t, _p, original) => original,
  'shadow': (_x, _y, _t, _p, original) => original,
  'sapphire': (_x, _y, _t, _p, original) => original,
  'ruby': (_x, _y, _t, _p, original) => original,
  'pearl': (_x, _y, _t, _p, original) => original,
  'gold': (x, y, tone, _p, _o, _l, part) => {
    // Polished gold: deep amber in the shadows, bright warm yellow in the middle, a light highlight,
    // with one soft gleam lying across it. A part in another colour leans to white gold, so it still
    // stands apart and still reads as gold.
    const t = 0.1 + tone * 0.82 + Math.max(0, 1 - Math.abs(across(x, y) - 0.42) / 0.16) * 0.12;
    return mix(ramp(GOLD, t), ramp(WHITE_GOLD, t), part * 0.3);
  },
  // The graphic finishes keep the item's darkest lines in ink, so its drawing still reads under the
  // pattern, and go pale round a skin's face (`paled`), so the face reads on them.
  'op': (x, y, tone, p, _o, _l, _part, b) => {
    // Concentric rings of ink and ivory round the item's middle, a coral dot at its heart; on a skin, round its face.
    const r = b.eyes === undefined ? Math.hypot(x - b.cx, y - b.cy) : Math.hypot((x - 7.5) * 0.8, y - b.eyes - 0.5);
    if (tone < 0.15 && !inFace(b, x, y)) return INK_RGB;
    if (r < 0.75 && b.eyes === undefined) return CORAL;
    return paled(Math.floor(r + 0.25 + (p % 3) / 3) % 2 ? INK_RGB : IVORY_RGB, b, x, y);
  },
  'impossible': (x, y, tone, p, _o, _l, _part, b) => {
    // Bands of ink, ivory and coral that slope one way on the left and the other
    // way on the right, half a band out of step where they meet: no one surface could be striped so.
    if (tone < 0.15 && !inFace(b, x, y)) return INK_RGB;
    const left = x <= b.cx, s = (y - b.y0) + (left ? x - b.cx : b.cx - x) + (left ? 0 : 1) + (p % 6);
    return paled([INK_RGB, IVORY_RGB, CORAL][((Math.floor(s / 2) % 3) + 3) % 3], b, x, y);
  },
  'grid': (x, y, tone, p, _o, _l, _part, b) => {
    // Ivory panes cut by ink lines, three of them filled with a primary each; the print sets where.
    if (tone < 0.15 && !inFace(b, x, y)) return INK_RGB;
    const v1 = b.x0 + Math.max(1, Math.round((b.w - 1) * (0.3 + (p % 3) * 0.06))), v2 = b.x0 + Math.round((b.w - 1) * (0.64 + ((p >> 2) % 3) * 0.06));
    const h1 = b.y0 + Math.max(1, Math.round((b.h - 1) * (0.42 + ((p >> 4) % 3) * 0.08)));
    if (x === v1 || x === v2 || y === h1) return paled(INK_RGB, b, x, y);
    const pane = (x > v1 ? 1 : 0) + (x > v2 ? 1 : 0) + (y > h1 ? 3 : 0), at = (pane - (p % 6) + 6) % 6;
    return paled(at === 0 ? PRIMARIES[0] : at === 2 ? PRIMARIES[1] : at === 4 ? PRIMARIES[2] : IVORY_RGB, b, x, y);
  },
};

/**
 * The ink a skin's face takes in a finish that keeps the cells round the face
 * light (`FACE_WINDOW`): the graphic finishes, Negative and a Black Hole. Undefined in
 * any other finish, where the face keeps the ink worked out from the skin's
 * own colour.
 */
export function faceInk(o: Owned): string | undefined {
  return GRAPHIC_FINISHES.includes(o.finish) || o.finish === 'negative' || (o.finish === 'nebula' && nebulaPhase(o.print) === 'Black Hole') ? '#15111C' : undefined;
}

const PRIMER = rgb('#8B9097');

/**
 * A finished skin's outline: the deepest colour of its finish, so a purple
 * Nebula frog isn't ringed in frog green. Negative and Sunset keep the skin's own.
 */
export function finishOutline(o: Owned): string | undefined {
  if (o.finish === 'gold') return '#4A2400';
  if (o.finish === 'nebula') return nebulaPhase(o.print) === 'Red Giant' ? '#3A0610' : nebulaPhase(o.print) === 'Blue Moon' ? '#101A4A' : '#160C30';
  if (o.finish === 'prism') return '#2C2048';
  if (o.finish === 'tempered') return DEEP_BLUE_PRINTS.includes(o.print) ? '#030A30' : hex(mix(rgb(TINTS[temperTint(o.print)][0]), [8, 10, 26], 0.72));
  if (GRAPHIC_FINISHES.includes(o.finish)) return '#17131F';
  return undefined;
}

/**
 * Paints one cell of an owned item: its finish, then its wear. Chips land in
 * places fixed by the print, so a copy always wears the same way, and how many
 * show is the scuff. `glint` is set once the first Box Fresh glint has been
 * placed. `tone` is the colour's place among the item's own (`toneOf`); left
 * out, its lightness stands in. `box` is where the item sits on the grid
 * (`ItemBox`); left out, the box its slot usually takes (`boxOf`).
 */
export function paintCell(color: string, x: number, y: number, o: Owned, state: { glint: boolean }, tone?: Tone, box?: ItemBox): string {
  const original = rgb(color), l = lum(original);
  const item = itemById(o.item), b = measured(box ?? boxOf(o.item), item?.slot === 'skin' ? item.eyes : undefined);
  let c = PAINT[o.finish](x, y, tone?.tone ?? Math.max(0, Math.min(1, (l - 0.15) / 0.75)), o.print, original, l, tone?.part ?? 0, b);
  // A chip shows more of the primer the more worn the copy is, so a nearly new one is barely flecked.
  if (cellNoise(o.print, x, y, 3) < Math.pow(o.scuff, 0.9) * 0.45) c = mix(c, PRIMER, Math.min(0.75, 0.3 + o.scuff * 0.6));
  c = mix(c, [120, 116, 112], Math.min(0.25, o.scuff * 0.3));
  if (o.scuff < 0.07 && !state.glint && lum(c) > 0.55) {
    c = [255, 255, 255];
    state.glint = true;
  }
  return hex(c);
}
