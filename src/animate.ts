import { cycle, fit, fitLoop, LOOP_MS, steps, wave, wrap } from './loop';
import { resolve } from './resolve';
import { dress, itemById, withItems } from './items';
import { buddyOf, compose, composeBase, faceOf } from './compose';
import { heads, mouths, eyes as EYES } from './parts';
import type { Face } from './parts/canvas';
import { paint } from './paint';
import { paletteOf } from './palette';
import { GRADES, gradeOf } from './owned';
import { LAYER, LOCAL, T } from './parts/art';
import { hash } from './hash';
import { auraById, auraCells, auraColor } from './auras';
import { applyFx } from './effects';
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
type Pose = 'base' | 'shut' | 'left' | 'right' | 'wave' | 'sides' | 'laugh' | 'laughWave' | 'frown' | 'ooh';

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

const BEATS: Record<Move, (canWave: boolean) => Beat[]> = {
  idle: () => [
    b('base', 700), b('base', 500, { squash: 1 }), b('base', 700), b('shut', 120), b('base', 480), b('base', 500, { squash: 1 }),
  ],
  blink: () => [b('base', 2400), b('shut', 140)],
  hop: () => [...HOP, b('base', 700)],
  wave: canWave => canWave
    ? [b('wave', 220), b('sides', 200), b('wave', 220), b('sides', 200), b('wave', 220, { emote: 'heart' }), b('base', 700, { emote: 'heart' })]
    : [b('base', 200, { dx: -1 }), b('base', 200), b('base', 200, { dx: 1 }), b('base', 200), b('base', 700)],
  look: () => [b('base', 500), b('left', 700, { emote: 'question', left: true }), b('base', 250), b('right', 700, { emote: 'question' }), b('base', 250), b('shut', 120), b('base', 400)],
  cheer: canWave => {
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
  dance: () => [
    b('laugh', 180, { dx: -1, squash: 1, emote: 'note', left: true }), b('base', 180, { emote: 'note', left: true }),
    b('laugh', 180, { dx: 1, squash: 1, turn: true, emote: 'note' }), b('base', 180, { turn: true, emote: 'note' }),
  ],
  squish: () => [
    b('ooh', 90, { squash: 2, emote: 'bang' }), b('ooh', 80, { squash: -2, emote: 'bang' }), b('ooh', 80, { squash: 1, emote: 'bang' }), b('base', 70, { squash: -1 }), b('base', 700),
  ],
  sleep: () => [
    b('shut', 1100, { squash: 1, emote: 'zzz' }), b('shut', 1100, { emote: 'zzz', rise: true }), b('shut', 1100, { squash: 1, emote: 'zzz' }), b('shut', 1100, { emote: 'zzz', rise: true }),
  ],
};

// ---------------------------------------------------------------- the face

const EYE_TOKENS = new Set<number>([T.EYE, T.WHITE]);

/** The row the bottom of the eyes sits on, for this guy's shape or skin. */
function eyeLineOf(config: AvatarConfig): number {
  const skin = itemById(config.skin);
  return skin?.slot === 'skin' ? skin.eyes! : heads[config.head].eyes;
}

/** The bare body, mirrored the same way as the finished guy. */
function bareOf(config: AvatarConfig): PixelGrid {
  const bare = composeBase(config);
  if (config.flip) for (const row of bare) row.reverse();
  return bare;
}

/** Eye pixels: eye ink and eye shine in the rows the eyes are drawn on. */
function eyeCells(grid: PixelGrid, config: AvatarConfig): [number, number][] {
  const line = eyeLineOf(config);
  const out: [number, number][] = [];
  for (let y = Math.max(0, line - 3); y <= line; y++) {
    for (let x = 0; x < GRID_SIZE; x++) if (EYE_TOKENS.has(grid[y][x])) out.push([x, y]);
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

/** Loses rows from (or repeats a row of) the body just above the feet; everything above follows. */
function squash(layer: Layer, n: number): Layer {
  if (!n) return layer;
  let last = -1, first = -1;
  layer.forEach((row, y) => { if (row.some(Boolean)) { if (first < 0) first = y; last = y; } });
  if (last < 0) return layer;
  const r = Math.max(first + 2, last - 3);
  const rows = layer.map(row => [...row]);
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

/** A four-point twinkle, only where there is nothing. */
function twinkle(layer: Layer, x: number, y: number, centre: string, arms: string): void {
  const cells: [number, number, string][] = [[x, y, centre], [x - 1, y, arms], [x + 1, y, arms], [x, y - 1, arms], [x, y + 1, arms]];
  if (!cells.every(([cx, cy]) => cx >= 0 && cy >= 0 && cx < FRAME_WIDTH && cy < FRAME_HEIGHT && !layer[cy][cx])) return;
  for (const [cx, cy, c] of cells) layer[cy][cx] = { c, item: false };
}

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

/** Where a Lucky guy's gold twinkles go. */
const LUCKY_SPOTS: [number, number][] = [[2, 5], [13, 4], [14, 14], [1, 15]];

/** Where sparkles may go: around the guy, clear of him. */
const SPARKLE_SPOTS: [number, number][] = [[2, 6], [13, 8], [1, 13], [14, 15], [7, 1], [2, 18], [13, 2], [12, 18]];

/**
 * Builds the frames of a move for the guy `input` would render as. Takes the
 * same options as `toSvgString` (game, equip, parts, palette).
 */
export function animate(input: string, move: Move, options: AnimateOptions = {}): Animation {
  const config = dress(resolve(input, options.parts), options, input);
  const palette = withItems(options.palette ?? paletteOf(config), config);
  // The frame and any aura are drawn per frame round him, not into his poses,
  // and so is his buddy, which stays on the floor while he moves.
  const figure: AvatarConfig = { ...config, frame: undefined, aura: undefined, buddy: undefined };
  const spot = itemById(config.buddy)?.slot === 'buddy' ? buddyOf({ ...config, frame: undefined, aura: undefined }) : undefined;
  const wornAura = auraById(itemById(config.aura)?.slot === 'aura' ? config.aura : undefined);
  // Effects move, so a guy wearing one gets short frames like an aura's.
  const fxCopies = FRAME_SLOTS.map(slot => config.owned?.[slot]);
  const withFx = fxCopies.some(o => o?.fx);
  // Lucky guys and chase eyes move too, unless a still is asked for.
  const lucky = !!config.lucky && options.rarity !== false && !options.small;
  const liveEye = options.small ? undefined : LIVE_EYES.get(config.eyes);

  const grids = new Map<Pose, PixelGrid>();
  const grid = (pose: Pose): PixelGrid => {
    if (!grids.has(pose)) {
      const base = compose(figure);
      grids.set(pose,
        pose === 'base' ? base
        : pose === 'shut' ? closeEyes(base, config)
        : pose === 'left' ? glance(base, config, -1)
        : pose === 'right' ? glance(base, config, 1)
        : pose === 'laugh' ? compose({ ...figure, mouth: mouthIndex('laugh') })
        : pose === 'laughWave' ? compose({ ...figure, mouth: mouthIndex('laugh'), arms: 2 })
        : pose === 'frown' ? closeEyes(compose({ ...figure, mouth: mouthIndex('wobble') }), config)
        : pose === 'ooh' ? compose({ ...figure, mouth: mouthIndex('ooh') })
        : compose({ ...figure, arms: pose === 'wave' ? 2 : 1 }));
    }
    return grids.get(pose)!;
  };
  // Some shapes and skins have nowhere to put an arm.
  const canWave = JSON.stringify(grid('wave')) !== JSON.stringify(grid('sides'));

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

  const beats = BEATS[move](canWave);
  const timed = !!(wornAura || withFx || lucky || liveEye || grade >= 1 || options.emote);
  // With effects on, long beats are cut into slices so the shine can move.
  const loop = options.loop, laps = loop ? loop.repeats + 1 : 1;
  const lapMs = beats.reduce((n, b) => n + b.ms, 0), span = loop ? lapMs * loop.repeats : 0;
  // Whole milliseconds in, an exact remainder, one division: the same moment in any lap is the same number.
  const clock = (ms: number) => (loop ? ((ms * loop.turns * LOOP_MS) % (LOOP_MS * span)) / span : ms);
  const slices: { beat: Beat; ms: number; t: number; lap: number }[] = [];
  let t = 0;
  for (let lap = 0; lap < laps; lap++) for (const beat of beats) {
    let n = wornAura || withFx || lucky || liveEye ? Math.max(1, Math.ceil(beat.ms / 100)) : grade >= 1 ? Math.max(1, Math.ceil(beat.ms / 150)) : 1;
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
    layer = squash(layer, beat.squash ?? 0);
    layer = shift(layer, beat.dx ?? 0, beat.dy ?? 0);
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
      const at = cycle(t + seed, 1600) * (FRAME_WIDTH + FRAME_HEIGHT + 8) - 4;
      layer.forEach((row, y) => row.forEach((cell, x) => {
        if (!cell?.item) return;
        const d = Math.abs(x + y - at);
        if (d < 1) cell.c = mix(cell.c, '#FFFFFF', 0.65);
        else if (d < 2) cell.c = mix(cell.c, '#FFFFFF', 0.25);
      }));
    }

    if (lucky) luckyShimmer(layer, t, seed);
    if (liveEye) liveEyes(layer, liveEye, t, seed);
    if (lucky && !wornAura && grade < 3) LUCKY_SPOTS.forEach(([x, y], k) => {
      if (wrap(t / steps(260, 3) + k * 1.3 + seed, 3) < 1) twinkle(layer, x, y, '#FFFFFF', '#FFD45C');
    });

    const aura = grade >= 2 ? rim(layer) : [];
    if (beat.stars) {
      const gold = palette.colors[T.GOLD] ?? '#F2C230';
      twinkle(layer, 2, 3, '#FFFFFF', gold);
      twinkle(layer, 13, 2, '#FFFFFF', gold);
      if (Math.floor(wrap(t, fit(240)) / (fit(240) / 2)) % 2) twinkle(layer, 8, 1, '#FFFFFF', gold);
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
      // The aura, round him as he stands in this frame, in its finish. A rare
      // one's rings run past the frame's sides; those cells ride along in `outside`.
      const copy = config.owned?.aura, mask = layer.map(row => row.map(Boolean));
      for (const [x, y, k] of auraCells(wornAura.id, mask, t, copy, AURA_PAD)) {
        const c = copy ? auraColor(wornAura.id, k, copy.finish, x, y, t) : wornAura.colors[k];
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
      const count = grade === 4 ? 4 : 3;
      SPARKLE_SPOTS.slice(0, count + 2).forEach(([x, y], k) => {
        if (wrap(t / steps(240, 4) + k * 1.7 + seed, 4) < 1) twinkle(layer, x, y, '#FFFFFF', grade === 4 ? '#FFE27A' : gradeColor);
      });
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
