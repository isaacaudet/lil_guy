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
  cheeks_('band-aid', [
    '.......xx.',
  ]),
  cheeks_('war paint', [
    'rr......rr',
  ]),
  // Deep shade rather than outline: an outline-coloured cell at the edge
  // would cost the body its own outline beside it.
  cheeks_('whiskers', [
    'mm......mm',
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
  // The rarest: cheeks pressed with gold leaf.
  cheeks_('gold leaf', [
    'yY......Yy',
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
];
