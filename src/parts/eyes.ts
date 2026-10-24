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
  eyes_('content', [
    'e.e..e.e',
    '.e....e.',
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
  eyes_('glance', [
    'ew....ew',
    'ee....ee',
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
];
