// How many columns a picture needs past a guy's sixteen for his buddy to stand apart from him (a
// clear pixel between them in every frame of every move: `movesRoom` and `buddySpot` in
// src/compose.ts), on every head and skin, with every feet and arms. `BUDDY_ROOM` is the most of
// these for a `BUDDY_BOX` buddy; the 16x16 icon has none of them, so it leaves the buddy out.
//   bun scripts/buddy-room.ts [width]x[height]
import { BUDDY_ROOM, buddySpot, FOOT_STYLES, movesRoom } from '../src/compose';
import { heads } from '../src/parts';
import { items } from '../src/items';
import { BUDDY_BOX } from '../src/item-art';
import type { AvatarConfig } from '../src/types';
import { GRID_SIZE } from '../src/types';

const [w, h] = (process.argv[2] ?? `${BUDDY_BOX.width}x${BUDDY_BOX.height}`).split('x').map(Number);
const art = Array.from({ length: h }, () => new Array<number>(w).fill(1));
const base: AvatarConfig = { head: 0, eyes: 0, mouth: 0, cheeks: 0, hair: 0, body: 0, accessory: 0, arms: 0, feet: 0, palette: 0, shade: 1, flip: false, rotation: 0 };
const bodies: [string, Partial<AvatarConfig>][] = [
  ...heads.map((head, i): [string, Partial<AvatarConfig>] => [head.name, { head: i }]),
  ...items.filter(i => i.slot === 'skin' && !i.retired).map((s): [string, Partial<AvatarConfig>] => [s.id, { skin: s.id }]),
];
const needs: Record<number, string[]> = {};
for (const [name, body] of bodies) {
  let need = 0;
  for (let feet = 0; feet < FOOT_STYLES.length; feet++) for (const arms of [0, 1, 2]) {
    const room = movesRoom({ ...base, ...body, feet, arms });
    let extra = w + 2;
    while (!buddySpot(art, room.map(row => [...row, ...new Array<boolean>(GRID_SIZE + extra - row.length).fill(false)])).apart) extra++;
    need = Math.max(need, extra);
  }
  (needs[need] ??= []).push(name);
}
console.log(`A ${w}x${h} buddy apart from him needs this many more columns than his sixteen (BUDDY_ROOM is ${BUDDY_ROOM}):`);
for (const [n, names] of Object.entries(needs).sort((a, b) => +a[0] - +b[0])) console.log(`${n.padStart(3)}: ${names.length} (${names.slice(0, 6).join(', ')}${names.length > 6 ? ', …' : ''})`);
