import { backdropColors, FRAME_WIDTH, HEADROOM } from './animate';
import { compose } from './compose';
import { distance, editionField, editionOf, finishColor, GLSL_COMMON, GLSL_EDITIONS, GLSL_PRECISION, loopSeconds, noiseOf, SHADER_FINISHES, smoothstep, toByte, type Vec3 } from './finish-shader';
import { dress, itemById, SET_COLORS, withItems } from './items';
import { auraColors, auraHue } from './auras';
import { cardField, GLSL_LOOKS, lookIndex, paintColors, PAINT_CONTRAST, polyColor, type LookOptions, type PaintSpec } from './card-looks';
import { encode, GRADES, gradeOf, type Owned } from './owned';
import { paint } from './paint';
import { paletteOf } from './palette';
import { LAYER } from './parts/art';
import { resolve } from './resolve';
import type { AvatarConfig } from './types';

/**
 * The trading card a guy or an item is shown on: a 26×42 face printed in its
 * grade's colour, a dark plate across the top for the name, the guy standing
 * in a window, and a dark plate at the foot with the grade pips and the set's
 * symbol. Its words (name, print, odds) are the page's to write over it.
 *
 * Like Balatro's cards, each has an edition, from the finish that sets its
 * grade: Foil (Sunset), Holographic (Tempered, Nebula), Polychrome (Prism),
 * Negative, Gold for a Grail, and Spectral for an aura card, which is
 * full-art: its aura's own colours swirl edge to edge. Each worn copy's pixels
 * shine in their own finish, and everything comes round in `LOOP_MS`.
 *
 * The face is built once (`cardFace`), then drawn at a time either by the GPU
 * (`CARD_FRAGMENT`, `createCardShader`) or in plain code (`cardFaceAt`), with
 * the same result.
 */
export const FACE_WIDTH = 26;
export const FACE_HEIGHT = 42;

export interface FaceSpec {
  /** The guy's seed or name. */
  name: string;
  /** Picked parts (a look), as `resolve` takes them. */
  parts?: Parameters<typeof resolve>[1];
  /** A palette index, overriding the dealt one. */
  palette?: number;
  /** The copies he wears. */
  copies?: Owned[];
  /** The grade the card is shown at; by default the best of his copies'. */
  grade?: number;
  /** The window's tint when there's no grade. */
  tint?: string;
  /** The machine whose set symbol it carries; by default its last copy's. */
  set?: string;
  /** A prototype look for its edition (./card-looks), and its paint's contrast. None by default. */
  look?: LookOptions['look'];
  contrast?: number;
}

export interface CardFace {
  /** Colours, 26×42 RGBA. */
  base: Uint8Array;
  /** Per pixel: what it is (card, window, guy, item, plate), its copy's finish, scuff and print. */
  kind: Uint8Array;
  /** Per pixel noise, in the red channel. */
  noise: Uint8Array;
  grade: number;
  negative: boolean;
  /** Where the face's wide band starts: the last copy's print. */
  seed: number;
  /** The last copy's finish, an index in SHADER_FINISHES (0 for none), and its print's variant 0–3. */
  holo: number;
  variant: number;
  /** The card's edition, an index in EDITIONS. */
  edition: number;
  /** The window's middle, in face cells: where a Spectral swirl turns round. */
  origin: [number, number];
  /** A prototype look (an index in CARD_LOOKS) and what its paint is drawn in; only on a face given one. */
  look?: number;
  paint?: PaintSpec;
}

const rgb = (s: string): [number, number, number] => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const blend = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const gradeIndex = (o: Owned) => GRADES.findIndex(g => g.id === gradeOf(o).id);

const INK = [24, 20, 31], WHITE = [255, 255, 255], IVORY = [246, 240, 227], PLATE = [38, 34, 52];
/** Kinds of pixel, as the shader reads them. */
const CARD = 1, WINDOW = 2, GUY = 3, ITEM = 4, FIXED = 5;

