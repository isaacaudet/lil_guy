import { animate, animateLoop, frameAt, FRAME_HEIGHT, FRAME_SLOTS, FRAME_WIDTH, type Animation, type AnimateOptions, type Move } from './animate';
import { editionColor, editionOf, finishColor, loopSeconds, SHADER_FINISHES } from './finish-shader';
import { cycle, fitLoop, LOOP_MS, wave } from './loop';
import { encode, GRADES, gradeOf, type Owned } from './owned';
import { GLYPHS } from './font';
import { encodeGif, encodePng, type Frames } from './gif';
import { itemById, SET_COLORS } from './items';
import { auraHue } from './auras';

/**
 * Trading cards, drawn by the library so every game, the site and an export
 * show the same card: a guy wearing his copies, moving, each copy's finish
 * shining on its own pixels, its effect playing, the card's face dressed for
 * the grade, and the words written in the club's pixel type.
 *
 * A card is `CARD_WIDTH` by `CARD_HEIGHT` card pixels, six to each of the
 * guy's pixels, so a shine can sweep across a single pixel of a hat. Scale it
 * up by whole numbers to show it; `toCardGif` and `toCardPng` do that for you.
 */
export const CARD_WIDTH = 140;
export const CARD_HEIGHT = 204;
/** Card pixels to each of the guy's: six, or fewer if a wider picture would not fit the window. */
const ZOOM = Math.min(6, Math.floor((CARD_WIDTH - 18) / FRAME_WIDTH));

export interface CardInput {
  /** The guy: a name or a seed, as for `animate`. */
  seed: string;
  /** His parts and colours when they aren't the ones the seed deals (a picked look). */
  parts?: AnimateOptions['parts'];
  palette?: AnimateOptions['palette'];
  /** What he wears. The rarest sets the card's grade unless `grade` says. */
  copies?: Owned[];
  /** Across the top band. */
  title: string;
  /** A tag in the window's top-right corner, such as a print number. */
  corner?: string;
  /** Up to two lines under the grade pips. */
  lines?: string[];
  /**
   * The small line at the foot, beside the set's symbol: the set number and a 1st edition. Wrapped
   * at its " · " parts, two lines at most (the first beside the symbol); parts past that are left off.
   */
  footer?: string;
  /** 0 Everyday to 5 Aura; -1 for a plain card. */
  grade?: number;
  /** How he moves on the card. Default `idle`. */
  move?: Move;
}

type RGB = [number, number, number];
const rgb = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const hash = (x: number, y: number, p: number) => { const s = Math.sin(x * 127.1 + y * 311.7 + p * 0.731) * 43758.5453; return s - Math.floor(s); };


/**
 * One card pixel of a copy in its finish at time `t` seconds: the finishes'
 * shader (./finish-shader), worked out here so the card can be saved.
 * `gx, gy` is the guy pixel (what twinkles), `cx, cy` the card pixel (what a
 * sweep crosses), so light runs smoothly over a single pixel of a hat.
 */
function shine(c: RGB, o: Owned, gx: number, gy: number, cx: number, cy: number, t: number, zoom: number): RGB {
  const f = SHADER_FINISHES.indexOf(o.finish as (typeof SHADER_FINISHES)[number]);
  if (f < 0) return c;
  const out = finishColor([c[0] / 255, c[1] / 255, c[2] / 255], f, o.scuff, hash(gx, gy, o.print), (cx + cy) / zoom, gy, o.print, loopSeconds(t * 1000), 1);
  return [out[0] * 255, out[1] * 255, out[2] * 255];
}

// Glyphs the font's ASCII lacks, in its own style.
const EXTRA: Record<string, [number, number[]]> = {
  '·': [5, [0, 0, 0, 0, 0, 0, 6, 6, 0, 0, 0, 0, 0, 0, 0, 0]],
  '★': [9, [0, 0, 0, 8, 8, 28, 127, 62, 28, 54, 34, 0, 0, 0, 0, 0]],
  '#': [8, [0, 0, 0, 0, 18, 18, 63, 18, 18, 63, 18, 18, 0, 0, 0, 0]],
};
const glyph = (ch: string) => EXTRA[ch] ?? GLYPHS[ch] ?? GLYPHS['?'];
/** How wide a line of text is, in pixels. */
export const textWidth = (s: string) => [...s].reduce((w, ch) => w + glyph(ch)[0], 0);
/**
 * Words broken into lines that fit `width`: at spaces, and inside a word only
 * when the word alone is too wide. Nothing is ever cut off.
 */
