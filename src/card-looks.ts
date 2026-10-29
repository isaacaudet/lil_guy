import { editionField, fract, type EditionPixels, type Vec3 } from './finish-shader';

/**
 * How a card's edition is painted, after the way Balatro paints its cards.
 * Each edition has its look, chosen by `lookFor`:
 *
 * - `paint` (an aura card): its ground as banded paint in the aura's own
 *   colours, cut in hard bands: each aura its own pattern (a spiral, waves,
 *   rings, rising tongues, streaks or a nebula; `paintForm`), its copy's
 *   print nudging the middle and the timing.
 * - `sheen` (a Grail): once a loop a band of light crosses the card corner to
 *   corner, as light catches metal: brighter on what stands proud, a glint on
 *   the bevel as it passes, and still the rest of the time.
 * - `liquid` (a Tempered card): its window flowing chrome, hard bands of dark,
 *   sky and silver round a white highlight, slowly swirling, and its frame
 *   chrome that catches the same highlights.
 * - `opal` (a Polychrome card): a pale pearl with soft patches of colour
 *   shifting over it.
 * - `bands` (a Holographic card): a cool drifting tint and a few slow broad
 *   bands of light, their edges in rainbow.
 * - `classic`: the edition as `editionColor` draws it (./finish-shader), the
 *   only look for Foil and Negative cards, and any card's if asked for.
 *
 * Each is written twice, as GLSL (`GLSL_LOOKS`) and as plain code
 * (`lookField`), with the same result, and every motion comes round in
 * LOOP_MS: time enters only as whole turns of the loop's angle.
 */
export const CARD_LOOKS = ['classic', 'paint', 'sheen', 'liquid', 'opal', 'bands'] as const;
export type CardLook = (typeof CARD_LOOKS)[number];

/** A look and what it is drawn with. */
export interface LookOptions {
  /** A look other than the edition's own, where it fits the edition (`classic` always does). */
  look?: CardLook;
  /** How hard `paint`'s bands are: 2 a soft wash, 7 the default, 12 near cut paper. */
  contrast?: number;
}

/** Whether a look (as the shaders number it) can paint a card of edition `ed` (an index in EDITIONS). */
export function lookApplies(look: number, ed: number): boolean {
  if (look === 1) return ed === 6;
  if (look === 2) return ed === 5;
  if (look === 3 || look === 5) return ed === 2;
  if (look === 4) return ed === 3;
  return look === 0;
}

/**
 * The look a card of edition `ed` is painted in, as the shaders number it: its
 * edition's own (a Holographic card's by its finish: Tempered is liquid metal,
 * Nebula bands), or `look` where that fits.
 */
export function lookFor(ed: number, finish: string | undefined, look?: CardLook): number {
  const asked = look ? CARD_LOOKS.indexOf(look) : -1;
  if (asked >= 0 && lookApplies(asked, ed)) return asked;
  return ed === 6 ? 1 : ed === 5 ? 2 : ed === 3 ? 4 : ed === 2 ? (finish === 'tempered' ? 3 : 5) : 0;
}

/** The default hardness of `paint`'s bands. */
export const PAINT_CONTRAST = 7;

const INK: Vec3 = [24 / 255, 20 / 255, 31 / 255];
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const unhex = (h: string): Vec3 => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

/**
 * The three paints an aura card is banded in, from its aura's colours and the
 * one it's known by (`auraHue`): a deep ground most of the card, a middle
 * band, and a narrow top band in a second colour of the aura where it has one.
 * All kept dark enough that the guy's own aura still reads over them.
 */
export function paintColors(colors: string[], hue: string): [Vec3, Vec3, Vec3] {
  const main = unhex(hue), h = toHsl(main)[0];
  const other = colors.map(unhex).filter(c => {
    const s = toHsl(c);
    const d = Math.abs(s[0] - h);
    return s[1] > 0.3 && Math.min(d, 1 - d) > 0.08;
  })[0];
  return [lerp(main, INK, 0.7), lerp(main, INK, 0.42), other ? lerp(other, INK, 0.3) : lerp(main, INK, 0.12)];
}

