/**
 * How often each part turns up.
 *
 * A uniform roll across a large part library dilutes whatever gives the set its
 * character: adding one stern face to eight cute ones drops the cute share from
 * 8/8 to 8/9, and doing that a dozen times leaves an average avatar that is
 * merely varied rather than likeable. Weighting keeps the whole library — every
 * part still turns up — while making the charming ones the default and the
 * oddities a rare find.
 *
 * The scale is deliberately coarse:
 *   5  the quiet default (plain body, bare head, no accessory)
 *   4  core charm — what the set should mostly look like
 *   3  common
 *   2  occasional
 *   1  spice — a treat when it lands, tiring if it were common
 *
 * Each array must be the same length as its part array; a test enforces that.
 */

/** Classic blobs a little more often than the odd shapes. */
export const headWeights = [
  3, // round
  3, // gumdrop
  2, // tall
  2, // wide
  2, // pear
  2, // egg
  2, // bean
  2, // ghost
  2, // horned
  3, // eared
  1, // stack
  1, // crystal
  2, // cloud
  1, // slime
  1, // tri
  1, // lump
  2, // droop
  2, // peanut
  2, // spire
  2, // boulder
];

/** Wide, soft and bright eyes carry the set; sour or gimmicky ones are rare. */
export const eyeWeights = [
  4, // dots
  4, // round
  4, // happy
  4, // sparkle
  3, // wink
  1, // cross
  3, // tinyDots
  3, // wideEyes
  2, // sleepy
  1, // angry
  2, // hearts
  1, // cyclops
  1, // dizzy
  2, // sideEye
  1, // visor
  3, // pleading
  3, // starry
  4, // bigShine
  2, // curious
  3, // softBean
  4, // doe
  4, // content
  2, // twinkle
];

/** Smiles by default. Frowns, fangs and bared teeth are the exception. */
export const mouthWeights = [
  4, // smile
  4, // grin
  4, // cat
  3, // open
  2, // flat
  3, // tongue
  1, // fang
  1, // squiggle
  1, // gape
  1, // frown
  2, // smirk
  1, // teeth
  2, // oh
  4, // beam
  3, // tiny
  2, // wobble
  4, // tinyCat
  3, // blep
  4, // softSmile
  2, // laugh
];

/** A bare head is the most common look; formal hats are the rarest. */
export const hairWeights = [
  7, // none
  3, // antenna
  3, // tuft
  2, // crown
  3, // cap
  3, // beanie
  2, // spikes
  3, // bow
  3, // flower
  1, // tophat
  2, // propeller
  2, // star
  2, // sprout
  2, // bandana
  1, // antlers
  1, // halo
  2, // beret
  1, // wizard
  2, // earmuffs
  1, // laurel
  3, // heartPin
  2, // starClip
  3, // pompom
  3, // leafPair
  2, // partyHat
  1, // chefHat
  3, // catEars
  3, // bunnyEars
  1, // cowboy
  2, // mushroomCap
  1, // candle
  2, // topKnot
  2, // visor
  2, // flowerCrown
];

/** Plain skin most of the time — a busy all-over pattern fights the face. */
export const bodyWeights = [
  5, // plain
  3, // striped
  3, // spotted
  3, // heart
  3, // belly
  2, // zigzag
  2, // twoTone
  3, // star
  1, // checker
  2, // splotch
  3, // sprinkles
  2, // sash
  1, // gradient
  2, // patch
  2, // bigDots
  1, // bands
  3, // freckleBand
  3, // collarPatch
  2, // pebbles
  2, // crest
  2, // overalls
  3, // pawPrint
  2, // crescent
  2, // diamond
  1, // lightning
  2, // seam
  3, // flowerSpot
  2, // pocketPatch
];

/** Most guys wear nothing, or just a bit of blush. */
export const accessoryWeights = [
  8, // none
  2, // glasses
  2, // sunglasses
  4, // blush
  3, // freckles
  2, // bowtie
  1, // monocle
  1, // eyepatch
  2, // scarf
  2, // whiskers
  1, // bandaid
  1, // tears
  2, // earring
  1, // headphones
  4, // flushed
  1, // sweat
  2, // crumb
  2, // antennaeDots
  1, // mustache
  1, // beard
  1, // necktie
  1, // pendant
  1, // bib
  2, // squareGlasses
  2, // buttonNose
  1, // beautyMark
  2, // starSticker
  3, // heartCheeks
  2, // collarBell
];

/** As-authored tone most of the time; soft and deep are the variations. */
export const shadeWeights = [2, 5, 2];

/** Most guys keep the feet their head was drawn with. */
export const footWeights = [5, 2, 2, 1];

/** Patterns usually use the pattern colour; the accent is the alternate. */
export const patternToneWeights = [3, 1];

/** No palette is more "correct" than another. */
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
