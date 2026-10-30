import { resolve, DEAL_PREFIX } from './resolve';
import { hash } from './hash';
import { heads, eyes, mouths, cheeks, hair, bodies, accessories } from './parts';
import { palettes } from './palette';
import {
  headWeights, eyeWeights, mouthWeights, cheekWeights, hairWeights, bodyWeights, accessoryWeights, paletteWeights,
  RETIRED_EYES, unlockWeight,
} from './parts/weights';
import type { AvatarConfig } from './types';

/**
 * Keeping rarity real.
 *
 * A guy's rare traits only mean something if nobody can choose them. Two
 * rules make that so:
 *
 * 1. **Draw the guy from a seed, not the name on the board.** A name can be
 *    typed and changed, so anyone could try names until a rare guy came out,
 *    and a rename would change him. The club makes a random seed once
 *    (`makeSeed`), keeps it with the player, and draws from that:
 *    `toSvgString(seed, …)`, `starter(seed, game)`. The name stays a label.
 * 2. **A picker offers only common parts, plus the player's own.** A part
 *    someone rolled stays theirs to keep; a rare part they didn't roll can't be
 *    picked.
 *
 * Picked looks are saved as versioned codes (`2:h3.e5…`), so a later change to
 * the parts can't silently turn a saved look into someone else.
 *
 * A rare part can also be earned: every capsule unlocks one the player hasn't
 * got (`rollPart`), and metal crafts the exact one they want (`partCost`).
 * Then it's theirs to pick (`Unlocks`). Capsules are how a player builds the
 * guy they want; earned parts change how a guy looks, never how rare the guy
 * is: that stays the deal's.
 */

/** A slot in a look code: its letter, its config key and its weights. */
const SLOTS = [
  ['h', 'head', headWeights],
  ['e', 'eyes', eyeWeights],
  ['m', 'mouth', mouthWeights],
  ['c', 'cheeks', cheekWeights],
  ['t', 'hair', hairWeights],
  ['b', 'body', bodyWeights],
  ['a', 'accessory', accessoryWeights],
  ['p', 'palette', paletteWeights],
] as const;

export type LookSlot = (typeof SLOTS)[number][1];
export type Look = Partial<Record<LookSlot, number>>;
/** Rare parts a player has earned from capsules, by slot. */
export type Unlocks = Partial<Record<LookSlot, number[]>>;

/** A part rarer than this (1 in 45) counts as rare and can't be picked. */
const RARE = 1 / 45;

/**
 * A random seed to draw a new player's guy from, made once and kept: the deal
 * prefix (`3-`), then 12 characters of base 36, about 62 bits.
 */
export function makeSeed(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  let n = 0n;
  for (const b of bytes) n = (n << 8n) | BigInt(b);
  return DEAL_PREFIX + n.toString(36).padStart(12, '0').slice(-12);
}

/** Which options a player may pick in a slot: every common one, their own, and any they've earned. */
export function pickable(own: AvatarConfig, slot: LookSlot, unlocks?: Unlocks): number[] {
  const weights = SLOTS.find(s => s[1] === slot)![2];
  const total = weights.reduce((a, b) => a + b, 0);
  const earned = unlocks?.[slot] ?? [];
  return weights.map((w, i) => i).filter(i => (weights[i] / total >= RARE || i === own[slot] || earned.includes(i)) && !(slot === 'eyes' && RETIRED_EYES.includes(i)));
}

/** Whether a look only uses parts this player may pick. */
export function allowed(own: AvatarConfig, look: Look, unlocks?: Unlocks): boolean {
  return SLOTS.every(([, slot]) => look[slot] === undefined || pickable(own, slot, unlocks).includes(look[slot]!));
}

// ---------------------------------------------------------------- parts from capsules

/** The slots a capsule can unlock a part in: every one, the shape and the colour too. */
export const PART_SLOTS: LookSlot[] = ['head', 'eyes', 'mouth', 'cheeks', 'hair', 'body', 'accessory', 'palette'];
/** One capsule in this many also unlocks a part: every one, until there's none left to unlock. */
export const PART_ODDS = 1;

/** A part a capsule unlocked. */
export interface PartDrop { slot: LookSlot; index: number }

const NAMES: Record<string, { name: string }[]> = { head: heads, eyes, mouth: mouths, cheeks, hair, body: bodies, accessory: accessories, palette: palettes };
const SLOT_WORD: Record<string, string> = { head: 'shape', eyes: 'eyes', mouth: 'mouth', cheeks: 'cheeks', hair: 'topper', body: 'markings', accessory: 'accessory', palette: 'colours' };

/**
 * The rare parts in a slot, the ones a picker locks: what a capsule can
 * unlock. The parts no deal gives (`CAPSULE_ONLY`, the capsule-only set) are among them.
 */
