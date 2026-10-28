import { editionField, fract, type EditionPixels, type Vec3 } from './finish-shader';

/**
 * Prototype looks for a card's edition, after the way Balatro paints its
 * cards, to set beside today's. Nothing draws them unless asked
 * (`cardPlayer(input, ms, { look })`, `cardFace({ ..., look })`), so every
 * card, finish and saved guy keeps the picture it has.
 *
 * - `paint`: an aura card's ground as banded paint, a twisted swirl warped a
 *   few times over and cut into the aura's own colours in hard bands.
 * - `polychrome`: a Polychrome card, and every Prism copy on it, turned
 *   through the spectrum by a slow field of a few drifting rings, its colours
 *   lifted.
 * - `foil`: a Foil card's face run with interference bands that catch a
 *   cool highlight where they cross.
 * - `holo`: a Holographic card tinted by the same drifting field, with a fine
 *   diagonal grid lighting up where it runs bright.
 * - `sheen`: a Grail's brushed gold as it is, and once a loop a band of
 *   light crossing it corner to corner, as light catches a metal card:
 *   brighter on what stands proud (the bevel, the words, the rim), a glint
 *   on the bevel as it passes, and still the rest of the time.
 *
 * Each is written twice, as GLSL (`GLSL_LOOKS`) and as plain code
 * (`lookField`, `polyColor`), with the same result, and every motion comes
 * round in LOOP_MS: time enters only as whole turns of the loop's angle.
 */
export const CARD_LOOKS = ['none', 'paint', 'polychrome', 'foil', 'holo', 'sheen'] as const;
export type CardLook = Exclude<(typeof CARD_LOOKS)[number], 'none'>;

/** A look and what it is drawn with. */
export interface LookOptions {
  look?: CardLook;
  /** How hard `paint`'s bands are: 2 a soft wash, 5 the default, 12 near cut paper. */
  contrast?: number;
}

/** The look as the shaders number it, 0 for none. */
export const lookIndex = (look?: CardLook) => (look ? CARD_LOOKS.indexOf(look) : 0);

/** Whether a look changes a card of edition `ed` (an index in EDITIONS). */
export function lookApplies(look: number, ed: number): boolean {
  if (look === 1) return ed === 6;
  if (look === 2) return ed === 3;
  if (look === 3) return ed === 1;
  if (look === 4) return ed === 2;
  if (look === 5) return ed === 5;
  return false;
}

/** The default hardness of `paint`'s bands. */
export const PAINT_CONTRAST = 5;

const INK: Vec3 = [24 / 255, 20 / 255, 31 / 255];
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const unhex = (h: string): Vec3 => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const hueOf = (c: Vec3) => toHsl(c)[0];

/**
 * The three paints an aura card is banded in, from its aura's colours and the
 * one it's known by (`auraHue`): a deep ground most of the card, a middle
 * band, and a narrow top band in a second colour of the aura where it has one.
 * All kept dark enough that the guy's own aura still reads over them.
 */
export function paintColors(colors: string[], hue: string): [Vec3, Vec3, Vec3] {
  const main = unhex(hue), h = hueOf(main);
  const other = colors.map(unhex).filter(c => {
    const s = toHsl(c);
    const d = Math.abs(s[0] - h);
    return s[1] > 0.3 && Math.min(d, 1 - d) > 0.08;
  })[0];
  return [lerp(main, INK, 0.7), lerp(main, INK, 0.42), other ? lerp(other, INK, 0.3) : lerp(main, INK, 0.12)];
}

// ------------------------------------------------------------ colour

/** A colour as hue, saturation and lightness, each 0 to 1 (`toHsl` in GLSL). */
export function toHsl(c: Vec3): Vec3 {
  const hi = Math.max(c[0], c[1], c[2]), lo = Math.min(c[0], c[1], c[2]), d = hi - lo, l = (hi + lo) * 0.5;
  if (d < 1e-5) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = hi === c[0] ? (c[1] - c[2]) / d : hi === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4;
  return [fract(h / 6), s, l];
}

/** Back from hue, saturation and lightness (`fromHsl` in GLSL). */
export function fromHsl(h: number, s: number, l: number): Vec3 {
  const chroma = s * (1 - Math.abs(2 * l - 1));
  const ramp = (o: number) => { const k = Math.abs(fract(h + o) * 6 - 3) - 1; return l + chroma * ((k < 0 ? 0 : k > 1 ? 1 : k) - 0.5); };
  return [ramp(0), ramp(2 / 3), ramp(1 / 3)];
}

