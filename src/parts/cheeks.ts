import { stamp, type Stamp } from './art';

/**
 * Cheeks sit on the row just under the eyes, outside them, and are drawn
 * before the mouth so a wide grin can cut through them.
 */
export interface Cheeks {
  name: string;
  art: Stamp;
}

const cheeks_ = (name: string, rows: string[]): Cheeks => ({ name, art: stamp(rows) });

export const cheeks: Cheeks[] = [
  cheeks_('bare', []),
  cheeks_('blush', [
    'cc......cc',
  ]),
  cheeks_('dot', [
    'c........c',
  ]),
  cheeks_('rosy', [
    'cc......cc',
    '.c......c.',
  ]),
  // In blush: dark dots read as spots.
  cheeks_('freckles', [
    'c.c....c.c',
  ]),
  cheeks_('scar', [
    '.......o..',
    '........o.',
  ]),
  // A plaster stuck on at a slant, its pad in the middle.
  cheeks_('band-aid', [
    '......xxc.',
    '.......cxx',
  ]),
  // Two bold stripes a side.
  cheeks_('war paint', [
    'rr......rr',
    '..........',
    'rr......rr',
  ]),
  // Two fine strokes a side, in the outline's colour: in the face's ink they were a smudge.
  cheeks_('whiskers', [
    'oo......oo',
    '..........',
    'oo......oo',
  ]),
  cheeks_('hearts', [
    'r.r....r.r',
    '.r......r.',
  ]),
  cheeks_('shine', [
    'ww......ww',
  ]),
  cheeks_('stripes', [
    'AA......AA',
    '.AA....AA.',
  ]),
  cheeks_('stars', [
    '.y......y.',
    'yyy....yyy',
    '.y......y.',
  ]),
  // The rarest: cheeks pressed with a flake of gold leaf, catching the light.
  cheeks_('gold leaf', [
    '.y......y.',
    'yYw....wYy',
  ]),
  cheeks_('flushed', [
    'cc......cc',
    'cc......cc',
  ]),
  // Bashful little marks, drawn in blush.
  cheeks_('shy', [
    'c.c....c.c',
    '.c......c.',
  ]),
  // A beauty mark on one side only.
  cheeks_('mole', [
    '..........',
    '........m.',
  ]),
  // Chase cheeks, one guy in several hundred.
  cheeks_('jewels', [
    '.a......a.',
    'awA....awA',
    '.A......A.',
  ]),
  cheeks_('rainbow', [
    'rr......rr',
    'yy......yy',
    'gg......gg',
  ]),
  // The anime set, from capsules only: a manga blush, pink hatched with red lines (////).
  cheeks_('manga blush', [
    'crcr....crcr',
    'rcrc....rcrc',
  ]),
];
