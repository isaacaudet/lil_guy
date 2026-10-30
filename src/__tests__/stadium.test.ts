import { test, expect } from 'bun:test';
import { VENUES, venueFor, stadiumSeats } from '../stadium';

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
