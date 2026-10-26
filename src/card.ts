import { animate, frameAt, FRAME_HEIGHT, FRAME_SLOTS, FRAME_WIDTH, type AnimateOptions, type Move } from './animate';
import { encode, GRADES, gradeOf, type Finish, type Owned } from './owned';
import { GLYPHS, FONT_BASELINE, FONT_HEIGHT } from './font';
import { encodeGif, encodePng, type Frames } from './gif';
import { itemById } from './items';

/**
 * Trading cards, drawn by the library so every game, the site and an export
 * show the same card: a guy wearing his copies, moving, each copy's finish
 * shining on its own pixels, its effect playing, the card's face dressed for
 * the grade, and the words written in the club's pixel type.
 *
 * A card is `CARD_WIDTH` by `CARD_HEIGHT` card pixels, four to each of the
 * guy's pixels, so a shine can sweep across a single pixel of a hat. Scale it
 * up by whole numbers to show it; `toCardGif` and `toCardPng` do that for you.
 */
export const CARD_WIDTH = 104;
export const CARD_HEIGHT = 168;
const ZOOM = 4;

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
  /** 0 Everyday to 5 Aura; -1 for a plain card. */
  grade?: number;
  /** How he moves on the card. Default `idle`. */
  move?: Move;
}

type RGB = [number, number, number];
const rgb = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const hsv = (h: number, s: number, v: number): RGB => {
  const f = (n: number) => { const k = (n + h * 6) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return [f(5) * 255, f(3) * 255, f(1) * 255];
};
function hueShift(c: RGB, a: number): RGB {
  const y = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2], i = 0.596 * c[0] - 0.274 * c[1] - 0.322 * c[2], q = 0.211 * c[0] - 0.523 * c[1] + 0.312 * c[2];
  const h = Math.atan2(q, i) + a, ch = Math.hypot(i, q), I = ch * Math.cos(h), Q = ch * Math.sin(h);
  return [y + 0.956 * I + 0.621 * Q, y - 0.272 * I - 0.647 * Q, y - 1.106 * I + 1.703 * Q];
}
const hash = (x: number, y: number, p: number) => { const s = Math.sin(x * 127.1 + y * 311.7 + p * 0.731) * 43758.5453; return s - Math.floor(s); };

const FINISHES: Finish[] = ['plain', 'sunset', 'tempered', 'nebula', 'prism', 'negative', 'gold'];

/**
 * One card pixel of a copy in its finish at time `t` seconds: the same
 * shine the site's shader gives, worked out here so it can be saved.
 * `gx, gy` is the guy pixel (what twinkles), `cx, cy` the card pixel (what a
 * sweep crosses), so light runs smoothly over a single pixel of a hat.
 */
