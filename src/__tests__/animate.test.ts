import { describe, expect, test } from 'bun:test';
import { animate, closeEyes, drawFrame, frameAt, toAnimatedSvg, MOVES, FRAME_HEIGHT, FRAME_WIDTH, HEADROOM } from '../animate';
import { compose } from '../compose';
import { resolve } from '../resolve';
import { dress, withItems } from '../items';
import { paint } from '../paint';
import { getPalette, shadePalette } from '../palette';
import { encode, type Owned } from '../owned';
import { GRID_SIZE } from '../types';

const NAMES = ['alice', 'bob', 'luna', 'max35', 'iris20', 'p123'];
const still = (name: string, opts: { equip?: string[] } = {}) => {
  const config = dress(resolve(name), opts, name);
  const palette = withItems(shadePalette(getPalette(config.palette), config.shade), config);
  return paint(compose(config), config, palette);
};
const gold: Owned = { item: 'puttsies.ball', finish: 'gold', scuff: 0.01, print: 9 };

describe('animate', () => {
  test('every move gives frames of the right size with positive times', () => {
    for (const name of NAMES) for (const move of MOVES) {
      const a = animate(name, move);
      expect(a.frames.length).toBeGreaterThan(1);
      expect(a.duration).toBe(a.frames.reduce((t, f) => t + f.ms, 0));
      for (const f of a.frames) {
        expect(f.ms).toBeGreaterThan(0);
        expect(f.colors.length).toBe(FRAME_HEIGHT);
        for (const row of f.colors) expect(row.length).toBe(FRAME_WIDTH);
      }
    }
  });

  test('is deterministic', () => {
    expect(JSON.stringify(animate('luna', 'cheer', { equip: [encode(gold)] })))
      .toBe(JSON.stringify(animate('luna', 'cheer', { equip: [encode(gold)] })));
  });

  test('the resting frame is the still avatar, standing in the bottom rows', () => {
    for (const name of NAMES) {
      const rest = animate(name, 'blink').frames[0].colors;
      const s = still(name);
      for (let y = 0; y < HEADROOM; y++) expect(rest[y].every(c => c === null)).toBe(true);
      for (let y = 0; y < GRID_SIZE; y++) expect(rest[y + HEADROOM]).toEqual(s[y]);
    }
  });

  test('the frame behind him matches the still too', () => {
    const rest = animate('luna', 'blink', { equip: ['trackdle.flag'] }).frames[0].colors;
    const s = still('luna', { equip: ['trackdle.flag'] });
    for (let y = 0; y < GRID_SIZE; y++) expect(rest[y + HEADROOM]).toEqual(s[y]);
  });

  test('a hop goes up into the headroom', () => {
    for (const name of NAMES) {
      const a = animate(name, 'hop');
      const tops = a.frames.map(f => f.colors.findIndex(row => row.some(Boolean)));
      expect(Math.min(...tops)).toBeLessThan(tops[a.frames.length - 1]);
    }
  });

  test('a blink only changes the eyes', () => {
    // One-row eyes (a squint, shades) are already a line, so some guys don't change.
    let changed = 0;
    for (const name of NAMES) {
      const config = dress(resolve(name), {}, name);
      const grid = compose(config);
      const shut = closeEyes(grid, config);
      shut.forEach((row, y) => row.forEach((t, x) => {
        if (t !== grid[y][x]) { changed++; expect([5, 6]).toContain(grid[y][x]); }
      }));
    }
    expect(changed).toBeGreaterThan(0);
  });

  test('rarity shows: an aura ring for a Gold copy, none for a plain one', () => {
    const plain = animate('luna', 'idle', { equip: ['puttsies.ball'] });
    const rich = animate('luna', 'idle', { equip: [encode(gold)] });
    const off = animate('luna', 'idle', { equip: [encode(gold)], rarity: false });
    const ringColours = new Set(['#FFE27A', '#E4AE39']);
    const has = (a: typeof plain) => a.frames.some(f => f.colors.some(row => row.some(c => c !== null && ringColours.has(c))));
    expect(has(rich)).toBe(true);
    expect(has(plain)).toBe(false);
    expect(has(off)).toBe(false);
    expect(rich.frames.length).toBeGreaterThan(plain.frames.length);
  });

  test('moves have expressions and emotes, and no stray pixels at his feet', () => {
    const colours = (a: ReturnType<typeof animate>) => new Set(a.frames.flatMap(f => f.colors.flat()));
    for (const name of NAMES) {
      expect(colours(animate(name, 'dance')).has('#FFE27A')).toBe(true);
      expect(colours(animate(name, 'look')).has('#FFFFFF')).toBe(true);
      // A landing once kicked up near-white dust that read as glitches on a light page.
      expect(colours(animate(name, 'hop')).has('#E8E0D2')).toBe(false);
      const cheer = animate(name, 'cheer', { rarity: false }), rest = animate(name, 'blink').frames[0];
      expect(cheer.frames.some(f => JSON.stringify(f.colors) !== JSON.stringify(rest.colors))).toBe(true);
    }
  });

  test('frameAt loops, or holds the last frame when played once', () => {
    const a = animate('bob', 'hop');
    expect(frameAt(a, 0)).toBe(a.frames[0]);
    expect(frameAt(a, a.duration)).toBe(a.frames[0]);
    expect(frameAt(a, a.duration * 5 + 1, true)).toBe(a.frames[a.frames.length - 1]);
    expect(frameAt(a, a.frames[0].ms)).toBe(a.frames[1]);
  });

  test('drawFrame paints every coloured pixel', () => {
    const f = animate('alice', 'idle').frames[0];
    const calls: string[] = [];
    drawFrame({ fillStyle: '', fillRect(x, y) { calls.push(`${x},${y}`); } }, f, 0, 0, 1);
    expect(calls.length).toBe(f.colors.flat().filter(Boolean).length);
  });

  test('the animated SVG has a group and keyframes per frame', () => {
    const a = animate('alice', 'wave');
    const svg = toAnimatedSvg('alice', 'wave', { size: 64 });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('width="64" height="80"');
    expect(svg.match(/<g class="f\d+">/g)!.length).toBe(a.frames.length);
    expect(svg.match(/@keyframes/g)!.length).toBe(a.frames.length);
    expect(svg).not.toContain('prefers-reduced-motion');
    expect(toAnimatedSvg('alice', 'wave', { stillWhenReduced: true })).toContain('prefers-reduced-motion');
  });
});
