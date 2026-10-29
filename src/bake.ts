import { emoteFrames } from './emotes';
import { animate, backdropOf, AURA_PAD, HEADROOM, FRAME_HEIGHT, FRAME_WIDTH, WIDE_FRAME_WIDTH, type AnimateOptions, type AnimationFrame, type Move, MOVES } from './animate';
import { cardFace, cardFaceAt, faceMoves, FACE_HEIGHT, FACE_WIDTH, type FaceSpec } from './card-face';
import { cardArtFrames, cardFrames, cardPlayer, type CardInput } from './card';
import { LOOP_MS } from './finish-shader';
import { fitLoop } from './loop';
import { encodeApng, encodeGif, encodePng, fewerColours, type Frames } from './gif';
import { decode, type Owned } from './owned';
import { dress, itemById, withItems } from './items';
import { LAYER } from './parts/art';
import { paint } from './paint';
import { paletteOf } from './palette';
import { resolve } from './resolve';
import { guyRank, traitOdds } from './rarity';
import { shineFrame, shines } from './shine';
import type { AvatarConfig } from './types';
import { ART_VERSION, BAKED_SIZE, guyCode, PART_KEYS, TITLE_MAX, type CardSpec, type GuySpec } from './guy-code';
import { defineLilGuy, type LilGuyOptions } from './element';
import { ogFrames } from './og';

export { ART_VERSION, guyCode, type CardSpec, type GuySpec };

/**
 * A guy or his card, finished: every frame as a page with WebGL draws it,
 * auras, effects, emotes and his copies' finishes included, ready to save as
 * an image or play anywhere. The lil guys Worker serves these (`/g/`), the
 * `<lil-guy>` element plays them, and the lil guys site shows them, all from
 * this one function, so a guy is the same wherever he turns up.
 */

/**
 * A baked guy is his frame with room for a rare aura's rings either side: the
 * same size for every guy without a buddy. A guy with a buddy is
 * `BUDDY_GUY_WIDTH` across, the buddy on the floor beside him and the two of
 * them centred, so every buddy picture is one size too.
 */
export const GUY_WIDTH = FRAME_WIDTH + AURA_PAD * 2;
export const BUDDY_GUY_WIDTH = WIDE_FRAME_WIDTH + AURA_PAD * 2;
export const GUY_HEIGHT = FRAME_HEIGHT;

/** Where a frame `width` wide starts on a baked picture `W` wide: centred, room for an aura's rings either side. */
const leftOf = (width: number, W: number) => AURA_PAD + Math.floor((W - AURA_PAD * 2 - width) / 2);

/** How long each frame of a card's shimmer shows. */
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

