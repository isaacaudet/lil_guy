import { cycle, fit, fitLoop, LOOP_MS, steps, tick, wave, wrap } from './loop';
import { resolve } from './resolve';
import { dress, itemById, withItems } from './items';
import { buddyOf, compose, composeBase, faceOf } from './compose';
import { mouths, eyes as EYES } from './parts';
import type { Face } from './parts/canvas';
import { paint } from './paint';
import { paletteOf } from './palette';
import { GRADES, gradeOf, type Owned } from './owned';
import { LAYER, LOCAL, T } from './parts/art';
import { hash } from './hash';
import { auraById, auraCells, auraColor } from './auras';
import { applyFx } from './effects';
import { sparkleAt, SPARKLE_REACH } from './sparkle';
import type { AvatarConfig, Palette, PixelGrid, RenderOptions } from './types';
import { GRID_SIZE } from './types';

/**
 * Animations for games: a guy that hops, waves, cheers, sulks.
 *
 * Every move is a short list of frames drawn on the same pixels as the still
 * avatar — the body squashes by losing a row and stretches by repeating one,
 * eyes close and glance by moving their own pixels — so nothing is ever
 * resampled or blurred. Frames are 16 wide and 20 tall: the guy stands in the
 * bottom 16 rows exactly as he does in the still, and the 4 rows above are
 * room to jump into.
 *
 * Rarity shows in the frames too, so it reads in any game without a shader:
 * from Special up a shine sweeps across the item, from Prized up a ring in the
 * grade's colour pulses around the guy, and Mythic and Grail copies throw off
 * sparkles.
 *
 * Each guy keeps his own time. His idle is dealt from his name like his parts
 * are: how many breaths he takes in a loop, where in it he starts, and his
 * habits (a blink or a double blink, a glance, a smile, an "ooh", a little
 * hop). The same guy always moves the same way, and two guys side by side are
 * never in step. A squash never cuts his face: rows are only lost or repeated
 * below his mouth or above his eyes, and a guy with no room there bobs instead.
 */

export const MOVES = ['idle', 'blink', 'hop', 'wave', 'look', 'cheer', 'sad', 'dance', 'squish', 'sleep'] as const;
export type Move = (typeof MOVES)[number];

/** Rows of room above the guy for jumps. */
export const HEADROOM = 4;
export const FRAME_WIDTH = GRID_SIZE;
export const FRAME_HEIGHT = GRID_SIZE + HEADROOM;

export interface AnimationFrame {
  /** FRAME_HEIGHT rows of FRAME_WIDTH colours; null is transparent. */
  colors: (string | null)[][];
  /**
   * Which worn item each pixel belongs to: 0 none, 1 skin, 2 hat, 3 frame,
   * 4 buddy (`FRAME_SLOTS`). A shader uses it to run each copy's finish on
   * that copy's own pixels (see ./shine).
   */
  slots: number[][];
  /** How long the frame shows. */
  ms: number;
  /** Where its own-clock things (auras, effects, finishes) are, in ms. */
  at?: number;
  /**
   * A rare aura's cells that fall past the frame's sides, as `[x, y, colour]`
   * with x from -AURA_PAD to FRAME_WIDTH + AURA_PAD - 1. Only there when there
   * are some; a picture with room round the guy (a card) draws them, anything
   * else can leave them out.
   */
  outside?: [number, number, string][];
}

/** How many columns past each side of the frame a rare aura may reach (`outside`). */
export const AURA_PAD = 3;

export interface Animation {
  move: Move;
  width: number;
  height: number;
  frames: AnimationFrame[];
  /** All the frames' times added up. */
  duration: number;
  /** Whether anything moves on its own clock (an aura, an effect, sparkles), not just with the move. */
  timed: boolean;
}

export interface AnimateOptions extends RenderOptions {
  /** Show the best equipped copy's grade: shine, aura, sparkles and a trail. Default true. */
  rarity?: boolean;
  /** An emote to show over the whole move, bobbing beside his head. */
  emote?: Emote;
  /**
   * Play the move `repeats` times with everything on its own clock (auras,
   * effects, sparkles) running through `turns` LOOP_MS in that time, so the
   * loop closes perfectly (see ./bake's `shineFit`). The clock is worked out
   * from whole milliseconds into the loop, so every lap reads the same times
   * to the last bit.
   * `fine` cuts frames to 80 ms for a finish to move in. A lap is played first
   * and left out, so what carries from frame to frame (a trail) is already
   * there at the start.
   */
  loop?: { repeats: number; turns: number; fine?: boolean };
}

/**
 * Poses: the guy as he is, with eyes shut or glancing, with an arm up or
 * down, and with a few expressions — a laugh for a win, a wobble for a loss,
 * an "ooh" when squished. His own eyes stay: they are who he is.
 */
type Pose = 'base' | 'shut' | 'left' | 'right' | 'wave' | 'sides' | 'laugh' | 'laughWave' | 'frown' | 'ooh' | 'smile' | 'content' | 'blep';

/** Little pictures that pop up beside his head. */
export type Emote = 'note' | 'question' | 'bang' | 'heart' | 'zzz' | 'crown' | 'fire';

/**
 * Emotes a player can show after a game, and how each is unlocked. The
 * moves use some on their own; `emote` in the options shows one over any move.
 */
export const EMOTE_UNLOCKS: { id: Emote; name: string; how: string }[] = [
  { id: 'heart', name: 'Heart', how: 'Everyone has it' },
  { id: 'note', name: 'Music', how: 'Everyone has it' },
  { id: 'zzz', name: 'Snooze', how: 'Everyone has it' },
  { id: 'question', name: 'Huh?', how: 'Everyone has it' },
  { id: 'bang', name: 'Whoa!', how: 'Everyone has it' },
  { id: 'fire', name: 'On fire', how: 'A 7-day streak' },
  { id: 'crown', name: 'Crown', how: 'A perfect day' },
];

/** One beat of a move: a pose, held for `ms`, moved and squashed. */
interface Beat {
  pose: Pose;
  ms: number;
  dx?: number;
  /** Negative is up. */
  dy?: number;
  /** Rows lost (positive) or gained (negative) in the middle of the body. */
  squash?: number;
  /** Mirror the guy for this beat, as if he turned round. */
  turn?: boolean;
  /** Little stars in the air. */
  stars?: boolean;
  /** A bead of sweat. */
  drop?: boolean;
  emote?: Emote;
  /** Which side the emote prefers. */
  left?: boolean;
  /** Lift the emote a row, so it floats. */
  rise?: boolean;
}

const b = (pose: Pose, ms: number, more: Omit<Beat, 'pose' | 'ms'> = {}): Beat => ({ pose, ms, ...more });