// ------------------------------------------------------------ the looks, as GLSL

/**
 * `lookColor` falls back to `editionColor` (GLSL_EDITIONS) where the look
 * doesn't apply, so it goes after it. `p` is the cell in face cells, `o` the
 * window's middle, `region` 1 face and 2 window, `th` the loop's angle.
 */
export const GLSL_LOOKS = `
vec3 toHsl(vec3 c) {
  float hi = max(c.r, max(c.g, c.b)), lo = min(c.r, min(c.g, c.b)), d = hi - lo, l = (hi + lo) * 0.5;
  if (d < 1e-5) return vec3(0.0, 0.0, l);
  float s = d / (1.0 - abs(2.0 * l - 1.0));
  float h = hi == c.r ? (c.g - c.b) / d : hi == c.g ? (c.b - c.r) / d + 2.0 : (c.r - c.g) / d + 4.0;
  return vec3(fract(h / 6.0), s, l);
}
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
vec3 polyColor(vec3 c, vec2 p, vec2 o, float th, float k) {
  vec3 s = toHsl(c);
  float f = polyField(p, o, th);
  return mix(c, fromHsl(vec3(fract(s.x + 0.22 * f + 0.1), min(0.78, s.y + 0.45), s.z * 0.84 + 0.08)), k);
}
vec3 paintColor(vec2 p, vec2 o, float th, vec3 c1, vec3 c2, vec3 c3, float contrast) {
  vec2 q = (p - o) / 9.0;
  float r = length(q), tw = 1.5 * r + 0.35 * sin(th);
  vec2 u = vec2(q.x * cos(tw) - q.y * sin(tw), q.x * sin(tw) + q.y * cos(tw)) * 2.6;
  float ct = 0.8 * cos(th), st = 0.8 * sin(th);
  u += 0.8 * vec2(sin(1.3 * u.y + ct), sin(1.1 * u.x + st));
  u += 0.8 * vec2(sin(1.7 * u.y - st + 0.9), sin(1.5 * u.x + ct - 0.7));
  u += 0.8 * vec2(sin(2.1 * u.y + ct + 1.8), sin(1.9 * u.x - st + 2.6));
  float t = 0.5 + 0.5 * sin(u.x * 0.9 + u.y * 1.2 + r * 1.5), w = 0.5 / contrast;
  float k1 = clamp((t - 0.38) / w + 0.5, 0.0, 1.0), k2 = clamp((t - 0.74) / w + 0.5, 0.0, 1.0);
  return mix(mix(c1, c2, k1), c3, k2) * (1.0 - 0.22 * clamp(r * 0.5 - 0.35, 0.0, 1.0));
}
float foilWave(vec2 p, vec2 o, float th) {
  vec2 a = p - o - vec2(5.0 * cos(th) - 9.0, 6.0 * sin(th) - 14.0);
  vec2 b = p - o - vec2(10.0 - 6.0 * sin(th), 16.0 + 5.0 * cos(th));
  return sin((length(a) - length(b)) * 0.6 + (p.x * 0.3 + p.y * 0.5) - th);
}
vec3 foilColor(vec3 c, vec2 p, vec2 o, float region, float th) {
  float w = foilWave(p, o, th);
  float lift = clamp((w - 0.35) / 0.45, 0.0, 1.0), peak = clamp((w - 0.86) / 0.14, 0.0, 1.0), dip = clamp((-w - 0.5) / 0.5, 0.0, 1.0);
  float k = region > 1.5 ? 0.6 : 1.0, l = dot(c, vec3(0.299, 0.587, 0.114));
  vec3 base = mix(c, l * vec3(0.8, 0.9, 1.06) + vec3(0.07, 0.09, 0.15), 0.6 * k);
  return base * (1.0 - 0.16 * dip * k) + vec3(0.42, 0.6, 0.95) * lift * 0.45 * k + vec3(0.7, 0.8, 0.95) * peak * 0.45 * k;
}
vec3 holoColor(vec3 c, vec2 p, vec2 o, float region, float th) {
  float f = polyField(p, o, th);
  vec3 tint = fromHsl(vec3(fract(0.58 + 0.12 * f), 0.75, 0.66));
  float ga = abs(cos((p.x + p.y) * 1.1)), gb = abs(cos((p.x - p.y) * 1.1));
  float grid = max(max(0.0, 10.0 * ga - 9.0), max(0.0, 10.0 * gb - 9.0)) * clamp(f * 0.6, 0.0, 1.0);
  float k = region > 1.5 ? 0.6 : 1.0;
  return mix(c, c * 0.5 + tint * 0.55, 0.5 * k) + vec3(0.65, 0.78, 1.0) * grid * 0.4 * k;
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
vec3 lookColor(vec3 c, float look, float ed, float v, vec2 p, vec2 o, float region, float raised, float h, float px, float time, vec3 c1, vec3 c2, vec3 c3, float contrast) {
  float th = time * TAU / 6.0;
  if (look > 0.5 && look < 1.5 && ed > 5.5) return region > 1.5 ? paintColor(p, o, th, c1, c2, c3, contrast) : c;
  if (look > 1.5 && look < 2.5 && ed > 2.5 && ed < 3.5) return polyColor(c, p, o, th, region > 1.5 ? 0.85 : 1.0);
  if (look > 2.5 && look < 3.5 && ed > 0.5 && ed < 1.5) return foilColor(c, p, o, region, th);
  if (look > 3.5 && look < 4.5 && ed > 1.5 && ed < 2.5) return holoColor(c, p, o, region, th);
  if (look > 4.5 && ed > 4.5 && ed < 5.5) return sheenColor(c, p, region, raised, px, time);
  return editionColor(c, ed, v, p, o, region, h, px, time);
}
`;

