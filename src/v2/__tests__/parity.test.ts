import { describe, expect, it } from 'bun:test';
import { compose } from '../../compose';
import { getPalette, resolveColor, shadePalette } from '../../palette';
import { heads, eyes, mouths, hair, bodies, accessories } from '../../parts';
import { resolve } from '../../resolve';
import type { AvatarConfig, ColorToken, Palette, PixelGrid } from '../../types';
import { composeV2 } from '../compose';
import { upscale2x } from '../grid';
import { getPaletteV2, palettesV2 } from '../palettes';
import { resolveV2 } from '../resolve';
import { toSvgStringV2 } from '../render';
import { GRID_SIZE_V2 as N } from '../types';

/**
 * The promise v2 makes: nobody is redrawn. Any v1 config drawn through v2 is
 * v1's own grid with every pixel doubled, and any name resolves to the guy it
 * always did. If one of these fails, somebody's character changed.
 */

const NAMES = Array.from({ length: 10_000 }, (_, i) => `player-${i}-${(i * 2654435761) >>> 0}`);

const base: AvatarConfig = {
  head: 0, eyes: 1, mouth: 0, hair: 0, body: 0, accessory: 0, palette: 0, rotation: 0,
  flip: false, shade: 1, feet: 0, patternTone: 0,
};

function mismatch(config: AvatarConfig): string | null {
  const v1 = upscale2x(compose(config));
  const v2 = composeV2(config);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (v1[y][x] !== v2[y][x]) return `${JSON.stringify(config)} differs at ${x},${y}`;
    }
  }
  return null;
}

/** Reads the fills of a v2 SVG back into a grid of colours. */
function rasterize(svg: string): (string | null)[][] {
  const out: (string | null)[][] = Array.from({ length: N }, () => new Array(N).fill(null));
  for (const [, fill, d] of svg.matchAll(/<path fill="([^"]+)" d="([^"]+)"\/>/g)) {
    for (const [, x, y, w, h] of d.matchAll(/M(\d+) (\d+)h(\d+)v(\d+)h-\d+z/g)) {
      for (let yy = +y; yy < +y + +h; yy++) for (let xx = +x; xx < +x + +w; xx++) out[yy][xx] = fill;
    }
  }
  return out;
}

function v1Colors(grid: PixelGrid, palette: Palette): (string | null)[][] {
  return upscale2x(grid).map(row => row.map(t => resolveColor(palette, t as ColorToken)));
}

describe('v1 parity', () => {
  it('draws every v1 part, on every head, exactly as v1 at 2x', () => {
    const failures: string[] = [];
    const check = (config: AvatarConfig) => {
      const m = mismatch(config);
      if (m) failures.push(m);
    };
    heads.forEach((_, head) => {
      eyes.forEach((_, i) => check({ ...base, head, eyes: i }));
      mouths.forEach((_, i) => check({ ...base, head, mouth: i }));
      hair.forEach((_, i) => check({ ...base, head, hair: i }));
      bodies.forEach((_, i) => {
        check({ ...base, head, body: i });
        check({ ...base, head, body: i, patternTone: 1 });
      });
      accessories.forEach((_, i) => check({ ...base, head, accessory: i }));
      for (let feet = 0; feet < 4; feet++) check({ ...base, head, feet, flip: true });
    });
    expect(failures.slice(0, 5)).toEqual([]);
  });

  it('draws 10,000 name-drawn guys exactly as v1 at 2x', () => {
    const failures = NAMES.map(name => mismatch(resolve(name))).filter(Boolean);
    expect(failures.slice(0, 5)).toEqual([]);
  });

  it('resolves every name to the config v1 does, with the new slots empty', () => {
    for (const name of NAMES) {
      const v2 = resolveV2(name);
      expect(v2).toEqual({ ...resolve(name), outfit: 0, held: 0, backdrop: 0 });
    }
  });

  it('paints name-drawn guys in the colours v1 does', () => {
    for (const name of NAMES.slice(0, 300)) {
      const config = resolve(name);
      const palette = shadePalette(getPalette(config.palette), config.shade);
      expect(rasterize(toSvgStringV2(name, { square: true }))).toEqual(v1Colors(compose(config), palette));
    }
  });

  it('paints customized guys in the raw palette the app passes, extras included', () => {
    // A customized guy is drawn with NEUTRAL_TRAITS and an unshaded palette,
    // which for 32-39 used to be the app's EXTRA_PALETTES.
    const neutral = { flip: false, shade: 1, feet: 0, patternTone: 0 };
    palettesV2.forEach((palette, index) => {
      const parts = { head: index % heads.length, eyes: index % eyes.length, mouth: 3, hair: index % hair.length, body: 4, accessory: 5, ...neutral };
      const v1 = v1Colors(compose(resolve('someone', parts)), palette as Palette);
      const v2 = rasterize(toSvgStringV2('someone', { parts, palette: getPaletteV2(palette.id), square: true }));
      expect(v2).toEqual(v1);
    });
  });
});