/** The card's face, ready to draw at any time. */
export function cardFace(spec: FaceSpec): CardFace {
  const W = FACE_WIDTH, H = FACE_HEIGHT;
  const copies = spec.copies ?? [];
  const r = resolve(spec.name, spec.parts);
  if (spec.palette !== undefined) r.palette = spec.palette;
  const config: AvatarConfig = dress(r, { equip: copies.map(encode) });
  const grid = compose(config);
  const palette = withItems(paletteOf(config), config), colors = paint(grid, config, palette);
  const owned = config.owned ?? {};
  const g = spec.grade ?? (copies.length ? Math.max(...copies.map(gradeIndex)) : -1);
  const last = copies[copies.length - 1], lastItem = last ? itemById(last.item) : undefined;
  const set = spec.set ?? (lastItem && lastItem.game !== 'club' ? lastItem.game : undefined);
  const holo = last ? Math.max(0, SHADER_FINISHES.indexOf(last.finish as (typeof SHADER_FINISHES)[number])) : 0;
  // The edition: the finish of the copy that sets the grade, or the grade's own for a card given one.
  const top = copies.filter(o => gradeIndex(o) === g).pop();
  const edition = top ? editionOf(top.finish) : g < 0 ? 0 : [0, 1, 2, 3, 5, 6][Math.min(g, 5)];
  const base = new Uint8Array(W * H * 4), kind = new Uint8Array(W * H * 4), noise = new Uint8Array(W * H * 4);
  const put = (x: number, y: number, c: number[], k: number, fi = -1, sc = 0, pr = 0) => {
    const i = (y * W + x) * 4, print = Math.floor(pr / 4);
    base.set([c[0], c[1], c[2], 255], i);
    kind.set([k * 32, (fi + 1) * 32, Math.round(sc * 255), print], i);
    noise[i] = noiseOf(x, y, print * 4);
  };
  const gc = g >= 0 ? rgb(GRADES[Math.min(g, GRADES.length - 1)].color) : spec.tint ? rgb(spec.tint) : [104, 118, 146];
  const aura = edition === 6, gold = edition === 5, neg = edition === 4;
  const auraCopy = copies.find(o => itemById(o.item)?.slot === 'aura');
  const tone = aura && auraCopy ? rgb(auraHue(auraCopy.item, auraCopy.finish, auraCopy.print)) : gc;
  // The window sits round the picture, however wide the picture is.
  const gx0 = Math.floor((W - FRAME_WIDTH) / 2), left = Math.max(2, gx0 - 2), right = Math.min(W - 3, gx0 + FRAME_WIDTH + 1), wTop = 9, wBottom = 28;
  const origin: [number, number] = [(left + right) / 2, (wTop + wBottom) / 2];
  // The stock the card is printed on, before its edition: the grade's colour (an aura's own on an
  // aura card), gold for a Grail, pale for a Negative card so its edition turns it dark.
  const stock = (x: number, y: number) => gold ? blend([255, 222, 110], [204, 124, 22], y / H * 0.85)
    : neg ? blend(blend(IVORY, tone, 0.35), blend(IVORY, tone, 0.6), y / H)
      : blend(blend(tone, WHITE, 0.08), blend(tone, INK, 0.25), y / H);
  const plate = gold ? [92, 52, 8] : aura ? blend(blend(tone, INK, 0.6), INK, 0.45) : PLATE;
  const light = gold ? [112, 62, 10] : blend(IVORY, gc, g >= 0 ? 0.22 : spec.tint ? 0.3 : 0.12);
  const glow = gold ? [232, 160, 48] : blend(light, gc, 0.2);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const cx = Math.min(x, W - 1 - x), cy = Math.min(y, H - 1 - y);
    if (cx + cy < 2) continue;
    // A dark outline, then a bevel: lit along the top and left, deep along the bottom and right.
    if (cx === 0 || cy === 0 || cx + cy === 2) { put(x, y, INK, FIXED); continue; }
    const bevel = cx === 1 || cy === 1 || cx + cy === 3;
    let c = stock(x, y);
    if (bevel) c = (x > W / 2 && cx === 1) || (y > H / 2 && cy === 1) ? blend(c, INK, 0.3) : blend(c, WHITE, 0.35);
    // An aura card is full-art: its aura's colours fill the face, the swirl playing over them.
    if (aura && !bevel) { const d = Math.hypot((x - origin[0]) / 15, (y - origin[1]) / 19); put(x, y, blend(blend(tone, INK, 0.62), blend(tone, INK, 0.3), Math.max(0, 1 - d) ** 1.2), WINDOW); continue; }
    put(x, y, c, CARD);
  }
  // The name's plate across the top, in the grade's colour along its lip.
  for (let y = 2; y <= 7; y++) for (let x = 2; x <= W - 3; x++) {
    if ((x === 2 || x === W - 3) && (y === 2 || y === 7)) continue;
    put(x, y, y === 2 ? blend(plate, WHITE, 0.16) : y === 7 ? INK : plate, FIXED);
  }
  // The window, set in with a dark rim: light by grade, deep amber on a Grail; none on an aura card.
  if (!aura) for (let y = wTop; y <= wBottom; y++) for (let x = left; x <= right; x++) {
    const d = Math.hypot((x - origin[0]) / 10, (y - origin[1]) / 11);
    if (x === left || y === wTop || x === right || y === wBottom) put(x, y, INK, FIXED);
    else put(x, y, blend(light, glow, Math.max(0, 1 - d) ** 1.4), WINDOW);
  }
  // A frame he wears fills the window (an aura card's art) edge to edge, never a box smaller than what stands on it.
  const frameCopy = owned.frame, fx0 = aura ? 2 : left + 1, fx1 = aura ? W - 3 : right - 1, fy0 = aura ? 8 : wTop + 1, fy1 = aura ? 29 : wBottom - 1;
  const ground = backdropColors(config, palette, fx0 - gx0, fy0 - 11 + HEADROOM, fx1 - fx0 + 1, fy1 - fy0 + 1);
  if (ground) {
    const fi = frameCopy ? SHADER_FINISHES.indexOf(frameCopy.finish as (typeof SHADER_FINISHES)[number]) : -1;
    ground.forEach((row, j) => row.forEach((hex, i) => { if (hex) put(fx0 + i, fy0 + j, rgb(hex), ITEM, fi, frameCopy?.scuff ?? 0, frameCopy?.print ?? 0); }));
  }
  grid.forEach((row, y) => row.forEach((t, x) => {
    const hex = colors[y][x];
    if (!hex || (ground && t >= LAYER.frame && t < LAYER.buddy)) return;
    const slot = t >= LAYER.aura ? null : t >= LAYER.buddy ? 'buddy' : t >= LAYER.frame ? 'frame' : t >= LAYER.hat ? 'hat' : t >= LAYER.skin ? 'skin' : null;
    const o = slot ? owned[slot] : undefined;
    const fi = o ? SHADER_FINISHES.indexOf(o.finish as (typeof SHADER_FINISHES)[number]) : -1;
    if (x + gx0 > 1 && x + gx0 < W - 2) put(x + gx0, y + 11, rgb(hex), o ? ITEM : GUY, fi, o ? o.scuff : 0, o ? o.print : 0);
  }));
  // The foot's plate: the grade's pips, and under them room for the page's words and the set's symbol.
  for (let y = 30; y <= H - 3; y++) for (let x = 2; x <= W - 3; x++) {
    if ((x === 2 || x === W - 3) && (y === 30 || y === H - 3)) continue;
    put(x, y, y === 30 ? INK : plate, FIXED);
  }
  const empty = blend(plate, WHITE, 0.22);
  if (g >= 0) for (let p = 0; p < 5; p++) {
    const x0 = 6 + p * 3;
    for (let y = 31; y <= 32; y++) for (let x = x0; x <= x0 + 1; x++) put(x, y, p <= g ? (y === 31 ? blend(tone, WHITE, 0.3) : tone) : empty, FIXED);
  } else for (let x = 8; x <= 17; x++) put(x, 31, empty, FIXED);
  // The set's symbol, bottom right: a small badge in the machine's colour.
  const mark = set ? SET_COLORS[set as keyof typeof SET_COLORS] : undefined;
  if (mark) for (let y = 36; y <= 38; y++) for (let x = 20; x <= 22; x++) put(x, y, x === 20 && y === 36 ? blend(rgb(mark), WHITE, 0.5) : x === 22 || y === 38 ? blend(rgb(mark), [0, 0, 0], 0.35) : rgb(mark), FIXED);
  const face: CardFace = { base, kind, noise, grade: g, negative: copies.some(o => o.finish === 'negative'), seed: last ? last.print : 0, holo, variant: last ? last.print % 4 : 0, edition, origin };
  if (spec.look) {
    face.look = lookIndex(spec.look);
    const hues = auraCopy ? auraColors(auraCopy.item, auraCopy.finish, auraCopy.print) : [GRADES[Math.max(0, Math.min(g, GRADES.length - 1))].color];
    face.paint = { colors: paintColors(hues, auraCopy ? auraHue(auraCopy.item, auraCopy.finish, auraCopy.print) : hues[0]), contrast: spec.contrast ?? PAINT_CONTRAST };
  }
  return face;
}

