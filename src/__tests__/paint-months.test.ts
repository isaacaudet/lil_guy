import { test, expect } from 'bun:test';
import { PAINT_IDS, paintOnSale, paintsOnSale, paintMonth, paintCost, LIMITED_PAINT_COST } from '../paints';

test('paints of the month are on sale in their month only and cost more; the shelf never changes', () => {
  const shelf = PAINT_IDS.filter(p => !paintMonth(p));
  expect(paintsOnSale('2026-10-29')).toEqual(shelf);
  expect(paintsOnSale('2026-11-02')).toEqual([...shelf, 'frostbite', 'last-ember']);
  expect(paintOnSale('frostbite', '2026-12-01')).toBe(false);
  expect(paintCost('frostbite', 3)).toBe(LIMITED_PAINT_COST);
  expect(paintCost('mint', 3)).toBe(3);
  expect(PAINT_IDS.slice(0, 12)).toEqual(['lack-of-hue', 'abundance', 'pure-gold', 'pink-as-heck', 'noble-violet', 'zesty-lime', 'deep-sea', 'club-orange', 'team-red', 'team-blue', 'mint', 'clear-skies']);
});
