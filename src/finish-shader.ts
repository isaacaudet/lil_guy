import { hash } from './hash';
import { LOOP_MS } from './loop';

export { LOOP_MS };

/**
 * The finishes' shimmer, written twice: as GLSL for a page or a game that has
 * WebGL, and as plain code that gives the same colours anywhere (a server, a
 * test, a browser without WebGL). Both read the same inputs: a pixel's colour,
 * its copy's finish, scuff and print, a fixed noise value for the pixel, and
 * the time. Two things keep them the same:
 *
 * - Nothing random is computed on the GPU. A sine hash comes out differently
 *   on every graphics card, so each pixel's noise is made here (`noiseOf`) and
 *   handed to the shader in a texture.
 * - Every movement repeats in `LOOP_MS`, so a baked loop closes without a jump
 *   and the GPU never sees a large time.
 *
 * `scripts/verify-shaders.mjs` runs the GLSL in a browser and checks it
 * against the plain code, pixel by pixel.
 */

/** The finishes in the order the shaders number them. */
export const SHADER_FINISHES = ['plain', 'sunset', 'tempered', 'nebula', 'prism', 'negative', 'gold'] as const;

/** A pixel's noise, 0 to 255: the same for a cell and print everywhere. */
export const noiseOf = (x: number, y: number, print: number) => hash(`noise|${x}|${y}|${print}`) & 255;

/** Highest precision the device has: mediump is 16-bit on phones, too coarse for the bands. */
export const GLSL_PRECISION = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';

export const GLSL_COMMON = `
const float TAU = 6.28318530718;
vec3 hsv(vec3 c) { vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0); return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y); }
vec3 hueShift(vec3 c, float a) {
  const mat3 toYIQ = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);
  const mat3 toRGB = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);
  vec3 yiq = toYIQ * c;
  float h = atan(yiq.z, yiq.y) + a, ch = length(yiq.yz);
  return toRGB * vec3(yiq.x, ch * cos(h), ch * sin(h));
}
float band(float d, float time, float print) { return 1.0 - clamp(abs(mod(d - time * 10.0 + print, 60.0) - 30.0) - 0.5, 0.0, 1.0); }
float soft(float d, float time, float print) { return 1.0 - clamp(abs(mod(d - time * 10.0 + print, 60.0) - 30.0) / 3.0, 0.0, 1.0); }
vec3 finishColor(vec3 c, float finish, float scuff, float h, float d, float row, float print, float time, float scan) {
  float b = band(d, time, print);
  float w = soft(d, time, print);
  float coat = clamp(1.0 - scuff * 1.4, 0.0, 1.0) * step(scuff * 0.55, h);
  if (finish < 0.5) c += b * 0.45 * step(scuff, 0.07);
  else if (finish < 1.5) { float s = 0.5 + 0.5 * sin(d * 0.8 - time * TAU / 2.0 + print); c = mix(c, c * vec3(0.86, 0.96, 1.18) + 0.08, 0.4 * s * coat) + b * 0.5 * coat; }
  else if (finish < 2.5) c = mix(c, c * vec3(0.9, 0.98, 1.1) + vec3(0.2, 0.2, 0.16), w * 0.5 * coat) + b * 0.2 * coat;
  else if (finish < 3.5) {
    c = hueShift(c, 0.32 * sin(time * TAU / 6.0 + d * 0.12 + fract(print * 0.618) * TAU) * coat);
    float s = max(0.0, sin(time * TAU / 3.0 + h * 97.0));
    c = mix(c, vec3(1.0, 0.94, 1.0), step(0.972, h) * s * s * s * coat);
  }
  else if (finish < 4.5) c = hueShift(c, time * TAU / 6.0 * coat) + w * 0.14 * coat;
  else if (finish < 5.5) c += vec3(0.28, 0.12, 0.45) * b * coat + 0.07 * sin(time * TAU / 3.0 + d * 0.5 + fract(print * 0.618) * TAU) * coat;
  else c = mix(c, vec3(1.0, 0.97, 0.84), w * 0.5 * coat) + b * 0.35 * coat;
  return c;
}
`;