const HOP: Beat[] = [
  b('base', 90, { squash: 1 }),
  b('base', 70, { squash: -1, dy: -2 }),
  b('base', 130, { dy: -4 }),
  b('base', 70, { dy: -3 }),
  b('base', 60, { squash: -1, dy: -1 }),
  b('base', 100, { squash: 2 }),
  b('base', 80, { squash: 1 }),
];

/** What a guy's moves are dealt from: his own rolls, and what his face and arms can do. */
interface Guy {
  /** A number in [0, 1) for each `k`, the same for him every time. */
  roll: (k: number) => number;
  canWave: boolean;
  /** Whether his mouth may change for a moment (a smile, an "ooh"); a signature mouth stays. */
  mouthy: boolean;
}

/** A well-mixed number in [0, 1) from integers. */
function noise(...n: number[]): number {
  let h = 0x9e3779b9;
  for (const v of n) {
    h = Math.imul(h ^ v, 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return (h >>> 0) / 4294967296;
}

const rollsOf = (input: string) => { const h = hash(`${input}|rhythm`); return (k: number) => noise(h, k); };

/** Little things a guy does between breaths. Each guy has a few of them as his habits. */
const ACTS = {
  blink: [b('shut', 130)],
  double: [b('shut', 100), b('base', 110), b('shut', 110)],
  glanceLeft: [b('left', 520)],
  glanceRight: [b('right', 520)],
  around: [b('left', 320), b('base', 90), b('right', 320)],
  smile: [b('smile', 580)],
  content: [b('content', 640)],
  ooh: [b('ooh', 380)],
  blep: [b('blep', 460)],
  hop: [b('base', 80, { squash: 1 }), b('base', 90, { dy: -1 }), b('base', 130, { dy: -2 }), b('base', 90, { dy: -1 }), b('base', 80, { squash: 1 })],
} satisfies Record<string, Beat[]>;
type Act = keyof typeof ACTS;

const pick = <T,>(r: number, list: readonly T[]) => list[Math.min(list.length - 1, Math.floor(r * list.length))];
const actMs = (act: Act) => ACTS[act].reduce((n, x) => n + x.ms, 0);

/**
 * His idle, one LOOP_MS long, dealt from his name: three to five breaths (his
 * tempo), each a rest and a dip or, for a floater, a lift; his habits in some
 * of the rests; and the loop turned to start partway through a rest, so guys
 * dealt the same tempo still breathe at different moments. It always starts
 * on his still pose.
 */
function idleBeats(g: Guy): Beat[] {
  const r = g.roll;
  const breaths = pick(r(1), [3, 4, 4, 5]), floater = r(2) < 0.3;
  const habits: Act[] = [r(3) < 0.35 ? 'double' : 'blink'];
  if (r(4) < 0.7) habits.push(pick(r(5), ['glanceLeft', 'glanceRight', 'around'] as const));
  if (g.mouthy && r(6) < 0.75) habits.push(pick(r(7), ['smile', 'smile', 'content', 'content', 'ooh', 'blep'] as const));
  if (r(8) < 0.25) habits.push('hop');
  // Two or three of them a loop, the eyes always, each on a breath of its own.
  const count = Math.min(breaths, habits.length, 2 + (r(9) < 0.45 ? 1 : 0));
  const salt = Math.floor(r(10) * 1e9);
  const order = Array.from({ length: breaths }, (_, i) => i).sort((a, c) => noise(a, salt) - noise(c, salt));
  const doing = new Map<number, Act>(habits.slice(0, count).map((act, i) => [order[i], act]));
  const lap: Beat[] = [];
  for (let i = 0; i < breaths; i++) {
    const ms = Math.round((i + 1) * LOOP_MS / breaths) - Math.round(i * LOOP_MS / breaths);
    const dip = Math.round(ms * (0.3 + 0.1 * r(11 + i))), rest = ms - dip, act = doing.get(i);
    if (act && actMs(act) + 160 <= rest) {
      const lead = Math.round((rest - actMs(act)) * (0.3 + 0.4 * r(20 + i)));
      lap.push(b('base', lead), ...ACTS[act], b('base', rest - lead - actMs(act)));
    } else lap.push(b('base', rest));
    lap.push(b('base', dip, floater ? { dy: -1 } : { squash: 1 }));
  }
  // Start partway through one of his rests.
  const rests = lap.map((x, i) => [x, i] as const).filter(([x]) => x.pose === 'base' && !x.squash && !x.dy && x.ms >= 200);
  const [rest, at] = pick(r(30), rests);
  const cut = Math.round(rest.ms * (0.2 + 0.6 * r(31)));
  return [b('base', rest.ms - cut), ...lap.slice(at + 1), ...lap.slice(0, at), b('base', cut)];
}

const BEATS: Record<Move, (g: Guy) => Beat[]> = {
  idle: idleBeats,
  blink: ({ roll }) => {
    const wait = 1800 + Math.round(roll(40) * 1600);
    return roll(41) < 0.3 ? [b('base', wait), b('shut', 100), b('base', 110), b('shut', 120)] : [b('base', wait), b('shut', 140)];
  },
  hop: () => [...HOP, b('base', 700)],
  wave: ({ canWave }) => canWave
    ? [b('wave', 220), b('sides', 200), b('wave', 220), b('sides', 200), b('wave', 220, { emote: 'heart' }), b('base', 700, { emote: 'heart' })]
    : [b('base', 200, { dx: -1 }), b('base', 200), b('base', 200, { dx: 1 }), b('base', 200), b('base', 700)],
  look: ({ roll }) => {
    const [first, second]: Pose[] = roll(42) < 0.5 ? ['left', 'right'] : ['right', 'left'];
    return [b('base', 500), b(first, 700, { emote: 'question', left: first === 'left' }), b('base', 250), b(second, 700, { emote: 'question', left: second === 'left' }), b('base', 250), b('shut', 120), b('base', 400)];
  },
  cheer: ({ canWave }) => {
    const arm: Pose = canWave ? 'laughWave' : 'laugh';
    const up: Beat[] = [
      b('laugh', 80, { squash: 1 }),
      b(arm, 60, { squash: -1, dy: -2, stars: true }),
      b(arm, 150, { dy: -4, stars: true }),
      b(arm, 70, { dy: -3, stars: true }),
      b('laugh', 90, { squash: 2 }),
    ];
    return [...up, ...up, b(arm, 220, { stars: true }), b('laugh', 220), b('base', 400)];
  },
  sad: () => [
    b('frown', 900, { squash: 1, drop: true }), b('frown', 700, { squash: 2, drop: true }), b('frown', 900, { squash: 1, drop: true }), b('base', 500, { squash: 1 }),
  ],
  dance: ({ roll }) => {
    // His own tempo: a step of 150 to 210 ms.
    const ms = 150 + 10 * Math.floor(roll(43) * 7);
    return [
      b('laugh', ms, { dx: -1, squash: 1, emote: 'note', left: true }), b('base', ms, { emote: 'note', left: true }),
      b('laugh', ms, { dx: 1, squash: 1, turn: true, emote: 'note' }), b('base', ms, { turn: true, emote: 'note' }),
    ];
  },
  squish: () => [
    b('ooh', 90, { squash: 2, emote: 'bang' }), b('ooh', 80, { squash: -2, emote: 'bang' }), b('ooh', 80, { squash: 1, emote: 'bang' }), b('base', 70, { squash: -1 }), b('base', 700),
  ],
  sleep: ({ roll }) => {
    // Slow breaths, slower for some.
    const ms = 1000 + 50 * Math.floor(roll(44) * 6);
    return [b('shut', ms, { squash: 1, emote: 'zzz' }), b('shut', ms, { emote: 'zzz', rise: true }), b('shut', ms, { squash: 1, emote: 'zzz' }), b('shut', ms, { emote: 'zzz', rise: true })];
  },
};

// ---------------------------------------------------------------- the face

const EYE_TOKENS = new Set<number>([T.EYE, T.WHITE]);

/** The bare body, mirrored the same way as the finished guy. */
function bareOf(config: AvatarConfig): PixelGrid {
  const bare = composeBase(config);
  if (config.flip) for (const row of bare) row.reverse();
  return bare;
}

/** The colour low in an eye (shiny, sparkle, beans): part of the eye, so it shuts with it. */
const IRIS_TOKENS = new Set<number>([T.ACCENT, T.ACCENT_SHADE]);

/**
 * Eye pixels: eye ink and eye shine in the rows the eyes are drawn on, and
 * the colour in them within the eyes' own columns (a frame round them stays).
 */
function eyeCells(grid: PixelGrid, config: AvatarConfig): [number, number][] {
  const face = faceOf(config);
  const cols = new Set<number>();
  for (const e of face.eyes) for (let x = e.left; x <= e.right; x++) cols.add(config.flip ? GRID_SIZE - 1 - x : x);
  const out: [number, number][] = [];
  for (let y = Math.max(0, face.line - 3); y <= face.line; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const t = grid[y][x];
      if (EYE_TOKENS.has(t) || (y >= face.top && cols.has(x) && IRIS_TOKENS.has(t))) out.push([x, y]);
    }
  }
  return out;
}

/**
 * The same guy with his eyes shut: each eye drops to a line on its bottom row
 * and the cells it leaves show whatever the body has there. Derived, not
 * drawn, so it works for every eye part.
 */
export function closeEyes(grid: PixelGrid, config: AvatarConfig): PixelGrid {
  const shut = grid.map(row => [...row]);
  const bare = bareOf(config);
  const lowest = new Map<number, number>();
  for (const [x, y] of eyeCells(grid, config)) lowest.set(x, Math.max(lowest.get(x) ?? -1, y));
  for (const [x, y] of eyeCells(grid, config)) shut[y][x] = y === lowest.get(x) ? T.EYE : (bare[y][x] ?? 0);
  return shut;
}

/** The same guy glancing sideways: his eye pixels move one column, staying on his face. */
function glance(grid: PixelGrid, config: AvatarConfig, dx: number): PixelGrid {
  const out = grid.map(row => [...row]);
  const bare = bareOf(config);
  const cells = eyeCells(grid, config);
  for (const [x, y] of cells) out[y][x] = bare[y][x] ?? 0;
  for (const [x, y] of cells) {
    const nx = x + dx;
    if (nx >= 0 && nx < GRID_SIZE && bare[y][nx]) out[y][nx] = grid[y][x];
  }
  return out;
}

// ---------------------------------------------------------------- colour helpers

type RGB = [number, number, number];
const rgb = (h: string): RGB => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) as RGB;
const hex = (c: RGB) => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const mix = (a: string, b: string, t: number) => {
  const x = rgb(a), y = rgb(b);
  return hex([0, 1, 2].map(i => x[i] + (y[i] - x[i]) * t) as RGB);
};

