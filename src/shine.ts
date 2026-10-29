import { FRAME_HEIGHT, FRAME_SLOTS, FRAME_WIDTH, type AnimationFrame } from './animate';
import { finishColor, GLSL_COMMON, GLSL_PRECISION, loopSeconds, noiseOf, SHADER_FINISHES, toByte } from './finish-shader';
import type { Owned } from './owned';
import type { AvatarConfig } from './types';

/**
 * The finishes, moving: a WebGL shader that runs each worn copy's finish on
 * that copy's own pixels — Sunset's sheen, Tempered's glint, Nebula's drift,
 * Prism's rainbow, Negative's pulse, Gold's sparkle — while the guy plays a
 * move. Scuffed pixels shine less, the way they're painted.
 *
 * Browsers allow only a handful of WebGL contexts per page, so make one shine
 * and share it: draw each guy into it in turn and copy the result out with
 * `drawImage` into that guy's own 2D canvas. Without WebGL `createShine`
 * returns null; draw the frame's colours as they are.
 */

/**
 * A frame as the shader reads it: its colours; for each pixel the finish,
 * scuff and print of the copy it belongs to; and each pixel's noise. Three
 * RGBA byte arrays, the frame's size (16×20, wider with a buddy).
 */
export function shineData(frame: AnimationFrame, owned: AvatarConfig['owned'] = {}): { colors: Uint8Array; info: Uint8Array; noise: Uint8Array } {
  const W = frame.colors[0].length;
  const colors = new Uint8Array(W * FRAME_HEIGHT * 4);
  const info = new Uint8Array(W * FRAME_HEIGHT * 4);
  const noise = new Uint8Array(W * FRAME_HEIGHT * 4);
  frame.colors.forEach((row, y) => row.forEach((c, x) => {
    if (!c) return;
    const i = (y * W + x) * 4;
    colors.set([parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 255], i);
    const slot = frame.slots[y][x];
    const copy: Owned | undefined = slot ? owned?.[FRAME_SLOTS[slot - 1]] : undefined;
    const finish = copy ? SHADER_FINISHES.indexOf(copy.finish as (typeof SHADER_FINISHES)[number]) : -1;
    if (copy && finish >= 0) {
      const print = Math.floor(copy.print / 4);
      info.set([(finish + 1) * 32, Math.round(copy.scuff * 255), print, 255], i);
      noise[i] = noiseOf(x, y, print * 4);
    }
  }));
  return { colors, info, noise };
}

/** Whether any pixel of the frame belongs to a copy with a finish that shimmers. */
export const shines = (frame: AnimationFrame, owned: AvatarConfig['owned'] = {}) =>
  frame.slots.some(row => row.some(slot => slot > 0 && SHADER_FINISHES.includes(owned?.[FRAME_SLOTS[slot - 1]]?.finish as (typeof SHADER_FINISHES)[number])));

/**
 * The shader's picture, in plain code: the frame with each copy's finish
 * running `ms` into its loop, as RGBA bytes. The same colours the GPU draws.
 */
export function shineFrame(frame: AnimationFrame, owned: AvatarConfig['owned'], ms: number): Uint8ClampedArray {
  const { colors, info, noise } = shineData(frame, owned);
  const out = new Uint8ClampedArray(colors);
  const time = loopSeconds(ms), W = frame.colors[0].length;
  for (let y = 0; y < FRAME_HEIGHT; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (colors[i + 3] < 128 || info[i + 3] < 128) continue;
    const finish = Math.floor(info[i] / 32 + 0.5) - 1;
    const c = finishColor([colors[i] / 255, colors[i + 1] / 255, colors[i + 2] / 255], finish, info[i + 1] / 255, noise[i] / 255, x + y, y, info[i + 2] * 4, time, 0);
    out[i] = toByte(c[0]); out[i + 1] = toByte(c[1]); out[i + 2] = toByte(c[2]);
  }
  return out;
}

const VERTEX = 'attribute vec2 p; varying vec2 uv; void main(){ uv = p * 0.5 + 0.5; uv.y = 1.0 - uv.y; gl_Position = vec4(p, 0.0, 1.0); }';

/** The shader, for a game that runs its own WebGL: textures \`base\`, \`info\`, \`noise\` from shineData, \`time\` in loop seconds, \`res\` the frame's size. */
export const SHINE_FRAGMENT = `${GLSL_PRECISION}
varying vec2 uv;
uniform sampler2D base, info, noise;
uniform float time;
uniform vec2 res;
${GLSL_COMMON}
void main() {
  vec2 cell = floor(uv * res);
  vec2 at = (cell + 0.5) / res;
  vec4 b = texture2D(base, at);
  if (b.a < 0.5) { gl_FragColor = vec4(0.0); return; }
  vec3 c = b.rgb;
  vec4 k = texture2D(info, at);
  float finish = floor(k.r * 255.0 / 32.0 + 0.5) - 1.0;
  if (k.a > 0.5 && finish >= 0.0) c = finishColor(c, finish, k.g, texture2D(noise, at).r, cell.x + cell.y, cell.y, floor(k.b * 255.0 + 0.5) * 4.0, time, 0.0);
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

export interface Shine {
  /** The canvas the shader draws into, the size of the last frame drawn (16×20, wider with a buddy); copy it out with drawImage. */
  canvas: HTMLCanvasElement | OffscreenCanvas;
  /** Draws a frame with its copies' finishes `ms` into the shimmer. */
  draw(frame: AnimationFrame, owned: AvatarConfig['owned'], ms: number): void;
}

/** One shader to share across a page or a game, or null without WebGL. */
export function createShine(canvas?: HTMLCanvasElement | OffscreenCanvas): Shine | null {
  const target = canvas ?? (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(FRAME_WIDTH, FRAME_HEIGHT)
    : typeof document !== 'undefined' ? document.createElement('canvas') : null);
  if (!target) return null;
  target.width = FRAME_WIDTH;
  target.height = FRAME_HEIGHT;
  const gl = target.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true }) as WebGLRenderingContext | null;
  if (!gl) return null;

  const shader = (type: number, source: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, source); gl.compileShader(s); return s; };
  const program = gl.createProgram()!;
  gl.attachShader(program, shader(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, SHINE_FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const p = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(p);
  gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
  gl.uniform1i(gl.getUniformLocation(program, 'base'), 0);
  gl.uniform1i(gl.getUniformLocation(program, 'info'), 1);
  gl.uniform1i(gl.getUniformLocation(program, 'noise'), 2);
  const time = gl.getUniformLocation(program, 'time'), res = gl.getUniformLocation(program, 'res');

  const texture = (unit: number) => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.NEAREST);
    for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE);
    return t;
  };
  const textures = [texture(0), texture(1), texture(2)];

  return {
    canvas: target,
    draw(frame, owned, ms) {
      const { colors, info, noise } = shineData(frame, owned), W = frame.colors[0].length;
      if (target.width !== W) target.width = W;
      gl.viewport(0, 0, W, FRAME_HEIGHT);
      [colors, info, noise].forEach((bytes, unit) => {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, textures[unit]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, FRAME_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
      });
      gl.uniform1f(time, loopSeconds(ms));
      gl.uniform2f(res, W, FRAME_HEIGHT);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };
}
