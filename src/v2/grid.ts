import type { PixelGrid } from '../types';
import { GRID_SIZE } from '../types';
import { CELL, GRID_SIZE_V2 } from './types';

export function emptyGridV2(): PixelGrid {
  return Array.from({ length: GRID_SIZE_V2 }, () => new Array(GRID_SIZE_V2).fill(0));
}

/**
 * The v1 → v2 converter: every pixel becomes a 2x2 block of the same token.
 * No reinterpretation, which is what lets a v1 guy come through untouched.
 */
export function upscale2x(grid: PixelGrid): PixelGrid {
  const out = emptyGridV2();
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const token = grid[y]?.[x] ?? 0;
      if (!token) continue;
      out[y * CELL][x * CELL] = token;
      out[y * CELL][x * CELL + 1] = token;
      out[y * CELL + 1][x * CELL] = token;
      out[y * CELL + 1][x * CELL + 1] = token;
    }
  }
  return out;
}

/**
 * Which 16x16 cells a 32x32 grid touches. A cell holds the first non-zero
 * token found in its 2x2 block, so occupancy is exact and a doubled v1 part
 * comes back as the part it was.
 *
 * Placement is measured on this, never on raw pixels: that keeps every offset
 * a whole number of cells, so doubled v1 parts land exactly where v1 put them
 * and new parts drawn on the 2px rhythm stay on it.
 */
export function toCells(grid: PixelGrid): PixelGrid {
  const out: PixelGrid = Array.from({ length: GRID_SIZE }, () => new Array(GRID_SIZE).fill(0));
  for (let y = 0; y < GRID_SIZE_V2; y++) {
    for (let x = 0; x < GRID_SIZE_V2; x++) {
      const token = grid[y]?.[x];
      if (token && !out[y >> 1][x >> 1]) out[y >> 1][x >> 1] = token;
    }
  }
  return out;
}