function wrapText(text: string, width: number): string[] {
  // Parts joined by " · " stay whole where they can, so "1 in 33K" never splits.
  const parts = text.split(' · ');
  if (parts.length > 1 && parts.every(p => textWidth(p) <= width)) {
    const out: string[] = [];
    for (const p of parts) {
      const next = out.length ? out[out.length - 1] + ' · ' + p : p;
      if (out.length && textWidth(next) <= width) out[out.length - 1] = next; else out.push(p);
    }
    return out;
  }
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? line + ' ' + word : word;
    if (textWidth(next) <= width) { line = next; continue; }
    if (line) lines.push(line);
    line = '';
    let rest = word;
    while (textWidth(rest) > width) {
      let k = rest.length - 1;
      while (k > 1 && textWidth(rest.slice(0, k)) > width) k--;
      lines.push(rest.slice(0, k)); rest = rest.slice(k);
    }
    line = rest;
  }
  if (line) lines.push(line);
  return lines;
}

/** A drawing surface of RGBA card pixels. */
class Surface {
  readonly px: Uint8ClampedArray;
  constructor(readonly w = CARD_WIDTH, readonly h = CARD_HEIGHT) { this.px = new Uint8ClampedArray(w * h * 4); }
  set(x: number, y: number, c: RGB, a = 255): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.px[i] = c[0]; this.px[i + 1] = c[1]; this.px[i + 2] = c[2]; this.px[i + 3] = a;
  }
  get(x: number, y: number): RGB { const i = (y * this.w + x) * 4; return [this.px[i], this.px[i + 1], this.px[i + 2]]; }
  /** Text `z` times its size with a hard drop shadow, its colour picked per pixel so foil can run along it. */
  text(s: string, x: number, top: number, colour: (x: number, y: number) => RGB, shadow?: RGB, z = 1): void {
    const draw = (ox: number, oy: number, col: (x: number, y: number) => RGB) => {
      let cx = ox;
      for (const ch of s) {
        const [adv, rows] = glyph(ch);
        rows.forEach((bits, dy) => {
          for (let dx = 0; bits >> dx; dx++) if (bits & (1 << dx)) for (let a = 0; a < z; a++) for (let b = 0; b < z; b++) this.set(cx + dx * z + b, oy + dy * z + a, col(cx + dx * z + b, oy + dy * z + a));
        });
        cx += adv * z;
      }
    };
    if (shadow) draw(x, top + z, () => shadow);
    draw(x, top, colour);
  }
}

const INK: RGB = [24, 20, 31], IVORY: RGB = [246, 240, 227], WHITE: RGB = [255, 255, 255], PLATE: RGB = [38, 34, 52];
/** A Grail's gold, its light and its deep. */
const GOLD_HI: RGB = [255, 222, 110], GOLD_LO: RGB = [204, 124, 22];
const clamp8 = (c: number[]): RGB => [Math.min(255, Math.max(0, c[0])), Math.min(255, Math.max(0, c[1])), Math.min(255, Math.max(0, c[2]))];

/** How tall the card itself is: the rows under it hold its shadow. */
const BODY_HEIGHT = CARD_HEIGHT - 5;
/** Whether a pixel is inside a rounded box. */
function inBox(x: number, y: number, w: number, h: number, r: number): boolean {
  if (x < 0 || y < 0 || x >= w || y >= h) return false;
  const cx = x < r ? r - x : x > w - 1 - r ? x - (w - 1 - r) : 0;
  const cy = y < r ? r - y : y > h - 1 - r ? y - (h - 1 - r) : 0;
  return cx * cx + cy * cy <= r * r;
}
const inside = (x: number, y: number) => inBox(x, y, CARD_WIDTH, BODY_HEIGHT, 8);

/** The window's and plate's margin at the card's sides, and the narrowest it goes for a guy and his buddy. */
const M = 7, WIDE = 4;