// ------------------------------------------------ the same, as plain code (GLSL's own definitions)

export type Vec3 = [number, number, number];
const TAU = Math.PI * 2;
export const fract = (x: number) => x - Math.floor(x);
export const mod = (x: number, y: number) => x - y * Math.floor(x / y);
export const clamp = (x: number, a: number, b: number) => Math.min(Math.max(x, a), b);
export const step = (edge: number, x: number) => (x < edge ? 0 : 1);
export const smoothstep = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const distance = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const mix = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const add = (a: Vec3, k: number | Vec3): Vec3 => (typeof k === 'number' ? [a[0] + k, a[1] + k, a[2] + k] : [a[0] + k[0], a[1] + k[1], a[2] + k[2]]);
const scale = (a: Vec3, k: number | Vec3): Vec3 => (typeof k === 'number' ? [a[0] * k, a[1] * k, a[2] * k] : [a[0] * k[0], a[1] * k[1], a[2] * k[2]]);

export function hsv(c: Vec3): Vec3 {
  const p = [1, 2 / 3, 1 / 3].map(o => Math.abs(fract(c[0] + o) * 6 - 3));
  return p.map(v => c[2] * (1 + (clamp(v - 1, 0, 1) - 1) * c[1])) as Vec3;
}

export function hueShift(c: Vec3, a: number): Vec3 {
  const y = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  const i = 0.596 * c[0] - 0.274 * c[1] - 0.322 * c[2];
  const q = 0.211 * c[0] - 0.523 * c[1] + 0.312 * c[2];
  const h = Math.atan2(q, i) + a, ch = Math.hypot(i, q);
  const I = ch * Math.cos(h), Q = ch * Math.sin(h);
  return [y + 0.956 * I + 0.621 * Q, y - 0.272 * I - 0.647 * Q, y - 1.106 * I + 1.703 * Q];
}

export const band = (d: number, time: number, print: number) => 1 - clamp(Math.abs(mod(d - time * 10 + print, 60) - 30) - 0.5, 0, 1);

/** `soft` from GLSL_COMMON: a wide, soft band of light, three cells either side of its middle. */
export const soft = (d: number, time: number, print: number) => 1 - clamp(Math.abs(mod(d - time * 10 + print, 60) - 30) / 3, 0, 1);

/**
 * `finishColor` from GLSL_COMMON. `finish` is an index in SHADER_FINISHES.
 * Each finish moves in smooth light across the whole item, never pixel by
 * pixel: Tempered and Gold a soft sheen and a fine glint, Nebula a slow drift
 * of its colours and a few fixed stars pulsing, Prism its rainbow sweeping
 * round, Negative a slow pulse.
 */
export function finishColor(c: Vec3, finish: number, scuff: number, h: number, d: number, row: number, print: number, time: number, scan: number): Vec3 {
  const b = band(d, time, print), w = soft(d, time, print);
  const coat = clamp(1 - scuff * 1.4, 0, 1) * step(scuff * 0.55, h);
  if (finish < 0.5) return add(c, b * 0.45 * step(scuff, 0.07));
  if (finish < 1.5) {
    const s = 0.5 + 0.5 * Math.sin(d * 0.8 - time * TAU / 2 + print);
    return add(mix(c, add(scale(c, [0.86, 0.96, 1.18]), 0.08), 0.4 * s * coat), b * 0.5 * coat);
  }
  if (finish < 2.5) return add(mix(c, add(scale(c, [0.9, 0.98, 1.1]), [0.2, 0.2, 0.16]), w * 0.5 * coat), b * 0.2 * coat);
  if (finish < 3.5) {
    const shifted = hueShift(c, 0.32 * Math.sin(time * TAU / 6 + d * 0.12 + fract(print * 0.618) * TAU) * coat);
    const s = Math.max(0, Math.sin(time * TAU / 3 + h * 97));
    return mix(shifted, [1, 0.94, 1], step(0.972, h) * s * s * s * coat);
  }
  if (finish < 4.5) return add(hueShift(c, time * TAU / 6 * coat), w * 0.14 * coat);
  if (finish < 5.5) return add(add(c, scale([0.28, 0.12, 0.45], b * coat)), 0.07 * Math.sin(time * TAU / 3 + d * 0.5 + fract(print * 0.618) * TAU) * coat);
  return add(mix(c, [1, 0.97, 0.84], w * 0.5 * coat), b * 0.35 * coat);
}


