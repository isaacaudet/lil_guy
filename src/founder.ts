import { heads, eyes, mouths, cheeks, hair } from './parts';
import { palettes } from './palette';
import type { Owned } from './owned';

/**
 * The founder: the lil guys site keeps the name "isaac" for the person who
 * made the DLE Club, and deals him this seed. He isn't dealt from it: he is a
 * clean guy in a crown, picked by hand, so `resolve(FOUNDER_SEED)` gives this
 * look with `founder: true`, and `guyRank` ranks him the one of one rather
 * than by his traits' odds. Anything that draws or ranks a guy from the
 * library (the site, the Worker, the club's games) agrees.
 */
export const FOUNDER_SEED = 'founder:isaac';

const byName = (list: readonly { name: string }[], name: string) => list.findIndex(x => x.name === name);

/** His parts (laid over his seed's rotation) and colourway. */
export const FOUNDER_LOOK = {
  parts: {
    head: byName(heads, 'round'), eyes: byName(eyes, 'glossy'), mouth: byName(mouths, 'smile'), cheeks: byName(cheeks, 'blush'),
    hair: byName(hair, 'crown'), body: 0, accessory: 0, arms: 2, feet: 0, shade: 1, flip: false, lucky: false,
  },
  palette: byName(palettes, 'Ocean'),
};

/** The two copies no capsule gives, both his: the Gold flag and the Origin aura. */
export const FOUNDER_COPIES: { flag: Owned; aura: Owned } = {
  flag: { item: 'trackdle.flag', finish: 'gold', scuff: 0, print: 1, tally: 999, pins: ['crown', 'star', 'flame'] },
  aura: { item: 'aura.origin', finish: 'classic', scuff: 0, print: 1, fx: 'shimmer' },
};

/** Whether a seed is the founder's. */
export const isFounder = (seed: string): boolean => seed === FOUNDER_SEED;

/** Whether a copy is one of the founder's own, which no capsule gives (in his locker, nobody else's). */
export const isFounderCopy = (o: Owned): boolean =>
  o.item === FOUNDER_COPIES.aura.item || (o.item === FOUNDER_COPIES.flag.item && o.finish === 'gold' && o.tally === 999 && o.print === 1);
