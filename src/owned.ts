import { hash } from './hash';
import { gameItems, freeItem, itemById, type Slot } from './items';
import type { GameId } from './types';

/**
 * Owned copies of items, the way CS:GO does skins.
 *
 * An item (`puttsies.ball`) is a design. A copy someone owns adds:
 *
 * - a **finish**: the paint job. Stock is common; Fade, Case Hardened,
 *   Doppler and Gold are progressively rarer
 * - a **float** between 0 and 1: how worn it is. Low is pristine, high is
 *   scuffed. The wear tiers (Factory New … Battle-Scarred) are ranges of it,
 *   and the scuffs really show: paint chips off as the float rises
 * - a **pattern** between 0 and 999: where the finish lands. Most patterns
 *   are ordinary; a few are famous (an all-blue Case Hardened, a Ruby or
 *   Sapphire Doppler)
 * - optionally a **StatTrak** counter
 *
 * Two copies of the same item are almost never the same: the float alone has
 * millions of values. Everything is deterministic from the stored numbers, so
 * a copy looks the same everywhere it is drawn.
 */

export type Finish = 'stock' | 'fade' | 'case-hardened' | 'doppler' | 'gold';

export interface Owned {
  item: string;
  finish: Finish;
  float: number;
  pattern: number;
  stattrak?: number;
}

export const GRADES = [
  { id: 'mil-spec', name: 'Mil-Spec', color: '#4B69FF' },
  { id: 'restricted', name: 'Restricted', color: '#8847FF' },
  { id: 'classified', name: 'Classified', color: '#D32CE6' },
  { id: 'covert', name: 'Covert', color: '#EB4B4B' },
  { id: 'exceedingly-rare', name: '★ Exceedingly Rare', color: '#E4AE39' },
] as const;
export type Grade = (typeof GRADES)[number];

/**
 * Each finish: its grade, the chance a case drop rolls it, and the float range
 * it can come in. Like CS:GO's Fade, the flashy finishes only exist barely
 * worn, so a Battle-Scarred Doppler is not a thing.
 */
export const FINISHES: Record<Finish, { name: string; grade: number; odds: number; floats: [number, number] }> = {
  'stock':         { name: 'Stock',         grade: 0, odds: 79.92, floats: [0, 1] },
  'fade':          { name: 'Fade',          grade: 1, odds: 15.98, floats: [0, 0.08] },
  'case-hardened': { name: 'Case Hardened', grade: 2, odds: 1.6,  floats: [0, 1] },
  'doppler':       { name: 'Doppler',       grade: 2, odds: 1.6,  floats: [0, 0.08] },
  'gold':          { name: 'Gold',          grade: 4, odds: 0.9,  floats: [0, 0.08] },
};

export const WEAR = [
  { name: 'Factory New', short: 'FN', max: 0.07 },
  { name: 'Minimal Wear', short: 'MW', max: 0.15 },
  { name: 'Field-Tested', short: 'FT', max: 0.38 },
  { name: 'Well-Worn', short: 'WW', max: 0.45 },
  { name: 'Battle-Scarred', short: 'BS', max: 1.01 },
] as const;

export function wearOf(float: number) {
  return WEAR.find(w => float < w.max)!;
}

/** The famous patterns. A Case Hardened with one of these comes out nearly all blue. */
export const BLUE_GEMS = [661, 670, 321, 387, 955];

export function dopplerPhase(pattern: number): string {
  const p = pattern % 20;
  return p === 0 ? 'Ruby' : p === 1 ? 'Sapphire' : p === 2 ? 'Black Pearl' : `Phase ${(pattern % 4) + 1}`;
}

/** What makes this copy special beyond its finish, if anything. */
export function special(o: Owned): string | undefined {
  if (o.finish === 'case-hardened' && BLUE_GEMS.includes(o.pattern)) return 'Blue Gem';
  if (o.finish === 'doppler' && ['Ruby', 'Sapphire', 'Black Pearl'].includes(dopplerPhase(o.pattern))) return dopplerPhase(o.pattern);
  return undefined;
}

export function gradeOf(o: Owned): Grade {
  // A famous pattern lifts a copy one grade, to Covert.
  return GRADES[Math.min(4, FINISHES[o.finish].grade + (special(o) ? 1 : 0))];
}

/** The name as it would show on an inventory card. */
export function nameOf(o: Owned): string {
  const item = itemById(o.item);
  const base = item?.name ?? o.item;
  const st = o.stattrak !== undefined ? 'StatTrak™ ' : '';
  if (o.finish === 'stock') return st + base;
  const phase = o.finish === 'doppler' ? ` (${dopplerPhase(o.pattern)})` : '';
  return `${st}${base} | ${FINISHES[o.finish].name}${phase}`;
}

// ---------------------------------------------------------------- storage

/**
 * A copy as one short string, to store or put in a URL:
 * `puttsies.ball~doppler~0.0123456~20` or `…~20~st412`.
 */
export function encode(o: Owned): string {
  const parts = [o.item, o.finish, o.float.toFixed(7), String(o.pattern)];
  if (o.stattrak !== undefined) parts.push(`st${o.stattrak}`);
  return parts.join('~');
}

