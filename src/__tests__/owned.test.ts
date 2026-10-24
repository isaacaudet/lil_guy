import { describe, expect, it } from 'bun:test';
import { encode, decode, starter, roll, wearOf, gradeOf, nameOf, special, FINISHES, type Owned } from '../owned';
import { dress, freeItem, GAMES } from '../items';
import { resolve } from '../resolve';
import { compose } from '../compose';
import { toSvgString } from '../render-string';
import { T } from '../parts/art';

describe('owned copies', () => {
  it('round-trip through their string form', () => {
    const o: Owned = { item: 'puttsies.ball', finish: 'nebula', scuff: 0.0123456, print: 20, tally: 412 };
    expect(decode(encode(o))).toEqual(o);
    const plain: Owned = { item: 'trackdle.helmet', finish: 'plain', scuff: 0.9, print: 0 };
    expect(decode(encode(plain))).toEqual(plain);
  });

  it('refuse anything malformed', () => {
    for (const bad of ['', 'nope~plain~0.1~1', 'puttsies.ball~shiny~0.1~1', 'puttsies.ball~plain~1.5~1', 'puttsies.ball~plain~0.1~1000', 'puttsies.ball~plain~x~1']) {
      expect(decode(bad)).toBeNull();
    }
  });

  it('name the condition from the scuff', () => {
    expect([0.01, 0.1, 0.2, 0.4, 0.9].map(f => wearOf(f).short)).toEqual(['MIB', 'LN', 'PW', 'WL', 'BT']);
    expect(wearOf(1).short).toBe('BT');
  });

  it('lift famous prints a grade, and name them', () => {
    const t = (print: number): Owned => ({ item: 'stackdle.block', finish: 'tempered', scuff: 0.1, print });
    expect(special(t(661))).toBe('Deep Blue');
    expect(gradeOf(t(661)).name).toBe('Mythic');
    expect(gradeOf(t(117)).name).toBe('Prized');
    expect(nameOf({ item: 'puttsies.ball', finish: 'nebula', scuff: 0.01, print: 20, tally: 0 }))
      .toBe('Tallied Golf ball | Red Giant');
    expect(nameOf({ item: 'stackdle.block', finish: 'tempered', scuff: 0.1, print: 661 })).toBe('Toy block | Deep Blue');
  });
});

describe('the free starter', () => {
  it("is every player's, and is the game's free hat, plain", () => {
    for (const game of GAMES) {
      const s = starter('alice', game);
      expect(s.item).toBe(freeItem(game).id);
      expect(s.finish).toBe('plain');
    }
  });

  it('is the same for the same name, and differs between names', () => {
    expect(starter('alice', 'puttsies')).toEqual(starter('alice', 'puttsies'));
    const floats = new Set(['alice', 'bob', 'charlie', 'dana', 'elena'].map(n => starter(n, 'puttsies').scuff));
    expect(floats.size).toBe(5);
  });
});

describe('capsules', () => {
  it("always give one of the game's own items, never the free hat", () => {
    for (const game of GAMES) {
      for (let i = 0; i < 200; i++) {
        const o = roll(`seed-${i}`, game);
        expect(o.item.startsWith(game + '.')).toBe(true);
        expect(o.item).not.toBe(freeItem(game).id);
        const [lo, hi] = FINISHES[o.finish].scuffs;
        expect(o.scuff >= lo && o.scuff <= hi).toBe(true);
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
    const a = toSvgString('kai', { equip: ['trackdle.helmet~sunset~0.0100000~412'] });
    expect(a).toBe(toSvgString('kai', { equip: ['trackdle.helmet~sunset~0.0100000~412'] }));
    expect(a).not.toBe(toSvgString('kai', { equip: ['trackdle.helmet~sunset~0.0100000~413'] }));
    expect(a).not.toBe(toSvgString('kai', { equip: ['trackdle.helmet~plain~0.0100000~412'] }));
  });

  it('wears more as the scuff rises', () => {
    const fresh = toSvgString('kai', { equip: ['trackdle.helmet~plain~0.0100000~5'] });
    const worn = toSvgString('kai', { equip: ['trackdle.helmet~plain~0.9000000~5'] });
    expect(fresh).not.toBe(worn);
  });

  it('gives a player their own starter when dressed for a game by name', () => {
    expect(toSvgString('alice', { game: 'puttsies' })).not.toBe(toSvgString('bob', { game: 'puttsies', parts: resolve('alice') }));
    const d = dress(resolve('alice'), { game: 'puttsies' }, 'alice');
    expect(d.owned?.hat).toEqual(starter('alice', 'puttsies'));
  });

  it('sparkles for a Gold finish', () => {
    const plain = compose(dress(resolve('max'), { equip: ['puttsies.ball~plain~0.0100000~1'] }));
    const gold = compose(dress(resolve('max'), { equip: ['puttsies.ball~gold~0.0100000~1'] }));
    expect(plain.flat().filter(v => v === T.GOLD).length).toBeLessThan(gold.flat().filter(v => v === T.GOLD).length);
  });
});

describe('rarity', () => {
  const { guyOneIn, copyOneIn } = require('../rarity');
  it('makes a famous print and a low scuff rarer', () => {
    const base = { item: 'puttsies.ball', finish: 'nebula' as const, scuff: 0.05, print: 7 };
    expect(copyOneIn({ ...base, print: 20 })).toBeGreaterThan(copyOneIn(base));
    expect(copyOneIn({ ...base, scuff: 0.001 })).toBeGreaterThan(copyOneIn(base));
    expect(copyOneIn({ ...base, tally: 0 })).toBeCloseTo(copyOneIn(base) * 10, 5);
  });

  it('rates a guy with rare traits rarer than a common one', () => {
    const plain = resolve('x', { eyes: 1, mouth: 0, hair: 0, cheeks: 0, accessory: 0, body: 0 });
    const loud = resolve('x', { eyes: 17, mouth: 0, hair: 11, cheeks: 0, accessory: 0, body: 0 });
    expect(guyOneIn(loud)).toBeGreaterThan(guyOneIn(plain));
  });
});
