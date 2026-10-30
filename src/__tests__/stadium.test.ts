import { afterEach, beforeEach, describe, test, expect } from 'bun:test';
import { VENUES, venueFor, stadiumSeats, createStadium, type StadiumSeat } from '../stadium';
import { fakeCanvas, installPage, runFrame, type FakeCanvas } from './fake-canvas';

test('every venue seats the crowd it is for, and the right one is picked for each count', () => {
  for (const v of VENUES) expect(stadiumSeats(v.id).length).toBeGreaterThanOrEqual(v.upTo);
  expect([1, 20, 21, 50, 51, 100, 150, 200, 999, 1000, 4000, 9000, 50000].map(venueFor))
    .toEqual(['porch', 'porch', 'bleachers', 'bleachers', 'gym', 'gym', 'hall', 'hall', 'arena', 'arena', 'stadium', 'bowl', 'bowl']);
});

test('seats fill the front row first, all the way round, and are the same every time', () => {
  for (const v of VENUES) {
    const seats = stadiumSeats(v.id);
    expect(stadiumSeats(v.id)).toEqual(seats);
    for (let i = 1; i < seats.length; i++) expect(seats[i].row).toBeGreaterThanOrEqual(seats[i - 1].row);
  }
});

describe('on a canvas', () => {
  let undo = () => {};
  beforeEach(() => { undo = installPage(); });
  afterEach(() => undo());
  const later = () => performance.now() + 1e6;
  // Each guy drawn this frame, as his seat's place in the fill order.
  const drawnSeats = (canvas: FakeCanvas, seats: StadiumSeat[]) => canvas.calls
    .filter(c => c.name === 'drawImage' && c.args.length === 5)
    .map(c => seats.findIndex(s => s.x === c.args[1] && s.y === c.args[2] && s.size === c.args[3]))
    .filter(i => i >= 0);

  test('the front stands fill first', () => {
    const canvas = fakeCanvas(1024, 576), stadium = createStadium(canvas as unknown as HTMLCanvasElement);
    for (let i = 0; i < 3000; i++) stadium.add(`fan ${i}`);
    expect(stadium.venue).toBe('stadium');
    const seats = stadiumSeats('stadium');
    canvas.calls.length = 0;
    runFrame(later());
    const drawn = drawnSeats(canvas, seats).sort((a, b) => a - b);
    expect(drawn.length).toBeGreaterThan(0);
    expect(drawn).toEqual(drawn.map((_, i) => i));
  });

  test('a spotlit fan shows at once, however long the queue', () => {
    const canvas = fakeCanvas(1024, 576), stadium = createStadium(canvas as unknown as HTMLCanvasElement);
    for (let i = 0; i < 3000; i++) stadium.add(`fan ${i}`);
    stadium.spotlight('fan 2999', 'fan 2999');
    canvas.calls.length = 0;
    runFrame(performance.now() + 1000);
    expect(canvas.calls.some(c => c.name === 'drawImage' && c.args.length === 5 && (c.args[3] as number) >= 32)).toBe(true);
  });

  test('a canvas smaller than the venue shows all of it; a bigger one keeps whole pixels', () => {
    const scaleOf = (w: number, h: number, fans: number) => {
      const canvas = fakeCanvas(w, h), stadium = createStadium(canvas as unknown as HTMLCanvasElement);
      for (let i = 0; i < fans; i++) stadium.add(`fan ${i}`);
      canvas.calls.length = 0;
      runFrame(later());
      return canvas.calls.find(c => c.name === 'setTransform' && c.args[0] !== 1)?.args[0] as number ?? 1;
    };
    const small = scaleOf(400, 225, 3000);
    expect(small).toBeLessThan(1);
    expect(768 * small).toBeLessThanOrEqual(400);
    expect(scaleOf(1100, 619, 3000)).toBe(1);
    expect(scaleOf(1600, 900, 3000)).toBe(2);
  });
});
