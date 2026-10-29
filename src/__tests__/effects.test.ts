import { itemById } from '../items';
import { describe, expect, test } from 'bun:test';
import { EFFECTS, FX_IDS, rollFx, applyFx } from '../effects';
import { roll, encode, decode, nameOf } from '../owned';
import { copyOneIn } from '../rarity';
import { collectorNotes } from '../collector';
import { animate } from '../animate';
import { toSvgString } from '../render-string';

describe('effects', () => {
  test('roll at their odds, far more often on an aura', () => {
    const count = (aura: boolean) => { let n = 0; for (let i = 0; i < 100000; i++) if (rollFx(i / 100000, aura)) n++; return n / 100000; };
    const expected = (aura: boolean) => FX_IDS.reduce((a, id) => a + 1 / EFFECTS[id][aura ? 'aura' : 'item'], 0);
    expect(count(false)).toBeCloseTo(expected(false), 3);
    expect(count(true)).toBeCloseTo(expected(true), 3);
    expect(count(true)).toBeGreaterThan(count(false) * 4);
    let fx = 0;
    // A showpiece always carries its own effect; the rolled ones are on everything else.
    for (let i = 0; i < 20000; i++) { const o = roll(`fx-${i}`, 'puttsies'); if (o.fx && o.fx !== itemById(o.item)?.signature) fx++; }
    expect(fx / 20000).toBeGreaterThan(expected(false) * 0.7);
    expect(fx / 20000).toBeLessThan(expected(false) * 1.4);
  });
  test('ride the code, the name, the odds and the notes', () => {
    const o = { item: 'puttsies.ball', finish: 'prism' as const, scuff: 0.02, print: 9, fx: 'holo' as const };
    expect(decode(encode(o))).toEqual(o);
    expect(nameOf(o)).toStartWith('Holo ');
    expect(copyOneIn(o)).toBeCloseTo(copyOneIn({ ...o, fx: undefined }) * EFFECTS.holo.item, 0);
    expect(collectorNotes(o).map(n => n.id)).toContain('effect');
  });
  test('move every frame on the copy, and show in a still', () => {
    for (const fx of FX_IDS) {
      const code = encode({ item: 'puttsies.ball', finish: 'plain', scuff: 0.3, print: 4, fx });
      const plain = encode({ item: 'puttsies.ball', finish: 'plain', scuff: 0.3, print: 4 });
      const a = animate('maya', 'idle', { equip: [code], rarity: false });
      expect(new Set(a.frames.map(f => JSON.stringify(f.colors))).size).toBeGreaterThan(2);
      if (fx !== 'embers' && fx !== 'pulse') expect(toSvgString('maya', { equip: [code], size: 128 })).not.toBe(toSvgString('maya', { equip: [plain], size: 128 }));
    }
  });
  test('embers rise into empty pixels above their copy only', () => {
    const colors = [[null, null], [null, null], ['#112233', '#445566']];
    const slots = [[0, 0], [0, 0], [2, 2]];
    const lit = [0, 120, 240, 360, 480].map(t => applyFx(colors, slots, [undefined, { fx: 'embers', print: 1 }], t));
    expect(lit.some(c => c[0][0] || c[0][1] || c[1][0] || c[1][1])).toBe(true);
  });
});
