import { resolve } from './resolve';
import {
  headWeights, eyeWeights, mouthWeights, cheekWeights, hairWeights, bodyWeights, accessoryWeights, paletteWeights,
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

/** The weight below which a part counts as rare and can't be picked. */
const RARE = 2;

/**
 * A random seed to draw a new player's guy from, made once and kept. 12
 * characters of base 36, about 62 bits.
 */
export function makeSeed(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  let n = 0n;
  for (const b of bytes) n = (n << 8n) | BigInt(b);
  return n.toString(36).padStart(12, '0').slice(-12);
}

/** Which options a player may pick in a slot: every common one, and their own. */
export function pickable(own: AvatarConfig, slot: LookSlot): number[] {
  const weights = SLOTS.find(s => s[1] === slot)![2];
  return weights.map((w, i) => i).filter(i => weights[i] >= RARE || i === own[slot]);
}

/** Whether a look only uses parts this player may pick. */
export function allowed(own: AvatarConfig, look: Look): boolean {
  return SLOTS.every(([, slot]) => look[slot] === undefined || pickable(own, slot).includes(look[slot]!));
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
export function decodeLook(code: string, own?: AvatarConfig): Look | null {
  if (typeof code !== 'string' || !code.startsWith('2:')) return null;
  const look: Look = {};
  for (const part of code.slice(2).split('.').filter(Boolean)) {
    const slot = SLOTS.find(s => s[0] === part[0]);
    const n = Number(part.slice(1));
    if (!slot || !/^\d{1,3}$/.test(part.slice(1)) || n >= slot[2].length) return null;
    look[slot[1]] = n;
  }
  if (own && !allowed(own, look)) return null;
  return look;
}

/** A player's guy: from their seed, with their picked look laid over it. */
export function lookOf(seed: string, code = ''): AvatarConfig {
  const own = resolve(seed);
  const look = code ? decodeLook(code, own) : null;
  return look ? { ...own, ...look } : own;
}