/** A colour as hue, saturation and lightness, each 0 to 1 (`toHsl` in GLSL). */
export function toHsl(c: Vec3): Vec3 {
  const hi = Math.max(c[0], c[1], c[2]), lo = Math.min(c[0], c[1], c[2]), d = hi - lo, l = (hi + lo) * 0.5;
  if (d < 1e-5) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = hi === c[0] ? (c[1] - c[2]) / d : hi === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4;
  return [fract(h / 6), s, l];
}

// ------------------------------------------------------------ the looks, as GLSL

/**
 * `lookColor` falls back to `editionColor` (GLSL_EDITIONS) for `classic`, so
 * it goes after it. `p` is the cell in face cells, `o` the window's middle,
 * `region` 1 face and 2 window, `th` the loop's angle.
 */
export const GLSL_LOOKS = `
vec3 fromHsl(vec3 c) {
  vec3 k = clamp(abs(fract(c.x + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
  return c.z + c.y * (1.0 - abs(2.0 * c.z - 1.0)) * (k - 0.5);
}
float polyField(vec2 p, vec2 o, float th) {
  vec2 a = p - o - vec2(7.0 * cos(th), 9.0 * sin(th));
  vec2 b = p - o - vec2(-8.0 * sin(th), 6.0 * cos(2.0 * th));
  vec2 e = p - o - vec2(6.0 * cos(2.0 * th + 1.3), -7.0 * sin(th + 0.4));
  return cos(length(a) * 0.38) + sin(length(b) * 0.27 + th) * cos(b.y * 0.21) + cos(length(e) * 0.33 - th) * sin(e.x * 0.19);
}
float paintField(vec2 p, vec2 o, float th, vec4 form, float phase) {
  vec2 q = (p - o - form.zw) / 9.0;
  float r = length(q), k = form.y;
  if (form.x < 0.5) return 0.5 + 0.5 * sin(abs(k) * atan(q.y, q.x + 1e-4) + sign(k) * 5.0 * r - th + phase + 0.7 * sin(2.3 * r - th) + 0.5 * sin(q.x * 2.0 - q.y * 1.6 + th));
  if (form.x < 1.5) { vec2 u = q * 2.0; return 0.5 + 0.5 * sin(u.y * 2.2 * k + 1.3 * sin(u.x * 1.4 + th + phase) + 0.7 * sin(u.x * 3.1 - u.y * 0.8 - th) + 0.6 * sin(u.y * 1.1 + u.x * 0.6 - 2.0 * th)); }
  if (form.x < 2.5) return 0.5 + 0.5 * sin(r * 6.5 - th + phase + 0.7 * sin(q.x * 3.0 + q.y * 2.0 + th) + 0.5 * sin(q.y * 2.4 - q.x * 1.3 - th));
  if (form.x < 3.5) return 0.5 + 0.5 * sin(q.x * 6.0 + 1.6 * sin(q.y * 2.4 + k * th + phase) + 0.8 * sin(q.x * 2.1 - th)) + 0.15 * q.y * k;
  if (form.x < 4.5) return 0.5 + 0.5 * sin((q.x + q.y * 1.7 * k) * 5.0 + 0.8 * sin((q.x - q.y) * 2.6 + th + phase) + 0.5 * sin(q.y * 3.1 + 2.0 * th) - th);
  float tw = 0.6 * r + 0.35 * sin(th);
  vec2 u = vec2(q.x * cos(tw) - q.y * sin(tw), q.x * sin(tw) + q.y * cos(tw)) * 1.9;
  float ct = 0.8 * cos(th + phase), st = 0.8 * sin(th + phase);
  u += 0.8 * vec2(sin(1.3 * u.y + ct), sin(1.1 * u.x + st));
  u += 0.8 * vec2(sin(1.7 * u.y - st + 0.9), sin(1.5 * u.x + ct - 0.7));
  u += 0.8 * vec2(sin(2.1 * u.y + ct + 1.8), sin(1.9 * u.x - st + 2.6));
  return 0.5 + 0.5 * sin(u.x * 0.9 + u.y * 1.2 + r * 1.5);
}
vec3 paintColor(vec2 p, vec2 o, float th, vec3 c1, vec3 c2, vec3 c3, float contrast, vec4 form, float phase) {
  float t = paintField(p, o, th, form, phase), w = 0.5 / contrast;
  float k1 = clamp((t - 0.38) / w + 0.5, 0.0, 1.0), k2 = clamp((t - 0.74) / w + 0.5, 0.0, 1.0);
  return mix(mix(c1, c2, k1), c3, k2) * (1.0 - 0.22 * clamp(length(p - o) / 9.0 * 0.5 - 0.35, 0.0, 1.0));
}
float sheenPos(float time) { return -6.0 + 84.0 * clamp(time / 1.4, 0.0, 1.0); }
float glint(vec2 p, vec2 g, float pos) {
  vec2 q = abs(p - g) * 5.0;
  float a = min(q.x, q.y), b = max(q.x, q.y);
  float star = b < 0.5 ? 1.0 : (a < 0.5 && b < 3.5 ? 0.8 - 0.2 * b : 0.0);
  return star * clamp(1.0 - abs(g.x + g.y - pos) / 1.2, 0.0, 1.0);
}
vec3 sheenColor(vec3 c, vec2 p, float region, float raised, float px, float time) {
  float pos = sheenPos(time), d = abs(p.x + p.y - pos);
  float halo = clamp(1.0 - d / 4.5, 0.0, 1.0), glow = clamp(1.0 - d / 2.2, 0.0, 1.0), core = clamp(1.0 - d / 0.7, 0.0, 1.0);
  float k = (0.65 + 0.35 * raised) * (region > 1.5 ? 0.6 : 1.0);
  c = mix(c, vec3(1.0, 0.88, 0.52), halo * halo * 0.35 * k);
  c = mix(c, vec3(1.0, 0.93, 0.7), glow * 0.55 * k);
  c = mix(c, vec3(1.0, 0.99, 0.93), core * 0.85 * k);
  if (px < 0.5) c += vec3(1.0, 0.97, 0.88) * (glint(p, vec2(4.8, 0.8), pos) + glint(p, vec2(23.0, 38.8), pos));
  return c;
}
float liquidField(vec2 p, vec2 o, float th) {
  vec2 u = (p - o) / 10.0 * 1.6;
  u += 0.6 * vec2(sin(1.4 * u.y + th), sin(1.2 * u.x - th + 0.8));
  u += 0.5 * vec2(sin(2.1 * u.y - th + 1.7), sin(1.8 * u.x + 2.0 * th));
  return 0.5 + 0.5 * sin(u.x * 1.3 + u.y * 2.1 + 0.6 * sin(u.x * 0.7 - th));
}
vec3 liquidColor(vec3 c, vec2 p, vec2 o, float region, float th) {
  float t = liquidField(p, o, th);
  float a = clamp((t - 0.28) / 0.06 + 0.5, 0.0, 1.0), b = clamp((t - 0.5) / 0.06 + 0.5, 0.0, 1.0), d = clamp((t - 0.82) / 0.05 + 0.5, 0.0, 1.0);
  vec3 metal = mix(mix(mix(vec3(0.1, 0.12, 0.18), vec3(0.55, 0.75, 0.95), a), vec3(0.78, 0.82, 0.88), b), vec3(1.0), d);
  if (region > 1.5) return metal;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  return mix(vec3(0.42 + 0.5 * l) * vec3(0.93, 0.96, 1.04), vec3(1.0), 0.4 * d);
}
vec3 opalColor(vec3 c, vec2 p, vec2 o, float region, float th) {
  float f = polyField(p, o, th);
  vec3 base = mix(c, vec3(0.94, 0.95, 0.98), 0.5);
  vec3 fire = fromHsl(vec3(fract(0.5 + 0.35 * f), 0.55, 0.78));
  return mix(base, fire, (region > 1.5 ? 0.45 : 0.3) * clamp(0.5 + f / 3.0, 0.0, 1.0));
}
vec3 bandsColor(vec3 c, vec2 p, vec2 o, float region, float th) {
  float k = region > 1.5 ? 0.6 : 1.0, b = sin((p.x * 0.3 + p.y * 0.5) * 0.45 - th);
  float band = clamp((b - 0.6) / 0.3, 0.0, 1.0), edge = band * (1.0 - band) * 4.0;
  vec3 tint = fromHsl(vec3(fract(0.58 + 0.12 * polyField(p, o, th)), 0.75, 0.66));
  vec3 rim = fromHsl(vec3(fract(0.55 + 0.3 * b + p.y * 0.01), 0.8, 0.7));
  return mix(c, c * 0.5 + tint * 0.55, 0.5 * k) + vec3(0.9, 0.95, 1.0) * band * 0.16 * k + rim * edge * 0.3 * k;
}
vec3 lookColor(vec3 c, float look, float ed, float v, vec2 p, vec2 o, float region, float raised, float h, float px, float time, vec3 c1, vec3 c2, vec3 c3, float contrast, vec4 form, float phase) {
  float th = time * TAU / 6.0;
  if (look > 0.5 && look < 1.5) return region > 1.5 ? paintColor(p, o, th, c1, c2, c3, contrast, form, phase) : c;
  if (look > 1.5 && look < 2.5) return sheenColor(c, p, region, raised, px, time);
  if (look > 2.5 && look < 3.5) return liquidColor(c, p, o, region, th);
  if (look > 3.5 && look < 4.5) return opalColor(c, p, o, region, th);
  if (look > 4.5) return bandsColor(c, p, o, region, th);
  return editionColor(c, ed, v, p, o, region, h, px, time);
}
`;

