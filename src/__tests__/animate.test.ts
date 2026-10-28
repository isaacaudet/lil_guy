import { describe, expect, test } from 'bun:test';
import { animate, animateLoop, closeEyes, drawFrame, frameAt, toAnimatedSvg, MOVES, FRAME_HEIGHT, FRAME_WIDTH, HEADROOM, WIDE_FRAME_WIDTH } from '../animate';
import { LOOP_MS } from '../loop';
import { buddyAlone, compose } from '../compose';
import { T } from '../parts/art';
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

  test('a buddy stands beside him on the floor, whole, apart from him in every frame of every move', () => {
    const wrong: string[] = [];
    for (const name of NAMES) for (const buddy of ['amountle.gemling', 'flipsies.goldfish', 'trackdle.tyres', 'weighsies.cat', 'pets.bunny-buddy']) {
      const config = dress(resolve(name), { equip: [buddy] }, name);
      const alone = buddyAlone(config)!, W = alone[0].length;
      const art = alone.flatMap((row, y) => row.flatMap((t, x) => (t ? [[x, y + HEADROOM, t]] : []))) as [number, number, number][];
      const plain = still(name);
      // Standing still, he is his still on his own sixteen columns, the buddy past them.
      const rest = animate(name, 'blink', { equip: [buddy] }).frames[0].colors;
      expect(rest[0].length).toBe(W);
      for (let y = 0; y < GRID_SIZE; y++) expect(rest[y + HEADROOM].slice(0, GRID_SIZE)).toEqual(plain[y]);
      expect(Math.min(...art.map(([x]) => x))).toBeGreaterThanOrEqual(GRID_SIZE);
      expect(W).toBeLessThanOrEqual(WIDE_FRAME_WIDTH);
      for (const move of MOVES) for (const [k, f] of animate(name, move, { equip: [buddy], rarity: false }).frames.entries()) {
        // Its outline and its eyes (outline ink and a white catchlight) are his colours, not the buddy's.
        const lifts = [0, 1, 2].filter(lift => art.every(([x, y, t]) => t === T.OUTLINE || t === T.WHITE || f.slots[y - lift][x] === 4));
        if (lifts.length !== 1) { wrong.push(`${name} ${buddy} ${move} ${k}: not whole on the floor or a hop above it`); continue; }
        const lift = lifts[0], mine = new Set(art.map(([x, y]) => (y - lift) * W + x));
        f.colors.forEach((row, y) => row.forEach((c, x) => {
          if (!c || mine.has(y * W + x)) return;
          if (f.slots[y][x] === 4) wrong.push(`${name} ${buddy} ${move} ${k}: a stray buddy pixel at ${x},${y}`);
          else if (art.some(([bx, by]) => Math.abs(bx - x) <= 1 && Math.abs(by - lift - y) <= 1)) wrong.push(`${name} ${buddy} ${move} ${k}: he touches it at ${x},${y}`);
        }));
      }
    }
    expect([...new Set(wrong)]).toEqual([]);
  }, 60_000);

  test('a buddy hops when he hops, and on its own now and then, but sleeps when he sleeps', () => {
    const equip = ['pets.kitten'];
    const lift = (f: { slots: number[][] }) => GRID_SIZE + HEADROOM - 1 - Math.max(...f.slots.flatMap((row, y) => (row.includes(4) ? [y] : [])));
    const lifts = (move: (typeof MOVES)[number]) => animate('alice', move, { equip, rarity: false }).frames.map(lift);
    // Its bottom art row sits a row over the floor, inside its outline.
    const floor = Math.min(...lifts('sleep'));
    expect(new Set(lifts('sleep'))).toEqual(new Set([floor]));
    expect(Math.max(...lifts('hop')) - floor).toBe(2);
    const idle = animateLoop('alice', 'idle', { equip, rarity: false });
    expect(Math.max(...idle.frames.map(lift)) - floor).toBe(1);
    expect(idle.duration % LOOP_MS).toBe(0);
  });

  test('a guy without a buddy keeps his sixteen columns', () => {
    for (const move of MOVES) expect(animate('alice', move).width).toBe(FRAME_WIDTH);
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
    // The eyes are ink, shine and the accent's colour low in them (10, 11).
    let changed = 0;
    for (const name of NAMES) {
      const config = dress(resolve(name), {}, name);
      const grid = compose(config);
      const shut = closeEyes(grid, config);
      shut.forEach((row, y) => row.forEach((t, x) => {
        if (t !== grid[y][x]) { changed++; expect([5, 6, 10, 11]).toContain(grid[y][x]); }
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
