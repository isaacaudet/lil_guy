import { hashNth } from './hash';
import {
  headWeights, eyeWeights, mouthWeights, hairWeights,
  bodyWeights, accessoryWeights, paletteWeights,
  shadeWeights, footWeights, patternToneWeights, weightedPick,
} from './parts/weights';
import type { AvatarConfig, RenderOptions } from './types';

/**
 * Resolves an input string to a full AvatarConfig.
 *
 * Each slot is hashed independently so adding or removing variants from one
 * part doesn't cascade into the others, and each pick is weighted (see
 * ./parts/weights) so the set keeps its character as the library grows —
 * a uniform roll over a big library averages out to something bland.
 */
export function resolve(input: string, overrides?: RenderOptions['parts']): AvatarConfig {
  const pick = (slotIndex: number, weights: number[]): number =>
    weightedPick(weights, hashNth(input, slotIndex));

  return {
    head:      overrides?.head      ?? pick(0, headWeights),
    eyes:      overrides?.eyes      ?? pick(1, eyeWeights),
    mouth:     overrides?.mouth     ?? pick(2, mouthWeights),
    hair:      overrides?.hair      ?? pick(3, hairWeights),
    body:      overrides?.body      ?? pick(4, bodyWeights),
    accessory: overrides?.accessory ?? pick(5, accessoryWeights),
    palette:   pick(6, paletteWeights),
    rotation:  hashNth(input, 7) % 9, // 9 sphere positions
    flip:        overrides?.flip        ?? hashNth(input, 8) % 2 === 1,
    shade:       overrides?.shade       ?? weightedPick(shadeWeights, hashNth(input, 9)),
    feet:        overrides?.feet        ?? weightedPick(footWeights, hashNth(input, 10)),
    patternTone: overrides?.patternTone ?? weightedPick(patternToneWeights, hashNth(input, 11)),
  };
}
