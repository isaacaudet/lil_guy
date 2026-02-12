import { describe, expect, it } from 'bun:test';
import { compose } from '../compose';
import { heads, bodies } from '../parts';
import { GRID_SIZE } from '../types';

describe('compose', () => {
  it('returns a 16x16 grid', () => {
    const grid = compose({ head: 0, eyes: 0, mouth: 0, hair: 0, body: 0, accessory: 0, palette: 0, rotation: 0 });
    expect(grid.length).toBe(GRID_SIZE);
    for (const row of grid) {
      expect(row.length).toBe(GRID_SIZE);
    }
  });

  it('contains only valid token values (0-8)', () => {
    const grid = compose({ head: 0, eyes: 0, mouth: 0, hair: 0, body: 0, accessory: 0, palette: 0, rotation: 0 });
    for (const row of grid) {
      for (const cell of row) {
        expect(cell).toBeGreaterThanOrEqual(0);
        expect(cell).toBeLessThanOrEqual(8);
      }
    }
  });

  it('has non-transparent pixels (character is visible)', () => {
    const grid = compose({ head: 0, eyes: 0, mouth: 0, hair: 1, body: 0, accessory: 0, palette: 0, rotation: 0 });
    const nonZero = grid.flat().filter(v => v !== 0).length;
    // Should have a reasonable number of filled pixels
    expect(nonZero).toBeGreaterThan(30);
  });

  it('upper layers overwrite lower layers', () => {
    // Hair (layer 5) should overwrite head (layer 2) where they overlap
    const withHair = compose({ head: 0, eyes: 0, mouth: 0, hair: 1, body: 0, accessory: 0, palette: 0, rotation: 0 });
    const withoutHair = compose({ head: 0, eyes: 0, mouth: 0, hair: 0, body: 0, accessory: 0, palette: 0, rotation: 0 });
    // hair[0] is "none" (empty), hair[1] is "antenna" (has pixels)
    // They should produce different grids
    expect(withHair).not.toEqual(withoutHair);
  });

  it('body patterns only appear within body silhouette (masked merge)', () => {
    // Use striped body (index 1) which has pattern pixels
    const grid = compose({ head: 0, eyes: 0, mouth: 0, hair: 0, body: 1, accessory: 0, palette: 0, rotation: 0 });
    const headGrid = heads[0];

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (grid[y][x] === 3) {
          // Pattern token 3 should only appear where the head had token 1
          expect(headGrid[y][x]).toBe(1);
        }
      }
    }
  });

  it('all heads have visual center mass between rows 5-10', () => {
    for (let h = 0; h < heads.length; h++) {
      const head = heads[h];
      let totalY = 0;
      let count = 0;
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          if (head[y][x] !== 0) {
            totalY += y;
            count++;
          }
        }
      }
      const centerY = totalY / count;
      expect(centerY).toBeGreaterThanOrEqual(5);
      expect(centerY).toBeLessThanOrEqual(10);
    }
  });
});