/** A colour channel as the GPU stores it. */
export const toByte = (v: number) => Math.round(clamp(v, 0, 1) * 255);

/** Loop time in seconds: what the shaders are given. */
export const loopSeconds = (ms: number) => mod(ms, LOOP_MS) / 1000;

// ------------------------------------------------ card editions

/**
 * A card's edition, after Balatro's: the treatment its face gets for the
 * finish that sets its grade. Numbered as the shaders read them.
 */
export const EDITIONS = ['base', 'foil', 'holographic', 'polychrome', 'negative', 'gold', 'spectral'] as const;

/** The edition a finish puts on its card: Sunset is foil, Tempered and Nebula holographic, an aura's finishes spectral. */
export function editionOf(finish: string | undefined): number {
  const i = SHADER_FINISHES.indexOf(finish as (typeof SHADER_FINISHES)[number]);
  return i < 0 ? (finish ? 6 : 0) : [0, 1, 2, 2, 3, 4, 5][i];
}

/**
 * `editionColor` in GLSL: `p` is the cell in face cells, `px` one drawn pixel
 * in face cells (1 on the face, a fifth on the big card), `o` the window's
 * middle, `region` 1 for the card's face and 2 for its window, `h` the cell's
 * noise. Every motion comes round in LOOP_MS.
 */
export const GLSL_EDITIONS = `
float sweep(float s, float time, float width) { return 1.0 - clamp(abs(mod(s - time * 10.0, 60.0) - 30.0) / width, 0.0, 1.0); }
vec3 editionColor(vec3 c, float ed, float v, vec2 p, vec2 o, float region, float h, float px, float time) {
  if (ed < 0.5) return c;
  float wide = sweep(p.x + p.y * 0.6 + v * 13.0, time, 5.0);
  float glint = step(0.965, h) * pow(max(0.0, sin(time * TAU / 2.0 + h * 91.0)), 6.0);
  if (ed < 1.5) {
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    float fine = pow(0.5 + 0.5 * sin((p.x * 0.7 + p.y * 0.45 + v * 3.0) * 1.3 - time * TAU / 2.0), 6.0);
    return mix(c, l * vec3(0.8, 0.92, 1.1) + vec3(0.05, 0.08, 0.16), 0.6) + vec3(0.6, 0.75, 1.0) * (fine * 0.22 + wide * 0.4);
  }
  if (ed < 2.5) {
    vec3 tint = mix(vec3(1.0, 0.3, 0.42), vec3(0.28, 0.62, 1.0), 0.5 + 0.5 * sin(p.x * 0.35 - p.y * 0.55 + v * 2.0 - time * TAU / 3.0));
    float k = region > 1.5 ? 0.6 : 1.0;
    return mix(c, c * 0.5 + tint * 0.55, 0.55 * k) + step(0.5, fract(p.y / (px * 2.0))) * 0.05 * (2.0 - region) + wide * 0.25;
  }
  if (ed < 3.5) {
    vec3 rb = hsv(vec3(fract((p.x + p.y) * 0.03 + v * 0.25 - time / 6.0), 0.6, 1.0));
    return mix(hueShift(c, (p.x - p.y) * 0.05 - time * TAU / 6.0), c * 0.45 + rb * 0.6, 0.5) + wide * 0.18;
  }
  if (ed < 4.5) {
    vec3 n = vec3(1.0) - c;
    return mix(n, n * vec3(0.75, 0.68, 1.1) + vec3(0.02, 0.0, 0.06), 0.55) + vec3(0.3, 0.16, 0.5) * wide * 0.6;
  }
  if (ed < 5.5) {
    if (region > 1.5) return mix(c, vec3(1.0, 0.94, 0.78), sweep(p.x + p.y * 0.6 + v * 13.0, time, 9.0) * 0.16);
    return mix(c, vec3(1.0, 0.97, 0.84), wide * 0.6);
  }
  vec2 q = (p - o) / (region > 1.5 ? 7.0 : 12.0);
  float r = length(q), a = atan(q.y, q.x) + r * 1.8 - time * TAU / 6.0;
  vec2 w = vec2(cos(a), sin(a)) * r;
  float f = floor((0.5 + 0.5 * sin(w.x * 3.2 + sin(w.y * 2.6 + time * TAU / 3.0) * 1.5)) * 3.99);
  if (region > 1.5) return c * (0.7 + 0.25 * f) + wide * 0.12 + glint * 0.6;
  return hueShift(c * (0.86 + 0.1 * f), 0.4 * sin((p.x - p.y) * 0.16 + time * TAU / 6.0 + v)) + wide * 0.35 + glint * 0.6;
}
`;

