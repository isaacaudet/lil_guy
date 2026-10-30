import { GUY_RANK } from './guy-rank';
import { heads, eyes, mouths, cheeks, hair, bodies, accessories } from './parts';
import {
  headWeights, eyeWeights, mouthWeights, cheekWeights, hairWeights,
  bodyWeights, accessoryWeights, paletteWeights, armWeights, footWeights, shadeWeights,
  RETIRED_EYES, withoutRetired, unlockWeight, DEAL_2, DEAL_3,
} from './parts/weights';
import { palettes, shownPalette } from './palette';
import { gameItems, itemById, itemWeight } from './items';
import { AURAS, AURA_ODDS } from './auras';
import { EFFECTS } from './effects';
import { DEEP_BLUE_PRINTS, FINISHES, special, type Owned } from './owned';
import { LUCKY_ODDS } from './resolve';
import { shows } from './compose';
import type { AvatarConfig } from './types';

/**
 * How rare things are, as "one in N".
 *
 * A guy's rarity is the chance of rolling his exact combination of visible
 * traits — shape, eyes, mouth, cheeks, topper, markings, accessory, colourway,
 * tone, arms, feet and whether he is Lucky — so a laser-eyed guy in a crown is rarer than one with bean eyes
 * and no hat. A copy's rarity is the chance a capsule gives exactly that: its
 * item, its finish, a print as special as its print, a scuff at least as low
 * as its scuff, and a tally if it has one.
 */

/** The twelve traits, in the order `traitOdds` lists them. */
export const TRAIT_SLOTS = [
  'shape', 'eyes', 'mouth', 'cheeks', 'topper', 'markings', 'accessory', 'colour', 'tone', 'arms', 'feet', 'lucky',
] as const;
export type TraitSlot = (typeof TRAIT_SLOTS)[number];

/** Names for the traits that are only an index: tone (`shade`), arms and feet. */
export const TONE_NAMES = ['pastel', 'as picked', 'vivid'] as const;
export const ARM_NAMES = ['none', 'by the sides', 'waving'] as const;
export const FOOT_NAMES = ['nubs', 'tiptoes', 'wide', 'socks', 'tucked'] as const;

export interface TraitOdds {
  slot: TraitSlot;
  name: string;
  /** Chance of this trait, 0–1. */
  chance: number;
}

/**
 * A part's chance. A part no deal gives (the capsule-only set) counts
 * as if it were dealt at its capsule weight, so a look wearing one stays a
 * number; every dealt part's chance is as it was.
 */
const share = (weights: number[], i: number, slot = '') => (weights[i] || unlockWeight(slot, weights, i)) / weights.reduce((a, b) => a + b, 0);
// A part today's deal no longer gives (eggshell) is still worn by guys an older
// deal gave it to: rate it by the newest deal that did, never as impossible.
const dealt = (key: keyof typeof DEAL_3, weights: number[], i: number, slot = '') => {
  if (weights[i] > 0) return share(weights, i);
  for (const deal of [DEAL_3, DEAL_2]) if (deal[key][i] > 0) return share(deal[key], i);
  return share(weights, i, slot);
};

/** Each of a guy's twelve traits and how likely it was, always in `TRAIT_SLOTS` order. */
export function traitOdds(config: AvatarConfig): TraitOdds[] {
  // What he shows: a marking or cheeks a crowded guy has no room for count as none.
  const body = shows(config, 'body') ? config.body : 0, cheek = shows(config, 'cheeks') ? config.cheeks : 0;
  return [
    { slot: 'shape', name: heads[config.head].name, chance: dealt('head', headWeights, config.head, 'head') },
    { slot: 'eyes', name: eyes[config.eyes].name, chance: share(withoutRetired(eyeWeights, RETIRED_EYES), config.eyes, 'eyes') },
    { slot: 'mouth', name: mouths[config.mouth].name, chance: dealt('mouth', mouthWeights, config.mouth, 'mouth') },
    { slot: 'cheeks', name: cheeks[cheek].name, chance: dealt('cheeks', cheekWeights, cheek, 'cheeks') },
    { slot: 'topper', name: hair[config.hair].name, chance: dealt('hair', hairWeights, config.hair, 'hair') },
    { slot: 'markings', name: bodies[body].name, chance: dealt('body', bodyWeights, body, 'body') },
    { slot: 'accessory', name: accessories[config.accessory].name, chance: dealt('accessory', accessoryWeights, config.accessory, 'accessory') },
    { slot: 'colour', name: palettes[shownPalette(config)].name, chance: dealt('palette', paletteWeights, config.palette, 'palette') },
    { slot: 'tone', name: TONE_NAMES[config.shade], chance: share(shadeWeights, config.shade) },
    { slot: 'arms', name: ARM_NAMES[config.arms], chance: share(armWeights, config.arms) },
    { slot: 'feet', name: FOOT_NAMES[config.feet], chance: share(footWeights, config.feet) },
    { slot: 'lucky', name: config.lucky ? 'Lucky' : 'regular', chance: config.lucky ? 1 / LUCKY_ODDS : 1 - 1 / LUCKY_ODDS },
  ];
}

/** One in how many guys has exactly this combination. */
export function guyOneIn(config: AvatarConfig): number {
  return 1 / traitOdds(config).reduce((p, t) => p * t.chance, 1);
}

