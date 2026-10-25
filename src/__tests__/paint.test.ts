import { describe, expect, test } from 'bun:test';
import { resolve } from '../resolve';
import { compose } from '../compose';
import { paint } from '../paint';
import { paletteOf, contrast } from '../palette';
import { T } from '../parts/art';
import { toSvgString } from '../render-string';

describe('eyes', () => {
  // A white catchlight on the edge of a dark eye, against a light face, melted
  // into the skin and left the eye an L. There it is a pale tint of the eye.
  test('a dark eye never has pure white between it and a light face', () => {
    let checked = 0;
    for (let n = 0; n < 300; n++) {
      const config = resolve(`guy${n}`), palette = paletteOf(config), grid = compose(config), colors = paint(grid, config, palette);
      if (contrast('#FFFFFF', palette.colors[T.EYE]!) < 3) continue;
      grid.forEach((row, y) => row.forEach((token, x) => {
        if (token !== T.WHITE) return;
        const near = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].map(([a, b]) => grid[b]?.[a] ?? 0);
        if (!near.includes(T.EYE)) return;
        const pale = near.some(t => t > 0 && t !== T.EYE && t !== T.WHITE && contrast('#FFFFFF', palette.colors[t] ?? '#000000') < 1.6);
        if (!pale) return;
        checked++;
        expect(colors[y][x]).not.toBe('#FFFFFF');
      }));
    }
    expect(checked).toBeGreaterThan(20);
  });
});

describe('small', () => {
  const fills = (svg: string) => [...svg.matchAll(/fill="(#[0-9A-F]+)"/gi)].map(m => m[1].toUpperCase());
  test('a guy drawn small has solid, darker eyes and keeps his body', () => {
    for (const name of ['alice', 'maya', 'okapi', 'bluejay', 'hazel']) {
      const big = fills(toSvgString(name, { size: 128, square: true })), small = fills(toSvgString(name, { size: 24, square: true }));
      expect(toSvgString(name, { size: 24, square: true, small: false })).not.toBe(toSvgString(name, { size: 24, square: true }));
      // The body colour is untouched, and nothing new but a darker ink appears.
      const config = resolve(name), palette = paletteOf(config);
      expect(small).toContain(palette.colors[T.BODY]!.toUpperCase());
      expect(new Set(small.filter(c => !big.includes(c))).size).toBeLessThanOrEqual(1);
    }
    // At 37px and up the full drawing stays.
    expect(toSvgString('alice', { size: 40 })).toBe(toSvgString('alice', { size: 40, small: false }));
  });
});
