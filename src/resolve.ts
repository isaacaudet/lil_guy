import { hashNth } from './hash';
import {
  headWeights, eyeWeights, mouthWeights, cheekWeights, hairWeights,
  bodyWeights, accessoryWeights, armWeights, footWeights, shadeWeights,
  paletteWeights, weightedPick,
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

export function resolve(input: string, overrides?: RenderOptions['parts']): AvatarConfig {
  const pick = (slot: number, weights: number[]): number => weightedPick(weights, hashNth(input, slot));

  return {
    head:      overrides?.head      ?? pick(0, headWeights),
    eyes:      overrides?.eyes      ?? pick(1, eyeWeights),
    mouth:     overrides?.mouth     ?? pick(2, mouthWeights),
    hair:      overrides?.hair      ?? pick(3, hairWeights),
    body:      overrides?.body      ?? pick(4, bodyWeights),
    accessory: overrides?.accessory ?? pick(5, accessoryWeights),
    palette:   pick(6, paletteWeights),
    rotation:  overrides?.rotation  ?? hashNth(input, 7) % 9, // 9 sphere positions
    flip:      overrides?.flip      ?? hashNth(input, 8) % 2 === 1,
    shade:     overrides?.shade     ?? pick(9, shadeWeights),
    feet:      overrides?.feet      ?? pick(10, footWeights),
    cheeks:    overrides?.cheeks    ?? pick(11, cheekWeights),
    arms:      overrides?.arms      ?? pick(12, armWeights),
    lucky:     overrides?.lucky     ?? hashNth(input, 13) % LUCKY_ODDS === 0,
  };
}
