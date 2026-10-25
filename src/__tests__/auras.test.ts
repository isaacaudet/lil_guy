import { describe, expect, test } from 'bun:test';
import { AURAS, AURA_ODDS, auraCells } from '../auras';
import { roll, encode, decode, gradeOf, nameOf, FINISHES, GRADES } from '../owned';
import { copyOneIn } from '../rarity';
import { animate } from '../animate';
import { toSvgString } from '../render-string';
import { compose } from '../compose';
import { dress } from '../items';
import { resolve } from '../resolve';

describe('auras', () => {
  test('about one capsule in a thousand is one, from any machine, graded above Grail', () => {
    let n = 0;
    const N = 60000;
    for (let i = 0; i < N; i++) {
      const o = roll(`capsule-${i}`, i % 2 ? 'puttsies' : 'amountle');
      if (o.item.startsWith('aura.')) {
        n++;
        expect(gradeOf(o).id).toBe('aura');
        expect(FINISHES[o.finish].aura).toBeGreaterThan(0);
      }
    }
    expect(n / N).toBeGreaterThan(AURA_ODDS * 0.6);
    expect(n / N).toBeLessThan(AURA_ODDS * 1.5);
    expect(GRADES[5].name).toBe('★ Aura');
  });

  test('finish shares add up to a hundred and only auras ever wear them', () => {
    const shares = Object.values(FINISHES).filter(f => f.aura).reduce((a, f) => a + f.aura!, 0);
    expect(Math.round(shares * 10) / 10).toBe(100);
    for (let i = 0; i < 20000; i++) {
      const o = roll(`plain-${i}`, 'stackdle');
      if (!o.item.startsWith('aura.')) expect(FINISHES[o.finish].aura).toBeUndefined();
    }
  });

  test('a copy keeps through encode and decode, and is named with a star', () => {
    const o = { item: 'aura.flames', finish: 'ruby' as const, scuff: 0.0123, print: 7 };
    expect(decode(encode(o))).toEqual(o);
    expect(nameOf(o)).toBe('★ Flames | Deep sea · Ruby');
    expect(nameOf({ ...o, finish: 'classic' })).toBe('★ Flames');
    expect(copyOneIn(o)).toBeGreaterThan(1000 * AURAS.length);
  });

  test('never covers the guy, in a still or in any frame', () => {
    for (const a of AURAS) {
      const code = encode({ item: a.id, finish: 'classic', scuff: 0, print: 3 });
      const bare = compose(resolve('maya')), worn = compose(dress(resolve('maya'), { equip: [code] }));
      bare.forEach((row, y) => row.forEach((t, x) => { if (t) expect(worn[y][x]).toBe(t); }));
      expect(worn.flat().some(t => t >= 60 && t < 70)).toBe(true);
      // Animated, it moves: its cells change from frame to frame.
      const lit = animate('maya', 'idle', { equip: [code] });
      const cells = lit.frames.map(f => f.slots.flatMap((row, y) => row.map((s, x) => (s === 5 ? `${x},${y}` : ''))).filter(Boolean).join(' '));
      expect(cells.some(Boolean)).toBe(true);
      expect(new Set(cells).size).toBeGreaterThan(1);
    }
  });

  test('a worn-out aura shows fewer cells than a mint one', () => {
    const mask = compose(resolve('maya')).map(r => r.map(Boolean));
    const count = (scuff: number) => [0, 200, 400, 600, 800].reduce((n, t) => n + auraCells('aura.galaxy', mask, t, { item: 'aura.galaxy', finish: 'classic', scuff, print: 1 }).length, 0);
    expect(count(0.95)).toBeLessThan(count(0.01) * 0.8);
  });

  test('draws into an SVG', () => {
    const svg = toSvgString('maya', { equip: [encode({ item: 'aura.halo', finish: 'classic', scuff: 0, print: 0 })], size: 128 });
    expect(svg).toContain('#FFD45C');
  });
});
