import { stamp, type Stamp } from './art';

/**
 * Eyes, drawn as a pair and centred on the seam. The bottom row of each
 * drawing sits on the head's eye line, so taller eyes grow upwards into the
 * forehead rather than down into the mouth.
 *
 * Every pair keeps the same spacing — the inner edges four columns apart —
 * which is the wide-set look that reads as friendly. Any eye with a solid
 * dark area gets a white catchlight: a flat dark square with no shine is what
 * made the old set look dead-eyed. Most also carry a pixel of the accent low
 * in the eye, a little colour on the far side from the shine, so a face isn't
 * only black dots.
 *
 * An eye's bottom row stays on the outer columns where it can (the inner
 * edges four apart): the mouth goes just under it, and a mouth pixel right
 * under an eye pixel makes them one shape (compose then has to move it).
 */
export interface Eyes {
  name: string;
  art: Stamp;
}

const eyes_ = (name: string, rows: string[]): Eyes => ({ name, art: stamp(rows) });

export const eyes: Eyes[] = [
  // Sat a row up, with a row of face under them, so no mouth ever runs into them.
  // Each bean's lower half catches a little colour.
  eyes_('beans', [
    'e....e',
    'A....A',
    '......',
  ]),
  eyes_('shiny', [
    'we....we',
    'eA....Ae',
  ]),
  // Shut and smiling: two soft arches.
  eyes_('happy', [
    '.ee....ee.',
    'e..e..e..e',
  ]),
  eyes_('sparkle', [
    'we....we',
    'ee....ee',
    'eA....Ae',
  ]),
  eyes_('wink', [
    'we....e.',
    'eA...e.e',
  ]),
  eyes_('glossy', [
    'we....we',
    'ee....ee',
    'Aw....Aw',
  ]),
  eyes_('excited', [
    'e......e',
    '.e....e.',
    'e......e',
  ]),
  // Each with a glint on its lobe, so they read as eyes and not as red spots on the skin.
  eyes_('hearts', [
    'w.r..w.r',
    'rrr..rrr',
    '.r....r.',
  ]),
  eyes_('lashes', [
    'e......e',
    '.e....e.',
    '.e....e.',
  ]),
  // A little attitude, so not every guy is pure sugar.
  eyes_('chill', [
    'ss....ss',
    'we....ew',
    'eA....Ae',
  ]),
  eyes_('side-eye', [
    'ss....ss',
    'ew....ew',
    'Ae....Ae',
  ]),
  // Shades: a bar across the brow, tinted lenses under it.
  eyes_('shades', [
    '.eeeeeeee.',
    'eAAe..eAAe',
    '.ee....ee.',
  ]),
  eyes_('star', [
    '.y....y.',
    'yyy..yyy',
    '.y....y.',
  ]),
  // Edgier, and rarer still.
  // Narrowed under a heavy lid, a glint of colour in each.
  eyes_('squint', [
    'eee..eee',
    'eA....Ae',
  ]),
  // Brows flaring up like flames, a spark burning in each eye.
  eyes_('fired up', [
    '.r......r.',
    'rre....err',
    '.ey....ye.',
  ]),
  // A dark ring round a burning core, and a red flare shooting out of each side.
  eyes_('laser', [
    '.ee....ee.',
    'rey....yer',
    '.ee....ee.',
  ]),
  eyes_('cyclops', [
    '.ww.',
    'weAe',
    'eeee',
  ]),
  // Contented, eyes shut the other way up from happy, two pixels thick.
  eyes_('sleepy', [
    'e.e....e.e',
    'eee....eee',
  ]),
  // Seeing stars: two crosses.
  eyes_('dizzy', [
    'e.e..e.e',
    '.e....e.',
    'e.e..e.e',
  ]),
  // Big eyes with a lash flicked out at the side, a shine, and a coloured iris.
  eyes_('big eyes', [
    '.ee....ee.',
    'eew....wee',
    '.aA....Aa.',
  ]),
  // Chase eyes, one guy in several hundred. Each is a material, not a
  // mood: a little night sky, a cut jewel in the accent, a dragon's gold.
  // The galaxy is the one pair four wide: round, so it holds a sky.
  // A dark sphere with a purple nebula swirling through it, a pink star and a white one.
  eyes_('galaxy', [
    '.ew....we.',
    'eAye..eyAe',
    '.Ae....eA.',
  ]),
  // A cut gem: a pale crown with a sparkle, a deep pavilion, a dark point.
  eyes_('diamond', [
    '.wa....wa.',
    'aaAe..aaAe',
    '.eA....eA.',
  ]),
  eyes_('dragon', [
    '.y......y.',
    'yey....yey',
    'YeY....YeY',
  ]),
  // The anime set: never dealt, only unlocked from a capsule (CAPSULE_ONLY in ./weights).
  // Shoujo: big glossy eyes under a dark lid, a catchlight high and another low, the iris in his accent.
  eyes_('starry', [
    '.ee....ee.',
    'ewA....Awe',
    'eAw....wAe',
  ]),
  // Kitty: gold cat's eyes, a slit pupil through each.
  eyes_('kitty', [
    '.ee....ee.',
    'yey....yey',
    'Yey....yeY',
  ]),
  // Joy: shut tight in two little carets, ^ ^.
  eyes_('joy', [
    '.e......e.',
    'e.e....e.e',
  ]),
  // Puppy: big round dark eyes, a shine high on one side and a glint low on the other.
  eyes_('puppy', [
    '.ee....ee.',
    'wee....wee',
    'eew....eew',
  ]),
];
