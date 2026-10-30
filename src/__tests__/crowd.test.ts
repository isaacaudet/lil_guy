import { afterEach, beforeEach, describe, test, expect } from 'bun:test';
import { fakeCanvas, installPage, made, runFrame, type FakeCanvas } from './fake-canvas';
import { sheetCanvases } from '../crowd-render';
import { crowdSprite, crowdSheet, crowdLook, crowdSpriteOf, CROWD_SIZES, type CrowdSize } from '../crowd';
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

test('their own colours: the 10 keeps the outline and eyes, the 2 is only colours they wear', () => {
  for (const seed of seeds) {
    const palette = paletteOf(resolve(seed)).colors;
    const ten = colours(crowdSprite({ seed }, 10)), full = colours(crowdSprite({ seed }, 16)), two = colours(crowdSprite({ seed }, 2));
    expect(ten.has(hex(palette[T.OUTLINE]))).toBe(true);
    expect(ten.has(hex(palette[T.EYE]))).toBe(true);
    for (const c of two) expect(full.has(c)).toBe(true);
  }
});

test('what a guy wears shows in the crowd', () => {
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
import { createCrowd, crowdSeats, crowdPicture } from '../crowd-stage';

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

test('a look worked out once draws the same sprites as crowdSprite', () => {
  for (const seed of seeds.slice(0, 20)) {
    const look = crowdLook({ seed });
    for (const size of CROWD_SIZES) expect(crowdSpriteOf(look, size).rgba).toEqual(crowdSprite({ seed }, size).rgba);
  }
});

test('small faces keep their eyes apart: never two eye cells side by side', () => {
  for (const seed of seeds) {
    const look = crowdLook({ seed }), eye = hex(look.eye);
    // A guy painted in their eye colour elsewhere (a pale body with pale eyes) can't be told apart this way.
    const full = crowdSprite({ seed }, 16).rgba;
    let painted = 0;
    for (let i = 0; i < full.length; i += 4) if (full[i + 3] && `${full[i]},${full[i + 1]},${full[i + 2]}` === eye) painted++;
    if (painted > 12) continue;
    for (const size of [8, 6, 5] as const) {
      const s = crowdSprite({ seed }, size), at = (x: number, y: number) => { const o = (y * size + x) * 4; return s.rgba[o + 3] ? `${s.rgba[o]},${s.rgba[o + 1]},${s.rgba[o + 2]}` : ''; };
      for (let y = 0; y < size; y++) for (let x = 0; x + 1 < size; x++) expect(at(x, y) === eye && at(x + 1, y) === eye).toBe(false);
    }
  }
});

test('at 14 and 12 a guy keeps their eyes and mouth as drawn at 16', () => {
  let kept = 0;
  for (const seed of seeds.slice(0, 80)) {
    const look = crowdLook({ seed }), S = look.side;
    const face = new Map<string, number>();
    for (let i = 0; i < S * S; i++) if (look.face[i] && look.painted[i]) { const c = hex(look.inks[look.painted[i]]); face.set(c, (face.get(c) ?? 0) + 1); }
    // Colours used only by the face, so each count is the face's own.
    const full = crowdSprite({ seed }, 16), counts = (s: { rgba: Uint8ClampedArray }) => { const m = new Map<string, number>(); for (let i = 0; i < s.rgba.length; i += 4) if (s.rgba[i + 3]) { const c = `${s.rgba[i]},${s.rgba[i + 1]},${s.rgba[i + 2]}`; m.set(c, (m.get(c) ?? 0) + 1); } return m; };
    const at16 = counts(full), own = [...face].filter(([c, n]) => at16.get(c) === n);
    if (!own.length) continue;
    for (const size of [14, 12] as const) {
      const small = counts(crowdSprite({ seed }, size));
      if (own.every(([c, n]) => small.get(c) === n)) kept++;
    }
  }
  expect(kept).toBeGreaterThanOrEqual(120);
});

test('far guys are a small shape in their own colours: a 5 is a face with two eyes over a darker band, a 3 a head over shoulders', () => {
  for (const seed of seeds.slice(0, 60)) {
    const look = crowdLook({ seed });
    const five = crowdSprite({ seed }, 5), cell = (s: { rgba: Uint8ClampedArray }, n: number, x: number, y: number) => { const o = (y * n + x) * 4; return s.rgba[o + 3] ? [s.rgba[o], s.rgba[o + 1], s.rgba[o + 2]] : null; };
    expect(cell(five, 5, 1, 2)?.join(',')).toBe(hex(look.eye));
    expect(cell(five, 5, 3, 2)?.join(',')).toBe(hex(look.eye));
    // Their top follows their outline, so it differs guy to guy, but it is never wider than the face under it.
    expect([0, 1, 2, 3, 4].some(x => cell(five, 5, x, 0))).toBe(true);
    expect([0, 1, 2, 3, 4].every(x => cell(five, 5, x, 1))).toBe(true);
    const body = cell(five, 5, 2, 3)!, band = cell(five, 5, 2, 4)!;
    expect(band.reduce((a, b) => a + b, 0)).toBeLessThan(body.reduce((a, b) => a + b, 0));
    const three = crowdSprite({ seed }, 3);
    expect([0, 1, 2].some(x => cell(three, 3, x, 0))).toBe(true);
    expect(cell(three, 3, 1, 2)!.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(cell(three, 3, 1, 1)!.reduce((a, b) => a + b, 0));
  }
});

test('a crowd\'s front row stands on the bottom edge: every seat at least three quarters on, the first wholly', () => {
  for (const [w, h] of [[320, 120], [195, 150], [640, 360], [427, 240], [40, 20], [130, 73]]) {
    const seats = crowdSeats(w, h);
    expect(seats.length).toBeGreaterThan(0);
    for (const s of seats) {
      expect(s.y + s.size).toBeLessThanOrEqual(h + s.size / 4);
      expect(s.y).toBeGreaterThanOrEqual(-s.size / 4);
    }
    const first = seats[0];
    expect(first.x).toBeGreaterThanOrEqual(0);
    expect(first.x + first.size).toBeLessThanOrEqual(w);
    expect(first.y + first.size).toBeLessThanOrEqual(h);
    expect(first.y + first.size).toBeGreaterThanOrEqual(h - 2);
  }
});

test('neighbouring rows of a crowd differ by one size at most', () => {
  const ladder: CrowdSize[] = [16, 14, 12, 10, 8, 6, 5, 3, 2];
  for (const [w, h] of [[400, 200], [640, 360], [195, 150]]) {
    const byRow = new Map<number, CrowdSize>();
    for (const s of crowdSeats(w, h)) byRow.set(s.row, s.size);
    const sizes = [...byRow.entries()].sort((a, b) => a[0] - b[0]).map(e => ladder.indexOf(e[1]));
    for (let i = 1; i < sizes.length; i++) expect(Math.abs(sizes[i] - sizes[i - 1])).toBeLessThanOrEqual(1);
  }
});

/** Sprites drawn on `c`: copies out of a sheet of one crowd size, as where they landed. */
const spriteDraws = (c: FakeCanvas) => c.calls.filter(k => k.name === 'drawImage' && k.args.length === 9 && sheetCanvases.has(k.args[0] as object))
  .map(k => `${k.args[5]},${k.args[6]}`);

describe('createCrowd', () => {
  let undo = () => {};
  beforeEach(() => { undo = installPage(); });
  afterEach(() => undo());

  // Everyone sitting, as seat spots: what the latest rows' sheet has drawn once the picture is made again.
  const seated = (canvas: FakeCanvas, crowd: ReturnType<typeof createCrowd>) => {
    for (let i = 0; i < 500 && runFrame(performance.now() + 2000); i++);
    crowd.resize();
    runFrame(performance.now() + 2000);
    const rows = made.filter(c => c.width === 2048).pop()!;
    return [...new Set(spriteDraws(rows))];
  };

  test('remove frees a seat for whoever waited longest past the seats, else the next to come', () => {
    const canvas = fakeCanvas(80, 40), crowd = createCrowd(canvas as unknown as HTMLCanvasElement, { scale: 1 });
    const seats = crowdSeats(80, 40), n = crowd.seats;
    expect(n).toBe(seats.length);
    const at = (seat: number) => `${seats[seat].x},${seats[seat].y}`;
    for (let i = 0; i < n + 2; i++) crowd.add(`guy ${i}`);
    expect(crowd.count).toBe(n + 2);
    expect(seated(canvas, crowd).length).toBe(n);

    crowd.remove('Guy 3');
    expect(crowd.has('guy 3')).toBe(false);
    expect(crowd.count).toBe(n + 1);
    crowd.remove('guy 0');
    expect(seated(canvas, crowd).length).toBe(n);
    crowd.remove('guy 1');
    expect(crowd.count).toBe(n - 1);
    expect(seated(canvas, crowd)).not.toContain(at(1));
    crowd.add('late');
    expect(seated(canvas, crowd)).toContain(at(1));

    crowd.add('waits a');
    crowd.add('waits b');
    crowd.remove('waits a');
    crowd.remove('guy 5');
    expect(crowd.has('waits b')).toBe(true);
    expect(seated(canvas, crowd).length).toBe(n);
    expect(seated(canvas, crowd)).toContain(at(5));
  });

  test('a newcomer never takes a seat ahead of a guy already waiting', () => {
    const seats = new Set(crowdSeats(80, 40).map(s => `${s.x},${s.y}`));
    // Whether `name` is drawn once `steps` have run on a fresh crowd: a hop lifts them off their seat's spot.
    const isSeated = (name: string, steps: (crowd: ReturnType<typeof createCrowd>, n: number) => void) => {
      const canvas = fakeCanvas(80, 40), crowd = createCrowd(canvas as unknown as HTMLCanvasElement, { scale: 1 });
      steps(crowd, crowd.seats);
      for (let i = 0; i < 500 && runFrame(performance.now() + 2000); i++);
      crowd.hop(name);
      canvas.calls.length = 0;
      runFrame(performance.now() + 150);
      return spriteDraws(canvas).some(p => !seats.has(p));
    };
    let n = 0;
    const once = (crowd: ReturnType<typeof createCrowd>, seatCount: number) => {
      n = seatCount;
      for (let i = 0; i < n + 2; i++) crowd.add(`guy ${i}`);
      crowd.remove('guy 0');
      crowd.add('newcomer');
      crowd.remove('guy 1');
    };
    expect(isSeated('newcomer', once)).toBe(false);
    expect(isSeated(`guy ${n + 1}`, once)).toBe(true);
    // A guy who leaves while waiting doesn't let a later one jump the line either.
    const twice = (crowd: ReturnType<typeof createCrowd>, seatCount: number) => {
      once(crowd, seatCount);
      crowd.add('later');
      crowd.remove('newcomer');
      crowd.add('last');
      crowd.remove('guy 2');
    };
    expect(isSeated('later', twice)).toBe(true);
    expect(isSeated('last', twice)).toBe(false);
  });

  test('a few guys are drawn big; as more come the crowd zooms out so they all have seats', () => {
    const canvas = fakeCanvas(1280, 720), crowd = createCrowd(canvas as unknown as HTMLCanvasElement);
    for (let i = 0; i < 20; i++) crowd.add(`guy ${i}`);
    const few = crowd.seats;
    expect(few).toBeGreaterThanOrEqual(20);
    expect(few).toBeLessThan(200);
    for (let i = 20; i < 2000; i++) crowd.add(`guy ${i}`);
    expect(crowd.seats).toBeGreaterThanOrEqual(2000);
    // Never smaller than the default scale (3 from 900 CSS pixels): past those seats, the rest wait.
    const fixed = createCrowd(fakeCanvas(1280, 720) as unknown as HTMLCanvasElement, { scale: 3 });
    for (let i = 0; i < 20; i++) fixed.add(`guy ${i}`);
    expect(fixed.seats).toBe(crowdSeats(427, 240).length);
  });

  test('someone without a seat can still be spotlit: they rise from the bottom, big', () => {
    const canvas = fakeCanvas(200, 60), crowd = createCrowd(canvas as unknown as HTMLCanvasElement, { scale: 4 });
    for (let i = 0; i < 400; i++) crowd.add(`g${i}`);
    expect(crowd.seats).toBeLessThan(400);
    crowd.spotlight('g399', 'g399 · 12');
    canvas.calls.length = 0;
    runFrame(performance.now() + 1200);
    expect(canvas.calls.some(k => k.name === 'drawImage' && k.args.length === 9 && (k.args[0] as FakeCanvas).width === 16 && (k.args[7] as number) >= 16)).toBe(true);
    expect(canvas.calls.some(k => k.name === 'fillText')).toBe(true);
  });

  test('the canvas stays see-through where nobody stands: nothing is painted over it', () => {
    const canvas = fakeCanvas(320, 180), crowd = createCrowd(canvas as unknown as HTMLCanvasElement, { backdrop: '#f6f1e7' });
    for (let i = 0; i < 40; i++) crowd.add(`guy ${i}`);
    for (let i = 0; i < 300 && runFrame(performance.now() + 2000); i++);
    for (const c of made) expect(c.calls.some(k => k.name === 'fillRect')).toBe(false);
  });
});

test('a crowd picture is opaque, on its backdrop where nobody stands', () => {
  const rgba = crowdPicture([{ seed: 'a' }, { seed: 'b' }], 80, 40, { backdrop: '#102030', fill: 10 });
  expect(rgba.length).toBe(80 * 40 * 4);
  for (let i = 3; i < rgba.length; i += 4) expect(rgba[i]).toBe(255);
  expect([...rgba.subarray(0, 3)]).toEqual([0x10, 0x20, 0x30]);
});
