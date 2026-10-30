import { animate, animateLoop, backdropOf, frameAt, FRAME_HEIGHT, FRAME_SLOTS, FRAME_WIDTH, type Animation, type AnimationFrame, type AnimateOptions, type Move } from './animate';
import { editionOf, finishColor, loopSeconds, SHADER_FINISHES } from './finish-shader';
import { cycle, LOOP_MS, wave } from './loop';
import { encode, GRADES, gradeOf, GRAPHIC_FINISHES, special, unusual, type Owned } from './owned';
import { BADGE_INKS, EFFECTS, FX_BADGES } from './effects';
import { GLYPHS } from './font';
import { encodeGif, encodePng, type Frames } from './gif';
import { itemById } from './items';
import { auraColors, auraHue } from './auras';
import { cardField, lookFor, paintColors, PAINT_CONTRAST, paintForm, type LookOptions } from './card-looks';

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
  /** The grade's badge, then a short line beside it (his @name). Any ★ is left off. */
  lines?: string[];
  /** The small line at the foot, as "1st edition", on one line; a part starting with "#" (a print number) is left off. A 1st edition also gets a seal. */
  footer?: string;
  /**
   * A second, smaller plate under the badge's line, in the colour of `grade`
   * (0 Everyday to 5 Aura): the best copy they wear, as "★ Grail · Gold Goldfish".
   */
  plate?: { text: string; grade: number };
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


