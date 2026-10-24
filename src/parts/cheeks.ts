import { stamp, type Stamp } from './art';

/** Marks under the eyes. Drawn before the mouth. */
export interface Cheeks { name: string; art: Stamp }
const cheeks_ = (name: string, rows: string[]): Cheeks => ({ name, art: stamp(rows) });

export const cheeks: Cheeks[] = [
  cheeks_('bare', []),
  cheeks_('freckles', ['s.s....s.s']),
  cheeks_('scar', ['.......o..', '........o.']),
  cheeks_('band-aid', ['.......xx.']),
  cheeks_('war paint', ['rr......rr']),
];
