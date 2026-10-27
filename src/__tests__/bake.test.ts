import { describe, expect, test } from 'bun:test';
import { animate, AURAS, items, LOOP_MS, bakeGuy, bakeCard, bakeView, bakedImage, cardFace, cardFaceAt, faceSpec, shineFit, shineFrame, dress, resolve, guyCode, readGuyCode, encodeApng, profileFrames, toProfilePng, toProfileGif, encode } from '../index-headless';

const aura = `${AURAS[0].id}~gold~0.0123456~20`;
const hat = `${items.find(i => i.slot === 'hat' && !i.free)!.id}~nebula~0.0500000~7`;
const total = (d: number[]) => d.reduce((a, b) => a + b, 0);

describe('baked guys', () => {
  test('a guy with nothing that shimmers is his move, frame for frame', () => {
    const anim = animate('Maya0', 'hop', {}), baked = bakeGuy({ seed: 'Maya0' }, 'hop');
    expect(total(baked.delays)).toBe(anim.duration);
    expect([baked.width, baked.height]).toEqual([22, 20]);
  });

  test('a shimmering copy plays the move whole times, and its finish comes round with it', () => {
    const spec = { seed: 'Theo1', equip: [hat] };
    const baked = bakeGuy(spec, 'idle'), anim = animate('Theo1', 'idle', { equip: [hat] });
    const { repeats, speed } = shineFit(anim.duration);
    expect(total(baked.delays)).toBe(repeats * anim.duration);
    expect(speed).toBeGreaterThan(0.7);
    expect(speed).toBeLessThan(1.5);
    const owned = dress(resolve('Theo1'), { equip: [hat] }, 'Theo1').owned;
    expect(shineFrame(anim.frames[0], owned, 0)).toEqual(shineFrame(anim.frames[0], owned, LOOP_MS));
  });

  test('cards loop in LOOP_MS without a jump, and a plain card is one picture', () => {
    const face = cardFace(faceSpec({ seed: 'Lux7', equip: [hat, aura], grade: 3 }));
    expect(cardFaceAt(face, 0)).toEqual(cardFaceAt(face, LOOP_MS));
    expect(total(bakeCard(faceSpec({ seed: 'Lux7', equip: [hat], grade: 3 })).delays)).toBe(LOOP_MS);
    expect(bakeCard(faceSpec({ seed: 'Maya0' })).frames).toHaveLength(1);
  });

  test('views: a move, a still, a card; nothing for a view there is not', () => {
    const spec = { seed: 'Maya0', equip: [aura] };
    expect(bakeView(spec, 'still')!.frames).toHaveLength(1);
    expect(bakeView(spec, 'card-still')!.frames).toHaveLength(1);
    expect(bakeView(spec, 'moonwalk')).toBeNull();
    expect(bakeView(readGuyCode(guyCode(spec))!, 'idle')).toEqual(bakeView(spec, 'idle'));
  });

  test('an animated PNG carries every frame and loops for ever', async () => {
    const frames = bakeGuy({ seed: 'Maya0', equip: [aura] }, 'idle');
    const png = await bakedImage(frames, 'loop');
    expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const at = Buffer.from(png).indexOf('acTL');
    const view = new DataView(png.buffer, png.byteOffset + at + 4, 8);
    expect([view.getUint32(0), view.getUint32(4)]).toEqual([frames.frames.length, 0]);
    expect((await encodeApng(frames, 2)).length).toBeGreaterThan(png.length);
  });
});

describe('profile pictures', () => {
  const specs = [
    { seed: 'mia' },
    { seed: 'zed', equip: [encode({ item: 'aura.aurora', finish: 'classic', scuff: 0.1, print: 9 })] },
    { seed: 'founder:isaac', equip: [encode({ item: 'trackdle.flag', finish: 'gold', scuff: 0, print: 1 }), encode({ item: 'aura.origin', finish: 'classic', scuff: 0, print: 1, fx: 'shimmer' })] },
  ];

  test('are square and solid, with every pixel of the guy inside the round crop', () => {
    for (const spec of specs.slice(0, 2)) {
      const p = profileFrames(spec), r = p.width / 2, ground = [...p.frames[0].subarray(0, 4)];
      expect(p.width).toBe(p.height);
      for (const px of p.frames) for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) {
        const i = (y * p.width + x) * 4;
        expect(px[i + 3]).toBe(255);
        const isGround = [0, 1, 2].every(k => px[i + k] === ground[k]);
        if (!isGround) expect(Math.hypot(Math.max(Math.abs(x - r), Math.abs(x + 1 - r)), Math.max(Math.abs(y - r), Math.abs(y + 1 - r)))).toBeLessThanOrEqual(r);
      }
    }
  });

  test('run a worn backdrop out to every edge', () => {
    const p = profileFrames(specs[2]), px = p.frames[0], at = (x: number, y: number) => [...px.subarray((y * p.width + x) * 4, (y * p.width + x) * 4 + 3)].join();
    // A checkered flag: neighbouring cells differ along the top edge, not one flat colour.
    expect(new Set(Array.from({ length: p.width }, (_, x) => at(x, 0))).size).toBeGreaterThan(1);
    expect(px.every((v, i) => i % 4 !== 3 || v === 255)).toBe(true);
  });

  test('come out near 512 px, still as a PNG and moving as a GIF', async () => {
    const png = await toProfilePng(specs[1]), gif = toProfileGif(specs[1]);
    const side = (b: Uint8Array, at: number, le = false) => le ? b[at] | (b[at + 1] << 8) : (b[at] << 24) | (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3];
    expect(side(png, 16)).toBeGreaterThan(400); expect(side(png, 16)).toBeLessThanOrEqual(512);
    expect(side(gif, 6, true)).toBeGreaterThan(400); expect(side(gif, 6, true)).toBeLessThanOrEqual(512);
    expect(gif.length).toBeLessThan(10 * 1024 * 1024);
    expect(bakeView(specs[1], 'pfp-still')!.frames.length).toBe(1);
  });
});
