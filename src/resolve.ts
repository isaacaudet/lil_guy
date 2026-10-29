import { hashNth } from './hash';
import {
  headWeights, eyeWeights, mouthWeights, cheekWeights, hairWeights,
  bodyWeights, accessoryWeights, armWeights, footWeights, shadeWeights,
  paletteWeights, weightedPick, DEAL_2, DEAL_3, RETIRED_EYES, withoutRetired,
} from './parts/weights';
import { FOUNDER_LOOK, FOUNDER_SEED } from './founder';
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
 * Seeds made now start with this. They draw from today's parts and weights;
 * an older seed draws from its own deal's frozen tables (`3-` from deal 3,
 * anything else, plain names included, from deal 2), so a guy already dealt
 * never changes when parts are added or weights move.
 */
export const DEAL_PREFIX = '4-';

/** Which deal an input draws from. */
export const dealOf = (input: string): 2 | 3 | 4 => (input.startsWith(DEAL_PREFIX) ? 4 : input.startsWith('3-') ? 3 : 2);

const DEAL_4 = {
  head: headWeights, eyes: eyeWeights, mouth: mouthWeights, cheeks: cheekWeights, hair: hairWeights,
  body: bodyWeights, accessory: accessoryWeights, palette: paletteWeights,
};

export function resolve(input: string, overrides?: RenderOptions['parts']): AvatarConfig {
  // The founder isn't dealt: his look was picked by hand (./founder). Parts asked for still go over it.
  if (input === FOUNDER_SEED) {
    return { ...dealFrom(input, { ...FOUNDER_LOOK.parts, ...overrides }), palette: FOUNDER_LOOK.palette, founder: true };
  }
  return dealFrom(input, overrides);
}

function dealFrom(input: string, overrides?: RenderOptions['parts']): AvatarConfig {
  const pick = (slot: number, weights: number[]): number => weightedPick(weights, hashNth(input, slot));
  const deal = dealOf(input);
  const w = deal === 4 ? DEAL_4 : deal === 3 ? DEAL_3 : DEAL_2;
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
