/**
 * Chat emotes: a guy's head and shoulders in an expression, with its little picture, 14 pixels square
 * so it scales by whole numbers to Twitch's 28, 56 and 112 (×2, ×4, ×8) and to 126 for Discord (×9).
 * Each comes still or moving, the moving one a short loop under Twitch's 60 frames. Drawn from the
 * guy's own poses, so it's them: their colours, hat and face, and what marks them rare (the ring the
 * best copy or an aura puts round them, a Lucky guy's rim and star, a copy's effect in the moving one).
 */
import { poseCells, emoteCells, openHead, GOLD_SPARKLE, FRAME_HEIGHT, LID_LIFT, LID_STILL, type Emote, type OpenThought, type Pose } from './animate';
import { animateOptions } from './bake';
import type { Frames } from './gif';
import type { GuySpec } from './guy-code';
import { resolve } from './resolve';
import { starAt } from './sparkle';

/** An emote's side, in pixels. */
export const EMOTE_SIZE = 14;

/**
 * How an emote moves. The thoughts have their own: `flick` switches its bulb on, `dream` floats its
 * cloud, and `open` lifts the top of the head (on a burst or a starfield, its `unlock`'s).
 */
type Motion = 'bounce' | 'shake' | 'rise' | 'sway' | 'flick' | 'dream' | 'open';
interface EmoteDef {
  id: string;
  name: string;
  poses: Pose[];
  symbol?: Emote;
  motion: Motion;
  /** Rows of room over the head, for a big picture or a head that opens. */
  room?: number;
  /** For one that opens the head: what is under the lid, and the unlock (`EMOTE_UNLOCKS`) it takes. */
  unlock?: OpenThought;
}

/** The set, in the order a channel would upload them. `name` is the suffix a channel puts after its prefix. */
export const EMOTE_SET: readonly EmoteDef[] = [
  { id: 'hi', name: 'Hi', poses: ['smile', 'base'], symbol: 'hearts', motion: 'bounce' },
  { id: 'lol', name: 'Lol', poses: ['laugh', 'smile'], symbol: 'note', motion: 'bounce' },
  { id: 'pog', name: 'Pog', poses: ['ooh'], symbol: 'bang', motion: 'bounce' },
  { id: 'love', name: 'Love', poses: ['blush'], symbol: 'heart', motion: 'rise' },
  { id: 'mad', name: 'Mad', poses: ['huff'], symbol: 'anger', motion: 'shake' },
  { id: 'sad', name: 'Sad', poses: ['frown'], symbol: 'sweat', motion: 'rise' },
  { id: 'sleep', name: 'Sleep', poses: ['shut'], symbol: 'zzz', motion: 'rise' },
  { id: 'hmm', name: 'Hmm', poses: ['left', 'right'], symbol: 'question', motion: 'sway' },
  { id: 'hype', name: 'Hype', poses: ['laugh'], symbol: 'fire', motion: 'bounce' },
  { id: 'gg', name: 'Gg', poses: ['content'], symbol: 'crown', motion: 'bounce' },
  { id: 'blep', name: 'Blep', poses: ['blep'], motion: 'sway' },
  { id: 'oops', name: 'Oops', poses: ['oops'], symbol: 'sweat', motion: 'shake' },
  // The thoughts.
  { id: 'idea', name: 'Idea', poses: ['ooh'], symbol: 'bulb', motion: 'flick', room: 1 },
  { id: 'mindblown', name: 'Mindblown', poses: ['ooh'], motion: 'open', room: 3, unlock: 'burst' },
  { id: 'daydream', name: 'Daydream', poses: ['content'], symbol: 'cloud', motion: 'dream', room: 2 },
  { id: 'galaxybrain', name: 'Galaxybrain', poses: ['smile'], motion: 'open', room: 3, unlock: 'galaxy' },
];

/** Whether `id` names an emote in the set. */
export const isEmote = (id: string): boolean => EMOTE_SET.some(e => e.id === id);

const STEP_MS = 180;
const STEPS = 6;

type Grid = (string | null)[][];

/**
 * Emote `id` for a guy: one frame still, or a loop of six. His head and shoulders fill it, top-aligned
 * to his head (or hat), the picture in the top right corner over him.
 */
