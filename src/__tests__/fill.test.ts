import { describe, expect, test } from 'bun:test';
import { fillOf, FILL_FLOORS, underFloor, UNDERSIZED } from '../item-fill';
import { itemById, items } from '../items';

/**
 * Every skin, hat and buddy fills enough of its room to read at sixteen
 * pixels (./item-fill). The ones drawn too small before the floor came in are
 * listed in UNDERSIZED and skipped until they are redrawn.
 */
const live = items.filter(i => !i.retired && i.slot in FILL_FLOORS);

describe('items fill their room', () => {
  test('every skin, hat and buddy meets its floor, but those still to be redrawn', () => {
    const small = live.filter(i => !UNDERSIZED.includes(i.id)).map(i => ({ id: i.id, why: underFloor(i) })).filter(u => u.why.length);
    expect(small).toEqual([]);
  });

  test('UNDERSIZED names only items still under their floor: take one out once it is redrawn', () => {
    for (const id of UNDERSIZED) {
      const item = itemById(id);
      expect(item).toBeDefined();
      expect(underFloor(item!)).not.toEqual([]);
    }
  });

  test('the items the owner liked meet the floor with room to spare', () => {
    for (const id of ['weighsies.kettlebell', 'cutsies.nigiri', 'stackdle.big-l']) {
      const f = fillOf(itemById(id)!)!;
      expect(f.pixels).toBeGreaterThanOrEqual(FILL_FLOORS.skin.pixels);
      expect(underFloor(itemById(id)!)).toEqual([]);
    }
  });
});
