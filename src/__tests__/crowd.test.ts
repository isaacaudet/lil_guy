import { afterEach, beforeEach, describe, test, expect } from 'bun:test';
import { fakeCanvas, installPage, runFrame } from './fake-canvas';
import { crowdSprite, crowdSheet, CROWD_SIZES } from '../crowd';
import { resolve } from '../resolve';
import { paletteOf } from '../palette';
import { T } from '../parts/art';
import { encode } from '../owned';
import { items } from '../items';

const seeds = Array.from({ length: 200 }, (_, i) => `crowd-test-${i}`);
const colours = (s: { size: number; rgba: Uint8ClampedArray }) => {
  const out = new Set<string>();
  for (let i = 0; i < s.rgba.length; i += 4) if (s.rgba[i + 3]) out.add(`${s.rgba[i]},${s.rgba[i + 1]},${s.rgba[i + 2]}`);
  return out;
};
const hex = (c: string) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)).join(',');

test('every size is the same guy every time, square and standing on the cell floor', () => {
  for (const size of CROWD_SIZES) for (const seed of seeds.slice(0, 40)) {
    const a = crowdSprite({ seed }, size);
    expect(a.rgba.length).toBe(size * size * 4);
    expect(crowdSprite({ seed }, size).rgba).toEqual(a.rgba);
    const floor = a.rgba.subarray((size - 1) * size * 4);
    expect(floor.some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  }
});

test('his own colours: the 10 keeps his outline and eyes, the 2 is only colours he wears', () => {
  for (const seed of seeds) {
    const palette = paletteOf(resolve(seed)).colors;
    const ten = colours(crowdSprite({ seed }, 10)), full = colours(crowdSprite({ seed }, 16)), two = colours(crowdSprite({ seed }, 2));
    expect(ten.has(hex(palette[T.OUTLINE]))).toBe(true);
    expect(ten.has(hex(palette[T.EYE]))).toBe(true);
    for (const c of two) expect(full.has(c)).toBe(true);
  }
});

test('what he wears shows in the crowd', () => {
  const hat = items.find(i => i.slot === 'hat' && !i.retired && !i.free)!;
  const seed = 'crowd-hat';
  const bare = crowdSprite({ seed }, 10).rgba, dressed = crowdSprite({ seed, equip: [encode({ item: hat.id, finish: 'plain', scuff: 0.2, print: 1 })] }, 10).rgba;
  expect(dressed).not.toEqual(bare);
});

test('a sheet puts guy n at column n % columns', () => {
  const sheet = crowdSheet(seeds.slice(0, 5).map(seed => ({ seed })), 8, 2);
  expect([sheet.width, sheet.height, sheet.columns]).toEqual([16, 24, 2]);
  const third = crowdSprite({ seed: seeds[2] }, 8).rgba;
  for (let y = 0; y < 8; y++) expect(sheet.rgba.subarray(((8 + y) * 16) * 4, ((8 + y) * 16 + 8) * 4)).toEqual(third.subarray(y * 32, (y + 1) * 32));
});

import { crowdShine } from '../crowd';
import { createCrowd, crowdSeats } from '../crowd-stage';

test('a guy wearing a Prized copy or better stands out in its grade colour; plain ones and the deal alone don\'t', () => {
  const hat = items.find(i => i.slot === 'hat' && !i.retired && !i.free)!;
  const seed = 'crowd-shine';
  expect(crowdShine({ seed })).toBeNull();
  expect(crowdShine({ seed, equip: [encode({ item: hat.id, finish: 'plain', scuff: 0.2, print: 1 })] })).toBeNull();
  const gold = crowdShine({ seed, equip: [encode({ item: hat.id, finish: 'gold', scuff: 0.02, print: 1 })] })!;
  expect(gold.grade).toBe(4);
  for (const size of [10, 2] as const) {
    const shone = colours(crowdSprite({ seed, equip: [encode({ item: hat.id, finish: 'gold', scuff: 0.02, print: 1 })] }, size));
    expect(shone.has(hex(gold.color))).toBe(true);
  }
  expect(crowdShine({ seed: 'founder:isaac' })!.grade).toBe(4);
});

test('seats fill from the front middle, grow with nearness, and come out the same every time', () => {
  const seats = crowdSeats(400, 200);
  expect(crowdSeats(400, 200)).toEqual(seats);
  expect(seats.length).toBeGreaterThan(1000);
  expect(seats[0].row).toBe(Math.max(...seats.map(s => s.row)));
  expect(Math.abs(seats[0].x + seats[0].size / 2 - 200)).toBeLessThan(seats[0].size * 2);
  const byRow = new Map<number, number>();
  for (const s of seats) byRow.set(s.row, s.size);
  const sizes = [...byRow.entries()].sort((a, b) => a[0] - b[0]).map(e => e[1]);
  expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
  expect(sizes[0]).toBe(2);
  expect(crowdSeats(400, 200, 2).length).toBeGreaterThan(seats.length);
});

describe('createCrowd', () => {
  let undo = () => {};
  beforeEach(() => { undo = installPage(); });
  afterEach(() => undo());

  test('remove frees a seat for whoever waited longest past the seats, else the next to come', () => {
    const canvas = fakeCanvas(40, 20), crowd = createCrowd(canvas as unknown as HTMLCanvasElement, { scale: 1 });
    const seats = crowdSeats(40, 20), n = crowd.seats;
    expect(n).toBe(seats.length);
    // Every guy drawn once all the sprites are made, as the screen spot he's drawn at.
    const drawn = () => {
      for (let i = 0; i < 500 && runFrame(performance.now()); i++);
      canvas.calls.length = 0;
      crowd.resize();
      runFrame(performance.now());
      return canvas.calls.filter(c => c.name === 'drawImage' && c.args.length === 9).map(c => `${c.args[5]},${c.args[6]}`);
    };
    const at = (seat: number) => `${seats[seat].x},${seats[seat].y}`;
    for (let i = 0; i < n + 2; i++) crowd.add(`guy ${i}`);
    expect(crowd.count).toBe(n + 2);
    expect(drawn().length).toBe(n);

    crowd.remove('Guy 3');
    expect(crowd.has('guy 3')).toBe(false);
    expect(crowd.count).toBe(n + 1);
    crowd.remove('guy 0');
    expect(drawn().length).toBe(n);
    crowd.remove('guy 1');
    expect(crowd.count).toBe(n - 1);
    expect(drawn()).not.toContain(at(1));
    crowd.add('late');
    expect(drawn()).toContain(at(1));

    crowd.add('waits a');
    crowd.add('waits b');
    crowd.remove('waits a');
    crowd.remove('guy 5');
    expect(crowd.has('waits b')).toBe(true);
    expect(drawn().length).toBe(n);
    expect(drawn()).toContain(at(5));
  });

  test('a newcomer never takes a seat ahead of a guy already waiting', () => {
    const seats = new Set(crowdSeats(40, 20).map(s => `${s.x},${s.y}`));
    // Whether `name` is drawn once `steps` have run on a fresh crowd: a hop lifts him off his seat's spot.
    const seated = (name: string, steps: (crowd: ReturnType<typeof createCrowd>, n: number) => void) => {
      const canvas = fakeCanvas(40, 20), crowd = createCrowd(canvas as unknown as HTMLCanvasElement, { scale: 1 });
      steps(crowd, crowd.seats);
      for (let i = 0; i < 500 && runFrame(performance.now() + 2000); i++);
      crowd.hop(name);
      canvas.calls.length = 0;
      runFrame(performance.now() + 150);
      return canvas.calls.some(c => c.name === 'drawImage' && c.args.length === 9 && !seats.has(`${c.args[5]},${c.args[6]}`));
    };
    let n = 0;
    const once = (crowd: ReturnType<typeof createCrowd>, seatCount: number) => {
      n = seatCount;
      for (let i = 0; i < n + 2; i++) crowd.add(`guy ${i}`);
      crowd.remove('guy 0');
      crowd.add('newcomer');
      crowd.remove('guy 1');
    };
    expect(seated('newcomer', once)).toBe(false);
    expect(seated(`guy ${n + 1}`, once)).toBe(true);
    // A guy who leaves while waiting doesn't let a later one jump the line either.
    const twice = (crowd: ReturnType<typeof createCrowd>, seatCount: number) => {
      once(crowd, seatCount);
      crowd.add('later');
      crowd.remove('newcomer');
      crowd.add('last');
      crowd.remove('guy 2');
    };
    expect(seated('later', twice)).toBe(true);
    expect(seated('last', twice)).toBe(false);
  });
});