/** How he stands on the card: card pixels to each of his (`zoom`), and the columns of his frame centred in the window. */
interface CardFit { zoom: number; left: number; span: number; side: number }

/**
 * Six card pixels to each of his, centred on his sixteen columns; with a buddy
 * beside him, as big as the two of them fit the window (`zoom`), centred on
 * everything either of them covers in any frame of the move. When widening
 * the window to the card's bevel (`side`) lets the pair stand a size bigger,
 * it does.
 */
function cardFit(anim: Animation): CardFit {
  if (anim.width <= FRAME_WIDTH) return { zoom: ZOOM, left: 0, span: FRAME_WIDTH, side: M };
  let left = anim.width, right = -1;
  for (const f of anim.frames) f.colors.forEach((row, y) => row.forEach((c, x) => { if (c && f.slots[y][x] !== 5) { left = Math.min(left, x); right = Math.max(right, x); } }));
  const span = right - left + 1;
  // The window less its rim and the sticker edge round him; or, wide, its rim allowed to
  // cover a card pixel at either end of the furthest either of them reaches.
  const narrow = Math.floor((CARD_WIDTH - M * 2 - 6) / span), wide = Math.floor((CARD_WIDTH - WIDE * 2 - 2) / span);
  return wide > narrow ? { zoom: Math.min(ZOOM, wide), left, span, side: WIDE } : { zoom: Math.min(ZOOM, narrow), left, span, side: M };
}

/**
 * The card at `t` seconds, with the guy's frame `frame` in its window.
 *
 * Laid out from the foot up so the words always fit, and the window takes the
 * rest, so the card is mostly him. The card stands on its own hard shadow and
 * lifts off it now and then. Its edition, after Balatro's, comes from the
 * finish that sets its grade: Foil, Holographic, Polychrome, Negative, Gold,
 * and the aura card's Spectral.
 */