export function rareParts(slot: LookSlot): number[] {
  const weights = SLOTS.find(s => s[1] === slot)![2];
  const total = weights.reduce((a, b) => a + b, 0);
  return weights.map((_, i) => i).filter(i => (weights[i] > 0 ? weights[i] / total < RARE : unlockWeight(slot, weights, i) > 0) && !(slot === 'eyes' && RETIRED_EYES.includes(i)));
}

/**
 * The part a capsule unlocks. Only rare parts, since common ones can already
 * be picked, and the rarer a part is to be dealt the rarer it is to unlock.
 * Given what the player `has`, it's one they don't have, from a slot that
 * still has some, so a capsule never wastes its part; null once there's none
 * left. Like `roll`, the seed must come from the server.
 */
export function rollPart(seed: string, has?: (p: PartDrop) => boolean): PartDrop | null {
  const u = (k: string) => hash(`${seed}|part|${k}`) / 4294967296;
  if (u('odds') * PART_ODDS >= 1) return null;
  const start = Math.floor(u('slot') * PART_SLOTS.length);
  for (let k = 0; k < PART_SLOTS.length; k++) {
    const slot = PART_SLOTS[(start + k) % PART_SLOTS.length];
    const weights = SLOTS.find(s => s[1] === slot)![2], pool = rareParts(slot).filter(index => !has?.({ slot, index }));
    if (!pool.length) continue;
    const w = (i: number) => unlockWeight(slot, weights, i);
    let r = u('which') * pool.reduce((a, i) => a + w(i), 0);
    const index = pool.find(i => (r -= w(i)) < 0) ?? pool[pool.length - 1];
    return { slot, index };
  }
  return null;
}

/**
 * Scrap to craft a part (./craft's metal): a reclaimed for one dealt about
 * one guy in 200 or more, a refined for rarer, two for the rarest (rarer than
 * one in 2,000).
 */
export function partCost(p: PartDrop): number {
  const weights = SLOTS.find(s => s[1] === p.slot)![2], total = weights.reduce((a, b) => a + b, 0), share = unlockWeight(p.slot, weights, p.index) / total;
  return share >= 1 / 200 ? 3 : share >= 1 / 2000 ? 9 : 18;
}

/** A part's name, as a player reads it: "Galaxy eyes", "Crown topper". */
export function partName(p: PartDrop): string {
  const n = NAMES[p.slot]?.[p.index]?.name ?? '?', word = SLOT_WORD[p.slot];
  // "Moon mark", not "Moon mark markings".
  return `${n[0].toUpperCase()}${n.slice(1)}${/mark$/.test(n) || n.endsWith(word) ? '' : ` ${word}`}`;
}

/** A part as a short code, like a look's (`e12`), and back. */
export const partCode = (p: PartDrop): string => SLOTS.find(s => s[1] === p.slot)![0] + p.index;
export function readPart(code: string): PartDrop | null {
  const slot = SLOTS.find(s => s[0] === code?.[0]);
  const index = Number(code?.slice(1));
  if (!slot || !(PART_SLOTS as string[]).includes(slot[1]) || !/^\d{1,3}$/.test(code.slice(1)) || !rareParts(slot[1]).includes(index)) return null;
  return { slot: slot[1], index };
}

/** Earned part codes as `Unlocks`. */
export function unlocksOf(codes: string[]): Unlocks {
  const out: Unlocks = {};
  for (const c of codes) { const p = readPart(c); if (p) (out[p.slot] ??= []).push(p.index); }
  return out;
}

/** A picked look as a versioned code: `2:h3.e5.p17`, only the slots picked. */
export function encodeLook(look: Look): string {
  return '2:' + SLOTS.filter(([, slot]) => look[slot] !== undefined).map(([letter, slot]) => letter + look[slot]).join('.');
}

/**
 * A code back into a look, or null for anything that isn't a version-2 code
 * this library can draw: an old seven-number code from before 0.2, a part out
 * of range, or (given the player's own guy) a rare part they didn't roll.
 */
export function decodeLook(code: string, own?: AvatarConfig, unlocks?: Unlocks): Look | null {
  if (typeof code !== 'string' || !code.startsWith('2:')) return null;
  const look: Look = {};
  for (const part of code.slice(2).split('.').filter(Boolean)) {
    const slot = SLOTS.find(s => s[0] === part[0]);
    const n = Number(part.slice(1));
    if (!slot || !/^\d{1,3}$/.test(part.slice(1)) || n >= slot[2].length) return null;
    if (slot[1] === 'eyes' && RETIRED_EYES.includes(n)) continue;   // a retired part drops out; the rest of the look stays
    look[slot[1]] = n;
  }
  if (own && !allowed(own, look, unlocks)) return null;
  return look;
}

/** A player's guy: from their seed, with their picked look laid over it. */
export function lookOf(seed: string, code = '', unlocks?: Unlocks): AvatarConfig {
  const own = resolve(seed);
  const look = code ? decodeLook(code, own, unlocks) : null;
  return look ? { ...own, ...look } : own;
}
