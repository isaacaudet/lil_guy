/**
 * Chat emotes: a guy's head and shoulders in an expression, with its little picture, 14 pixels square
 * so it scales by whole numbers to Twitch's 28, 56 and 112 (×2, ×4, ×8) and to 126 for Discord (×9).
 * Each comes still or moving, the moving one a short loop under Twitch's 60 frames. Drawn from his
 * own poses, so it's him: his colours, his hat, his face.
 */
import { poseStill, emoteCells, FRAME_HEIGHT, type Emote, type Pose } from './animate';
import { animateOptions } from './bake';
import type { Frames } from './gif';
import type { GuySpec } from './guy-code';

/** An emote's side, in pixels. */
export const EMOTE_SIZE = 14;

type Motion = 'bounce' | 'shake' | 'rise' | 'sway';
interface EmoteDef { id: string; name: string; poses: Pose[]; symbol?: Emote; motion: Motion }

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
];

/** Whether `id` names an emote in the set. */
export const isEmote = (id: string): boolean => EMOTE_SET.some(e => e.id === id);

const STEP_MS = 180;
const STEPS = 6;

/**
 * Emote `id` for a guy: one frame still, or a loop of six. His head and shoulders fill it, top-aligned
 * to his head (or hat), the picture in the top right corner over him.
 */
export function emoteFrames(spec: GuySpec, id: string, moving = true): Frames | null {
  const def = EMOTE_SET.find(e => e.id === id);
  if (!def) return null;
  const options = { ...animateOptions(spec), rarity: false };
  const stills = new Map<Pose, (string | null)[][]>();
  const still = (pose: Pose) => { if (!stills.has(pose)) stills.set(pose, poseStill(spec.seed, pose, options)); return stills.get(pose)!; };
  // Where his head starts, from the first pose, so every frame crops alike.
  const first = still(def.poses[0]);
  const top = Math.max(0, first.findIndex(row => row.some(Boolean)) - 1);
  const symbol = def.symbol ? emoteCells(def.symbol) : [];
  const sw = symbol.reduce((w, [x]) => Math.max(w, x + 1), 0);
  const frames: Uint8ClampedArray[] = [];
  const steps = moving ? STEPS : 1;
  for (let k = 0; k < steps; k++) {
    const pose = def.poses[k % def.poses.length];
    const rows = still(pose), px = new Uint8ClampedArray(EMOTE_SIZE * EMOTE_SIZE * 4);
    // How this step moves him and the picture.
    const beat = moving ? k % 2 : 0;
    const dy = def.motion === 'bounce' ? -beat : 0, dx = def.motion === 'shake' ? (k % 2 ? 1 : -1) * (moving ? 1 : 0) : 0;
    const lift = def.motion === 'rise' && moving ? k % 3 : 0;
    const put = (x: number, y: number, c: string) => {
      if (x < 0 || y < 0 || x >= EMOTE_SIZE || y >= EMOTE_SIZE) return;
      px.set([parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 255], (y * EMOTE_SIZE + x) * 4);
    };
    for (let y = 0; y < EMOTE_SIZE; y++) {
      const from = top + y - dy;
      if (from < 0 || from >= FRAME_HEIGHT) continue;
      for (let x = 0; x < EMOTE_SIZE; x++) { const c = rows[from]?.[x + 1 + dx]; if (c) put(x, y, c); }
    }
    for (const [x, y, c] of symbol) put(EMOTE_SIZE - sw + x, y - lift, c);
    frames.push(px);
  }
  return { width: EMOTE_SIZE, height: EMOTE_SIZE, frames, delays: frames.map(() => STEP_MS) };
}
