import { hash } from './hash';
import { gameItems, freeItem, itemById, type Slot } from './items';
import type { GameId } from './types';

/**
 * Owned copies of items, collected like toys.
 *
 * An item (`puttsies.ball`) is a design. A copy someone owns adds:
 *
 * - a **finish**: the paint job. Plain is common; Sunset, Tempered, Nebula,
 *   Prism, Negative and Gold are progressively rarer
 * - a **scuff** between 0 and 1: how worn it is. Low is pristine, high is
 *   battered. The condition (Mint in Box … Battered) is a range of it, and
 *   the scuffs really show: paint chips off as it rises
 * - a **print** number between 0 and 999: where the finish lands. Most prints
 *   are ordinary; a few are famous (a Deep Blue Tempered, a Red Giant or
 *   Black Hole Nebula)
 * - sometimes a **tally**: a counter of the days its owner finished the game
 *   while wearing it
 *
 * Two copies of the same item are almost never the same: the scuff alone has
 * millions of values. Everything is deterministic from the stored numbers, so
 * a copy looks the same everywhere it is drawn.
 */

export type Finish = 'plain' | 'sunset' | 'tempered' | 'nebula' | 'prism' | 'negative' | 'gold';

export interface Owned {
  item: string;
  finish: Finish;
  /** 0–1, how worn. */
  scuff: number;
  /** 0–999, where the finish and the scuffs land. */
  print: number;
  /** Days the owner finished the game wearing it, if it keeps a tally. */
  tally?: number;
}

export const GRADES = [
  { id: 'everyday', name: 'Everyday', color: '#4B69FF' },
  { id: 'special', name: 'Special', color: '#8847FF' },
  { id: 'prized', name: 'Prized', color: '#D32CE6' },
  { id: 'mythic', name: 'Mythic', color: '#EB4B4B' },
  { id: 'grail', name: '★ Grail', color: '#E4AE39' },
] as const;
export type Grade = (typeof GRADES)[number];

/**
 * Each finish: its grade, the chance a capsule rolls it, and the scuff range
 * it can come in. The flashy finishes only exist barely worn, so there is no
 * Battered Nebula.
 */
export const FINISHES: Record<Finish, { name: string; grade: number; odds: number; scuffs: [number, number] }> = {
  'plain':    { name: 'Plain',    grade: 0, odds: 79.22, scuffs: [0, 1] },
  'sunset':   { name: 'Sunset',   grade: 1, odds: 15.98, scuffs: [0, 0.08] },
  'tempered': { name: 'Tempered', grade: 2, odds: 1.6,   scuffs: [0, 1] },
  'nebula':   { name: 'Nebula',   grade: 2, odds: 1.6,   scuffs: [0, 0.08] },
  'prism':    { name: 'Prism',    grade: 3, odds: 0.5,   scuffs: [0, 0.08] },
  'negative': { name: 'Negative', grade: 3, odds: 0.2,   scuffs: [0, 0.08] },
  'gold':     { name: 'Gold',     grade: 4, odds: 0.9,   scuffs: [0, 0.08] },
};

/** Condition, by scuff, in the words toy collectors use. */
export const WEAR = [
  { name: 'Mint in Box', short: 'MIB', max: 0.07 },
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
  // A famous print lifts a copy one grade.
  return GRADES[Math.min(4, FINISHES[o.finish].grade + (special(o) ? 1 : 0))];
}

/** The name as it would show on an inventory card. */
export function nameOf(o: Owned): string {
  const item = itemById(o.item);
  const base = item?.name ?? o.item;
  const tally = o.tally !== undefined ? 'Tallied ' : '';
  if (o.finish === 'plain') return tally + base;
  const look = o.finish === 'nebula' ? nebulaPhase(o.print)
    : o.finish === 'tempered' && special(o) ? 'Deep Blue' : FINISHES[o.finish].name;
  return `${tally}${base} | ${look}`;
}

// ---------------------------------------------------------------- storage

/**
 * A copy as one short string, to store or put in a URL:
 * `puttsies.ball~nebula~0.0123456~20` or, with a tally, `…~20~t412`.
 */
export function encode(o: Owned): string {
  const parts = [o.item, o.finish, o.scuff.toFixed(7), String(o.print)];
  if (o.tally !== undefined) parts.push(`t${o.tally}`);
  return parts.join('~');
}

export function decode(s: string): Owned | null {
  const [item, finish, scuff, print, tally] = s.split('~');
  if (!itemById(item) || !(finish in FINISHES)) return null;
  const f = Number(scuff), p = Number(print);
  if (!(f >= 0 && f <= 1) || !Number.isInteger(p) || p < 0 || p > 999) return null;
  const o: Owned = { item, finish: finish as Finish, scuff: f, print: p };
  if (tally?.startsWith('t') && /^\d+$/.test(tally.slice(1))) o.tally = Number(tally.slice(1));
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
 * is a little different — a lucky name gets a 0.003 Mint in Box.
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
  const pool = gameItems(game).filter(i => !i.free);
  const item = pool[hash(`${seed}|item`) % pool.length];

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

/** Shades a finish colour by how light the item's own colour was there, keeping its form. */
const shaded = (c: RGB, l: number) => mix(mix(c, [0, 0, 0], 0.45), c, Math.min(1, l * 1.5));

const PAINT: Record<Finish, (x: number, y: number, l: number, p: number, original: RGB) => RGB> = {
  'plain': (_x, _y, _l, _p, original) => original,
  'sunset': (x, y, l, p) => {
    const t = Math.max(0, Math.min(1, (x + y * 0.5 - 2 + (p % 100) / 12) / 14));
    const c = t < 0.5 ? mix(rgb('#F5C542'), rgb('#E55AA8'), t * 2) : mix(rgb('#E55AA8'), rgb('#7A4BE0'), (t - 0.5) * 2);
    return shaded(c, l);
  },
  'tempered': (x, y, l, p) => {
    const blue = DEEP_BLUE_PRINTS.includes(p) ? 0.9 : 0.3 + (p % 7) / 25;
    const r = cellNoise(p, x, y, 1);
    const c = r < blue ? rgb('#2F5FD0') : r < blue + 0.35 ? rgb('#D1A73A') : rgb('#9AA2AC');
    return shaded(c, l);
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
  'gold': (x, y, l) => {
    if ((x + y) % 6 === 0 && l > 0.5) return rgb('#FFFBE6');
    return l > 0.75 ? rgb('#FFF1B0') : l > 0.5 ? rgb('#F2C230') : l > 0.3 ? rgb('#C8901E') : rgb('#7A5212');
  },
};

const PRIMER = rgb('#8B9097');

/**
 * Paints one cell of an owned item: its finish, then its wear. Chips land in
 * places fixed by the print, so a copy always wears the same way, and how many
 * show is the scuff. `glint` is set once the first Mint in Box glint has been
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