/** `sweep` from GLSL_EDITIONS: a soft band of light `width` either side of its middle, crossing every 6 s. */
export const sweep = (s: number, time: number, width: number) => 1 - clamp(Math.abs(mod(s - time * 10, 60) - 30) / width, 0, 1);

/** `editionColor` from GLSL_EDITIONS. */
export function editionColor(c: Vec3, ed: number, v: number, p: [number, number], o: [number, number], region: number, h: number, px: number, time: number): Vec3 {
  if (ed < 0.5) return c;
  const wide = sweep(p[0] + p[1] * 0.6 + v * 13, time, 5);
  const glint = step(0.965, h) * Math.max(0, Math.sin(time * TAU / 2 + h * 91)) ** 6;
  if (ed < 1.5) {
    const l = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
    const fine = (0.5 + 0.5 * Math.sin((p[0] * 0.7 + p[1] * 0.45 + v * 3) * 1.3 - time * TAU / 2)) ** 6;
    return add(mix(c, add(scale([l, l, l], [0.8, 0.92, 1.1]), [0.05, 0.08, 0.16]), 0.6), scale([0.6, 0.75, 1], fine * 0.22 + wide * 0.4));
  }
  if (ed < 2.5) {
    const tint = mix([1, 0.3, 0.42], [0.28, 0.62, 1], 0.5 + 0.5 * Math.sin(p[0] * 0.35 - p[1] * 0.55 + v * 2 - time * TAU / 3));
    const k = region > 1.5 ? 0.6 : 1;
    return add(mix(c, add(scale(c, 0.5), scale(tint, 0.55)), 0.55 * k), step(0.5, fract(p[1] / (px * 2))) * 0.05 * (2 - region) + wide * 0.25);
  }
  if (ed < 3.5) {
    const rb = hsv([fract((p[0] + p[1]) * 0.03 + v * 0.25 - time / 6), 0.6, 1]);
    return add(mix(hueShift(c, (p[0] - p[1]) * 0.05 - time * TAU / 6), add(scale(c, 0.45), scale(rb, 0.6)), 0.5), wide * 0.18);
  }
  if (ed < 4.5) {
    const n: Vec3 = [1 - c[0], 1 - c[1], 1 - c[2]];
    return add(mix(n, add(scale(n, [0.75, 0.68, 1.1]), [0.02, 0, 0.06]), 0.55), scale([0.3, 0.16, 0.5], wide * 0.6));
  }
  if (ed < 5.5) {
    if (region > 1.5) return mix(c, [1, 0.94, 0.78], sweep(p[0] + p[1] * 0.6 + v * 13, time, 9) * 0.16);
    return mix(c, [1, 0.97, 0.84], wide * 0.6);
  }
  const z = region > 1.5 ? 7 : 12, qx = (p[0] - o[0]) / z, qy = (p[1] - o[1]) / z;
  const r = Math.hypot(qx, qy), a = Math.atan2(qy, qx) + r * 1.8 - time * TAU / 6;
  const wx = Math.cos(a) * r, wy = Math.sin(a) * r;
  const f = Math.floor((0.5 + 0.5 * Math.sin(wx * 3.2 + Math.sin(wy * 2.6 + time * TAU / 3) * 1.5)) * 3.99);
  if (region > 1.5) return add(scale(c, 0.7 + 0.25 * f), wide * 0.12 + glint * 0.6);
  return add(hueShift(scale(c, 0.86 + 0.1 * f), 0.4 * Math.sin((p[0] - p[1]) * 0.16 + time * TAU / 6 + v)), wide * 0.35 + glint * 0.6);
}

