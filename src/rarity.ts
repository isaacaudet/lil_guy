import { heads, eyes, mouths, cheeks, hair, bodies, accessories } from './parts';
import {
  headWeights, eyeWeights, mouthWeights, cheekWeights, hairWeights,
  bodyWeights, accessoryWeights, paletteWeights,
} from './parts/weights';
import { palettes } from './palette';
import { gameItems, itemById } from './items';
import { AURAS, AURA_ODDS } from './auras';
import { DEEP_BLUE_PRINTS, FINISHES, special, type Owned } from './owned';
import { LUCKY_ODDS } from './resolve';
import type { AvatarConfig } from './types';

/**
 * How rare things are, as "one in N".
 *
 * A guy's rarity is the chance of rolling his exact combination of visible
 * traits — shape, eyes, mouth, cheeks, topper, markings, accessory and
 * colourway — so a laser-eyed guy in a crown is rarer than one with bean eyes
 * and no hat. A copy's rarity is the chance a capsule gives exactly that: its
 * item, its finish, a print as special as its print, a scuff at least as low
 * as its scuff, and a tally if it has one.
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
    { slot: 'variant', name: config.lucky ? 'Lucky' : 'regular', chance: config.lucky ? 1 / LUCKY_ODDS : 1 - 1 / LUCKY_ODDS },
  ];
}

/** One in how many guys has exactly this combination. */
export function guyOneIn(config: AvatarConfig): number {
  return 1 / traitOdds(config).reduce((p, t) => p * t.chance, 1);
}

/** One in how many capsules for its game give a copy at least this good. */
export function copyOneIn(o: Owned): number {
  const item = itemById(o.item);
  if (!item) return Infinity;
  const f = FINISHES[o.finish];
  // An aura comes from any capsule: this aura, in this finish.
  let p = f.aura ? AURA_ODDS * (1 / AURAS.length) * (f.aura / 100)
    : (1 / gameItems(item.game).filter(i => !i.free && i.slot !== 'aura').length) * (f.odds / 100) * (item.game === 'club' ? 1 : 1 - AURA_ODDS);

  // The print only matters when it is one of the famous ones.
  if (special(o) === 'Deep Blue') p *= DEEP_BLUE_PRINTS.length / 1000;
  else if (special(o)) p *= 1 / 20;

  // A scuff at least this low, within the finish's range.
  const [lo, hi] = f.scuffs;
  p *= Math.max(1e-7, (o.scuff - lo) / (hi - lo));

  if (o.tally !== undefined) p *= 0.1;
  return 1 / p;
}