// ---------------------------------------------------------------- frames

/** `body`: the guy's own skin, which a Lucky shimmer crosses. `eye`: the token of an eye pixel, for eyes that move. */
interface Cell { c: string; item: boolean; slot?: number; body?: boolean; eye?: number; face?: boolean }
type Layer = (Cell | null)[][];

/** The order of `AnimationFrame.slots`, from 1. */
export const FRAME_SLOTS = ['skin', 'hat', 'frame', 'buddy', 'aura'] as const;
const slotIndex = (t: number) => (t >= LAYER.aura ? 5 : t >= LAYER.buddy ? 4 : t >= LAYER.frame ? 3 : t >= LAYER.hat ? 2 : t >= LAYER.skin ? 1 : 0);

const empty = (): Layer => Array.from({ length: FRAME_HEIGHT }, () => new Array<Cell | null>(FRAME_WIDTH).fill(null));

/** Paints a pose and keeps track of which pixels belong to a worn item. */
function painted(grid: PixelGrid, config: AvatarConfig, palette: Palette, small = false, face: Face | null = null, mouth?: Set<number>): Layer {
  const colors = paint(grid, config, palette, small, false);
  const out = empty();
  const eyeBox = face && { top: face.top - 1, bottom: face.line, left: face.eyes[0].left - 1, right: face.eyes[face.eyes.length - 1].right + 1 };
  grid.forEach((row, y) => row.forEach((t, x) => {
    const c = colors[y][x];
    if (!c) return;
    const cell: Cell = { c, item: (t >= LAYER.skin && t < LAYER.frame) || t >= LAYER.buddy, slot: slotIndex(t) };
    if (t === T.BODY || t === T.SHADE || t === T.LIGHT) cell.body = true;
    if (mouth?.has(y * GRID_SIZE + x)) cell.face = true;
    if (eyeBox && y >= eyeBox.top && y <= eyeBox.bottom && x >= eyeBox.left && x <= eyeBox.right && LIVE_EYE_TOKENS.includes(t)) cell.eye = t;
    out[y + HEADROOM][x] = cell;
  }));
  return out;
}

const LIVE_EYE_TOKENS: number[] = [T.EYE, T.WHITE, T.ACCENT, T.ACCENT_SHADE, T.GOLD, T.GOLD_SHADE];
/** Chase eyes that move: one guy in hundreds has them, so they should look it. */
const LIVE_EYES = new Map(['galaxy', 'diamond', 'dragon'].map(n => [EYES.findIndex(e => e.name === n), n]));

