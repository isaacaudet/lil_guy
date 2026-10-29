/**
 * The sparkle: a glint of light that opens and closes over a few frames, the
 * one shape every twinkle in the library uses (a rare copy's sparkles, a Gold
 * finish's mark, a Lucky guy, a cheer's stars, a rare aura's extras).
 *
 * It comes in as a dim dot, brightens, opens into a small cross with a white
 * heart, turns into a diagonal glint as it closes, and goes out as a dot. A
 * cell's `k` is which of three colours it takes: 0 the white heart, 1 the
 * bright arms, 2 the deep edges.
 */
export type SparkleCell = [dx: number, dy: number, k: number];

const DOT_DEEP: SparkleCell[] = [[0, 0, 2]];
const DOT: SparkleCell[] = [[0, 0, 1]];
const CROSS: SparkleCell[] = [[0, 0, 0], [-1, 0, 1], [1, 0, 1], [0, -1, 1], [0, 1, 1]];
const GLINT: SparkleCell[] = [[0, 0, 0], [-1, -1, 2], [1, 1, 2], [1, -1, 2], [-1, 1, 2]];

/**
 * The sparkle `f` of the way through its life (0 to 1), as cells round its
 * centre. Outside 0 to 1 it isn't there.
 */
export function sparkleAt(f: number): SparkleCell[] {
  if (f < 0 || f >= 1) return [];
  return f < 0.16 ? DOT_DEEP : f < 0.32 ? DOT : f < 0.6 ? CROSS : f < 0.78 ? GLINT : f < 0.9 ? DOT : DOT_DEEP;
}

/** The room a sparkle needs at its biggest: its centre and the cells beside and across from it. */
export const SPARKLE_REACH: [number, number][] = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1]];
