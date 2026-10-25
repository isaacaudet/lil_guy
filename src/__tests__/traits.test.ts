import { describe, test, expect } from 'bun:test';
import { resolve } from '../resolve';
import { traitOdds, guyOneIn, TRAIT_SLOTS } from '../rarity';
import { TRAIT_ICONS, TIER_ICONS } from '../icons';
import { armWeights, footWeights, shadeWeights } from '../parts/weights';

describe('traitOdds', () => {
  test('lists twelve traits in a fixed order', () => {
    for (const seed of ['a', 'b', 'founder', '3-xyz']) {
      expect(traitOdds(resolve(seed)).map(t => t.slot)).toEqual([...TRAIT_SLOTS]);
    }
    expect(TRAIT_SLOTS).toHaveLength(12);
  });

  test('tone, arms, feet and lucky read the config, with the shared weights', () => {
    const c = { ...resolve('x'), shade: 2, arms: 1, feet: 3, lucky: false };
    const t = Object.fromEntries(traitOdds(c).map(x => [x.slot, x]));
    expect(t.tone.name).toBe('vivid');
    expect(t.tone.chance).toBeCloseTo(shadeWeights[2] / shadeWeights.reduce((a, b) => a + b), 10);
    expect(t.arms.name).toBe('by the sides');
    expect(t.arms.chance).toBeCloseTo(armWeights[1] / armWeights.reduce((a, b) => a + b), 10);
    expect(t.feet.name).toBe('socks');
    expect(t.feet.chance).toBeCloseTo(footWeights[3] / footWeights.reduce((a, b) => a + b), 10);
    expect(t.lucky.name).toBe('regular');
    expect(traitOdds({ ...c, arms: 2 }).find(x => x.slot === 'arms')!.name).toBe('waving');
    expect(traitOdds({ ...c, shade: 0 }).find(x => x.slot === 'tone')!.name).toBe('pastel');
  });

  test('every trait has a chance between 0 and 1, and guyOneIn multiplies them', () => {
    for (let i = 0; i < 200; i++) {
      const c = resolve('3-n' + i); // deal 3: every part it deals has weight
      const odds = traitOdds(c);
      for (const t of odds) { expect(t.chance).toBeGreaterThan(0); expect(t.chance).toBeLessThanOrEqual(1); expect(t.name).toBeTruthy(); }
      expect(guyOneIn(c)).toBeCloseTo(1 / odds.reduce((p, t) => p * t.chance, 1), 6);
    }
  });
});

describe('icons', () => {
  const all = { ...TRAIT_ICONS, ...TIER_ICONS };
  test('one per trait and per tier', () => {
    expect(Object.keys(TRAIT_ICONS)).toEqual([...TRAIT_SLOTS]);
    expect(Object.keys(TIER_ICONS)).toEqual(['Common', 'Uncommon', 'Rare', 'Legendary', 'Chase']);
  });
  test('crisp, sized by CSS, in currentColor plus at most two accents', () => {
    for (const svg of Object.values(all)) {
      expect(svg).toStartWith('<svg ');
      expect(svg).toContain('viewBox="0 0 12 12"');
      expect(svg).toContain('shape-rendering="crispEdges"');
      expect(svg).not.toMatch(/<svg[^>]*\s(width|height)=/);
      expect(svg).toContain('currentColor');
      const fixed = new Set([...svg.matchAll(/fill="(#[0-9A-Fa-f]{6})"/g)].map(m => m[1]));
      expect(fixed.size).toBeLessThanOrEqual(2);
      // Every pixel sits on the grid.
      for (const m of svg.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="1"/g)) {
        expect(Number(m[1]) + Number(m[3])).toBeLessThanOrEqual(12);
        expect(Number(m[2])).toBeLessThan(12);
      }
    }
  });
  test('no two icons are the same', () => {
    expect(new Set(Object.values(all)).size).toBe(Object.keys(all).length);
  });
});
