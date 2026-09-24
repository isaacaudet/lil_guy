import { heads, eyes, mouths, hair, bodies, accessories } from '../parts';
import { accessoryPlacements } from '../parts/accessories';
import { hairPlacements } from '../parts/hair';
import type { PartPlacement, PixelGrid } from '../types';
import { emptyGridV2, upscale2x } from './grid';
import type { PartDef, PartMeta, Slot } from './types';

/** The library version v1's parts shipped in. */
const V1 = '0.1.0';

/**
 * v1's parts in array order, by the names they were authored under. The order
 * is the saved index, so it is load-bearing: never reorder, only append.
 */
const V1_NAMES: Record<'head' | 'eyes' | 'mouth' | 'top' | 'body' | 'accessory', string[]> = {
  head: [
    'round', 'gumdrop', 'tall', 'wide', 'pear', 'egg', 'bean', 'ghost',
    'horned', 'eared', 'stack', 'crystal', 'cloud', 'slime', 'tri', 'lump',
    'droop', 'peanut', 'spire', 'boulder',
  ],
  eyes: [
    'dots', 'round', 'happy', 'sparkle', 'wink', 'cross', 'tinyDots', 'wideEyes',
    'sleepy', 'angry', 'hearts', 'cyclops',
    'dizzy', 'sideEye', 'visor', 'pleading',
    'starry', 'bigShine', 'curious', 'softBean',
    'doe', 'content', 'twinkle',
  ],
  mouth: [
    'smile', 'grin', 'cat', 'open', 'flat', 'tongue', 'fang', 'squiggle', 'gape',
    'frown', 'smirk', 'teeth', 'oh',
    'beam', 'tiny', 'wobble', 'tinyCat',
    'blep', 'softSmile', 'laugh',
  ],
  top: [
    'none', 'antenna', 'tuft', 'crown', 'cap', 'beanie', 'spikes', 'bow',
    'flower', 'tophat', 'propeller', 'star', 'sprout', 'bandana', 'antlers', 'halo',
    'beret', 'wizard', 'earmuffs', 'laurel',
    'heartPin', 'starClip', 'pompom', 'leafPair',
    'partyHat', 'chefHat', 'catEars', 'bunnyEars', 'cowboy',
    'mushroomCap', 'candle', 'topKnot', 'visor', 'flowerCrown',
  ],
  body: [
    'plain', 'striped', 'spotted', 'heart', 'belly', 'zigzag', 'twoTone', 'star',
    'checker', 'splotch', 'sprinkles', 'sash',
    'gradient', 'patch', 'bigDots', 'bands',
    'freckleBand', 'collarPatch', 'pebbles', 'crest',
    'overalls', 'pawPrint', 'crescent', 'diamond',
    'lightning', 'seam', 'flowerSpot', 'pocketPatch',
  ],
  accessory: [
    'none', 'glasses', 'sunglasses', 'blush', 'freckles', 'bowtie',
    'monocle', 'eyepatch', 'scarf', 'whiskers',
    'bandaid', 'tears', 'earring', 'headphones',
    'flushed', 'sweat', 'crumb', 'antennaeDots',
    'mustache', 'beard', 'necktie', 'pendant', 'bib', 'squareGlasses',
    'buttonNose', 'beautyMark', 'starSticker', 'heartCheeks', 'collarBell',
  ],
};

const kebab = (name: string) => name.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
const words = (name: string) => name.replace(/[A-Z]/g, c => ' ' + c.toLowerCase());

function fromV1(slot: keyof typeof V1_NAMES, grids: PixelGrid[], placements?: PartPlacement[]): PartDef[] {
  return grids.map((grid, i) => ({
    id: `${slot}.${kebab(V1_NAMES[slot][i])}`,
    name: words(V1_NAMES[slot][i]),
    grid: upscale2x(grid),
    placement: placements?.[i],
    source: 'free',
    tags: [],
    introduced: V1,
  }));
}

/** The empty part a new slot starts with, so index 0 always means "nothing". */
function none(slot: Slot, placement: PartPlacement): PartDef {
  return { id: `${slot}.none`, name: 'none', grid: emptyGridV2(), placement, source: 'free', tags: [], introduced: '0.2.0' };
}

/**
 * Every slot's parts, in saved-index order. v1's come first at their v1
 * indices, doubled to 32x32; anything new is appended after them.
 *
 * Art is added here as a `PartDef` on the end of its slot. The import script
 * and the append-only test both work from this table.
 */
export const PART_DEFS: Record<Slot, PartDef[]> = {
  head: [...fromV1('head', heads)],
  eyes: [...fromV1('eyes', eyes)],
  mouth: [...fromV1('mouth', mouths)],
  top: [...fromV1('top', hair, hairPlacements)],
  body: [...fromV1('body', bodies)],
  accessory: [...fromV1('accessory', accessories, accessoryPlacements)],
  // Outfits sit over the body, under the face, and part around the mouth.
  outfit: [none('outfit', 'field')],
  // A held item carries its own stubby arm and hugs the side of the body.
  held: [none('held', 'edge')],
  // Card and profile tiles, drawn behind the guy; never in lists.
  backdrop: [none('backdrop', 'field')],
};

export const SLOTS = Object.keys(PART_DEFS) as Slot[];

const grids = (slot: Slot) => PART_DEFS[slot].map(p => p.grid);
const placements = (slot: Slot, fallback: PartPlacement) => PART_DEFS[slot].map(p => p.placement ?? fallback);

export const headsV2 = grids('head');
export const eyesV2 = grids('eyes');
export const mouthsV2 = grids('mouth');
export const topsV2 = grids('top');
export const bodiesV2 = grids('body');
export const accessoriesV2 = grids('accessory');
export const outfits = grids('outfit');
export const held = grids('held');
export const backdrops = grids('backdrop');

export const topPlacements = placements('top', 'top');
export const accessoryPlacementsV2 = placements('accessory', 'field');
export const outfitPlacements = placements('outfit', 'field');
export const heldPlacements = placements('held', 'edge');
export const eyeBlinksV2 = PART_DEFS.eyes.map(p => p.blink);

/** Every part's metadata, across all slots. */
export const catalog: PartMeta[] = SLOTS.flatMap(slot =>
  PART_DEFS[slot].map((p, index) => {
    const meta: PartMeta = {
      id: p.id,
      slot,
      index,
      name: p.name,
      source: p.source ?? 'free',
      tags: p.tags ?? [],
      introduced: p.introduced,
    };
    if (p.rarity) meta.rarity = p.rarity;
    return meta;
  })
);

const byId = new Map(catalog.map(m => [m.id, m]));

/** Looks a part up by its stable id. */
export function partById(id: string): PartMeta | undefined {
  return byId.get(id);
}

/** The saved index for an id, or -1 if this build does not know the part. */
export function indexOfPart(id: string): number {
  return byId.get(id)?.index ?? -1;
}

/** The stable id for a slot and saved index. */
export function partId(slot: Slot, index: number): string | undefined {
  return PART_DEFS[slot][index]?.id;
}
