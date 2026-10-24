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
  mouth('flat', [
    'mmmm',
  ]),
  mouth('gritted', [
    'mmmmmm',
    'mwmwmm',
  ]),
  mouth('bubblegum', [
    'mm.cc',
    '...cc',
  ]),
];
