import { animate, animateLoop, backdropOf, frameAt, FRAME_HEIGHT, FRAME_SLOTS, FRAME_WIDTH, type Animation, type AnimationFrame, type AnimateOptions, type Move } from './animate';
import { editionField, editionOf, finishColor, loopSeconds, SHADER_FINISHES } from './finish-shader';
import { cycle, LOOP_MS, wave } from './loop';
import { encode, GRADES, gradeOf, type Owned } from './owned';
import { GLYPHS } from './font';
import { encodeGif, encodePng, type Frames } from './gif';
import { itemById, SET_COLORS } from './items';
import { auraColors, auraHue } from './auras';
import { lookApplies, lookField, lookIndex, paintColors, PAINT_CONTRAST, polyColor, type LookOptions } from './card-looks';

/**
 * Trading cards, drawn by the library so every game, the site and an export
 * show the same card: a guy wearing his copies, moving, each copy's finish
 * shining on its own pixels, its effect playing, the card's face dressed for
 * the grade, and the words written in the club's pixel type.
 *
 * A card is `CARD_WIDTH` by `CARD_HEIGHT` card pixels, several to each of
 * the guy's pixels, so a shine can sweep across a single pixel of a hat. Scale it
 * up by whole numbers to show it; `toCardGif` and `toCardPng` do that for you.
 */
export const CARD_WIDTH = 140;
export const CARD_HEIGHT = 204;

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
const hexes = new Map<string, RGB>();
const rgb = (h: string): RGB => {
  let c = hexes.get(h);
  if (!c) hexes.set(h, c = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
  return c;
};
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const hash = (x: number, y: number, p: number) => { const s = Math.sin(x * 127.1 + y * 311.7 + p * 0.731) * 43758.5453; return s - Math.floor(s); };


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

/** A drawing surface of RGBA card pixels, with what each pixel is for the card's edition: 0 nothing, 1 the face, 2 the window. */
class Surface {
  readonly px: Uint8ClampedArray;
  readonly region: Uint8Array;
  constructor(readonly w = CARD_WIDTH, readonly h = CARD_HEIGHT) { this.px = new Uint8ClampedArray(w * h * 4); this.region = new Uint8Array(w * h); }
  set(x: number, y: number, c: RGB, region = 0): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.px[i] = c[0]; this.px[i + 1] = c[1]; this.px[i + 2] = c[2]; this.px[i + 3] = 255;
    this.region[y * this.w + x] = region;
  }
  /** Text with a hard drop shadow, its colour picked per pixel so foil can run along it. */
  text(s: string, x: number, top: number, colour: (x: number, y: number) => RGB, shadow?: RGB): void {
    const draw = (ox: number, oy: number, col: (x: number, y: number) => RGB) => {
      let cx = ox;
      for (const ch of s) {
        const [adv, rows] = glyph(ch);
        rows.forEach((bits, dy) => { for (let dx = 0; bits >> dx; dx++) if (bits & (1 << dx)) this.set(cx + dx, oy + dy, col(cx + dx, oy + dy)); });
        cx += adv;
      }
    };
    if (shadow) draw(x, top + 1, () => shadow);
    draw(x, top, colour);
  }
}

const INK: RGB = [24, 20, 31], IVORY: RGB = [246, 240, 227], WHITE: RGB = [255, 255, 255], PLATE: RGB = [38, 34, 52];
/** A Grail's gold foil, its light and its deep. */
const GOLD_HI: RGB = [255, 226, 128], GOLD_LO: RGB = [196, 130, 30];
/** A Grail's amber window, its deep and the glow behind him. */
const AMBER: RGB = [92, 54, 12], AMBER_GLOW: RGB = [214, 150, 44];
/** A Grail's words, struck into the gold: dark brown, the light catching the cut's lower edge. */
const GOLD_INK: RGB = [96, 54, 6], GOLD_CUT: RGB = [255, 240, 186];

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
/**
 * The card's shape, worked out the first time a card is drawn. Each pixel's
 * `depth`: 0 outside the card, else the shortest step across or down (up to
 * 9) that leaves it. Its `bevel`: 1 lit (near the top or left), 2 deep (near
 * the bottom or right), 0 neither. Each pair of pixels' noise (`glint`), where
 * an edition's glints open. And the card's hard `shadow` on the table, five
 * rows down, with nothing on it.
 */
let theShape: { depth: Uint8Array; bevel: Uint8Array; glint: Float64Array; runs: [number, number][]; shadow: Uint8ClampedArray } | null = null;
function cardShape() {
  if (theShape) return theShape;
  const W = CARD_WIDTH, H = BODY_HEIGHT, depth = new Uint8Array(W * H), bevel = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inside(x, y)) continue;
    let d = 1;
    while (d < 9 && inside(x - d, y) && inside(x + d, y) && inside(x, y - d) && inside(x, y + d)) d++;
    const lit = !inside(x - 3, y) || !inside(x, y - 3), deep = !inside(x + 3, y) || !inside(x, y + 3);
    depth[y * W + x] = d; bevel[y * W + x] = deep ? 2 : lit ? 1 : 0;
  }
  const glint = Float64Array.from({ length: W * H }, (_, i) => hash(i % W, Math.floor(i / W), 11));
  // Each row's run of card pixels, first to last, for laying the card on its shadow.
  const runs = Array.from({ length: H }, (_, y): [number, number] => {
    let a = -1, b = -1;
    for (let x = 0; x < W; x++) if (depth[y * W + x]) { if (a < 0) a = x; b = x; }
    return [a, b];
  });
  const shadow = new Uint8ClampedArray(W * CARD_HEIGHT * 4);
  runs.forEach(([a, b], y) => { for (let x = a; a >= 0 && x <= b; x++) shadow.set([20, 16, 28, 150], ((y + 5) * W + x) * 4); });
  return theShape = { depth, bevel, glint, runs, shadow };
}