/** A sine from a table, to a few millionths: the spectral swirl takes two a pixel every frame. */
const SINES = Float64Array.from({ length: 4097 }, (_, i) => Math.sin(i / 4096 * TAU));
const sine = (x: number) => { const u = x * (4096 / TAU), i = Math.floor(u), j = i & 4095; return SINES[j] + (SINES[j + 1] - SINES[j]) * (u - i); };

/** Pixels an edition plays over: each one's cell (`x`, `y`, in face cells), its region and noise, and its colour, 0 to 1, three a pixel. */
export interface EditionPixels { x: Float32Array; y: Float32Array; region: Uint8Array; h: Float32Array; rgb: Float32Array }

/**
 * `editionColor` over a fixed set of pixels, for drawing the same card again
 * and again: what doesn't move is worked out once, so each moment costs a few
 * multiplies a pixel. The returned function writes each pixel's colour at
 * `time` into `out` (0 to 1, unclamped, three a pixel), as `editionColor` gives it.
 */
export function editionField(ed: number, v: number, o: [number, number], px: number, pixels: EditionPixels): (time: number, out: Float32Array) => void {
  const { x, y, region, h, rgb } = pixels, n = region.length;
  if (ed < 0.5) return (_, out) => out.set(rgb);
  // Where each pixel sits along the sweep, brought into 0 to 60 once.
  const at = new Float32Array(n);
  for (let k = 0; k < n; k++) at[k] = mod(x[k] + y[k] * 0.6 + v * 13, 60);
  /** `sweep(at, time, width)`, with T = time * 10 brought into 0 to 60. */
  const band = (k: number, T: number, width: number) => { let u = at[k] - T; if (u < 0) u += 60; const d = Math.abs(u - 30) / width; return d > 1 ? 0 : 1 - d; };
  const a = new Float32Array(n * 3), s = new Float32Array(n), c2 = new Float32Array(n);

  if (ed < 1.5) {
    for (let k = 0; k < n; k++) {
      const r = rgb[k * 3], g = rgb[k * 3 + 1], b = rgb[k * 3 + 2], l = 0.299 * r + 0.587 * g + 0.114 * b;
      a[k * 3] = r + (l * 0.8 + 0.05 - r) * 0.6; a[k * 3 + 1] = g + (l * 0.92 + 0.08 - g) * 0.6; a[k * 3 + 2] = b + (l * 1.1 + 0.16 - b) * 0.6;
      const phase = (x[k] * 0.7 + y[k] * 0.45 + v * 3) * 1.3;
      s[k] = Math.sin(phase); c2[k] = Math.cos(phase);
    }
    return (time, out) => {
      const T = mod(time * 10, 60), ca = Math.cos(time * TAU / 2), sa = Math.sin(time * TAU / 2);
      for (let k = 0; k < n; k++) {
        const w = 0.5 + 0.5 * (s[k] * ca - c2[k] * sa), w2 = w * w, m = w2 * w2 * w2 * 0.22 + band(k, T, 5) * 0.4;
        out[k * 3] = a[k * 3] + 0.6 * m; out[k * 3 + 1] = a[k * 3 + 1] + 0.75 * m; out[k * 3 + 2] = a[k * 3 + 2] + m;
      }
    };
  }
  if (ed < 2.5) {
    const lift = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const phase = x[k] * 0.35 - y[k] * 0.55 + v * 2;
      s[k] = Math.sin(phase); c2[k] = Math.cos(phase);
      lift[k] = step(0.5, fract(y[k] / (px * 2))) * 0.05 * (2 - region[k]);
    }
    return (time, out) => {
      const T = mod(time * 10, 60), ca = Math.cos(time * TAU / 3), sa = Math.sin(time * TAU / 3);
      for (let k = 0; k < n; k++) {
        const t = 0.5 + 0.5 * (s[k] * ca - c2[k] * sa), m = 0.55 * (region[k] > 1.5 ? 0.6 : 1), add = lift[k] + band(k, T, 5) * 0.25;
        const tr = 1 + (0.28 - 1) * t, tg = 0.3 + (0.62 - 0.3) * t, tb = 0.42 + (1 - 0.42) * t;
        const r = rgb[k * 3], g = rgb[k * 3 + 1], b = rgb[k * 3 + 2];
        out[k * 3] = r + (r * 0.5 + tr * 0.55 - r) * m + add;
        out[k * 3 + 1] = g + (g * 0.5 + tg * 0.55 - g) * m + add;
        out[k * 3 + 2] = b + (b * 0.5 + tb * 0.55 - b) * m + add;
      }
    };
  }
  if (ed < 3.5) {
    // The hue turns by the same angle everywhere at once, so each pixel's turned colour is a fixed one rotated.
    const lum = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const r = rgb[k * 3], g = rgb[k * 3 + 1], b = rgb[k * 3 + 2];
      const i = 0.596 * r - 0.274 * g - 0.322 * b, q = 0.211 * r - 0.523 * g + 0.312 * b;
      const hue = Math.atan2(q, i) + (x[k] - y[k]) * 0.05, ch = Math.hypot(i, q);
      lum[k] = 0.299 * r + 0.587 * g + 0.114 * b; s[k] = ch * Math.cos(hue); c2[k] = ch * Math.sin(hue);
      a[k] = (x[k] + y[k]) * 0.03 + v * 0.25;
    }
    const hsv1 = (hh: number, o: number) => { const p = Math.abs(fract(hh + o) * 6 - 3) - 1; return 1 + ((p < 0 ? 0 : p > 1 ? 1 : p) - 1) * 0.6; };
    return (time, out) => {
      const T = mod(time * 10, 60), ct = Math.cos(time * TAU / 6), st = Math.sin(time * TAU / 6);
      for (let k = 0; k < n; k++) {
        const I = s[k] * ct + c2[k] * st, Q = c2[k] * ct - s[k] * st, Y = lum[k];
        const hh = fract(a[k] - time / 6), add = band(k, T, 5) * 0.18;
        const hr = Y + 0.956 * I + 0.621 * Q, hg = Y - 0.272 * I - 0.647 * Q, hb = Y - 1.106 * I + 1.703 * Q;
        out[k * 3] = hr + (rgb[k * 3] * 0.45 + hsv1(hh, 1) * 0.6 - hr) * 0.5 + add;
        out[k * 3 + 1] = hg + (rgb[k * 3 + 1] * 0.45 + hsv1(hh, 2 / 3) * 0.6 - hg) * 0.5 + add;
        out[k * 3 + 2] = hb + (rgb[k * 3 + 2] * 0.45 + hsv1(hh, 1 / 3) * 0.6 - hb) * 0.5 + add;
      }
    };
  }
  if (ed < 4.5) {
    for (let k = 0; k < n; k++) for (let j = 0; j < 3; j++) {
      const m = 1 - rgb[k * 3 + j];
      a[k * 3 + j] = m + (m * [0.75, 0.68, 1.1][j] + [0.02, 0, 0.06][j] - m) * 0.55;
    }
    return (time, out) => {
      const T = mod(time * 10, 60);
      for (let k = 0; k < n; k++) {
        const w = band(k, T, 5) * 0.6;
        out[k * 3] = a[k * 3] + 0.3 * w; out[k * 3 + 1] = a[k * 3 + 1] + 0.16 * w; out[k * 3 + 2] = a[k * 3 + 2] + 0.5 * w;
      }
    };
  }
  if (ed < 5.5) {
    return (time, out) => {
      const T = mod(time * 10, 60);
      for (let k = 0; k < n; k++) {
        const win = region[k] > 1.5, m = win ? band(k, T, 9) * 0.16 : band(k, T, 5) * 0.6;
        const lr = 1, lg = win ? 0.94 : 0.97, lb = win ? 0.78 : 0.84;
        out[k * 3] = rgb[k * 3] + (lr - rgb[k * 3]) * m;
        out[k * 3 + 1] = rgb[k * 3 + 1] + (lg - rgb[k * 3 + 1]) * m;
        out[k * 3 + 2] = rgb[k * 3 + 2] + (lb - rgb[k * 3 + 2]) * m;
      }
    };
  }
  // Spectral: the swirl turns as a whole, so each pixel's place in it is a fixed point rotated.
  const lum = new Float32Array(n), hue = new Float32Array(n), chroma = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const z = region[k] > 1.5 ? 7 : 12, qx = (x[k] - o[0]) / z, qy = (y[k] - o[1]) / z;
    const r = Math.hypot(qx, qy), turn = Math.atan2(qy, qx) + r * 1.8;
    s[k] = Math.cos(turn) * r; c2[k] = Math.sin(turn) * r;
    const cr = rgb[k * 3], cg = rgb[k * 3 + 1], cb = rgb[k * 3 + 2];
    const i = 0.596 * cr - 0.274 * cg - 0.322 * cb, q = 0.211 * cr - 0.523 * cg + 0.312 * cb;
    lum[k] = 0.299 * cr + 0.587 * cg + 0.114 * cb; hue[k] = Math.atan2(q, i); chroma[k] = Math.hypot(i, q);
    a[k] = (x[k] - y[k]) * 0.16;
  }
  /** A glint opening on a pixel whose noise is high enough. */
  const glint = (k: number, time: number) => { if (h[k] < 0.965) return 0; const g = Math.max(0, Math.sin(time * TAU / 2 + h[k] * 91)), g2 = g * g; return g2 * g2 * g2 * 0.6; };
  return (time, out) => {
    const T = mod(time * 10, 60), th = time * TAU / 6, ct = Math.cos(th), st = Math.sin(th), B = time * TAU / 3;
    for (let k = 0; k < n; k++) {
      const wx = s[k] * ct + c2[k] * st, wy = c2[k] * ct - s[k] * st;
      const f = Math.floor((0.5 + 0.5 * sine(wx * 3.2 + sine(wy * 2.6 + B) * 1.5)) * 3.99);
      const r = rgb[k * 3], g = rgb[k * 3 + 1], b = rgb[k * 3 + 2], gl = glint(k, time);
      if (region[k] > 1.5) {
        const m = 0.7 + 0.25 * f, add = band(k, T, 5) * 0.12 + gl;
        out[k * 3] = r * m + add; out[k * 3 + 1] = g * m + add; out[k * 3 + 2] = b * m + add;
        continue;
      }
      const m = 0.86 + 0.1 * f, turn = hue[k] + 0.4 * Math.sin(a[k] + th + v), ch = chroma[k] * m, Y = lum[k] * m;
      const I = ch * Math.cos(turn), Q = ch * Math.sin(turn), add = band(k, T, 5) * 0.35 + gl;
      out[k * 3] = Y + 0.956 * I + 0.621 * Q + add; out[k * 3 + 1] = Y - 0.272 * I - 0.647 * Q + add; out[k * 3 + 2] = Y - 1.106 * I + 1.703 * Q + add;
    }
  };
}
