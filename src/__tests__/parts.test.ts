import { describe, expect, it } from 'bun:test';
import { heads, eyes, mouths, cheeks, hair, bodies, accessories } from '../parts';
import { stamp } from '../parts/art';
import { ARM_STYLES, FOOT_STYLES } from '../compose';
import { palettes, shadePalette, SHADE_COUNT } from '../palette';
import {
  headWeights, eyeWeights, mouthWeights, cheekWeights, hairWeights, bodyWeights,
  accessoryWeights, armWeights, footWeights, shadeWeights, paletteWeights, weightedPick,
} from '../parts/weights';
import { GRID_SIZE } from '../types';

describe('heads', () => {
  it('are symmetric about the centre seam', () => {
    // A single-pixel tip (the slime's curl) is allowed to lean.
    for (const head of heads) {
      for (const row of head.art) {
        if (row.filter(Boolean).length > 1) expect(row).toEqual([...row].reverse());
      }
    }
  });

  it('leave the border free for the outline', () => {
    for (const head of heads) {
      head.art.forEach((row, y) => row.forEach((v, x) => {
        if (!v) return;
        expect(x > 0 && x < GRID_SIZE - 1 && y > 0 && y < GRID_SIZE - 1).toBe(true);
      }));
    }
  });

  it('leave room below for feet, unless they float', () => {
    for (const head of heads.filter(h => h.feet)) {
      expect(head.art[14].every(v => !v)).toBe(true);
    }
  });

  it('are wide enough for every face', () => {
    // Eyes and cheeks span columns 3–12; tall eyes reach one row higher,
    // where they need 4–11; the lower rows of a big mouth need 5–10.
    for (const head of heads) {
      for (let y = head.eyes - 2; y <= head.eyes + 3; y++) {
        const [from, to] = y === head.eyes - 2 ? [4, 11] : y > head.eyes + 1 ? [5, 10] : [3, 12];
        for (let x = from; x <= to; x++) {
          if (!head.art[y][x]) throw new Error(`${head.name} is too narrow at row ${y}`);
        }
      }
    }
  });
});

describe('art', () => {
  it('rejects a character it does not know', () => {
    expect(() => stamp(['#?#'])).toThrow();
  });

  it('gives every part a unique name within its kind', () => {
    for (const list of [heads, eyes, mouths, cheeks, hair, bodies, accessories]) {
      const names = list.map(p => p.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });
});

describe('palettes', () => {
  const luminance = (hex: string) => {
    const channel = (i: number) => {
      const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
  };
  const contrast = (a: string, b: string) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  const toned = palettes.flatMap(p =>
    Array.from({ length: SHADE_COUNT }, (_, shade) => ({ shade, p: shadePalette(p, shade) })));

  it('define every token as a hex colour, in every tone', () => {
    for (const { p } of toned) {
      for (let token = 1; token <= 18; token++) {
        expect(p.colors[token as 1]).toMatch(/^#[0-9A-F]{6}$/);
      }
    }
  });

  it('keep the face and outline legible on the body, in every tone', () => {
    const wrong: string[] = [];
    for (const { p, shade } of toned) {
      const body = p.colors[1];
      const check = (token: number, floor: number, what: string) => {
        const ratio = contrast(p.colors[token as 1], body);
        if (ratio < floor) wrong.push(`${p.name}/${shade} ${what} ${ratio.toFixed(2)}`);
      };
      check(5, 3.8, 'eyes');
      check(8, 3.8, 'mouth');
      // The outline's job is the edge against the page; on the darkest bodies it
      // only has to stay distinct from the body.
      check(4, 1.7, 'outline');
      check(7, 1.25, 'blush');
    }
    expect(wrong).toEqual([]);
  });

  it('have unique names', () => {
    expect(new Set(palettes.map(p => p.name)).size).toBe(palettes.length);
  });
});

describe('weights', () => {
  const TABLES: [string, number[], number][] = [
    ['heads', headWeights, heads.length],
    ['eyes', eyeWeights, eyes.length],
    ['mouths', mouthWeights, mouths.length],
    ['cheeks', cheekWeights, cheeks.length],
    ['hair', hairWeights, hair.length],
    ['bodies', bodyWeights, bodies.length],
    ['accessories', accessoryWeights, accessories.length],
    ['arms', armWeights, ARM_STYLES.length],
    ['feet', footWeights, FOOT_STYLES.length],
    ['shades', shadeWeights, SHADE_COUNT],
    ['palettes', paletteWeights, palettes.length],
  ];

  for (const [name, weights, count] of TABLES) {
    // A weight of 0 retires a part from new deals; it stays in its list, so
    // saved looks and older guys that point at it still draw.
    it(`${name} has one whole, non-negative weight per part`, () => {
      expect(weights.length).toBe(count);
      for (const w of weights) {
        expect(Number.isInteger(w)).toBe(true);
        expect(w).toBeGreaterThanOrEqual(0);
      }
      expect(weights.filter(w => w === 0).length).toBeLessThan(count / 4);
    });

    it(`${name} can produce every index it weights`, () => {
      const total = weights.reduce((a, b) => a + b, 0);
      const seen = new Set<number>();
      for (let h = 0; h < total; h++) seen.add(weightedPick(weights, h));
      expect([...seen].sort((a, b) => a - b)).toEqual(weights.map((w, i) => i).filter(i => weights[i] > 0));
    });
  }
});
