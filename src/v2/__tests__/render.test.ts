import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { toSvgString } from '../../render-string';
import { animationFrames, STATES } from '../animate';
import { composeLayersV2, composeV2 } from '../compose';
import { emptyGridV2 } from '../grid';
import { backdrops, outfitPlacements, outfits, headsV2, indexOfPart } from '../parts';
import { getPaletteV2, shadePaletteV2 } from '../palettes';
import { resolveV2 } from '../resolve';
import { toSvgStringV2 } from '../render';
import type { AnimationState } from '../types';

const NAMES = Array.from({ length: 200 }, (_, i) => `row-${i}`);

describe('toSvgStringV2', () => {
  it('stays small enough for a hundred-row leaderboard', () => {
    const sizes = NAMES.map(n => toSvgStringV2(n, { size: 32, square: true }).length);
    const mean = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    expect(mean).toBeLessThan(1500);
    expect(Math.max(...sizes)).toBeLessThan(4096);
  });

  it('is geometry only — the seed never reaches the output', () => {
    const svg = toSvgStringV2('<script>alert(1)</script>', { square: true });
    const tags = [...new Set([...svg.matchAll(/<([a-zA-Z]+)/g)].map(m => m[1]))].sort();
    expect(tags).toEqual(['g', 'path', 'svg']);
    expect(svg).not.toContain('script');
  });

  it('escapes the title, and is decorative without one', () => {
    expect(toSvgStringV2('a', { title: 'a<b' })).toContain('<title>a&lt;b</title>');
    expect(toSvgStringV2('a')).toContain('aria-hidden="true"');
  });

  it('keeps the viewBox on the grid whatever the size', () => {
    const svg = toSvgStringV2('alice', { size: 48 });
    expect(svg).toContain('width="48"');
    expect(svg).toContain('viewBox="0 0 32 32"');
    expect(svg).toContain('clip-path');
    expect(toSvgStringV2('alice', { square: true })).not.toContain('clip-path');
  });

  it('is deterministic, and accepts a config as well as a name', () => {
    expect(toSvgStringV2('bob')).toBe(toSvgStringV2('bob'));
    expect(toSvgStringV2(resolveV2('bob'))).toBe(toSvgStringV2('bob'));
    expect(toSvgStringV2('bob')).not.toBe(toSvgStringV2('alice'));
  });

  it('is smaller than v1 at the same size despite four times the pixels', () => {
    const v1 = NAMES.reduce((sum, n) => sum + toSvgString(n, { size: 32, square: true }).length, 0);
    const v2 = NAMES.reduce((sum, n) => sum + toSvgStringV2(n, { size: 32, square: true }).length, 0);
    expect(v2).toBeLessThan(v1);
  });
});

describe('animation', () => {
  const states = Object.keys(STATES) as AnimationState[];

  it('composes every state on every head', () => {
    for (const state of states) {
      headsV2.forEach((_, head) => {
        const frames = animationFrames({ ...resolveV2('x'), head }, state);
        expect(frames.length).toBe(STATES[state].length);
      });
    }
  });

  it('emits one self-contained string per state, with keyframes and no script', () => {
    for (const state of states.filter(s => s !== 'still')) {
      const svg = toSvgStringV2('alice', { state });
      expect(svg).toContain('@keyframes');
      expect(svg).toContain('prefers-reduced-motion:reduce');
      expect(svg).not.toContain('<script');
    }
    expect(toSvgStringV2('alice', { state: 'still' })).not.toContain('<style');
  });

  it('scopes its classes, so a page of guys does not share one animation', () => {
    const a = toSvgStringV2('alice', { state: 'idle' }).match(/class="(lg[a-z0-9]+)"/)![1];
    const b = toSvgStringV2('bob', { state: 'idle' }).match(/class="(lg[a-z0-9]+)"/)![1];
    expect(a).not.toBe(b);
  });

  it('blinks by closing the eyes: no eye white survives', () => {
    const config = { ...resolveV2('x'), eyes: indexOfPart('eyes.round') };
    const open = composeV2(config).flat();
    const shut = composeV2(config, { blink: true }).flat();
    expect(open).toContain(6);
    expect(shut).not.toContain(6);
    expect(shut).toContain(7);
  });

  it('looks sideways by sliding only the eyes', () => {
    const config = { ...resolveV2('x'), flip: false };
    const still = composeLayersV2(config);
    const left = composeLayersV2(config, { eyeShift: -2 });
    const eyeCols = (layers: typeof still.layers) =>
      layers.flatMap(row => row.map((l, x) => (l === 'eyes' ? x : -1))).filter(x => x >= 0);
    expect(Math.min(...eyeCols(left.layers))).toBeLessThan(Math.min(...eyeCols(still.layers)));
    const mouth = (c: typeof still) => c.layers.flatMap((row, y) => row.map((l, x) => (l === 'mouth' ? `${x},${y}` : ''))).filter(Boolean);
    expect(mouth(left)).toEqual(mouth(still));
  });

  it('cheers with arms outside the silhouette, drawn only on empty pixels', () => {
    for (let head = 0; head < headsV2.length; head++) {
      const config = { ...resolveV2('x'), head, hair: 0, accessory: 0, feet: 0 };
      const rest = composeV2(config);
      const up = composeV2(config, { arms: 'up' });
      let added = 0;
      up.forEach((row, y) => row.forEach((t, x) => {
        if (t !== rest[y][x]) {
          expect(rest[y][x]).toBe(0);
          added++;
        }
      }));
      expect(added).toBeGreaterThan(0);
    }
  });
});

describe('new slots', () => {
  // No outfit or backdrop art ships yet, so a stand-in is appended for the
  // duration of these tests to exercise the paths the art will take.
  const scarf = emptyGridV2();
  for (let y = 20; y < 22; y++) for (let x = 6; x < 26; x++) scarf[y][x] = 4;
  const tile = emptyGridV2().map(row => row.fill(3));

  beforeAll(() => {
    outfits.push(scarf);
    outfitPlacements.push('field');
    backdrops.push(tile);
  });
  afterAll(() => {
    outfits.pop();
    outfitPlacements.pop();
    backdrops.pop();
  });

  it('draws an outfit over the body, but never over the face', () => {
    const config = { ...resolveV2('x'), outfit: outfits.length - 1 };
    const { grid, layers } = composeLayersV2(config);
    expect(layers.flat()).toContain('outfit');
    const bare = composeLayersV2({ ...config, outfit: 0 });
    bare.layers.forEach((row, y) => row.forEach((l, x) => {
      if (l === 'eyes' || l === 'mouth') expect(grid[y][x]).toBe(bare.grid[y][x]);
    }));
  });

  it('tints only the slot it names', () => {
    const config = { ...resolveV2('x'), outfit: outfits.length - 1, tints: { outfit: 5 } };
    const svg = toSvgStringV2(config, { square: true });
    const accent = (i: number) => shadePaletteV2(getPaletteV2(i), config.shade).colors[4];
    expect(svg).toContain(accent(5));
    expect(toSvgStringV2({ ...config, tints: {} }, { square: true })).not.toContain(accent(5));
  });

  it('draws a backdrop on cards, and drops it in the tiny preview', () => {
    const b = backdrops.length - 1;
    const plain = toSvgStringV2('x', { square: true });
    const card = toSvgStringV2('x', { square: true, backdrop: b });
    expect(card.length).toBeGreaterThan(plain.length);
    expect(toSvgStringV2('x', { square: true, backdrop: b, preview: true })).toBe(toSvgStringV2('x', { square: true, preview: true }));
  });
});