function drawCard(input: CardInput, frame: { colors: (string | null)[][]; slots: number[][]; outside?: [number, number, string][] }, owned: Partial<Record<(typeof FRAME_SLOTS)[number], Owned>>, g: number, ed: number, t: number, { zoom, left, span, side }: CardFit): Uint8ClampedArray {
  // The card's own clock, in ms, on the loop every other moving thing keeps
  // (./loop), set by its last copy's print (or its guy's name), so cards side
  // by side catch the light at their own moments.
  const lastCopy = input.copies?.[input.copies.length - 1];
  const shift = lastCopy ? lastCopy.print * 37 : [...input.seed].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 6000, 0);
  const tm = t * 1000 + shift, time = loopSeconds(tm), v = lastCopy ? lastCopy.print % 4 : 0;
  const s = new Surface(CARD_WIDTH, BODY_HEIGHT);
  const W = CARD_WIDTH, H = BODY_HEIGHT;
  const gold = ed === 5, aura = ed === 6, neg = ed === 4;
  const gc: RGB = g >= 0 ? rgb(GRADES[g].color) : [104, 118, 146];
  const auraCopy = owned.aura;
  const ah: RGB = aura && auraCopy ? rgb(auraHue(auraCopy.item, auraCopy.finish, auraCopy.print)) : gc;
  const tone: RGB = aura ? ah : gc;

  // ---------------------------------------------------------------- words
  const textW = W - M * 2 - 10;
  const pill = input.lines?.[0], subs = (input.lines ?? []).slice(1).flatMap(l => wrapText(l, textW));
  const big = textWidth(input.title) * 2 <= textW;
  const titles = big ? [input.title] : wrapText(input.title, textW);
  const titleH = big ? 23 : titles.length * 12;
  const lastItem = input.copies?.length ? itemById(input.copies[input.copies.length - 1].item) : undefined;
  const markHex = lastItem ? SET_COLORS[lastItem.game as keyof typeof SET_COLORS] : undefined;
  const foots: string[] = [];
  for (const part of (input.footer ?? '').split(' · ').filter(Boolean)) {
    const k = foots.length - 1, w = k <= 0 ? textW - 14 : textW;
    if (k >= 0 && textWidth(`${foots[k]} · ${part}`) <= w) foots[k] += ` · ${part}`;
    else if (foots.length < 2 && textWidth(part) <= textW) foots.push(part);
    else break;
  }
  const footH = foots.length ? foots.length * 11 : markHex ? 11 : 0;
  // The grade's badge shares its row with a short line, as "Everyday  @mochi".
  const pillW = pill ? textWidth(pill) + 14 : 0;
  const paired = !!pill && subs.length === 1 && pillW + 6 + textWidth(subs[0]) <= W - M * 2 - 6;
  const rest = paired ? [] : subs;
  // From the foot up: the plate holds the title, the badge and the lines, and the set line.
  const plateBottom = H - 1 - 6;
  let y = plateBottom - 3 - footH;
  const footTop = y;
  if (footH) y -= 2;
  const pillTop = pill ? (y -= 15) : y;
  if (pill) y -= 3;
  y -= rest.length * 11;
  const subTop = y;
  y -= titleH;
  const titleTop = y;
  const plateTop = y - 3;
  const WIN = { left: side, right: W - 1 - side, top: 6, bottom: plateTop - 4 };
  const wcx = (WIN.left + WIN.right) / 2, wcy = WIN.top + (WIN.bottom - WIN.top) * 0.45;

  // ---------------------------------------------------------------- the card's stock
  // The colour the card is printed on, before its edition.
  const stock = (x: number, yy: number): RGB => {
    if (gold) {
      const base = mix(GOLD_HI, GOLD_LO, yy / H * 0.85 + 0.1 * Math.sin(x * 0.05 + yy * 0.02));
      return yy % 3 === 0 ? mix(base, GOLD_LO, 0.12) : base;
    }
    // A Negative card is printed pale so its edition turns it dark.
    if (neg) return mix(mix(IVORY, tone, 0.35), mix(IVORY, tone, 0.6), yy / H);
    return mix(mix(tone, WHITE, 0.08), mix(tone, INK, 0.25), yy / H);
  };
  // Pixels the edition plays over, keyed by region: 1 the card's face, 2 the window.
  const glintAt = (x: number, yy: number) => hash(x >> 1, yy >> 1, 11);
  const edition = (c: RGB, x: number, yy: number, region: number): RGB => {
    const out = editionColor([c[0] / 255, c[1] / 255, c[2] / 255], ed, v, [x / 5, yy / 5], [wcx / 5, wcy / 5], region, glintAt(x, yy), 0.2, time);
    return clamp8([out[0] * 255, out[1] * 255, out[2] * 255]);
  };

  for (let yy = 0; yy < H; yy++) for (let x = 0; x < W; x++) {
    if (!inside(x, yy)) continue;
    const ring = (d: number) => !inside(x - d, yy) || !inside(x + d, yy) || !inside(x, yy - d) || !inside(x, yy + d);
    if (ring(2)) { s.set(x, yy, INK); continue; }
    let c = stock(x, yy);
    // A chunky bevel: lit along the top and left, deep along the bottom and right.
    const lit = !inside(x - 3, yy) || !inside(x, yy - 3), deep = !inside(x + 3, yy) || !inside(x, yy + 3);
    if (lit && !deep) c = mix(c, WHITE, 0.35);
    else if (deep) c = mix(c, INK, 0.3);
    // The top grades have a fine inlaid line inside the bevel: pale foil on an aura card, an engraved line on gold.
    else if ((aura || gold) && ring(5)) c = aura ? mix(ah, WHITE, 0.7) : mix(GOLD_LO, INK, 0.25);
    // The aura card is full-art: inside its bevel the aura's own colours swirl, edge to edge.
    if (aura && !ring(6)) {
      const r = Math.hypot((x - wcx) / 80, (yy - wcy) / 100);
      s.set(x, yy, edition(mix(mix(ah, INK, 0.62), mix(ah, INK, 0.3), Math.max(0, 1 - r) ** 1.2), x, yy, 2));
      continue;
    }
    s.set(x, yy, edition(c, x, yy, 1));
  }

  // ---------------------------------------------------------------- where he stands
  // Where he stands: feet near the floor; on the top grades he rises out of
  // the window and floats, bobbing (Balatro's soul layer).
  const soul = gold || aura;
  let topRow = FRAME_HEIGHT, botRow = 0;
  frame.colors.forEach((row, gy) => { if (row.some(Boolean)) { topRow = Math.min(topRow, gy); botRow = gy; } });
  const ox = Math.round((WIN.left + WIN.right + 1) / 2 - ((left + span / 2) * zoom));
  const bob = soul ? Math.round(Math.sin(tm / wave(1000 / 2.6)) * 2) : 0;
  let oy = WIN.bottom - 5 - (botRow + 1) * zoom;
  if (soul) oy = Math.max(5 - topRow * zoom, Math.min(oy, Math.round((WIN.top + WIN.bottom) / 2 - ((topRow + botRow + 1) * zoom) / 2) - 10)) + bob;
  // A soft shadow on the floor under each of them, him and his buddy: under the
  // cells of his bottom rows, in the window's floor even when he floats.
  const floors: [number, number, number][] = [];
  for (const buddy of [false, true]) {
    let lo = -1, l = Infinity, r = -Infinity;
    frame.colors.forEach((row, gy) => row.forEach((c, gx) => { if (c && frame.slots[gy][gx] !== 5 && (frame.slots[gy][gx] === 4) === buddy) lo = Math.max(lo, gy); }));
    if (lo < 0) continue;
    frame.colors.forEach((row, gy) => { if (gy >= lo - 1) row.forEach((c, gx) => { if (c && frame.slots[gy][gx] !== 5 && (frame.slots[gy][gx] === 4) === buddy) { l = Math.min(l, gx); r = Math.max(r, gx); } }); });
    const feet = soul ? WIN.bottom - 5 : oy + (lo + 1) * zoom - bob;
    floors.push([ox + (l + r + 1) / 2 * zoom, Math.min(WIN.bottom - 7, feet - 3), Math.max(6, (r - l + 1) * zoom * 0.38 + 2)]);
  }

  // ---------------------------------------------------------------- the window
  const light: RGB = g >= 0 ? mix(IVORY, gc, 0.22) : mix(IVORY, gc, 0.12);
  if (!aura) for (let yy = WIN.top; yy <= WIN.bottom; yy++) for (let x = WIN.left; x <= WIN.right; x++) {
    const rim = x - WIN.left < 2 || WIN.right - x < 2 || yy - WIN.top < 2 || WIN.bottom - yy < 2;
    if (rim) { s.set(x, yy, INK); continue; }
    const depth = (yy - WIN.top) / (WIN.bottom - WIN.top), r = Math.hypot((x - wcx) / 62, (yy - wcy) / 70);
    let c: RGB;
    if (gold) c = mix([112, 62, 10], [232, 160, 48], Math.max(0, 1 - r) ** 1.3);
    else c = mix(light, mix(light, gc, 0.35), depth * 0.6);
    for (const [sx, sy, rx] of floors) {
      const fx = (x - sx) / rx, fy = (yy - sy) / 4;
      if (fx * fx + fy * fy < 1) c = mix(c, [0, 0, 0], 0.16 * (1 - fx * fx - fy * fy));
    }
    // A shaded lip under the rim, so the window reads as set into the card.
    if (yy - WIN.top === 2 || x - WIN.left === 2) c = mix(c, INK, 0.35);
    s.set(x, yy, edition(c, x, yy, 2));
  }

  // ---------------------------------------------------------------- him
  // A tall hat pokes out over the window's top rather than being cut off.
  const pop = soul || oy + topRow * zoom < WIN.top + 3;
  const clip = (cx: number, cy: number) => pop ? inside(cx, cy) && cx > 2 && cx < W - 3 && cy > 2 && cy < WIN.bottom - 1
    : cy > WIN.top + 1 && cy < WIN.bottom - 1 && cx > WIN.left + 1 && cx < WIN.right - 1;
  // A sticker's edge round him, so his dark outline never sinks into the window.
  const solid = (gx: number, gy: number) => !!frame.colors[gy]?.[gx] && frame.slots[gy]?.[gx] !== 5;
  const edgeC: RGB = aura ? mix(ah, WHITE, 0.55) : gold ? [255, 236, 170] : WHITE;
  for (let yy = 0; yy < H; yy++) for (let x = 0; x < W; x++) {
    if (!clip(x, yy)) continue;
    const gx = Math.floor((x - ox) / zoom), gy = Math.floor((yy - oy) / zoom);
    if (x - ox >= 0 && yy - oy >= 0 && solid(gx, gy)) continue;
    const near = [[2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [1, -1], [-1, 1], [-1, -1]].some(([dx, dy]) => x + dx - ox >= 0 && yy + dy - oy >= 0 && solid(Math.floor((x + dx - ox) / zoom), Math.floor((yy + dy - oy) / zoom)));
    if (near) s.set(x, yy, pop && (yy <= WIN.top + 1 || x <= WIN.left + 1 || x >= WIN.right - 1) ? WHITE : edgeC);
  }
  frame.colors.forEach((row, gy) => row.forEach((hex, gx) => {
    if (!hex) return;
    const slot = frame.slots[gy][gx], copy = slot ? owned[FRAME_SLOTS[slot - 1]] : undefined;
    for (let dy = 0; dy < zoom; dy++) for (let dx = 0; dx < zoom; dx++) {
      const cx = ox + gx * zoom + dx, cy = oy + gy * zoom + dy;
      if (!clip(cx, cy)) continue;
      let c = rgb(hex);
      if (copy) c = shine(c, copy, gx, gy, cx, cy, t, zoom);
      s.set(cx, cy, clamp8(c));
    }
  }));
  // A rare aura's rings run past the frame's sides into the window's margins.
  for (const [gx, gy, hex] of frame.outside ?? []) for (let dy = 0; dy < zoom; dy++) for (let dx = 0; dx < zoom; dx++) {
    const cx = ox + gx * zoom + dx, cy = oy + gy * zoom + dy;
    if (clip(cx, cy)) s.set(cx, cy, rgb(hex));
  }
  // The corner tag in the window.
  if (input.corner) {
    const w = textWidth(input.corner) + 6, x0 = WIN.right - 4 - w, y0 = WIN.top + 4;
    for (let yy = y0; yy < y0 + 14; yy++) for (let x = x0; x < x0 + w; x++) if (!((x === x0 || x === x0 + w - 1) && (yy === y0 || yy === y0 + 13))) s.set(x, yy, yy >= y0 + 12 ? [0, 0, 0] : INK);
    s.text(input.corner, x0 + 3, y0 - 2, () => WHITE);
  }

  // ---------------------------------------------------------------- the plate and its words
  for (let yy = plateTop; yy <= plateBottom; yy++) for (let x = side; x <= W - 1 - side; x++) {
    const pw = W - side * 2, ph = plateBottom - plateTop + 1;
    if (!inBox(x - side, yy - plateTop, pw, ph, 4)) continue;
    const edge = !inBox(x - side - 1, yy - plateTop, pw, ph, 4) || !inBox(x - side + 1, yy - plateTop, pw, ph, 4) || yy === plateTop || yy === plateBottom;
    const base: RGB = gold ? [92, 52, 8] : aura ? mix(mix(ah, INK, 0.6), INK, 0.45) : PLATE;
    s.set(x, yy, edge ? INK : yy === plateTop + 1 ? mix(base, WHITE, 0.16) : yy >= plateBottom - 2 ? mix(base, INK, 0.45) : base);
  }
  // The words sit on the dark plate: white, a Grail's title in gold and an aura card's in its colour.
  const quiet: RGB = gold ? [236, 196, 120] : aura ? mix(ah, WHITE, 0.6) : [184, 176, 206];
  const titleInk = (x: number, yy: number): RGB => gold ? mix([255, 210, 90], [255, 248, 214], 0.5 + 0.5 * Math.sin(x * 0.15 - tm / wave(1000 / 3) + yy * 0.1))
    : aura ? mix(mix(ah, WHITE, 0.5), WHITE, 0.5 + 0.5 * Math.sin(x * 0.12 - tm / wave(1000 / 2) + yy * 0.1)) : WHITE;
  if (big) s.text(input.title, Math.floor((W - textWidth(input.title) * 2) / 2), titleTop - 4, titleInk, INK, 2);
  else titles.forEach((l, k) => s.text(l, Math.floor((W - textWidth(l)) / 2), titleTop + k * 12 - 2, titleInk, INK));
  rest.forEach((l, k) => s.text(l, Math.floor((W - textWidth(l)) / 2), subTop + k * 11 - 2, () => quiet));
  // The grade's badge: a chunky pill in its colour with a deep lip, as Balatro's rarity badges.
  if (pill) {
    const w = pillW, x0 = paired ? Math.floor((W - w - 6 - textWidth(subs[0])) / 2) : Math.floor((W - w) / 2);
    const fill: RGB = gold ? [236, 164, 32] : tone;
    for (let yy = pillTop; yy < pillTop + 15; yy++) for (let x = x0; x < x0 + w; x++) {
      if (!inBox(x - x0, yy - pillTop, w, 15, 4)) continue;
      const edge = !inBox(x - x0 - 1, yy - pillTop, w, 15, 4) || !inBox(x - x0 + 1, yy - pillTop, w, 15, 4) || yy === pillTop || yy === pillTop + 14;
      s.set(x, yy, edge ? INK : yy >= pillTop + 12 ? mix(fill, INK, 0.45) : yy === pillTop + 1 ? mix(fill, WHITE, 0.4) : fill);
    }
    s.text(pill, x0 + 7, pillTop - 1, () => WHITE, mix(fill, INK, 0.6));
    if (paired) s.text(subs[0], x0 + w + 6, pillTop - 1, () => quiet);
  }
  foots.forEach((l, k) => s.text(l, side + 5, footTop + k * 11 - 2, () => quiet));
  if (markHex) {
    const m = rgb(markHex), x0 = W - side - 14, y0 = footTop;
    for (let yy = 0; yy < 9; yy++) for (let x = 0; x < 9; x++) {
      const rim = x === 0 || yy === 0 || x === 8 || yy === 8;
      s.set(x0 + x, y0 + yy, rim ? INK : x === 1 || yy === 1 ? mix(m, WHITE, 0.45) : x === 7 || yy === 7 ? mix(m, [0, 0, 0], 0.3) : m);
    }
  }

  // ---------------------------------------------------------------- on its shadow
  // It stands on a hard shadow and lifts off it now and then, the shadow staying on the table.
  const lift = Math.round(1 + Math.sin(TAU_MS(tm, 3000)));
  const out = new Uint8ClampedArray(CARD_WIDTH * CARD_HEIGHT * 4);
  for (let yy = 0; yy < H; yy++) for (let x = 0; x < W; x++) {
    if (!inside(x, yy)) continue;
    const o = ((yy + 5) * CARD_WIDTH + x) * 4;
    out[o] = 20; out[o + 1] = 16; out[o + 2] = 28; out[o + 3] = 150;
  }
  for (let yy = 0; yy < H; yy++) for (let x = 0; x < W; x++) {
    const i = (yy * W + x) * 4;
    if (!s.px[i + 3]) continue;
    out.set(s.px.subarray(i, i + 4), ((yy + 2 - lift) * CARD_WIDTH + x) * 4);
  }
  return out;
}

