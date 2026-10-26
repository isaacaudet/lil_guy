import { FINISHES, type Finish, type Owned } from './owned';
import { gameItems, itemById, type ItemGame } from './items';

/**
 * What a collector does with copies beyond opening them: name one, put five
 * into a trade up, and fill a machine's set. The site and the Worker both use
 * these, so a tag, a trade's float and a set read the same everywhere.
 */

/** The longest name tag. */
export const TAG_MAX = 20;
const TAG_CHARS = /^[A-Za-z0-9 '!?.&#-]+$/;
// Tags show on public pages. A short list of words they can't hold; anything
// else is fine. Checked on letters only, so spacing and symbols don't hide one.
const BLOCKED = ['fuck', 'shit', 'cunt', 'nigg', 'fag', 'rape', 'nazi', 'hitler', 'porn', 'cock', 'dick', 'pussy', 'whore', 'slut', 'retard', 'kike', 'spic', 'chink', 'tranny'];

/**
 * A name tag as it would be stored: spaces tidied, at most `TAG_MAX`
 * characters. `''` takes a tag off; null means it can't be used.
 */
export function cleanTag(raw: string): string | null {
  const tag = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (!tag) return '';
  if (tag.length > TAG_MAX || !TAG_CHARS.test(tag)) return null;
  const letters = tag.toLowerCase().replace(/[^a-z]/g, '').replace(/0/g, 'o');
  if (BLOCKED.some(w => letters.includes(w))) return null;
  return tag;
}

/** Where a float sits within what its finish can roll, 0 (cleanest) to 1. */
export function floatShare(o: { finish: Finish; scuff: number }): number {
  const [lo, hi] = FINISHES[o.finish].scuffs;
  return hi > lo ? Math.min(1, Math.max(0, (o.scuff - lo) / (hi - lo))) : 0;
}

/**
 * A trade up's float, the way CS works it out: how clean each input is within
 * its own finish, averaged, then placed at the same point in the result's
 * finish. Five clean inputs make a clean result, whatever comes out.
 */
export function tradeFloat(inputs: { finish: Finish; scuff: number }[], out: Finish): number {
  const avg = inputs.reduce((a, o) => a + floatShare(o), 0) / Math.max(1, inputs.length);
  const [lo, hi] = FINISHES[out].scuffs;
  return Math.round((lo + avg * (Math.min(1, hi) - lo)) * 1e7) / 1e7;
}

/** Which machine a trade up's result comes from: each game's share of the inputs. */
export function tradeGames(inputs: Owned[]): Partial<Record<ItemGame, number>> {
  const share: Partial<Record<ItemGame, number>> = {};
  for (const o of inputs) {
    const g = itemById(o.item)?.game;
    if (g) share[g] = (share[g] || 0) + 1 / inputs.length;
  }
  return share;
}

/** A machine's set: every item its capsules give (starters and auras aside). */
export function machineSet(game: ItemGame) {
  return gameItems(game).filter(i => !i.free && i.slot !== 'aura');
}

/** How far a collection is through a machine's set: which of its items are owned, in any finish. */
export function setProgress(game: ItemGame, owned: Owned[]) {
  const items = machineSet(game), have = new Set(owned.map(o => o.item));
  const got = items.filter(i => have.has(i.id));
  return { items, have: new Set(got.map(i => i.id)), got: got.length, total: items.length, complete: got.length === items.length && items.length > 0 };
}
