/**
 * How often each part turns up, for guys dealt from deal 4 on (seeds made by
 * `makeSeed`). Older guys read the frozen `DEAL_3` and `DEAL_2` tables at the end.
 *
 * Weighted by how good a part looks, not to make everything equally likely:
 *
 * - a handful of simple, sweet defaults carry most of the weight, so most
 *   guys are clean and "rare" means something (about 1 in 6 to 1 in 15)
 * - good everyday parts are common (1 in 20 to 1 in 45: a picker offers
 *   anything at 1 in 45 or better)
 * - busier or weaker parts are a treat to find (1 in 50 to 1 in 200)
 * - chase parts, the ones meant to be shown off, are one guy in several
 *   hundred: weight 1 to 3 here, about 1 in 300 to 1 in 1,000
 * - a part that looks wrong and couldn't be fixed is 0: never dealt, but it
 *   stays in its list, since saved looks and older guys point at it
 *
 * A guy with ears, a hat, glasses, a scarf and a pattern all at once is too
 * much on sixteen pixels, so the "nothing" options carry the most weight.
 *
 * Each array must be the same length as its part array; a test enforces that.
 */

export const headWeights = [
  150, // round
  130, // mochi
  50, // egg
  120, // gumdrop
  100, // onigiri
  90, // ghost
  80, // slime
  25, // loaf
  30, // cloud
  30, // pill
  35, // chonk
  20, // block
  40, // tower
  30, // gourd
  15, // flame
  20, // jellyfish
  20, // octopus
  15, // robot
  10, // cactus
  15, // saucer
  10, // shard
  20, // toadstool
  10, // bat
  8, // crab
  20, // heart
  30, // dumpling
  20, // tooth
  20, // star
  15, // acorn
  2, // gem: chase
  3, // clover: chase
  3, // disco: chase
];

export const eyeWeights = [
  120, // beans
  175, // shiny
  110, // happy
  145, // sparkle
  40, // wink
  75, // glossy
  40, // excited
  20, // hearts
  30, // lashes
  25, // chill: half-shut, so fewer of them (deal 4)
  30, // side-eye
  15, // shades
  15, // star
  8, // squint
  12, // fired up
  6, // laser
  8, // cyclops
  15, // sleepy: eyes shut, so fewer of them (deal 4)
  12, // dizzy
  35, // anime
  1, // galaxy: chase
  2, // diamond: chase
  2, // dragon: chase
  0, // shoujo: capsules only
  0, // kitty: capsules only
  0, // joy: capsules only
  0, // puppy: capsules only
];

export const mouthWeights = [
  150, // smile
  130, // cat
  90, // laugh
  50, // beak
  40, // blep
  50, // grin
  40, // fang
  20, // smirk
  25, // ooh
  70, // tiny
  15, // wobble
  30, // toothy
  30, // tongue out
  15, // flat
  8, // gritted
  15, // bubblegum
  35, // bunny
  20, // vampire
  60, // wide
  2, // gold tooth: chase
  1, // grillz: chase
  2, // mustache: chase
  0, // kissy: capsules only
  0, // yay: capsules only
  0, // tehe: capsules only
];

export const cheekWeights = [
  300, // bare
  150, // blush
  15, // dot
  60, // rosy
  40, // freckles
  10, // scar
  10, // band-aid
  12, // war paint
  8, // whiskers
  25, // hearts
  20, // shine
  15, // stripes
  10, // stars
  6, // gold leaf
  50, // flushed
  40, // shy
  15, // mole
  1, // jewels: chase
  1, // rainbow: chase
  0, // manga blush: capsules only
];

export const hairWeights = [
  250, // none
  80, // cat ears
  70, // bear ears
  50, // bunny ears
  25, // bug antennae
  15, // horns
  30, // space buns
  70, // sprout
  30, // apple stem
  30, // flower
  45, // bow
  12, // crown
  15, // party hat
  25, // antenna
  10, // unicorn horn
  25, // star clip
  40, // tuft
  10, // chick tuft
  40, // beanie
  30, // cap
  25, // bob
  25, // mushroom
  0, // eggshell: never dealt, it reads as a bald patch
  15, // frosting
  10, // leafy top
  15, // beret
  20, // witch hat
  20, // propeller
  15, // mohawk
  20, // headphones
  30, // cherries
  25, // flower crown
  15, // antlers
  20, // chef hat
  2, // laurel: chase
  2, // star crown: chase
  2, // on fire: chase
];

export const bodyWeights = [
  500, // plain
  60, // belly
  50, // two tone
  30, // tabby
  40, // spots
  25, // star mark
  30, // heart mark
  15, // gleam
  20, // stripes
  12, // zigzag
  35, // split
  15, // moon mark
  15, // bolt mark
  15, // starry
  35, // polka dots
  30, // blaze
  30, // sprinkles
  1, // kintsugi: chase
  2, // gold dipped: chase
];

export const accessoryWeights = [
  450, // none
  50, // glasses
  50, // scarf
  40, // bell collar
  30, // bowtie
  40, // bandana
  15, // star sticker
  15, // heart badge
  12, // monocle
  10, // eye patch
  35, // necklace
  30, // medal
  30, // flower pin
  20, // headband
  35, // necktie
  25, // lei
  20, // goggles
  2, // gold chain: chase
  2, // heart shades: chase
  1, // masquerade: chase
];