const hue = (h: number, s: number, l: number) => {
  const k = (n: number) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
  return '#' + [f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join('');
};

/** A Lucky guy: a rainbow sheen sweeping across his skin every couple of seconds. */
function luckyShimmer(layer: Layer, t: number, seed: number): void {
  const at = cycle(t + seed, 2200) * (FRAME_WIDTH + FRAME_HEIGHT + 14) - 7;
  layer.forEach((row, y) => row.forEach((cell, x) => {
    if (!cell?.body) return;
    const d = Math.abs(x + y * 0.8 - at);
    if (d < 3) cell.c = mix(cell.c, hue(((t * 360 / fit(1800) + (x - y) * 22) % 360 + 360) % 360, 0.95, 0.68), d < 1.2 ? 0.6 : 0.3);
  }));
}

/** Galaxy eyes swirl, diamond eyes catch the light, dragon eyes smoulder. */
function liveEyes(layer: Layer, kind: string, t: number, seed: number): void {
  layer.forEach((row, y) => row.forEach((cell, x) => {
    if (!cell?.eye) return;
    const k = cell.eye;
    if (kind === 'galaxy') {
      if (k === T.WHITE) cell.c = wrap(t / steps(160, 5) + x * 3 + y * 2, 5) < 1.2 ? '#FFFFFF' : '#CBB8FF';
      else if (k !== T.EYE) cell.c = hue(255 + 45 * Math.sin(t / wave(380) + x * 0.9 + y * 0.7), 0.8, 0.55);
    } else if (kind === 'diamond') {
      const at = cycle(t + seed, 1400) * 24 - 4, d = Math.abs(x - y * 0.5 - at);
      if (k !== T.EYE) cell.c = mix(cell.c, '#E6FCFF', 0.25 + 0.2 * Math.sin(t / wave(250) + x));
      if (d < 1.5) cell.c = mix(cell.c, '#FFFFFF', d < 0.6 ? 0.9 : 0.5);
    } else if (kind === 'dragon') {
      const flash = cycle(t + seed, 2000) * fit(2000) < 160;
      if (k === T.GOLD || k === T.GOLD_SHADE) cell.c = flash ? '#FFF6B0' : mix(cell.c, '#FF4A1C', 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(t / wave(260))));
    }
  }));
}

/**
 * Loses `n` rows ending at row `r` (or, for a negative `n`, repeats row `r`);
 * everything above follows. `r` comes from `squashPlan`, so it is never a row
 * of his face.
 */
function squash(layer: Layer, s: Squash | null): Layer {
  if (!s) return layer;
  const { n, row: r } = s, rows = layer.map(row => [...row]);
  if (n > 0) {
    const blank = Array.from({ length: n }, () => new Array<Cell | null>(FRAME_WIDTH).fill(null));
    return [...blank, ...rows.slice(0, r - n + 1), ...rows.slice(r + 1)];
  }
  const k = -n;
  return [...rows.slice(k, r + 1), ...Array.from({ length: k }, () => [...rows[r]]), ...rows.slice(r + 1)];
}

/**
 * His buddy, standing where it stands in the still: on the floor, whatever
 * he does. In front of him (no room beside him; see `buddySpot`), it leaves
 * out any pixel next to his eyes or mouth in this frame.
 */
function standBuddy(layer: Layer, buddy: [number, number, Cell][], apart: boolean): void {
  const nearFace = (x: number, y: number) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (layer[y + dy]?.[x + dx]?.face) return true;
    return false;
  };
  const keep = buddy.filter(([x, y]) => apart || !nearFace(x, y));
  for (const [x, y, cell] of keep) layer[y][x] = { ...cell };
}

function shift(layer: Layer, dx: number, dy: number): Layer {
  const out = empty();
  layer.forEach((row, y) => row.forEach((cell, x) => {
    const nx = x + dx, ny = y + dy;
    if (cell && nx >= 0 && ny >= 0 && nx < FRAME_WIDTH && ny < FRAME_HEIGHT) out[ny][nx] = cell;
  }));
  return out;
}

const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Empty cells touching the guy. */
function rim(layer: Layer): [number, number][] {
  const out: [number, number][] = [];
  for (let y = 0; y < FRAME_HEIGHT; y++) for (let x = 0; x < FRAME_WIDTH; x++) {
    if (layer[y][x]) continue;
    if (NEIGHBOURS.some(([dx, dy]) => layer[y + dy]?.[x + dx])) out.push([x, y]);
  }
  return out;
}

/** A sparkle's three colours: its white heart, its bright arms, its deep edges. */
type Sparkle = [string, string, string];

/** The sparkle `f` of the way through its life at (x, y), only where there is nothing. */
function sparkle(layer: Layer, x: number, y: number, f: number, colors: Sparkle): void {
  for (const [dx, dy, k] of sparkleAt(f)) {
    const cx = x + dx, cy = y + dy;
    if (cx >= 0 && cy >= 0 && cx < FRAME_WIDTH && cy < FRAME_HEIGHT && !layer[cy][cx]) layer[cy][cx] = { c: colors[k], item: false };
  }
}

/**
 * Where sparkles may open: empty cells near the guy, with room all round for
 * the sparkle at its biggest, two or three cells off him and no lower than his
 * middle (`above` rows from his top at most, when given). None in the frame's
 * edge cells, so nothing sits stuck in a corner.
 */
function sparkleSpots(layer: Layer, above = Infinity): [number, number][] {
  let top = FRAME_HEIGHT, bottom = -1;
  layer.forEach((row, y) => { if (row.some(Boolean)) { top = Math.min(top, y); bottom = y; } });
  const out: [number, number][] = [];
  const near = (x: number, y: number, d: number) => {
    for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) if (layer[y + dy]?.[x + dx]) return true;
    return false;
  };
  for (let y = 1; y < FRAME_HEIGHT - 1; y++) for (let x = 1; x < FRAME_WIDTH - 1; x++) {
    if (y > Math.min((top + bottom) / 2, top + above)) continue;
    if (SPARKLE_REACH.some(([dx, dy]) => layer[y + dy][x + dx])) continue;
    if (!near(x, y, 1) && near(x, y, 3)) out.push([x, y]);
  }
  return out;
}

/**
 * One sparkle at a time from a run of them: every `period` ms (fitted to
 * LOOP_MS) one opens at a spot dealt from `salt`, lives `life` of the period
 * and is gone for the rest. `at` is the clock with this run's own phase.
 */
function sparkleRun(layer: Layer, spots: [number, number][], at: number, period: number, life: number, salt: number, colors: Sparkle): void {
  if (!spots.length) return;
  const f = cycle(at, period) / life;
  if (f >= 1) return;
  const [x, y] = spots[Math.floor(noise(tick(at, period), salt) * spots.length)];
  sparkle(layer, x, y, f, colors);
}

