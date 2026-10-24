import {
  headWeights, eyeWeights, mouthWeights, cheekWeights, hairWeights, bodyWeights,
  accessoryWeights, paletteWeights, shadeWeights, footWeights, armWeights,
} from './parts/weights';
import type { AvatarConfig } from './types';

/**
 * A whole guy as a short code, for showing him where his seed must not go.
 *
 * A seed is private and kept for good: anyone holding it could draw every
 * guy the player will ever be dealt. A board shows other people's guys, so it
 * sends this instead: every visible field of the guy as he is, picked look
 * and all, and nothing that leads back to the seed. Codes are versioned
 * (`g1:`), so a later change to the fields can't misread an old one.
 */

/** The fields in a version-1 code, in order, with how many values each can take. */
const FIELDS: [keyof AvatarConfig, number][] = [
  ['head', headWeights.length],
  ['eyes', eyeWeights.length],
  ['mouth', mouthWeights.length],
  ['cheeks', cheekWeights.length],
  ['hair', hairWeights.length],
  ['body', bodyWeights.length],
  ['accessory', accessoryWeights.length],
  ['palette', paletteWeights.length],
  ['shade', shadeWeights.length],
  ['feet', footWeights.length],
  ['arms', armWeights.length],
  ['rotation', 9],
  ['flip', 2],
  ['lucky', 2],
];

/** A guy as a version-1 code: `g1:` and his fields in base 36, dot-separated. */
export function encodeGuy(config: AvatarConfig): string {
  return 'g1:' + FIELDS.map(([key]) => Number(config[key] ?? 0).toString(36)).join('.');
}

/**
 * A code back into a guy, or null for anything that isn't a version-1 code
 * this library can draw: another version, a field missing, or one out of range.
 * He comes back bare: items are worn on top with `dress`.
 */
export function decodeGuy(code: string): AvatarConfig | null {
  if (typeof code !== 'string' || !code.startsWith('g1:')) return null;
  const values = code.slice(3).split('.');
  if (values.length !== FIELDS.length) return null;
  const config: Record<string, number | boolean> = {};
  for (let i = 0; i < FIELDS.length; i++) {
    const [key, count] = FIELDS[i];
    if (!/^[0-9a-z]{1,2}$/.test(values[i])) return null;
    const n = parseInt(values[i], 36);
    if (n >= count) return null;
    config[key] = key === 'flip' || key === 'lucky' ? n === 1 : n;
  }
  return config as unknown as AvatarConfig;
}