/** None, by the sides, waving. */
export const armWeights = [4, 3, 2];

/** Nubs, tiptoes, wide, socks, tucked. */
export const footWeights = [5, 2, 2, 1, 2];

/** Pastel, as picked, vivid. */
export const shadeWeights = [1, 5, 3];

/**
 * Colourways. The day colours all stay pickable, the favourites half as
 * common again as the rest; the night colours are a find, and the three
 * chase colourways, with their own shading, one guy in several hundred.
 */
export const paletteWeights = [
  36, // Peach
  36, // Bubblegum
  36, // Butter
  36, // Mint
  36, // Sky
  36, // Lilac
  24, // Coral
  24, // Lime
  36, // Aqua
  24, // Tangerine
  24, // Strawberry
  24, // Periwinkle
  24, // Cream
  24, // Cocoa
  24, // Caramel
  24, // Grape
  24, // Teal
  24, // Snow
  24, // Sage
  24, // Rose
  24, // Honey
  24, // Seafoam
  24, // Blush
  24, // Ocean
  24, // Plum
  24, // Sunflower
  24, // Melon
  24, // Lavender
  24, // Pumpkin
  36, // Cotton Candy
  24, // Matcha
  24, // Ruby
  8, // Charcoal
  10, // Cobalt
  10, // Midnight
  6, // Oxblood
  6, // Forest
  8, // Grape Soda
  26, // Fuchsia
  26, // Lemon
  26, // Denim
  26, // Ice
  2, // Opal: chase
  2, // Obsidian: chase
  2, // Aurora: chase
];

/**
 * Parts no deal gives: only a capsule unlocks them (`rollPart` in ../look),
 * and metal crafts them. Each weighs 0 in its table above, so every guy dealt
 * from any deal stays exactly as he was, and the weight here is its share
 * among a slot's rare parts when a capsule picks one, as a dealt part's
 * weight is. The anime set, October 2026.
 */
export const CAPSULE_ONLY: Partial<Record<'eyes' | 'mouth' | 'cheeks', Record<number, number>>> = {
  eyes: { 23: 6, 24: 6, 25: 8, 26: 8 },     // shoujo, kitty, joy, puppy
  mouth: { 22: 8, 23: 8, 24: 6 },           // kissy, yay, tehe
  cheeks: { 19: 8 },                        // manga blush
};

/** A part's weight when a capsule unlocks one: its deal weight, or its capsule-only weight. */
export const unlockWeight = (slot: string, weights: readonly number[], i: number): number =>
  weights[i] || (CAPSULE_ONLY as Record<string, Record<number, number> | undefined>)[slot]?.[i] || 0;

/**
 * Deal 3 (seeds starting `3-`), as it stood when deal 4 began: frozen like
 * `DEAL_2`, so a guy dealt from it keeps his parts. Deal 4 dealt fewer shut
 * and half-shut eyes.
 */
export const DEAL_3 = {
  head: [150, 130, 50, 120, 100, 90, 80, 25, 30, 30, 35, 20, 40, 30, 15, 20, 20, 15, 10, 15, 10, 20, 10, 8, 20, 30, 20, 20, 15, 2, 3, 3],
  eyes: [120, 150, 110, 120, 40, 60, 40, 20, 30, 50, 30, 15, 15, 20, 12, 6, 8, 45, 12, 35, 1, 2, 2],
  mouth: [150, 130, 90, 50, 40, 50, 40, 20, 25, 70, 15, 30, 30, 15, 8, 15, 35, 20, 60, 2, 1, 2],
  cheeks: [300, 150, 15, 60, 40, 10, 10, 12, 8, 25, 20, 15, 10, 6, 50, 40, 15, 1, 1],
  hair: [250, 80, 70, 50, 25, 15, 30, 70, 30, 30, 45, 12, 15, 25, 10, 25, 40, 10, 40, 30, 25, 25, 0, 15, 10, 15, 20, 20, 15, 20, 30, 25, 15, 20, 2, 2, 2],
  body: [500, 60, 50, 30, 40, 25, 30, 15, 20, 12, 35, 15, 15, 15, 35, 30, 30, 1, 2],
  accessory: [450, 50, 50, 40, 30, 40, 15, 15, 12, 10, 35, 30, 30, 20, 35, 25, 20, 2, 2, 1],
  palette: [36, 36, 36, 36, 36, 36, 24, 24, 36, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 36, 24, 24, 8, 10, 10, 6, 6, 8, 26, 26, 26, 26, 2, 2, 2],
};

/**
 * The deal before 3 (seeds without the `3-` or `4-` prefix, and plain names). Frozen:
 * every guy already dealt from one of these keeps his parts, so these lists
 * never change, not even to add a part. New parts and new weights go in the
 * tables above, which only seeds made by `makeSeed` from deal 4 on read.
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
/**
 * Eyes no guy has any more: never dealt, picked or drawn. They stay in their
 * arrays (an index is what a saved look or game stores), so every other part
 * keeps its place. 16 is the cyclops.
 */
export const RETIRED_EYES: readonly number[] = [16];
/** A slot's weights with its retired parts at zero. */
export const withoutRetired = (weights: readonly number[], retired: readonly number[]) => weights.map((x, i) => (retired.includes(i) ? 0 : x));

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