/** A sparkle in a colour: white at its heart, the colour lightened on its arms, the colour at its edges. */
const sparkleIn = (color: string): Sparkle => ['#FFFFFF', mix(color, '#FFFFFF', 0.45), color];
/** A Gold finish's sparkle. Kept off the Grail ring's two golds, so the ring alone says the grade. */
const GOLD_SPARKLE: Sparkle = ['#FFFFFF', '#FFF0B8', '#F5C342'];

const mouthIndex = (name: string) => Math.max(0, mouths.findIndex(m => m.name === name));

/** `#` is the emote's colour, `+` its second colour. */
const EMOTES: Record<Emote, { rows: string[]; color: string; accent?: string }> = {
  note: { rows: ['.##', '.#.', '##.', '##.'], color: '#FFE27A' },
  question: { rows: ['###', '..#', '.#.', '...', '.#.'], color: '#FFFFFF' },
  bang: { rows: ['#', '#', '#', '.', '#'], color: '#FF6B6B' },
  heart: { rows: ['##.##', '#####', '.###.', '..#..'], color: '#FF6FA0' },
  zzz: { rows: ['###', '..#', '.#.', '###'], color: '#BFD8FF' },
  crown: { rows: ['#.#.#', '#####', '#+#+#'], color: '#FFD447', accent: '#FF6B6B' },
  fire: { rows: ['.#.', '##.', '#+#', '#++', '.#.'], color: '#FF7A3D', accent: '#FFE27A' },
};

/** Puts an emote, outlined, in a top corner that is clear of him. */
function emote(layer: Layer, kind: Emote, left: boolean, lift = 0): void {
  const { rows, color, accent } = EMOTES[kind];
  const w = rows[0].length + 2, h = rows.length + 2;
  const spots: [number, number][] = [[FRAME_WIDTH - w, 0], [0, 0], [FRAME_WIDTH - w, 1], [0, 1], [FRAME_WIDTH - w, 2], [0, 2]]
    .map(([x, y]) => [x, Math.max(0, y + 1 - lift)] as [number, number]);
  if (left) spots.sort((a, b) => a[0] - b[0]);
  const ink = (ch: string | undefined) => ch === '#' || ch === '+';
  const at = ([x0, y0]: [number, number]) => {
    const cells: [number, number, string][] = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ch = rows[y - 1]?.[x - 1];
      const on = ink(ch);
      const near = !on && NEIGHBOURS.some(([dx, dy]) => ink(rows[y - 1 + dy]?.[x - 1 + dx]));
      if (on || near) cells.push([x0 + x, y0 + y, on ? (ch === '+' ? accent ?? color : color) : '#1B1428']);
    }
    return cells;
  };
  // A clear corner if there is one; on a guy too tall for that, it overlaps
  // his edge like a speech bubble rather than not showing at all.
  const clear = spots.map(at).find(cells => cells.every(([x, y]) => y < FRAME_HEIGHT && !layer[y][x]));
  for (const [x, y, c] of clear ?? at([spots[0][0], 0])) if (y < FRAME_HEIGHT) layer[y][x] = { c, item: false };
}

// ---------------------------------------------------------------- poses and squashes

/** Mouths a guy keeps whatever he is doing, because they are who he is. */
const SIGNATURE_MOUTHS = new Set(['beak', 'fang', 'gritted', 'bubblegum', 'vampire', 'gold tooth', 'grillz', 'mustache']);

/** The mouth a pose wears, when it isn't his own. */
function poseMouth(pose: Pose, own: number): number | undefined {
  if (pose === 'laugh' || pose === 'laughWave') return mouthIndex('laugh');
  if (pose === 'frown') return mouthIndex('wobble');
  if (pose === 'ooh') return mouthIndex('ooh');
  if (pose === 'blep') return mouthIndex('blep');
  if (pose === 'smile' || pose === 'content') return own === mouthIndex('smile') ? mouthIndex('grin') : mouthIndex('smile');
  return undefined;
}

const POSES: Pose[] = ['base', 'shut', 'left', 'right', 'wave', 'sides', 'laugh', 'laughWave', 'frown', 'ooh', 'smile', 'content', 'blep'];

/**
 * The guy as he is drawn into his poses: dressed, without the frame and aura
 * (drawn round him per frame) or a Gold finish's mark (a sparkle, drawn per
 * frame too). `grid` builds each pose once.
 */
function poser(input: string, options: AnimateOptions) {
  const config = dress(resolve(input, options.parts), options, input);
  const owned = config.owned && Object.fromEntries(Object.entries(config.owned).map(([slot, o]) => [slot, o?.finish === 'gold' ? { ...o, finish: 'plain' as const } : o]));
  // The frame, aura and buddy are drawn per frame round him, not into his poses.
  const figure: AvatarConfig = { ...config, frame: undefined, aura: undefined, buddy: undefined, owned };
  const grids = new Map<Pose, PixelGrid>();
  const grid = (pose: Pose): PixelGrid => {
    if (!grids.has(pose)) {
      const base = compose(figure), mouth = poseMouth(pose, config.mouth);
      const worn = mouth === undefined ? base : compose({ ...figure, mouth, arms: pose === 'laughWave' ? 2 : figure.arms });
      grids.set(pose,
        pose === 'shut' ? closeEyes(base, config)
        : pose === 'left' ? glance(base, config, -1)
        : pose === 'right' ? glance(base, config, 1)
        : pose === 'frown' || pose === 'content' ? closeEyes(worn, config)
        : pose === 'wave' || pose === 'sides' ? compose({ ...figure, arms: pose === 'wave' ? 2 : 1 })
        : worn);
    }
    return grids.get(pose)!;
  };
  return { config, figure, grid };
}

/** Tokens that make a face: eye ink and shine, the mouth and its tongue. */
const FACE_TOKENS = new Set<number>([T.EYE, T.WHITE, T.MOUTH, T.TONGUE]);

/**
 * Where a guy squashes: for `n` rows lost (or, negative, repeated), the frame
 * row the squash ends on, or null when he has no room for it. His face (from
 * the top of his eyes to the foot of any mouth he pulls, and any row with eye
 * or mouth pixels) is never touched. Rows go from his body between the mouth
 * and the feet, nearest four rows up from his foot; failing that from his head
 * above the eyes; failing that one row fewer, or none.
 */