/** One in how many capsules for its game give a copy at least this good. */
export function copyOneIn(o: Owned): number {
  return oneIn(o, true);
}

/**
 * One in how many capsules give a copy that looks like this one: its item, its
 * finish, a famous print if it has one, its effect and, for an aura, which
 * aura. What the eye can see, so it is what a card leads with; the float and a
 * tally, which you can't see, are left out (`copyOneIn` has them).
 */
export function visibleOneIn(o: Owned): number {
  return oneIn(o, false);
}

function oneIn(o: Owned, unseen: boolean): number {
  const item = itemById(o.item);
  if (!item) return Infinity;
  const f = FINISHES[o.finish];
  // An aura comes from any capsule: this aura, in this finish.
  let p = f.aura ? AURA_ODDS * (1 / AURAS.length) * (f.aura / 100)
    : (itemWeight(item) / gameItems(item.game).filter(i => !i.free && i.slot !== 'aura').reduce((a, i) => a + itemWeight(i), 0)) * (f.odds / 100) * (item.game === 'club' ? 1 : 1 - AURA_ODDS);

  // The print only matters when it is one of the famous ones.
  if (special(o) === 'Deep Blue') p *= DEEP_BLUE_PRINTS.length / 1000;
  else if (special(o)) p *= 1 / 20;

  if (unseen) {
    // A scuff at least this low, within the finish's range.
    const [lo, hi] = f.scuffs;
    p *= Math.max(1e-7, (o.scuff - lo) / (hi - lo));
    if (o.tally !== undefined) p *= 0.1;
  }
  // A showpiece always has its own effect; only a different one is the lucky roll.
  if (o.fx && o.fx !== item.signature) p *= 1 / EFFECTS[o.fx][f.aura ? 'aura' : 'item'];
  return 1 / p;
}

/** A guy's tiers, commonest first: each is the share of guys at least that rare. */
export const GUY_TIERS = [
  { id: 'common', name: 'Common', top: 1 },
  { id: 'uncommon', name: 'Uncommon', top: 0.5 },
  { id: 'rare', name: 'Rare', top: 0.1 },
  { id: 'epic', name: 'Epic', top: 0.01 },
  { id: 'legendary', name: 'Legendary', top: 0.001 },
  { id: 'mythic', name: 'Mythic', top: 0.0001 },
] as const;

export interface GuyRank {
  /** The share of guys at least this rare, 0–1: 0.003 is the rarest 0.3%. */
  top: number;
  /** Index into `GUY_TIERS`, 0 Common to 5 Mythic. */
  tier: number;
  name: string;
  /** "Top 0.3%", or "Common" for the commoner half. */
  label: string;
}

/**
 * What a guy's rank is measured on: the odds of his whole combination, with his
 * single rarest trait counted twice. One standout (galaxy eyes, Lucky) is what
 * people see as rare, more than a handful of slightly unusual picks.
 */
export function guyScore(config: AvatarConfig): number {
  const logs = traitOdds(config).map(t => -Math.log10(t.chance));
  return logs.reduce((a, b) => a + b, 0) + Math.max(...logs);
}

/**
 * The founder's rank (./founder). He was picked by hand, not dealt, so his
 * traits' odds don't place him: he is the one of one, at the top tier.
 */
export const FOUNDER_RANK: GuyRank = { top: 0, tier: GUY_TIERS.length - 1, name: 'Founder', label: 'One of one' };

/**
 * Where a guy stands among every guy dealt: "one in 56 billion" says every
 * combination is unique, which they all are, so a card shows this instead.
 * The founder (`founder: true`, as `resolve` gives him) is `FOUNDER_RANK`.
 */
export function guyRank(config: AvatarConfig): GuyRank {
  if (config.founder) return { ...FOUNDER_RANK };
  const v = guyScore(config), last = GUY_RANK[GUY_RANK.length - 1];
  let top = 1;
  if (v > last[0]) top = last[1] * 10 ** (last[0] - v);          // past the table: rarer by as much again
  else {
    const i = GUY_RANK.findIndex(([a]) => v <= a);
    if (i > 0) {
      // Between two points, on a log scale of the share.
      const [a, pa] = GUY_RANK[i - 1], [b, pb] = GUY_RANK[i];
      top = 10 ** (Math.log10(pa) + (Math.log10(pb) - Math.log10(pa)) * (v - a) / (b - a));
    }
  }
  // A chase part (galaxy eyes, Lucky: rarer than 1 in 200) makes a guy rare
  // however plain the rest of him is: few guys have any trait that rare.
  const rarest = Math.min(...traitOdds(config).map(t => t.chance));
  if (rarest < 0.005) top = Math.min(top, rarest * 3);
  const pct = top * 100;
  const shown = pct >= 10 ? Math.round(pct) : pct >= 1 ? +pct.toFixed(1) : +pct.toPrecision(2);
  // The tier follows the share as shown, so a card never says "Top 0.1%" and Epic.
  const tier = GUY_TIERS.reduce((k, t, i) => (shown / 100 <= t.top ? i : k), 0);
  return { top, tier, name: GUY_TIERS[tier].name, label: top > 0.5 ? 'Common' : `Top ${shown}%` };
}
