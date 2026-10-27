// How many columns a picture would need past a guy's sixteen for his buddy to stand apart from
// him (a clear pixel between them in every frame of every move, `buddySpot` in src/compose.ts), on
// every head and skin. Today none has room inside sixteen, so buddies stand in front of him.
//   bun scripts/buddy-room.ts [width]x[height]
import { buddySpot, compose, FOOT_STYLES, roomFor } from '../src/compose';
import { heads } from '../src/parts';
import { items } from '../src/items';
import { BUDDY_BOX } from '../src/item-art';
import type { AvatarConfig } from '../src/types';

const [w, h] = (process.argv[2] ?? `${BUDDY_BOX.width}x${BUDDY_BOX.height}`).split('x').map(Number);
const art = Array.from({ length: h }, () => new Array<number>(w).fill(1));
const base: AvatarConfig = { head: 0, eyes: 0, mouth: 0, cheeks: 0, hair: 0, body: 0, accessory: 0, arms: 0, feet: 0, palette: 0, shade: 1, flip: false };
const bodies: [string, Partial<AvatarConfig>][] = [
  ...heads.map((head, i): [string, Partial<AvatarConfig>] => [head.name, { head: i }]),
  ...items.filter(i => i.slot === 'skin' && !i.retired).map((s): [string, Partial<AvatarConfig>] => [s.id, { skin: s.id }]),
];
const needs: Record<number, string[]> = {};
for (const [name, body] of bodies) {
  let need = -1;
  for (let extra = 0; extra <= 16 && need < 0; extra++) {
    const fits = FOOT_STYLES.every((_, feet) => {
      const still = compose({ ...base, ...body, feet }).map(row => [...row.map(Boolean), ...new Array<boolean>(extra).fill(false)]);
      return buddySpot(art, roomFor(still)).apart;
    });
    if (fits) need = extra;
  }
  (needs[need] ??= []).push(name);
}
console.log(`A ${w}x${h} buddy apart from him needs this many more columns than his sixteen:`);
for (const [n, names] of Object.entries(needs).sort((a, b) => +a[0] - +b[0])) console.log(`${n.padStart(3)}: ${names.length} (${names.slice(0, 6).join(', ')}${names.length > 6 ? ', …' : ''})`);