function squashPlan(config: AvatarConfig, figure: AvatarConfig, grid: (pose: Pose) => PixelGrid) {
  const base = grid('base');
  let first = -1, last = -1;
  base.forEach((row, y) => { if (row.some(Boolean)) { if (first < 0) first = y; last = y; } });
  const face = new Set<number>();
  let top = GRID_SIZE, bottom = -1;
  for (const pose of POSES) {
    const f = faceOf({ ...figure, mouth: poseMouth(pose, config.mouth) ?? figure.mouth });
    top = Math.min(top, f.top); bottom = Math.max(bottom, f.line, f.mouthBottom);
    for (const [y, row] of grid(pose).entries()) if (row.some(t => FACE_TOKENS.has(t))) face.add(y);
  }
  for (let y = top; y <= bottom; y++) face.add(y);
  const free = (y: number) => y > first && y < last && !face.has(y);
  const plans = new Map<number, Squash | null>();
  const at = (n: number): Squash | null => {
    if (!n) return null;
    if (plans.has(n)) return plans.get(n)!;
    const k = Math.abs(n), fits = (r: number) => (n > 0 ? Array.from({ length: k }, (_, i) => r - i) : [r]).every(free);
    const below = Array.from({ length: Math.max(0, last - bottom) }, (_, i) => bottom + 1 + i).filter(fits).sort((p, q) => Math.abs(p - (last - 3)) - Math.abs(q - (last - 3)));
    const above = Array.from({ length: Math.max(0, top - first) }, (_, i) => top - 1 - i).filter(fits);
    const r = below[0] ?? above[0];
    const plan = r !== undefined ? { n, row: r + HEADROOM } : at(n - Math.sign(n));
    plans.set(n, plan);
    return plan;
  };
  return { at, face: [...face].sort((p, q) => p - q).map(y => y + HEADROOM) };
}

/** A squash as it is done: `n` rows lost (negative: repeated) ending on frame row `row`. */
interface Squash { n: number; row: number }

/**
 * What each squash in his moves does to the guy `input` would render as: the
 * frame rows it takes out (or, for a negative one, repeats), or null where he
 * has no room and bobs instead; and the rows of his face, which it never touches.
 */
export function squashRows(input: string, options: AnimateOptions = {}): { face: number[]; rows: Record<number, number[] | null> } {
  const { config, figure, grid } = poser(input, options);
  const plan = squashPlan(config, figure, grid), rows: Record<number, number[] | null> = {};
  for (const n of [-2, -1, 1, 2]) {
    const s = plan.at(n);
    rows[n] = !s ? null : s.n > 0 ? Array.from({ length: s.n }, (_, i) => s.row - i) : [s.row];
  }
  return { face: plan.face, rows };
}

/**
 * Builds the frames of a move for the guy `input` would render as. Takes the
 * same options as `toSvgString` (game, equip, parts, palette).
 */
