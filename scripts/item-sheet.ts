// A machine's items on a few different guys, as one PNG, to look at while drawing them:
// one row per item (skins on their own), on round, tall, wide and pointy heads.
//   bun scripts/item-sheet.ts <game|all> out.png [scale]
import { compose } from '../src/compose';
import { paint } from '../src/paint';
import { paletteOf } from '../src/palette';
import { heads } from '../src/parts';
import { gameItems, GAMES, withItems } from '../src/items';
import { encodePng } from '../src/gif';
import type { AvatarConfig } from '../src/types';

const [which = 'all', out = 'sheet.png', scaleArg = '6'] = process.argv.slice(2);
const games = which === 'all' ? GAMES : [which as (typeof GAMES)[number]];
const byName = (n: string) => heads.findIndex(h => h.name === n);
const HEADS = ['round', 'tower', 'chonk', 'gumdrop', 'ghost'].map(byName).filter(i => i >= 0);
const base: AvatarConfig = { head: 0, eyes: 1, mouth: 0, cheeks: 1, hair: 0, body: 0, accessory: 0, arms: 0, feet: 0, shade: 1, flip: false, lucky: false, palette: 3 };
const rows = games.flatMap(g => gameItems(g).filter(i => i.slot !== 'aura'));
const C = 18, W = (HEADS.length + 1) * C, H = rows.length * C;
const px = new Uint8ClampedArray(W * H * 4);
for (let i = 0; i < W * H; i++) px.set([236, 232, 222, 255], i * 4);
const rgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
rows.forEach((item, r) => HEADS.forEach((head, k) => {
  const cfg: AvatarConfig = { ...base, head, palette: (k * 3) % 8, [item.slot]: item.id };
  const colors = paint(compose(cfg), cfg, withItems(paletteOf(cfg), cfg));
  colors.forEach((row, y) => row.forEach((c, x) => { if (c) px.set([...rgb(c), 255], ((r * C + 1 + y) * W + (k + 1) * C + 1 + x) * 4); }));
}));
// The first column marks each row's slot by colour: skin, hat, frame, buddy.
const SLOT: Record<string, number[]> = { skin: [255, 126, 182], hat: [95, 180, 255], frame: [116, 217, 124], buddy: [255, 212, 71] };
rows.forEach((item, r) => { for (let y = 4; y < 14; y++) for (let x = 4; x < 14; x++) px.set([...(SLOT[item.slot] ?? [0, 0, 0]), 255], ((r * C + y) * W + x) * 4); });
await Bun.write(out, await encodePng(px, W, H, +scaleArg));
console.log(rows.map((i, r) => `${r + 1}. ${i.slot} ${i.id} ${i.name}`).join('\n'));