/** A frame on the padded canvas `W` wide, from column `left`: the guy's pixels (shone, if given) and the aura cells past his sides. */
function place(frame: AnimationFrame, W: number, left: number, shone?: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(W * GUY_HEIGHT * 4), fw = frame.colors[0].length;
  for (let y = 0; y < FRAME_HEIGHT; y++) for (let x = 0; x < fw; x++) {
    const o = (y * W + x + left) * 4;
    if (shone) { const i = (y * fw + x) * 4; if (shone[i + 3]) out.set(shone.subarray(i, i + 4), o); continue; }
    const c = frame.colors[y][x];
    if (c) out.set([...rgb(c), 255], o);
  }
  for (const [x, y, c] of frame.outside ?? []) if (x + left >= 0 && x + left < W) out.set([...rgb(c), 255], (y * W + x + left) * 4);
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

/** How many times to play a move so everything on its own clock comes round with it (./loop's `fitLoop`). */
export const shineFit = fitLoop;

/**
 * A guy playing a move, every frame finished, as a loop that closes perfectly:
 * a guy with nothing on its own clock is his move; one with an aura, an
 * effect, sparkles or a shimmering copy plays the move the whole number of
 * times that fits whole turns of LOOP_MS, everything on its own clock running
 * through without a jump.
 */
export function bakeGuy(spec: GuySpec, move: Move = 'idle'): Frames {
  return bakeAt(spec, move).frames;
}

/** `bakeGuy`, and the column his frame starts at on the picture. */
function bakeAt(spec: GuySpec, move: Move): { frames: Frames; left: number } {
  const raw = rawFrames(spec, move);
  return { frames: merged(raw.width, GUY_HEIGHT, raw.frames, raw.delays), left: raw.left };
}

/** Every frame `bakeGuy` bakes, before identical ones are merged, and the column his frame starts at. */
function rawFrames(spec: GuySpec, move: Move): { width: number; left: number; frames: Uint8ClampedArray[]; delays: number[] } {
  const options = animateOptions(spec), owned = ownedOf(spec);
  const plain = animate(spec.seed, move, options);
  const W = plain.width > FRAME_WIDTH ? BUDDY_GUY_WIDTH : GUY_WIDTH, left = leftOf(plain.width, W);
  // A backdrop he wears runs out to the picture's every edge, behind an aura's rings too.
  const ground = backdropOf(spec.seed, options, -left, 0, W, FRAME_HEIGHT);
  const lay = (f: AnimationFrame) => (ground ? { frame: grounded(f, ground, left), left: 0 } : { frame: f, left });
  const shining = plain.frames.some(f => shines(f, owned));
  if (!plain.timed && !shining) return { width: W, left, frames: plain.frames.map(f => { const l = lay(f); return place(l.frame, W, l.left); }), delays: plain.frames.map(f => f.ms) };
  const { repeats, turns } = shineFit(plain.duration);
  const anim = animate(spec.seed, move, { ...options, loop: { repeats, turns, fine: shining } });
  return { width: W, left, frames: anim.frames.map(f => { const l = lay(f); return place(l.frame, W, l.left, shining ? shineFrame(l.frame, owned, f.at ?? 0) : undefined); }), delays: anim.frames.map(f => f.ms) };
}

// ------------------------------------------------ icons and faces

/** An icon's side: his own sixteen by sixteen, nothing round him. */
export const ICON_SIZE = BAKED_SIZE.icon.width;
/** A face's side: his head and shoulders, hat and all. */
export const FACE_SIZE = BAKED_SIZE.face.width;

/** The spec without what he wears in the given slots (a backdrop, a buddy, an aura). */
function without(spec: GuySpec, slots: string[]): GuySpec {
  const equip = spec.equip?.filter(code => !slots.includes(itemById(decode(code)?.item)?.slot ?? ''));
  return { ...spec, equip: equip?.length ? equip : undefined };
}

/** The highest and lowest rows of his own sixteen columns with a pixel lit, in a frame of `animate`'s. */
function rowsLit(f: AnimationFrame): [number, number] {
  let top = FRAME_HEIGHT, bottom = -1;
  f.colors.forEach((row, y) => { for (let x = 0; x < FRAME_WIDTH; x++) if (row[x]) { if (y < top) top = y; bottom = y; } });
  return [top, bottom];
}

/**
 * A small square of the guy, for a menu, a chat line or a board's row: `icon` his whole sixteen by
 * sixteen, `face` a square of his head and shoulders, hat and all. Played as `bakeGuy` plays him,
 * blinking, breathing, his copies shining and his aura round him, but always on the ground: a move's
 * hops are taken out, so nothing he does leaves the square. No buddy and no backdrop: the square is
 * his alone, on nothing.
 */
export function bakeSquare(spec: GuySpec, view: 'icon' | 'face', move: Move = 'idle'): Frames {
  const bare = without(spec, ['frame', 'buddy']);
  const raw = rawFrames(bare, move);
  // How high he is off the ground in each frame, read off the same move with nothing round him:
  // its beats are the same, so the time into the lap finds the beat.
  const plain = animate(bare.seed, move, { ...animateOptions(without(bare, ['aura'])), rarity: false });
  const lit = plain.frames.map(rowsLit), ends: number[] = [];
  // Where his feet are when he stands: the lowest any frame of the move reaches.
  const ground = Math.max(...lit.map(([, bottom]) => bottom));
  plain.frames.reduce((t, f) => { ends.push(t + f.ms); return t + f.ms; }, 0);
  const liftAt = (t: number) => {
    const pos = t % plain.duration, k = ends.findIndex(e => pos < e);
    return Math.max(0, ground - lit[k < 0 ? 0 : k][1]);
  };
  const side = view === 'icon' ? ICON_SIZE : FACE_SIZE;
  // An icon is his grid; a face starts at the top of his head (or hat) as he stands.
  const rest = lit[0][0] + Math.max(0, ground - lit[0][1]);
  const top = view === 'icon' ? HEADROOM : Math.min(FRAME_HEIGHT - side, Math.max(0, rest));
  const left = raw.left + (FRAME_WIDTH - side) / 2, W = raw.width;
  let t = 0;
  const frames = raw.frames.map((px, k) => {
    const lift = liftAt(t);
    t += raw.delays[k];
    const out = new Uint8ClampedArray(side * side * 4);
    for (let y = 0; y < side; y++) {
      const from = top + y - lift;
      if (from >= 0 && from < FRAME_HEIGHT) out.set(px.subarray((from * W + left) * 4, (from * W + left + side) * 4), y * side * 4);
    }
    return out;
  });
  // In 255 colours at most, so a shining one packs as an indexed PNG as small as its GIF.
  return fewerColours(merged(side, side, frames, raw.delays));
}

// ------------------------------------------------ the big card

/**
 * How long each frame of a served big card shows: his move and the card's sheen at about six frames a
 * second, half the frames the lil guys site draws, and the picture in 255 colours (`fewerColours`), so
 * a big card is a few hundred kilobytes, not a megabyte, and bakes in a fraction of the time.
 */
export const CARD_FULL_MS = 160;

/**
 * A guy's big card with the words the lil guys site puts on it: his name (a code's `title`, `@name`
 * for a claimed one), how rare he was dealt and his rarest trait, at his rank's grade unless the code
 * gives one.
 */
export function cardInputOf(spec: CardSpec, move: Move = 'idle'): CardInput {
  const base = resolve(spec.seed), rank = guyRank(base);
  const rarest = traitOdds(base).sort((a, b) => a.chance - b.chance)[0]?.name ?? '';
  return {
    seed: spec.seed, parts: spec.parts, palette: animateOptions(spec).palette, copies: faceSpec(spec).copies,
    title: spec.title ?? '', lines: [rank.name, rank.label === rank.name ? rarest : rank.label], grade: spec.grade ?? rank.tier, move,
  };
}

/** A frame laid on the whole picture `ground` is painted for, from column `left`: his pixels, an aura's cells past his sides, and the backdrop everywhere else. */
function grounded(frame: AnimationFrame, ground: (string | null)[][], left: number): AnimationFrame {
  const W = ground[0].length, fw = frame.colors[0].length;
  const colors = ground.map(row => row.slice()), slots = ground.map(row => row.map(c => (c ? 3 : 0)));
  for (let y = 0; y < FRAME_HEIGHT; y++) for (let x = 0; x < fw; x++) {
    const c = frame.colors[y][x];
    if (c && frame.slots[y][x] !== 3) { colors[y][x + left] = c; slots[y][x + left] = frame.slots[y][x]; }
  }
  for (const [x, y, c] of frame.outside ?? []) if (x + left >= 0 && x + left < W) { colors[y][x + left] = c; slots[y][x + left] = 0; }
  return { ...frame, colors, slots, outside: undefined };
}

/** The size Discord shows a profile picture at, and asks for at least 128 of. */
export const PROFILE_SIZE = 512;

/**
 * A guy as a profile picture (Discord and the like): square, with room all round so the round crop
 * never cuts him, his buddy or his aura, centred on all of them, on a solid ground in a light tint
 * of his own colour, or on the backdrop he wears, run out to every edge. Every frame of the move.
 */
export function profileFrames(spec: GuySpec, move: Move = 'idle'): Frames {
  // A backdrop is the picture's ground, not a square behind him: he is framed without it.
  const backdrop = spec.equip?.find(code => itemById(decode(code)?.item)?.slot === 'frame');
  const baked = bakeAt(backdrop ? { ...spec, equip: spec.equip!.filter(code => code !== backdrop) } : spec, move), g = baked.frames, W = g.width, H = g.height;
  const lit = (px: Uint8ClampedArray, x: number, y: number) => px[(y * W + x) * 4 + 3] >= 128;
  let left = W, right = -1, top = H, bottom = -1;
  for (const px of g.frames) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!lit(px, x, y)) continue;
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  // The circle a crop leaves: centred on the lit pixels, out to the far corner of the farthest one.
  const cx = (left + right + 1) / 2, cy = (top + bottom + 1) / 2;
  let reach = 0;
  for (const px of g.frames) for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
    if (lit(px, x, y)) reach = Math.max(reach, Math.hypot(Math.max(Math.abs(x - cx), Math.abs(x + 1 - cx)), Math.max(Math.abs(y - cy), Math.abs(y + 1 - cy))));
  }
  const side = Math.ceil(reach * 2) + 2, ox = Math.round(side / 2 - cx), oy = Math.round(side / 2 - cy);
  const ground = backdrop ? backdropGround(spec, side, ox + baked.left, oy) : null, solid = groundOf(g.frames[0], W, H);
  const frames = g.frames.map(px => {
    const out = ground ? new Uint8ClampedArray(ground) : new Uint8ClampedArray(side * side * 4);
    if (!ground) for (let i = 0; i < side * side; i++) out.set(solid, i * 4);
    for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
      if (lit(px, x, y)) out.set(px.subarray((y * W + x) * 4, (y * W + x) * 4 + 4), ((y + oy) * side + x + ox) * 4);
    }
    return out;
  });
  return { width: side, height: side, frames, delays: g.delays };
}