export function emoteFrames(spec: GuySpec, id: string, moving = true): Frames | null {
  const def = EMOTE_SET.find(e => e.id === id);
  if (!def) return null;
  const options = animateOptions(spec), lucky = !!resolve(spec.seed, spec.parts).lucky;
  const steps = moving ? STEPS : 1;
  const posed = new Map<string, ReturnType<typeof poseCells>>();
  const cellsOf = (pose: Pose, k: number) => {
    const key = `${pose} ${k}`;
    if (!posed.has(key)) posed.set(key, poseCells(spec.seed, pose, { ...options, rare: { step: k, of: steps } }));
    return posed.get(key)!;
  };
  // Where his head starts, from the first pose, so every frame crops alike.
  const first = cellsOf(def.poses[0], 0);
  const head = first.colors.findIndex(row => row.some(Boolean));
  const top = Math.max(0, head - 1 - (def.room ?? 0));
  const frames: Uint8ClampedArray[] = [];
  let star: [number, number] | null | undefined;
  for (let k = 0; k < steps; k++) {
    const pose = def.poses[k % def.poses.length], { colors: rows, body, eyes } = cellsOf(pose, k);
    // How this step moves him and the picture.
    const beat = moving ? k % 2 : 0;
    const dy: number = def.motion === 'bounce' ? -beat : 0, dx = def.motion === 'shake' ? (k % 2 ? 1 : -1) * (moving ? 1 : 0) : 0;
    const lift = !moving ? 0 : def.motion === 'rise' ? k % 3 : def.motion === 'dream' ? k % 2 : 0;
    const grid: Grid = Array.from({ length: EMOTE_SIZE }, () => new Array<string | null>(EMOTE_SIZE).fill(null));
    const skin: boolean[][] = grid.map(row => row.map(() => false));
    for (let y = 0; y < EMOTE_SIZE; y++) {
      const from = top + y - dy;
      if (from < 0 || from >= FRAME_HEIGHT) continue;
      for (let x = 0; x < EMOTE_SIZE; x++) { grid[y][x] = rows[from]?.[x + 1 + dx] ?? null; skin[y][x] = !!body[from]?.[x + 1 + dx]; }
    }
    // A moving one's step `k`; a still one shows each thought at its height.
    const at = moving ? k : -1;
    if (def.unlock) openHead(grid, (x, y) => skin[y][x], c => c, eyes - top + dy, def.unlock, at < 0 ? LID_STILL : LID_LIFT[def.unlock][at], Math.max(0, at));
    // A Lucky guy's star, placed on the first step and kept there.
    if (lucky && star === undefined) star = starSpot(grid);
    if (star) luckyStar(grid, star, at);
    if (def.symbol) {
      const symbol = symbolAt(def, at), sw = symbol.reduce((w, [x]) => Math.max(w, x + 1), 0);
      for (const [x, y, c] of symbol) put(grid, EMOTE_SIZE - sw + x, y - lift, c);
    }
    const px = new Uint8ClampedArray(EMOTE_SIZE * EMOTE_SIZE * 4);
    grid.forEach((row, y) => row.forEach((c, x) => { if (c) px.set([parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 255], (y * EMOTE_SIZE + x) * 4); }));
    frames.push(px);
  }
  return { width: EMOTE_SIZE, height: EMOTE_SIZE, frames, delays: frames.map(() => STEP_MS) };
}

const put = (grid: Grid, x: number, y: number, c: string) => { if (x >= 0 && y >= 0 && x < EMOTE_SIZE && y < EMOTE_SIZE) grid[y][x] = c; };

// ---------------------------------------------------------------- the thoughts

/** The bulb dark, then switched on: its glass grey, its glint dim. */
const BULB_OFF: Record<string, string> = { '#FFE27A': '#C9CED8', '#FFFFFF': '#E9ECF2' };
/** The steps an idea's bulb is lit in, of the six. */
const BULB_ON = [false, false, true, true, true, true];
/** A daydream's star, turning through three colours a step at a time. */
const DREAM_STAR = ['#FFC93D', '#FF8FC8', '#7FE0FF'];

/** The emote's picture at step `k` (-1 for the still): an idea's bulb lights, a daydream's star turns colour. */
function symbolAt(def: EmoteDef, k: number): [number, number, string][] {
  const cells = emoteCells(def.symbol!);
  if (def.motion === 'flick' && k >= 0 && !BULB_ON[k]) return cells.map(([x, y, c]) => [x, y, BULB_OFF[c] ?? c]);
  if (def.motion === 'dream' && k >= 0) return cells.map(([x, y, c]) => [x, y, c === DREAM_STAR[0] ? DREAM_STAR[Math.floor(k / 2) % 3] : c]);
  return cells;
}

/** How a Lucky guy's star twinkles over the six steps (`starAt`'s life): wide open first, so the still shows it whole. */
const STAR_STEPS = [0.57, 0.78, 0.9, 1, 0.2, 0.35];

const clearAt = (grid: Grid, x: number, y: number) => x >= 0 && y >= 0 && x < EMOTE_SIZE && y < EMOTE_SIZE && !grid[y][x];

/** Where a Lucky guy's star goes in an emote: the top-left corner, where the most of it is clear of the guy; null if there's no room. */
function starSpot(grid: Grid): [number, number] | null {
  const open = starAt(STAR_STEPS[0]);
  let best: [number, number] | null = null, most = 0;
  for (let y = 1; y <= 3; y++) for (let x = 1; x <= 3; x++) {
    const n = open.filter(([dx, dy]) => clearAt(grid, x + dx, y + dy)).length;
    if (clearAt(grid, x, y) && n > most) { most = n; best = [x, y]; }
  }
  return most >= 3 ? best : null;
}

/** A Lucky guy's gold star at `spot`, at step `k` of its twinkle (-1 for the still), as the moving picture throws it off over the head: never over the guy. */
function luckyStar(grid: Grid, [x, y]: [number, number], k: number): void {
  for (const [dx, dy, c] of starAt(STAR_STEPS[Math.max(0, k)])) if (clearAt(grid, x + dx, y + dy)) put(grid, x + dx, y + dy, GOLD_SPARKLE[c]);
}
