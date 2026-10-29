import { describe, expect, test } from 'bun:test';
import { cleanTag, TAG_MAX, tradeFloat, tradeGames, machineSet, setProgress, floatShare } from '../collect';
import { GAMES } from '../items';

describe('name tags', () => {
  test('tidies spaces and keeps what fits', () => {
    expect(cleanTag('  Lucky   Visor ')).toBe('Lucky Visor');
    expect(cleanTag('')).toBe('');
    expect(cleanTag('x'.repeat(TAG_MAX))).toBe('x'.repeat(TAG_MAX));
  });
  test('refuses what is too long, odd characters and blocked words, however spaced', () => {
    expect(cleanTag('x'.repeat(TAG_MAX + 1))).toBeNull();
    expect(cleanTag('<b>hi</b>')).toBeNull();
    expect(cleanTag('sh it')).toBeNull();
  });
});

describe('trade ups', () => {
  test('the float is the inputs’ average place in their finishes, placed in the result’s', () => {
    const five = [0.01, 0.02, 0.03, 0.04, 0.0].map(s => ({ finish: 'sunset' as const, scuff: s }));
    // Sunset rolls 0 to 0.08, so these sit at a quarter of the way on average.
    expect(floatShare(five[0])).toBeCloseTo(0.125);
    expect(tradeFloat(five, 'plain')).toBeCloseTo(0.25, 6);
    expect(tradeFloat(five, 'prism')).toBeCloseTo(0.02, 6);
    expect(tradeFloat([{ finish: 'plain', scuff: 0 }], 'gold')).toBe(0);
  });
  test('each game’s chance is its share of the inputs', () => {
    const a = machineSet('puttsies')[0].id, b = machineSet('amountle')[0].id;
    const share = tradeGames([a, a, a, b, b].map(item => ({ item, finish: 'plain' as const, scuff: 0.5, print: 1 })));
    expect(share.puttsies).toBeCloseTo(0.6);
    expect(share.amountle).toBeCloseTo(0.4);
  });
});

describe('sets', () => {
  test('every machine has a set, with no starters or auras', () => {
    for (const g of GAMES) {
      const set = machineSet(g);
      expect(set.length).toBeGreaterThan(5);
      expect(set.every(i => !i.free && i.slot !== 'aura')).toBe(true);
    }
  });
  test('progress counts items owned in any finish, and completes with all of them', () => {
    const set = machineSet('stackdle');
    const own = set.map(i => ({ item: i.id, finish: 'plain' as const, scuff: 0.3, print: 1 }));
    expect(setProgress('stackdle', own.slice(1)).complete).toBe(false);
    expect(setProgress('stackdle', [...own, own[0]]).got).toBe(set.length);
    expect(setProgress('stackdle', own).complete).toBe(true);
  });
});
