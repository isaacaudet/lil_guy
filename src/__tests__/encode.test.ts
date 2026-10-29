import { describe, expect, test } from 'bun:test';
import { AURAS, bakeGuy, bakeView, encodeApng, encodeGif, type Frames } from '../index-headless';
import { playGif, playPng, shown } from './decoders';

const aura = `${AURAS[0].id}~gold~0.0123456~20`;
const cases: [string, () => Frames][] = [
  ['a plain guy hopping (pixels turn transparent)', () => bakeGuy({ seed: 'Maya0' }, 'hop')],
  ['a gold hat shimmering', () => bakeGuy({ seed: 'Maya1', equip: ['amountle.crown~gold~0.0100000~5'] }, 'idle')],
  ['an aura round him', () => bakeGuy({ seed: 'Maya0', equip: [aura] }, 'dance')],
  ['a buddy beside him', () => bakeGuy({ seed: 'Maya0', equip: ['pets.kitten~plain~0.3000000~900'] }, 'hop')],
  ['his face, cropped', () => bakeView({ seed: 'mia', equip: [aura] }, 'face')!],
  ['noise with more than 256 colours', () => {
    const W = 9, H = 7, frames = Array.from({ length: 5 }, (_, k) => new Uint8ClampedArray(W * H * 4).map((_, i) => (i % 4 === 3 ? ((i * 7 + k * 13) % 5 ? 255 : 0) : (i * 37 + k * 91) % 256)));
    return { width: W, height: H, frames, delays: [100, 120, 80, 60, 200] };
  }],
];

describe('animated pictures play back exactly what went in', () => {
  for (const [what, make] of cases) {
    test(what, async () => {
      const f = make();
      for (const scale of [1, 3]) {
        const big = f.frames.map(px => shown(scale === 1 ? px : upscaled(px, f.width, f.height, scale)));
        const png = playPng(await encodeApng(f, scale));
        expect([png.width, png.height]).toEqual([f.width * scale, f.height * scale]);
        expect(png.frames.map(shown)).toEqual(big);
        expect(png.delays).toEqual(f.delays.map(d => Math.max(1, Math.round(d))));
        // A GIF has at most 255 colours: compare where it has them all.
        const gif = playGif(encodeGif(f, scale));
        expect(gif.frames.length).toBe(f.frames.length);
        if (colours(f) > 255) continue;
        expect(gif.frames.map(shown)).toEqual(big);
      }
    });
  }

  test('after the first frame only what changed is written', async () => {
    const f = bakeGuy({ seed: 'mia' }, 'idle');
    const whole = f.frames.length * (await encodeApng({ ...f, frames: f.frames.slice(0, 1), delays: [100] })).length;
    expect((await encodeApng(f)).length).toBeLessThan(whole * 0.6);
    expect(encodeGif(f).length).toBeLessThan(f.frames.length * encodeGif({ ...f, frames: f.frames.slice(0, 1), delays: [100] }).length * 0.6);
  });
});

function colours(f: Frames) {
  const set = new Set<number>();
  for (const px of f.frames) for (let i = 0; i < px.length; i += 4) if (px[i + 3] >= 128) set.add((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]);
  return set.size;
}

function upscaled(px: Uint8ClampedArray, w: number, h: number, s: number) {
  const out = new Uint8ClampedArray(w * s * h * s * 4);
  for (let y = 0; y < h * s; y++) for (let x = 0; x < w * s; x++) out.set(px.subarray((Math.floor(y / s) * w + Math.floor(x / s)) * 4, (Math.floor(y / s) * w + Math.floor(x / s)) * 4 + 4), (y * w * s + x) * 4);
  return out;
}