/** The backdrop he wears, in its finish, over the whole picture and lined up with where it sits behind him. */
function backdropGround(spec: GuySpec, side: number, ox: number, oy: number): Uint8ClampedArray {
  const config = dress({ ...resolve(spec.seed, spec.parts), ...(spec.palette !== undefined ? { palette: spec.palette } : {}) }, { equip: spec.equip }, spec.seed);
  const frame = itemById(config.frame)!;
  const grid = Array.from({ length: side }, (_, y) => Array.from({ length: side }, (_, x) =>
    LAYER.frame + frame.fill!(x - ox + 48, y - oy - HEADROOM + 48) - 1));
  const colors = paint(grid, config, withItems(paletteOf(config), config), false, false);
  const out = new Uint8ClampedArray(side * side * 4);
  // Knocked back toward night, so he and his aura stand out from a busy pattern.
  colors.forEach((row, y) => row.forEach((c, x) => { if (c) out.set([...rgb(c).map((v, k) => Math.round(v * 0.55 + [20, 24, 36][k] * 0.45)), 255], (y * side + x) * 4); }));
  return out;
}

/** His commonest colour that isn't an outline, most of the way to white. */
function groundOf(px: Uint8ClampedArray, W: number, H: number): number[] {
  const counts = new Map<number, number>();
  for (let i = 0; i < W * H; i++) {
    const [r, g, b, a] = px.subarray(i * 4, i * 4 + 4);
    if (a < 128 || 0.2126 * r + 0.7152 * g + 0.0722 * b < 60) continue;
    const key = (r << 16) | (g << 8) | b;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const top = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0xdddddd;
  const c = [top >> 16, (top >> 8) & 255, top & 255];
  return [...c.map(v => Math.round(v + (255 - v) * 0.72)), 255];
}

/** The scale that brings a profile picture nearest `size` without going over. */
const profileScale = (f: Frames, size: number) => Math.max(1, Math.floor(size / f.width));

/** A still profile picture as a PNG, about `size` across. */
export function toProfilePng(spec: GuySpec, size = PROFILE_SIZE): Promise<Uint8Array> {
  const f = profileFrames(spec);
  return encodePng(f.frames[0], f.width, f.height, profileScale(f, size));
}

/** A moving profile picture as a GIF, about `size` across: Discord takes animated pictures only as GIFs. */
export function toProfileGif(spec: GuySpec, size = PROFILE_SIZE, move: Move = 'idle'): Uint8Array {
  const f = profileFrames(spec, move);
  return encodeGif(f, profileScale(f, size));
}

/** The guy's card face over one turn of its shimmer (a single frame if it doesn't shimmer). */
export function bakeCard(spec: FaceSpec): Frames {
  const face = cardFace(spec);
  if (!faceMoves(face)) return { width: FACE_WIDTH, height: FACE_HEIGHT, frames: [cardFaceAt(face, 0)], delays: [LOOP_MS] };
  const frames: Uint8ClampedArray[] = [], delays: number[] = [];
  for (let t = 0; t < LOOP_MS; t += STEP_MS) { frames.push(cardFaceAt(face, t)); delays.push(STEP_MS); }
  return merged(FACE_WIDTH, FACE_HEIGHT, frames, delays);
}

/**
 * The frames in a sprite sheet, with how long each shows: for a game. Left to right, `columns` to a
 * row (all of them in one strip by default), then the next row down.
 */
export function sheetOf(f: Frames, columns = f.frames.length): { width: number; height: number; rgba: Uint8ClampedArray; delays: number[]; columns: number; rows: number } {
  const cols = Math.max(1, Math.min(columns, f.frames.length)), rows = Math.ceil(f.frames.length / cols);
  const W = f.width * cols, rgba = new Uint8ClampedArray(W * f.height * rows * 4);
  f.frames.forEach((px, k) => {
    const ox = (k % cols) * f.width, oy = Math.floor(k / cols) * f.height;
    for (let y = 0; y < f.height; y++) rgba.set(px.subarray(y * f.width * 4, (y + 1) * f.width * 4), ((oy + y) * W + ox) * 4);
  });
  return { width: W, height: f.height * rows, rgba, delays: f.delays, columns: cols, rows };
}

/** How wide a sheet may be at 1×, in pixels, before it wraps onto another row. */
export const SHEET_MAX = 2048;

/**
 * How many frames to a row on a view's sheet: a move's frames all in one strip, as they always were;
 * any other view's as many as fit in `SHEET_MAX` pixels at 1×, then the next row.
 */
export function sheetColumns(view: string, f: Frames): number {
  return isMove(view) ? f.frames.length : Math.max(1, Math.min(f.frames.length, Math.floor(SHEET_MAX / f.width)));
}

/** The image a baked guy or card is served as. */
export type BakedKind = 'loop' | 'still' | 'sheet' | 'gif';

/**
 * Bakes and encodes: an animated PNG (`loop`), its first frame (`still`), a sprite sheet (`sheet`,
 * `columns` frames to a row, all in one strip by default) or a looping GIF (`gif`).
 */
export async function bakedImage(frames: Frames, kind: BakedKind, scale = 1, columns?: number): Promise<Uint8Array> {
  if (kind === 'still') return encodePng(frames.frames[0], frames.width, frames.height, scale);
  if (kind === 'sheet') { const s = sheetOf(frames, columns); return encodePng(s.rgba, s.width, s.height, scale); }
  if (kind === 'gif') return encodeGif(frames, scale);
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
    if (o.n !== undefined) { if (typeof o.n !== 'string' || !o.n || [...o.n].length > TITLE_MAX || /[\u0000-\u001f\u007f]/.test(o.n)) return null; spec.title = o.n; }
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
 * A view as the Worker serves it and `<lil-guy>` plays it: a move looping (`idle`, `hop`…),
 * `still` (his first idle frame), `icon` (his sixteen by sixteen alone, `bakeSquare`), `face` (a
 * square of his head and shoulders), `card` (the small card face), `pfp` (a profile picture,
 * `profileFrames`), `art` (his big card's window alone, a square: `cardArtPlayer`) and `card-full`
 * (the whole big card, `cardInputOf`). Every view but a move has a `-still`: its first frame.
 * Null for a view there isn't.
 */
export function bakeView(spec: CardSpec, view: string): Frames | null {
  if (view === 'icon' || view === 'face') return bakeSquare(spec, view);
  if (view === 'icon-still' || view === 'face-still') { const f = bakeSquare(spec, view === 'icon-still' ? 'icon' : 'face'); return { ...f, frames: f.frames.slice(0, 1), delays: [LOOP_MS] }; }
  if (view === 'card-full') { const f = cardFrames(cardInputOf(spec), CARD_FULL_MS); return fewerColours(merged(f.width, f.height, f.frames, f.delays)); }
  if (view === 'card-full-still') { const card = cardPlayer(cardInputOf(spec)); return { width: card.width, height: card.height, frames: [card.frame(0)], delays: [LOOP_MS] }; }
  if (view === 'art' || view === 'art-still') {
    const art = cardArtFrames({ seed: spec.seed, parts: spec.parts, palette: animateOptions(spec).palette, copies: faceSpec(spec).copies, grade: spec.grade, title: '' });
    return view === 'art' ? art : { ...art, frames: art.frames.slice(0, 1), delays: [LOOP_MS] };
  }
  if (view === 'card' || view === 'card-still') {
    const card = bakeCard(faceSpec(spec));
    return view === 'card' ? card : { ...card, frames: card.frames.slice(0, 1), delays: [LOOP_MS] };
  }
  if (view === 'og') return ogFrames(spec);
  if (view === 'pfp' || view === 'pfp-still') { const p = profileFrames(spec); return view === 'pfp' ? p : { ...p, frames: p.frames.slice(0, 1), delays: [LOOP_MS] }; }
  if (view === 'still') { const g = bakeGuy(spec, 'idle'); return { ...g, frames: g.frames.slice(0, 1), delays: [LOOP_MS] }; }
  // A chat emote (./emotes): `emote-<id>` moving, `emote-<id>-still` still.
  const emote = /^emote-([a-z]+?)(-still)?$/.exec(view);
  if (emote) return emoteFrames(spec, emote[1], !emote[2]);
  return isMove(view) ? bakeGuy(spec, view) : null;
}

/** `<lil-guy>` with the library on the page: baked in the page, or from a host if given. */
export function defineLilGuyHere(options: Omit<LilGuyOptions, 'bake'> = {}): void {
  defineLilGuy({ ...options, bake: (guy, view) => { const spec = typeof guy === 'string' ? readGuyCode(guy) : guy; return spec ? bakeView(spec, view) : null; } });
}