/** Whether a face changes over time at all: a plain card with no finishes is one picture. */
export const faceMoves = (f: CardFace) => f.edition > 0 || f.kind.some((v, i) => i % 4 === 1 && v > 0);

const PRISM = SHADER_FINISHES.indexOf('prism');
/** Whether a face cell is on the card's bevel (`raised` in CARD_FRAGMENT). */
function faceRaised(x: number, y: number) {
  const ex = Math.min(x, FACE_WIDTH - 1 - x), ey = Math.min(y, FACE_HEIGHT - 1 - y);
  return ex === 1 || ey === 1 || ex + ey === 3 ? 1 : 0;
}

/** The pointer's light on a card (a page's hover): where it is, 0 to 1 across and down, and how strong. */
export interface Hover { x: number; y: number; strength: number }

/** A face's edition worked out per pixel once (`editionField`), kept with the face. */
const fields = new WeakMap<CardFace, { at: Int32Array; field: (time: number, out: Float32Array) => void; out: Float32Array }>();
function faceField(f: CardFace) {
  let got = fields.get(f);
  if (got) return got;
  const W = FACE_WIDTH, H = FACE_HEIGHT, at = new Int32Array(W * H).fill(-1), cells: number[] = [];
  for (let i = 0; i < W * H; i++) {
    if (f.base[i * 4 + 3] < 128 || Math.floor(f.kind[i * 4] / 32 + 0.5) > WINDOW) continue;
    at[i] = cells.length; cells.push(i);
  }
  const n = cells.length, x = new Float32Array(n), y = new Float32Array(n), region = new Uint8Array(n), h = new Float32Array(n), rgb = new Float32Array(n * 3);
  cells.forEach((i, k) => {
    x[k] = i % W; y[k] = Math.floor(i / W); region[k] = Math.floor(f.kind[i * 4] / 32 + 0.5); h[k] = f.noise[i * 4] / 255;
    for (let j = 0; j < 3; j++) rgb[k * 3 + j] = f.base[i * 4 + j] / 255;
  });
  // The bevel stands proud, for the sheen: the ring one cell inside the outline.
  const raised = Float32Array.from(x, (cx, k) => faceRaised(cx, y[k]));
  const pixels = { x, y, region, h, rgb, raised };
  got = { at, field: f.look ? cardField(f.look, f.edition, f.variant, f.origin, 1, pixels, f.paint) : editionField(f.edition, f.variant, f.origin, 1, pixels), out: new Float32Array(n * 3) };
  fields.set(f, got);
  return got;
}

