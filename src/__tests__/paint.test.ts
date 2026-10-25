import { describe, expect, test } from 'bun:test';
import { resolve } from '../resolve';
import { compose } from '../compose';
import { paint } from '../paint';
import { paletteOf, contrast } from '../palette';
import { T } from '../parts/art';

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
