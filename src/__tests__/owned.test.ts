import { describe, expect, it } from 'bun:test';
import { encode, decode, starter, roll, wearOf, gradeOf, nameOf, special, FINISHES, type Owned } from '../owned';
import { dress, freeItem, GAMES } from '../items';
import { resolve } from '../resolve';
import { compose } from '../compose';
import { toSvgString } from '../render-string';
import { T } from '../parts/art';

describe('owned copies', () => {
  it('round-trip through their string form', () => {
    const o: Owned = { item: 'puttsies.ball', finish: 'doppler', float: 0.0123456, pattern: 20, stattrak: 412 };
    expect(decode(encode(o))).toEqual(o);
    const plain: Owned = { item: 'trackdle.helmet', finish: 'stock', float: 0.9, pattern: 0 };
    expect(decode(encode(plain))).toEqual(plain);
  });

  it('refuse anything malformed', () => {
    for (const bad of ['', 'nope~stock~0.1~1', 'puttsies.ball~shiny~0.1~1', 'puttsies.ball~stock~1.5~1', 'puttsies.ball~stock~0.1~1000', 'puttsies.ball~stock~x~1']) {
      expect(decode(bad)).toBeNull();
    }
  });

  it('name the wear tier from the float', () => {
    expect([0.01, 0.1, 0.2, 0.4, 0.9].map(f => wearOf(f).short)).toEqual(['FN', 'MW', 'FT', 'WW', 'BS']);
    expect(wearOf(1).short).toBe('BS');
  });

  it('lift famous patterns a grade, and name them', () => {
    const ch = (pattern: number): Owned => ({ item: 'stackdle.block', finish: 'case-hardened', float: 0.1, pattern });
    expect(special(ch(661))).toBe('Blue Gem');
    expect(gradeOf(ch(661)).name).toBe('Covert');
    expect(gradeOf(ch(117)).name).toBe('Classified');
    expect(nameOf({ item: 'puttsies.ball', finish: 'doppler', float: 0.01, pattern: 20, stattrak: 0 }))
      .toBe('StatTrak™ Golf ball | Doppler (Ruby)');
  });
});

describe('the free starter', () => {
  it("is every player's, and is the game's free hat in stock", () => {
    for (const game of GAMES) {
      const s = starter('alice', game);
      expect(s.item).toBe(freeItem(game).id);
      expect(s.finish).toBe('stock');
    }
  });

  it('is the same for the same name, and differs between names', () => {
    expect(starter('alice', 'puttsies')).toEqual(starter('alice', 'puttsies'));
    const floats = new Set(['alice', 'bob', 'charlie', 'dana', 'elena'].map(n => starter(n, 'puttsies').float));
    expect(floats.size).toBe(5);
  });
});

describe('case rolls', () => {
  it("always give one of the game's own items, never the free hat", () => {
    for (const game of GAMES) {
      for (let i = 0; i < 200; i++) {
        const o = roll(`seed-${i}`, game);
        expect(o.item.startsWith(game + '.')).toBe(true);
        expect(o.item).not.toBe(freeItem(game).id);
        const [lo, hi] = FINISHES[o.finish].floats;
        expect(o.float >= lo && o.float <= hi).toBe(true);
      }
    }
  });

  it('are the same for the same seed', () => {
    expect(roll('abc', 'trackdle')).toEqual(roll('abc', 'trackdle'));
  });

  it('come out close to the published odds', () => {
    const n = 40000;
    const counts: Record<string, number> = {};
    for (let i = 0; i < n; i++) {
      const f = roll(`odds-${i}`, 'puttsies').finish;
      counts[f] = (counts[f] ?? 0) + 1;
    }
    for (const [id, f] of Object.entries(FINISHES)) {
      expect(Math.abs((counts[id] ?? 0) / n * 100 - f.odds)).toBeLessThan(Math.max(0.6, f.odds * 0.1));
    }
  });
});

describe('drawing owned copies', () => {
  it('shows a copy the same every time, and differently from another copy', () => {
    const a = toSvgString('kai', { equip: ['trackdle.helmet~fade~0.0100000~412'] });
    expect(a).toBe(toSvgString('kai', { equip: ['trackdle.helmet~fade~0.0100000~412'] }));
    expect(a).not.toBe(toSvgString('kai', { equip: ['trackdle.helmet~fade~0.0100000~413'] }));
    expect(a).not.toBe(toSvgString('kai', { equip: ['trackdle.helmet~stock~0.0100000~412'] }));
  });

  it('wears more as the float rises', () => {
    const fresh = toSvgString('kai', { equip: ['trackdle.helmet~stock~0.0100000~5'] });
    const worn = toSvgString('kai', { equip: ['trackdle.helmet~stock~0.9000000~5'] });
    expect(fresh).not.toBe(worn);
  });

  it('gives a player their own starter when dressed for a game by name', () => {
    expect(toSvgString('alice', { game: 'puttsies' })).not.toBe(toSvgString('bob', { game: 'puttsies', parts: resolve('alice') }));
    const d = dress(resolve('alice'), { game: 'puttsies' }, 'alice');
    expect(d.owned?.hat).toEqual(starter('alice', 'puttsies'));
  });

  it('sparkles for a Gold finish', () => {
    const plain = compose(dress(resolve('max'), { equip: ['puttsies.ball~stock~0.0100000~1'] }));
    const gold = compose(dress(resolve('max'), { equip: ['puttsies.ball~gold~0.0100000~1'] }));
    expect(plain.flat().filter(v => v === T.GOLD).length).toBeLessThan(gold.flat().filter(v => v === T.GOLD).length);
  });
});

describe('rarity', () => {
  const { guyOneIn, copyOneIn } = require('../rarity');
  it('makes a famous pattern and a low float rarer', () => {
    const base = { item: 'puttsies.ball', finish: 'doppler' as const, float: 0.05, pattern: 7 };
    expect(copyOneIn({ ...base, pattern: 20 })).toBeGreaterThan(copyOneIn(base));
    expect(copyOneIn({ ...base, float: 0.001 })).toBeGreaterThan(copyOneIn(base));
    expect(copyOneIn({ ...base, stattrak: 0 })).toBeCloseTo(copyOneIn(base) * 10, 5);
  });

  it('rates a guy with rare traits rarer than a common one', () => {
    const plain = resolve('x', { eyes: 1, mouth: 0, hair: 0, cheeks: 0, accessory: 0, body: 0 });
    const loud = resolve('x', { eyes: 17, mouth: 0, hair: 11, cheeks: 0, accessory: 0, body: 0 });
    expect(guyOneIn(loud)).toBeGreaterThan(guyOneIn(plain));
  });
});
