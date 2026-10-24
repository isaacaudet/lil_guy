import { FRAME_HEIGHT, FRAME_SLOTS, FRAME_WIDTH, type AnimationFrame } from './animate';
import type { Finish, Owned } from './owned';
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

const FINISH_ORDER: Finish[] = ['plain', 'sunset', 'tempered', 'nebula', 'prism', 'negative', 'gold'];

/**
 * A frame as the shader reads it: its colours, and for each pixel the finish,
 * scuff and print of the copy it belongs to. Two RGBA byte arrays, 16×20.
 */
export function shineData(frame: AnimationFrame, owned: AvatarConfig['owned'] = {}): { colors: Uint8Array; info: Uint8Array } {
  const colors = new Uint8Array(FRAME_WIDTH * FRAME_HEIGHT * 4);
  const info = new Uint8Array(FRAME_WIDTH * FRAME_HEIGHT * 4);
  frame.colors.forEach((row, y) => row.forEach((c, x) => {
    if (!c) return;
    const i = (y * FRAME_WIDTH + x) * 4;
    colors.set([parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 255], i);
    const slot = frame.slots[y][x];
    const copy: Owned | undefined = slot ? owned?.[FRAME_SLOTS[slot - 1]] : undefined;
    if (copy) info.set([(FINISH_ORDER.indexOf(copy.finish) + 1) * 32, Math.round(copy.scuff * 255), Math.floor(copy.print / 4), 255], i);
  }));
  return { colors, info };
}

const VERTEX = 'attribute vec2 p; varying vec2 uv; void main(){ uv = p * 0.5 + 0.5; uv.y = 1.0 - uv.y; gl_Position = vec4(p, 0.0, 1.0); }';

const FRAGMENT = `
precision mediump float;
varying vec2 uv;
uniform sampler2D base, info;
uniform float time;
float hash(vec2 c, float p) { return fract(sin(dot(c, vec2(127.1, 311.7)) + p * 0.731) * 43758.5453); }
vec3 hsv(vec3 c) { vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0); return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y); }
vec3 hueShift(vec3 c, float a) {
  const mat3 toYIQ = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);
  const mat3 toRGB = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);
  vec3 yiq = toYIQ * c;
  float h = atan(yiq.z, yiq.y) + a, ch = length(yiq.yz);
  return toRGB * vec3(yiq.x, ch * cos(h), ch * sin(h));
}
void main() {
  vec2 res = vec2(${FRAME_WIDTH}.0, ${FRAME_HEIGHT}.0);
  vec2 cell = floor(uv * res);
  vec2 at = (cell + 0.5) / res;
  vec4 b = texture2D(base, at);
  if (b.a < 0.5) { gl_FragColor = vec4(0.0); return; }
  vec3 c = b.rgb;
  vec4 k = texture2D(info, at);
  float finish = floor(k.r * 255.0 / 32.0 + 0.5) - 1.0;
  if (k.a > 0.5 && finish >= 0.0) {
    float scuff = k.g, print = floor(k.b * 255.0 + 0.5) * 4.0;
    float d = cell.x + cell.y, h = hash(cell, print);
    float band = 1.0 - clamp(abs(mod(d - time * 10.0 + print, 58.0) - 29.0) - 0.5, 0.0, 1.0);
    float twinkle = step(0.965, fract(h * 13.0 + time * 0.37));
    float coat = clamp(1.0 - scuff * 1.4, 0.0, 1.0) * step(scuff * 0.55, h);
    if (finish < 0.5) c += band * 0.45 * step(scuff, 0.07);
    else if (finish < 1.5) { float s = 0.5 + 0.5 * sin(d * 0.8 - time * 3.0 + print); c = mix(c, c * vec3(0.86, 0.96, 1.18) + 0.08, 0.4 * s * coat) + band * 0.5 * coat; }
    else if (finish < 2.5) c += twinkle * 0.55 * coat + band * 0.25 * coat;
    else if (finish < 3.5) { c = hueShift(c, (time * 0.9 + d * 0.22) * coat); c = mix(c, vec3(1.0), twinkle * coat); }
    else if (finish < 4.5) { vec3 rain = hsv(vec3(fract(d * 0.07 - time * 0.3 + print * 0.013), 0.65, 1.0)); c = mix(c, c * 0.45 + rain * 0.75, 0.6 * coat); }
    else if (finish < 5.5) c += vec3(0.28, 0.12, 0.45) * band * coat + 0.07 * sin(time * 2.0 + d * 0.5) * coat;
    else c += band * 0.7 * coat + vec3(1.0, 0.9, 0.5) * twinkle * 0.6 * coat;
  }
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

export interface Shine {
  /** The 16×20 canvas the shader draws into; copy it out with drawImage. */
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
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAGMENT));
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
  const time = gl.getUniformLocation(program, 'time');
  gl.viewport(0, 0, FRAME_WIDTH, FRAME_HEIGHT);

  const texture = (unit: number) => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.NEAREST);
    for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE);
    return t;
  };
  const textures = [texture(0), texture(1)];

  return {
    canvas: target,
    draw(frame, owned, ms) {
      const { colors, info } = shineData(frame, owned);
      [colors, info].forEach((bytes, unit) => {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, textures[unit]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, FRAME_WIDTH, FRAME_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
      });
      gl.uniform1f(time, ms / 1000);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };
}