/** The angle of a wave about `period` ms long at `tm`, coming round in LOOP_MS. */
const TAU_MS = (tm: number, period: number) => cycle(tm, period) * Math.PI * 2;

/** The grade a card shows: the one given, or the rarest copy's. */
const cardGrade = (input: CardInput) => input.grade ?? (input.copies?.length ? Math.max(...input.copies.map(o => GRADES.findIndex(x => x.id === gradeOf(o).id))) : -1);

/**
 * The card's edition: its rarest copy's finish's (the last such copy's), or,
 * for a card given a grade with nothing that sets it, the grade's own.
 */
function cardEdition(input: CardInput, g: number): number {
  const top = (input.copies ?? []).filter(o => GRADES.findIndex(x => x.id === gradeOf(o).id) === g).pop();
  return top ? editionOf(top.finish) : g < 0 ? 0 : [0, 1, 2, 3, 5, 6][g];
}

/**
 * The card as frames, `ms` apart, covering one loop of his move (at least two
 * seconds, so a shine gets across). Every frame is the whole card in RGBA;
 * the corners are transparent.
 */
export function cardFrames(input: CardInput, ms = 80): Frames {
  const card = cardPlayer(input, ms), frames: Uint8ClampedArray[] = [];
  for (let i = 0; i < card.count; i++) frames.push(card.frame(i));
  return { width: CARD_WIDTH, height: CARD_HEIGHT, frames, delays: card.delays };
}

