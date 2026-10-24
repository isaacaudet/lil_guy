import { heads, eyes, mouths, cheeks, hair, bodies, accessories } from './parts';
import {
  headWeights, eyeWeights, mouthWeights, cheekWeights, hairWeights,
  bodyWeights, accessoryWeights, paletteWeights,
} from './parts/weights';
import { palettes } from './palette';
import { gameItems, itemById } from './items';
import { BLUE_GEMS, dopplerPhase, FINISHES, type Owned } from './owned';
import type { AvatarConfig } from './types';

/**
 * How rare things are, as "one in N".
 *
 * A guy's rarity is the chance of rolling his exact combination of visible
 * traits — shape, eyes, mouth, cheeks, topper, markings, accessory and
 * colourway — so a laser-eyed guy in a crown is rarer than one with bean eyes
 * and no hat. A copy's rarity is the chance a case drops exactly that: its
 * item, its finish, a pattern as special as its pattern, a float at least as
 * low as its float, and StatTrak if it has it.
 */

export interface TraitOdds {
  slot: string;
  name: string;
  /** Chance of this trait, 0–1. */
  chance: number;
}

const share = (weights: number[], i: number) => weights[i] / weights.reduce((a, b) => a + b, 0);

/** Each visible trait of a guy and how likely it was. */
export function traitOdds(config: AvatarConfig): TraitOdds[] {
  return [
    { slot: 'shape', name: heads[config.head].name, chance: share(headWeights, config.head) },
    { slot: 'eyes', name: eyes[config.eyes].name, chance: share(eyeWeights, config.eyes) },
    { slot: 'mouth', name: mouths[config.mouth].name, chance: share(mouthWeights, config.mouth) },
    { slot: 'cheeks', name: cheeks[config.cheeks].name, chance: share(cheekWeights, config.cheeks) },
    { slot: 'topper', name: hair[config.hair].name, chance: share(hairWeights, config.hair) },
    { slot: 'markings', name: bodies[config.body].name, chance: share(bodyWeights, config.body) },
    { slot: 'accessory', name: accessories[config.accessory].name, chance: share(accessoryWeights, config.accessory) },
    { slot: 'colour', name: palettes[config.palette].name, chance: share(paletteWeights, config.palette) },
  ];
}

/** One in how many guys has exactly this combination. */
export function guyOneIn(config: AvatarConfig): number {
  return 1 / traitOdds(config).reduce((p, t) => p * t.chance, 1);
}

/** One in how many case drops for its game is a copy at least this good. */
export function copyOneIn(o: Owned): number {
  const item = itemById(o.item);
  if (!item) return Infinity;
  const pool = gameItems(item.game).filter(i => !i.free).length;
  const f = FINISHES[o.finish];
  let p = (1 / pool) * (f.odds / 100);

  // The pattern only matters when it is one of the famous ones.
  if (o.finish === 'case-hardened' && BLUE_GEMS.includes(o.pattern)) p *= BLUE_GEMS.length / 1000;
  if (o.finish === 'doppler' && ['Ruby', 'Sapphire', 'Black Pearl'].includes(dopplerPhase(o.pattern))) p *= 1 / 20;

  // A float at least this low, within the finish's range.
  const [lo, hi] = f.floats;
  p *= Math.max(1e-7, (o.float - lo) / (hi - lo));

  if (o.stattrak !== undefined) p *= 0.1;
  return 1 / p;
}
