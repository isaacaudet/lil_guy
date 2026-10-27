/**
 * Everything that moves on its own clock (auras, effects, finishes, a Lucky
 * guy's sheen, live eyes, sparkles) repeats in LOOP_MS, so any loop of a whole
 * number of LOOP_MS closes perfectly: its last frame runs into its first like
 * any other frame. Each motion keeps its own speed as near as it can, nudged
 * so a whole number of its cycles fill LOOP_MS, and anything drawn from noise
 * per step or per generation draws the same noise again each LOOP_MS.
 */
export const LOOP_MS = 6000;

const TAU = Math.PI * 2;
/** `v` brought into 0 to `n`, negative numbers too. */
export const wrap = (v: number, n: number) => ((v % n) + n) % n;

/** `period` ms, nudged so a whole number of them fill LOOP_MS. */
export const fit = (period: number) => LOOP_MS / Math.max(1, Math.round(LOOP_MS / Math.abs(period)));

/** The `d` in `sin(t / d)`, nudged so the wave (2πd ms) comes round in LOOP_MS. */
export const wave = (d: number) => fit(TAU * d) / TAU;

/** A step's length in a pattern `n` steps long, nudged so the pattern comes round in LOOP_MS. */
export const steps = (step: number, n: number) => fit(step * Math.max(1, n)) / Math.max(1, n);

/** A count of `step` ms that starts again every LOOP_MS: for noise drawn fresh each step or generation. */
export function tick(t: number, step: number): number {
  const s = fit(step);
  return wrap(Math.floor(t / s), Math.round(LOOP_MS / s));
}

/** How far through a cycle of about `period` ms, 0 to 1, coming round in LOOP_MS. */
export const cycle = (t: number, period: number) => { const p = fit(period); return wrap(t, p) / p; };

/**
 * How many times to play something `duration` ms long so everything on its own
 * clock comes round with it: the plays that get closest to whole turns of
 * LOOP_MS (`turns`), the clock running `speed` times as fast to close exactly.
 */
export function fitLoop(duration: number): { repeats: number; turns: number; speed: number } {
  let best = { repeats: 1, turns: 1, speed: LOOP_MS / duration };
  for (let turns = 1; turns <= 3; turns++) {
    const repeats = Math.max(1, Math.round(turns * LOOP_MS / duration));
    if (repeats * duration > LOOP_MS * 2) continue;
    const speed = turns * LOOP_MS / (repeats * duration);
    if (Math.abs(Math.log(speed)) < Math.abs(Math.log(best.speed))) best = { repeats, turns, speed };
  }
  return best;
}