export function animate(input: string, move: Move, options: AnimateOptions = {}): Animation {
  const { config, figure, grid } = poser(input, options);
  const palette = withItems(options.palette ?? paletteOf(config), config);
  // His buddy is drawn per frame beside him, not into his poses: it stays on the floor while he moves.
  const spot = itemById(config.buddy)?.slot === 'buddy' ? buddyOf({ ...config, frame: undefined, aura: undefined }) : undefined;
  const wornAura = auraById(itemById(config.aura)?.slot === 'aura' ? config.aura : undefined);
  // Effects move, so a guy wearing one gets short frames like an aura's.
  const fxCopies = FRAME_SLOTS.map(slot => config.owned?.[slot]);
  const withFx = fxCopies.some(o => o?.fx);
  // Lucky guys and chase eyes move too, unless a still is asked for.
  const lucky = !!config.lucky && options.rarity !== false && !options.small;
  const liveEye = options.small ? undefined : LIVE_EYES.get(config.eyes);
  // Some shapes and skins have nowhere to put an arm.
  const canWave = JSON.stringify(grid('wave')) !== JSON.stringify(grid('sides'));
  const plan = squashPlan(config, figure, grid);

  // His eyes and mouth in each pose, which the buddy in front of him keeps off:
  // the still's, and whatever a laugh or a glance moves onto new pixels.
  const FACE_TOKENS = new Set<number>([T.EYE, T.WHITE, T.MOUTH, T.TONGUE]);
  const faceIn = (pose: Pose) => {
    if (!spot) return undefined;
    const out = new Set(spot.face), g = grid(pose), base = grid('base');
    g.forEach((row, y) => row.forEach((t, x) => { if (FACE_TOKENS.has(t) && t !== base[y][x]) out.add(y * GRID_SIZE + x); }));
    return out;
  };
  const layers = new Map<Pose, Layer>();
  const layerOf = (pose: Pose) => {
    if (!layers.has(pose)) layers.set(pose, painted(grid(pose), config, palette, !!options.small, liveEye ? faceOf(figure) : null, faceIn(pose)));
    return layers.get(pose)!;
  };
  const buddyCells: [number, number, Cell][] = [];
  if (spot) {
    const only = Array.from({ length: GRID_SIZE }, () => new Array<number>(GRID_SIZE).fill(0));
    for (const [x, y, t] of spot.cells) only[y][x] = t >= LOCAL ? t - LOCAL + LAYER.buddy : t;
    painted(only, config, palette, !!options.small).forEach((row, y) => row.forEach((cell, x) => { if (cell) buddyCells.push([x, y, cell]); }));
  }

  // The frame behind him, painted where it sits in the still so it looks the same.
  let backdrop: (string | null)[][] | null = null;
  const frameItem = itemById(config.frame);
  if (frameItem?.slot === 'frame') {
    const tall = Array.from({ length: GRID_SIZE + HEADROOM * 2 }, (_, y) =>
      Array.from({ length: GRID_SIZE }, (_, x) => LAYER.frame + frameItem.fill!(x, y + 48) - 1));
    const colors = paint(tall, config, palette, false, false);
    backdrop = Array.from({ length: FRAME_HEIGHT }, (_, y) => colors[y < HEADROOM ? GRID_SIZE - HEADROOM + y : y - HEADROOM]);
  }

  // The best copy he is wearing sets how much shows. An aura is its own show,
  // so it doesn't count here.
  const copies = Object.entries(config.owned ?? {}).filter(([slot, o]) => o && slot !== 'aura').map(([, o]) => o);
  const grade = options.rarity === false || !copies.length ? -1 : Math.max(...copies.map(o => GRADES.findIndex(g => g.id === gradeOf(o!).id)));
  const gradeColor = grade >= 0 ? GRADES[grade].color : '#FFFFFF';
  const seed = hash(input) % 997;
  // A copy's own number sets its timing: the best copy's print phases its shine and sparkles.
  const best = copies.reduce<Owned | undefined>((a, o) => (!a || GRADES.findIndex(g => g.id === gradeOf(o!).id) > GRADES.findIndex(g => g.id === gradeOf(a).id) ? o : a), undefined);
  const phase = best ? best.print * 37 : seed;
  // A Gold finish's mark: one gold sparkle opening near him now and then, on its copy's own time.
  const goldCopy = options.small ? undefined : Object.values(config.owned ?? {}).find(o => o?.finish === 'gold');
  const goldMark = !!goldCopy && !wornAura && grade < 3;

  const roll = rollsOf(input);
  const mouthy = !SIGNATURE_MOUTHS.has(mouths[config.mouth]?.name ?? '') && JSON.stringify(grid('smile')) !== JSON.stringify(grid('base'));
  const beats = BEATS[move]({ roll, canWave, mouthy });
  const timed = !!(wornAura || withFx || lucky || liveEye || grade >= 1 || goldMark || options.emote);
  const spots = sparkleSpots(layerOf('base')), headSpots = sparkleSpots(layerOf('base'), 3);
  // With effects on, long beats are cut into slices so the shine can move.
  const loop = options.loop, laps = loop ? loop.repeats + 1 : 1;
  const lapMs = beats.reduce((n, b) => n + b.ms, 0), span = loop ? lapMs * loop.repeats : 0;
  // Whole milliseconds in, an exact remainder, one division: the same moment in any lap is the same number.
  const clock = (ms: number) => (loop ? ((ms * loop.turns * LOOP_MS) % (LOOP_MS * span)) / span : ms);
  const slices: { beat: Beat; ms: number; t: number; lap: number }[] = [];
  let t = 0;
  for (let lap = 0; lap < laps; lap++) for (const beat of beats) {
    let n = wornAura || withFx || lucky || liveEye || goldMark ? Math.max(1, Math.ceil(beat.ms / 100)) : grade >= 1 ? Math.max(1, Math.ceil(beat.ms / 150)) : 1;
    if (loop?.fine) n = Math.max(n, Math.ceil(beat.ms / 80));
    for (let i = 0; i < n; i++) {
      const ms = Math.round(beat.ms * (i + 1) / n) - Math.round(beat.ms * i / n);
      slices.push({ beat, ms, t: clock(t), lap });
      t += ms;
    }
  }

  // Mythic and Grail guys leave a trail when they leave the ground.
  const trailFrom = (grade >= 3 && !wornAura ? [mix(gradeColor, '#000000', 0.2), mix(gradeColor, '#000000', 0.55)] : []);
  const behind: Layer[] = [];

  const all = slices.map(({ beat, ms, t }) => {
    let layer = layerOf(beat.pose);
    if (beat.turn) layer = layer.map(row => [...row].reverse());
    const squashed = plan.at(beat.squash ?? 0);
    layer = squash(layer, squashed);
    // A guy with no room to squash bobs up a row instead.
    const bob = (beat.squash ?? 0) > 0 && !squashed && !beat.dy ? -1 : 0;
    layer = shift(layer, beat.dx ?? 0, (beat.dy ?? 0) + bob);
    if (buddyCells.length) { layer = layer.map(row => [...row]); standBuddy(layer, buddyCells, spot!.apart); }
    const figure = layer;
    layer = layer.map(row => row.map(cell => (cell ? { ...cell } : null)));
    if (trailFrom.length && (beat.dy ?? 0) < 0) {
      behind.forEach((past, k) => past.forEach((row, y) => row.forEach((cell, x) => {
        if (cell && !layer[y][x] && (x + y + k) % 2 === 0) layer[y][x] = { c: trailFrom[k], item: false };
      })));
    }
    behind.unshift(figure);
    behind.length = Math.min(behind.length, 2);

    if (grade >= 1) {
      // A shine sweeping diagonally across the item, once every 1.6 seconds.
      const at = cycle(t + phase, 1600) * (FRAME_WIDTH + FRAME_HEIGHT + 8) - 4;
      layer.forEach((row, y) => row.forEach((cell, x) => {
        if (!cell?.item) return;
        const d = Math.abs(x + y - at);
        if (d < 1) cell.c = mix(cell.c, '#FFFFFF', 0.65);
        else if (d < 2) cell.c = mix(cell.c, '#FFFFFF', 0.25);
      }));
    }

    if (lucky) luckyShimmer(layer, t, seed);
    if (liveEye) liveEyes(layer, liveEye, t, seed);
    // Sparkles, sparingly: a Lucky guy's one gold glint, a Gold finish's mark.
    if (lucky && !wornAura && grade < 3 && !goldMark) sparkleRun(layer, spots, t + seed * 7, 2300, 0.4, seed, GOLD_SPARKLE);
    if (goldMark) sparkleRun(layer, spots, t + goldCopy!.print * 37, 2600, 0.4, goldCopy!.print, GOLD_SPARKLE);

    const aura = grade >= 2 ? rim(layer) : [];
    if (beat.stars) {
      // A cheer's stars: two glints over his head, opening by turns.
      const gold = sparkleIn(palette.colors[T.GOLD] ?? '#F2C230');
      for (let i = 0; i < 2; i++) sparkleRun(layer, headSpots, t + i * fit(360) / 2 + seed, 360, 1, seed + i, gold);
    }
    if (beat.drop) {
      let top = -1;
      layer.forEach((row, y) => { if (top < 0 && row.some(Boolean)) top = y; });
      const row = layer[top + 2];
      const right = row ? row.reduce((r, cell, x) => (cell ? x : r), -1) : -1;
      for (const [x, y, c] of [[right + 1, top + 1, '#CFEFFF'], [right + 1, top + 2, '#7CC4F2']] as [number, number, string][]) {
        if (right >= 0 && x < FRAME_WIDTH && y >= 0 && !layer[y][x]) layer[y][x] = { c, item: false };
      }
    }
    if (beat.emote) emote(layer, beat.emote, !!beat.left, beat.rise ? 1 : 0);
    if (options.emote && !beat.emote) emote(layer, options.emote, false, Math.floor(wrap(t, fit(800)) / (fit(800) / 2)) % 2);
    const outside: [number, number, string][] = [];
    if (wornAura) {
      // The aura, round him as he stands in this frame, in its finish, which
      // shimmers on its print's own time as an effect does. A rare one's rings
      // run past the frame's sides; those cells ride along in `outside`.
      const copy = config.owned?.aura, mask = layer.map(row => row.map(Boolean));
      for (const [x, y, k] of auraCells(wornAura.id, mask, t, copy, AURA_PAD)) {
        const c = copy ? auraColor(wornAura.id, k, copy.finish, x, y, t + copy.print * 37, copy.print) : wornAura.colors[k];
        if (x < 0 || x >= FRAME_WIDTH) outside.push([x, y, c]);
        else layer[y][x] = { c, item: false, slot: 5 };
      }
    } else if (grade >= 2) {
      // A ring in the grade's colour, breathing in and out.
      const on = Math.floor(wrap(t + seed, fit(640)) / (fit(640) / 2)) % 2 === 0;
      const ring = grade === 4 ? (on ? '#FFE27A' : '#E4AE39') : on ? gradeColor : mix(gradeColor, '#000000', 0.35);
      for (const [x, y] of aura) if (!layer[y][x]) layer[y][x] = { c: ring, item: false };
    }
    if (grade >= 3 && !wornAura) {
      // Mythic copies throw off a sparkle at a time in their colour, Grails two, staggered.
      const colors = grade === 4 ? GOLD_SPARKLE : sparkleIn(gradeColor), count = grade === 4 ? 2 : 1;
      for (let i = 0; i < count; i++) sparkleRun(layer, spots, t + phase + i * fit(1700) / count, 1700, 0.5, phase + i, colors);
    }

    const flat = layer.map((row, y) => row.map((cell, x) => cell?.c ?? backdrop?.[y][x] ?? null));
    const slots = layer.map((row, y) => row.map((cell, x) => (cell ? cell.slot ?? 0 : backdrop?.[y][x] ? 3 : 0)));
    const colors = withFx ? applyFx(flat, slots, fxCopies, t) : flat;
    return outside.length ? { colors, ms, slots, outside, at: t } : { colors, ms, slots, at: t };
  });
  // In a loop the warm-up lap is left out.
  const frames = loop ? all.filter((_, i) => slices[i].lap > 0) : all;

  return { move, width: FRAME_WIDTH, height: FRAME_HEIGHT, frames, duration: frames.reduce((n, f) => n + f.ms, 0), timed };
}

