/**
 * Writes the capsule pack into docs/capsules (scripts/build-site.sh copies it to the site's /capsules/):
 * every capsule shut, as plain PNGs at 16, 32, 64 and 128 (the 64 master at 2×), and the manifest the
 * Worker also serves at /capsules/manifest.json. A game can copy the files in, or read the manifest.
 *
 *   bun scripts/build-capsules.ts
 */
import { mkdirSync, readdirSync, rmSync } from 'fs';
import { CAPSULES, CAPSULE_FILE_SIZES, capsuleFile, capsuleFrames, capsuleManifest, encodePng } from '../src/index-headless.ts';

const OUT = new URL('../docs/capsules/', import.meta.url);
mkdirSync(OUT, { recursive: true });
// A capsule no longer listed takes its files with it.
for (const f of readdirSync(OUT)) rmSync(new URL(f, OUT));

for (const c of CAPSULES) for (const size of CAPSULE_FILE_SIZES) {
  const f = capsuleFrames({ machine: c.id, size })!;
  await Bun.write(new URL(capsuleFile(c.id, size), OUT), await encodePng(f.frames[0], f.width, f.height));
}
await Bun.write(new URL('manifest.json', OUT), JSON.stringify(capsuleManifest(), null, 2) + '\n');
console.log(`wrote ${CAPSULES.length * CAPSULE_FILE_SIZES.length} capsules and a manifest to docs/capsules`);