/** The window's and plate's margin at the card's sides: out to the bevel, so a guy and his buddy fit. */
const M = 4;
/**
 * Card pixels to each of the guy's, the same on every card, buddy or not. A
 * guy with his buddy a column closer fills the window, losing at most a card
 * pixel under its rim at their widest reach.
 */
const ZOOM = 5;

type CardFrame = AnimationFrame & { outside?: [number, number, string][] };
type OwnedBySlot = Partial<Record<(typeof FRAME_SLOTS)[number], Owned>>;

const PRISM = SHADER_FINISHES.indexOf('prism');
/** Whether a copy's finish moves on the card (a heavily scuffed plain copy's sweep is worn away). */
const shines = (o: Owned) => { const f = SHADER_FINISHES.indexOf(o.finish as (typeof SHADER_FINISHES)[number]); return f > 0 || (f === 0 && o.scuff <= 0.07); };

/** Where he stands on the card: the middle of what he covers across, in card pixels from his frame's left, and the rows he ever reaches. */
interface CardFit { mid: number; top: number; foot: number; topAll: number; footAll: number; rest: number }

/**
 * Centred on his sixteen columns, or with a buddy beside him on everything
 * either of them covers in any frame of the move; and in the window's height
 * as he stands at rest. His feet stand on the same row in every frame, so a
 * hop leaves the floor. A frame item's backdrop doesn't count: it fills the
 * whole window behind them.
 */
function cardFit(frames: CardFrame[], width: number, cellX: (gx: number, slot: number) => number): CardFit {
  let left = Infinity, right = -Infinity, top = FRAME_HEIGHT, foot = 0, topAll = FRAME_HEIGHT, footAll = 0;
  for (const f of frames) f.colors.forEach((row, y) => row.forEach((c, x) => {
    const slot = f.slots[y][x];
    if (!c || slot === 3) return;
    topAll = Math.min(topAll, y); footAll = Math.max(footAll, y);
    if (slot === 5) return;
    left = Math.min(left, cellX(x, slot)); right = Math.max(right, cellX(x, slot) + ZOOM); top = Math.min(top, y); foot = Math.max(foot, y);
  }));
  const mid = width <= FRAME_WIDTH || right < left ? FRAME_WIDTH * ZOOM / 2 : (left + right) / 2;
  // His top as he stands at rest, in the move's first frame.
  const rest = frames[0]?.colors.findIndex((row, y) => row.some((c, x) => c && frames[0].slots[y][x] !== 5 && frames[0].slots[y][x] !== 3)) ?? top;
  return { mid, top, foot, topAll, footAll, rest: rest < 0 ? top : rest };
}

/**
 * How many card pixels his buddy stands in towards him: all of the empty
 * columns between them in every frame of the move but two card pixels, room
 * for a sticker edge between them, so the two stand a size bigger.
 */
function buddyNudge(anim: Animation): number {
  if (anim.width <= FRAME_WIDTH) return 0;
  let guy = -1, buddy = anim.width;
  for (const f of anim.frames) f.colors.forEach((row, y) => row.forEach((c, x) => {
    if (!c || f.slots[y][x] === 3 || f.slots[y][x] === 5) return;
    if (x < FRAME_WIDTH) guy = Math.max(guy, x); else buddy = Math.min(buddy, x);
  }));
  return Math.max(0, (buddy - guy - 1) * ZOOM - 2);
}

/**
 * Everything about a card that holds still, worked out once: the laid-out
 * face, plate and words, the edition's field, and the guy's placement. Its
 * `draw` puts the card at `t` seconds, with his frame `frame`, into `out`.
 *
 * Laid out from the foot up so the words always fit, and the window takes the
 * rest, so the card is mostly him. The card stands on its own hard shadow and
 * lifts off it now and then. Its edition, after Balatro's, comes from the
 * finish that sets its grade: Foil, Holographic, Polychrome, Negative, Gold,
 * and the aura card's Spectral.
 */
