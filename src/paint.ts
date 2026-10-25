import { LAYER, T } from './parts/art';
import { resolveColor, mix, contrast } from './palette';
import { paintCell } from './owned';
import type { AvatarConfig, Palette, PixelGrid } from './types';

/**
 * Turns a composed grid into colours. Most cells take their token's palette
 * colour; a cell belonging to an owned item is repainted with that copy's
 * finish and wear.
 */
export function paint(grid: PixelGrid, config: AvatarConfig, palette: Palette): (string | null)[][] {
  const state = { glint: false };
  const slotOf = (t: number) => (t >= LAYER.buddy ? 'buddy' : t >= LAYER.frame ? 'frame' : t >= LAYER.hat ? 'hat' : t >= LAYER.skin ? 'skin' : null);
  return grid.map((row, y) => row.map((token, x) => {
    const color = token === T.WHITE ? catchlight(grid, x, y, palette) : resolveColor(palette, token);
    if (!color) return null;
    const slot = slotOf(token);
    const copy = slot ? config.owned?.[slot] : undefined;
    return copy ? paintCell(color, x, y, copy, state) : color;
  }));
}

/**
 * An eye's white catchlight. On a light face a white pixel on the eye's edge
 * melts into the skin and leaves the eye a bitten-off L, so there it is a
 * pale tint of the eye instead: the eye keeps its whole shape and still shines.
 */
function catchlight(grid: PixelGrid, x: number, y: number, palette: Palette): string | null {
  const white = resolveColor(palette, T.WHITE);
  const near = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].map(([nx, ny]) => grid[ny]?.[nx] ?? 0);
  if (!white || !near.includes(T.EYE)) return white;
  const ink = resolveColor(palette, T.EYE);
  if (!ink || contrast(white, ink) < 3) return white;
  const pale = near.some(t => t !== T.EYE && t !== T.WHITE && t !== 0 && contrast(white, resolveColor(palette, t) ?? '#000000') < 1.6);
  return pale ? mix(ink, white, 0.6) : white;
}
