import { hash } from './hash';
import { AURAS, AURA_ODDS } from './auras';
import { EFFECTS, FX_IDS, rollFx, type Fx } from './effects';
import { GAMES, gameItems, freeItem, inSeason, itemById, itemWeight, type Item, type Slot } from './items';
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

const GOLD = ['#4A2A06', '#8A5510', '#C48A1C', '#EDB52E', '#FFD95A', '#FFF1B8', '#FFFBEA'].map(rgb);
const WHITE_GOLD = ['#3A3226', '#76695A', '#B3A58E', '#DDD2BC', '#F2EBDC', '#FFFBF2', '#FFFFFF'].map(rgb);

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
 * Each finish as a clean, premium version of the item: its colours mapped
 * through the finish's own ramp by tone, so the item's shading and parts all
 * still read, and any colour shift runs in smooth bands across the whole
 * item, never pixel by pixel. The shaders (./finish-shader) move a sheen over
 * it.
 */
const PAINT: Record<Finish, (x: number, y: number, tone: number, p: number, original: RGB, l: number, part: number) => RGB> = {
  'plain': (_x, _y, _t, _p, original) => original,
  'sunset': (x, y, _t, p, _o, l) => {
    const t = Math.max(0, Math.min(1, (x + y * 0.5 - 2 + (p % 100) / 12) / 14));
    const c = t < 0.5 ? mix(rgb('#F5C542'), rgb('#E55AA8'), t * 2) : mix(rgb('#E55AA8'), rgb('#7A4BE0'), (t - 0.5) * 2);
    return shaded(c, l);
  },
  'tempered': (x, y, tone, p, _o, _l, part) => {
    // Case-hardened steel: soft bands of heat tint running across the item,
    // through the print's tint (blue, its pale, straw gold, its pale again).
    const [a, b, c] = TINTS[temperTint(p)].map(rgb);
    const s = (across(x, y) * 1.5 + (p % 11) / 11 + part * 0.4) % 1, k = (1 - Math.cos(s * Math.PI * 2)) / 2;
    const band = s < 0.5 ? mix(a, b, k) : mix(c, b, 1 - k);
    return toned(band, 0.12 + tone * 0.8, [10, 16, 40]);
  },
  'nebula': (x, y, tone, p, _o, _l, part) => {
    // Deep space: two of the phase's colours drifting into each other in soft
    // clouds across the item, dark in its shadows and lit pink in its lights.
    // A part drawn in another colour takes the second one, so it still stands apart.
    const phase = nebulaPhase(p);
    const [a, b] = phase === 'Red Giant' ? ['#C8102E', '#FF6A3D'] : phase === 'Blue Moon' ? ['#1E4FE8', '#58B8FF']
      : phase === 'Black Hole' ? ['#2A1E3A', '#4A2A6A'] : [['#7A2AB8', '#3A3AD0'], ['#3A2AB0', '#8A3AC8'], ['#2A5AC0', '#6A2AB0'], ['#A82A8A', '#4A2AB8']][p % 4];
    const cloud = Math.min(1, (0.5 + 0.5 * Math.sin(x * 0.5 + p) * Math.cos(y * 0.42 - p * 0.7)) * (1 - part) + part * 0.95);
    const t = Math.pow(tone, 1.15);
    return ramp([[8, 6, 22], mix(rgb(a), rgb(b), cloud), mix(mix(rgb(a), rgb(b), cloud), rgb('#FFC4EC'), 0.5), rgb('#FFF0FA')], t * 0.92);
  },
  'prism': (x, y, tone, p) => {
    // One smooth rainbow sweeping corner to corner, the item's own tones
    // from its shadows to near white, pearly.
    const h = (across(x, y) * 300 + p * 7) % 360;
    return mix(hsl(h, 0.6, 0.3 + 0.58 * tone), [255, 255, 255], 0.14);
  },
  'negative': (_x, _y, tone, _p, original) => {
    // A photographic negative: light parts go dark and dark go light, each
    // in its colour's opposite, pulled towards violet. Kept off the extremes,
    // so the item still stands clear of its own outline.
    const { h, s } = hueOf([255 - original[0], 255 - original[1], 255 - original[2]]);
    return mix(hsl(h, Math.min(0.7, s * 0.8 + 0.15), 0.26 + 0.6 * (1 - tone)), [92, 52, 160], 0.2);
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
    // Polished gold: deep bronze in the shadows to pale gold in the lights,
    // with one soft gleam lying across it. A part in another colour is white
    // gold, so it still stands apart.
    const t = tone * 0.92 + Math.max(0, 1 - Math.abs(across(x, y) - 0.42) / 0.16) * 0.14;
    return mix(ramp(GOLD, t), ramp(WHITE_GOLD, t), part * 0.6);
  },
};

const PRIMER = rgb('#8B9097');

/**
 * A finished skin's outline: the deepest colour of its finish, so a purple
 * Nebula frog isn't ringed in frog green. Negative and Sunset keep the skin's own.
 */
export function finishOutline(o: Owned): string | undefined {
  if (o.finish === 'gold') return '#3A2206';
  if (o.finish === 'nebula') return '#160C30';
  if (o.finish === 'prism') return '#2C2048';
  if (o.finish === 'tempered') return hex(mix(rgb(TINTS[temperTint(o.print)][0]), [8, 10, 26], 0.72));
  return undefined;
}

/**
 * Paints one cell of an owned item: its finish, then its wear. Chips land in
 * places fixed by the print, so a copy always wears the same way, and how many
 * show is the scuff. `glint` is set once the first Box Fresh glint has been
 * placed. `tone` is the colour's place among the item's own (`toneOf`); left
 * out, its lightness stands in.
 */
export function paintCell(color: string, x: number, y: number, o: Owned, state: { glint: boolean }, tone?: Tone): string {
  const original = rgb(color), l = lum(original);
  let c = PAINT[o.finish](x, y, tone?.tone ?? Math.max(0, Math.min(1, (l - 0.15) / 0.75)), o.print, original, l, tone?.part ?? 0);
  // A chip shows more of the primer the more worn the copy is, so a nearly new one is barely flecked.
  if (cellNoise(o.print, x, y, 3) < Math.pow(o.scuff, 0.9) * 0.45) c = mix(c, PRIMER, Math.min(0.75, 0.3 + o.scuff * 0.6));
  c = mix(c, [120, 116, 112], Math.min(0.25, o.scuff * 0.3));
  if (o.scuff < 0.07 && !state.glint && lum(c) > 0.55) {
    c = [255, 255, 255];
    state.glint = true;
  }
  return hex(c);
}
