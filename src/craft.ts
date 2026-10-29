import { hash } from './hash';
import { FINISHES, GRADES, gradeOf, type Owned } from './owned';
import { itemById, type Item } from './items';

/**
 * Crafting, as in TF2. A copy you don't want smelts into metal, and metal
 * crafts the exact item you want.
 *
 * Metal comes in scrap: three scrap are a reclaimed, three reclaimed a
 * refined. A crafted copy is Plain, with a craft number: the count of every
 * copy ever crafted, so the first ones are worth having for that alone.
 */
export const SCRAP = 1;
export const RECLAIMED = 3;
export const REFINED = 9;
/** Metal to craft one item of your choice. */
export const CRAFT_COST = REFINED;
/** Metal to paint a hat or a buddy. Scraping the paint off is free. */
export const PAINT_COST = RECLAIMED;

/** Scrap a copy smelts into, by grade: Everyday a scrap, up to a refined for a Mythic. */
const SMELT = [1, 2, 4, 9] as const;

/**
 * What a copy smelts into, or 0 when it can't be: a starter (it's free), a
 * Grail or an aura (too rare to melt down by accident), or a showpiece.
 */
export function smeltValue(o: Owned): number {
  const it = itemById(o.item);
  if (!it || it.free || it.showpiece || it.slot === 'aura') return 0;
  const g = GRADES.findIndex(x => x.id === gradeOf(o).id);
  return SMELT[g] ?? 0;
}

/** Whether an item can be crafted: anything a machine holds but its showpiece and the free hat. */
export const craftable = (it: Item | undefined): boolean => !!it && !it.free && !it.showpiece && it.slot !== 'aura' && it.game !== 'club';

/** Metal as TF2 writes it: refined with a hundredth per scrap, `2.44 ref`. */
export function metalText(scrap: number): string {
  const ref = Math.floor(scrap / REFINED), rest = scrap % REFINED;
  return `${ref}.${String(rest * 11).padStart(2, '0')} ref`;
}

/** Metal as coins: `{ refined, reclaimed, scrap }`. */
export function metalCoins(scrap: number): { refined: number; reclaimed: number; scrap: number } {
  return { refined: Math.floor(scrap / REFINED), reclaimed: Math.floor((scrap % REFINED) / RECLAIMED), scrap: scrap % RECLAIMED };
}

/** A crafted copy: Plain, a float and print from the seed, and its craft number. */
export function craftCopy(itemId: string, seed: string, number: number): Owned {
  const [lo, hi] = FINISHES.plain.scuffs;
  const u = hash(`${seed}|craft|float`) / 4294967296;
  return { item: itemId, finish: 'plain', scuff: Math.round((lo + u * (hi - lo)) * 1e7) / 1e7, print: hash(`${seed}|craft|pattern`) % 1000, craft: number };
}
