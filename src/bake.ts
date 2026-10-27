import { animate, AURA_PAD, FRAME_HEIGHT, FRAME_WIDTH, type AnimateOptions, type AnimationFrame, type Move, MOVES } from './animate';
import { cardFace, cardFaceAt, faceMoves, FACE_HEIGHT, FACE_WIDTH, type FaceSpec } from './card-face';
import { LOOP_MS } from './finish-shader';
import { encodeApng, encodePng, type Frames } from './gif';
import { decode, type Owned } from './owned';
import { dress } from './items';
import { paletteOf } from './palette';
import { resolve } from './resolve';
import { shineFrame, shines } from './shine';
import type { AvatarConfig } from './types';
import { ART_VERSION, guyCode, PART_KEYS, type CardSpec, type GuySpec } from './guy-code';
import { defineLilGuy, type LilGuyOptions } from './element';

export { ART_VERSION, guyCode, type CardSpec, type GuySpec };

/**
 * A guy or his card, finished: every frame as a page with WebGL draws it,
 * auras, effects, emotes and his copies' finishes included, ready to save as
 * an image or play anywhere. The lil guys Worker serves these (`/g/`), the
 * `<lil-guy>` element plays them, and the lil guys site shows them, all from
 * this one function, so a guy is the same wherever he turns up.
 */

/** A baked guy is his frame with room for a rare aura's rings either side: the same size for every guy. */
export const GUY_WIDTH = FRAME_WIDTH + AURA_PAD * 2;
export const GUY_HEIGHT = FRAME_HEIGHT;

/** Longest a baked frame shows while something shimmers, so a finish moves smoothly. */
const STEP_MS = 80;

/** A spec as `animate` takes it: what `<lil-guy>`, the Worker and the site all draw from. */
export function animateOptions(spec: GuySpec): AnimateOptions {
  const config = { ...resolve(spec.seed, spec.parts), ...(spec.palette !== undefined ? { palette: spec.palette } : {}) };
  return { parts: spec.parts, palette: spec.palette !== undefined ? paletteOf(config) : undefined, equip: spec.equip };
}

/** The guy as worn, for the finishes: what `animate` dresses him in. */
function ownedOf(spec: GuySpec): AvatarConfig['owned'] {
  return dress(resolve(spec.seed, spec.parts), { equip: spec.equip }, spec.seed).owned;
}

const rgb = (s: string) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];

/** A frame on the padded canvas: the guy's pixels (shone, if given) and the aura cells past his sides. */
function place(frame: AnimationFrame, shone?: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(GUY_WIDTH * GUY_HEIGHT * 4);
  for (let y = 0; y < FRAME_HEIGHT; y++) for (let x = 0; x < FRAME_WIDTH; x++) {
    const o = (y * GUY_WIDTH + x + AURA_PAD) * 4;
    if (shone) { const i = (y * FRAME_WIDTH + x) * 4; if (shone[i + 3]) out.set(shone.subarray(i, i + 4), o); continue; }
    const c = frame.colors[y][x];
    if (c) out.set([...rgb(c), 255], o);
  }
  for (const [x, y, c] of frame.outside ?? []) out.set([...rgb(c), 255], (y * GUY_WIDTH + x + AURA_PAD) * 4);
  return out;
}

const same = (a: Uint8ClampedArray, b: Uint8ClampedArray) => a.length === b.length && a.every((v, i) => v === b[i]);

/** Consecutive identical frames as one, shown for their time together. */
function merged(width: number, height: number, frames: Uint8ClampedArray[], delays: number[]): Frames {
  const out: Frames = { width, height, frames: [], delays: [] };
  frames.forEach((f, i) => {
    const last = out.frames.length - 1;
    if (last >= 0 && same(out.frames[last], f)) out.delays[last] += delays[i];
    else { out.frames.push(f); out.delays.push(delays[i]); }
  });
  return out;
}

/**
 * How many times to play a move so his finishes also come round: finishes
 * repeat every LOOP_MS, so the move is played the number of times that gets
 * closest to whole turns of them, and they run that little faster or slower to
 * close exactly. Returns the repeats and the finishes' speed.
 */
export function shineFit(duration: number): { repeats: number; speed: number } {
  let best = { repeats: 1, speed: LOOP_MS / duration };
  for (let turns = 1; turns <= 3; turns++) {
    const repeats = Math.max(1, Math.round(turns * LOOP_MS / duration));
    if (repeats * duration > LOOP_MS * 2) continue;
    const speed = turns * LOOP_MS / (repeats * duration);
    if (Math.abs(Math.log(speed)) < Math.abs(Math.log(best.speed))) best = { repeats, speed };
  }
  return best;
}

/** A guy playing a move, every frame finished. */
export function bakeGuy(spec: GuySpec, move: Move = 'idle'): Frames {
  const anim = animate(spec.seed, move, animateOptions(spec));
  const owned = ownedOf(spec);
  if (!anim.frames.some(f => shines(f, owned))) {
    return merged(GUY_WIDTH, GUY_HEIGHT, anim.frames.map(f => place(f)), anim.frames.map(f => f.ms));
  }
  const { repeats, speed } = shineFit(anim.duration);
  const frames: Uint8ClampedArray[] = [], delays: number[] = [];
  let t = 0;
  for (let r = 0; r < repeats; r++) for (const f of anim.frames) {
    const steps = Math.max(1, Math.ceil(f.ms / STEP_MS));
    for (let s = 0; s < steps; s++) {
      const ms = Math.round(f.ms * (s + 1) / steps) - Math.round(f.ms * s / steps);
      frames.push(place(f, shineFrame(f, owned, t * speed)));
      delays.push(ms);
      t += ms;
    }
  }
  return merged(GUY_WIDTH, GUY_HEIGHT, frames, delays);
}

