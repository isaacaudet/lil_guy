/**
 * Appends newly added part and palette ids to src/v2/ids.lock.json.
 *
 * The lock is what makes "append-only" a rule rather than a hope: the test
 * fails if any locked id moves or disappears, and fails until new ids are
 * locked. This script only ever adds to the end — if the arrays no longer
 * start with the locked ids, it refuses and says where they diverged.
 *
 *   bun run ids:lock
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { PART_DEFS, SLOTS } from '../src/v2/parts';
import { palettesV2 } from '../src/v2/palettes';

const path = new URL('../src/v2/ids.lock.json', import.meta.url);
const lock: { parts: Record<string, string[]>; palettes: string[] } = existsSync(path)
  ? JSON.parse(readFileSync(path, 'utf8'))
  : { parts: {}, palettes: [] };

function extend(name: string, locked: string[], current: string[]): string[] {
  locked.forEach((id, i) => {
    if (current[i] !== id) {
      throw new Error(`${name}[${i}] was "${id}" and is now "${current[i] ?? 'missing'}". Locked ids never move — append instead.`);
    }
  });
  const added = current.slice(locked.length);
  if (added.length) console.log(`${name}: +${added.join(', +')}`);
  return current;
}

const next = {
  parts: Object.fromEntries(SLOTS.map(slot => [slot, extend(slot, lock.parts[slot] ?? [], PART_DEFS[slot].map(p => p.id))])),
  palettes: extend('palettes', lock.palettes, palettesV2.map(p => p.id)),
};
writeFileSync(path, JSON.stringify(next, null, 2) + '\n');
