import { hash } from './hash';
import { AURAS, AURA_ODDS } from './auras';
import { EFFECTS, FX_IDS, rollFx, type Fx } from './effects';
import { gameItems, freeItem, inSeason, itemById, itemWeight, type Item, type Slot } from './items';
import { MAX_PINS, pinById } from './pins';
import { PAINT_IDS, type PaintId } from './paints';
import type { GameId } from './types';

/**
 * Owned copies of items, collected like toys.
 *
 * An item (`puttsies.ball`) is a design. A copy someone owns adds:
 *
 * - a **finish**: the paint job. Plain is common; Sunset, Tempered, Nebula,
 *   Prism, Negative and Gold are progressively rarer
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
  | 'classic' | 'fade' | 'frost' | 'toxic' | 'shadow' | 'sapphire' | 'ruby' | 'pearl';

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
 * Battered Nebula.
 */
export const FINISHES: Record<Finish, { name: string; grade: number; odds: number; scuffs: [number, number]; aura?: number }> = {
  'plain':    { name: 'Plain',    grade: 0, odds: 79.87, scuffs: [0, 1] },
  'sunset':   { name: 'Sunset',   grade: 1, odds: 15.98, scuffs: [0, 0.08] },
  'tempered': { name: 'Tempered', grade: 2, odds: 1.6,   scuffs: [0, 1] },
  'nebula':   { name: 'Nebula',   grade: 2, odds: 1.6,   scuffs: [0, 0.08] },
  'prism':    { name: 'Prism',    grade: 3, odds: 0.5,   scuffs: [0, 0.08] },
  'negative': { name: 'Negative', grade: 3, odds: 0.2,   scuffs: [0, 0.08] },
  'gold':     { name: 'Gold',     grade: 4, odds: 0.25,  scuffs: [0, 0.08] },
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
};

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

const PAINT: Record<Finish, (x: number, y: number, l: number, p: number, original: RGB) => RGB> = {
  'plain': (_x, _y, _l, _p, original) => original,
  'sunset': (x, y, l, p) => {
    const t = Math.max(0, Math.min(1, (x + y * 0.5 - 2 + (p % 100) / 12) / 14));
    const c = t < 0.5 ? mix(rgb('#F5C542'), rgb('#E55AA8'), t * 2) : mix(rgb('#E55AA8'), rgb('#7A4BE0'), (t - 0.5) * 2);
    return shaded(c, l);
  },
  'tempered': (x, y, l, p) => {
    // Clean diagonal bands of heat tint, in the tint the print picks; the
    // print also sets where the bands fall.
    const stops = TINTS[temperTint(p)];
    const band = Math.floor((((x + y + (p % 11)) % 12) + 12) % 12 / 3);
    return shaded(rgb(stops[[0, 1, 2, 1][band]]), l);
  },
  'nebula': (x, y, l, p) => {
    const phase = nebulaPhase(p);
    const base = phase === 'Red Giant' ? rgb('#D0102E') : phase === 'Blue Moon' ? rgb('#1E4FE8')
      : phase === 'Black Hole' ? rgb('#2A1E3A') : rgb(['#8A2AB0', '#3A2AB0', '#2A6AB0', '#B02A8A'][p % 4]);
    const c = cellNoise(p, x, y, 2) < 0.2 ? mix(base, rgb('#FFD6F0'), 0.55) : base;
    return shaded(c, l);
  },
  'prism': (x, y, l, p) => {
    // A rainbow running diagonally across the item, like holographic foil;
    // the print sets where the bands start.
    const h = ((x * 23 + y * 17 + p * 7) % 360 + 360) % 360;
    const k = (n: number) => {
      const t = (n + h / 30) % 12;
      return 0.5 - 0.5 * Math.max(-1, Math.min(t - 3, 9 - t, 1));
    };
    const c: RGB = [k(0) * 255, k(8) * 255, k(4) * 255];
    return mix(shaded(c, l), [255, 255, 255], 0.18);
  },
  'negative': (_x, _y, _l, _p, original) => {
    // The item's own colours turned inside out, pulled towards violet.
    const inverted: RGB = [255 - original[0], 255 - original[1], 255 - original[2]];
    return mix(inverted, [92, 52, 160], 0.22);
  },
  // Auras are coloured by ./auras, not here.
  'classic': (_x, _y, _l, _p, original) => original,
  'fade': (_x, _y, _l, _p, original) => original,
  'frost': (_x, _y, _l, _p, original) => original,
  'toxic': (_x, _y, _l, _p, original) => original,
  'shadow': (_x, _y, _l, _p, original) => original,
  'sapphire': (_x, _y, _l, _p, original) => original,
  'ruby': (_x, _y, _l, _p, original) => original,
  'pearl': (_x, _y, _l, _p, original) => original,
  'gold': (x, y, l) => {
    if ((x + y) % 6 === 0 && l > 0.5) return rgb('#FFFBE6');
    return l > 0.75 ? rgb('#FFF1B0') : l > 0.5 ? rgb('#F2C230') : l > 0.3 ? rgb('#C8901E') : rgb('#7A5212');
  },
};

const PRIMER = rgb('#8B9097');

/**
 * Paints one cell of an owned item: its finish, then its wear. Chips land in
 * places fixed by the print, so a copy always wears the same way, and how many
 * show is the scuff. `glint` is set once the first Box Fresh glint has been
 * placed.
 */
export function paintCell(color: string, x: number, y: number, o: Owned, state: { glint: boolean }): string {
  const original = rgb(color);
  let c = PAINT[o.finish](x, y, lum(original), o.print, original);
  if (cellNoise(o.print, x, y, 3) < Math.pow(o.scuff, 0.9) * 0.45) c = mix(PRIMER, c, 0.25);
  c = mix(c, [120, 116, 112], Math.min(0.25, o.scuff * 0.3));
  if (o.scuff < 0.07 && !state.glint && lum(c) > 0.55) {
    c = [255, 255, 255];
    state.glint = true;
  }
  return hex(c);
}