// ------------------------------------------------------------ the same, as plain code

const TAU = Math.PI * 2;
/** A sine from a table, to well under a millionth of a colour step: the looks take several a block every frame. */
const SINES = Float64Array.from({ length: 4097 }, (_, i) => Math.sin(i / 4096 * TAU));
const sin = (x: number) => { const u = x * (4096 / TAU), i = Math.floor(u), j = i & 4095; return SINES[j] + (SINES[j + 1] - SINES[j]) * (u - i); };
const cos = (x: number) => sin(x + Math.PI / 2);
/** Liquid metal's dark, sky and silver, and its chrome frame's tint. */
const METAL = [[0.1, 0.12, 0.18], [0.55, 0.75, 0.95], [0.78, 0.82, 0.88]], CHROME = [0.93, 0.96, 1.04];
/** Opal's pale pearl and the bands' light. */
const OPAL = [0.94, 0.95, 0.98], BAND_LIGHT = [0.9, 0.95, 1];
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** The rings' middles at angle `th`, relative to the window's middle: three pairs. */
function polyCentres(th: number, into: Float64Array) {
  into[0] = 7 * Math.cos(th); into[1] = 9 * Math.sin(th);
  into[2] = -8 * Math.sin(th); into[3] = 6 * Math.cos(2 * th);
  into[4] = 6 * Math.cos(2 * th + 1.3); into[5] = -7 * Math.sin(th + 0.4);
}
/** `polyField` from GLSL_LOOKS, at `dx`, `dy` from the window's middle, with the middles from `polyCentres`. */
function polyAt(dx: number, dy: number, m: Float64Array, th: number) {
  const ax = dx - m[0], ay = dy - m[1], bx = dx - m[2], by = dy - m[3], ex = dx - m[4], ey = dy - m[5];
  return cos(Math.sqrt(ax * ax + ay * ay) * 0.38) + sin(Math.sqrt(bx * bx + by * by) * 0.27 + th) * cos(by * 0.21)
    + cos(Math.sqrt(ex * ex + ey * ey) * 0.33 - th) * sin(ex * 0.19);
}
/** `fromHsl`, written into `into` at `j`. */
function hslInto(into: Float32Array, j: number, h: number, sat: number, l: number) {
  const ch = sat * (1 - Math.abs(2 * l - 1));
  for (let i = 0; i < 3; i++) { const q = Math.abs(fract(h + (i === 0 ? 0 : i === 1 ? 2 / 3 : 1 / 3)) * 6 - 3) - 1; into[j + i] = l + ch * ((q < 0 ? 0 : q > 1 ? 1 : q) - 0.5); }
}

