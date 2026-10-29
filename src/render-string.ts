import { resolve } from './resolve';
import { dress, withItems } from './items';
import { paint, SMALL_SIZE } from './paint';
import { compose } from './compose';
import { paletteOf } from './palette';
import type { RenderOptions } from './types';
import { GRID_SIZE } from './types';

/**
 * Collapses each row into horizontal runs of one colour.
 *
 * A pixel-per-rect SVG spends most of its bytes repeating coordinates for
 * neighbours that share a colour — these avatars are large flat areas, so
 * merging runs cuts the rect count by well over half.
 */
function rowRuns(colors: (string | null)[][], y: number): { x: number; width: number; color: string }[] {
  const runs: { x: number; width: number; color: string }[] = [];
  let start = -1;
  let current: string | null = null;

  for (let x = 0; x <= GRID_SIZE; x++) {
    const color = x < GRID_SIZE ? colors[y][x] : null;
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
/** The smallest square round the drawn pixels, centred on them, kept inside the grid. */
function bounds(colors: (string | null)[][], margin: number): { x: number; y: number; side: number } {
  let left = GRID_SIZE, right = -1, top = GRID_SIZE, bottom = -1;
  colors.forEach((row, y) => row.forEach((c, x) => {
    if (!c) return;
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }));
  if (right < 0) return { x: 0, y: 0, side: GRID_SIZE };
  const side = Math.min(GRID_SIZE, Math.max(right - left, bottom - top) + 1 + margin);
  const at = (lo: number, hi: number) => Math.max(0, Math.min(GRID_SIZE - side, Math.floor((lo + hi + 1 - side) / 2)));
  return { x: at(left, right), y: at(top, bottom), side };
}

export function toSvgString(input: string, options: RenderOptions = {}): string {
  const config = dress(resolve(input, options.parts), options, input);
  const palette = withItems(options.palette ?? paletteOf(config), config);
  const size = options.size ?? 128;
  const small = options.small ?? size <= SMALL_SIZE;
  const colors = paint(compose(config), config, palette, small);
  // Small, he fills the square: the empty rows and columns round him go.
  // A round avatar keeps a margin so the circle doesn't clip his corners.
  const box = small ? bounds(colors, options.square ? 0 : 3) : { x: 0, y: 0, side: GRID_SIZE };
  const pixelSize = size / box.side;

  const rects: string[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (const run of rowRuns(colors, y)) {
      rects.push(
        `<rect x="${(run.x - box.x) * pixelSize}" y="${(y - box.y) * pixelSize}" width="${run.width * pixelSize}" height="${pixelSize}" fill="${run.color}"/>`
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
