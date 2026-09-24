import { composeLayersV2, type Composed, type FrameOverrides } from './compose';
import { indexOfPart } from './parts';
import type { AnimationState, AvatarConfigV2 } from './types';

/** One step of a state: what changes on the guy, where he is, and for how long. */
export interface FrameSpec {
  over?: FrameOverrides;
  /** Whole-character offset, in grid pixels. */
  dx?: number;
  dy?: number;
  ms: number;
}

const part = (id: string) => {
  const index = indexOfPart(id);
  if (index < 0) throw new Error(`animation refers to a missing part: ${id}`);
  return index;
};

const SQUINT = part('eyes.content');
const HAPPY_EYES = part('eyes.happy');
const DROOPY = part('eyes.sleepy');
const BEAM = part('mouth.beam');
const FROWN = part('mouth.frown');

/**
 * The states, as a few overrides and transforms each. None of them needs
 * per-frame art: they swap in parts that already exist, close or slide the
 * eyes, raise the arms, and move the whole guy.
 */
export const STATES: Record<AnimationState, FrameSpec[]> = {
  still: [{ ms: 1000 }],

  // A slow two-frame bob, with a blink tucked into the end of every third one.
  idle: [
    { ms: 600 }, { dy: -1, ms: 600 },
    { ms: 600 }, { dy: -1, ms: 600 },
    { ms: 600 }, { dy: -1, ms: 450 },
    { dy: -1, over: { blink: true }, ms: 150 },
  ],

  // Exact guesses and new bests: a hop with a squint-smile.
  happy: [
    { over: { eyes: SQUINT, mouth: BEAM }, ms: 120 },
    { over: { eyes: SQUINT, mouth: BEAM }, dy: -2, ms: 120 },
    { over: { eyes: SQUINT, mouth: BEAM }, dy: -4, ms: 160 },
    { over: { eyes: SQUINT, mouth: BEAM }, dy: -2, ms: 120 },
    { over: { eyes: SQUINT, mouth: BEAM }, ms: 480 },
  ],

  // Misses and lost streaks: slumped low with a frown, sinking a little.
  sad: [
    { over: { eyes: DROOPY, mouth: FROWN }, dy: 1, ms: 1200 },
    { over: { eyes: DROOPY, mouth: FROWN }, dy: 2, ms: 1200 },
  ],

  // Duel wins and podiums: arms up and hopping.
  cheer: [
    { over: { arms: 'up', eyes: HAPPY_EYES, mouth: BEAM }, ms: 150 },
    { over: { arms: 'up', eyes: HAPPY_EYES, mouth: BEAM }, dy: -2, ms: 150 },
    { over: { arms: 'up', eyes: HAPPY_EYES, mouth: BEAM }, dy: -4, ms: 200 },
    { over: { arms: 'up', eyes: HAPPY_EYES, mouth: BEAM }, dy: -2, ms: 150 },
    { over: { arms: 'up', eyes: HAPPY_EYES, mouth: BEAM }, ms: 350 },
  ],

  // While the pile pours: eyes drift left, back, right, back.
  look: [
    { over: { eyeShift: -2 }, ms: 900 },
    { ms: 500 },
    { over: { eyeShift: 2 }, ms: 900 },
    { ms: 500 },
  ],
};

export interface Frame extends Composed {
  dx: number;
  dy: number;
  ms: number;
}

/**
 * Every frame of a state as a composed grid, for drawing onto a canvas.
 * Frames that change nothing but position share one grid.
 */
export function animationFrames(config: AvatarConfigV2, state: AnimationState): Frame[] {
  const cache = new Map<string, Composed>();
  return STATES[state].map(spec => {
    const key = JSON.stringify(spec.over ?? {});
    let composed = cache.get(key);
    if (!composed) {
      composed = composeLayersV2(config, spec.over);
      cache.set(key, composed);
    }
    return { ...composed, dx: spec.dx ?? 0, dy: spec.dy ?? 0, ms: spec.ms };
  });
}
