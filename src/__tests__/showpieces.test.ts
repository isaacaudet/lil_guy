import { describe, expect, test } from 'bun:test';
import { GAMES, gameItems, itemById, SHOWPIECE_WEIGHT } from '../items';
import { roll, nameOf } from '../owned';
import { copyOneIn } from '../rarity';
import { EFFECTS } from '../effects';

describe('showpieces', () => {
  test('every machine has one, a skin with its own effect', () => {
    for (const g of GAMES) {
      const sp = gameItems(g).filter(i => i.showpiece);
      expect(sp.length).toBe(1);
      expect(sp[0].slot).toBe('skin');
      expect(EFFECTS[sp[0].signature!]).toBeDefined();
    }
  });

  test('come out at their weight, always with their effect', () => {
    const n = 40000, pool = gameItems('trackdle').filter(i => !i.free);
    const want = SHOWPIECE_WEIGHT / (pool.length - 1 + SHOWPIECE_WEIGHT);
    let got = 0;
    for (let i = 0; i < n; i++) {
      const o = roll(`sp-${i}`, 'trackdle');
      const it = itemById(o.item)!;
      if (!it.showpiece) continue;
      got++;
      expect(o.fx).toBeDefined();
    }
    // Auras come off the top of every machine.
    expect(got / n).toBeGreaterThan(want * 0.9 * 0.999);
    expect(got / n).toBeLessThan(want * 1.1);
  });

  test('their own effect is neither in the name nor the odds', () => {
    const o = { item: 'trackdle.rocket', finish: 'plain' as const, scuff: 0.2, print: 7, fx: 'embers' as const };
    expect(nameOf(o)).toBe('Rocket');
    expect(copyOneIn(o)).toBeCloseTo(copyOneIn({ ...o, fx: undefined }), 6);
    expect(nameOf({ ...o, fx: 'holo' })).toBe('Holo Rocket');
    expect(copyOneIn({ ...o, fx: 'holo' })).toBeGreaterThan(copyOneIn(o) * 100);
  });
});
