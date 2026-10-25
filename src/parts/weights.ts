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
  3, // round
  3, // mochi
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
  4, // tower
  3, // gourd
  1, // flame
  1, // jellyfish
  1, // octopus
  2, // robot
  1, // cactus
  1, // saucer
  1, // shard
  1, // toadstool
  1, // bat
  1, // crab
  1, // heart
];

export const eyeWeights = [
  10, // beans
  10, // shiny
  8, // happy
  8, // sparkle
  4, // wink
  6, // glossy
  4, // excited
  2, // hearts
  4, // lashes
  6, // chill
  4, // side-eye
  2, // shades
  2, // star
  3, // squint
  2, // fired up
  1, // laser
  1, // cyclops
];

export const mouthWeights = [
  10, // smile
  8, // cat
  6, // laugh
  6, // beak
  4, // blep
  4, // grin
  4, // fang
  2, // smirk
  2, // ooh
  6, // tiny
  2, // wobble
  4, // toothy
  4, // tongue out
  3, // flat
  2, // gritted
  2, // bubblegum
];

export const cheekWeights = [
  10, // bare
  6, // blush
  4, // dot
  2, // rosy
  4, // freckles
  2, // scar
  2, // band-aid
  1, // war paint
  3, // whiskers
  2, // hearts
  3, // shine
  2, // stripes
  1, // stars
  1, // gold leaf
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
  2, // mohawk
  2, // headphones
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
  2, // stripes
  2, // zigzag
  2, // split
  1, // moon mark
  1, // bolt mark
  1, // starry
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
  1, // monocle
  1, // eye patch
  2, // necklace
  2, // medal
  2, // flower pin
  2, // headband
];

/** None, by the sides, waving. */
export const armWeights = [4, 3, 2];

/** Nubs, tiptoes, wide, socks, tucked. */
export const footWeights = [5, 2, 2, 1, 2];

/** Pastel, as picked, vivid. */
export const shadeWeights = [1, 5, 3];

/** No colourway is more "correct" than another. */
/** The night colourways (the last six) are half as common as the rest. */
export const paletteWeights = [...new Array(32).fill(2), ...new Array(6).fill(1)];


/**
 * The deal before 3 (seeds without the `3-` prefix, and plain names). Frozen:
 * every guy already dealt from one of these keeps his parts, so these lists
 * never change, not even to add a part. New parts and new weights go in the
 * tables above, which only seeds made by `makeSeed` from deal 3 on read.
 */
export const DEAL_2 = {
  head: [3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 2, 2, 4, 3, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1],
  eyes: [10, 10, 8, 8, 4, 6, 4, 2, 4, 6, 4, 2, 2, 3, 2, 1, 1],
  mouth: [10, 8, 6, 6, 4, 4, 4, 2, 2, 6, 2, 4, 4, 3, 2, 2],
  cheeks: [10, 6, 4, 2, 4, 2, 2, 1, 3, 2, 3, 2, 1, 1],
  hair: [9, 4, 4, 2, 2, 1, 2, 4, 2, 2, 2, 1, 1, 2, 1, 2, 3, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 2, 2],
  body: [9, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 1, 1],
  accessory: [12, 2, 2, 2, 1, 2, 1, 1, 1, 1, 2, 2, 2, 2],
  palette: [...new Array(32).fill(2), ...new Array(6).fill(1)],
};

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