/**
 * What `paint` is drawn in: three colours, 0 to 1, how hard its bands are, and its pattern: a
 * family, a number for it (a spiral's arms, signed for the way it turns; waves' tightness;
 * which way tongues and streaks run), where its middle is from the window's, in face cells, and
 * where its motion starts.
 */
export interface PaintSpec { colors: [Vec3, Vec3, Vec3]; contrast: number; form: [number, number, number, number]; phase: number }

/** The pattern families `paint` draws, in the order the shaders number them. */
export const PAINT_FAMILIES = ['spiral', 'waves', 'rings', 'tongues', 'streaks', 'nebula'] as const;
/** Each aura's pattern, picked for it: family, its number, and its middle's offset in face cells. */
export const AURA_PAINT: Record<string, [number, number, number, number]> = {
  'aura.flames': [3, 1, 0, 2],
  'aura.orbit': [0, 2, 0, 0],
  'aura.halo': [2, 1, 0, -9],
  'aura.sparkles': [5, 1, 3, -3],
  'aura.hearts': [2, 1, 7, 8],
  'aura.bubbles': [2, 1, -6, 11],
  'aura.storm': [1, 1.4, 0, 0],
  'aura.lightning': [4, -1, 0, 0],
  'aura.notes': [1, 1, 0, 0],
  'aura.snow': [4, 1, 0, 0],
  'aura.petals': [0, -3, 5, -4],
  'aura.galaxy': [5, 1, 0, 0],
  'aura.rainbow': [1, 0.7, 0, 0],
  'aura.glitch': [4, -1, 3, 0],
  'aura.fireflies': [5, 1, -4, 5],
  'aura.neon': [2, 1, 0, 0],
  'aura.echo': [2, 1, 0, 3],
  'aura.comet': [4, 1, -3, -3],
  'aura.butterflies': [0, 4, 0, 0],
  'aura.aurora': [1, 0.8, 0, -4],
  'aura.datarain': [3, -1, 0, 0],
  'aura.vortex': [0, -5, 0, 0],
  'aura.fireworks': [2, 1, 4, -7],
  'aura.ripple': [2, 1, -3, 5],
  'aura.origin': [0, 1, 0, 0],
};
/** An aura copy's pattern: its own from AURA_PAINT (or one dealt from its id), the print nudging its middle and timing. */
export function paintForm(id: string, print: number): Pick<PaintSpec, 'form' | 'phase'> {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [family, k, cx, cy] = AURA_PAINT[id] ?? [h % 6, [1, 2, 3][(h >> 4) % 3] * ((h >> 6) % 2 ? 1 : -1), 0, 0];
  return { form: [family, k, cx + ((print % 7) - 3) * 0.5, cy + ((Math.floor(print / 7) % 7) - 3) * 0.5], phase: (print % 13) * 0.48 };
}

