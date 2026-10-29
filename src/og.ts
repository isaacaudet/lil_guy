import { cardArtFrames } from './card';
import { GLYPHS } from './font';
import { GRADES } from './owned';
import { animateOptions, bakeGuy, cardInputOf, faceSpec, type CardSpec } from './bake';
import type { Frames } from './gif';

/**
 * Link previews: what Discord, iMessage, X and the rest show for a shared link, 1200 × 630 and still.
 * Each is drawn on a 400 × 210 grid of pixels and scaled up three times, so the guy, the frame and the
 * words are one pixel size and stay sharp. The words are m6x11plus, the site's and the card's pixel type.
 *
 * A guy's preview is his big card turned on its side: a wide window on his own backdrop with him big in
 * it, aura and all, and under it a tall panel with his name, his rank in its colour and his rarest trait.
 * The site's preview is the same card with a few guys in the window and what lil guys is under them.
 */

/** A link preview's width. */
export const OG_WIDTH = 1200;
/** A link preview's height. */
export const OG_HEIGHT = 630;
const SCALE = 3, W = OG_WIDTH / SCALE, H = OG_HEIGHT / SCALE;

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const TABLE: RGB = [19, 23, 38], PLATE: RGB = [38, 34, 52], INK: RGB = [24, 20, 31], IVORY: RGB = [246, 240, 227];
const QUIET: RGB = [170, 166, 190], GOLD: RGB = [245, 177, 67], PLAIN: RGB = [104, 118, 146];
const SITE = 'lilguys.dleclub.com';

