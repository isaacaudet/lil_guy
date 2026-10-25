import { describe, expect, test } from 'bun:test';
import { decodeGuy, encodeGuy } from '../guy';
import { encodeLook, lookOf, makeSeed } from '../look';
import { resolve } from '../resolve';
import { paletteOf } from '../palette';
import { toSvgString } from '../render-string';
import { headWeights, paletteWeights } from '../parts/weights';

const bare = (c: ReturnType<typeof resolve>) => ({ ...c, lucky: !!c.lucky });

describe('guy codes', () => {
  test('round-trip every visible field, for many guys', () => {
    for (let i = 0; i < 2000; i++) {
      const guy = resolve(`player ${i}`);
      const code = encodeGuy(guy);
      expect(code).toMatch(/^g1:[0-9a-z]+(\.[0-9a-z]+){13}$/);
      expect(decodeGuy(code)).toEqual(bare(guy));
    }
  });

  test('carry a picked look and the rare fields', () => {
    const seed = makeSeed();
    const guy = lookOf(seed, encodeLook({ palette: 3 }));
    expect(decodeGuy(encodeGuy(guy))).toEqual(bare(guy));
    const lucky = { ...resolve('x'), lucky: true, flip: true, rotation: 8, palette: paletteWeights.length - 1 };
    expect(decodeGuy(encodeGuy(lucky))).toEqual(lucky);
  });

  test('draw the same guy as the seed does, without the seed', () => {
    const seed = makeSeed();
    const guy = lookOf(seed, encodeLook({ eyes: 0 }));
    const back = decodeGuy(encodeGuy(guy))!;
    const own = toSvgString(seed, { size: 32, parts: guy, palette: paletteOf(guy) });
    expect(toSvgString('', { size: 32, parts: back, palette: paletteOf(back) })).toBe(own);
    expect(encodeGuy(guy)).not.toContain(seed);
  });

  test('turn down anything else', () => {
    const code = encodeGuy(resolve('x'));
    for (const bad of ['', 'g2:' + code.slice(3), code.slice(3), code + '.0', code.split('.').slice(0, -1).join('.'), '2:h3.e5', '1.2.3.4.5.6.7', code.replace(/^g1:[0-9a-z]+/, 'g1:' + headWeights.length.toString(36)), code.replace(/\.[01]$/, '.2'), code.replace(/\.[01]$/, '.-1'), null as unknown as string]) {
      expect(decodeGuy(bad)).toBeNull();
    }
  });
});
