import { LAYER } from './parts/art';
import { resolveColor } from './palette';
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
    const color = resolveColor(palette, token);
    if (!color) return null;
    const slot = slotOf(token);
    const copy = slot ? config.owned?.[slot] : undefined;
    return copy ? paintCell(color, x, y, copy, state) : color;
  }));
}
