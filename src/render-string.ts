import { resolve } from './resolve';
import { compose } from './compose';
import { getPalette, resolveColor } from './palette';
import type { ColorToken, Palette, RenderOptions } from './types';
import { GRID_SIZE } from './types';

/**
 * Generates a complete SVG string for a lil_guy avatar.
 * Works anywhere — no React or DOM required.
 */
export function toSvgString(input: string, options: RenderOptions = {}): string {
  const config = resolve(input, options.parts);
  const palette = options.palette ?? getPalette(config.palette);
  const grid = compose(config);
  const size = options.size ?? 128;
  const pixelSize = size / GRID_SIZE;

  const rects: string[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const token = grid[y][x] as ColorToken;
      const color = resolveColor(palette, token);
      if (color) {
        rects.push(
          `<rect x="${x * pixelSize}" y="${y * pixelSize}" width="${pixelSize}" height="${pixelSize}" fill="${color}"/>`
        );
      }
    }
  }

  const round = options.square ? '' : `<clipPath id="clip"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></clipPath>`;
  const groupOpen = options.square ? '<g>' : '<g clip-path="url(#clip)">';

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">`,
    round ? `<defs>${round}</defs>` : '',
    groupOpen,
    ...rects,
    '</g>',
    '</svg>',
  ].join('');
}