// The glyphs the font's ASCII lacks, in its own style (as the card has them).
const EXTRA: Record<string, [number, number[]]> = {
  '·': [5, [0, 0, 0, 0, 0, 0, 6, 6, 0, 0, 0, 0, 0, 0, 0, 0]],
  '’': [3, [0, 0, 3, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
};
const glyph = (ch: string) => EXTRA[ch] ?? GLYPHS[ch] ?? GLYPHS['?'];
const wide = (s: string, size = 1) => ([...s].reduce((w, ch) => w + glyph(ch)[0], 0) - 1) * size;

/** The 400 × 210 grid a preview is drawn on. */
class Grid {
  readonly px = new Uint8ClampedArray(W * H * 4);
  set(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    this.px[i] = c[0]; this.px[i + 1] = c[1]; this.px[i + 2] = c[2]; this.px[i + 3] = 255;
  }
  rect(x: number, y: number, w: number, h: number, c: RGB): void { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  /** A box with its corners cut `r` pixels in, the way the card's pixel corners go. */
  box(x: number, y: number, w: number, h: number, r: number, c: RGB): void {
    for (let j = 0; j < h; j++) {
      const k = j < r ? r - j : j >= h - r ? j - (h - r) + 1 : 0;
      for (let i = k; i < w - k; i++) this.set(x + i, y + j, c);
    }
  }
  /** Pixels from a frame (RGBA, w × h), each `s` across; see-through ones left as they are. */
  blit(src: Uint8ClampedArray, w: number, h: number, x: number, y: number, s = 1): void {
    for (let sy = 0; sy < h; sy++) for (let sx = 0; sx < w; sx++) {
      const i = (sy * w + sx) * 4;
      if (src[i + 3] < 128) continue;
      for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) this.set(x + sx * s + dx, y + sy * s + dy, [src[i], src[i + 1], src[i + 2]]);
    }
  }
  /** Words in the pixel type, each font pixel `size` across, over a hard shadow a pixel down. */
  text(s: string, x: number, top: number, c: RGB, size = 1, shadow: RGB | null = INK): void {
    const draw = (ox: number, oy: number, col: RGB) => {
      let cx = ox;
      for (const ch of s) {
        const [adv, rows] = glyph(ch);
        rows.forEach((bits, dy) => {
          for (let dx = 0; bits >> dx; dx++) if (bits & (1 << dx)) for (let a = 0; a < size; a++) for (let b = 0; b < size; b++) this.set(cx + dx * size + a, oy + dy * size + b, col);
        });
        cx += adv * size;
      }
    };
    if (shadow) draw(x, top + size, shadow);
    draw(x, top, c);
  }
  frames(): Frames {
    const out = new Uint8ClampedArray(OG_WIDTH * OG_HEIGHT * 4);
    for (let y = 0; y < OG_HEIGHT; y++) {
      const row = ((y / SCALE) | 0) * W;
      for (let x = 0; x < OG_WIDTH; x++) {
        const i = (row + ((x / SCALE) | 0)) * 4, o = (y * OG_WIDTH + x) * 4;
        out[o] = this.px[i]; out[o + 1] = this.px[i + 1]; out[o + 2] = this.px[i + 2]; out[o + 3] = 255;
      }
    }
    return { width: OG_WIDTH, height: OG_HEIGHT, frames: [out], delays: [1000] };
  }
}

// The card on its side: a rim in his rank's colour on the dark table, the window over the panel.
const RIM = 4, WIN_TOP = 8, WIN_H = 128, PANEL_TOP = WIN_TOP + WIN_H + 3;

/** The frame round everything: the table, the card's rim in `rim`, its dark plate, and the window's dark edge. */
function card(g: Grid, rim: RGB): void {
  g.rect(0, 0, W, H, TABLE);
  g.box(RIM - 2, RIM - 2, W - (RIM - 2) * 2, H - (RIM - 2) * 2, 4, INK);
  g.box(RIM - 1, RIM - 1, W - (RIM - 1) * 2, H - (RIM - 1) * 2, 3, rim);
  g.box(RIM + 1, RIM + 1, W - (RIM + 1) * 2, H - (RIM + 1) * 2, 2, PLATE);
  // a lighter line along the rim's top edge, the bevel the card has
  g.rect(RIM + 2, RIM - 1, W - (RIM + 2) * 2, 1, mix(rim, IVORY, .45));
  g.rect(7, WIN_TOP - 1, W - 14, WIN_H + 2, INK);
}

/**
 * A window `WIN_H` tall across the card, on his backdrop: each row the colour the card's window `art` has
 * just inside its edges, so the window reads as his card's. Him five times his size in the middle,
 * standing on a soft shadow.
 */
function window(g: Grid, art: Frames, guy: Frames): void {
  // the top and bottom of his window, each the average of a few rows' edges, blended top to bottom, so a
  // sheen running across the card's window doesn't turn into stripes when it's drawn wide
  const f = art.frames[0];
  const band = (from: number, to: number): RGB => {
    const sum: RGB = [0, 0, 0];
    let n = 0;
    for (let y = from; y < to; y++) for (const x of [4, 5, 6, art.width - 7, art.width - 6, art.width - 5]) {
      const i = (y * art.width + x) * 4;
      sum[0] += f[i]; sum[1] += f[i + 1]; sum[2] += f[i + 2]; n++;
    }
    return [sum[0] / n, sum[1] / n, sum[2] / n];
  };
  const top = band(3, 14), bottom = band(art.height - 14, art.height - 3);
  for (let y = 0; y < WIN_H; y++) g.rect(8, WIN_TOP + y, W - 16, 1, mix(top, bottom, y / (WIN_H - 1)));
  const s = 5, x = Math.round((W - guy.width * s) / 2), y = WIN_TOP + WIN_H - 10 - guy.height * s;
  // his shadow, under the row his feet are on
  const feet = y + guy.height * s - 2;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -42; dx <= 42; dx++) {
    if ((dx / 42) ** 2 + (dy / 2.5) ** 2 > 1) continue;
    const px = W / 2 + dx, py = feet + dy, i = (py * W + px) * 4;
    g.set(px, py, [g.px[i] * .8, g.px[i + 1] * .8, g.px[i + 2] * .84]);
  }
  g.blit(guy.frames[0], guy.width, guy.height, x, y, s);
}

/** A pill in `c` with dark words, as the card's rank pill is; returns where it ends. */
function pill(g: Grid, s: string, x: number, top: number, c: RGB): number {
  const w = wide(s) + 10;
  g.box(x, top + 1, w, 15, 3, INK);
  g.box(x, top, w, 15, 3, c);
  g.text(s, x + 5, top - 1, INK, 1, null);
  return x + w;
}

/** A guy's link preview: his big card on its side, his name, rank and rarest trait under him. */
export function ogFrames(spec: CardSpec): Frames {
  const input = cardInputOf(spec), grade = input.grade ?? -1;
  const rim = grade >= 0 ? hex(GRADES[grade].color) : PLAIN;
  const g = new Grid();
  card(g, rim);
  window(g, cardArtFrames({ seed: spec.seed, parts: spec.parts, palette: animateOptions(spec).palette, copies: faceSpec(spec).copies, grade, title: '' }), bakeGuy(spec, 'idle'));
  const [rank = '', trait = ''] = input.lines ?? [];
  const name = (input.title || spec.seed).replace(/^~/, '');
  // his name big, the address at the end of its line; his rank's pill and rarest trait under it
  const size = wide(name, 2) <= W - 48 - wide(SITE) ? 2 : 1;
  g.text(name, 16, PANEL_TOP + 2, IVORY, size);
  g.text(SITE, W - 16 - wide(SITE), PANEL_TOP + (size === 2 ? 14 : 2), GOLD);
  const below = PANEL_TOP + (size === 2 ? 37 : 22);
  const end = rank ? pill(g, rank.replace(/★\s*/, ''), 16, below, rim) : 16;
  if (trait) g.text(trait, end + 8, below - 1, QUIET);
  return g.frames();
}

/** The site's link preview: the card with `guys` in its window, small guys in their best, and what lil guys is under them. */
export function siteOgFrames(guys: CardSpec[], line: string): Frames {
  const g = new Grid();
  card(g, GOLD);
  // the window: a night sky going down to a lit floor, the guys stood along it, the middle one a size up
  for (let y = 0; y < WIN_H; y++) g.rect(8, WIN_TOP + y, W - 16, 1, mix([30, 36, 66], [70, 62, 96], y / WIN_H));
  const floor = WIN_TOP + WIN_H - 14;
  g.rect(8, floor, W - 16, WIN_TOP + WIN_H - floor, [46, 40, 66]);
  g.rect(8, floor, W - 16, 1, [96, 86, 128]);
  const baked = guys.map(s => bakeGuy(s, 'idle'));
  const sizes = baked.map((_, i) => (i === (baked.length >> 1) ? 4 : 3));
  const total = baked.reduce((w, b, i) => w + b.width * sizes[i], 0), gap = Math.floor((W - 40 - total) / Math.max(1, baked.length - 1));
  let x = 20;
  baked.forEach((b, i) => {
    const s = sizes[i];
    for (let dx = -b.width * s * .35; dx <= b.width * s * .35; dx++) g.set(Math.round(x + (b.width * s) / 2 + dx), floor + 2, [32, 28, 46]);
    g.blit(b.frames[0], b.width, b.height, x, floor + 2 - b.height * s, s);
    x += b.width * s + gap;
  });
  g.text('Lil Guys', 16, PANEL_TOP + 2, IVORY, 2);
  g.text(SITE, W - 16 - wide(SITE), PANEL_TOP + 14, GOLD);
  if (wide(line) > W - 32) throw new Error(`The site's line is too long for its preview: ${line}`);
  g.text(line, 16, PANEL_TOP + 36, QUIET);
  return g.frames();
}

