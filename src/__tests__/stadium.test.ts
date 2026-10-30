import { afterEach, beforeEach, describe, test, expect } from 'bun:test';
import { VENUES, venueFor, stadiumSeats, createStadium, type VenueId } from '../stadium';
import { CROWD_SIZES } from '../crowd';
import { fakeCanvas, installPage, made, runFrame, type FakeCanvas } from './fake-canvas';
import { sheetCanvases } from '../crowd-render';

const LADDER = [16, 14, 12, 10, 8, 6, 5, 3, 2];
const CANVASES: [number, number, number][] = [[1280, 720, 1], [1920, 1080, 1], [640, 240, 2], [390, 300, 3], [390, 300, 1.25]];

test('every venue seats the crowd it is for, and the right one is picked for each count', () => {
  for (const v of VENUES) expect(stadiumSeats(v.id).length).toBeGreaterThanOrEqual(v.upTo);
  expect([1, 20, 21, 50, 51, 100, 150, 200, 999, 1000, 4000, 9000, 50000].map(venueFor))
    .toEqual(['porch', 'porch', 'bleachers', 'bleachers', 'gym', 'gym', 'hall', 'hall', 'arena', 'arena', 'stadium', 'bowl', 'bowl']);
});

test('seats fill the front row first, from its middle out, and are the same every time', () => {
  for (const v of VENUES) for (const [width, height, dpr] of CANVASES) {
    const seats = stadiumSeats(v.id, { width, height, dpr });
    expect(stadiumSeats(v.id, { width, height, dpr })).toEqual(seats);
    for (let i = 1; i < seats.length; i++) expect(seats[i].row).toBeGreaterThanOrEqual(seats[i - 1].row);
    // The first to come sit in the middle, never out at the ends where a crop would lose them.
    const world = Math.max(...seats.map(s => s.x + s.size));
    expect(Math.abs(seats[0].x + seats[0].size / 2 - world / 2)).toBeLessThanOrEqual(world * 0.1);
  }
});

test('the seats are the people present: a venue is laid out for the crowd in it, not for more', () => {
  for (const [id, counts] of [['gym', [60, 100]], ['arena', [300, 800]], ['stadium', [2000, 4500]], ['bowl', [6000, 11000]]] as [VenueId, number[]][]) {
    for (const count of counts) for (const [width, height, dpr] of CANVASES.slice(0, 3)) {
      const n = stadiumSeats(id, { width, height, dpr, count }).length;
      expect(n).toBeGreaterThanOrEqual(count);
      expect(n).toBeLessThanOrEqual(count * 1.2 + 260);
    }
  }
});

test("a canvas the page didn't size (300 × 150) still seats ten thousand: up into the roof, over the floor, then packed", () => {
  for (const [id, count] of [['stadium', 5000], ['bowl', 10000]] as [VenueId, number][]) {
    expect(stadiumSeats(id, { width: 300, height: 150, count }).length).toBeGreaterThanOrEqual(count);
  }
});

test('rows shrink going back, a size at a time', () => {
  for (const v of VENUES) for (const [width, height, dpr] of CANVASES) {
    const byRow = new Map<number, number>();
    for (const s of stadiumSeats(v.id, { width, height, dpr })) byRow.set(s.row, s.size);
    const sizes = [...byRow.entries()].sort((a, b) => a[0] - b[0]).map(e => LADDER.indexOf(e[1]));
    for (let i = 1; i < sizes.length; i++) expect([0, 1]).toContain(sizes[i] - sizes[i - 1]);
  }
});

test('a bigger screen never draws the front row smaller: more of each guy, not a bigger zoom of less', () => {
  for (const v of VENUES) {
    const at = (width: number, height: number) => stadiumSeats(v.id, { width, height })[0].size;
    expect(at(1920, 1080)).toBeGreaterThanOrEqual(at(1168, 657));
    expect(at(2560, 1440)).toBeGreaterThanOrEqual(at(1920, 1080));
  }
});

test('on a tall canvas the rows arc gently, never a dome', () => {
  for (const v of VENUES) {
    const seats = stadiumSeats(v.id, { width: 390, height: 844, dpr: 3 }), front = seats.filter(s => s.row === 0);
    const feet = front.map(s => s.y + s.size), width = Math.max(...seats.map(s => s.x + s.size));
    expect(Math.max(...feet) - Math.min(...feet)).toBeLessThanOrEqual(width * 0.12 + 2);
  }
  // The porch keeps to its few steps, wider rows before more of them.
  expect(new Set(stadiumSeats('porch', { width: 390, height: 844, dpr: 3 }).map(s => s.row)).size).toBeLessThanOrEqual(3);
});

