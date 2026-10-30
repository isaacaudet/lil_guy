import { describe, expect, test } from 'bun:test';
import { decodeGuy, encodeGuy } from '../guy';
import { encodeLook, lookOf, makeSeed } from '../look';
import { resolve } from '../resolve';
import { paletteOf } from '../palette';
import { toSvgString } from '../render-string';
import { headWeights, paletteWeights } from '../parts/weights';
import * as headless from '../index-headless';
// The types the games import; tsc (npx tsc --noEmit -p .) fails if one goes.
import type { Finish, GuySpec, Palette, Surface } from '../index-headless';

// A code carries no founder flag: the founder is drawn from his seed, never a code.
const bare = (c: ReturnType<typeof resolve>) => {
  const { founder: _, ...rest } = c;
  return { ...rest, lucky: !!c.lucky };
};

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

  test('read codes written by the first build that had them (lil_guy 0.5, PR #4)', () => {
    // Parties and Amountle's chat already pass these around. Part and palette
    // arrays only grow, so every old code is still in range. The last one has
    // every field at the largest value 0.5 could write.
    const old: [string, number[]][] = [
      ['g1:a.5.2.8.a.1.0.10.2.0.0.1.0.0', [10, 5, 2, 8, 10, 1, 0, 36, 2, 0, 0, 1, 0, 0]],
      ['g1:7.2.1.0.k.9.1.0.2.0.1.1.1.0', [7, 2, 1, 0, 20, 9, 1, 0, 2, 0, 1, 1, 1, 0]],
      ['g1:3.0.2.8.k.0.0.t.1.0.1.1.0.0', [3, 0, 2, 8, 20, 0, 0, 29, 1, 0, 1, 1, 0, 0]],
      ['g1:o.g.f.d.t.d.d.11.2.4.2.8.1.1', [24, 16, 15, 13, 29, 13, 13, 37, 2, 4, 2, 8, 1, 1]],
    ];
    const keys = ['head', 'eyes', 'mouth', 'cheeks', 'hair', 'body', 'accessory', 'palette', 'shade', 'feet', 'arms', 'rotation', 'flip', 'lucky'] as const;
    for (const [code, values] of old) {
      const guy = decodeGuy(code);
      expect(guy).not.toBeNull();
      keys.forEach((key, i) => expect(Number(guy![key])).toBe(values[i]));
      expect(encodeGuy(guy!)).toBe(code);
      expect(toSvgString('', { size: 32, parts: guy!, palette: paletteOf(guy!) })).toContain('<svg');
    }
  });

  test('turn down anything else', () => {
    const code = encodeGuy(resolve('x'));
    for (const bad of ['', 'g2:' + code.slice(3), code.slice(3), code + '.0', code.split('.').slice(0, -1).join('.'), '2:h3.e5', '1.2.3.4.5.6.7', code.replace(/^g1:[0-9a-z]+/, 'g1:' + headWeights.length.toString(36)), code.replace(/\.[01]$/, '.2'), code.replace(/\.[01]$/, '.-1'), null as unknown as string]) {
      expect(decodeGuy(bad)).toBeNull();
    }
  });
});

export type GameTypes = [GuySpec, Surface, Finish, Palette];

describe('the headless build', () => {
  // Every name the games import from their vendored copy today: Amountle's
  // src/lil-guy-club.js and src/lil-guy-headless.js, and dle-club's
  // dist/club/faces.js (look.js). A re-vendor that drops one breaks a game.
  const used = [
    'animate', 'animateOptions', 'bakeGuy', 'cheeks', 'decodeGuy', 'encode', 'encodeApng', 'eyes', 'GAMES', 'hair', 'hash',
    'heads', 'mouths', 'ownedOf', 'paletteOf', 'palettes', 'roll', 'slotOf', 'toSvgString', 'voxelColumns', 'voxelMesh',
    'resolve', 'bodies', 'accessories', 'getPalette',
  ];

  test('exports every name the games import', () => {
    const missing = used.filter(name => !(name in headless));
    expect(missing).toEqual([]);
  });
});
