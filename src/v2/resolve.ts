import { resolve } from '../resolve';
import type { AvatarConfigV2 } from './types';

export type PartOverridesV2 = Partial<Omit<AvatarConfigV2, 'palette'>>;

/**
 * Resolves a name to a v2 config — and it is v1's resolve, untouched.
 *
 * Same hash, same weights, and it only ever rolls over v1's parts, so a
 * name-drawn guy is the same guy on v2 as he was on v1. New parts reach a
 * character only when the player picks them; the new slots start empty.
 */
export function resolveV2(input: string, overrides?: PartOverridesV2): AvatarConfigV2 {
  const config: AvatarConfigV2 = {
    ...resolve(input, overrides),
    outfit: overrides?.outfit ?? 0,
    held: overrides?.held ?? 0,
    backdrop: overrides?.backdrop ?? 0,
  };
  if (overrides?.tints) config.tints = overrides.tints;
  return config;
}