/** Sprites drawn on `c`: copies out of a sheet of one crowd size, as [x, y, side]. */
const spriteDraws = (c: FakeCanvas) => c.calls.filter(k => k.name === 'drawImage' && k.args.length === 9 && sheetCanvases.has(k.args[0] as object))
  .map(k => [k.args[5], k.args[6], k.args[7]] as number[]);

describe('on a canvas', () => {
  let undo = () => {};
  const dpr0 = globalThis.devicePixelRatio;
  beforeEach(() => { undo = installPage(); });
  afterEach(() => { undo(); (globalThis as { devicePixelRatio?: number }).devicePixelRatio = dpr0; });
  const later = () => performance.now() + 1e6;
  const settle = () => { for (let i = 0; i < 3000 && runFrame(later()); i++); };

  test('the venue covers the canvas at whole device pixels, whatever its shape, with no bars', () => {
    for (const [w, h, dpr] of CANVASES) for (const people of [12, 80, 600, 3000]) {
      (globalThis as { devicePixelRatio?: number }).devicePixelRatio = dpr;
      const canvas = fakeCanvas(w, h), stadium = createStadium(canvas as unknown as HTMLCanvasElement);
      for (let i = 0; i < people; i++) stadium.add(`fan ${i}`);
      canvas.calls.length = 0;
      runFrame(later());
      expect([canvas.width, canvas.height]).toEqual([Math.round(w * dpr), Math.round(h * dpr)]);
      const at = canvas.calls.findIndex(c => c.name === 'drawImage' && c.args.length === 3);
      const [k, , , , ox, oy] = canvas.calls.slice(0, at).filter(c => c.name === 'setTransform').pop()!.args as number[];
      const still = canvas.calls[at].args[0] as FakeCanvas;
      expect(Number.isInteger(k) && k >= 1).toBe(true);
      expect(ox).toBeLessThanOrEqual(0);
      expect(oy).toBeLessThanOrEqual(0);
      expect(ox + still.width * k).toBeGreaterThanOrEqual(canvas.width);
      expect(oy + still.height * k).toBeGreaterThanOrEqual(canvas.height);
      expect(canvas.calls.some(c => c.name === 'fillRect')).toBe(false);
      stadium.destroy();
    }
  });

  test('every venue picture is painted to its edges', () => {
    const canvas = fakeCanvas(640, 360), seen = new Set<string>();
    const stadium = createStadium(canvas as unknown as HTMLCanvasElement, { onVenue: id => seen.add(id) });
    for (const v of VENUES) {
      while (stadium.count < v.upTo) stadium.add(`fan ${stadium.count}`);
      expect(stadium.venue).toBe(v.id);
      // The venue is laid out again at the next frame, and a big crowd's painted at the one after.
      runFrame(later());
      runFrame(later());
    }
    expect(seen.size).toBe(VENUES.length - 1);
    const pictures = made.filter(c => !sheetCanvases.has(c)).flatMap(c => c.calls.filter(k => k.name === 'putImageData' && (k.args[0] as { width: number }).width === c.width && (k.args[0] as { height: number }).height === c.height && c.width !== c.height));
    expect(pictures.length).toBeGreaterThanOrEqual(VENUES.length);
    for (const p of pictures) {
      const data = (p.args[0] as { data: Uint8ClampedArray }).data;
      for (let i = 3; i < data.length; i += 4) if (data[i] !== 255) throw new Error('a see-through pixel in a venue picture');
    }
  });

  test('the front stands fill first', () => {
    const canvas = fakeCanvas(1024, 576), stadium = createStadium(canvas as unknown as HTMLCanvasElement);
    for (let i = 0; i < 3000; i++) stadium.add(`fan ${i}`);
    expect(stadium.venue).toBe('stadium');
    settle();
    const seats = stadiumSeats('stadium', { width: 1024, height: 576, count: 3000 }).map(s => `${s.x},${s.y}`);
    const rows = made.filter(c => c.width === 2048).pop()!;
    const drawn = [...new Set(spriteDraws(rows).map(([x, y]) => `${x},${y}`))].map(p => seats.indexOf(p)).sort((a, b) => a - b);
    expect(drawn.length).toBe(3000);
    expect(drawn).toEqual(drawn.map((_, i) => i));
  });

  test('a spotlit fan shows at once, big, however long the queue', () => {
    const canvas = fakeCanvas(1024, 576), stadium = createStadium(canvas as unknown as HTMLCanvasElement);
    for (let i = 0; i < 3000; i++) stadium.add(`fan ${i}`);
    stadium.spotlight('fan 2999', 'fan 2999');
    canvas.calls.length = 0;
    runFrame(performance.now() + 1500);
    // Their own 16-pixel drawing, at a whole scale.
    expect(canvas.calls.some(k => k.name === 'drawImage' && k.args.length === 9 && (k.args[0] as FakeCanvas).width === 16 && (k.args[7] as number) >= 64 && (k.args[7] as number) % 16 === 0)).toBe(true);
  });

  test("a spotlit fan's line stays on a phone's canvas, shortened but keeping the score", () => {
    (globalThis as { devicePixelRatio?: number }).devicePixelRatio = 3;
    const canvas = fakeCanvas(390, 300), stadium = createStadium(canvas as unknown as HTMLCanvasElement);
    for (let i = 0; i < 300; i++) stadium.add(`fan ${i}`);
    stadium.spotlight('fan 7', 'a_really_long_twitch_name_straight_from_chat · 97');
    canvas.calls.length = 0;
    runFrame(performance.now() + 1500);
    const [x, y, w, h] = canvas.calls.find(c => c.name === 'roundRect')!.args as number[];
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x + w).toBeLessThanOrEqual(390);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y + h).toBeLessThanOrEqual(300);
    const line = canvas.calls.find(c => c.name === 'fillText')!.args[0] as string;
    expect(line.endsWith('… · 97')).toBe(true);
  });

  test('the wave, hops and a spotlight keep every frame coming, at every venue', () => {
    for (const people of [12, 40, 90, 180, 800, 3000]) {
      const canvas = fakeCanvas(640, 360), stadium = createStadium(canvas as unknown as HTMLCanvasElement, { wave: true });
      for (let i = 0; i < people; i++) stadium.add(`fan ${i}`);
      const t0 = performance.now() + 2000;
      for (let f = 0; f < 400; f++) {
        if (f % 7 === 0) for (let h = 0; h < 6; h++) stadium.hop(`fan ${(f * 13 + h * 7) % people}`);
        if (f === 100) stadium.spotlight(`fan ${people - 1}`, 'closest · 42');
        expect(runFrame(t0 + f * 16)).toBe(true);
      }
      stadium.destroy();
    }
  });

  test('adding people lays the venue out once, at the next frame, and a big crowd paints it at the one after', () => {
    const canvas = fakeCanvas(800, 450), stadium = createStadium(canvas as unknown as HTMLCanvasElement);
    runFrame(later());
    const pictures = () => made.filter(c => !sheetCanvases.has(c) && c.calls.some(k => k.name === 'putImageData' && (k.args[0] as { width: number }).width === c.width)).length;
    const before = pictures();
    for (let i = 0; i < 900; i++) stadium.add(`fan ${i}`);
    expect(stadium.venue).toBe('arena');
    expect(pictures()).toBe(before);
    runFrame(later());
    expect(pictures()).toBe(before);
    runFrame(later());
    expect(pictures()).toBe(before + 1);
    runFrame(later());
    expect(pictures()).toBe(before + 1);
  });

  test('a frame redraws only where something moved: the picture is copied whole only after a new layout', () => {
    const canvas = fakeCanvas(800, 450), stadium = createStadium(canvas as unknown as HTMLCanvasElement);
    for (let i = 0; i < 600; i++) stadium.add(`fan ${i}`);
    for (let i = 0; i < 3000 && runFrame(performance.now()); i++);
    stadium.hop('fan 5');
    canvas.calls.length = 0;
    runFrame(performance.now() + 50);
    const draws = canvas.calls.filter(k => k.name === 'drawImage');
    expect(draws.some(k => k.args.length === 3)).toBe(false);
    expect(draws.length).toBeGreaterThan(0);
    expect(canvas.calls.filter(k => k.name === 'clip').length).toBeLessThanOrEqual(3);
  });

  test('a canvas too small for a single row still makes a venue, and a crowd on it', () => {
    for (const [w, h] of [[300, 1], [300, 2], [1, 1], [3, 3], [6, 300], [10, 6]]) {
      const canvas = fakeCanvas(w, h), stadium = createStadium(canvas as unknown as HTMLCanvasElement, { wave: true });
      for (let i = 0; i < 1200; i++) stadium.add(`fan ${i}`);
      for (let f = 0; f < 20; f++) runFrame(later());
      stadium.spotlight('fan 1100', 'fan · 1');
      for (let f = 0; f < 20; f++) runFrame(later());
      stadium.destroy();
    }
  });

  test('the venue shrinks again as people leave', () => {
    const canvas = fakeCanvas(800, 450), stadium = createStadium(canvas as unknown as HTMLCanvasElement);
    for (let i = 0; i < 120; i++) stadium.add(`fan ${i}`);
    expect(stadium.venue).toBe('hall');
    for (let i = 119; i >= 15; i--) stadium.remove(`Fan ${i}`);
    expect(stadium.count).toBe(15);
    expect(stadium.venue).toBe('porch');
    settle();
    expect(stadium.has('fan 3')).toBe(true);
  });
});