/** The face `ms` into its loop, in plain code: RGBA bytes, the same the GPU draws. */
export function cardFaceAt(f: CardFace, ms: number, hover?: Hover): Uint8ClampedArray {
  const W = FACE_WIDTH, H = FACE_HEIGHT, out = new Uint8ClampedArray(W * H * 4);
  const time = loopSeconds(ms), { at, field, out: ed } = faceField(f);
  field(time, ed);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (f.base[i + 3] < 128) continue;
    let c: Vec3;
    const e = at[i >> 2];
    if (e >= 0) c = [ed[e * 3], ed[e * 3 + 1], ed[e * 3 + 2]];
    else {
      c = [f.base[i] / 255, f.base[i + 1] / 255, f.base[i + 2] / 255];
      const k = Math.floor(f.kind[i] / 32 + 0.5), finish = Math.floor(f.kind[i + 1] / 32 + 0.5) - 1;
      if (k === ITEM && finish === PRISM && f.look === 2) c = polyColor(c, [x, y], f.origin, time, Math.min(1, Math.max(0, 1 - f.kind[i + 2] / 255 * 1.4)));
      else if (k === ITEM && finish >= 0) c = finishColor(c, finish, f.kind[i + 2] / 255, f.noise[i] / 255, x + y, y, f.kind[i + 3] * 4, time, 1);
    }
    if (hover && hover.strength > 0) {
      const light = (1 - smoothstep(0, 0.34, distance([(x + 0.5) / W, (y + 0.5) / H], [hover.x, hover.y]))) * 0.35 * hover.strength;
      c = [c[0] + light, c[1] + light, c[2] + light];
    }
    out[i] = toByte(c[0]); out[i + 1] = toByte(c[1]); out[i + 2] = toByte(c[2]); out[i + 3] = 255;
  }
  return out;
}