/** The guy's card face over one turn of its shimmer (a single frame if it doesn't shimmer). */
export function bakeCard(spec: FaceSpec): Frames {
  const face = cardFace(spec);
  if (!faceMoves(face)) return { width: FACE_WIDTH, height: FACE_HEIGHT, frames: [cardFaceAt(face, 0)], delays: [LOOP_MS] };
  const frames: Uint8ClampedArray[] = [], delays: number[] = [];
  for (let t = 0; t < LOOP_MS; t += STEP_MS) { frames.push(cardFaceAt(face, t)); delays.push(STEP_MS); }
  return merged(FACE_WIDTH, FACE_HEIGHT, frames, delays);
}

/** The frames side by side in one strip, with how long each shows: a sprite sheet for a game. */
export function sheetOf(f: Frames): { width: number; height: number; rgba: Uint8ClampedArray; delays: number[] } {
  const W = f.width * f.frames.length, rgba = new Uint8ClampedArray(W * f.height * 4);
  f.frames.forEach((px, k) => {
    for (let y = 0; y < f.height; y++) rgba.set(px.subarray(y * f.width * 4, (y + 1) * f.width * 4), (y * W + k * f.width) * 4);
  });
  return { width: W, height: f.height, rgba, delays: f.delays };
}

/** The image a baked guy or card is served as. */
export type BakedKind = 'loop' | 'still' | 'sheet';

/** Bakes and encodes: an animated PNG (`loop`), its first frame (`still`), or a sprite strip (`sheet`). */
export async function bakedImage(frames: Frames, kind: BakedKind, scale = 1): Promise<Uint8Array> {
  if (kind === 'still') return encodePng(frames.frames[0], frames.width, frames.height, scale);
  if (kind === 'sheet') { const s = sheetOf(frames); return encodePng(s.rgba, s.width, s.height, scale); }
  return encodeApng(frames, scale);
}

// ------------------------------------------------ the guy in an address

/** A code back into a spec, or null for anything that isn't one. */
export function readGuyCode(code: string): CardSpec | null {
  if (typeof code !== 'string' || code.length > 2000 || !/^[\w-]+$/.test(code)) return null;
  try {
    const bin = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
    const o = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, ch => ch.charCodeAt(0))));
    if (!o || typeof o.s !== 'string' || !o.s || o.s.length > 200) return null;
    const spec: CardSpec = { seed: o.s };
    if (typeof o.p === 'string') {
      const values = o.p.split('.');
      if (values.length !== PART_KEYS.length) return null;
      const parts: Record<string, number | boolean> = {};
      PART_KEYS.forEach((k, i) => {
        const v = values[i];
        if (v === '') return;
        parts[k] = v === 't' ? true : v === 'f' ? false : Number(v);
      });
      if (Object.values(parts).some(v => typeof v === 'number' && !(Number.isInteger(v) && v >= 0 && v < 1000))) return null;
      spec.parts = parts as GuySpec['parts'];
    }
    if (o.c !== undefined) { if (!Number.isInteger(o.c) || o.c < 0 || o.c > 999) return null; spec.palette = o.c; }
    if (o.e !== undefined) {
      if (!Array.isArray(o.e) || o.e.length > 8 || o.e.some((e: unknown) => typeof e !== 'string' || !decode(e as string))) return null;
      spec.equip = o.e;
    }
    if (o.g !== undefined) { if (!Number.isInteger(o.g) || o.g < -1 || o.g > 9) return null; spec.grade = o.g; }
    if (o.t !== undefined) { if (typeof o.t !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(o.t)) return null; spec.tint = o.t; }
    return spec;
  } catch { return null; }
}

/** A card spec as the face builder takes it. */
export function faceSpec(spec: CardSpec): FaceSpec {
  return { name: spec.seed, parts: spec.parts, palette: spec.palette, copies: (spec.equip ?? []).map(decode).filter((o): o is Owned => !!o), grade: spec.grade, tint: spec.tint };
}

/** Whether a move name is one this library plays. */
export const isMove = (m: string): m is Move => (MOVES as readonly string[]).includes(m);

/**
 * A view as the Worker serves it and `<lil-guy>` plays it: a move looping
 * (`idle`, `hop`…), `still` (his first idle frame), `card` or `card-still`.
 * Null for a view there isn't.
 */
export function bakeView(spec: CardSpec, view: string): Frames | null {
  if (view === 'card' || view === 'card-still') {
    const card = bakeCard(faceSpec(spec));
    return view === 'card' ? card : { ...card, frames: card.frames.slice(0, 1), delays: [LOOP_MS] };
  }
  if (view === 'still') { const g = bakeGuy(spec, 'idle'); return { ...g, frames: g.frames.slice(0, 1), delays: [LOOP_MS] }; }
  return isMove(view) ? bakeGuy(spec, view) : null;
}

/** `<lil-guy>` with the library on the page: baked in the page, or from a host if given. */
export function defineLilGuyHere(options: Omit<LilGuyOptions, 'bake'> = {}): void {
  defineLilGuy({ ...options, bake: (guy, view) => { const spec = typeof guy === 'string' ? readGuyCode(guy) : guy; return spec ? bakeView(spec, view) : null; } });
}