// ------------------------------------------------------------ the same, as plain code

const TAU = Math.PI * 2;
/** A sine from a table, to well under a millionth of a colour step: the looks take several a block every frame. */
const SINES = Float64Array.from({ length: 4097 }, (_, i) => Math.sin(i / 4096 * TAU));
const sin = (x: number) => { const u = x * (4096 / TAU), i = Math.floor(u), j = i & 4095; return SINES[j] + (SINES[j + 1] - SINES[j]) * (u - i); };
const cos = (x: number) => sin(x + Math.PI / 2);
/** The holo grid's cool light. */
const HOLO_LIT = [0.65, 0.78, 1];
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

const scratch = new Float64Array(6);
/** `polyColor` from GLSL_LOOKS: a Prism copy's pixel, or any pixel, turned by the field at `p`. */
export function polyColor(c: Vec3, p: [number, number], o: [number, number], time: number, k: number): Vec3 {
  const th = time * TAU / 6, s = toHsl(c);
  polyCentres(th, scratch);
  const f = polyAt(p[0] - o[0], p[1] - o[1], scratch, th);
  const t = fromHsl(fract(s[0] + 0.22 * f + 0.1), Math.min(0.78, s[1] + 0.45), s[2] * 0.84 + 0.08);
  return [c[0] + (t[0] - c[0]) * k, c[1] + (t[1] - c[1]) * k, c[2] + (t[2] - c[2]) * k];
}

/** What `paint` is drawn in: three colours, 0 to 1, and how hard its bands are. */
export interface PaintSpec { colors: [Vec3, Vec3, Vec3]; contrast: number }

/**
 * `lookColor` over a fixed set of pixels, as `editionField` is for the
 * editions, or null where the look doesn't change this edition. Pixels on
 * the same cell (the big card quantizes its cells to blocks) share one
 * working-out of the field, so a frame costs a field a block and a few
 * multiplies a pixel; nothing is allocated per frame.
 */
