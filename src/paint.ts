import { LAYER, T } from './parts/art';
import { eyes as eyeParts } from './parts';
import { faceOf } from './compose';
import { resolveColor, mix, contrast } from './palette';
import { paintCell } from './owned';
import { auraById, auraColor } from './auras';
import { fxColor } from './effects';
import type { AvatarConfig, Palette, PixelGrid } from './types';

/**
 * Turns a composed grid into colours. Most cells take their token's palette
 * colour; a cell belonging to an owned item is repainted with that copy's
 * finish and wear.
 */
export function paint(grid: PixelGrid, config: AvatarConfig, palette: Palette, small = false, still = true): (string | null)[][] {
  const state = { glint: false };
  const slotOf = (t: number) => (t >= LAYER.aura ? 'aura' : t >= LAYER.buddy ? 'buddy' : t >= LAYER.frame ? 'frame' : t >= LAYER.hat ? 'hat' : t >= LAYER.skin ? 'skin' : null);
  const aura = auraById(config.aura);
  if (small) ({ grid, palette } = forSmall(grid, palette));
  const fp = facePlate(grid, palette);
  if (fp) palette = fp.palette;
  const chase = chaseEyes(grid, config);
  return grid.map((row, y) => row.map((token, x) => {
    const color = chase?.[y][x] ?? (fp?.plate[y][x] ? fp.pale : token === T.WHITE ? catchlight(grid, x, y, palette) : resolveColor(palette, token));
    if (!color) return null;
    const slot = slotOf(token);
    const copy = slot ? config.owned?.[slot] : undefined;
    const painted = slot === 'aura' ? (aura && copy ? auraColor(aura.id, token - LAYER.aura, copy.finish, x, y, aura.still) : color)
      : copy ? paintCell(color, x, y, copy, state) : color;
    // An effect, as it stands at the start; animate moves it instead.
    return still && copy?.fx ? fxColor(painted, copy.fx, x, y, 0, copy.print) : painted;
  }));
}

/**
 * On a body too dark for dark eyes, the face gets a lighter patch round the
 * eyes and mouth (as a penguin or a panda has) and the eyes stay dark on it:
 * cream eyes straight on a dark skin smudged into it at any size.
 */
function facePlate(grid: PixelGrid, palette: Palette): { plate: boolean[][]; palette: Palette; pale: string } | null {
  const ink = resolveColor(palette, T.EYE), body = resolveColor(palette, T.BODY);
  if (!ink || !body || contrast(ink, '#000000') <= 10) return null;
  let top = 99, bottom = -1, left = 99, right = -1;
  grid.forEach((row, y) => row.forEach((t, x) => {
    if (t === T.EYE || t === T.MOUTH) { top = Math.min(top, y); bottom = Math.max(bottom, y); left = Math.min(left, x); right = Math.max(right, x); }
  }));
  if (bottom < 0) return null;
  top -= 1; bottom += 1; left -= 1; right += 1;
  const skin = (t: number) => t === T.BODY || t === T.SHADE || t === T.LIGHT;
  // A rounded patch: the top and bottom rows pull in at the sides.
  const plate = grid.map((row, y) => row.map((t, x) => skin(t) && y >= top && y <= bottom && x >= left && x <= right
    && !((y === top || y === bottom) && (x <= left + 1 || x >= right - 1))));
  const dark = mix(resolveColor(palette, T.OUTLINE) ?? '#000000', '#000000', 0.3);
  return { plate, pale: mix(body, '#FFF1D6', 0.62), palette: { ...palette, colors: { ...palette.colors, [T.EYE]: dark, [T.MOUTH]: dark } } };
}

/**
 * Chase eyes keep their own colours on every guy, so galaxy eyes are always a
 * galaxy: drawn in his accent they came out a different speck on each body.
 */
const CHASE_COLORS: Record<string, Partial<Record<number, string>>> = {
  galaxy: { [T.EYE]: '#1C0E3D', [T.WHITE]: '#FFFFFF', [T.ACCENT_SHADE]: '#8A5CFF', [T.GOLD]: '#FF8BE0' },
  diamond: { [T.EYE]: '#0B2F4D', [T.WHITE]: '#FFFFFF', [T.ACCENT]: '#9EF0FF', [T.ACCENT_SHADE]: '#2BA8E0' },
  dragon: { [T.EYE]: '#240800', [T.GOLD]: '#FFD23A', [T.GOLD_SHADE]: '#FF5A14' },
};

function chaseEyes(grid: PixelGrid, config: AvatarConfig): (string | undefined)[][] | null {
  const colors = CHASE_COLORS[eyeParts[config.eyes]?.name ?? ''];
  if (!colors) return null;
  const f = faceOf(config);
  const left = f.eyes[0].left - 1, right = f.eyes[f.eyes.length - 1].right + 1;
  return grid.map((row, y) => row.map((t, x) => (y >= f.top - 1 && y <= f.line && x >= left && x <= right ? colors[t] : undefined)));
}

/** At or under this many pixels across, a guy is drawn for a small size (`forSmall`). */
export const SMALL_SIZE = 36;

/**
 * A guy drawn small, in a board's row or beside a name, is a pixel or two a
 * cell, and his face is what goes first: a catchlight takes half an eye, the
 * soft highlight blots the forehead, and a dark ink that reads at 128 greys
 * out. Small, each eye is solid, the highlight goes back to the body colour,
 * and dark ink goes darker still. Nothing moves, so he is the same guy.
 */
function forSmall(grid: PixelGrid, palette: Palette): { grid: PixelGrid; palette: Palette } {
  const eyeAt = (x: number, y: number) => grid[y]?.[x] === T.EYE;
  const out = grid.map((row, y) => row.map((t, x) => {
    if (t === T.WHITE && (eyeAt(x - 1, y) || eyeAt(x + 1, y) || eyeAt(x, y - 1) || eyeAt(x, y + 1))) return T.EYE;
    if (t === T.LIGHT) return T.BODY;
    return t;
  }));
  const ink = palette.colors[T.EYE];
  if (!ink || contrast('#FFFFFF', ink) < 3) return { grid: out, palette };
  const deep = mix(ink, '#000000', 0.45);
  return { grid: out, palette: { ...palette, colors: { ...palette.colors, [T.EYE]: deep, [T.MOUTH]: deep } } };
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
