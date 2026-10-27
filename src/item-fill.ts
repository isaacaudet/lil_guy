import { compose } from './compose';
import { BUDDY_BOX } from './item-art';
import { heads } from './parts';
import { T } from './parts/art';
import type { Item } from './items';
import type { AvatarConfig } from './types';

/**
 * How much of its room an item fills: "you must occupy this much of the
 * frame", so every skin, hat and buddy reads at a glance at sixteen pixels.
 *
 * | Slot  | Its room                                   | Measured                                              |
 * | ----- | ------------------------------------------ | ----------------------------------------------------- |
 * | skin  | the 14x14 inside the grid's border         | its art                                               |
 * | hat   | the rows above the face, 14 across         | what it adds to the guy, on the head it shows least on |
 * | buddy | `BUDDY_BOX`, 6 across and 5 tall            | its art                                               |
 *
 * The floors are what the items the owner liked already do (Kettlebell,
 * Salmon nigiri and Big L for skins), and for hats and buddies two thirds of
 * what the fullest ones fill.
 */
export interface Fill {
  /** The filled pixels' bounding box. */
  width: number;
  height: number;
  /** How many pixels are filled. */
  pixels: number;
}

export type FillSlot = 'skin' | 'hat' | 'buddy';

/** The least an item may fill: pixels, its box's short side and its long side. */
export const FILL_FLOORS: Record<FillSlot, { pixels: number; short: number; long: number }> = {
  // Kettlebell 120 (12x14), Salmon nigiri 137 (14x11), Big L 126 (14x12); a round object 12 across is about 112.
  skin: { pixels: 112, short: 10, long: 12 },
  // Two thirds of a 14x4 band of room; a hat no smaller than a 4x4 thing on the crown.
  hat: { pixels: 18, short: 4, long: 6 },
  // Two thirds of the 6x5 box, reaching its full height or width.
  buddy: { pixels: 20, short: BUDDY_BOX.height, long: BUDDY_BOX.width - 1 },
};

/** The heads a hat is measured on: round, tall, wide, pointed and the ghost, as the item sheet shows them. */
const HAT_HEADS = ['round', 'tower', 'chonk', 'gumdrop', 'ghost'].map(n => heads.findIndex(h => h.name === n));
const BARE: AvatarConfig = { head: 0, eyes: 0, mouth: 0, cheeks: 0, hair: 0, body: 0, accessory: 0, arms: 0, feet: 0, palette: 0, shade: 1, flip: false };

const measure = (cells: [number, number][]): Fill => {
  if (!cells.length) return { width: 0, height: 0, pixels: 0 };
  const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]);
  return { width: Math.max(...xs) - Math.min(...xs) + 1, height: Math.max(...ys) - Math.min(...ys) + 1, pixels: cells.length };
};

/** How much a skin, hat or buddy fills; undefined for frames and auras. */
export function fillOf(item: Item): Fill | undefined {
  if (item.slot === 'skin' || item.slot === 'buddy') {
    const cells: [number, number][] = [];
    item.art!.forEach((row, y) => row.forEach((t, x) => { if (t) cells.push([x, y]); }));
    return measure(cells);
  }
  if (item.slot !== 'hat') return undefined;
  let least: Fill | undefined;
  for (const head of HAT_HEADS) {
    const bare = compose({ ...BARE, head }), worn = compose({ ...BARE, head, hat: item.id });
    const cells: [number, number][] = [];
    worn.forEach((row, y) => row.forEach((v, x) => { if (v !== bare[y][x] && v !== T.OUTLINE && v !== 0) cells.push([x, y]); }));
    const f = measure(cells);
    if (!least || f.pixels < least.pixels) least = f;
  }
  return least;
}

/** Why an item is under its slot's floor, or nothing when it fills enough. */
export function underFloor(item: Item): string[] {
  const f = fillOf(item);
  if (!f) return [];
  const floor = FILL_FLOORS[item.slot as FillSlot], why: string[] = [];
  const short = Math.min(f.width, f.height), long = Math.max(f.width, f.height);
  if (f.pixels < floor.pixels) why.push(`${f.pixels} pixels, under ${floor.pixels}`);
  if (short < floor.short) why.push(`${f.width}x${f.height}, a side under ${floor.short}`);
  else if (long < floor.long) why.push(`${f.width}x${f.height}, no side ${floor.long} long`);
  return why;
}

/**
 * Items under their floor today, to be redrawn bigger. The test skips these
 * and fails on anything else under its floor; take an id out as its item is
 * redrawn, and never add one.
 */
export const UNDERSIZED: readonly string[] = [
  'cutsies.kiwi',
  'amountle.crystal',
  'trackdle.cone',
  'tiltsies.ears',
  'trackdle.cap',
  'club.snowcap',
  'club.newyear',
  'club.shamrock',
  'club.blossom',
  'club.daisy',
  'club.sunhat',
  'club.antlers',
  'amountle.bean',
  'amountle.candy-corn',
  'stackdle.crescent',
  'stackdle.stairs',
  'cutsies.cupcake',
  'cutsies.pear',
  'tiltsies.daisy',
  'tiltsies.spring',
  'trackdle.surfboard',
  'trackdle.cactus',
];
