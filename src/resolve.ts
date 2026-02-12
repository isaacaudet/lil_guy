import { hashNth } from './hash';
import { heads, eyes, mouths, hair, bodies, accessories } from './parts';
import { palettes } from './palette';
import type { AvatarConfig, RenderOptions } from './types';

const partCounts = [
  heads.length,       // 0: head
  eyes.length,        // 1: eyes
  mouths.length,      // 2: mouth
  hair.length,        // 3: hair
  bodies.length,      // 4: body
  accessories.length, // 5: accessory
  palettes.length,    // 6: palette
] as const;

/**
 * Resolves an input string to a full AvatarConfig.
 * Each part is independently hashed so adding/removing variants
 * from one part doesn't cascade changes to others.
 */
export function resolve(input: string, overrides?: RenderOptions['parts']): AvatarConfig {
  const pick = (slotIndex: number, count: number): number =>
    hashNth(input, slotIndex) % count;

  return {
    head:      overrides?.head      ?? pick(0, partCounts[0]),
    eyes:      overrides?.eyes      ?? pick(1, partCounts[1]),
    mouth:     overrides?.mouth     ?? pick(2, partCounts[2]),
    hair:      overrides?.hair      ?? pick(3, partCounts[3]),
    body:      overrides?.body      ?? pick(4, partCounts[4]),
    accessory: overrides?.accessory ?? pick(5, partCounts[5]),
    palette:   pick(6, partCounts[6]),
    rotation:  pick(7, 9), // 9 sphere positions
  };
}