// Glyphs the font's ASCII lacks, in its own style: curly quotes are its straight ones, turned.
const EXTRA: Record<string, [number, number[]]> = {
  '·': [5, [0, 0, 0, 0, 0, 0, 6, 6, 0, 0, 0, 0, 0, 0, 0, 0]],
  '★': [9, [0, 0, 0, 8, 8, 28, 127, 62, 28, 54, 34, 0, 0, 0, 0, 0]],
  '#': [8, [0, 0, 0, 0, 18, 18, 63, 18, 18, 63, 18, 18, 0, 0, 0, 0]],
  '…': [9, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 219, 219, 0, 0, 0]],
  '’': [3, [0, 0, 3, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
  '‘': [3, [0, 0, 2, 1, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
  '“': [6, [0, 0, 18, 9, 27, 27, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
  '”': [6, [0, 0, 27, 27, 18, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
};
const glyph = (ch: string) => EXTRA[ch] ?? GLYPHS[ch] ?? GLYPHS['?'];
/** Whether the card's pixel type has a glyph for `ch` (anything else is written "?"). */
export const hasGlyph = (ch: string): boolean => ch in EXTRA || ch in GLYPHS;
/** How wide a line of text is, in pixels. */
export const textWidth = (s: string) => [...s].reduce((w, ch) => w + glyph(ch)[0], 0);

/** A line of text made to fit `width` on one line: as it is, a pixel tighter between letters, or cut short with "…". */
function fitLine(text: string, width: number): { text: string; spacing: number } {
  const wide = (t: string, spacing: number) => textWidth(t) + spacing * ([...t].length - 1);
  if (wide(text, 0) <= width) return { text, spacing: 0 };
  if (wide(text, -1) <= width) return { text, spacing: -1 };
  const chars = [...text];
  while (chars.length > 1 && wide(chars.join('').trimEnd() + '…', -1) > width) chars.pop();
  return { text: chars.join('').trimEnd() + '…', spacing: -1 };
}
/** The grade badge's room either side of its word, and the gap after it: tight, so a rank beside it fits whole. */
const PILL_PAD = 6, PILL_GAP = 4;
/** The line beside the badge, fitted to `width`; a rank ("Top 0.055%") drops its "Top" rather than be cut. */
export function rankFit(text: string, width: number): { text: string; spacing: number } {
  const fit = fitLine(text, width);
  return fit.text === text ? fit : fitLine(text.replace(/^Top (?=\d)/, ''), width);
}
/** How wide the line beside a badge reading `pill` may be. */
export const rankRoom = (pill: string) => CARD_WIDTH - M * 2 - 10 - textWidth(pill) - PILL_PAD * 2 - PILL_GAP;
/** Card words without the ★ glyph. */
const unstarred = (t: string) => t.replace(/★\s*/g, '').trim();
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
  /** Text with a hard drop shadow, its colour picked per pixel so foil can run along it; `spacing` added to each letter's advance. */
  text(s: string, x: number, top: number, colour: (x: number, y: number) => RGB, shadow?: RGB, spacing = 0): void {
    const draw = (ox: number, oy: number, col: (x: number, y: number) => RGB) => {
      let cx = ox;
      for (const ch of s) {
        const [adv, rows] = glyph(ch);
        rows.forEach((bits, dy) => { for (let dx = 0; bits >> dx; dx++) if (bits & (1 << dx)) this.set(cx + dx, oy + dy, col(cx + dx, oy + dy)); });
        cx += adv + spacing;
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

/**
 * A Grail: `framed` (the default) a dark card round a window of gold in a few large soft bands, a thin
 * bright gold line along its bevel and inside the window's rim, on the dark plate every card has;
 * `brushed` the earlier brushed gold card, its words struck into the gold.
 */
export const CARD_GOLDS = ['framed', 'brushed'] as const;
export type CardGold = (typeof CARD_GOLDS)[number];
/** The framed Grail's clean gold, its light top edge and its deep lower edge; its dark stock and its badge's words. */
const BRIGHT_GOLD: RGB = [247, 201, 72], GOLD_LIGHT: RGB = [255, 233, 160], GOLD_DEEP: RGB = [201, 146, 30];
const DARK_HI: RGB = [46, 42, 64], DARK_LO: RGB = [28, 24, 40], PILL_INK: RGB = [74, 46, 6];
/** The framed Grail's window's three golds, deep to light. */
const FIELD_GOLDS: [RGB, RGB, RGB] = [[176, 112, 24], [226, 164, 52], [250, 206, 110]];
/** The brushed Grail's bevel deep, window rim, quiet words and studs, and badge. */
const BRUSHED = { bevelLo: [150, 92, 18] as RGB, rim: [72, 40, 6] as RGB, quiet: [110, 66, 10] as RGB, pill: [96, 56, 10] as RGB };

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
function buddyNudge(anim: Animation, grid = false): number {
  if (anim.width <= FRAME_WIDTH) return 0;
  let guy = -1, buddy = anim.width;
  for (const f of anim.frames) f.colors.forEach((row, y) => row.forEach((c, x) => {
    if (!c || f.slots[y][x] === 3 || f.slots[y][x] === 5) return;
    if (x < FRAME_WIDTH) guy = Math.max(guy, x); else buddy = Math.min(buddy, x);
  }));
  // On his own grid the buddy moves in whole cells, keeping one empty column between them.
  return grid ? Math.max(0, (buddy - guy - 2) * ZOOM) : Math.max(0, (buddy - guy - 1) * ZOOM - 2);
}

/**
 * How he stands out from the window: `none` (the default) on his own dark outline, everything in the
 * window on his own grid and his whole move kept inside it; `sticker` the earlier white sticker edge a
 * card pixel or two round him, a tall hat poking out over the window.
 */
export const CARD_EDGES = ['none', 'sticker'] as const;
export type CardEdge = (typeof CARD_EDGES)[number];

/** How a card is drawn, where it differs from the defaults: its edition's look, a Grail's gold, his edge. */
export type CardStyle = LookOptions & { gold?: CardGold; edge?: CardEdge };

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
function cardArt(input: CardInput, anim: Animation, owned: OwnedBySlot, g: number, ed: number, looks: CardStyle = {}) {
  // Where a cell of his frame starts across, in card pixels: his buddy's room (an aura's cells aside) nudged in.
  const edge = looks.edge ?? 'none', grid = edge === 'none';
  const zoom = ZOOM, nudge = buddyNudge(anim, grid);
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
  // A Grail's words are struck into its gold when it is brushed; framed, it has the dark plate every card has.
  const framed = gold && looks.gold !== 'brushed', struck = gold && !framed;
  const gc: RGB = g >= 0 ? rgb(GRADES[g].color) : [104, 118, 146];
  const auraCopy = owned.aura;
  const ah: RGB = aura && auraCopy ? rgb(auraHue(auraCopy.item, auraCopy.finish, auraCopy.print)) : gc;
  const tone: RGB = aura ? ah : gc;

  // ---------------------------------------------------------------- words
  // No ★, the title its item's name alone on one line, the badge and his name on one line, the foot
  // line on one line without a print number, all from one left edge; a line too long for its room
  // is set a pixel tighter, or cut short.
  const textW = W - M * 2 - 10, left = side + 5;
  const copies = input.copies ?? [];
  // The copy that sets the card's grade and edition (the last such), and the copy whose effect it names.
  const topCopy = copies.filter(o => GRADES.findIndex(x => x.id === gradeOf(o).id) === g).pop();
  const unusualCopy = [...copies].reverse().find(o => unusual(o) && o.fx);
  const pill = input.lines?.[0] ? unstarred(input.lines[0]) : undefined;
  // An Unusual's effect is in its title ("Electric Top hat"). A title too long for its line drops a
  // Strange or Souvenir word first, since the card shows the count on its own plate, then the
  // effect's name, which the badge in the window carries: the item's own name is never cut for them.
  let titleText = unstarred(input.title.split(' | ')[0]);
  // Only on the copy's own card (its title names the item), and never a showpiece's own effect, which is part of the item.
  const unusualItem = unusualCopy ? itemById(unusualCopy.item) : undefined;
  const fxName = unusualCopy?.fx && unusualCopy.fx !== unusualItem?.signature && unusualItem && titleText.includes(unusualItem.name) ? EFFECTS[unusualCopy.fx].name : '';
  if (fxName && !titleText.includes(fxName)) titleText = `${fxName} ${titleText}`;
  const tooLong = (text: string) => textWidth(text) - [...text].length + 1 > textW;
  for (const word of ['Strange ', 'Souvenir ', ...(fxName ? [`${fxName} `] : [])]) if (tooLong(titleText) && titleText.includes(word)) titleText = titleText.replace(word, '');
  const titleFit = fitLine(titleText, textW);
  const footLine = (input.footer ?? '').split(' · ').filter(part => part && !part.startsWith('#')).join(' · ');
  // A 1st edition carries a seal at the foot line's end, so the line leaves it room.
  const sealed = /\b1st edition\b/i.test(input.footer ?? '');
  const footFit = footLine ? fitLine(footLine, textW - (sealed ? 18 : 0)) : undefined;
  const footH = footFit || sealed ? 11 : 0;
  // Its colour says the grade, so a line too long for it drops the grade's word before it is cut.
  const plateText = unstarred(input.plate?.text ?? ''), plateBare = plateText.replace(/^[^·]*·\s*/, '');
  const plateRow = plateText ? fitLine(textWidth(plateText) - [...plateText].length + 1 > textW - 10 && plateBare ? plateBare : plateText, textW - 10) : undefined;
  const plateGrade = Math.max(0, Math.min(GRADES.length - 1, input.plate?.grade ?? 0));
  // The grade's badge shares its row with a short line, as "Everyday  @mochi", or his rank, "Uncommon
  // Top 48%". A rank too long for the room beside the badge drops its "Top" before it loses a digit.
  const pillW = pill ? textWidth(pill) + PILL_PAD * 2 : 0;
  const subW = pill ? rankRoom(pill) : textW;
  const sub = input.lines?.[1] ? rankFit(unstarred(input.lines[1]), subW) : undefined;
  // From the foot up: the plate holds the title, the badge and the lines, and the set line.
  const plateBottom = H - 1 - 6;
  let y = plateBottom - 3 - footH;
  const footTop = y;
  if (footH) y -= 2;
  // The second plate, under the badge's line.
  const plateRowTop = plateRow ? (y -= 14) : y;
  if (plateRow) y -= 2;
  const pillTop = pill || sub ? (y -= 15) : y;
  if (pill || sub) y -= 3;
  y -= 12;
  const titleTop = y;
  const plateTop = y - 3;
  const WIN = { left: side, right: W - 1 - side, top: 6, bottom: plateTop - 4 };
  const wcx = (WIN.left + WIN.right) / 2, wcy = WIN.top + (WIN.bottom - WIN.top) * 0.45;
  // The biggest square inside the window's rim, centred: the art alone (`cardArtPlayer`).
  const inW = WIN.right - WIN.left - 3, inH = WIN.bottom - WIN.top - 3, side2 = Math.min(inW, inH);
  const square = { x: WIN.left + 2 + Math.floor((inW - side2) / 2), y: WIN.top + 2 + Math.floor((inH - side2) / 2), size: side2 };

  // ---------------------------------------------------------------- the card's stock
  // The colour the card is printed on, before its edition.
  const stock = (x: number, yy: number): RGB => {
    // A framed Grail is printed dark round its gold window.
    if (framed) return mix(DARK_HI, DARK_LO, yy / H);
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
  // A framed Grail's gold lines, which its sheen crosses: along the bevel and inside the window's rim.
  const trim = new Uint8Array(W * H);
  for (let yy = 0; yy < H; yy++) for (let x = 0; x < W; x++) {
    const d = shape.depth[yy * W + x], bevel = shape.bevel[yy * W + x];
    if (!d) continue;
    if (d <= 2) { s.set(x, yy, INK); continue; }
    let c = rows[yy] ?? stock(x, yy);
    // A framed Grail's bevel carries a line of clean gold, light along the top and left and deep along the bottom and right.
    if (framed && bevel && d === 3) { c = bevel === 1 ? GOLD_LIGHT : GOLD_DEEP; trim[yy * W + x] = 1; }
    // A brushed Grail's bevel is raised gold, lit at the top left and running deeper to the bottom right.
    else if (struck && bevel) c = mix(mix([255, 238, 168], BRUSHED.bevelLo, (x + yy * 1.4) / (W + H * 1.4)), bevel === 1 ? WHITE : INK, 0.2);
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
  /** A framed Grail's window: a few large soft bands of three golds, on blocks of two card pixels, holding still. */
  const fieldGold = (x: number, yy: number): RGB => {
    const qx = ((x >> 1) * 2 - wcx) / 40, qy = ((yy >> 1) * 2 - wcy) / 40;
    const t = 0.5 + 0.5 * Math.sin(qy * 3.2 + 1.3 * Math.sin(qx * 2.4 + 0.6) + 0.6 * Math.sin(qx * 4.1 - qy * 1.7));
    const k1 = Math.min(1, Math.max(0, (t - 0.35) / 0.12 + 0.5)), k2 = Math.min(1, Math.max(0, (t - 0.72) / 0.12 + 0.5));
    return mix(mix(FIELD_GOLDS[0], FIELD_GOLDS[1], k1), FIELD_GOLDS[2], k2);
  };
  // A famous print or a graphic finish has a window of its own (`windowArt`), which the edition leaves alone.
  const own = !aura && !gold && topCopy ? windowArt(topCopy, WIN, wcx, wcy) : null;
  if (!aura) for (let yy = WIN.top; yy <= WIN.bottom; yy++) for (let x = WIN.left; x <= WIN.right; x++) {
    const rim = x - WIN.left < 2 || WIN.right - x < 2 || yy - WIN.top < 2 || WIN.bottom - yy < 2;
    // A Grail's window is set in a dark line with a gold line inside it.
    if (rim) {
      const inner = x - WIN.left === 1 || WIN.right - x === 1 || yy - WIN.top === 1 || WIN.bottom - yy === 1;
      if (framed && inner) trim[yy * W + x] = 1;
      s.set(x, yy, framed && inner ? BRIGHT_GOLD : struck && inner ? [255, 226, 140] : struck ? BRUSHED.rim : INK);
      continue;
    }
    const depth = (yy - WIN.top) / (WIN.bottom - WIN.top), r = Math.hypot((x - wcx) / 64, (yy - wcy) / 72);
    let c: RGB = framed ? fieldGold(x, yy) : !gold ? mix(light, mix(light, gc, 0.35), depth * 0.6)
      : mix(mix(AMBER, AMBER_GLOW, Math.max(0, 1 - r) ** 1.3), mix(AMBER, INK, 0.3), depth * 0.3);
    if (own) c = own(x, yy, 0);
    // A shaded lip under the rim, so the window reads as set into the card.
    if (yy - WIN.top === 2 || x - WIN.left === 2) c = mix(c, INK, 0.35);
    s.set(x, yy, c, own ? 3 : 2);
  }
  // A brushed Grail's window is held by four raised gold studs at its corners.
  if (struck) for (const [sx, sy] of [[WIN.left + 1, WIN.top + 1], [WIN.right - 1, WIN.top + 1], [WIN.left + 1, WIN.bottom - 1], [WIN.right - 1, WIN.bottom - 1]]) {
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const d = dx * dx + dy * dy, x = sx + dx, yy = sy + dy;
      if (d > 10 || shape.depth[yy * W + x] <= 2) continue;
      s.set(x, yy, d > 6 ? BRUSHED.quiet : mix([255, 244, 196], [196, 128, 26], (dx + dy + 4) / 8));
    }
  }

  // ---------------------------------------------------------------- the plate and its words
  // A brushed Grail has no plate: its words are struck into the gold.
  const onPlate = new Uint8Array(W * H);
  if (!struck) for (let yy = plateTop; yy <= plateBottom; yy++) for (let x = side; x <= W - 1 - side; x++) {
    const pw = W - side * 2, ph = plateBottom - plateTop + 1;
    if (!inBox(x - side, yy - plateTop, pw, ph, 4)) continue;
    const edge = !inBox(x - side - 1, yy - plateTop, pw, ph, 4) || !inBox(x - side + 1, yy - plateTop, pw, ph, 4) || yy === plateTop || yy === plateBottom;
    const base: RGB = aura ? mix(mix(ah, INK, 0.6), INK, 0.45) : PLATE;
    onPlate[yy * W + x] = 1;
    s.set(x, yy, edge ? INK : yy === plateTop + 1 ? mix(base, WHITE, 0.16) : yy >= plateBottom - 2 ? mix(base, INK, 0.45) : base);
  }
  // The words sit on the dark plate: white, an aura card's title in its colour with a light running
  // along it. A Grail's are struck into the gold, dark, the light catching each cut's lower edge.
  const quiet: RGB = struck ? BRUSHED.quiet : aura ? mix(ah, WHITE, 0.6) : [184, 176, 206];
  const titleInk = (x: number, yy: number, tm: number): RGB => mix(mix(ah, WHITE, 0.5), WHITE, 0.5 + 0.5 * Math.sin(x * 0.12 - tm / wave(1000 / 2) + yy * 0.1));
  const titlePixels: number[] = [];
  s.text(titleFit.text, left, titleTop - 2, (x, yy) => {
    if (struck) return GOLD_INK;
    if (!aura) return WHITE;
    titlePixels.push(x, yy);
    return titleInk(x, yy, 0);
  }, struck ? GOLD_CUT : INK, titleFit.spacing);
  // The grade's badge: a chunky pill in its colour with a deep lip, as Balatro's rarity badges.
  if (pill) {
    const w = pillW, x0 = left;
    const fill: RGB = struck ? BRUSHED.pill : framed ? BRIGHT_GOLD : tone;
    for (let yy = pillTop; yy < pillTop + 15; yy++) for (let x = x0; x < x0 + w; x++) {
      if (!inBox(x - x0, yy - pillTop, w, 15, 4)) continue;
      const edge = !inBox(x - x0 - 1, yy - pillTop, w, 15, 4) || !inBox(x - x0 + 1, yy - pillTop, w, 15, 4) || yy === pillTop || yy === pillTop + 14;
      s.set(x, yy, edge ? INK : yy >= pillTop + 12 ? mix(fill, INK, 0.45) : yy === pillTop + 1 ? mix(fill, WHITE, 0.4) : fill);
    }
    s.text(pill, x0 + PILL_PAD, pillTop - 1, () => (struck ? [255, 222, 130] : framed ? PILL_INK : WHITE), framed ? GOLD_LIGHT : mix(fill, INK, 0.6));
  }
  if (sub) s.text(sub.text, pill ? left + pillW + PILL_GAP : left, pillTop - 1, () => quiet, undefined, sub.spacing);
  if (footFit) s.text(footFit.text, left, footTop - 2, () => quiet, undefined, footFit.spacing);
  // The second plate: a smaller pill in its grade's colour, under the badge's line.
  if (plateRow) {
    const w = Math.min(textW, textWidth(plateRow.text) + plateRow.spacing * ([...plateRow.text].length - 1) + 10), x0 = left, fill = rgb(GRADES[plateGrade].color);
    const ink: RGB = plateGrade === 4 ? PILL_INK : WHITE;
    for (let yy = plateRowTop; yy < plateRowTop + 14; yy++) for (let x = x0; x < x0 + w; x++) {
      if (!inBox(x - x0, yy - plateRowTop, w, 14, 3)) continue;
      const edge = !inBox(x - x0 - 1, yy - plateRowTop, w, 14, 3) || !inBox(x - x0 + 1, yy - plateRowTop, w, 14, 3) || yy === plateRowTop || yy === plateRowTop + 13;
      s.set(x, yy, edge ? INK : yy >= plateRowTop + 11 ? mix(fill, INK, 0.45) : yy === plateRowTop + 1 ? mix(fill, WHITE, 0.4) : fill);
    }
    s.text(plateRow.text, x0 + 5, plateRowTop - 2, () => ink, plateGrade === 4 ? GOLD_LIGHT : mix(fill, INK, 0.6), plateRow.spacing);
  }
  // A 1st edition's seal: a coral disc stamped with a 1, at the foot line's end.
  if (sealed) {
    const cx = W - 1 - side - 10, cy = footTop + 3;
    for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) {
      const d = dx * dx + dy * dy;
      if (d > 52) continue;
      // A notched rim, every other step round it, as a stamp's.
      const rim = d > 38, notch = rim && (Math.round(Math.atan2(dy, dx) / (Math.PI / 8)) % 2 === 0);
      s.set(cx + dx, cy + dy, notch && d > 46 ? (struck ? BRUSHED.pill : PLATE) : rim ? INK : d < 14 && dx + dy < 0 ? [246, 138, 112] : [232, 100, 78]);
    }
    s.text('1', cx - 2, cy - 7, () => IVORY, INK);
  }

  // ---------------------------------------------------------------- the corner tag, over him
  const strange = topCopy?.tally !== undefined ? topCopy : copies.find(o => o.tally !== undefined);
  const badge = unusualCopy?.fx ? FX_BADGES[unusualCopy.fx] : undefined;
  const tagged = !!(input.corner || strange || badge);
  const tag = new Surface(tagged ? W : 0, tagged ? H : 0);
  // A Strange copy's count, top left of the window: amber segments on a dark plate, as a counter's.
  let tagX = WIN.left + 4;
  if (strange) {
    const digits = String(Math.min(99999, strange.tally ?? 0)).padStart(4, '0'), w = digits.length * 7 - 2 + 6, y0 = WIN.top + 4;
    plateAt(tag, tagX, y0, w, 15);
    [...digits].forEach((d, i) => segments(tag, tagX + 3 + i * 7, y0 + 3, Number(d)));
    tagX += w + 2;
  }
  // An Unusual's badge beside it: its effect's picture on a dark plate.
  if (badge) {
    const y0 = WIN.top + 4;
    plateAt(tag, tagX, y0, 15, 15);
    badge.forEach((row, by) => [...row].forEach((ch, bx) => {
      const ink = BADGE_INKS[ch];
      if (ink) for (let k = 0; k < 4; k++) tag.set(tagX + 3 + bx * 2 + (k & 1), y0 + 3 + by * 2 + (k >> 1), rgb(ink));
    }));
  }
  if (input.corner) {
    const w = textWidth(input.corner) + 6, x0 = WIN.right - 4 - w, y0 = WIN.top + 4;
    for (let yy = y0; yy < y0 + 14; yy++) for (let x = x0; x < x0 + w; x++) if (!((x === x0 || x === x0 + w - 1) && (yy === y0 || yy === y0 + 13))) tag.set(x, yy, yy >= y0 + 12 ? [0, 0, 0] : INK);
    tag.text(input.corner, x0 + 3, y0 - 2, () => WHITE);
  }
  const tagIdx: number[] = [];
  if (tagged) for (let i = 0; i < W * H; i++) if (tag.px[i * 4 + 3]) tagIdx.push(i);

  // ---------------------------------------------------------------- where he stands
  // Standing in the middle of the window, on its floor; on an aura card he rises and floats, bobbing (Balatro's soul layer).
  const soul = aura;
  const ox = Math.round((WIN.left + WIN.right + 1) / 2 - fit.mid);
  const stand = soul
    ? Math.max(5 - fit.topAll * zoom, Math.round((WIN.top + WIN.bottom) / 2 - ((fit.topAll + fit.footAll + 1) * zoom) / 2) - 10)
    : Math.round((WIN.top + WIN.bottom + 1) / 2 - ((fit.rest + fit.foot + 1) * zoom) / 2) + 4;
  // On his grid, every frame of the move fits the window, edge and all: as he stands where it can, else
  // with his head kept in and his lowest rows under the floor.
  const roomTop = soul ? 3 : WIN.top + 2, roomFoot = WIN.bottom - 2;
  const highest = roomTop - fit.topAll * zoom, lowest = roomFoot + 1 - (fit.footAll + 1) * zoom;
  const oy0 = !grid ? stand : highest > lowest ? highest : Math.min(lowest, Math.max(highest, stand));

  // ---------------------------------------------------------------- the frame he wears, behind him
  // A frame item's backdrop fills the whole window (an aura card's art), edge to edge under its rim, so
  // nothing drawn over it ever sticks out past a smaller box. It is painted once, outside the edition;
  // a copy whose finish shines is lit again each frame (`drawGuy`).
  const floor = Uint8Array.from(s.region, r => (r === 2 || r === 3 ? 1 : 0));
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
  // Pixels the edition plays over: the card's face and its window; a framed Grail's sheen crosses its
  // window and its gold lines, the lines counted as raised. Its look (./card-looks) works its field out
  // on blocks of two card pixels: crisp, and a quarter of the work. The sheen and `classic` go pixel
  // by pixel.
  const look = struck ? 0 : lookFor(ed, topCopy?.finish, looks.look);
  const plays = (i: number) => (framed ? s.region[i] === 2 || trim[i] === 1 : s.region[i] > 0 && s.region[i] < 3);
  // A window of its own moves on its own (`windowArt`): its pixels, redrawn each frame where it moves.
  const ownIdx: number[] = [];
  if (own?.moves) for (let i = 0; i < W * H; i++) if (s.region[i] === 3) { const x = i % W, yy = (i - x) / W; if (yy - WIN.top !== 2 && x - WIN.left !== 2) ownIdx.push(i); }
  const edIdx: number[] = [];
  for (let i = 0; i < W * H; i++) if (plays(i)) edIdx.push(i);
  const n = edIdx.length, ex = new Float32Array(n), ey = new Float32Array(n), er = new Uint8Array(n), eh = new Float32Array(n), ergb = new Float32Array(n * 3);
  const raised = new Float32Array(n);
  edIdx.forEach((i, k) => {
    const x = i % W, yy = (i - x) / W;
    ex[k] = x / 5; ey[k] = yy / 5; er[k] = s.region[i] || 1; eh[k] = shape.glint[(yy >> 1) * W + (x >> 1)]; raised[k] = trim[i];
    for (let j = 0; j < 3; j++) ergb[k * 3 + j] = s.px[i * 4 + j] / 255;
  });
  const paint = look === 1 ? { colors: paintColors(auraCopy ? auraColors(auraCopy.item, auraCopy.finish, auraCopy.print) : [GRADES[Math.max(0, g)].color], auraCopy ? auraHue(auraCopy.item, auraCopy.finish, auraCopy.print) : GRADES[Math.max(0, g)].color), contrast: looks.contrast ?? PAINT_CONTRAST, ...paintForm(auraCopy?.item ?? '', auraCopy?.print ?? 0) } : undefined;
  const block = (k: number) => (Math.floor(k * 2.5) * 2) / 5, perPixel = look === 0 || look === 2;
  const field = cardField(look, ed, v, [wcx / 5, wcy / 5], 0.2, { x: perPixel ? ex : ex.map(block), y: perPixel ? ey : ey.map(block), region: er, h: eh, rgb: ergb, raised }, paint);
  const edOut = new Float32Array(n * 3), edAt = Int32Array.from(edIdx);

  // A tall hat pokes out over the window's top rather than being cut off.
  const pop = soul || (!grid && oy0 + fit.top * zoom < WIN.top + 3);
  const clip = (cx: number, cy: number) => pop ? inside(cx, cy) && cx > 2 && cx < W - 3 && cy > 2 && cy < WIN.bottom - 1
    : cy > WIN.top + 1 && cy < WIN.bottom - 1 && cx > WIN.left && cx < WIN.right;
  const edgeC: RGB = aura ? mix(ah, WHITE, 0.55) : struck ? [255, 236, 170] : WHITE;

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
    if (grid) { byY.set(oy, got = new Int32Array(0)); return got; }
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
      // On his grid the shadow is a row of whole cells under his feet, each as dark as at its middle.
      const gy = grid ? sy + zoom : sy, reach = grid ? zoom : 0;
      for (let yy = Math.ceil(gy - 4 - reach); yy <= gy + 4 + reach; yy++) for (let x = Math.ceil(sx - rx - reach); x <= sx + rx + reach; x++) {
        if (x < 0 || yy < 0 || x >= W || yy >= H || !floor[yy * W + x]) continue;
        const px = grid ? ox + Math.floor((x - ox) / zoom) * zoom + zoom / 2 : x, py = grid ? oy + Math.floor((yy - oy) / zoom) * zoom + zoom / 2 : yy;
        const fx = (px - sx) / rx, fy = (py - gy) / 4, d = fx * fx + fy * fy;
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
  let whole: Uint8ClampedArray | null = null;

  return {
    square,
    /** Whether the card changes over time, apart from his move and its lift. */
    moves: ed > 0 || !!own?.moves || Object.values(owned).some(o => o && shines(o)),
    /** How far the card lifts off its shadow and how far he bobs at `t` seconds: with his frame, all a still card's picture depends on. */
    pose(t: number) {
      const tm = t * 1000 + shift;
      return { lift: Math.round(1 + Math.sin(TAU_MS(tm, 3000))), bob: soul && !grid ? Math.round(Math.sin(tm / wave(1000 / 2.6)) * 2) : 0 };
    },
    /** The card at `t` seconds, with his frame `frame` in its window, into `out` (the whole card, RGBA). */
    draw(frame: CardFrame, t: number, out: Uint8ClampedArray): Uint8ClampedArray {
      const tm = t * 1000 + shift, time = loopSeconds(tm), { lift, bob } = this.pose(t);
      body.set(s.px);
      // The edition over the face and the window.
      field(time, edOut);
      for (let k = 0; k < n; k++) { const i = edAt[k] * 4; body[i] = edOut[k * 3] * 255; body[i + 1] = edOut[k * 3 + 1] * 255; body[i + 2] = edOut[k * 3 + 2] * 255; }
      for (const i of ownIdx) { const x = i % W, c = own!(x, (i - x) / W, tm); body[i * 4] = c[0]; body[i * 4 + 1] = c[1]; body[i * 4 + 2] = c[2]; }
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
    /** The window's square alone at `t` seconds, into `out` (`square.size` by `square.size`, RGBA). */
    drawSquare(frame: CardFrame, t: number, out: Uint8ClampedArray): Uint8ClampedArray {
      this.draw(frame, t, whole ??= new Uint8ClampedArray(CARD_WIDTH * CARD_HEIGHT * 4));
      for (let yy = 0; yy < square.size; yy++) out.set(body.subarray(((square.y + yy) * W + square.x) * 4, ((square.y + yy) * W + square.x + square.size) * 4), yy * square.size * 4);
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
  // A graphic finish's card is plain stock round its own window (`windowArt`).
  if (top && GRAPHIC_FINISHES.includes(top.finish)) return 0;
  return top ? editionOf(top.finish) : g < 0 ? 0 : [0, 1, 2, 3, 5, 6][g];
}

// ---------------------------------------------------------------- windows of their own

const TAU = Math.PI * 2;

/** A window's art: a card pixel's colour at `tm` ms, and whether it moves. */
type WindowArt = ((x: number, y: number, tm: number) => RGB) & { moves?: boolean };

/** Steps a value into `n` flat bands, so a glow reads as pixel art, not a blur. */
const banded = (v: number, n: number) => Math.round(Math.max(0, Math.min(1, v)) * n) / n;

/**
 * The window a famous print or a graphic finish brings to its card, in place
 * of its grade's: Deep Blue a deep sea with caustic light moving over it,
 * Black Hole a void with an accretion ring, Red Giant a swollen star behind
 * the guy, Blue Moon a night with a pale moon, and Op, Impossible and Grid their
 * own patterns at the card's size. Worked out on blocks of two card pixels,
 * so it stays crisp. Null for any other copy.
 */
function windowArt(o: Owned, win: { left: number; right: number; top: number; bottom: number }, cx: number, cy: number): WindowArt | null {
  const look = special(o) ?? (GRAPHIC_FINISHES.includes(o.finish) ? o.finish : undefined);
  const depth = (y: number) => (y - win.top) / (win.bottom - win.top), p = o.print;
  const star = (x: number, y: number) => hash(x >> 1, y >> 1, p) > 0.985;
  let art: WindowArt;
  switch (look) {
    case 'Deep Blue': {
      art = (x, y, tm) => {
        const bx = (x >> 1) * 2, by = (y >> 1) * 2, d = depth(by), a = TAU_MS(tm, 4000);
        const q = Math.sin(bx * 0.19 + Math.sin(by * 0.15 + a) * 1.7) + Math.sin(by * 0.21 - bx * 0.09 - a * 2 + p);
        const sea = mix([46, 92, 214], [6, 16, 58], banded(d, 5));
        return Math.abs(q) < 0.11 ? mix(sea, [150, 196, 255], 0.75 * (1 - d) + 0.1) : sea;
      };
      art.moves = true;
      return art;
    }
    case 'Black Hole': {
      art = (x, y, tm) => {
        const bx = (x >> 1) * 2 + 1, by = (y >> 1) * 2 + 1, dx = bx - cx, dy = by - cy;
        // The disc seen nearly edge on, a bright knot running round it; the lensed ring of its far side over the guy's head.
        const disc = Math.hypot(dx / 58, dy / 15), ring = Math.hypot(dx, dy * 1.05) / 34;
        if (Math.abs(disc - 1) < 0.09) {
          const knot = Math.abs(((Math.atan2(dy * 3.9, dx) / TAU - cycle(tm, 3000)) % 1 + 1) % 1 - 0.5) < 0.07;
          return knot ? [255, 248, 224] : mix([255, 226, 160], [226, 92, 32], banded((dy / 15 + 1) / 2, 3));
        }
        if (Math.abs(ring - 1) < 0.07 && dy < 0) return mix([255, 210, 140], [200, 80, 30], banded(-dy / 34, 2));
        if (disc < 1.35 && disc > 0.8) return mix([5, 4, 9], [96, 34, 14], banded(1 - Math.abs(disc - 1) / 0.35, 3) * 0.6);
        return star(x, y) ? [210, 200, 230] : [5, 4, 9];
      };
      art.moves = true;
      return art;
    }
    case 'Red Giant':
      return (x, y) => {
        const bx = (x >> 1) * 2 + 1, by = (y >> 1) * 2 + 1, r = Math.hypot(bx - cx, by - cy + 6) / 58;
        if (r < 1) return mix([255, 196, 92], [196, 32, 40], banded(r, 4));
        return mix([92, 14, 26], [30, 4, 12], banded(depth(by), 4));
      };
    case 'Blue Moon':
      return (x, y) => {
        const bx = (x >> 1) * 2 + 1, by = (y >> 1) * 2 + 1, mx = win.right - 34, my = win.top + 32, r = Math.hypot(bx - mx, by - my) / 26;
        if (r < 1) return hash(bx >> 3, by >> 3, p + 5) > 0.72 && r < 0.85 ? [168, 188, 236] : mix([236, 242, 255], [176, 198, 246], banded(r, 3));
        return star(x, y) ? [220, 230, 255] : mix([30, 48, 108], [10, 18, 48], banded(depth(by), 4));
      };
    case 'op': {
      // Rings of ivory and slate breathing out from behind the guy.
      art = (x, y, tm) => {
        const r = Math.hypot(((x >> 1) * 2 + 1) - cx, ((y >> 1) * 2 + 1) - cy) / 7 - cycle(tm, 2400) * 2;
        return Math.floor(r) % 2 ? [118, 108, 130] : [241, 235, 221];
      };
      art.moves = true;
      return art;
    }
    case 'impossible': {
      // Bands of ink, ivory and coral that slope apart at the middle, half a band out of step, sliding down.
      art = (x, y, tm) => {
        const left = x < cx, s = y + (left ? x - cx : cx - x) * 0.9 + (left ? 0 : 5) - cycle(tm, 3000) * 30;
        return [[96, 86, 110], [241, 235, 221], [238, 106, 80]][((Math.floor(s / 10) % 3) + 3) % 3] as RGB;
      };
      art.moves = true;
      return art;
    }
    case 'grid': {
      // Ivory panes cut by ink lines, three filled with a primary.
      const v1 = Math.round(win.left + (win.right - win.left) * (0.24 + (p % 3) * 0.04)), v2 = Math.round(win.left + (win.right - win.left) * (0.74 + ((p >> 2) % 3) * 0.04));
      const h1 = Math.round(win.top + (win.bottom - win.top) * (0.26 + ((p >> 4) % 3) * 0.05)), h2 = Math.round(win.top + (win.bottom - win.top) * 0.8);
      return (x, y) => {
        if (Math.abs(x - v1) < 2 || Math.abs(x - v2) < 2 || Math.abs(y - h1) < 2 || (Math.abs(y - h2) < 2 && x > v2)) return [28, 24, 36];
        const pane = (x > v1 ? 1 : 0) + (x > v2 ? 1 : 0) + (y > h1 ? 3 : 0) + (y > h2 && x > v2 ? 3 : 0), at = (pane - (p % 6) + 9) % 9;
        return at === 0 ? [217, 64, 46] : at === 4 ? [44, 85, 200] : at === 8 ? [242, 194, 48] : [241, 235, 221];
      };
    }
  }
  return null;
}

/** A dark plate for a tag over the window, `w` by `h` with its corners cut. */
function plateAt(s: Surface, x0: number, y0: number, w: number, h: number): void {
  for (let yy = y0; yy < y0 + h; yy++) for (let x = x0; x < x0 + w; x++) {
    if ((x === x0 || x === x0 + w - 1) && (yy === y0 || yy === y0 + h - 1)) continue;
    s.set(x, yy, yy >= y0 + h - 2 ? [0, 0, 0] : INK);
  }
}

/** Which of a seven-segment digit's segments are lit, a to g. */
const SEGMENTS = [0b0111111, 0b0000110, 0b1011011, 0b1001111, 0b1100110, 0b1101101, 0b1111101, 0b0000111, 0b1111111, 0b1101111];
/** A counter's digit, five card pixels wide and nine tall, its lit segments amber and the rest a dim ghost, as a real one's. */
function segments(s: Surface, x0: number, y0: number, digit: number): void {
  const on = SEGMENTS[digit] ?? 0, lit: RGB = [255, 178, 62], dim: RGB = [74, 48, 26];
  const seg: [number, number, number, number][] = [[1, 0, 3, 1], [4, 1, 1, 3], [4, 5, 1, 3], [1, 8, 3, 1], [0, 5, 1, 3], [0, 1, 1, 3], [1, 4, 3, 1]];
  seg.forEach(([x, y, w, h], k) => { for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) s.set(x0 + x + dx, y0 + y + dy, on & (1 << k) ? lit : dim); });
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
  /** A look other than the edition's own (./card-looks), such as `classic` or `liquid`. */
  look?: LookOptions['look'];
  /** How hard an aura card's paint bands are. */
  contrast?: number;
  /** A Grail's gold: `framed` (the default) or `brushed`. */
  gold?: CardGold;
  /** How he stands out from the window: `none` (the default) or `sticker`. */
  edge?: CardEdge;
}

/**
 * A card to play on screen: each frame is drawn the first time it is asked
 * for and kept, so a page can show a card at once and spread the work out.
 * It loops perfectly: his move played the whole number of times that fits
 * whole turns of LOOP_MS, with every sheen on the card on the same clock. A
 * card with nothing shining draws each pose of his once and shows it again.
 */
export function cardPlayer(input: CardInput, ms = 80, options: CardPlayerOptions = {}) {
  return playCard(input, ms, options, false);
}

/**
 * The card's window alone, as a square, played as `cardPlayer` plays the whole card: the art behind
 * him (its edition, look, frame item or aura ground) and him moving. Its side is the window's
 * height or width, whichever is less; give it `edge: 'none'` (or another grid edge) so his whole move
 * stays in the square.
 */
export function cardArtPlayer(input: CardInput, ms = 80, options: CardPlayerOptions = {}) {
  return playCard(input, ms, options, true);
}

/** `cardPlayer`, or `cardArtPlayer` when `square`. */
function playCard(input: CardInput, ms: number, { keep = true, ...style }: CardPlayerOptions, square: boolean) {
  const options = { parts: input.parts, palette: input.palette, equip: (input.copies ?? []).map(encode), rarity: false };
  const anim = animate(input.seed, input.move ?? 'idle', { ...options, loop: { fit: true } }), turns = anim.turns ?? 1;
  const owned = ownedBySlot(input.copies ?? []), g = cardGrade(input), art = cardArt(input, anim, owned, g, cardEdition(input, g), style);
  const total = anim.duration, count = Math.max(1, Math.round(total / ms)), cache: Uint8ClampedArray[] = [];
  const delays = Array.from({ length: count }, (_, k) => Math.round((k + 1) * total / count) - Math.round(k * total / count));
  const frameOf = new Map(anim.frames.map((f, k) => [f, k]));
  // A card with nothing moving but him is the same picture whenever he holds the same pose at the same lift.
  const poses = new Map<number, Uint8ClampedArray>();
  const width = square ? art.square.size : CARD_WIDTH, height = square ? art.square.size : CARD_HEIGHT;
  const draw = (frame: CardFrame, t: number, out: Uint8ClampedArray) => (square ? art.drawSquare(frame, t, out) : art.draw(frame, t, out));
  const one = keep ? null : new Uint8ClampedArray(width * height * 4);
  let shown = -1;
  return {
    width, height, count, delay: total / count, delays,
    /** The frame showing at `i` (wraps round). Without `keep`, the same picture redrawn: show it before asking for the next. */
    frame(i: number): Uint8ClampedArray {
      const k = ((i % count) + count) % count;
      if (cache[k]) return cache[k];
      const frame = frameAt(anim, k * total / count), t = ((k * turns * LOOP_MS) / count % LOOP_MS) / 1000;
      const { lift } = art.pose(t), pose = art.moves ? -1 : frameOf.get(frame)! * 4 + lift;
      if (!keep) {
        if (pose < 0 || pose !== shown) draw(frame, t, one!);
        shown = pose;
        return one!;
      }
      let px = pose >= 0 ? poses.get(pose) : undefined;
      if (!px) { px = draw(frame, t, new Uint8ClampedArray(width * height * 4)); if (pose >= 0) poses.set(pose, px); }
      return cache[k] = px;
    },
  };
}

/** The card standing still, for a picture. */
export function cardStill(input: CardInput, t = 0.6, looks: CardStyle = {}): Uint8ClampedArray {
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

/** The card's window art alone as frames, as `cardFrames` gives the whole card. */
export function cardArtFrames(input: CardInput, ms = 80, options: CardPlayerOptions = {}): Frames {
  const art = cardArtPlayer(input, ms, options), frames: Uint8ClampedArray[] = [];
  for (let i = 0; i < art.count; i++) frames.push(art.frame(i));
  return { width: art.width, height: art.height, frames, delays: art.delays };
}

/** The card's window art alone as a looping GIF, each pixel `scale` by `scale`. */
export function toCardArtGif(input: CardInput, scale = 3, options: CardPlayerOptions = {}): Uint8Array {
  return encodeGif(cardArtFrames(input, 80, options), scale);
}

/** The card's window art alone as a PNG, its first frame. */
export function toCardArtPng(input: CardInput, scale = 4, options: CardPlayerOptions = {}): Promise<Uint8Array> {
  const art = cardArtPlayer(input, 80, options);
  return encodePng(art.frame(0), art.width, art.height, scale);
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
