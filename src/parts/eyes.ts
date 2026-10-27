import { stamp, type Stamp } from './art';

/**
 * Eyes, drawn as a pair and centred on the seam. The bottom row of each
 * drawing sits on the head's eye line, so taller eyes grow upwards into the
 * forehead rather than down into the mouth.
 *
 * Every pair keeps the same spacing — the inner edges four columns apart —
 * which is the wide-set look that reads as friendly. Any eye with a solid
 * dark area gets a white catchlight: a flat dark square with no shine is what
 * made the old set look dead-eyed.
 */
export interface Eyes {
  name: string;
  art: Stamp;
}

const eyes_ = (name: string, rows: string[]): Eyes => ({ name, art: stamp(rows) });

export const eyes: Eyes[] = [
  // Sat a row up, with a row of face under them, so no mouth ever runs into them.
  eyes_('beans', [
    'e....e',
    'e....e',
    '......',
  ]),
  eyes_('shiny', [
    'we....we',
    'ee....ee',
  ]),
  // Shut and smiling: two soft arches.
  eyes_('happy', [
    '.ee....ee.',
    'e..e..e..e',
  ]),
  eyes_('sparkle', [
    'we....we',
    'ee....ee',
    'ee....ee',
  ]),
  eyes_('wink', [
    'we....e.',
    'ee...e.e',
  ]),
  eyes_('glossy', [
    'we....we',
    'ee....ee',
    'ew....ew',
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
    'ee....ee',
  ]),
  eyes_('side-eye', [
    'ss....ss',
    'ew....ew',
    'ee....ee',
  ]),
  // Two small lenses on a bridge: wide ones angled in read as a scowl, and a full bar as a mask.
  eyes_('shades', [
    'weeeewee',
    'eee..eee',
  ]),
  eyes_('star', [
    '.y....y.',
    'yyy..yyy',
    '.y....y.',
  ]),
  // Edgier, and rarer still.
  // Narrowed under a heavy lid, a glint in each corner.
  eyes_('squint', [
    'eee..eee',
    'wee..eew',
  ]),
  // A flame burning in each eye.
  eyes_('fired up', [
    '.y....y.',
    'yry..yry',
    'ere..ere',
  ]),
  // A white-hot core and a flare streaking out to each side: a red patch
  // with a white dot in it read as blush.
  eyes_('laser', [
    '..r....r..',
    'rrw....wrr',
    '..r....r..',
  ]),
  eyes_('cyclops', [
    '.ww.',
    'weee',
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
  eyes_('anime', [
    '.eee..eee.',
    'eewe..ewee',
    '.eae..eae.',
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
];
