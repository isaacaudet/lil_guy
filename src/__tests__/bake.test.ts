import { describe, expect, test } from 'bun:test';
import { animate, AURAS, items, LOOP_MS, bakeGuy, bakeCard, bakeView, bakedImage, cardFace, cardFaceAt, faceSpec, shineFit, shineFrame, dress, resolve, guyCode, readGuyCode, encodeApng } from '../index-headless';

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
