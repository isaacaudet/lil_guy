import { resolve } from './resolve';
import { compose } from './compose';
import { getPalette, resolveColor, shadePalette } from './palette';
import type { ColorToken, Palette, PixelGrid, RenderOptions } from './types';
import { GRID_SIZE } from './types';

/**
 * Collapses each row into horizontal runs of one colour.
 *
 * A pixel-per-rect SVG spends most of its bytes repeating coordinates for
 * neighbours that share a colour — these avatars are large flat areas, so
 * merging runs cuts the rect count by well over half.
 */
function rowRuns(grid: PixelGrid, palette: Palette, y: number): { x: number; width: number; color: string }[] {
  const runs: { x: number; width: number; color: string }[] = [];
  let start = -1;
  let current: string | null = null;

  for (let x = 0; x <= GRID_SIZE; x++) {
    const color = x < GRID_SIZE ? resolveColor(palette, grid[y][x] as ColorToken) : null;
    if (color === current) continue;
    if (current !== null) runs.push({ x: start, width: x - start, color: current });
    current = color;
    start = x;
  }

  return runs;
}

function escapeText(value: string): string {
  return value.replace(/[&<>]/g, c => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'));
}

/**
 * Generates a complete SVG string for a lil_guy avatar.
 * Works anywhere — no React or DOM required.
 *
 * Without `title` the SVG is marked decorative, which is right when the avatar
 * sits next to the name it stands for. Pass `title` when it is the only thing
 * identifying that person.
 */
export function toSvgString(input: string, options: RenderOptions = {}): string {
  const config = resolve(input, options.parts);
  const palette = options.palette ?? shadePalette(getPalette(config.palette), config.shade);
  const grid = compose(config);
  const size = options.size ?? 128;
  const pixelSize = size / GRID_SIZE;

  const rects: string[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (const run of rowRuns(grid, palette, y)) {
      rects.push(
        `<rect x="${run.x * pixelSize}" y="${y * pixelSize}" width="${run.width * pixelSize}" height="${pixelSize}" fill="${run.color}"/>`
      );
    }
  }

  const round = options.square ? '' : `<clipPath id="clip"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></clipPath>`;
  const groupOpen = options.square ? '<g>' : '<g clip-path="url(#clip)">';
  const labelled = typeof options.title === 'string' && options.title.length > 0;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"${labelled ? ' role="img"' : ' role="presentation" aria-hidden="true"'}>`,
    labelled ? `<title>${escapeText(options.title!)}</title>` : '',
    round ? `<defs>${round}</defs>` : '',
    groupOpen,
    ...rects,
    '</g>',
    '</svg>',
  ].join('');
}
