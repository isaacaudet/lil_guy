import { describe, expect, test } from 'bun:test';
import { allowed, decodeLook, encodeLook, lookOf, makeSeed, pickable } from '../look';
import { resolve, dealOf } from '../resolve';
import { eyes, heads } from '../parts';
import { palettes } from '../palette';
import { eyeWeights, headWeights } from '../parts/weights';

const laser = eyes.findIndex(e => e.name === 'laser');
const crab = heads.findIndex(h => h.name === 'crab');

describe('seeds', () => {
  test('are random, the deal prefix and 12 characters, and draw a guy like any name', () => {
    const a = makeSeed(), b = makeSeed();
    expect(a).toMatch(/^4-[0-9a-z]{12}$/);
    expect(a).not.toBe(b);
    expect(lookOf(a)).toEqual(resolve(a));
  });
});

describe('the deal', () => {
  // A guy already dealt never changes: names and seeds from before deal 3 read
  // the frozen deal 2 tables, whatever parts and weights are added later.
  test('keeps every older seed and plain name exactly as it was dealt', () => {
    const was: [string, number[]][] = [
      ['alice', [7, 10, 11, 8, 23, 11, 10, 33]],
      ['okapi', [2, 7, 9, 12, 0, 2, 0, 1]],
      ['ud33mycomvkl', [14, 9, 4, 2, 8, 0, 5, 32]],
      ['founder:isaac', [15, 3, 4, 2, 29, 4, 7, 18]],
      // Deal 3, frozen when deal 4 dealt fewer shut eyes.
      ['3-0a1b2c3d4e5f', [24, 10, 1, 4, 6, 0, 15, 23]],
      ['3-zzzzzzzzzzzz', [3, 7, 13, 0, 2, 0, 14, 36]],
      ['3-k2m9q0w8e7r6', [12, 5, 1, 14, 15, 0, 11, 1]],
    ];
    for (const [name, parts] of was) {
      const c = resolve(name);
      expect([c.head, c.eyes, c.mouth, c.cheeks, c.hair, c.body, c.accessory, c.palette]).toEqual(parts);
    }
    expect(dealOf('alice')).toBe(2);
    expect(dealOf('3-0a1b2c3d4e5f')).toBe(3);
    expect(dealOf(makeSeed())).toBe(4);
  });
});

describe('the picker', () => {
  test('offers only common parts, plus the player\'s own', () => {
    const own = { ...resolve('x'), eyes: 0, head: 0 };
    expect(pickable(own, 'eyes')).not.toContain(laser);
    expect(pickable(own, 'head')).not.toContain(crab);
    // Common means at least 1 in 45 (`RARE` in look.ts); a part that is never
    // dealt can't be picked either.
    const total = eyeWeights.reduce((a, b) => a + b, 0);
    expect(pickable(own, 'eyes').every(i => i === own.eyes || eyeWeights[i] / total >= 1 / 45)).toBe(true);
    const lucky = { ...own, eyes: laser, head: crab };
    expect(pickable(lucky, 'eyes')).toContain(laser);
    expect(pickable(lucky, 'head')).toContain(crab);
    expect(pickable(own, 'head').length).toBeLessThan(headWeights.length);
  });

  test('rejects a rare part the player did not roll', () => {
    const own = { ...resolve('x'), eyes: 0 };
    expect(allowed(own, { eyes: laser })).toBe(false);
    expect(allowed({ ...own, eyes: laser }, { eyes: laser })).toBe(true);
  });
});

describe('look codes', () => {
  test('round-trip, versioned, only the slots picked', () => {
    const look = { head: 2, eyes: 1, palette: 5 };
    expect(encodeLook(look)).toBe('2:h2.e1.p5');
    expect(decodeLook(encodeLook(look))).toEqual(look);
  });

  test('refuse old codes, bad parts and rare parts that are not yours', () => {
    expect(decodeLook('3.5.0.12.4.0.17')).toBeNull();
    expect(decodeLook('2:h999')).toBeNull();
    expect(decodeLook('2:z1')).toBeNull();
    expect(decodeLook(`2:p${palettes.length}`)).toBeNull();
    const own = { ...resolve('x'), eyes: 0 };
    expect(decodeLook(`2:e${laser}`, own)).toBeNull();
    expect(decodeLook(`2:e${laser}`)).toEqual({ eyes: laser });
  });

  test('lay a picked look over the seed\'s guy', () => {
    const seed = 'abc123';
    const g = lookOf(seed, '2:e1.m0');
    expect(g.eyes).toBe(1);
    expect(g.mouth).toBe(0);
    expect(g.head).toBe(resolve(seed).head);
    expect(lookOf(seed, '3.5.0.12.4.0.17')).toEqual(resolve(seed));
  });
});