/**
 * A card to play on screen: each frame is drawn the first time it is asked
 * for and kept, so a page can show a card at once and spread the work out.
 * It loops perfectly: his move played the whole number of times that fits
 * whole turns of LOOP_MS, with every sheen on the card on the same clock.
 */
export function cardPlayer(input: CardInput, ms = 80) {
  const options = { parts: input.parts, palette: input.palette, equip: (input.copies ?? []).map(encode), rarity: false };
  const move = input.move ?? 'idle', plain = animate(input.seed, move, options);
  const { repeats, turns } = fitLoop(plain.duration);
  const anim = animate(input.seed, move, { ...options, loop: { repeats, turns } });
  const owned = ownedBySlot(input.copies ?? []), g = cardGrade(input), ed = cardEdition(input, g), fit = cardFit(anim);
  const total = anim.duration, count = Math.max(1, Math.round(total / ms)), cache: Uint8ClampedArray[] = [];
  const delays = Array.from({ length: count }, (_, k) => Math.round((k + 1) * total / count) - Math.round(k * total / count));
  return {
    width: CARD_WIDTH, height: CARD_HEIGHT, count, delay: total / count, delays,
    /** The frame showing at `i` (wraps round). */
    frame(i: number): Uint8ClampedArray {
      const k = ((i % count) + count) % count;
      return cache[k] ??= drawCard(input, frameAt(anim, k * total / count), owned, g, ed, ((k * turns * LOOP_MS) / count % LOOP_MS) / 1000, fit);
    },
  };
}