function shine(c: RGB, o: Owned, gx: number, gy: number, cx: number, cy: number, t: number): RGB {
  const f = FINISHES.indexOf(o.finish);
  if (f < 0) return c;
  const d = (cx + cy) / ZOOM, h = hash(gx, gy, o.print);
  const band = 1 - Math.min(1, Math.max(0, Math.abs(((d - t * 10 + o.print) % 58 + 58) % 58 - 29) - 0.5));
  const twinkle = (h * 13 + t * 0.37) % 1 > 0.965 ? 1 : 0;
  const coat = Math.min(1, Math.max(0, 1 - o.scuff * 1.4)) * (h >= o.scuff * 0.55 ? 1 : 0);
  const add = (v: number, k = 1): RGB => [c[0] + v * 255 * k, c[1] + v * 255 * k, c[2] + v * 255 * k];
  switch (f) {
    case 0: return o.scuff <= 0.07 ? add(band * 0.45) : c;
    case 1: { const s = 0.5 + 0.5 * Math.sin(d * 0.8 - t * 3 + o.print); const tint = mix(c, [c[0] * 0.86 + 20, c[1] * 0.96 + 20, c[2] * 1.18 + 20], 0.4 * s * coat); return [tint[0] + band * 127 * coat, tint[1] + band * 127 * coat, tint[2] + band * 127 * coat]; }
    case 2: return add(twinkle * 0.55 * coat + band * 0.25 * coat);
    case 3: { const s = hueShift(c, (t * 0.9 + d * 0.22) * coat); return mix(s, [255, 255, 255], twinkle * coat); }
    case 4: { const rain = hsv(((d * 0.07 - t * 0.3 + o.print * 0.013) % 1 + 1) % 1, 0.65, 1); const m = mix(c, [c[0] * 0.45 + rain[0] * 0.75, c[1] * 0.45 + rain[1] * 0.75, c[2] * 0.45 + rain[2] * 0.75], 0.6 * coat); const row = ((gy + Math.floor(t * 10)) % 3) < 0.5 ? 1.12 : 1; return [m[0] * row, m[1] * row, m[2] * row]; }
    case 5: { const w = 0.07 * Math.sin(t * 2 + d * 0.5) * coat * 255; return [c[0] + 0.28 * 255 * band * coat + w, c[1] + 0.12 * 255 * band * coat + w, c[2] + 0.45 * 255 * band * coat + w]; }
    default: return [c[0] + band * 0.7 * coat * 255 + twinkle * 0.6 * coat * 255, c[1] + band * 0.7 * coat * 255 + twinkle * 0.54 * coat * 255, c[2] + band * 0.7 * coat * 255 + twinkle * 0.3 * coat * 255];
  }
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
/** The longest start of `s` that fits `width`, with a dot dot when it was cut. */
function fit(s: string, width: number): string {
  if (textWidth(s) <= width) return s;
  let out = s;
  while (out.length > 1 && textWidth(out + '..') > width) out = out.slice(0, -1);
  return out.trimEnd() + '..';
}

/** Up to two lines that fit `width`: a lone line too long for one wraps at a space onto the second. */
function wrap(lines: string[], width: number): string[] {
  const out = lines.slice(0, 2);
  if (out.length === 1 && textWidth(out[0]) > width) {
    const words = out[0].split(' ');
    for (let k = words.length - 1; k > 0; k--) {
      const head = words.slice(0, k).join(' ');
      if (textWidth(head) <= width) return [head, words.slice(k).join(' ')].map(l => fit(l, width));
    }
  }
  return out.map(l => fit(l, width));
}

/** A drawing surface of RGBA card pixels. */
class Surface {
  readonly px = new Uint8ClampedArray(CARD_WIDTH * CARD_HEIGHT * 4);
  set(x: number, y: number, c: RGB, a = 255): void {
    if (x < 0 || y < 0 || x >= CARD_WIDTH || y >= CARD_HEIGHT) return;
    const i = (y * CARD_WIDTH + x) * 4;
    this.px[i] = c[0]; this.px[i + 1] = c[1]; this.px[i + 2] = c[2]; this.px[i + 3] = a;
  }
  get(x: number, y: number): RGB { const i = (y * CARD_WIDTH + x) * 4; return [this.px[i], this.px[i + 1], this.px[i + 2]]; }
  opaque(x: number, y: number): boolean { return this.px[(y * CARD_WIDTH + x) * 4 + 3] > 0; }
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

const EDGE: RGB = [30, 34, 56], CREAM: RGB = [242, 236, 221], RIM: RGB = [207, 199, 180], INK: RGB = [58, 51, 82], WHITE: RGB = [255, 255, 255];

/** Whether a card pixel is inside the rounded card. */
function inside(x: number, y: number, r = 7): boolean {
  const cx = x < r ? r - x : x > CARD_WIDTH - 1 - r ? x - (CARD_WIDTH - 1 - r) : 0;
  const cy = y < r ? r - y : y > CARD_HEIGHT - 1 - r ? y - (CARD_HEIGHT - 1 - r) : 0;
  return cx * cx + cy * cy <= r * r;
}

const WIN = { left: 8, top: 26, right: 95, bottom: 113 };

/** The card at `t` seconds, with the guy's frame `frame` in its window. */
function drawCard(input: CardInput, frame: { colors: (string | null)[][]; slots: number[][]; outside?: [number, number, string][] }, owned: Partial<Record<(typeof FRAME_SLOTS)[number], Owned>>, g: number, t: number): Uint8ClampedArray {
  const s = new Surface();
  const gc: RGB = g >= 0 ? rgb(GRADES[g].color) : [120, 140, 170];
  // The face: cream, warmed by gold on a Grail, gone dark and pearly on an aura.
  const sweep = (x: number, y: number, speed = 9, w = 10) => Math.max(0, 1 - Math.abs((((x + y) * 0.5 - t * speed * 6) % 140 + 140) % 140 - 70) / w);
  const face = (x: number, y: number): RGB => {
    let c: RGB = g === 5 ? mix([22, 26, 44], hsv((x + y) / 260 + t * 0.05, 0.35, 0.45), 0.35) : g === 4 ? mix(CREAM, [255, 214, 120], 0.38) : CREAM;
    if (g >= 1) c = mix(c, WHITE, sweep(x, y) * (g >= 3 ? 0.55 : 0.3));
    return c;
  };
  for (let y = 0; y < CARD_HEIGHT; y++) for (let x = 0; x < CARD_WIDTH; x++) {
    if (!inside(x, y)) continue;
    const edge = !inside(x - 2, y) || !inside(x + 2, y) || !inside(x, y - 2) || !inside(x, y + 2);
    // The border carries the grade: its colour, foil on a Mythic, gold on a Grail, rainbow on an aura.
    let border: RGB = g >= 0 ? mix(gc, EDGE, 0.35) : EDGE;
    if (g === 3) border = hueShift(gc, t * 1.4 + (x + y) * 0.05);
    if (g === 5) border = hsv(((x + y) / 120 + t * 0.3) % 1, 0.6, 0.95);
    s.set(x, y, edge ? border : face(x, y));
  }
  // The title band, in the grade's colour, a lip of light on top.
  const band: RGB = g >= 3 ? [30, 26, 52] : g >= 0 ? mix(gc, [24, 22, 44], 0.3) : [58, 66, 100];
  for (let y = 6; y <= 22; y++) for (let x = 6; x < CARD_WIDTH - 6; x++) if (inside(x, y, 9)) s.set(x, y, y === 6 ? mix(band, WHITE, 0.3) : y === 22 ? mix(band, [0, 0, 0], 0.35) : band);
  const foil = (x: number, y: number): RGB => g === 4 ? mix([196, 136, 32], [255, 246, 200], 0.5 + 0.5 * Math.sin(x * 0.18 - t * 4 + y * 0.1))
    : g >= 3 ? hsv(((x * 0.012 - t * 0.35) % 1 + 1) % 1, 0.45, 1) : WHITE;
  const title = fit(input.title, CARD_WIDTH - 16);
  s.text(title, Math.floor((CARD_WIDTH - textWidth(title)) / 2), 8, foil, [16, 12, 32]);
  // The window: tinted by grade, darker toward the foot, with a floor under him.
  const tint = g === 5 ? [26, 34, 52] as RGB : mix(CREAM, gc, g >= 0 ? 0.3 : 0.14);
  for (let y = WIN.top; y <= WIN.bottom; y++) for (let x = WIN.left; x <= WIN.right; x++) {
    const rim = x === WIN.left || x === WIN.right || y === WIN.top || y === WIN.bottom;
    const depth = (y - WIN.top) / (WIN.bottom - WIN.top);
    let c = rim ? (g === 5 ? [60, 80, 110] as RGB : RIM) : mix(tint, mix(tint, [20, 24, 40], 0.5), depth * 0.35);
    // A soft floor shadow where he stands.
    const fx = (x - (WIN.left + WIN.right) / 2) / 30, fy = (y - (WIN.bottom - 9)) / 4;
    if (!rim && fx * fx + fy * fy < 1) c = mix(c, [0, 0, 0], 0.18 * (1 - fx * fx - fy * fy));
    s.set(x, y, c);
  }
  // The guy, four card pixels to each of his.
  const ox = Math.round((WIN.left + WIN.right + 1) / 2 - (FRAME_WIDTH * ZOOM) / 2), oy = WIN.bottom - 3 - FRAME_HEIGHT * ZOOM;
  // A sticker's edge round him, two card pixels of light, so his dark outline
  // never sinks into the window (on the Aura card's night window it did).
  // An aura's own pixels are light, not part of him, so they get no edge.
  const solid = (gx: number, gy: number) => !!frame.colors[gy]?.[gx] && frame.slots[gy]?.[gx] !== 5;
  const edge = g === 5 ? mix(tint, WHITE, 0.42) : mix(tint, WHITE, 0.55);
  for (let y = WIN.top + 1; y < WIN.bottom; y++) for (let x = WIN.left + 1; x < WIN.right; x++) {
    const gx = Math.floor((x - ox) / ZOOM), gy = Math.floor((y - oy) / ZOOM);
    if (solid(gx, gy)) continue;
    const near = [[2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [1, -1], [-1, 1], [-1, -1]].some(([dx, dy]) => solid(Math.floor((x + dx - ox) / ZOOM), Math.floor((y + dy - oy) / ZOOM)));
    if (near) s.set(x, y, edge);
  }
  frame.colors.forEach((row, gy) => row.forEach((hex, gx) => {
    if (!hex) return;
    const slot = frame.slots[gy][gx], copy = slot ? owned[FRAME_SLOTS[slot - 1]] : undefined;
    for (let dy = 0; dy < ZOOM; dy++) for (let dx = 0; dx < ZOOM; dx++) {
      const cx = ox + gx * ZOOM + dx, cy = oy + gy * ZOOM + dy;
      if (cy <= WIN.top || cy >= WIN.bottom || cx <= WIN.left || cx >= WIN.right) continue;
      let c = rgb(hex);
      if (copy) c = shine(c, copy, gx, gy, cx, cy, t);
      s.set(cx, cy, [Math.min(255, Math.max(0, c[0])), Math.min(255, Math.max(0, c[1])), Math.min(255, Math.max(0, c[2]))]);
    }
  }));
  // A rare aura's rings run past the frame's sides into the window's margins.
  for (const [gx, gy, hex] of frame.outside ?? []) for (let dy = 0; dy < ZOOM; dy++) for (let dx = 0; dx < ZOOM; dx++) {
    const cx = ox + gx * ZOOM + dx, cy = oy + gy * ZOOM + dy;
    if (cy > WIN.top && cy < WIN.bottom && cx > WIN.left && cx < WIN.right) s.set(cx, cy, rgb(hex));
  }
  // Glass over the window: a soft glare that slides across now and then, on every card.
  const glare = ((t * 0.45) % 2.2) * 140 - 40;
  for (let y = WIN.top + 1; y < WIN.bottom; y++) for (let x = WIN.left + 1; x < WIN.right; x++) {
    const d = x + (y - WIN.top) * 0.6 - glare;
    if (d > 0 && d < 10) s.set(x, y, mix(s.get(x, y), WHITE, d < 3 ? 0.22 : 0.1));
  }
  // The corner tag over the window.
  if (input.corner) {
    const w = textWidth(input.corner) + 5, x0 = WIN.right - 2 - w, y0 = WIN.top + 3;
    for (let y = y0; y < y0 + 13; y++) for (let x = x0; x < x0 + w; x++) if (!((x === x0 || x === x0 + w - 1) && (y === y0 || y === y0 + 12))) s.set(x, y, [20, 18, 38]);
    s.text(input.corner, x0 + 3, y0 - 2, () => WHITE);
  }
  // Grade pips: filled up to the grade, in its colour.
  if (g >= 0) for (let p = 0; p < 6; p++) {
    const x0 = 19 + p * 11;
    for (let y = 118; y <= 123; y++) for (let x = x0; x <= x0 + 8; x++) if (!((x === x0 || x === x0 + 8) && (y === 118 || y === 123))) s.set(x, y, p <= g ? (y === 118 ? mix(gc, WHITE, 0.4) : gc) : RIM);
  }
  // The lines under the pips.
  wrap(input.lines ?? [], CARD_WIDTH - 14).forEach((line, k) => {
    const l = fit(line, CARD_WIDTH - 14);
    s.text(l, Math.floor((CARD_WIDTH - textWidth(l)) / 2), 127 + k * 16, () => (g === 5 ? [220, 240, 255] : INK), g === 5 ? [10, 12, 24] : undefined);
  });
  // Mythic and up: a few stars glint on the face.
  if (g >= 3) for (let k = 0; k < 6; k++) {
    const x = Math.floor(hash(k, 1, 9) * (CARD_WIDTH - 12)) + 6, y = Math.floor(hash(k, 2, 9) * (CARD_HEIGHT - 12)) + 6, on = ((hash(k, 3, 9) + t * 0.5) % 1) < 0.18;
    if (on && s.opaque(x, y)) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) s.set(x + dx, y + dy, dx || dy ? mix(s.get(x + dx, y + dy), WHITE, 0.6) : WHITE);
  }
  return s.px;
}

/** The grade a card shows: the one given, or the rarest copy's. */
const cardGrade = (input: CardInput) => input.grade ?? (input.copies?.length ? Math.max(...input.copies.map(o => GRADES.findIndex(x => x.id === gradeOf(o).id))) : -1);

/**
 * The card as frames, `ms` apart, covering one loop of his move (at least two
 * seconds, so a shine gets across). Every frame is the whole card in RGBA;
 * the corners are transparent.
 */
export function cardFrames(input: CardInput, ms = 80): Frames {
  const card = cardPlayer(input, ms), frames: Uint8ClampedArray[] = [];
  for (let i = 0; i < card.count; i++) frames.push(card.frame(i));
  return { width: CARD_WIDTH, height: CARD_HEIGHT, frames, delays: frames.map(() => ms) };
}

/**
 * A card to play on screen: each frame is drawn the first time it is asked
 * for and kept, so a page can show a card at once and spread the work out.
 */
export function cardPlayer(input: CardInput, ms = 80) {
  const anim = animate(input.seed, input.move ?? 'idle', { parts: input.parts, palette: input.palette, equip: (input.copies ?? []).map(encode), rarity: false });
  const owned = ownedBySlot(input.copies ?? []), g = cardGrade(input);
  const count = Math.ceil(Math.max(2000, Math.min(anim.duration, 4800)) / ms), cache: Uint8ClampedArray[] = [];
  return {
    width: CARD_WIDTH, height: CARD_HEIGHT, count, delay: ms,
    /** The frame showing at `i` (wraps round). */
    frame(i: number): Uint8ClampedArray {
      const k = ((i % count) + count) % count;
      return cache[k] ??= drawCard(input, frameAt(anim, k * ms), owned, g, (k * ms) / 1000);
    },
  };
}

/** The card standing still, for a picture. */
export function cardStill(input: CardInput, t = 0.6): Uint8ClampedArray {
  const anim = animate(input.seed, input.move ?? 'idle', { parts: input.parts, palette: input.palette, equip: (input.copies ?? []).map(encode), rarity: false });
  return drawCard(input, frameAt(anim, 0), ownedBySlot(input.copies ?? []), cardGrade(input), t);
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
  const anim = animate(seed, move, options), bg = options.background ? rgb(options.background) : null;
  const frames = anim.frames.map(f => {
    const px = new Uint8ClampedArray(FRAME_WIDTH * FRAME_HEIGHT * 4);
    f.colors.forEach((row, y) => row.forEach((c, x) => { const v = c ? rgb(c) : bg; if (v) px.set([...v, 255], (y * FRAME_WIDTH + x) * 4); }));
    return px;
  });
  return encodeGif({ width: FRAME_WIDTH, height: FRAME_HEIGHT, frames, delays: anim.frames.map(f => f.ms) }, scale);
}