/** What a look plays over: the edition's pixels, and for the sheen how proud each one stands, 0 or 1. */
export type LookPixels = EditionPixels & { raised?: Float32Array };

/**
 * `lookColor` over a fixed set of pixels, as `editionField` is for the
 * editions; `classic` is `editionField` itself. Pixels on the same cell (the
 * big card quantizes its cells to blocks) share one working-out of the field,
 * so a frame costs a field a block and a few multiplies a pixel; nothing is
 * allocated per frame.
 */
export function cardField(look: number, ed: number, v: number, o: [number, number], px: number, pixels: LookPixels, paint?: PaintSpec): (time: number, out: Float32Array) => void {
  if (look === 0) return editionField(ed, v, o, px, pixels);
  if (look === 2) return sheenField(px, pixels);
  const { x, y, region, rgb } = pixels, n = region.length;
  // The blocks: one per distinct cell, and each pixel's block.
  const blockOf = new Int32Array(n), keys = new Map<number, number>(), bx: number[] = [], by: number[] = [];
  for (let k = 0; k < n; k++) {
    const key = Math.round(x[k] * 10) * 100003 + Math.round(y[k] * 10);
    let b = keys.get(key);
    if (b === undefined) { keys.set(key, b = bx.length); bx.push(x[k] - o[0]); by.push(y[k] - o[1]); }
    blockOf[k] = b;
  }
  const nb = bx.length, val = new Float32Array(nb), m = new Float64Array(6);

  if (look === 1) {
    const { colors: [c1, c2, c3], contrast, form: [family, k, ox, oy], phase } = paint ?? { colors: [[0, 0, 0], [0.5, 0.5, 0.5], [1, 1, 1]] as [Vec3, Vec3, Vec3], contrast: PAINT_CONTRAST, form: [5, 1, 0, 0], phase: 0 };
    // What doesn't move: each block's place in the pattern, its distance and angle from the pattern's
    // middle (the nebula's twisted by that distance), and its shade.
    const qx = new Float32Array(nb), qy = new Float32Array(nb), rr = new Float32Array(nb), aa = new Float32Array(nb), shade = new Float32Array(nb);
    for (let b = 0; b < nb; b++) {
      const px = (bx[b] - ox) / 9, py = (by[b] - oy) / 9, r = Math.sqrt(px * px + py * py), a = 0.6 * r;
      qx[b] = px; qy[b] = py; rr[b] = r; aa[b] = Math.atan2(py, px + 1e-4);
      if (family === 5) { qx[b] = px * Math.cos(a) - py * Math.sin(a); qy[b] = px * Math.sin(a) + py * Math.cos(a); }
      shade[b] = 1 - 0.22 * clamp01(Math.sqrt(bx[b] * bx[b] + by[b] * by[b]) / 9 * 0.5 - 0.35);
    }
    const w = 0.5 / contrast, k1v = new Float32Array(nb), k2v = new Float32Array(nb), arms = Math.abs(k), turn = Math.sign(k);
    return (time, out) => {
      const th = time * TAU / 6;
      if (family === 0) for (let b = 0; b < nb; b++) val[b] = 0.5 + 0.5 * sin(arms * aa[b] + turn * 5 * rr[b] - th + phase + 0.7 * sin(2.3 * rr[b] - th) + 0.5 * sin(qx[b] * 2 - qy[b] * 1.6 + th));
      else if (family === 1) for (let b = 0; b < nb; b++) { const ux = qx[b] * 2, uy = qy[b] * 2; val[b] = 0.5 + 0.5 * sin(uy * 2.2 * k + 1.3 * sin(ux * 1.4 + th + phase) + 0.7 * sin(ux * 3.1 - uy * 0.8 - th) + 0.6 * sin(uy * 1.1 + ux * 0.6 - 2 * th)); }
      else if (family === 2) for (let b = 0; b < nb; b++) val[b] = 0.5 + 0.5 * sin(rr[b] * 6.5 - th + phase + 0.7 * sin(qx[b] * 3 + qy[b] * 2 + th) + 0.5 * sin(qy[b] * 2.4 - qx[b] * 1.3 - th));
      else if (family === 3) for (let b = 0; b < nb; b++) val[b] = 0.5 + 0.5 * sin(qx[b] * 6 + 1.6 * sin(qy[b] * 2.4 + k * th + phase) + 0.8 * sin(qx[b] * 2.1 - th)) + 0.15 * qy[b] * k;
      else if (family === 4) for (let b = 0; b < nb; b++) val[b] = 0.5 + 0.5 * sin((qx[b] + qy[b] * 1.7 * k) * 5 + 0.8 * sin((qx[b] - qy[b]) * 2.6 + th + phase) + 0.5 * sin(qy[b] * 3.1 + 2 * th) - th);
      else {
        const tw = 0.35 * Math.sin(th), ca = Math.cos(tw), sa = Math.sin(tw), ct = 0.8 * Math.cos(th + phase), st = 0.8 * Math.sin(th + phase);
        for (let b = 0; b < nb; b++) {
          let ux = (qx[b] * ca - qy[b] * sa) * 1.9, uy = (qx[b] * sa + qy[b] * ca) * 1.9, dx: number;
          dx = 0.8 * sin(1.3 * uy + ct); uy += 0.8 * sin(1.1 * ux + st); ux += dx;
          dx = 0.8 * sin(1.7 * uy - st + 0.9); uy += 0.8 * sin(1.5 * ux + ct - 0.7); ux += dx;
          dx = 0.8 * sin(2.1 * uy + ct + 1.8); uy += 0.8 * sin(1.9 * ux - st + 2.6); ux += dx;
          val[b] = 0.5 + 0.5 * sin(ux * 0.9 + uy * 1.2 + rr[b] * 1.5);
        }
      }
      for (let b = 0; b < nb; b++) { const t = val[b]; k1v[b] = clamp01((t - 0.38) / w + 0.5); k2v[b] = clamp01((t - 0.74) / w + 0.5); }
      for (let k = 0; k < n; k++) {
        const j = k * 3;
        if (region[k] < 1.5) { out[j] = rgb[j]; out[j + 1] = rgb[j + 1]; out[j + 2] = rgb[j + 2]; continue; }
        const b = blockOf[k], k1 = k1v[b], k2 = k2v[b], s = shade[b];
        for (let i = 0; i < 3; i++) { const lo = c1[i] + (c2[i] - c1[i]) * k1; out[j + i] = (lo + (c3[i] - lo) * k2) * s; }
      }
    };
  }

  if (look === 3) {
    // Liquid metal: the field a block, its three edges, then each pixel's metal or chrome.
    const ux0 = Float32Array.from(bx, d => d / 10 * 1.6), uy0 = Float32Array.from(by, d => d / 10 * 1.6), lum = new Float32Array(n);
    for (let k = 0; k < n; k++) lum[k] = 0.42 + 0.5 * (0.299 * rgb[k * 3] + 0.587 * rgb[k * 3 + 1] + 0.114 * rgb[k * 3 + 2]);
    const ea = new Float32Array(nb), eb = new Float32Array(nb), ed2 = new Float32Array(nb);
    return (time, out) => {
      const th = time * TAU / 6;
      for (let b = 0; b < nb; b++) {
        let ux = ux0[b], uy = uy0[b], dx: number;
        dx = 0.6 * sin(1.4 * uy + th); uy += 0.6 * sin(1.2 * ux - th + 0.8); ux += dx;
        dx = 0.5 * sin(2.1 * uy - th + 1.7); uy += 0.5 * sin(1.8 * ux + 2 * th); ux += dx;
        const t = 0.5 + 0.5 * sin(ux * 1.3 + uy * 2.1 + 0.6 * sin(ux * 0.7 - th));
        ea[b] = clamp01((t - 0.28) / 0.06 + 0.5); eb[b] = clamp01((t - 0.5) / 0.06 + 0.5); ed2[b] = clamp01((t - 0.82) / 0.05 + 0.5);
      }
      for (let k = 0; k < n; k++) {
        const j = k * 3, b = blockOf[k], d = ed2[b];
        if (region[k] > 1.5) {
          for (let i = 0; i < 3; i++) { const lo = METAL[0][i] + (METAL[1][i] - METAL[0][i]) * ea[b], mid = lo + (METAL[2][i] - lo) * eb[b]; out[j + i] = mid + (1 - mid) * d; }
          continue;
        }
        for (let i = 0; i < 3; i++) { const ch = lum[k] * CHROME[i]; out[j + i] = ch + (1 - ch) * 0.4 * d; }
      }
    };
  }

  // Opal and bands: the field a block, then a few multiplies a pixel.
  const ax = Float32Array.from(bx, d => d + o[0]), ay = Float32Array.from(by, d => d + o[1]);
  const col = new Float32Array(nb * 3), w1 = new Float32Array(nb), w2 = new Float32Array(nb), rim = new Float32Array(nb * 3);
  return (time, out) => {
    const th = time * TAU / 6;
    polyCentres(th, m);
    for (let b = 0; b < nb; b++) {
      const f = polyAt(bx[b], by[b], m, th);
      if (look === 4) { hslInto(col, b * 3, fract(0.5 + 0.35 * f), 0.55, 0.78); w1[b] = clamp01(0.5 + f / 3); continue; }
      hslInto(col, b * 3, fract(0.58 + 0.12 * f), 0.75, 0.66);
      const v = sin((ax[b] * 0.3 + ay[b] * 0.5) * 0.45 - th), band = clamp01((v - 0.6) / 0.3);
      w1[b] = band * 0.16; w2[b] = band * (1 - band) * 4 * 0.3;
      hslInto(rim, b * 3, fract(0.55 + 0.3 * v + ay[b] * 0.01), 0.8, 0.7);
    }
    for (let k = 0; k < n; k++) {
      const j = k * 3, b = blockOf[k], win = region[k] > 1.5;
      for (let i = 0; i < 3; i++) {
        const c = rgb[j + i];
        if (look === 4) { const base = c + (OPAL[i] - c) * 0.5; out[j + i] = base + (col[b * 3 + i] - base) * (win ? 0.45 : 0.3) * w1[b]; continue; }
        const kk = win ? 0.6 : 1;
        out[j + i] = c + (c * 0.5 + col[b * 3 + i] * 0.55 - c) * 0.5 * kk + BAND_LIGHT[i] * w1[b] * kk + rim[b * 3 + i] * w2[b] * kk;
      }
    }
  };
}