function cardArt(input: CardInput, anim: Animation, owned: OwnedBySlot, g: number, ed: number, looks: LookOptions = {}) {
  // Where a cell of his frame starts across, in card pixels: his buddy's room (an aura's cells aside) nudged in.
  const zoom = ZOOM, nudge = buddyNudge(anim);
  const cellX = (gx: number, slot: number) => gx * zoom - (gx >= FRAME_WIDTH && slot !== 5 ? nudge : 0);
  const fit = cardFit(anim.frames, anim.width, cellX), shape = cardShape();
  // The card's own clock, in ms, on the loop every other moving thing keeps
  // (./loop), set by its last copy's print (or its guy's name), so cards side
  // by side catch the light at their own moments.
  const lastCopy = input.copies?.[input.copies.length - 1];
  const shift = lastCopy ? lastCopy.print * 37 : [...input.seed].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 6000, 0);
  const v = lastCopy ? lastCopy.print % 4 : 0;
  const W = CARD_WIDTH, H = BODY_HEIGHT, side = M;
  const s = new Surface(W, H);
  const gold = ed === 5, aura = ed === 6, neg = ed === 4;
  const gc: RGB = g >= 0 ? rgb(GRADES[g].color) : [104, 118, 146];
  const auraCopy = owned.aura;
  const ah: RGB = aura && auraCopy ? rgb(auraHue(auraCopy.item, auraCopy.finish, auraCopy.print)) : gc;
  const tone: RGB = aura ? ah : gc;

  // ---------------------------------------------------------------- words
  const textW = W - M * 2 - 10;
  const pill = input.lines?.[0], subs = (input.lines ?? []).slice(1).flatMap(l => wrapText(l, textW));
  const titles = wrapText(input.title, textW);
  const titleH = titles.length * 12;
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
    // Brushed gold foil: bright at the top, deep at the foot, a fine line every third row.
    if (gold) {
      const base = mix(GOLD_HI, GOLD_LO, yy / H * 0.9 + 0.08 * Math.sin(x * 0.05 + yy * 0.02));
      return yy % 3 === 0 ? mix(base, GOLD_LO, 0.12) : base;
    }
    // A Negative card is printed pale so its edition turns it dark.
    if (neg) return mix(mix(IVORY, tone, 0.35), mix(IVORY, tone, 0.6), yy / H);
    return mix(mix(tone, WHITE, 0.08), mix(tone, INK, 0.25), yy / H);
  };
  const rows = Array.from({ length: H }, (_, yy) => gold ? null : stock(0, yy));
  const auraDeep = mix(ah, INK, 0.62), auraLight = mix(ah, INK, 0.3), inlay = mix(ah, WHITE, 0.7);
  for (let yy = 0; yy < H; yy++) for (let x = 0; x < W; x++) {
    const d = shape.depth[yy * W + x], bevel = shape.bevel[yy * W + x];
    if (!d) continue;
    if (d <= 2) { s.set(x, yy, INK); continue; }
    let c = rows[yy] ?? stock(x, yy);
    // A Grail's bevel is raised gold, lit at the top left and running deeper to the bottom right.
    if (gold && bevel) c = mix(mix([255, 238, 168], [150, 92, 18], (x + yy * 1.4) / (W + H * 1.4)), bevel === 1 ? WHITE : INK, 0.2);
    // A chunky bevel: lit along the top and left, deep along the bottom and right.
    else if (bevel === 1) c = mix(c, WHITE, 0.35);
    else if (bevel) c = mix(c, INK, 0.3);
    // An aura card has a fine line of pale foil inside the bevel.
    else if (aura && d <= 5) c = inlay;
    // The aura card is full-art: inside its bevel the aura's own colours swirl, edge to edge.
    if (aura && d > 6) {
      const r = Math.hypot((x - wcx) / 80, (yy - wcy) / 100);
      s.set(x, yy, mix(auraDeep, auraLight, Math.max(0, 1 - r) ** 1.2), 2);
      continue;
    }
    s.set(x, yy, c, 1);
  }

  // ---------------------------------------------------------------- the window
  // Light by grade, deep amber with a warm glow behind a Grail's guy; none on an aura card.
  const light: RGB = g >= 0 ? mix(IVORY, gc, 0.22) : mix(IVORY, gc, 0.12);
  if (!aura) for (let yy = WIN.top; yy <= WIN.bottom; yy++) for (let x = WIN.left; x <= WIN.right; x++) {
    const rim = x - WIN.left < 2 || WIN.right - x < 2 || yy - WIN.top < 2 || WIN.bottom - yy < 2;
    // A Grail's window is set in a dark line with a bright gold rim inside it.
    if (rim) { s.set(x, yy, gold && (x - WIN.left === 1 || WIN.right - x === 1 || yy - WIN.top === 1 || WIN.bottom - yy === 1) ? [255, 226, 140] : gold ? [72, 40, 6] : INK); continue; }
    const depth = (yy - WIN.top) / (WIN.bottom - WIN.top), r = Math.hypot((x - wcx) / 64, (yy - wcy) / 72);
    let c: RGB = gold ? mix(mix(AMBER, AMBER_GLOW, Math.max(0, 1 - r) ** 1.3), mix(AMBER, INK, 0.3), depth * 0.3) : mix(light, mix(light, gc, 0.35), depth * 0.6);
    // A shaded lip under the rim, so the window reads as set into the card.
    if (yy - WIN.top === 2 || x - WIN.left === 2) c = mix(c, INK, 0.35);
    s.set(x, yy, c, 2);
  }
  // A Grail's window is held by four raised gold studs at its corners.
  if (gold) for (const [sx, sy] of [[WIN.left + 1, WIN.top + 1], [WIN.right - 1, WIN.top + 1], [WIN.left + 1, WIN.bottom - 1], [WIN.right - 1, WIN.bottom - 1]]) {
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const d = dx * dx + dy * dy, x = sx + dx, yy = sy + dy;
      if (d > 10 || shape.depth[yy * W + x] <= 2) continue;
      s.set(x, yy, d > 6 ? [110, 66, 10] : mix([255, 244, 196], [196, 128, 26], (dx + dy + 4) / 8));
    }
  }

  // ---------------------------------------------------------------- the plate and its words
  // A Grail has no plate: its words are struck into the gold.
  if (!gold) for (let yy = plateTop; yy <= plateBottom; yy++) for (let x = side; x <= W - 1 - side; x++) {
    const pw = W - side * 2, ph = plateBottom - plateTop + 1;
    if (!inBox(x - side, yy - plateTop, pw, ph, 4)) continue;
    const edge = !inBox(x - side - 1, yy - plateTop, pw, ph, 4) || !inBox(x - side + 1, yy - plateTop, pw, ph, 4) || yy === plateTop || yy === plateBottom;
    const base: RGB = aura ? mix(mix(ah, INK, 0.6), INK, 0.45) : PLATE;
    s.set(x, yy, edge ? INK : yy === plateTop + 1 ? mix(base, WHITE, 0.16) : yy >= plateBottom - 2 ? mix(base, INK, 0.45) : base);
  }
  // The words sit on the dark plate: white, an aura card's title in its colour with a light running
  // along it. A Grail's are struck into the gold, dark, the light catching each cut's lower edge.
  const quiet: RGB = gold ? [110, 66, 10] : aura ? mix(ah, WHITE, 0.6) : [184, 176, 206];
  const titleInk = (x: number, yy: number, tm: number): RGB => mix(mix(ah, WHITE, 0.5), WHITE, 0.5 + 0.5 * Math.sin(x * 0.12 - tm / wave(1000 / 2) + yy * 0.1));
  const titlePixels: number[] = [];
  titles.forEach((l, k) => s.text(l, Math.floor((W - textWidth(l)) / 2), titleTop + k * 12 - 2, (x, yy) => {
    if (gold) return GOLD_INK;
    if (!aura) return WHITE;
    titlePixels.push(x, yy);
    return titleInk(x, yy, 0);
  }, gold ? GOLD_CUT : INK));
  rest.forEach((l, k) => s.text(l, Math.floor((W - textWidth(l)) / 2), subTop + k * 11 - 2, () => quiet));
  // The grade's badge: a chunky pill in its colour with a deep lip, as Balatro's rarity badges.
  if (pill) {
    const w = pillW, x0 = paired ? Math.floor((W - w - 6 - textWidth(subs[0])) / 2) : Math.floor((W - w) / 2);
    const fill: RGB = gold ? [96, 56, 10] : tone;
    for (let yy = pillTop; yy < pillTop + 15; yy++) for (let x = x0; x < x0 + w; x++) {
      if (!inBox(x - x0, yy - pillTop, w, 15, 4)) continue;
      const edge = !inBox(x - x0 - 1, yy - pillTop, w, 15, 4) || !inBox(x - x0 + 1, yy - pillTop, w, 15, 4) || yy === pillTop || yy === pillTop + 14;
      s.set(x, yy, edge ? INK : yy >= pillTop + 12 ? mix(fill, INK, 0.45) : yy === pillTop + 1 ? mix(fill, WHITE, 0.4) : fill);
    }
    s.text(pill, x0 + 7, pillTop - 1, () => (gold ? [255, 222, 130] : WHITE), mix(fill, INK, 0.6));
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

  // ---------------------------------------------------------------- the corner tag, over him
  const tag = new Surface(input.corner ? W : 0, input.corner ? H : 0);
  if (input.corner) {
    const w = textWidth(input.corner) + 6, x0 = WIN.right - 4 - w, y0 = WIN.top + 4;
    for (let yy = y0; yy < y0 + 14; yy++) for (let x = x0; x < x0 + w; x++) if (!((x === x0 || x === x0 + w - 1) && (yy === y0 || yy === y0 + 13))) tag.set(x, yy, yy >= y0 + 12 ? [0, 0, 0] : INK);
    tag.text(input.corner, x0 + 3, y0 - 2, () => WHITE);
  }
  const tagIdx: number[] = [];
  if (input.corner) for (let i = 0; i < W * H; i++) if (tag.px[i * 4 + 3]) tagIdx.push(i);

  // ---------------------------------------------------------------- where he stands
  // Standing in the middle of the window, on its floor; on an aura card he rises and floats, bobbing (Balatro's soul layer).
  const soul = aura;
  const ox = Math.round((WIN.left + WIN.right + 1) / 2 - fit.mid);
  const oy0 = soul
    ? Math.max(5 - fit.topAll * zoom, Math.round((WIN.top + WIN.bottom) / 2 - ((fit.topAll + fit.footAll + 1) * zoom) / 2) - 10)
    : Math.round((WIN.top + WIN.bottom + 1) / 2 - ((fit.rest + fit.foot + 1) * zoom) / 2) + 4;

  // ---------------------------------------------------------------- the frame he wears, behind him
  // A frame item's backdrop fills the whole window (an aura card's art), edge to edge under its rim, so
  // nothing drawn over it ever sticks out past a smaller box. It is painted once, outside the edition;
  // a copy whose finish shines is lit again each frame (`drawGuy`).
  const floor = Uint8Array.from(s.region, r => (r === 2 ? 1 : 0));
  const ground = input.copies?.some(o => itemById(o.item)?.slot === 'frame') ? (() => {
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let i = 0; i < W * H; i++) if (floor[i]) { const x = i % W, yy = (i - x) / W; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, yy); y1 = Math.max(y1, yy); }
    if (x1 < 0) return null;
    const gx0 = Math.floor((x0 - ox) / zoom), gy0 = Math.floor((y0 - oy0) / zoom), gw = Math.floor((x1 - ox) / zoom) - gx0 + 1, gh = Math.floor((y1 - oy0) / zoom) - gy0 + 1;
    const colors = backdropOf(input.seed, { parts: input.parts, palette: input.palette, equip: (input.copies ?? []).map(encode) }, gx0, gy0, gw, gh);
    if (!colors) return null;
    // Each window pixel's cell of the backdrop, and the cells' own colours, 0 to 1.
    const cells = new Float32Array(gw * gh * 3), pix: number[] = [], cellOf: number[] = [], diag: number[] = [];
    colors.forEach((row, j) => row.forEach((hex, i) => { const c = hex ? rgb(hex) : INK; for (let k = 0; k < 3; k++) cells[(j * gw + i) * 3 + k] = c[k] / 255; }));
    for (let i = 0; i < W * H; i++) {
      if (!floor[i]) continue;
      const x = i % W, yy = (i - x) / W, cx = Math.floor((x - ox) / zoom), cy = Math.floor((yy - oy0) / zoom), cell = (cy - gy0) * gw + cx - gx0;
      pix.push(i); cellOf.push(cell); diag.push(x - ox - cx * zoom + yy - oy0 - cy * zoom);
      s.set(x, yy, [cells[cell * 3] * 255, cells[cell * 3 + 1] * 255, cells[cell * 3 + 2] * 255]);
    }
    return { pix: Int32Array.from(pix), cell: Int32Array.from(cellOf), diag: Int32Array.from(diag), cells, gx0, gy0, gw, count: gw * gh };
  })() : null;

  // ---------------------------------------------------------------- the edition's field
  // Pixels the edition plays over: the card's face and its window.
  const edIdx: number[] = [];
  for (let i = 0; i < W * H; i++) if (s.region[i]) edIdx.push(i);
  const n = edIdx.length, ex = new Float32Array(n), ey = new Float32Array(n), er = new Uint8Array(n), eh = new Float32Array(n), ergb = new Float32Array(n * 3);
  edIdx.forEach((i, k) => {
    const x = i % W, yy = (i - x) / W;
    ex[k] = x / 5; ey[k] = yy / 5; er[k] = s.region[i]; eh[k] = shape.glint[(yy >> 1) * W + (x >> 1)];
    for (let j = 0; j < 3; j++) ergb[k * 3 + j] = s.px[i * 4 + j] / 255;
  });
  // A prototype look (./card-looks) works its field out on blocks of two card pixels: crisp, and a quarter of the work.
  const look = lookIndex(looks.look), looked = lookApplies(look, ed);
  const paint = look === 1 ? { colors: paintColors(auraCopy ? auraColors(auraCopy.item, auraCopy.finish, auraCopy.print) : [GRADES[Math.max(0, g)].color], auraCopy ? auraHue(auraCopy.item, auraCopy.finish, auraCopy.print) : GRADES[Math.max(0, g)].color), contrast: looks.contrast ?? PAINT_CONTRAST } : undefined;
  const block = (k: number) => (Math.floor(k * 2.5) * 2) / 5;
  const field = looked
    ? lookField(look, ed, v, [wcx / 5, wcy / 5], { x: ex.map(block), y: ey.map(block), region: er, h: eh, rgb: ergb }, paint)!
    : editionField(ed, v, [wcx / 5, wcy / 5], 0.2, { x: ex, y: ey, region: er, h: eh, rgb: ergb });
  const edOut = new Float32Array(n * 3), edAt = Int32Array.from(edIdx);

  // A tall hat pokes out over the window's top rather than being cut off.
  const pop = soul || oy0 + fit.top * zoom < WIN.top + 3;
  const clip = (cx: number, cy: number) => pop ? inside(cx, cy) && cx > 2 && cx < W - 3 && cy > 2 && cy < WIN.bottom - 1
    : cy > WIN.top + 1 && cy < WIN.bottom - 1 && cx > WIN.left && cx < WIN.right;
  const edgeC: RGB = aura ? mix(ah, WHITE, 0.55) : gold ? [255, 236, 170] : WHITE;

  // Where he may draw, and where his sticker edge turns white against the window's rim.
  const room = new Uint8Array(W * H);
  for (let yy = 0; yy < H; yy++) for (let x = 0; x < W; x++) if (clip(x, yy)) room[yy * W + x] = pop && (yy <= WIN.top + 1 || x <= WIN.left + 1 || x >= WIN.right - 1) ? 2 : 1;
  const mask = new Uint8Array((anim.width * zoom + 4) * (FRAME_HEIGHT * zoom + 4));
  // A finish's light runs along a cell's diagonals, so it is worked out once for each of them.
  const lit = new Float32Array((zoom * 2 - 1) * 3), litDone = new Uint8Array(zoom * 2 - 1);
  /**
   * His frame drawn into `body` with its top-left at `oy`: the sticker edge
   * round him, his pixels, each worn copy's finish on its own pixels (on the
   * card's raw clock `shineTime`, as the guy keeps it), and the soft shadows
   * on the window's floor under him and his buddy.
   */
  // The soft shadows under him and his buddy, by frame of his move: middle x, y and half width.
  const floors = new Map<CardFrame, number[]>();
  const floorsOf = (frame: CardFrame, oy: number) => {
    let got = floors.get(frame);
    if (got) return got;
    const { colors, slots } = frame;
    got = [];
    for (const buddy of [false, true]) {
      let lo = -1, l = Infinity, r = -Infinity;
      const own = (gx: number, gy: number) => !!colors[gy][gx] && slots[gy][gx] !== 5 && slots[gy][gx] !== 3 && (slots[gy][gx] === 4) === buddy;
      colors.forEach((row, gy) => row.forEach((_, gx) => { if (own(gx, gy)) lo = gy; }));
      if (lo < 0) continue;
      for (let gy = Math.max(0, lo - 1); gy <= lo; gy++) colors[gy].forEach((_, gx) => { if (own(gx, gy)) { l = Math.min(l, cellX(gx, slots[gy][gx])); r = Math.max(r, cellX(gx, slots[gy][gx]) + zoom); } });
      got.push(ox + (l + r) / 2, Math.min(WIN.bottom - 7, oy + (lo + 1) * zoom - 3), Math.max(6, (r - l) * 0.38 + 2));
    }
    floors.set(frame, got);
    return got;
  };
  /**
   * The sticker edge round him for a frame of his move standing at `oy`, so his dark outline never sinks
   * into the window: each empty pixel two across or down from him, or one diagonally. Card pixel indices,
   * doubled, plus one where it turns white against the window's rim; kept by frame.
   */
  const edges = new Map<CardFrame, Map<number, Int32Array>>();
  const edgesOf = (frame: CardFrame, oy: number) => {
    let byY = edges.get(frame);
    if (!byY) edges.set(frame, byY = new Map());
    let got = byY.get(oy);
    if (got) return got;
    const { colors, slots } = frame, fh = colors.length, fw = colors[0]?.length ?? 0;
    // His solid pixels in card pixels, over his frame and two empty pixels round it, `bw` across.
    // The empty border keeps a step off the end of one row from landing on him in the next.
    const bx = ox - 2, by = oy - 2, bw = fw * zoom + 4, bh = fh * zoom + 4, out: number[] = [];
    mask.fill(0, 0, bw * bh);
    for (let gy = 0; gy < fh; gy++) {
      const row = colors[gy], srow = slots[gy];
      for (let gx = 0; gx < fw; gx++) if (row[gx] && srow[gx] !== 5 && srow[gx] !== 3)
        for (let dy = 0; dy < zoom; dy++) mask.fill(1, (2 + gy * zoom + dy) * bw + 2 + cellX(gx, srow[gx]), (2 + gy * zoom + dy) * bw + 2 + cellX(gx, srow[gx]) + zoom);
    }
    for (let j = 0; j < bh; j++) {
      const yy = by + j;
      if (yy < 0 || yy >= H) continue;
      for (let k = 0; k < bw; k++) {
        const m = j * bw + k, x = bx + k;
        if (mask[m] || x < 0 || x >= W) continue;
        const r = room[yy * W + x];
        if (r && (mask[m + 2] || mask[m - 2] || mask[m + bw * 2] || mask[m - bw * 2] || mask[m + bw + 1] || mask[m + bw - 1] || mask[m - bw + 1] || mask[m - bw - 1])) out.push((yy * W + x) * 2 + (r === 2 ? 1 : 0));
      }
    }
    byY.set(oy, got = Int32Array.from(out));
    return got;
  };
  const frameCopy = owned.frame, DIAGS = zoom * 2 - 1;
  const groundShine = ground && frameCopy && shines(frameCopy) ? SHADER_FINISHES.indexOf(frameCopy.finish as (typeof SHADER_FINISHES)[number]) : -1;
  const groundDone = new Uint8Array(ground && groundShine >= 0 ? ground.count * DIAGS : 0), groundLit = new Float32Array(groundDone.length * 3);
  const drawGuy = (frame: CardFrame, oy: number, body: Uint8ClampedArray, shineTime: number) => {
    const { colors, slots } = frame, fh = colors.length, fw = colors[0]?.length ?? 0;
    const put = (i: number, r: number, g: number, b: number) => { body[i * 4] = r; body[i * 4 + 1] = g; body[i * 4 + 2] = b; };
    // A frame whose finish shines, lit again: once for each of a cell's diagonals.
    if (ground && frameCopy && groundShine >= 0) {
      groundDone.fill(0);
      for (let k = 0; k < ground.pix.length; k++) {
        const cell = ground.cell[k], j = cell * DIAGS + ground.diag[k];
        if (!groundDone[j]) {
          groundDone[j] = 1;
          const gx = ground.gx0 + cell % ground.gw, gy = ground.gy0 + Math.floor(cell / ground.gw), c = ground.cells;
          const out = finishColor([c[cell * 3], c[cell * 3 + 1], c[cell * 3 + 2]], groundShine, frameCopy.scuff, hash(gx, gy, frameCopy.print), gx + gy + ground.diag[k] / zoom, gy, frameCopy.print, shineTime, 1);
          groundLit[j * 3] = out[0] * 255; groundLit[j * 3 + 1] = out[1] * 255; groundLit[j * 3 + 2] = out[2] * 255;
        }
        put(ground.pix[k], groundLit[j * 3], groundLit[j * 3 + 1], groundLit[j * 3 + 2]);
      }
    }
    // A soft shadow on the window's floor under each of them, under the cells of their bottom rows.
    const fl = aura ? [] : floorsOf(frame, oy);
    for (let f = 0; f < fl.length; f += 3) {
      const sx = fl[f], sy = fl[f + 1], rx = fl[f + 2];
      for (let yy = Math.ceil(sy - 4); yy <= sy + 4; yy++) for (let x = Math.ceil(sx - rx); x <= sx + rx; x++) {
        if (x < 0 || yy < 0 || x >= W || yy >= H || !floor[yy * W + x]) continue;
        const fx = (x - sx) / rx, fy = (yy - sy) / 4, d = fx * fx + fy * fy;
        if (d >= 1) continue;
        const i = (yy * W + x) * 4, k = 1 - 0.16 * (1 - d);
        body[i] *= k; body[i + 1] *= k; body[i + 2] *= k;
      }
    }
    for (const e of edgesOf(frame, oy)) { const c = e & 1 ? WHITE : edgeC; put(e >> 1, c[0], c[1], c[2]); }
    // His pixels and his buddy's; a frame item's backdrop is the window's own ground (`ground`).
    for (let gy = 0; gy < fh; gy++) for (let gx = 0; gx < fw; gx++) {
      const hex = colors[gy][gx];
      if (!hex || slots[gy][gx] === 3) continue;
      const slot = slots[gy][gx], copy = slot ? owned[FRAME_SLOTS[slot - 1]] : undefined, x0 = ox + cellX(gx, slot);
      const f = copy ? SHADER_FINISHES.indexOf(copy.finish as (typeof SHADER_FINISHES)[number]) : -1, c = rgb(hex);
      if (copy && f >= 0) litDone.fill(0);
      for (let dy = 0; dy < zoom; dy++) for (let dx = 0; dx < zoom; dx++) {
        const cx = x0 + dx, cy = oy + gy * zoom + dy;
        if (cx < 0 || cy < 0 || cx >= W || cy >= H || !room[cy * W + cx]) continue;
        if (!copy || f < 0) { put(cy * W + cx, c[0], c[1], c[2]); continue; }
        // Under the polychrome look a Prism copy turns with the card's field, a whole cell at a time.
        if (look === 2 && f === PRISM) {
          if (!litDone[0]) {
            litDone.fill(1);
            const out = polyColor([c[0] / 255, c[1] / 255, c[2] / 255], [x0 / 5, (oy + gy * zoom) / 5], [wcx / 5, wcy / 5], shineTime, Math.min(1, Math.max(0, 1 - copy.scuff * 1.4)));
            lit[0] = out[0] * 255; lit[1] = out[1] * 255; lit[2] = out[2] * 255;
          }
          put(cy * W + cx, lit[0], lit[1], lit[2]);
          continue;
        }
        const k = dx + dy;
        if (!litDone[k]) {
          litDone[k] = 1;
          const out = finishColor([c[0] / 255, c[1] / 255, c[2] / 255], f, copy.scuff, hash(gx, gy, copy.print), (cx + cy) / zoom, gy, copy.print, shineTime, 1);
          lit[k * 3] = out[0] * 255; lit[k * 3 + 1] = out[1] * 255; lit[k * 3 + 2] = out[2] * 255;
        }
        put(cy * W + cx, lit[k * 3], lit[k * 3 + 1], lit[k * 3 + 2]);
      }
    }
    // A rare aura's rings run past the frame's sides into the window's margins.
    for (const [gx, gy, hex] of frame.outside ?? []) for (let dy = 0; dy < zoom; dy++) for (let dx = 0; dx < zoom; dx++) {
      const cx = ox + gx * zoom + dx, cy = oy + gy * zoom + dy, c = rgb(hex);
      if (cx >= 0 && cy >= 0 && cx < W && cy < H && room[cy * W + cx]) put(cy * W + cx, c[0], c[1], c[2]);
    }
  };

  // ---------------------------------------------------------------- on its shadow
  const body = s.px.slice();

  return {
    /** Whether the card changes over time, apart from his move and its lift. */
    moves: ed > 0 || Object.values(owned).some(o => o && shines(o)),
    /** How far the card lifts off its shadow and how far he bobs at `t` seconds: with his frame, all a still card's picture depends on. */
    pose(t: number) {
      const tm = t * 1000 + shift;
      return { lift: Math.round(1 + Math.sin(TAU_MS(tm, 3000))), bob: soul ? Math.round(Math.sin(tm / wave(1000 / 2.6)) * 2) : 0 };
    },
    /** The card at `t` seconds, with his frame `frame` in its window, into `out` (the whole card, RGBA). */
    draw(frame: CardFrame, t: number, out: Uint8ClampedArray): Uint8ClampedArray {
      const tm = t * 1000 + shift, time = loopSeconds(tm), { lift, bob } = this.pose(t);
      body.set(s.px);
      // The edition over the face and the window.
      field(time, edOut);
      for (let k = 0; k < n; k++) { const i = edAt[k] * 4; body[i] = edOut[k * 3] * 255; body[i + 1] = edOut[k * 3 + 1] * 255; body[i + 2] = edOut[k * 3 + 2] * 255; }
      drawGuy(frame, oy0 + bob, body, loopSeconds(t * 1000));
      for (const i of tagIdx) body.set(tag.px.subarray(i * 4, i * 4 + 3), i * 4);
      for (let k = 0; k < titlePixels.length; k += 2) {
        const c = titleInk(titlePixels[k], titlePixels[k + 1], tm), i = (titlePixels[k + 1] * W + titlePixels[k]) * 4;
        body[i] = c[0]; body[i + 1] = c[1]; body[i + 2] = c[2];
      }
      // It stands on a hard shadow and lifts off it now and then, the shadow staying on the table.
      out.set(shape.shadow);
      for (let yy = 0; yy < H; yy++) {
        const [a, b] = shape.runs[yy];
        if (a >= 0) out.set(body.subarray((yy * W + a) * 4, (yy * W + b + 1) * 4), ((yy + 2 - lift) * W + a) * 4);
      }
      return out;
    },
  };
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