export function decode(s: string): Owned | null {
  const [item, finish, float, pattern, st] = s.split('~');
  if (!itemById(item) || !(finish in FINISHES)) return null;
  const f = Number(float), p = Number(pattern);
  if (!(f >= 0 && f <= 1) || !Number.isInteger(p) || p < 0 || p > 999) return null;
  const o: Owned = { item, finish: finish as Finish, float: f, pattern: p };
  if (st?.startsWith('st') && /^\d+$/.test(st.slice(2))) o.stattrak = Number(st.slice(2));
  return o;
}

// ---------------------------------------------------------------- getting one

/** A uniform number in [0, 1) from a string, for deterministic rolls. */
function unit(seed: string): number {
  return hash(seed) / 4294967296;
}

/**
 * The copy every player has from the start: their game's free hat, stock, with
 * a float and pattern taken from their name. Everyone gets one, and everyone's
 * is a little different — a lucky name gets a 0.003 Factory New.
 */
export function starter(name: string, game: GameId): Owned {
  return {
    item: freeItem(game).id,
    finish: 'stock',
    float: Math.round(unit(`${name}|${game}|float`) * 1e7) / 1e7,
    pattern: hash(`${name}|${game}|pattern`) % 1000,
  };
}

/**
 * Opens a case for a game: one of its items (the free hat aside), with a
 * finish, float, pattern and maybe StatTrak, all rolled from `seed`.
 *
 * The seed decides everything, so the same seed always opens the same thing.
 * In production the seed must come from the server — a random value made at
 * drop time and stored with the copy — never from anything a player picks.
 */
export function roll(seed: string, game: GameId): Owned {
  const pool = gameItems(game).filter(i => !i.free);
  const item = pool[hash(`${seed}|item`) % pool.length];

  let r = unit(`${seed}|finish`) * 100;
  let finish: Finish = 'stock';
  for (const [id, f] of Object.entries(FINISHES) as [Finish, (typeof FINISHES)[Finish]][]) {
    r -= f.odds;
    if (r < 0) { finish = id; break; }
  }

  const [lo, hi] = FINISHES[finish].floats;
  const float = Math.round((lo + unit(`${seed}|float`) * (hi - lo)) * 1e7) / 1e7;
  const pattern = hash(`${seed}|pattern`) % 1000;
  const o: Owned = { item: item.id, finish, float, pattern };
  if (unit(`${seed}|stattrak`) < 0.1) o.stattrak = 0;
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
  'stock': (_x, _y, _l, _p, original) => original,
  'fade': (x, y, l, p) => {
    const t = Math.max(0, Math.min(1, (x + y * 0.5 - 2 + (p % 100) / 12) / 14));
    const c = t < 0.5 ? mix(rgb('#F5C542'), rgb('#E55AA8'), t * 2) : mix(rgb('#E55AA8'), rgb('#7A4BE0'), (t - 0.5) * 2);
    return shaded(c, l);
  },
  'case-hardened': (x, y, l, p) => {
    const blue = BLUE_GEMS.includes(p) ? 0.9 : 0.3 + (p % 7) / 25;
    const r = cellNoise(p, x, y, 1);
    const c = r < blue ? rgb('#2F5FD0') : r < blue + 0.35 ? rgb('#D1A73A') : rgb('#9AA2AC');
    return shaded(c, l);
  },
  'doppler': (x, y, l, p) => {
    const phase = dopplerPhase(p);
    const base = phase === 'Ruby' ? rgb('#D0102E') : phase === 'Sapphire' ? rgb('#1E4FE8')
      : phase === 'Black Pearl' ? rgb('#2A1E3A') : rgb(['#8A2AB0', '#3A2AB0', '#2A6AB0', '#B02A8A'][p % 4]);
    const c = cellNoise(p, x, y, 2) < 0.2 ? mix(base, rgb('#FFD6F0'), 0.55) : base;
    return shaded(c, l);
  },
  'gold': (x, y, l) => {
    if ((x + y) % 6 === 0 && l > 0.5) return rgb('#FFFBE6');
    return l > 0.75 ? rgb('#FFF1B0') : l > 0.5 ? rgb('#F2C230') : l > 0.3 ? rgb('#C8901E') : rgb('#7A5212');
  },
};

const PRIMER = rgb('#8B9097');

/**
 * Paints one cell of an owned item: its finish, then its wear. Chips land in
 * places fixed by the pattern, so a copy always wears the same way, and how
 * many show is the float. `glint` is set once the first Factory New glint has
 * been placed.
 */
export function paintCell(color: string, x: number, y: number, o: Owned, state: { glint: boolean }): string {
  const original = rgb(color);
  let c = PAINT[o.finish](x, y, lum(original), o.pattern, original);
  if (cellNoise(o.pattern, x, y, 3) < Math.pow(o.float, 0.9) * 0.45) c = mix(PRIMER, c, 0.25);
  c = mix(c, [120, 116, 112], Math.min(0.25, o.float * 0.3));
  if (o.float < 0.07 && !state.glint && lum(c) > 0.55) {
    c = [255, 255, 255];
    state.glint = true;
  }
  return hex(c);
}
