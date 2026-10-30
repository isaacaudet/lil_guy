import { describe, expect, test } from 'bun:test';
import { animate, AURAS, ONE_OF_ONE_AURAS, FX_IDS, items, eyes, animateOptions, shineFit, shineFrame, dress, resolve, bakeGuy, type Move } from '../index-headless';
import { fit, steps, tick, cycle, wave, LOOP_MS } from '../loop';

/**
 * A loop is perfect when playing on past its end gives its start again: the
 * frame after the last is the first, and so is everything after. Every guy's
 * baked loop is checked that way, for every aura in several finishes, every
 * effect, a Lucky guy, live eyes and each grade of copy, across moves.
 */
const hat = items.find(i => i.slot === 'hat' && !i.free)!.id;
const code = (item: string, finish: string, extra = '') => `${item}~${finish}~0.0300000~37${extra}`;

function laps(spec: { seed: string; equip?: string[]; parts?: any }, move: Move) {
  const options = animateOptions(spec);
  const owned = dress(resolve(spec.seed, spec.parts), { equip: spec.equip }, spec.seed).owned;
  const plain = animate(spec.seed, move, options);
  const { repeats, turns } = shineFit(plain.duration);
  const once = animate(spec.seed, move, { ...options, loop: { repeats, turns, fine: true } });
  const twice = animate(spec.seed, move, { ...options, loop: { repeats: repeats * 2, turns: turns * 2, fine: true } });
  const pic = (f: (typeof once.frames)[number]) => JSON.stringify([f.colors, f.outside ?? [], Array.from(shineFrame(f, owned, f.at ?? 0))]);
  return { first: once.frames.map(pic), next: twice.frames.slice(once.frames.length).map(pic), total: once.duration, timed: plain.timed };
}

const expectSeamless = (spec: Parameters<typeof laps>[0], move: Move = 'idle') => {
  const { first, next, total } = laps(spec, move);
  expect(next.length).toBe(first.length);
  const at = next.findIndex((p, i) => p !== first[i]);
  expect(at).toBe(-1);
  expect(total % 1).toBe(0);
};

describe('every loop closes perfectly', () => {
  test('the clock helpers come round in LOOP_MS', () => {
    for (const p of [37, 110, 560, 900, 1100, 2200, 2600, 4398, 9000]) {
      expect(Math.abs(LOOP_MS / fit(p) - Math.round(LOOP_MS / fit(p)))).toBeLessThan(1e-9);
      expect(cycle(123, p)).toBeCloseTo(cycle(123 + LOOP_MS, p), 9);
      expect(tick(500, p)).toBe(tick(500 + LOOP_MS, p));
      expect(Math.sin(77 / wave(p))).toBeCloseTo(Math.sin((77 + LOOP_MS) / wave(p)), 9);
      for (const n of [1, 3, 15, 23]) expect(Math.floor(LOOP_MS / steps(p, n) + 1e-9) % n).toBe(0);
    }
  });

  test.each([...AURAS, ...ONE_OF_ONE_AURAS].map(a => a.id))('aura %s', id => {
    for (const finish of ['classic', 'fade', 'pearl']) expectSeamless({ seed: 'loopaura', equip: [code(id, finish)] });
  });

  test.each(FX_IDS)('effect %s, on an item and on an aura', fx => {
    expectSeamless({ seed: 'loopfx', equip: [code(hat, 'plain', `~x${fx}`)] });
    expectSeamless({ seed: 'loopfx', equip: [code(AURAS[3].id, 'classic', `~x${fx}`)] });
  });

  test('each finish and grade of copy, across moves', () => {
    for (const finish of ['plain', 'sunset', 'tempered', 'nebula', 'prism', 'negative', 'gold']) {
      for (const move of ['idle', 'hop', 'dance', 'cheer'] as Move[]) expectSeamless({ seed: 'loopgrade', equip: [code(hat, finish)] }, move);
    }
  });

  test('a Lucky guy and live eyes', () => {
    expectSeamless({ seed: 'looplucky', parts: { lucky: true } });
    for (const name of ['galaxy', 'diamond', 'dragon', 'starry']) expectSeamless({ seed: 'loopeyes', parts: { eyes: eyes.findIndex(e => e.name === name) } }, 'look');
  });

  test('a baked loop is whole plays of the move whenever anything is on its own clock', () => {
    const spec = { seed: 'loopaura', equip: [code(AURAS[0].id, 'classic')] };
    const move = animate(spec.seed, 'hop', animateOptions(spec)).duration;
    const baked = bakeGuy(spec, 'hop').delays.reduce((a, b) => a + b, 0);
    expect(baked % move).toBe(0);
    expect(baked / move).toBe(shineFit(move).repeats);
  });
});