/** The face's shader, for a page or a game with WebGL: textures `base`, `kind`, `noise` from `cardFace`. */
export const CARD_FRAGMENT = `${GLSL_PRECISION}
varying vec2 uv;
uniform sampler2D base, kind, noise;
uniform float time, hover, edition, variant, look, contrast;
uniform vec2 light, origin;
uniform vec3 paint1, paint2, paint3;
${GLSL_COMMON}
${GLSL_EDITIONS}
${GLSL_LOOKS}
void main() {
  vec2 res = vec2(${FACE_WIDTH}.0, ${FACE_HEIGHT}.0);
  vec2 cell = floor(uv * res);
  vec2 at = (cell + 0.5) / res;
  vec4 b = texture2D(base, at);
  if (b.a < 0.5) { gl_FragColor = vec4(0.0); return; }
  vec3 c = b.rgb;
  vec4 kd = texture2D(kind, at);
  float k = floor(kd.r * 255.0 / 32.0 + 0.5);
  float finish = floor(kd.g * 255.0 / 32.0 + 0.5) - 1.0;
  float print = floor(kd.a * 255.0 + 0.5) * 4.0;
  float h = texture2D(noise, at).r;
  if (k > 3.5 && k < 4.5 && finish > 3.5 && finish < 4.5 && look > 1.5 && look < 2.5) c = polyColor(c, cell, origin, time * TAU / 6.0, clamp(1.0 - kd.b * 1.4, 0.0, 1.0));
  else if (k > 3.5 && k < 4.5 && finish >= 0.0) c = finishColor(c, finish, kd.b, h, cell.x + cell.y, cell.y, print, time, 1.0);
  else if (k < 2.5 && look > 0.5) {
    vec2 e = min(cell, res - 1.0 - cell);
    float raised = e.x == 1.0 || e.y == 1.0 || e.x + e.y == 3.0 ? 1.0 : 0.0;
    c = lookColor(c, look, edition, variant, cell, origin, k, raised, h, 1.0, time, paint1, paint2, paint3, contrast);
  }
  else if (k < 2.5) c = editionColor(c, edition, variant, cell, origin, k, h, 1.0, time);
  c += (1.0 - smoothstep(0.0, 0.34, distance(at, light))) * 0.35 * hover;
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

export interface CardShader {
  /** The 26×42 canvas the shader draws into; copy it out with drawImage. */
  canvas: HTMLCanvasElement | OffscreenCanvas;
  /** Draws a face `ms` into its loop, with a hover light if given. */
  draw(face: CardFace, ms: number, hover?: Hover): void;
}

const VERTEX = 'attribute vec2 p; varying vec2 uv; void main(){ uv = p * 0.5 + 0.5; uv.y = 1.0 - uv.y; gl_Position = vec4(p, 0.0, 1.0); }';

/** One card shader to share across a page or a game, or null without WebGL. */
export function createCardShader(canvas?: HTMLCanvasElement | OffscreenCanvas): CardShader | null {
  const target = canvas ?? (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(FACE_WIDTH, FACE_HEIGHT)
    : typeof document !== 'undefined' ? document.createElement('canvas') : null);
  if (!target) return null;
  target.width = FACE_WIDTH; target.height = FACE_HEIGHT;
  const gl = target.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true }) as WebGLRenderingContext | null;
  if (!gl) return null;
  const shader = (type: number, source: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, source); gl.compileShader(s); return s; };
  const program = gl.createProgram()!;
  gl.attachShader(program, shader(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, CARD_FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const p = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(p);
  gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
  const u = Object.fromEntries(['base', 'kind', 'noise', 'time', 'hover', 'edition', 'variant', 'light', 'origin', 'look', 'contrast', 'paint1', 'paint2', 'paint3'].map(n => [n, gl.getUniformLocation(program, n)]));
  gl.uniform1i(u.base, 0); gl.uniform1i(u.kind, 1); gl.uniform1i(u.noise, 2);
  gl.viewport(0, 0, FACE_WIDTH, FACE_HEIGHT);
  const textures = [0, 1, 2].map(unit => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.NEAREST);
    for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE);
    return t;
  });
  return {
    canvas: target,
    draw(face, ms, hover) {
      [face.base, face.kind, face.noise].forEach((bytes, unit) => {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, textures[unit]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, FACE_WIDTH, FACE_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
      });
      gl.uniform1f(u.time, loopSeconds(ms)); gl.uniform1f(u.edition, face.edition);
      gl.uniform1f(u.variant, face.variant); gl.uniform2f(u.origin, face.origin[0], face.origin[1]);
      gl.uniform1f(u.hover, hover?.strength ?? 0); gl.uniform2f(u.light, hover?.x ?? 0.5, hover?.y ?? 0.3);
      gl.uniform1f(u.look, face.look ?? 0); gl.uniform1f(u.contrast, face.paint?.contrast ?? PAINT_CONTRAST);
      const paint = face.paint?.colors;
      [u.paint1, u.paint2, u.paint3].forEach((at, k) => gl.uniform3f(at, paint?.[k][0] ?? 0, paint?.[k][1] ?? 0, paint?.[k][2] ?? 0));
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };
}
