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
// A card's foil, as on a trading card: each finish has its own pattern, and a copy's print picks its variant (\`v\`, 0 to 3).
vec3 holoColor(vec3 c, float holo, float v, vec2 p, vec2 o, float h, float time) {
  if (holo < 0.5) return c;
  if (holo < 1.5) { float s = fract((p.x - p.y * 0.5) / (4.0 + v) - time / 3.0); return mix(c, c * vec3(1.05, 0.85, 0.95) + vec3(0.18, 0.08, 0.12), 0.6 * (1.0 - smoothstep(0.3, 0.4, s))); }
  if (holo < 2.5) { float a = sin(p.x * 0.45 + v) + cos(p.y * 0.35 - v) + time * TAU / 6.0; return mix(c, hueShift(c * 0.9 + vec3(0.1, 0.12, 0.2), a), 0.55); }
  if (holo < 3.5) { vec3 sky = mix(c, vec3(0.16, 0.12, 0.34), 0.55); return mix(sky, vec3(1.0, 0.95, 1.0), step(0.94 - v * 0.015, h) * step(0.4, fract(h * 17.0 + time / 2.0))); }
  if (holo < 4.5) { float id = floor((p.x + p.y * 2.0) / (4.0 + v)) + floor((p.x - p.y * 2.0 + 90.0) / (4.0 + v)) * 7.0; vec3 ice = hsv(vec3(fract(id * 0.618 + time / 6.0), 0.45, 1.0)); return mix(c, c * 0.55 + ice * 0.5, 0.55); }
  if (holo < 5.5) return c;
  vec2 q = p - o;
  float r = fract(atan(q.y, q.x) * (5.0 + v) / TAU + time / 6.0);
  return mix(c, vec3(1.0, 0.86, 0.45), smoothstep(0.42, 0.58, r) * (1.0 - smoothstep(0.92, 1.0, r)) * 0.4);
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


/** `holoColor` from GLSL_COMMON: a card's foil pattern for a finish (an index in SHADER_FINISHES), its variant `v` 0–3, at cell `p` round `o`. */
export function holoColor(c: Vec3, holo: number, v: number, p: [number, number], o: [number, number], h: number, time: number): Vec3 {
  if (holo < 0.5) return c;
  if (holo < 1.5) { const s = fract((p[0] - p[1] * 0.5) / (4 + v) - time / 3); return mix(c, add(scale(c, [1.05, 0.85, 0.95]), [0.18, 0.08, 0.12]), 0.6 * (1 - smoothstep(0.3, 0.4, s))); }
  if (holo < 2.5) { const a = Math.sin(p[0] * 0.45 + v) + Math.cos(p[1] * 0.35 - v) + time * TAU / 6; return mix(c, hueShift(add(scale(c, 0.9), [0.1, 0.12, 0.2]), a), 0.55); }
  if (holo < 3.5) { const sky = mix(c, [0.16, 0.12, 0.34], 0.55); return mix(sky, [1, 0.95, 1], step(0.94 - v * 0.015, h) * step(0.4, fract(h * 17 + time / 2))); }
  if (holo < 4.5) {
    const id = Math.floor((p[0] + p[1] * 2) / (4 + v)) + Math.floor((p[0] - p[1] * 2 + 90) / (4 + v)) * 7;
    const ice = hsv([fract(id * 0.618 + time / 6), 0.45, 1]);
    return mix(c, add(scale(c, 0.55), scale(ice, 0.5)), 0.55);
  }
  if (holo < 5.5) return c;
  const r = fract(Math.atan2(p[1] - o[1], p[0] - o[0]) * (5 + v) / TAU + time / 6);
  return mix(c, [1, 0.86, 0.45], smoothstep(0.42, 0.58, r) * (1 - smoothstep(0.92, 1, r)) * 0.4);
}

/** A colour channel as the GPU stores it. */
export const toByte = (v: number) => Math.round(clamp(v, 0, 1) * 255);

/** Loop time in seconds: what the shaders are given. */
export const loopSeconds = (ms: number) => mod(ms, LOOP_MS) / 1000;
