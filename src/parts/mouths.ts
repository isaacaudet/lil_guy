import { stamp, type Stamp } from './art';

/** Mouths with attitude. Top row one below the eye line. */
export interface Mouth { name: string; art: Stamp }
const mouth = (name: string, rows: string[]): Mouth => ({ name, art: stamp(rows) });

export const mouths: Mouth[] = [
  mouth('smirk', ['...m', 'mmm.']),
  mouth('flat', ['mmmm']),
  mouth('toothy', ['mwwwwm', '.mmmm.']),
  mouth('tongue', ['mmmm', '..t.']),
  mouth('fang', ['mmmm', '.w..']),
  mouth('grin', ['mmmm', 'mttm', '.mm.']),
  mouth('ooh', ['mm', 'mm']),
  mouth('gritted', ['mmmmmm', 'mwmwmm']),
  mouth('gum', ['mm.cc', '...cc']),
];