/** The card standing still, for a picture. */
export function cardStill(input: CardInput, t = 0.6): Uint8ClampedArray {
  const anim = animateLoop(input.seed, input.move ?? 'idle', { parts: input.parts, palette: input.palette, equip: (input.copies ?? []).map(encode), rarity: false });
  const g = cardGrade(input);
  return drawCard(input, frameAt(anim, 0), ownedBySlot(input.copies ?? []), g, cardEdition(input, g), t, cardFit(anim));
}

/** The copies by the slot each is worn in (later ones win, as `dress` does). */
function ownedBySlot(copies: Owned[]): Partial<Record<(typeof FRAME_SLOTS)[number], Owned>> {
  const out: Partial<Record<(typeof FRAME_SLOTS)[number], Owned>> = {};
  for (const o of copies) { const slot = itemById(o.item)?.slot; if (slot) out[slot as (typeof FRAME_SLOTS)[number]] = o; }
  return out;
}

/** The card as a looping GIF, each card pixel `scale` by `scale`. */
export function toCardGif(input: CardInput, scale = 3): Uint8Array {
  return encodeGif(cardFrames(input), scale);
}

/** The card as a PNG, each card pixel `scale` by `scale`. */
export function toCardPng(input: CardInput, scale = 4): Promise<Uint8Array> {
  return encodePng(cardStill(input), CARD_WIDTH, CARD_HEIGHT, scale);
}

/**
 * The guy on his own as a looping GIF: his move with everything he wears,
 * effects and auras moving, on a transparent background or `background`.
 */
export function toGuyGif(seed: string, move: Move, options: AnimateOptions & { background?: string } = {}, scale = 12): Uint8Array {
  const anim = animateLoop(seed, move, options), bg = options.background ? rgb(options.background) : null;
  const W = anim.width, frames = anim.frames.map(f => {
    const px = new Uint8ClampedArray(W * FRAME_HEIGHT * 4);
    f.colors.forEach((row, y) => row.forEach((c, x) => { const v = c ? rgb(c) : bg; if (v) px.set([...v, 255], (y * W + x) * 4); }));
    return px;
  });
  return encodeGif({ width: W, height: FRAME_HEIGHT, frames, delays: anim.frames.map(f => f.ms) }, scale);
}
