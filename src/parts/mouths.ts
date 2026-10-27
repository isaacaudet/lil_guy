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
  mouth('fang', [
    'm..m',
    '.mw.',
  ]),
  mouth('smirk', [
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
  mouth('wobble', [
    'm.mm.m',
    '.m..m.',
    '..tt..',
  ]),
  mouth('toothy', [
    'mwwwwm',
    '.mmmm.',
  ]),
  mouth('tongue out', [
    'mmmm',
    '..t.',
  ]),
  // A small, closed smile: a plain line read as bored.
  mouth('flat', [
    'm...m',
    '.mmm.',
  ]),
  // A big cheesy grin, all teeth. (Two solid rows of ink read as a block.)
  mouth('gritted', [
    'm....m',
    'mwwwwm',
    '.mmmm.',
  ]),
  // A round pink bubble with a shine, beside a small mouth.
  mouth('bubblegum', [
    '...cc.',
    'mm.cwc',
    '...cc.',
  ]),
  // Buck teeth, framed by the mouth so they show on a white guy too.
  mouth('bunny', [
    'mmmm',
    'mwwm',
  ]),
  mouth('vampire', [
    'm....m',
    '.mmmm.',
    '.w..w.',
  ]),
  mouth('wide', [
    'm....m',
    '.mmmm.',
  ]),
  // Chase mouths, one guy in several hundred.
  mouth('gold tooth', [
    'mmmmmm',
    'mwwywm',
    '.mmmm.',
  ]),
  mouth('grillz', [
    'mmmmmm',
    'mywyym',
    '.mmmm.',
  ]),
  // A curled handlebar in the face's ink, so a dark guy's is a dashing white.
  mouth('mustache', [
    'mm..mm',
    'm.mm.m',
    '..tt..',
  ]),
];