/**
 * The move as a loop that closes perfectly: as it is when nothing moves on its
 * own clock, else played the whole number of times that fits whole turns of
 * LOOP_MS (`fitLoop`). What to hand `frameAt`, a player or an animated SVG.
 */
export function animateLoop(input: string, move: Move, options: AnimateOptions = {}): Animation {
  const plain = animate(input, move, options);
  if (!plain.timed) return plain;
  const { repeats, turns } = fitLoop(plain.duration);
  return animate(input, move, { ...options, loop: { repeats, turns } });
}

/** The frame showing `ms` into the animation, looping unless `once`. */
export function frameAt(animation: Animation, ms: number, once = false): AnimationFrame {
  const { frames, duration } = animation;
  let t = once ? Math.min(ms, duration - 1) : ((ms % duration) + duration) % duration;
  for (const frame of frames) {
    if (t < frame.ms) return frame;
    t -= frame.ms;
  }
  return frames[frames.length - 1];
}

/** Anything with a 2D canvas's fillStyle and fillRect: a canvas, an OffscreenCanvas, a test double. */
export interface PixelTarget {
  fillStyle: string | CanvasGradient | CanvasPattern;
  fillRect(x: number, y: number, w: number, h: number): void;
}

/** Draws a frame at (x, y), each pixel `scale` units square. */
export function drawFrame(ctx: PixelTarget, frame: AnimationFrame, x = 0, y = 0, scale = 1): void {
  frame.colors.forEach((row, py) => row.forEach((c, px) => {
    if (!c) return;
    ctx.fillStyle = c;
    ctx.fillRect(x + px * scale, y + py * scale, scale, scale);
  }));
}

function runs(row: (string | null)[]): { x: number; width: number; color: string }[] {
  const out: { x: number; width: number; color: string }[] = [];
  let start = 0, current: string | null = null;
  for (let x = 0; x <= row.length; x++) {
    const c = x < row.length ? row[x] : null;
    if (c === current) continue;
    if (current !== null) out.push({ x: start, width: x - start, color: current });
    current = c; start = x;
  }
  return out;
}

export interface AnimatedSvgOptions extends AnimateOptions {
  /** Width in pixels; the height is a quarter more. Default 128. */
  size?: number;
  /** Play once and hold the last frame. Default false: loop. */
  once?: boolean;
  /**
   * Hold still on the first frame when the viewer asks for reduced motion.
   * Off by default: the DLE Club games play motion whatever that setting says.
   */
  stillWhenReduced?: boolean;
}

/**
 * The animation as one self-contained SVG: every frame is a group, and a CSS
 * animation shows them in turn. Works as an <img>, inline, or as a file.
 */
export function toAnimatedSvg(input: string, move: Move, options: AnimatedSvgOptions = {}): string {
  const anim = animateLoop(input, move, options);
  const size = options.size ?? 128;
  const id = `lg${hash(`${input}|${move}|${JSON.stringify({ ...options, size: 0 })}`).toString(36)}`;
  const pct = (ms: number) => +(ms / anim.duration * 100).toFixed(3);

  let at = 0;
  const css: string[] = [`.${id} g{visibility:hidden;animation-duration:${anim.duration}ms;animation-timing-function:step-end;animation-iteration-count:${options.once ? 1 : 'infinite'};animation-fill-mode:${options.once ? 'forwards' : 'none'}}`];
  const groups = anim.frames.map((frame, i) => {
    const start = pct(at), end = pct(at + frame.ms);
    at += frame.ms;
    const last = i === anim.frames.length - 1;
    const keys = i === 0
      ? `0%{visibility:visible}${end}%{visibility:hidden}${last ? '' : '100%{visibility:hidden}'}`
      : `0%{visibility:hidden}${start}%{visibility:visible}${last ? '100%{visibility:visible}' : `${end}%{visibility:hidden}100%{visibility:hidden}`}`;
    css.push(`.${id} .f${i}{animation-name:${id}-${i}}@keyframes ${id}-${i}{${keys}}`);
    const rects = frame.colors.flatMap((row, y) => runs(row).map(r => `<rect x="${r.x}" y="${y}" width="${r.width}" height="1" fill="${r.color}"/>`));
    return `<g class="f${i}">${rects.join('')}</g>`;
  });
  if (options.stillWhenReduced) css.push(`@media (prefers-reduced-motion: reduce){.${id} g{animation:none}.${id} .f0{visibility:visible}}`);

  const labelled = typeof options.title === 'string' && options.title.length > 0;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" class="${id}" width="${size}" height="${size * FRAME_HEIGHT / FRAME_WIDTH}" viewBox="0 0 ${FRAME_WIDTH} ${FRAME_HEIGHT}" shape-rendering="crispEdges"${labelled ? ' role="img"' : ' role="presentation" aria-hidden="true"'}>`,
    labelled ? `<title>${options.title!.replace(/[&<>]/g, c => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'))}</title>` : '',
    `<style>${css.join('')}</style>`,
    ...groups,
    '</svg>',
  ].join('');
}