/** Where the sheen stands across the card at `time`: the sum of a cell's two coordinates under its middle. */
const sheenPos = (time: number) => -6 + 84 * clamp01(time / 1.4);
/** Where the big card's two glints open, on its bevel, in face cells. */
const GLINTS: [number, number][] = [[4.8, 0.8], [23, 38.8]];

/**
 * `sheenColor` over a fixed set of pixels: each pixel's place along the
 * diagonal and its glint are worked out once, and a pixel the band is
 * nowhere near is copied as it is.
 */
function sheenField(px: number, { x, y, region, rgb, raised }: LookPixels) {
  const n = region.length, s = new Float32Array(n), k = new Float32Array(n), star = new Float32Array(px < 0.5 ? n * 2 : 0), lit = new Float32Array(2);
  for (let i = 0; i < n; i++) {
    s[i] = x[i] + y[i];
    k[i] = (0.65 + 0.35 * (raised?.[i] ?? 0)) * (region[i] > 1.5 ? 0.6 : 1);
    if (px < 0.5) GLINTS.forEach(([gx, gy], g) => {
      const qx = Math.abs(x[i] - gx) * 5, qy = Math.abs(y[i] - gy) * 5, a = Math.min(qx, qy), b = Math.max(qx, qy);
      star[i * 2 + g] = b < 0.5 ? 1 : a < 0.5 && b < 3.5 ? 0.8 - 0.2 * b : 0;
    });
  }
  return (time: number, out: Float32Array) => {
    const pos = sheenPos(time);
    for (let g = 0; g < 2; g++) lit[g] = clamp01(1 - Math.abs(GLINTS[g][0] + GLINTS[g][1] - pos) / 1.2);
    for (let i = 0; i < n; i++) {
      const j = i * 3, d = Math.abs(s[i] - pos), g = star.length ? star[i * 2] * lit[0] + star[i * 2 + 1] * lit[1] : 0;
      if (d >= 4.5 && !g) { out[j] = rgb[j]; out[j + 1] = rgb[j + 1]; out[j + 2] = rgb[j + 2]; continue; }
      const halo = clamp01(1 - d / 4.5), glow = clamp01(1 - d / 2.2), core = clamp01(1 - d / 0.7), kk = k[i];
      const a = halo * halo * 0.35 * kk, b = glow * 0.55 * kk, c = core * 0.85 * kk;
      for (let ch = 0; ch < 3; ch++) {
        let v = rgb[j + ch];
        v += (SHEEN_HALO[ch] - v) * a; v += (SHEEN_GLOW[ch] - v) * b; v += (SHEEN_CORE[ch] - v) * c;
        out[j + ch] = v + SHEEN_GLINT[ch] * g;
      }
    }
  };
}
const SHEEN_HALO = [1, 0.88, 0.52], SHEEN_GLOW = [1, 0.93, 0.7], SHEEN_CORE = [1, 0.99, 0.93], SHEEN_GLINT = [1, 0.97, 0.88];
