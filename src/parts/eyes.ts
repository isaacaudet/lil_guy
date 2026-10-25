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
  eyes_('beans', [
    'e....e',
    'e....e',
  ]),
  eyes_('shiny', [
    'we....we',
    'ee....ee',
  ]),
  eyes_('happy', [
    '.e....e.',
    'e.e..e.e',
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
  eyes_('hearts', [
    'r.r..r.r',
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
    'we....we',
  ]),
  eyes_('side-eye', [
    'ss....ss',
    'ew....ew',
    'ee....ee',
  ]),
  eyes_('shades', [
    'weee..weee',
    '.ee....ee.',
  ]),
  eyes_('star', [
    '.y....y.',
    'yyy..yyy',
    '.y....y.',
  ]),
  // Edgier, and rarer still.
  eyes_('squint', [
    'ee....ee',
  ]),
  eyes_('fired up', [
    'o......o',
    '.o....o.',
    'ee....ee',
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
  // Contented, eyes shut the other way up from happy.
  eyes_('sleepy', [
    'e.e....e.e',
    '.e......e.',
  ]),
  // Spirals, each turning the other way.
  eyes_('dizzy', [
    '.ee....ee.',
    'e.e....e.e',
    'ee......ee',
  ]),
  // Big eyes under a lash line that sweeps in towards the nose.
  eyes_('anime', [
    '.eee..eee.',
    '.we....we.',
    '.ee....ee.',
  ]),
  // Chase eyes, one guy in several hundred. Each is a material, not a
  // mood: a little night sky, a cut jewel in the accent, a dragon's gold.
  // The galaxy is the one pair four wide: round, so it holds a sky.
  eyes_('galaxy', [
    '.ee....ee.',
    'ewAe..ewAe',
    '.Ay....Ay.',
  ]),
  eyes_('diamond', [
    '.a......a.',
    'awA....awA',
    '.A......A.',
  ]),
  eyes_('dragon', [
    '.y......y.',
    'yey....yey',
    'YeY....YeY',
  ]),
];
