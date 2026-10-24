import { stamp, type Stamp } from './art';

/** Eyes with attitude: cool, smug, fired up. Bottom row sits on the eye line. */
export interface Eyes { name: string; art: Stamp }
const eyes_ = (name: string, rows: string[]): Eyes => ({ name, art: stamp(rows) });

export const eyes: Eyes[] = [
  eyes_('chill', ['ss....ss', 'ee....ee']),
  eyes_('beady', ['e....e', 'e....e']),
  eyes_('stare', ['we....we', 'ee....ee']),
  eyes_('side-eye', ['ss....ss', 'we....we']),
  eyes_('squint', ['ee....ee']),
  eyes_('wink', ['we......', 'ee...eee']),
  eyes_('fired up', ['o......o', '.o....o.', 'ee....ee']),
  eyes_('shades', ['weee..weee', '.ee....ee.']),
  eyes_('star', ['.y....y.', 'yyy..yyy', '.y....y.']),
  eyes_('laser', ['rr....rr', 'rr....rr']),
];
