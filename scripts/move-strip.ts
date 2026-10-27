// Every frame of a move, side by side, for a few guys wearing the same things, as one PNG: to look
// at how worn things move with him (a buddy stays on the floor while he hops).
//   bun scripts/move-strip.ts <move> out.png [scale] [item ids...]
import { animate, FRAME_HEIGHT, FRAME_WIDTH, MOVES, type Move } from '../src/animate';
import { encodePng } from '../src/gif';

const [move = 'hop', out = 'strip.png', scaleArg = '6', ...equip] = process.argv.slice(2);
if (!(MOVES as readonly string[]).includes(move)) throw new Error(`No move "${move}"`);
const NAMES = ['luna', 'kai', 'Theo1', 'maya', 'ziggy'];
const anims = NAMES.map(n => animate(n, move as Move, { equip, rarity: false }));
const cols = Math.max(...anims.map(a => a.frames.length));
const C = FRAME_WIDTH + 2, R = FRAME_HEIGHT + 2, W = cols * C, H = NAMES.length * R;
const px = new Uint8ClampedArray(W * H * 4);
for (let i = 0; i < W * H; i++) px.set([236, 232, 222, 255], i * 4);
const rgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
anims.forEach((a, r) => a.frames.forEach((f, k) => f.colors.forEach((row, y) => row.forEach((c, x) => {
  if (c) px.set([...rgb(c), 255], ((r * R + 1 + y) * W + k * C + 1 + x) * 4);
}))));
await Bun.write(out, await encodePng(px, W, H, +scaleArg));
