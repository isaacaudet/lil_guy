import { animate, animateLoop, frameAt, FRAME_HEIGHT, FRAME_SLOTS, FRAME_WIDTH, type AnimateOptions, type Move } from './animate';
import { finishColor, loopSeconds, SHADER_FINISHES } from './finish-shader';
import { cycle, fit, fitLoop, LOOP_MS, wave, wrap } from './loop';
import { encode, GRADES, gradeOf, type Owned } from './owned';
import { GLYPHS, FONT_BASELINE, FONT_HEIGHT } from './font';
import { encodeGif, encodePng, type Frames } from './gif';
import { itemById, SET_COLORS } from './items';

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
const ZOOM = 6;

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


/**
 * One card pixel of a copy in its finish at time `t` seconds: the finishes'
 * shader (./finish-shader), worked out here so the card can be saved.
 * `gx, gy` is the guy pixel (what twinkles), `cx, cy` the card pixel (what a
 * sweep crosses), so light runs smoothly over a single pixel of a hat.
 */
function shine(c: RGB, o: Owned, gx: number, gy: number, cx: number, cy: number, t: number): RGB {
  const f = SHADER_FINISHES.indexOf(o.finish as (typeof SHADER_FINISHES)[number]);
  if (f < 0) return c;
  const out = finishColor([c[0] / 255, c[1] / 255, c[2] / 255], f, o.scuff, hash(gx, gy, o.print), (cx + cy) / ZOOM, gy, o.print, loopSeconds(t * 1000), 1);
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

const SIDE = 8, LINE = 13;

/**
 * The card at `t` seconds, with the guy's frame `frame` in its window.
 *
 * Laid out from the foot up so the words always fit: the second line (wrapped
 * as long as it needs), a pill naming the grade, the title (wrapped), and the
 * window takes the rest, so the card is mostly him. The rarer the card, the
 * more it does, one smooth effect at a time, as Balatro's editions do: a sheen
 * on the border, foil bands, a holographic face, then a gold card he rises out
 * of, then the night card with stars and a colour-turning edge.
 */
function drawCard(input: CardInput, frame: { colors: (string | null)[][]; slots: number[][]; outside?: [number, number, string][] }, owned: Partial<Record<(typeof FRAME_SLOTS)[number], Owned>>, g: number, t: number): Uint8ClampedArray {
  // The card's own clock, in ms, on the loop every other moving thing keeps (./loop).
  const tm = t * 1000;
  const s = new Surface();
  const gc: RGB = g >= 0 ? rgb(GRADES[g].color) : [120, 140, 170];
  const textW = CARD_WIDTH - SIDE * 2 - 6;
  const pill = input.lines?.[0], subs = (input.lines ?? []).slice(1).flatMap(l => wrapText(l, textW));
  const titles = wrapText(input.title, textW);
  // The set's symbol: the machine of the last copy worn, as the page's card face shows it.
  const lastItem = input.copies?.length ? itemById(input.copies[input.copies.length - 1].item) : undefined;
  const markHex = lastItem ? SET_COLORS[lastItem.game as keyof typeof SET_COLORS] : undefined;
  // Two lines at most, its parts kept whole, beside the symbol.
  const foots: string[] = [];
  for (const part of (input.footer ?? '').split(' · ').filter(Boolean)) {
    const k = foots.length - 1, w = k <= 0 ? textW - 14 : textW;
    if (k >= 0 && textWidth(`${foots[k]} · ${part}`) <= w) foots[k] += ` · ${part}`;
    else if (foots.length < 2 && textWidth(part) <= textW) foots.push(part);
    else break;
  }
  const footH = foots.length ? foots.length * LINE : markHex ? LINE : 0;
  // From the foot up.
  let y = CARD_HEIGHT - SIDE - 2 - footH - subs.length * LINE;
  const subTop = y;
  const pillTop = pill ? (y -= 17) : y;
  y -= 4 + titles.length * LINE;
  const titleTop = y;
  const WIN = { left: SIDE, right: CARD_WIDTH - 1 - SIDE, top: SIDE, bottom: y - 4 };
  const night = g === 5, gold = g === 4, soul = g >= 4;

  // The face and border.
  const face = (x: number, y: number): RGB => {
    if (night) return mix([20, 22, 40], hsv(wrap((x + y) / 300 + tm / fit(25000), 1), 0.4, 0.5), 0.22);
    if (gold) return mix(mix(CREAM, [255, 206, 110], 0.42), WHITE, 0.25 * Math.max(0, Math.sin((x + y) * 0.035 - tm / wave(625))) ** 6);
    if (g === 3) {
      // Holographic: a soft rainbow drifting across the face, with a faint diagonal grain.
      const holo = hsv(wrap(x * 0.006 + y * 0.004 - tm / fit(1000 / 0.07), 1), 0.28, 1);
      return mix(mix(CREAM, holo, 0.42), WHITE, (x - y + 400) % 5 === 0 ? 0.1 : 0);
    }
    return CREAM;
  };
  const sheen = (x: number, y: number) => Math.max(0, 1 - Math.abs(wrap((x + y) * 0.5 - tm * 170 / fit(4250), 170) - 85) / 9);
  for (let yy = 0; yy < CARD_HEIGHT; yy++) for (let x = 0; x < CARD_WIDTH; x++) {
    if (!inside(x, yy)) continue;
    const edge = !inside(x - 3, yy) || !inside(x + 3, yy) || !inside(x, yy - 3) || !inside(x, yy + 3);
    let border: RGB = g >= 0 ? mix(gc, EDGE, 0.3) : EDGE;
    if (g >= 1 && g <= 3) border = mix(border, WHITE, sheen(x, yy) * 0.6);
    if (gold) border = mix([178, 120, 28], [255, 236, 170], 0.5 + 0.5 * Math.sin((x - yy) * 0.06 + tm / wave(1000 / 2.4)));
    if (night) border = hsv(wrap((x + yy) / 160 + tm / fit(1000 / 0.12), 1), 0.55, 0.98);
    // The edge's own outline, so it reads on any page.
    const rim = !inside(x - 1, yy) || !inside(x + 1, yy) || !inside(x, yy - 1) || !inside(x, yy + 1);
    s.set(x, yy, rim ? mix(border, [10, 10, 20], 0.55) : edge ? border : face(x, yy));
  }

  // The window: tinted by grade, foil bands on a Prized card, stars on the night card.
  const tint = night ? [16, 20, 38] as RGB : mix(CREAM, gc, g >= 0 ? 0.28 : 0.14);
  const stars = night ? Array.from({ length: 14 }, (_, k) => [WIN.left + 3 + Math.floor(hash(k, 4, 2) * (WIN.right - WIN.left - 6)), WIN.top + 3 + Math.floor(hash(k, 5, 2) * (WIN.bottom - WIN.top - 6)), hash(k, 6, 2)]) : [];
  for (let yy = WIN.top; yy <= WIN.bottom; yy++) for (let x = WIN.left; x <= WIN.right; x++) {
    const rim = x === WIN.left || x === WIN.right || yy === WIN.top || yy === WIN.bottom;
    const depth = (yy - WIN.top) / (WIN.bottom - WIN.top);
    let c = rim ? (night ? [70, 86, 120] as RGB : mix(RIM, gc, 0.25)) : mix(tint, mix(tint, [20, 24, 40], 0.5), depth * 0.3);
    if (!rim && g === 2) c = mix(c, [226, 238, 255], 0.3 * Math.max(0, Math.sin((x - yy * 0.6) * 0.09 - tm / wave(1000 / 1.3))) ** 3);
    const fx = (x - (WIN.left + WIN.right) / 2) / 34, fy = (yy - (WIN.bottom - 9)) / 4;
    if (!rim && fx * fx + fy * fy < 1) c = mix(c, [0, 0, 0], (soul ? 0.12 : 0.18) * (1 - fx * fx - fy * fy));
    s.set(x, yy, c);
  }
  for (const [x, yy, ph] of stars) {
    const on = Math.sin(tm / wave(1000 / 2.2) + ph * 20) > 0.2;
    s.set(x, yy, on ? [255, 255, 240] : [120, 130, 170]);
    if (on && ph > 0.6) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) s.set(x + dx, yy + dy, [150, 160, 210]);
  }

  // Where he stands: feet near the floor; on the top grades he rises out of
  // the window and floats, bobbing (Balatro's soul layer).
  let topRow = FRAME_HEIGHT, botRow = 0;
  frame.colors.forEach((row, gy) => { if (row.some(Boolean)) { topRow = Math.min(topRow, gy); botRow = gy; } });
  const ox = Math.round((WIN.left + WIN.right + 1) / 2 - (FRAME_WIDTH * ZOOM) / 2);
  const bob = soul ? Math.round(Math.sin(tm / wave(1000 / 2.6)) * 2) : 0;
  let oy = WIN.bottom - 5 - (botRow + 1) * ZOOM;
  // Floating: centred in the window and lifted till his top just clears its
  // edge, never off the card (an aura's rings above him count as him).
  if (soul) oy = Math.max(5 - topRow * ZOOM, Math.min(oy, Math.round((WIN.top + WIN.bottom) / 2 - ((topRow + botRow + 1) * ZOOM) / 2) - 10)) + bob;
  // The space he may draw in: the window, or above it too when he floats.
  const clip = (cx: number, cy: number) => soul ? inside(cx, cy) && cx > 3 && cx < CARD_WIDTH - 4 && cy > 3 && cy < WIN.bottom
    : cy > WIN.top && cy < WIN.bottom && cx > WIN.left && cx < WIN.right;

  // A sticker's edge round him, so his dark outline never sinks into the
  // window. Aura cells get none: an outline round every spark tangles them.
  const solid = (gx: number, gy: number) => !!frame.colors[gy]?.[gx] && frame.slots[gy]?.[gx] !== 5;
  const edgeC = night ? mix(tint, WHITE, 0.42) : mix(tint, WHITE, 0.55);
  for (let yy = 0; yy < CARD_HEIGHT; yy++) for (let x = 0; x < CARD_WIDTH; x++) {
    if (!clip(x, yy)) continue;
    const gx = Math.floor((x - ox) / ZOOM), gy = Math.floor((yy - oy) / ZOOM);
    if (x - ox >= 0 && yy - oy >= 0 && solid(gx, gy)) continue;
    const near = [[2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [1, -1], [-1, 1], [-1, -1]].some(([dx, dy]) => x + dx - ox >= 0 && yy + dy - oy >= 0 && solid(Math.floor((x + dx - ox) / ZOOM), Math.floor((yy + dy - oy) / ZOOM)));
    if (near) s.set(x, yy, soul && (yy <= WIN.top || x <= WIN.left || x >= WIN.right) ? [255, 250, 235] : edgeC);
  }
  frame.colors.forEach((row, gy) => row.forEach((hex, gx) => {
    if (!hex) return;
    const slot = frame.slots[gy][gx], copy = slot ? owned[FRAME_SLOTS[slot - 1]] : undefined;
    for (let dy = 0; dy < ZOOM; dy++) for (let dx = 0; dx < ZOOM; dx++) {
      const cx = ox + gx * ZOOM + dx, cy = oy + gy * ZOOM + dy;
      if (!clip(cx, cy)) continue;
      let c = rgb(hex);
      if (copy) c = shine(c, copy, gx, gy, cx, cy, t);
      s.set(cx, cy, [Math.min(255, Math.max(0, c[0])), Math.min(255, Math.max(0, c[1])), Math.min(255, Math.max(0, c[2]))]);
    }
  }));
  // A rare aura's rings run past the frame's sides into the window's margins.
  for (const [gx, gy, hex] of frame.outside ?? []) for (let dy = 0; dy < ZOOM; dy++) for (let dx = 0; dx < ZOOM; dx++) {
    const cx = ox + gx * ZOOM + dx, cy = oy + gy * ZOOM + dy;
    if (clip(cx, cy)) s.set(cx, cy, rgb(hex));
  }
  // Glass over the window: a soft glare that slides across now and then.
  const glare = cycle(tm, 2200 / 0.45) * 2.2 * 180 - 50;
  for (let yy = WIN.top + 1; yy < WIN.bottom; yy++) for (let x = WIN.left + 1; x < WIN.right; x++) {
    const d = x + (yy - WIN.top) * 0.6 - glare;
    if (d > 0 && d < 12) s.set(x, yy, mix(s.get(x, yy), WHITE, d < 3 ? 0.18 : 0.08));
  }
  // The corner tag in the window.
  if (input.corner) {
    const w = textWidth(input.corner) + 5, x0 = WIN.right - 3 - w, y0 = WIN.top + 3;
    for (let yy = y0; yy < y0 + 13; yy++) for (let x = x0; x < x0 + w; x++) if (!((x === x0 || x === x0 + w - 1) && (yy === y0 || yy === y0 + 12))) s.set(x, yy, [20, 18, 38]);
    s.text(input.corner, x0 + 3, y0 - 2, () => WHITE);
  }

  // The title: foil on Mythic and up, gold on a Grail.
  const ink: RGB = night ? [230, 238, 255] : INK;
  const foil = (x: number, yy: number): RGB => gold ? mix([150, 92, 12], [96, 56, 0], 0.5 + 0.5 * Math.sin(x * 0.15 - tm / wave(1000 / 3) + yy * 0.1))
    : night ? hsv(wrap(x * 0.01 - tm / fit(4000), 1), 0.35, 1) : ink;
  titles.forEach((l, k) => s.text(l, Math.floor((CARD_WIDTH - textWidth(l)) / 2), titleTop + k * LINE - 1, foil, night ? [8, 8, 20] : undefined));
  // The grade's pill.
  if (pill) {
    const w = textWidth(pill) + 14, x0 = Math.floor((CARD_WIDTH - w) / 2);
    const fill: RGB = night ? hsv(wrap(tm / fit(1000 / 0.12), 1), 0.45, 0.85) : g >= 0 ? gc : [120, 130, 150];
    for (let yy = pillTop; yy < pillTop + 15; yy++) for (let x = x0; x < x0 + w; x++) {
      const r = (x < x0 + 3 ? x0 + 3 - x : x > x0 + w - 4 ? x - (x0 + w - 4) : 0), ry = yy < pillTop + 3 ? pillTop + 3 - yy : yy > pillTop + 11 ? yy - (pillTop + 11) : 0;
      if (r * r + ry * ry > 10) continue;
      s.set(x, yy, yy === pillTop + 14 ? mix(fill, [0, 0, 0], 0.35) : yy <= pillTop + 1 ? mix(fill, WHITE, 0.3) : fill);
    }
    s.text(pill, x0 + 7, pillTop - 1, () => WHITE, mix(fill, [0, 0, 0], 0.5));
  }
  subs.forEach((l, k) => s.text(l, Math.floor((CARD_WIDTH - textWidth(l)) / 2), subTop + k * LINE - 2, () => (night ? [190, 200, 230] : mix(INK, CREAM, 0.25))));
  // The foot: the set line on the left, the set's symbol on the right.
  const footTop = CARD_HEIGHT - SIDE - 2 - footH;
  foots.forEach((l, k) => s.text(l, SIDE + 3, footTop + k * LINE - 1, () => (night ? [170, 180, 215] : mix(INK, CREAM, 0.4))));
  if (markHex) {
    const m = rgb(markHex), x0 = CARD_WIDTH - SIDE - 12, y0 = footTop + 1;
    for (let yy = 0; yy < 9; yy++) for (let x = 0; x < 9; x++) {
      const rim = x === 0 || yy === 0 || x === 8 || yy === 8;
      s.set(x0 + x, y0 + yy, rim ? mix(m, [10, 10, 20], 0.55) : x === 1 || yy === 1 ? mix(m, WHITE, 0.45) : x === 7 || yy === 7 ? mix(m, [0, 0, 0], 0.3) : m);
    }
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
  const owned = ownedBySlot(input.copies ?? []), g = cardGrade(input);
  const total = anim.duration, count = Math.max(1, Math.round(total / ms)), cache: Uint8ClampedArray[] = [];
  const delays = Array.from({ length: count }, (_, k) => Math.round((k + 1) * total / count) - Math.round(k * total / count));
  return {
    width: CARD_WIDTH, height: CARD_HEIGHT, count, delay: total / count, delays,
    /** The frame showing at `i` (wraps round). */
    frame(i: number): Uint8ClampedArray {
      const k = ((i % count) + count) % count;
      return cache[k] ??= drawCard(input, frameAt(anim, k * total / count), owned, g, ((k * turns * LOOP_MS) / count % LOOP_MS) / 1000);
    },
  };
}

/** The card standing still, for a picture. */
export function cardStill(input: CardInput, t = 0.6): Uint8ClampedArray {
  const anim = animateLoop(input.seed, input.move ?? 'idle', { parts: input.parts, palette: input.palette, equip: (input.copies ?? []).map(encode), rarity: false });
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
  const anim = animateLoop(seed, move, options), bg = options.background ? rgb(options.background) : null;
  const frames = anim.frames.map(f => {
    const px = new Uint8ClampedArray(FRAME_WIDTH * FRAME_HEIGHT * 4);
    f.colors.forEach((row, y) => row.forEach((c, x) => { const v = c ? rgb(c) : bg; if (v) px.set([...v, 255], (y * FRAME_WIDTH + x) * 4); }));
    return px;
  });
  return encodeGif({ width: FRAME_WIDTH, height: FRAME_HEIGHT, frames, delays: anim.frames.map(f => f.ms) }, scale);
}
