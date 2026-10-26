import { hashNth } from './hash';
import {
  headWeights, eyeWeights, mouthWeights, cheekWeights, hairWeights,
  bodyWeights, accessoryWeights, armWeights, footWeights, shadeWeights,
  paletteWeights, weightedPick, DEAL_2, RETIRED_EYES, withoutRetired,
} from './parts/weights';
import type { AvatarConfig, RenderOptions } from './types';

/**
 * Resolves an input string to a full AvatarConfig.
 *
 * Each slot is hashed independently so adding or removing variants from one
 * part doesn't cascade into the others, and each pick is weighted (see
 * ./parts/weights) so the simple, sweet looks are the common ones.
 */
/** One name in this many gets the Lucky colour variant. */
export const LUCKY_ODDS = 400;

/**
 * Seeds made from deal 3 on start with this. They draw from today's parts and
 * weights; anything else (an older seed, a plain name) draws from the frozen
 * deal 2 tables, so a guy already dealt never changes when parts are added.
 */
export const DEAL_PREFIX = '3-';

/** Which deal an input draws from. */
export const dealOf = (input: string): 2 | 3 => (input.startsWith(DEAL_PREFIX) ? 3 : 2);

const DEAL_3 = {
  head: headWeights, eyes: eyeWeights, mouth: mouthWeights, cheeks: cheekWeights, hair: hairWeights,
  body: bodyWeights, accessory: accessoryWeights, palette: paletteWeights,
};

export function resolve(input: string, overrides?: RenderOptions['parts']): AvatarConfig {
  const pick = (slot: number, weights: number[]): number => weightedPick(weights, hashNth(input, slot));
  const w = dealOf(input) === 3 ? DEAL_3 : DEAL_2;
  // A guy whose eyes were retired draws again from the rest, so only he changes.
  let eyes = overrides?.eyes ?? pick(1, w.eyes);
  if (RETIRED_EYES.includes(eyes)) eyes = weightedPick(withoutRetired(w.eyes, RETIRED_EYES), hashNth(input, 14));

  return {
    head:      overrides?.head      ?? pick(0, w.head),
    eyes,
    mouth:     overrides?.mouth     ?? pick(2, w.mouth),
    hair:      overrides?.hair      ?? pick(3, w.hair),
    body:      overrides?.body      ?? pick(4, w.body),
    accessory: overrides?.accessory ?? pick(5, w.accessory),
    palette:   pick(6, w.palette),
    rotation:  overrides?.rotation  ?? hashNth(input, 7) % 9, // 9 sphere positions
    flip:      overrides?.flip      ?? hashNth(input, 8) % 2 === 1,
    shade:     overrides?.shade     ?? pick(9, shadeWeights),
    feet:      overrides?.feet      ?? pick(10, footWeights),
    cheeks:    overrides?.cheeks    ?? pick(11, w.cheeks),
    arms:      overrides?.arms      ?? pick(12, armWeights),
    lucky:     overrides?.lucky     ?? hashNth(input, 13) % LUCKY_ODDS === 0,
  };
}
