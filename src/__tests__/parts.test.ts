import { describe, expect, it } from 'bun:test';
import { heads, eyes, mouths, hair, bodies, accessories, headMetrics } from '../parts';
import { hairPlacements } from '../parts/hair';
import { accessoryPlacements } from '../parts/accessories';
import { palettes, shadePalette, SHADE_COUNT } from '../palette';
import {
  headWeights, eyeWeights, mouthWeights, hairWeights,
  bodyWeights, accessoryWeights, paletteWeights, weightedPick,
} from '../parts/weights';
import type { PartPlacement, PixelGrid } from '../types';
import { GRID_SIZE } from '../types';

const LIBRARY: [string, PixelGrid[]][] = [
  ['heads', heads],
  ['eyes', eyes],
  ['mouths', mouths],
  ['hair', hair],
  ['bodies', bodies],
  ['accessories', accessories],
];

describe('part integrity', () => {
  // Compose reads part grids by index. A row that is short yields `undefined`,
  // which used to be written straight into the output as an invisible hole
  // rather than raising anything — so the shape of the data is checked here,
  // where a mistake is a one-line failure instead of a silent art regression.
  it('every part is exactly 16 rows of 16 cells', () => {
    const wrong: string[] = [];
    for (const [name, grids] of LIBRARY) {
      grids.forEach((grid, i) => {
        if (grid.length !== GRID_SIZE) wrong.push(`${name}[${i}] has ${grid.length} rows`);
        grid.forEach((row, y) => {
          if (row.length !== GRID_SIZE) wrong.push(`${name}[${i}] row ${y} has ${row.length} cells`);
        });
      });
    }
    expect(wrong).toEqual([]);
  });

  it('every cell is a defined token in 0-8', () => {
    const wrong: string[] = [];
    for (const [name, grids] of LIBRARY) {
      grids.forEach((grid, i) => {
        grid.forEach((row, y) => {
          row.forEach((cell, x) => {
            if (!Number.isInteger(cell) || cell < 0 || cell > 8) {
              wrong.push(`${name}[${i}] (${x},${y}) = ${cell}`);
            }
          });
        });
      });
    }
    expect(wrong).toEqual([]);
  });

  it('every palette defines all eight colour tokens', () => {
    const wrong: string[] = [];
    palettes.forEach(p => {
      for (let token = 1; token <= 8; token++) {
        const hex = p.colors[token as 1];
        if (!/^#[0-9A-Fa-f]{6}$/.test(hex ?? '')) wrong.push(`${p.name} token ${token} = ${hex}`);
      }
    });
    expect(wrong).toEqual([]);
  });

  it('keeps every token clear of the body colour it is drawn on', () => {
    // Floors restated here rather than imported: the point is to pin the
    // contract independently. Several palettes were authored with a mouth
    // within 1.01:1 of the body — invisible — and a hat drawn in the pattern
    // colour disappeared the same way, leaving only its brim.
    const FLOOR: Record<number, number> = { 2: 1.65, 3: 1.65, 4: 1.65, 5: 2.35, 8: 2.55 };

    const luminance = (hex: string) => {
      const channel = (i: number) => {
        const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
    };
    const contrast = (a: string, b: string) => {
      const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (light + 0.05) / (dark + 0.05);
    };

    const failures: string[] = [];
    for (let shade = 0; shade < SHADE_COUNT; shade++) {
      for (const source of palettes) {
        const p = shadePalette(source, shade);
        for (const [token, floor] of Object.entries(FLOOR)) {
          const ratio = contrast(p.colors[Number(token) as 2], p.colors[1]);
          if (ratio < floor) {
            failures.push(`${p.name} shade ${shade} token ${token}: ${ratio.toFixed(2)} < ${floor}`);
          }
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it('palette names are unique', () => {
    const names = palettes.map(p => p.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('placement tables', () => {
  // These are index-aligned with their parts array by convention only. A part
  // added without a placement resolves to `undefined`, which falls through the
  // switch in compose to the unclipped default — the part then floats, with no
  // error anywhere.
  const tables: [string, PixelGrid[], PartPlacement[]][] = [
    ['hair', hair, hairPlacements],
    ['accessories', accessories, accessoryPlacements],
  ];

  for (const [name, parts, placements] of tables) {
    it(`${name} has one placement per part`, () => {
      expect(placements.length).toBe(parts.length);
    });

    it(`${name} placements are all recognised`, () => {
      const valid = new Set(['field', 'face', 'top', 'lower', 'edge', 'float']);
      const wrong = placements
        .map((p, i) => (valid.has(p) ? null : `${name}[${i}] = ${p}`))
        .filter(Boolean);
      expect(wrong).toEqual([]);
    });
  }
});

describe('weight tables', () => {
  const tables: [string, unknown[], number[]][] = [
    ['heads', heads, headWeights],
    ['eyes', eyes, eyeWeights],
    ['mouths', mouths, mouthWeights],
    ['hair', hair, hairWeights],
    ['bodies', bodies, bodyWeights],
    ['accessories', accessories, accessoryWeights],
    ['palettes', palettes, paletteWeights],
  ];

  // A weight table shorter than its parts array silently makes the tail
  // unreachable — those parts would never be rolled by any input.
  for (const [name, parts, weights] of tables) {
    it(`${name} has one weight per part`, () => {
      expect(weights.length).toBe(parts.length);
    });

    it(`${name} weights are all positive, so every part is reachable`, () => {
      expect(weights.filter(w => !Number.isInteger(w) || w < 1)).toEqual([]);
    });

    it(`${name} can actually produce every index`, () => {
      const seen = new Set<number>();
      const total = weights.reduce((a, b) => a + b, 0);
      for (let h = 0; h < total; h++) seen.add(weightedPick(weights, h));
      expect(seen.size).toBe(parts.length);
    });
  }
});

describe('head geometry', () => {
  // Every head has to be able to carry a face. The widest eyes reach columns
  // 4-11 and the widest mouth columns 5-10; if the silhouette is narrower than
  // that on those rows the face gets clipped and the character looks broken.
  it('leaves room for the widest eyes and mouth on every head', () => {
    const wrong: string[] = [];
    heads.forEach((head, i) => {
      const dy = Math.round(
        (headMetrics[i].top + headMetrics[i].bottom - (headMetrics[0].top + headMetrics[0].bottom)) / 2
      );
      for (const y of [4, 5, 6]) {
        for (let x = 4; x <= 11; x++) {
          if (!head[y + dy]?.[x]) wrong.push(`heads[${i}] eye row ${y + dy} col ${x}`);
        }
      }
      for (const y of [9, 10]) {
        for (let x = 5; x <= 10; x++) {
          if (!head[y + dy]?.[x]) wrong.push(`heads[${i}] mouth row ${y + dy} col ${x}`);
        }
      }
    });
    expect(wrong).toEqual([]);
  });

  it('keeps every head clear of the grid border', () => {
    const wrong: string[] = [];
    heads.forEach((head, i) => {
      head.forEach((row, y) => {
        if (row[0] || row[GRID_SIZE - 1]) wrong.push(`heads[${i}] row ${y} touches a side`);
      });
      if (head[0].some(Boolean)) wrong.push(`heads[${i}] touches the top`);
      if (head[GRID_SIZE - 1].some(Boolean)) wrong.push(`heads[${i}] touches the bottom`);
    });
    expect(wrong).toEqual([]);
  });
});
