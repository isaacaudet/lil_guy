import { heads, eyes, mouths, hair, bodies, accessories } from './parts';
import type { AvatarConfig, PixelGrid } from './types';
import { GRID_SIZE } from './types';

/**
 * Creates an empty 16x16 grid of zeros (transparent).
 */
function emptyGrid(): PixelGrid {
  return Array.from({ length: GRID_SIZE }, () => new Array(GRID_SIZE).fill(0));
}

/**
 * Merges a source layer onto a target grid.
 * Non-zero pixels in the source overwrite the target.
 */
function mergeLayer(target: PixelGrid, source: PixelGrid): void {
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (source[y][x] !== 0) {
        target[y][x] = source[y][x];
      }
    }
  }
}

/**
 * Merges source pixels onto target only where target has the given mask token.
 * Used to apply body patterns only within the body silhouette.
 */
function maskMergeLayer(target: PixelGrid, source: PixelGrid, maskToken: number): void {
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (source[y][x] !== 0 && target[y][x] === maskToken) {
        target[y][x] = source[y][x];
      }
    }
  }
}

/**
 * Composes all part layers into a single 16x16 grid of color tokens.
 * Head first (base body shape), then body patterns masked onto body pixels,
 * then eyes, mouth, hair, accessories on top.
 */
export function compose(config: AvatarConfig): PixelGrid {
  const grid = emptyGrid();

  mergeLayer(grid, heads[config.head]);          // base body shape
  maskMergeLayer(grid, bodies[config.body], 1);  // patterns only ON the body
  mergeLayer(grid, eyes[config.eyes]);
  mergeLayer(grid, mouths[config.mouth]);
  mergeLayer(grid, hair[config.hair]);
  mergeLayer(grid, accessories[config.accessory]);

  return grid;
}
