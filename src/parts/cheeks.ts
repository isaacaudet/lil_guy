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
  cheeks_('freckles', [
    's.s....s.s',
  ]),
];
