/**
 * How often each part turns up.
 *
 * Every part in the library is meant to be liked, so these are gentle: they
 * keep the simplest, sweetest looks the most common and make the busier ones a
 * treat to find. A guy with ears, a hat, glasses, a scarf and a pattern all at
 * once is too much on sixteen pixels, so the "nothing" options carry weight.
 *
 *   5  the quiet default
 *   4  core charm
 *   3  common
 *   2  occasional
 *   1  a rare find
 *
 * Each array must be the same length as its part array; a test enforces that.
 */

export const headWeights = [
  4, // round
  4, // mochi
  3, // egg
  3, // gumdrop
  3, // onigiri
  3, // ghost
  3, // slime
  2, // loaf
  2, // cloud
  3, // pill
  2, // chonk
  2, // block
  2, // peanut
];

export const eyeWeights = [
  5, // beans
  5, // shiny
  4, // happy
  4, // sparkle
  2, // wink
  3, // glossy
  3, // content
  2, // excited
  1, // hearts
  2, // lashes
  2, // glance
];

export const mouthWeights = [
  5, // smile
  4, // cat
  3, // laugh
  3, // beak
  2, // blep
  2, // grin
  2, // fang
  1, // smirk
  1, // ooh
  3, // tiny
  1, // wobble
];

export const cheekWeights = [
  5, // bare
  3, // blush
  2, // dot
  1, // rosy
  2, // freckles
];

export const hairWeights = [
  9, // none
  4, // cat ears
  4, // bear ears
  2, // bunny ears
  2, // bug antennae
  1, // horns
  2, // space buns
  4, // sprout
  2, // apple stem
  2, // flower
  2, // bow
  1, // crown
  1, // party hat
  2, // antenna
  1, // unicorn horn
  2, // star clip
  3, // tuft
  2, // chick tuft
  2, // beanie
  2, // cap
  2, // bob
  1, // mushroom
  1, // eggshell
  1, // frosting
  1, // leafy top
  1, // beret
  1, // witch hat
  1, // propeller
];

export const bodyWeights = [
  9, // plain
  2, // belly
  2, // two tone
  2, // tabby
  2, // spots
  1, // star mark
  1, // heart mark
  2, // gleam
];

export const accessoryWeights = [
  12, // none
  2, // glasses
  2, // scarf
  2, // bell collar
  1, // bowtie
  2, // bandana
  1, // star sticker
  1, // heart badge
];

/** None, by the sides, waving. */
export const armWeights = [4, 3, 2];

/** Nubs, tiptoes, wide, socks, tucked. */
export const footWeights = [5, 2, 2, 1, 2];

/** Pastel, as picked, vivid. */
export const shadeWeights = [2, 5, 2];

/** No colourway is more "correct" than another. */
export const paletteWeights = new Array(32).fill(1);

/**
 * Picks an index from a weight table using a hash value, so the result is
 * deterministic for a given input and the distribution follows the weights.
 */
export function weightedPick(weights: number[], hashValue: number): number {
  let total = 0;
  for (const w of weights) total += w;

  let remaining = hashValue % total;
  for (let i = 0; i < weights.length; i++) {
    remaining -= weights[i];
    if (remaining < 0) return i;
  }
  return weights.length - 1;
}
