import { describe, expect, test } from 'bun:test';
import { allowed, decodeLook, encodeLook, lookOf, makeSeed, pickable } from '../look';
import { resolve } from '../resolve';
import { eyes, heads } from '../parts';
import { palettes } from '../palette';
import { eyeWeights, headWeights } from '../parts/weights';

const laser = eyes.findIndex(e => e.name === 'laser');
const crab = heads.findIndex(h => h.name === 'crab');

describe('seeds', () => {
  test('are random, 12 characters, and draw a guy like any name', () => {
    const a = makeSeed(), b = makeSeed();
    expect(a).toMatch(/^[0-9a-z]{12}$/);
    expect(a).not.toBe(b);
    expect(lookOf(a)).toEqual(resolve(a));
  });
});

describe('the picker', () => {
  test('offers only common parts, plus the player\'s own', () => {
    const own = { ...resolve('x'), eyes: 0, head: 0 };
    expect(pickable(own, 'eyes')).not.toContain(laser);
    expect(pickable(own, 'head')).not.toContain(crab);
    expect(pickable(own, 'eyes').every(i => eyeWeights[i] >= 2)).toBe(true);
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
