// The site's link preview, docs/og.png: five guys in their best (a hat in a rare finish with an effect,
// and an aura), each in a pool of light on the site's dark table. 1200 × 630, what previews show.
// scripts/build-site.sh copies it to the site; run this again after an art version bump.
//
//   bun scripts/og-site.ts
import { bakeGuy, bakedImage, encode, starter, OG_WIDTH, OG_HEIGHT } from '../src/index-headless.ts';

const GUYS: [string, string, string, string, string, string][] = [
  ['Puttsies', 'puttsies', 'prism', 'holo', 'aura.comet', 'sapphire'],
  ['Halfsies', 'halfsies', 'sunset', 'hearts', 'aura.hearts', 'ruby'],
  ['Amountle', 'amountle', 'gold', 'starlight', 'aura.sparkles', 'classic'],
  ['Tiltsies', 'tiltsies', 'nebula', 'chroma', 'aura.aurora', 'fade'],
  ['Stackdle', 'stackdle', 'tempered', 'electric', 'aura.lightning', 'classic'],
];
const rgba = new Uint8ClampedArray(OG_WIDTH * OG_HEIGHT * 4);
const guys = GUYS.map(([seed, game, finish, fx, aura, auraFinish]) => bakeGuy({
  seed, equip: [encode({ ...starter(seed, game as never), finish: finish as never, fx: fx as never }), encode({ item: aura, finish: auraFinish as never, scuff: .05, print: 7 })],
}, 'idle'));
// the middle one a size up, the way a hand of cards leads with the one to play
const scales = [8, 9, 11, 9, 8], gap = 18;
const widths = guys.map((g, i) => g.width * scales[i]);
let x = Math.round((OG_WIDTH - widths.reduce((a, b) => a + b, 0) - gap * (guys.length - 1)) / 2);
const floor = 445, centres: number[] = [];
guys.forEach((g, i) => { centres.push(x + widths[i] / 2); x += widths[i] + gap; });
for (let y = 0; y < OG_HEIGHT; y++) for (let px = 0; px < OG_WIDTH; px++) {
  const o = (y * OG_WIDTH + px) * 4, grid = px % 32 < 2 && y % 32 < 2 ? 6 : 0;
  const light = Math.max(...centres.map((c, i) => Math.max(0, 1 - Math.hypot((px - c) / 1.2, y - (floor - 90)) / (110 + scales[i] * 8)) ** 2)) * 30;
  rgba[o] = 0x13 + grid + light; rgba[o + 1] = 0x17 + grid + light; rgba[o + 2] = 0x26 + grid + light * 1.25; rgba[o + 3] = 255;
}
guys.forEach((g, i) => {
  const s = scales[i], gx = Math.round(centres[i] - (g.width * s) / 2), gy = floor - g.height * s;
  for (let yy = -9; yy <= 9; yy++) for (let xx = -70; xx <= 70; xx++) {
    if ((xx / 70) ** 2 + (yy / 9) ** 2 > 1) continue;
    const o = ((floor - 4 + yy) * OG_WIDTH + Math.round(centres[i]) + xx) * 4;
    rgba[o] *= .55; rgba[o + 1] *= .55; rgba[o + 2] *= .55;
  }
  const f = g.frames[0];
  for (let sy = 0; sy < g.height; sy++) for (let sx = 0; sx < g.width; sx++) {
    const k = (sy * g.width + sx) * 4;
    if (f[k + 3] < 128) continue;
    for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) {
      const o = ((gy + sy * s + dy) * OG_WIDTH + gx + sx * s + dx) * 4;
      rgba[o] = f[k]; rgba[o + 1] = f[k + 1]; rgba[o + 2] = f[k + 2]; rgba[o + 3] = 255;
    }
  }
});
await Bun.write(new URL('../docs/og.png', import.meta.url), await bakedImage({ width: OG_WIDTH, height: OG_HEIGHT, frames: [rgba], delays: [1000] }, 'still'));
console.log('docs/og.png');