export function lookField(look: number, ed: number, v: number, o: [number, number], px: number, pixels: LookPixels, paint?: PaintSpec): ((time: number, out: Float32Array) => void) | null {
  if (!lookApplies(look, ed)) return null;
  const { x, y, region, rgb } = pixels, n = region.length;
  if (look === 5) return sheenField(px, pixels);
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
    const { colors: [c1, c2, c3], contrast } = paint ?? { colors: [[0, 0, 0], [0.5, 0.5, 0.5], [1, 1, 1]] as [Vec3, Vec3, Vec3], contrast: PAINT_CONTRAST };
    // What doesn't move: each block's place, twisted by its distance out, and its shade.
    const qx = new Float32Array(nb), qy = new Float32Array(nb), rr = new Float32Array(nb), shade = new Float32Array(nb);
    for (let b = 0; b < nb; b++) {
      const px = bx[b] / 9, py = by[b] / 9, r = Math.sqrt(px * px + py * py), a = 1.5 * r;
      qx[b] = px * Math.cos(a) - py * Math.sin(a); qy[b] = px * Math.sin(a) + py * Math.cos(a);
      rr[b] = r; shade[b] = 1 - 0.22 * clamp01(r * 0.5 - 0.35);
    }
    const w = 0.5 / contrast, k1v = new Float32Array(nb), k2v = new Float32Array(nb);
    return (time, out) => {
      const th = time * TAU / 6, tw = 0.35 * Math.sin(th), ca = Math.cos(tw), sa = Math.sin(tw), ct = 0.8 * Math.cos(th), st = 0.8 * Math.sin(th);
      for (let b = 0; b < nb; b++) {
        let ux = (qx[b] * ca - qy[b] * sa) * 2.6, uy = (qx[b] * sa + qy[b] * ca) * 2.6, dx: number;
        dx = 0.8 * sin(1.3 * uy + ct); uy += 0.8 * sin(1.1 * ux + st); ux += dx;
        dx = 0.8 * sin(1.7 * uy - st + 0.9); uy += 0.8 * sin(1.5 * ux + ct - 0.7); ux += dx;
        dx = 0.8 * sin(2.1 * uy + ct + 1.8); uy += 0.8 * sin(1.9 * ux - st + 2.6); ux += dx;
        const t = 0.5 + 0.5 * sin(ux * 0.9 + uy * 1.2 + rr[b] * 1.5);
        k1v[b] = clamp01((t - 0.38) / w + 0.5); k2v[b] = clamp01((t - 0.74) / w + 0.5);
      }
      for (let k = 0; k < n; k++) {
        const j = k * 3;
        if (region[k] < 1.5) { out[j] = rgb[j]; out[j + 1] = rgb[j + 1]; out[j + 2] = rgb[j + 2]; continue; }
        const b = blockOf[k], k1 = k1v[b], k2 = k2v[b], s = shade[b];
        for (let i = 0; i < 3; i++) { const lo = c1[i] + (c2[i] - c1[i]) * k1; out[j + i] = (lo + (c3[i] - lo) * k2) * s; }
      }
    };
  }

  if (look === 2 || look === 4) {
    // Each pixel's hue, saturation and lightness, worked out once.
    const hsl = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) { const s = toHsl([rgb[k * 3], rgb[k * 3 + 1], rgb[k * 3 + 2]]); hsl[k * 3] = s[0]; hsl[k * 3 + 1] = s[1]; hsl[k * 3 + 2] = s[2]; }
    const grid = new Float32Array(look === 4 ? nb : 0);
    for (let b = 0; b < grid.length; b++) {
      const px = bx[b] + o[0], py = by[b] + o[1];
      grid[b] = Math.max(0, 10 * Math.abs(Math.cos((px + py) * 1.1)) - 9, 10 * Math.abs(Math.cos((px - py) * 1.1)) - 9);
    }
    /** `fromHsl`, written into `out` at `j`. */
    const put = (out: Float32Array, j: number, h: number, s: number, l: number) => {
      const ch = s * (1 - Math.abs(2 * l - 1));
      for (let i = 0; i < 3; i++) { const q = Math.abs(fract(h + (i === 0 ? 0 : i === 1 ? 2 / 3 : 1 / 3)) * 6 - 3) - 1; out[j + i] = l + ch * ((q < 0 ? 0 : q > 1 ? 1 : q) - 0.5); }
    };
    // Holo's tint and grid light depend only on the block.
    const tint = new Float32Array(look === 4 ? nb * 3 : 0), glow = new Float32Array(look === 4 ? nb : 0);
    return (time, out) => {
      const th = time * TAU / 6;
      polyCentres(th, m);
      for (let b = 0; b < nb; b++) val[b] = polyAt(bx[b], by[b], m, th);
      if (look === 4) for (let b = 0; b < nb; b++) { put(tint, b * 3, fract(0.58 + 0.12 * val[b]), 0.75, 0.66); glow[b] = grid[b] * clamp01(val[b] * 0.6) * 0.4; }
      for (let k = 0; k < n; k++) {
        const j = k * 3, f = val[blockOf[k]], win = region[k] > 1.5;
        if (look === 2) {
          put(out, j, fract(hsl[j] + 0.22 * f + 0.1), Math.min(0.78, hsl[j + 1] + 0.45), hsl[j + 2] * 0.84 + 0.08);
          const kk = win ? 0.85 : 1;
          for (let i = 0; i < 3; i++) out[j + i] = rgb[j + i] + (out[j + i] - rgb[j + i]) * kk;
          continue;
        }
        const b = blockOf[k], kk = win ? 0.6 : 1, g = glow[b] * kk;
        for (let i = 0; i < 3; i++) { const c = rgb[j + i]; out[j + i] = c + (c * 0.5 + tint[b * 3 + i] * 0.55 - c) * 0.5 * kk + HOLO_LIT[i] * g; }
      }
    };
  }

  // Foil.
  const lum = new Float32Array(n);
  for (let k = 0; k < n; k++) lum[k] = 0.299 * rgb[k * 3] + 0.587 * rgb[k * 3 + 1] + 0.114 * rgb[k * 3 + 2];
  const lift = new Float32Array(nb), peak = new Float32Array(nb), dip = new Float32Array(nb);
  const diag = Float32Array.from(bx, (dx, b) => (dx + o[0]) * 0.3 + (by[b] + o[1]) * 0.5);
  return (time, out) => {
    const th = time * TAU / 6;
    const ax = 5 * Math.cos(th) - 9, ay = 6 * Math.sin(th) - 14, cx = 10 - 6 * Math.sin(th), cy = 16 + 5 * Math.cos(th);
    for (let b = 0; b < nb; b++) {
      const a1 = bx[b] - ax, a2 = by[b] - ay, b1 = bx[b] - cx, b2 = by[b] - cy;
      const w = sin((Math.sqrt(a1 * a1 + a2 * a2) - Math.sqrt(b1 * b1 + b2 * b2)) * 0.6 + diag[b] - th);
      lift[b] = clamp01((w - 0.35) / 0.45); peak[b] = clamp01((w - 0.86) / 0.14); dip[b] = clamp01((-w - 0.5) / 0.5);
    }
    for (let k = 0; k < n; k++) {
      const j = k * 3, b = blockOf[k], win = region[k] > 1.5;
      const kk = win ? 0.6 : 1, mm = 0.6 * kk, d = 1 - 0.16 * dip[b] * kk, l = lift[b] * 0.45 * kk, p = peak[b] * 0.45 * kk, L = lum[k];
      out[j] = (rgb[j] + (L * 0.8 + 0.07 - rgb[j]) * mm) * d + 0.42 * l + 0.7 * p;
      out[j + 1] = (rgb[j + 1] + (L * 0.9 + 0.09 - rgb[j + 1]) * mm) * d + 0.6 * l + 0.8 * p;
      out[j + 2] = (rgb[j + 2] + (L * 1.06 + 0.15 - rgb[j + 2]) * mm) * d + 0.95 * l + 0.95 * p;
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
  const n = region.length, s = new Float32Array(n), k = new Float32Array(n), star = new Float32Array(px < 0.5 ? n * 2 : 0);
  for (let i = 0; i < n; i++) {
    s[i] = x[i] + y[i];
    k[i] = (0.65 + 0.35 * (raised?.[i] ?? 0)) * (region[i] > 1.5 ? 0.6 : 1);
    if (px < 0.5) GLINTS.forEach(([gx, gy], g) => {
      const qx = Math.abs(x[i] - gx) * 5, qy = Math.abs(y[i] - gy) * 5, a = Math.min(qx, qy), b = Math.max(qx, qy);
      star[i * 2 + g] = b < 0.5 ? 1 : a < 0.5 && b < 3.5 ? 0.8 - 0.2 * b : 0;
    });
  }
  return (time: number, out: Float32Array) => {
    const pos = sheenPos(time), lit = GLINTS.map(([gx, gy]) => clamp01(1 - Math.abs(gx + gy - pos) / 1.2));
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

/** What a look plays over: the edition's pixels, and for the sheen how proud each one stands, 0 or 1. */
export type LookPixels = EditionPixels & { raised?: Float32Array };

/** `lookColor`'s choice over a set of pixels: the look's field where it applies, else the edition's own. */
export function cardField(look: number, ed: number, v: number, o: [number, number], px: number, pixels: LookPixels, paint?: PaintSpec) {
  return lookField(look, ed, v, o, px, pixels, paint) ?? editionField(ed, v, o, px, pixels);
}
