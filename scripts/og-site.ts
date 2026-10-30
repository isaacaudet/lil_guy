// The site's link preview, docs/og.png: the card on its side with five guys in their best in its window
// (a hat in a rare finish with an effect, and an aura) and what lil guys is under them (src/og.ts).
// scripts/build-site.sh copies it to the site; run this again after an art version bump.
//
//   bun scripts/og-site.ts
import { bakedImage, encode, siteOgFrames, starter } from '../src/index-headless.ts';

const GUYS: [string, string, string, string, string, string][] = [
  ['Puttsies', 'puttsies', 'prism', 'holo', 'aura.comet', 'sapphire'],
  ['Halfsies', 'halfsies', 'sunset', 'hearts', 'aura.hearts', 'ruby'],
  ['Amountle', 'amountle', 'gold', 'starlight', 'aura.sparkles', 'classic'],
  ['Tiltsies', 'tiltsies', 'nebula', 'chroma', 'aura.aurora', 'fade'],
  ['Stackdle', 'stackdle', 'tempered', 'electric', 'aura.lightning', 'classic'],
];
const specs = GUYS.map(([seed, game, finish, fx, aura, auraFinish]) => ({
  seed, equip: [encode({ ...starter(seed, game as never), finish: finish as never, fx: fx as never }), encode({ item: aura, finish: auraFinish as never, scuff: .05, print: 7 })],
}));
const frames = siteOgFrames(specs, 'Get dealt a guy. Pull hats and auras in every club game.');
await Bun.write(new URL('../docs/og.png', import.meta.url), await bakedImage(frames, 'still'));
console.log('docs/og.png');
