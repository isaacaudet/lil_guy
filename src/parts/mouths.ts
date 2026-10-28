import { stamp, type Stamp } from './art';

/**
 * Mouths, centred on the seam, top row one below the eye line. Every one of
 * them is pleased about something: there are no frowns, no bared teeth and no
 * flat lines here, so no eyes-and-mouth pairing can come out glum.
 */
export interface Mouth {
  name: string;
  art: Stamp;
}

const mouth = (name: string, rows: string[]): Mouth => ({ name, art: stamp(rows) });

export const mouths: Mouth[] = [
  mouth('smile', [
    'm..m',
    '.mm.',
  ]),
  mouth('cat', [
    'm.mm.m',
    '.m..m.',
  ]),
  mouth('laugh', [
    'mmmm',
    'mttm',
    '.mm.',
  ]),
  mouth('beak', [
    'm.m',
    '.m.',
  ]),
  mouth('blep', [
    'm..m',
    '.mm.',
    '..t.',
  ]),
  mouth('grin', [
    'mmmmmm',
    '.mttm.',
  ]),
  // Open, a tongue in it and one fang hanging from the top.
  mouth('fang', [
    'mmmm',
    'mwtm',
    '.mm.',
  ]),
  // Lopsided, and a row lower than the rest, clear of the eyes.
  mouth('smirk', [
    '....',
    '...m',
    'mmm.',
  ]),
  mouth('ooh', [
    '.mm.',
    'mttm',
    '.mm.',
  ]),
  mouth('tiny', [
    '.mm.',
  ]),
  // A wavy, giddy line.
  mouth('wobble', [
    'm.m.m.',
    '.m.m.m',
  ]),
  mouth('toothy', [
    'mwwwwm',
    '.mmmm.',
  ]),
  mouth('tongue out', [
    'mmmm',
    '..t.',
  ]),
  // A level line over a soft pink lip: content, not bored.
  mouth('flat', [
    'mmmm',
    '.tt.',
  ]),
  // Teeth clenched in a big, sheepish grin: one white bar, rounded off.
  mouth('gritted', [
    '.mmmm.',
    'mwwwwm',
    '.mmmm.',
  ]),
  // Blowing a round pink bubble, with a shine on it.
  mouth('bubblegum', [
    '.cccc.',
    'cwcccc',
    '.cccc.',
  ]),
  // Buck teeth, framed by the mouth so they show on a white guy too.
  mouth('bunny', [
    'mmmm',
    'mwwm',
  ]),
  // A grin with two fangs at its corners.
  mouth('vampire', [
    'm....m',
    'mwmmwm',
    '.mmmm.',
  ]),
  mouth('wide', [
    'm....m',
    '.mmmm.',
  ]),
  // Chase mouths, one guy in several hundred.
  // An open grin, one of its teeth gold.
  mouth('gold tooth', [
    'm....m',
    'mwwywm',
    '.mmmm.',
  ]),
  // A grin full of gold.
  mouth('grillz', [
    'mmmmmm',
    'myYyYm',
    '.mmmm.',
  ]),
  // A handlebar curled up at both ends, in the face's ink, so a dark guy's is a dashing white.
  mouth('mustache', [
    'mm..mm',
    'mmmmmm',
    '..mm..',
  ]),
  // The anime set: never dealt, only unlocked from a capsule (CAPSULE_ONLY in ./weights).
  // Puckered up for a kiss, a little 3.
  mouth('kissy', [
    'mm',
    '.m',
    'mm',
  ]),
  // Wide open and shouting for joy, a triangle with a tongue in it.
  mouth('yay', [
    'mmmmm',
    '.mtm.',
    '..m..',
  ]),
  // Tehe: a smile with the tip of the tongue poking out of one corner.
  mouth('tehe', [
    'm....m',
    '.mmmm.',
    '...tt.',
  ]),
];