/** How a page plays a card. */
export interface CardPlayerOptions {
  /**
   * Keep every frame once drawn (the default), so the next loop only shows
   * them; or `false` to draw each frame into one picture that is reused, for
   * a page showing many cards: a frame costs about a millisecond.
   */
  keep?: boolean;
  /** A prototype look for the card's edition (./card-looks): nothing uses one yet. */
  look?: LookOptions['look'];
  /** How hard the `paint` look's bands are. */
  contrast?: number;
}

/**
 * A card to play on screen: each frame is drawn the first time it is asked
 * for and kept, so a page can show a card at once and spread the work out.
 * It loops perfectly: his move played the whole number of times that fits
 * whole turns of LOOP_MS, with every sheen on the card on the same clock. A
 * card with nothing shining draws each pose of his once and shows it again.
 */
export function cardPlayer(input: CardInput, ms = 80, { keep = true, look, contrast }: CardPlayerOptions = {}) {
  const options = { parts: input.parts, palette: input.palette, equip: (input.copies ?? []).map(encode), rarity: false };
  const anim = animate(input.seed, input.move ?? 'idle', { ...options, loop: { fit: true } }), turns = anim.turns ?? 1;
  const owned = ownedBySlot(input.copies ?? []), g = cardGrade(input), art = cardArt(input, anim, owned, g, cardEdition(input, g), { look, contrast });
  const total = anim.duration, count = Math.max(1, Math.round(total / ms)), cache: Uint8ClampedArray[] = [];
  const delays = Array.from({ length: count }, (_, k) => Math.round((k + 1) * total / count) - Math.round(k * total / count));
  const frameOf = new Map(anim.frames.map((f, k) => [f, k]));
  // A card with nothing moving but him is the same picture whenever he holds the same pose at the same lift.
  const poses = new Map<number, Uint8ClampedArray>();
  const one = keep ? null : new Uint8ClampedArray(CARD_WIDTH * CARD_HEIGHT * 4);
  let shown = -1;
  return {
    width: CARD_WIDTH, height: CARD_HEIGHT, count, delay: total / count, delays,
    /** The frame showing at `i` (wraps round). Without `keep`, the same picture redrawn: show it before asking for the next. */
    frame(i: number): Uint8ClampedArray {
      const k = ((i % count) + count) % count;
      if (cache[k]) return cache[k];
      const frame = frameAt(anim, k * total / count), t = ((k * turns * LOOP_MS) / count % LOOP_MS) / 1000;
      const { lift } = art.pose(t), pose = art.moves ? -1 : frameOf.get(frame)! * 4 + lift;
      if (!keep) {
        if (pose < 0 || pose !== shown) art.draw(frame, t, one!);
        shown = pose;
        return one!;
      }
      let px = pose >= 0 ? poses.get(pose) : undefined;
      if (!px) { px = art.draw(frame, t, new Uint8ClampedArray(CARD_WIDTH * CARD_HEIGHT * 4)); if (pose >= 0) poses.set(pose, px); }
      return cache[k] = px;
    },
  };
}

/** The card standing still, for a picture. */
export function cardStill(input: CardInput, t = 0.6, looks: LookOptions = {}): Uint8ClampedArray {
  const anim = animateLoop(input.seed, input.move ?? 'idle', { parts: input.parts, palette: input.palette, equip: (input.copies ?? []).map(encode), rarity: false });
  const g = cardGrade(input);
  return cardArt(input, anim, ownedBySlot(input.copies ?? []), g, cardEdition(input, g), looks).draw(frameAt(anim, 0), t, new Uint8ClampedArray(CARD_WIDTH * CARD_HEIGHT * 4));
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
