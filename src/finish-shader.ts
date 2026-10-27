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
vec3 finishColor(vec3 c, float finish, float scuff, float h, float d, float row, float print, float time, float scan) {
  float b = band(d, time, print);
  float twinkle = step(0.965, fract(h * 13.0 + time / 3.0));
  float coat = clamp(1.0 - scuff * 1.4, 0.0, 1.0) * step(scuff * 0.55, h);
  if (finish < 0.5) c += b * 0.45 * step(scuff, 0.07);
  else if (finish < 1.5) { float s = 0.5 + 0.5 * sin(d * 0.8 - time * TAU / 2.0 + print); c = mix(c, c * vec3(0.86, 0.96, 1.18) + 0.08, 0.4 * s * coat) + b * 0.5 * coat; }
  else if (finish < 2.5) c += twinkle * 0.55 * coat + b * 0.25 * coat;
  else if (finish < 3.5) { c = hueShift(c, (time * TAU / 6.0 + d * 0.22) * coat); c = mix(c, vec3(1.0), twinkle * coat); }
  else if (finish < 4.5) {
    vec3 rain = hsv(vec3(fract(d * 0.07 - time / 3.0 + print * 0.013), 0.65, 1.0));
    c = mix(c, c * 0.45 + rain * 0.75, 0.6 * coat);
    c *= 1.0 + 0.12 * scan * step(mod(row + floor(time * 10.0), 3.0), 0.5);
  }
  else if (finish < 5.5) c += vec3(0.28, 0.12, 0.45) * b * coat + 0.07 * sin(time * TAU / 3.0 + d * 0.5) * coat;
  else c += b * 0.7 * coat + vec3(1.0, 0.9, 0.5) * twinkle * 0.6 * coat;
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

/** `finishColor` from GLSL_COMMON. `finish` is an index in SHADER_FINISHES. */
export function finishColor(c: Vec3, finish: number, scuff: number, h: number, d: number, row: number, print: number, time: number, scan: number): Vec3 {
  const b = band(d, time, print);
  const twinkle = step(0.965, fract(h * 13 + time / 3));
  const coat = clamp(1 - scuff * 1.4, 0, 1) * step(scuff * 0.55, h);
  if (finish < 0.5) return add(c, b * 0.45 * step(scuff, 0.07));
  if (finish < 1.5) {
    const s = 0.5 + 0.5 * Math.sin(d * 0.8 - time * TAU / 2 + print);
    return add(mix(c, add(scale(c, [0.86, 0.96, 1.18]), 0.08), 0.4 * s * coat), b * 0.5 * coat);
  }
  if (finish < 2.5) return add(c, twinkle * 0.55 * coat + b * 0.25 * coat);
  if (finish < 3.5) return mix(hueShift(c, (time * TAU / 6 + d * 0.22) * coat), [1, 1, 1], twinkle * coat);
  if (finish < 4.5) {
    const rain = hsv([fract(d * 0.07 - time / 3 + print * 0.013), 0.65, 1]);
    const out = mix(c, add(scale(c, 0.45), scale(rain, 0.75)), 0.6 * coat);
    return scale(out, 1 + 0.12 * scan * step(mod(row + Math.floor(time * 10), 3), 0.5));
  }
  if (finish < 5.5) return add(add(c, scale([0.28, 0.12, 0.45], b * coat)), 0.07 * Math.sin(time * TAU / 3 + d * 0.5) * coat);
  return add(add(c, b * 0.7 * coat), scale([1, 0.9, 0.5], twinkle * 0.6 * coat));
}

/** A colour channel as the GPU stores it. */
export const toByte = (v: number) => Math.round(clamp(v, 0, 1) * 255);

/** Loop time in seconds: what the shaders are given. */
export const loopSeconds = (ms: number) => mod(ms, LOOP_MS) / 1000;
