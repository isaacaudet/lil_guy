import { test, expect } from 'bun:test';
import { crowdSprite, crowdSheet, CROWD_SIZES } from '../crowd';
import { resolve } from '../resolve';
import { paletteOf } from '../palette';
import { T } from '../parts/art';
import { encode } from '../owned';
import { items } from '../items';

const seeds = Array.from({ length: 200 }, (_, i) => `crowd-test-${i}`);
const colours = (s: { size: number; rgba: Uint8ClampedArray }) => {
  const out = new Set<string>();
  for (let i = 0; i < s.rgba.length; i += 4) if (s.rgba[i + 3]) out.add(`${s.rgba[i]},${s.rgba[i + 1]},${s.rgba[i + 2]}`);
  return out;
};
const hex = (c: string) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)).join(',');

test('every size is the same guy every time, square and standing on the cell floor', () => {
  for (const size of CROWD_SIZES) for (const seed of seeds.slice(0, 40)) {
    const a = crowdSprite({ seed }, size);
    expect(a.rgba.length).toBe(size * size * 4);
    expect(crowdSprite({ seed }, size).rgba).toEqual(a.rgba);
    const floor = a.rgba.subarray((size - 1) * size * 4);
    expect(floor.some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  }
});

test('his own colours: the 10 keeps his outline and eyes, the 2 is only colours he wears', () => {
  for (const seed of seeds) {
    const palette = paletteOf(resolve(seed)).colors;
    const ten = colours(crowdSprite({ seed }, 10)), full = colours(crowdSprite({ seed }, 16)), two = colours(crowdSprite({ seed }, 2));
    expect(ten.has(hex(palette[T.OUTLINE]))).toBe(true);
    expect(ten.has(hex(palette[T.EYE]))).toBe(true);
    for (const c of two) expect(full.has(c)).toBe(true);
  }
});

test('what he wears shows in the crowd', () => {
  const hat = items.find(i => i.slot === 'hat' && !i.retired && !i.free)!;
  const seed = 'crowd-hat';
  const bare = crowdSprite({ seed }, 10).rgba, dressed = crowdSprite({ seed, equip: [encode({ item: hat.id, finish: 'plain', scuff: 0.2, print: 1 })] }, 10).rgba;
  expect(dressed).not.toEqual(bare);
});

test('a sheet puts guy n at column n % columns', () => {
  const sheet = crowdSheet(seeds.slice(0, 5).map(seed => ({ seed })), 8, 2);
  expect([sheet.width, sheet.height, sheet.columns]).toEqual([16, 24, 2]);
  const third = crowdSprite({ seed: seeds[2] }, 8).rgba;
  for (let y = 0; y < 8; y++) expect(sheet.rgba.subarray(((8 + y) * 16) * 4, ((8 + y) * 16 + 8) * 4)).toEqual(third.subarray(y * 32, (y + 1) * 32));
});
