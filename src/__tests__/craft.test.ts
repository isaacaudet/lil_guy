import { describe, expect, test } from 'bun:test';
import { smeltValue, craftable, craftCopy, metalText, metalCoins, CRAFT_COST } from '../craft';
import { painted, PAINTS, PAINT_IDS } from '../paints';
import { encode, decode, nameOf } from '../owned';
import { itemById, dress, withItems } from '../items';
import { collectorNotes } from '../collector';
import { resolve } from '../resolve';
import { paletteOf } from '../palette';

describe('crafting', () => {
  test('metal reads like TF2’s', () => {
    expect(metalText(0)).toBe('0.00 ref');
    expect(metalText(1)).toBe('0.11 ref');
    expect(metalText(3)).toBe('0.33 ref');
    expect(metalText(CRAFT_COST + 4)).toBe('1.44 ref');
    expect(metalCoins(22)).toEqual({ refined: 2, reclaimed: 1, scrap: 1 });
  });
  test('smelts spare copies by grade, never a starter, a showpiece, a Grail or an aura', () => {
    expect(smeltValue({ item: 'puttsies.flag', finish: 'plain', scuff: 0.3, print: 1 })).toBe(1);
    expect(smeltValue({ item: 'puttsies.flag', finish: 'sunset', scuff: 0.03, print: 1 })).toBe(2);
    expect(smeltValue({ item: 'puttsies.flag', finish: 'gold', scuff: 0.03, print: 1 })).toBe(0);
    expect(smeltValue({ item: 'trackdle.rocket', finish: 'plain', scuff: 0.3, print: 1 })).toBe(0);
    expect(smeltValue({ item: 'puttsies.visor', finish: 'plain', scuff: 0.3, print: 1 })).toBe(0);
    expect(craftable(itemById('trackdle.rocket'))).toBe(false);
    expect(craftable(itemById('puttsies.flag'))).toBe(true);
  });
  test('a crafted copy is Plain, carries its number in its code and notes', () => {
    const o = craftCopy('puttsies.flag', 'seed-1', 7);
    expect(o.finish).toBe('plain');
    expect(decode(encode(o))).toEqual(o);
    expect(collectorNotes(o).map(n => n.id)).toContain('craft');
  });
});

describe('paint', () => {
  test('rides the code and tints only the painted slot', () => {
    const o = { item: 'puttsies.flag', finish: 'plain' as const, scuff: 0.2, print: 3, paint: 'pink-as-heck' as const };
    expect(decode(encode(o))).toEqual(o);
    expect(nameOf(o)).toBe(nameOf({ ...o, paint: undefined }));
    const guy = resolve('alice');
    const plain = withItems(paletteOf(guy), dress(guy, { equip: [encode({ ...o, paint: undefined })] }));
    const pink = withItems(paletteOf(guy), dress(guy, { equip: [encode(o)] }));
    expect(pink.colors).not.toEqual(plain.colors);
  });
  test('keeps an item’s light and shade, in the paint’s colour', () => {
    const cols = ['#4080C0', '#80B0E0', '#204060'];
    for (const p of PAINT_IDS) {
      const out = painted(cols, p);
      expect(out[0]).toBe(PAINTS[p].hex.toUpperCase());
      const l = (h: string) => parseInt(h.slice(1, 3), 16) + parseInt(h.slice(3, 5), 16) + parseInt(h.slice(5, 7), 16);
      expect(l(out[1])).toBeGreaterThanOrEqual(l(out[0]));
      expect(l(out[2])).toBeLessThanOrEqual(l(out[0]));
    }
  });
});
