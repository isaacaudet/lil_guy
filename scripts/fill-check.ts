// Every skin, hat and buddy under its slot's floor (src/item-fill.ts): too small to read at sixteen
// pixels. `--list` prints them as the array UNDERSIZED takes.
//   bun scripts/fill-check.ts [--list]
import { fillOf, FILL_FLOORS, underFloor, UNDERSIZED } from '../src/item-fill';
import { items } from '../src/items';

const live = items.filter(i => !i.retired && i.slot in FILL_FLOORS);
const under = live.map(i => ({ item: i, why: underFloor(i) })).filter(u => u.why.length);
if (process.argv.includes('--list')) {
  console.log(under.map(u => `  '${u.item.id}',`).join('\n'));
} else {
  for (const slot of Object.keys(FILL_FLOORS) as (keyof typeof FILL_FLOORS)[]) {
    const f = FILL_FLOORS[slot];
    const list = under.filter(u => u.item.slot === slot);
    console.log(`\n## ${slot}: ${list.length} of ${live.filter(i => i.slot === slot).length} under ${f.pixels} pixels or ${f.short}x${f.long}`);
    for (const { item, why } of list) {
      const fill = fillOf(item)!;
      console.log(`${item.id.padEnd(26)} ${item.name.padEnd(22)} ${fill.width}x${fill.height} ${fill.pixels}px  ${why.join('; ')}${UNDERSIZED.includes(item.id) ? '' : '  NEW'}`);
    }
  }
}
