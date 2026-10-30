import { cycle, fit, steps, tick, wave, wrap } from './loop';
/**
 * Effects: a rare layer a copy can roll on top of its finish, the way a knife
 * has its phase. Every copy from a capsule rolls once for one, on its own,
 * whatever its finish or grade; an aura is far more likely to get one, so aura
 * effects make a ladder of their own. They run from Shimmer, one copy in 25,
 * to Electric, one in 4,000. Listed commonest first; new ones are added in
 * their place on the ladder (copies keep the effect they rolled).
 *
 * An effect moves in `animate`, and shows in a still picture as it stands at
 * the start. It never changes the item's own drawing, only how it shines.
 */
export type Fx = 'shimmer' | 'pulse' | 'holo' | 'neon' | 'bubbles' | 'hearts' | 'chroma' | 'rime' | 'embers' | 'static' | 'lava' | 'starlight' | 'electric';

export interface Effect {
  name: string;
  /** One line on what it does. */
  what: string;
  /** About one item copy in this many has it. */
  item: number;
  /** About one aura in this many has it. */
  aura: number;
}

export const EFFECTS: Record<Fx, Effect> = {
  shimmer:   { name: 'Shimmer',   what: 'Glints race across it.', item: 25, aura: 5 },
  pulse:     { name: 'Pulse',     what: 'It breathes, brightening and dimming.', item: 60, aura: 10 },
  holo:      { name: 'Holo',      what: 'A rainbow sheen sweeps across it, like foil.', item: 150, aura: 25 },
  neon:      { name: 'Neon',      what: 'A buzzing neon edge runs round it.', item: 250, aura: 30 },
  bubbles:   { name: 'Bubbles',   what: 'Bubbles wobble up off it.', item: 350, aura: 40 },
  hearts:    { name: 'Hearts',    what: 'Little hearts float up off it.', item: 500, aura: 60 },
  chroma:    { name: 'Chroma',    what: 'Its colours cycle round the rainbow.', item: 600, aura: 80 },
  rime:      { name: 'Rime',      what: 'Frost creeps over it from the edges and melts away.', item: 800, aura: 100 },
  embers:    { name: 'Embers',    what: 'Sparks drift up off it.', item: 1000, aura: 150 },
  static:    { name: 'Static',    what: 'It glitches: rows slip sideways and its colours split.', item: 1200, aura: 200 },
  lava:      { name: 'Lava',      what: 'Molten light flows up through it under a dark crust.', item: 1800, aura: 300 },
  starlight: { name: 'Starlight', what: 'Stars twinkle inside it, like a night sky.', item: 2500, aura: 400 },
  electric:  { name: 'Electric',  what: 'Lightning crackles round it and it flashes white.', item: 4000, aura: 600 },
};

export const FX_IDS = Object.keys(EFFECTS) as Fx[];

/**
 * Each effect's badge: a five-by-five picture of it in its own colours, for a
 * card's corner and anywhere a copy's effect is named. Each letter is a
 * colour in `BADGE_INKS`; `.` is empty.
 */
export const FX_BADGES: Record<Fx, string[]> = {
  shimmer:   ['..w..', '..s..', 'wsWsw', '..s..', '..w..'],
  pulse:     ['.vvv.', 'v...v', 'v.W.v', 'v...v', '.vvv.'],
  holo:      ['r.y.g', '.y.g.', 'y.g.b', '.g.b.', 'g.b.v'],
  neon:      ['.ppp.', 'p...p', 'p...p', 'p...p', '.ppp.'],
  bubbles:   ['.bb..', 'bWb..', '.bb..', '...bb', '...bW'],
  hearts:    ['pp.pp', 'pPPPp', 'pPPPp', '.pPp.', '..p..'],
  chroma:    ['rrrrr', 'yyyyy', 'ggggg', 'bbbbb', 'vvvvv'],
  rime:      ['s.s.s', '.sWs.', 'sWWWs', '.sWs.', 's.s.s'],
  embers:    ['..o..', '.oy..', '.oyo.', 'oyWyo', '.ooo.'],
  static:    ['rrr..', '..ccc', 'rrrr.', '.cccc', 'rr...'],
  lava:      ['..o..', '.oyo.', 'oyWyo', 'oyyyo', '.ooo.'],
  starlight: ['..W..', '..v..', 'WvWvW', '..v..', '..W..'],
  electric:  ['..yy.', '.yy..', 'yyyyy', '..yy.', '.yy..'],
};
/** The colours a badge is drawn in. */
export const BADGE_INKS: Record<string, string> = {
  W: '#FFFFFF', w: '#E6F4FF', s: '#9ED8FF', v: '#A98BFF', r: '#FF5A6E', y: '#FFD23F', g: '#5FD38A', b: '#5FA8FF',
  p: '#FF6FAE', P: '#FFC2DB', o: '#FF8A2B', c: '#3DD8FF',
};

/** The effect a uniform number in [0, 1) gives, rarest checked first, or none. */
export function rollFx(u: number, aura: boolean): Fx | undefined {
  let edge = 0;
  for (const id of [...FX_IDS].reverse()) {
    edge += 1 / EFFECTS[id][aura ? 'aura' : 'item'];
    if (u < edge) return id;
  }
  return undefined;
}

type RGB = [number, number, number];
const rgb = (h: string): RGB => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) as RGB;
const hex = (c: RGB) => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map(i => a[i] + (b[i] - a[i]) * t) as RGB;
const WHITE: RGB = [255, 255, 255];

function noise(...n: number[]): number {
  let h = 0x9e3779b9;
  for (const v of n) {
    h = Math.imul(h ^ v, 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return (h >>> 0) / 4294967296;
}

const hue = (h: number, s = 0.9, l = 0.65): RGB => {
  const f = (n: number) => {
    const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };
  return [f(0), f(8), f(4)];
};

/** A Neon copy's tube: one colour from a sign maker's set, dealt by its print, never the whole wheel. */
const NEON_TUBES: RGB[] = [[255, 63, 164], [47, 217, 255], [255, 90, 60], [180, 92, 255], [61, 255, 143], [255, 194, 58]];
const neonTube = (print: number) => NEON_TUBES[print % NEON_TUBES.length];

/**
 * The finishes an effect repaints whole: Plain and Sunset, the commonest, so
 * a cheap copy with an effect changes a lot, and an aura's own, whose few
 * scattered cells the effect only marks. On every other finish an effect is a
 * layer over it (`layered`): the finish shows through and the effect runs
 * over it as a band, a sheen or a few cells, never as a new coat of paint, so
 * a Deep Blue with Chroma looks like both.
 */
const REPAINTS = new Set(['plain', 'sunset', 'classic', 'fade', 'frost', 'toxic', 'shadow', 'sapphire', 'ruby', 'pearl']);

/** Whether an effect on a copy in `finish` is a layer over the finish rather than a repaint of it. */
export const layered = (finish: string | undefined): boolean => !!finish && !REPAINTS.has(finish);

/** A colour's lightness, 0 to 1. */
const light = (c: RGB) => (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11) / 255;

/**
 * One pixel of a copy with an effect, at `t` ms; `print` offsets it so no two
 * copies move together. Given the copy's `finish`, an effect that recolours
 * is laid over a finish other than Plain or Sunset instead of repainting it
 * (`layered`).
 */
export function fxColor(color: string, fx: Fx, x: number, y: number, t: number, print = 0, finish?: string): string {
  const c = rgb(color), tt = t + print * 37;
  if (layered(finish)) {
    const over = overFinish(c, fx, x, y, tt, print);
    if (over) return hex(over);
  }
  switch (fx) {
    case 'shimmer': {
      // Two glint bands chase across it, edged in a cool tint so they show on white too.
      const at = cycle(tt, 900) * 34 - 8;
      for (const band of [at, at - 14]) {
        const d = x + y - band;
        if (d >= 0 && d < 1.5) return '#FFFFFF';
        if (d >= -1.5 && d < 0) return hex(mix(c, [150, 220, 255], 0.75));
      }
      return noise(x, y, tick(tt, 140)) > 0.94 ? '#FFFFFF' : color;
    }
    case 'pulse':
      // Breathes in its own colour, deeper and brighter, with a glow round it (see applyFx).
      { const b = Math.sin(tt / wave(260)); return hex(mix(c, b > 0 ? WHITE : [0, 0, 0], (b > 0 ? 0.45 : 0.14) * Math.abs(b))); }
    case 'holo':
      return hex(mix(c, hue(((x * 22 + y * 14 + tt * 360 / fit(1800)) % 360 + 360) % 360), 0.45));
    case 'chroma': {
      // A rainbow rolls diagonally across it, every part taking the colour at
      // its own lightness, so the item still reads while it cycles.
      const h = ((tt * 360 / fit(2520) + (x + y) * 14) % 360 + 360) % 360, l = (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11) / 255;
      return hex(mix(c, hue(h, 0.95, Math.min(0.78, Math.max(0.32, l))), 0.78));
    }
    case 'starlight': {
      // A night sky with a slow purple-blue drift through it (the stars are in applyFx).
      const night = mix(mix(c, [24, 18, 66], 0.6), [110, 70, 220], 0.16 * (1 + Math.sin(tt / wave(700) + x * 0.5 + y * 0.3)));
      return noise(x, y, print) > 0.93 ? hex(mix(night, [210, 200, 255], 0.55)) : hex(night);
    }
    case 'embers':
      // Heat flickering up through it from below.
      return hex(mix(c, [255, 120, 40], 0.16 + 0.14 * Math.max(0, Math.sin(tt / wave(140) + x * 1.3 - y * 0.8))));
    case 'neon':
      // Lit from within in the tube's colour (see applyFx for the tube itself).
      return hex(mix(c, neonTube(print), 0.16 + 0.06 * Math.sin(tt / wave(380))));
    case 'bubbles':
      return hex(mix(c, [190, 235, 255], 0.1 + 0.08 * Math.sin(tt / wave(300) + y)));
    case 'hearts':
      return hex(mix(c, [255, 140, 190], 0.14 + 0.08 * Math.sin(tt / wave(400) + x * 0.5)));
    case 'rime': {
      // Frost spreads over it from the top and melts back in a slow breath,
      // ice crystals glinting in it.
      const reach = 0.5 + 0.5 * Math.sin(tt / wave(900) - y * 0.35);
      const n = noise(x, y, tick(tt, 400), print);
      if (reach > 0.35 && n > 0.72) return n > 0.9 ? '#FFFFFF' : '#DDF4FF';
      return hex(mix(c, [190, 228, 255], 0.3 + 0.5 * reach));
    }
    case 'static': {
      // A bright scanline rolls down it, faint lines between, and now and then
      // a burst of snow with the colours split red and blue.
      const roll = cycle(tt, 70 * 24) * 24 - 4, burst = noise(tick(tt, 90), print, 7) > 0.62;
      if (burst) { const r = noise(x, y, tick(tt, 60)); return r > 0.8 ? '#FFFFFF' : hex(mix(c, r > 0.45 ? [255, 60, 90] : [60, 200, 255], 0.55)); }
      if (Math.abs(y - roll) < 1) return hex(mix(c, WHITE, 0.45));
      return y % 2 ? hex(mix(c, [0, 0, 0], 0.16)) : color;
    }
    case 'lava': {
      // Bright veins rise through a crust darkened from the item's own colour.
      const flow = Math.sin(y * 1.1 + tt / wave(220) + Math.sin(x * 0.9 + tt / wave(700)) * 2);
      const crust = mix(c, [40, 18, 12], 0.55);
      return flow > 0.55 ? hex(mix([255, 120, 30], [255, 230, 120], (flow - 0.55) * 2.2)) : flow > 0.25 ? hex(mix(crust, [220, 70, 20], 0.6)) : hex(crust);
    }
    case 'electric': {
      // A cold blue charge with current running through it, flashing white on a strike.
      const flash = noise(tick(tt, 120), print, 11) > 0.8;
      if (flash) return hex(mix(c, WHITE, 0.7));
      const vein = Math.abs(Math.sin(x * 1.7 + y * 0.9 + tt / wave(90))) > 0.93;
      return vein ? hex(mix(c, [200, 240, 255], 0.75)) : hex(mix(c, [110, 180, 255], 0.22));
    }
  }
}

/**
 * An effect that would recolour a copy, as a layer over its finish instead
 * (`layered`), or null for one that already leaves the colour alone. Chroma is
 * a rainbow band crossing it, Holo a light foil sheen with a bright line, Lava
 * veins only in its darkest parts, Starlight a few stars and no night, Rime a
 * thin frost, Static a lighter glitch and Electric a weaker flash.
 */
function overFinish(c: RGB, fx: Fx, x: number, y: number, tt: number, print: number): RGB | null {
  switch (fx) {
    case 'chroma': {
      // A band four cells wide crossing it diagonally, each cell a step round the rainbow; a faint tint behind it.
      const at = cycle(tt, 2520) * 40 - 8, d = x + y - at, h = ((tt * 360 / fit(2520) + (x + y) * 14) % 360 + 360) % 360;
      if (d >= 0 && d < 4) return mix(c, hue((h + Math.floor(d) * 60) % 360, 0.95, Math.min(0.72, Math.max(0.4, light(c)))), 0.62);
      return mix(c, hue(h, 0.9, Math.min(0.7, Math.max(0.35, light(c)))), 0.1);
    }
    case 'holo': {
      // A light rainbow foil, and a bright line sweeping across it.
      const d = x * 0.8 + y - (cycle(tt, 1800) * 40 - 8);
      const foil = mix(c, hue(((x * 22 + y * 14 + tt * 360 / fit(1800)) % 360 + 360) % 360), 0.16);
      return d >= 0 && d < 1.2 ? mix(foil, WHITE, 0.55) : foil;
    }
    case 'lava': {
      // Molten veins only through its darkest third; the finish untouched everywhere else.
      if (light(c) > 0.3) return c;
      const flow = Math.sin(y * 1.1 + tt / wave(220) + Math.sin(x * 0.9 + tt / wave(700)) * 2);
      return flow > 0.55 ? mix([255, 120, 30], [255, 230, 120], (flow - 0.55) * 2.2) : flow > 0.25 ? mix(c, [220, 70, 20], 0.45) : mix(c, [40, 18, 12], 0.25);
    }
    case 'starlight':
      // Stars on the finish, no night sky over it (applyFx twinkles more in).
      return noise(x, y, print) > 0.93 ? mix(c, [236, 230, 255], 0.75) : c;
    case 'rime': {
      const reach = 0.5 + 0.5 * Math.sin(tt / wave(900) - y * 0.35), n = noise(x, y, tick(tt, 400), print);
      if (reach > 0.45 && n > 0.93) return n > 0.97 ? WHITE : [221, 244, 255];
      return mix(c, [200, 234, 255], 0.22 * reach);
    }
    case 'static': {
      const roll = cycle(tt, 70 * 24) * 24 - 4, burst = noise(tick(tt, 90), print, 7) > 0.62;
      if (burst) { const r = noise(x, y, tick(tt, 60)); return r > 0.9 ? WHITE : mix(c, r > 0.45 ? [255, 60, 90] : [60, 200, 255], 0.3); }
      if (Math.abs(y - roll) < 1) return mix(c, WHITE, 0.4);
      return y % 2 ? mix(c, [0, 0, 0], 0.08) : c;
    }
    case 'electric': {
      const flash = noise(tick(tt, 120), print, 11) > 0.8;
      if (flash) return mix(c, WHITE, 0.3);
      const vein = Math.abs(Math.sin(x * 1.7 + y * 0.9 + tt / wave(90))) > 0.93;
      return vein ? mix(c, [200, 240, 255], 0.5) : mix(c, [110, 180, 255], 0.06);
    }
    default: return null;
  }
}

/** Under this many cells a copy is small: its effect is pushed harder and glows round it. */
const SMALL_COPY = 80;
/** An effect that darkens an item; on a small copy it keeps more of the item's colour. */
const DARKENS: Fx[] = ['starlight'];
/** Offsets within two cells, nearest first. */
const NEAR2 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1], [2, 0], [-2, 0], [0, 2], [0, -2]];
/** Effects that already draw round the item, so no halo. */
const OWN_EDGE: Fx[] = ['neon', 'bubbles', 'hearts', 'embers', 'electric', 'rime', 'starlight'];
/** The aura's slot in a frame (FRAME_SLOTS order, from 1). */
const AURA_SLOT = 5;

/** A cross: a centre and its four neighbours. */
const cross = (a: string, b: string): [number, number, string][] => [[0, 0, a], [1, 0, b], [-1, 0, b], [0, 1, b], [0, -1, b]];

/**
 * What an effect looks like round an aura's wearer, in chunky pieces at his
 * pixel size, `f` (0 to 1) through each piece's life: what makes an aura with
 * an effect look special at a glance, not only recoloured.
 */
function signature(fx: Fx, f: number, t: number, i: number): { cells: [number, number, string][]; rise: number } {
  const rainbow = (o: number) => hex(hue(((t * 360 / fit(2880) + i * 90 + o) % 360 + 360) % 360, 1, 0.62));
  switch (fx) {
    case 'shimmer': return { cells: f < 0.3 || f > 0.7 ? [[0, 0, '#FFFFFF']] : cross('#FFFFFF', '#CDEBFF'), rise: 0 };
    case 'pulse': { const on = Math.sin(t / wave(260)) > 0; return { cells: [[0, 0, on ? '#FFFFFF' : '#C9B8FF'], [1, 0, on ? '#C9B8FF' : '#8E72FF'], [0, 1, on ? '#C9B8FF' : '#8E72FF'], [1, 1, '#8E72FF']], rise: 0 }; }
    case 'holo': case 'chroma': return { cells: cross(rainbow(0), rainbow(60)), rise: 0 };
    case 'neon': return { cells: cross('#FFFFFF', rainbow(0)), rise: 0 };
    case 'bubbles': return { cells: [[0, 0, '#FFFFFF'], [1, 0, '#9ED8FF'], [0, 1, '#9ED8FF'], [1, 1, '#5FB8F0']], rise: 6 };
    case 'hearts': return { cells: [[-1, -1, '#FF8FBE'], [1, -1, '#FF8FBE'], [-1, 0, '#FF5C9A'], [0, 0, '#FF5C9A'], [1, 0, '#FF5C9A'], [0, 1, '#E0457F']], rise: 5 };
    case 'rime': return { cells: [...cross('#FFFFFF', '#BFE6FF'), [-1, -1, '#E6F6FF'], [1, 1, '#E6F6FF'], [1, -1, '#E6F6FF'], [-1, 1, '#E6F6FF']].filter((_, k) => f > 0.3 && f < 0.7 || k < 5) as [number, number, string][], rise: -3 };
    case 'embers': return { cells: [[0, 0, f < 0.5 ? '#FFF2A8' : '#FF7A1A'], [0, 1, f < 0.5 ? '#FFC53D' : '#C2412E']], rise: 7 };
    case 'static': return { cells: f % 0.25 < 0.12 ? [[0, 0, '#FF3D6E'], [1, 0, '#FF3D6E'], [2, 0, '#3DD8FF']] : [[0, 0, '#3DD8FF'], [-1, 0, '#FFFFFF']], rise: 0 };
    case 'lava': return { cells: [[0, 0, '#FFE27A'], [1, 0, '#FF8A2B'], [0, 1, '#FF8A2B'], [1, 1, '#C2412E']], rise: 4 };
    case 'starlight': return { cells: f > 0.35 && f < 0.65 ? [...cross('#FFFFFF', '#C9BEFF'), [2, 0, '#8E72FF'], [-2, 0, '#8E72FF'], [0, 2, '#8E72FF'], [0, -2, '#8E72FF']] : cross('#FFFFFF', '#8E72FF'), rise: 0 };
    case 'electric': return { cells: f % 0.3 < 0.15 ? [[0, 0, '#FFFFFF'], [1, 1, '#7FE8FF'], [0, 2, '#FFFFFF'], [1, 3, '#7FE8FF']] : [], rise: 0 };
  }
}

/**
 * Applies the effects of the copies a frame shows: `slots` says which slot
 * each pixel belongs to (1 skin, 2 hat, 3 frame, 4 buddy, 5 aura, as in
 * `FRAME_SLOTS`), `copies` the copy in each slot. Some effects also draw in
 * the empty pixels round their copy: bubbles, hearts and embers rise off it,
 * a neon tube and electric bolts run round it.
 *
 * On an aura the effect is an accent, not a flood: the aura's own pieces take
 * it, nothing is drawn round its scattered cells, and its signature (hearts,
 * bubbles, sparks, a strike) rises off it more sparingly than off an item.
 */
export function applyFx(colors: (string | null)[][], slots: number[][], copies: (({ fx?: Fx; print: number; finish?: string }) | undefined)[], t: number): (string | null)[][] {
  if (!copies.some(o => o?.fx)) return colors;
  const out = colors.map(row => [...row]);
  const H = out.length, W = out[0].length;
  const empty = (x: number, y: number) => y >= 0 && y < H && x >= 0 && x < W && !out[y][x];
  const put = (x: number, y: number, c: string) => { if (empty(x, y)) out[y][x] = c; };
  // A small copy (a hat, a buddy) has only a few cells for its effect to show
  // in, so there it is pushed harder; one that darkens (a night sky, a crust)
  // keeps more of the item's own colour so the item still reads.
  const size = copies.map((_, k) => slots.reduce((n, row) => n + row.filter(s => s === k + 1).length, 0));
  const small = (k: number) => k + 1 !== AURA_SLOT && size[k] > 0 && size[k] < SMALL_COPY;
  slots.forEach((row, y) => row.forEach((s, x) => {
    const o = copies[s - 1];
    if (!s || !o?.fx || !colors[y][x]) return;
    const fx = fxColor(colors[y][x]!, o.fx, x, y, t, o.print, o.finish);
    const a = rgb(colors[y][x]!), b = rgb(fx);
    // An aura's own pieces take the effect whole: they are few, so it marks them without flooding.
    if (s === AURA_SLOT) { out[y][x] = fx; return; }
    // Over a finish it is a layer, never pushed past what it lays over.
    if (!small(s - 1) || layered(o.finish)) { out[y][x] = fx; return; }
    out[y][x] = hex(DARKENS.includes(o.fx) ? mix(a, b, 0.42) : mix(a, b, 1.5));
  }));
  // Round a small copy, a halo of its effect twinkles in the empty cells beside it.
  copies.forEach((o, k) => {
    if (!o?.fx || !small(k) || OWN_EDGE.includes(o.fx)) return;
    const beat = tick(t + o.print * 37, 140);
    slots.forEach((row, y) => row.forEach((s, x) => {
      if (s || colors[y][x]) return;
      // Two cells out at most: an item's own outline sits between it and the empty cells.
      const from = NEAR2.find(([dx, dy]) => slots[y + dy]?.[x + dx] === k + 1);
      if (!from || noise(x, y, beat, o.print, 17) > 0.4) return;
      out[y][x] = hex(mix(rgb(out[y + from[1]][x + from[0]]!), WHITE, 0.15));
    }));
  });
  // The cells of a copy, and its rim: its outline (the dark cells round it
  // that aren't part of anything else) and the empty cells touching it.
  const cellsOf = (k: number) => { const c: [number, number][] = []; slots.forEach((row, y) => row.forEach((s, x) => { if (s === k + 1 && colors[y][x]) c.push([x, y]); })); return c; };
  const dark = (c: string | null) => !!c && rgb(c).reduce((a, v) => a + v, 0) < 240;
  // The rim: cells outside the copy (reached from the frame's border without
  // crossing it, so never its face or anything it encloses) that touch it:
  // its outline where it has one, else the empty cells beside it.
  const edgeOf = (k: number) => {
    const outside = slots.map(row => row.map(() => false)), queue: [number, number][] = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x === 0 || y === 0 || x === W - 1 || y === H - 1) && slots[y][x] !== k + 1) { outside[y][x] = true; queue.push([x, y]); }
    while (queue.length) {
      const [x, y] = queue.pop()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || outside[ny][nx] || slots[ny][nx] === k + 1) continue;
        // Through empty cells and the outline, never through other parts of him.
        if (out[ny][nx] && slots[ny][nx] && !dark(colors[ny][nx])) continue;
        outside[ny][nx] = true; queue.push([nx, ny]);
      }
    }
    const cells: [number, number][] = [];
    slots.forEach((row, y) => row.forEach((s, x) => {
      if (s || !outside[y][x]) return;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => slots[y + dy]?.[x + dx] === k + 1)) cells.push([x, y]);
    }));
    return cells;
  };
  // Steps from each cell of a copy to its nearest cell that isn't the copy.
  const depth = (k: number) => {
    const d = new Map<number, number>(), own = cellsOf(k), mine = new Set(own.map(([x, y]) => y * W + x));
    for (const [x, y] of own) {
      let best = 9;
      for (let r = 1; r < 9 && best === 9; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) === r && !mine.has((y + dy) * W + x + dx)) best = Math.min(best, r);
      }
      d.set(y * W + x, best);
    }
    return d;
  };
  // Things that rise off the top of a copy (bubbles, hearts, sparks): a few
  // columns at a time, each rising in its own time and drifting a little.
  const risers = (o: { print: number }, k: number, spacing: number, rise: number, share: number, draw: (x: number, y: number, step: number) => void) => {
    const tops = new Map<number, number>();
    slots.forEach((row, y) => row.forEach((s, x) => { if (s === k + 1 && colors[y][x] && !tops.has(x)) tops.set(x, y); }));
    for (const [x, top] of tops) {
      if (noise(x, o.print, 5) > share) continue;
      const step = wrap(Math.floor((t + noise(x, o.print) * 4000) / steps(spacing, rise + 3)), rise + 3);
      if (step < rise) draw(x + (Math.floor(step / 2) % 2 ? 1 : 0), top - 1 - step, step);
    }
  };
  copies.forEach((o, k) => {
    if (!o?.fx) return;
    const tt = t + o.print * 37, aura = k + 1 === AURA_SLOT;
    if (o.fx === 'pulse' && !aura) {
      // A glow in the copy's own colours round its edge, there on the breath in.
      const breath = Math.sin(tt / wave(260));
      if (breath > 0.2) for (const [x, y] of cellsOf(k)) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(x + dx, y + dy, hex(mix(rgb(colors[y][x]!), WHITE, 0.25 + 0.3 * breath)));
    }
    if (o.fx === 'neon' && !aura) {
      // A tube of light round the outside in the copy's one colour, always
      // lit, glowing brighter and softer in a slow breath.
      const tube = neonTube(o.print), glow = 0.3 + 0.12 * Math.sin(tt / wave(380)), rim = edgeOf(k);
      for (const [x, y] of rim) out[y][x] = hex(mix(tube, WHITE, glow));
      // A soft glow a cell further out, where there's room.
      for (const [x, y] of rim) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(x + dx, y + dy, hex(mix(tube, [20, 12, 36], 0.5)));
    }
    if (o.fx === 'rime') {
      // Frost creeps in from the copy's edges and melts back: the edge cells
      // ice over first, then a cell or two deeper, crystals glinting in it.
      const reach = 1 + 1.6 * (0.5 + 0.5 * Math.sin(tt / wave(900)));
      for (const [key, d] of depth(k)) {
        const x = key % W, y = Math.floor(key / W);
        if (d > reach) continue;
        const glint = noise(x, y, tick(tt, 300), o.print) > (layered(o.finish) ? 0.95 : 0.82);
        out[y][x] = glint ? '#FFFFFF' : hex(mix(rgb(out[y][x]!), [214, 240, 255], aura ? 0.5 : layered(o.finish) ? (d <= 1 ? 0.3 : 0.15) : d <= 1 ? 0.85 : 0.6));
      }
      if (!aura) for (const [x, y] of edgeOf(k)) if (noise(x, y, tick(tt, 300), 3) > 0.7 && out[y][x] && dark(colors[y][x] ?? '#000000')) out[y][x] = '#BFE6FF';
    }
    if (o.fx === 'starlight') {
      // Stars open and close as little crosses inside it, and now and then a
      // shooting star crosses it.
      const deep = depth(k), inner = [...deep].filter(([, d]) => d >= 2).map(([key]) => key);
      for (let i = 0; i < 3 && inner.length; i++) {
        const at = tt + i * 333, gen = tick(at, 1000), f = cycle(at, 1000);
        const key = inner[Math.floor(noise(i, gen, o.print, 9) * inner.length)], x = key % W, y = Math.floor(key / W);
        if (f > 0.8) continue;
        out[y][x] = '#FFFFFF';
        if (f > 0.25 && f < 0.6) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (deep.has((y + dy) * W + x + dx)) out[y + dy][x + dx] = '#C9BEFF';
      }
      const shot = cycle(tt, 2600);
      if (shot < 0.25) for (const [key] of deep) { const x = key % W, y = Math.floor(key / W); const d = x - y - (shot * 40 - 12); if (d >= 0 && d < 1) out[y][x] = '#FFFFFF'; else if (d >= 1 && d < 2.5) out[y][x] = '#B9A8FF'; }
    }
    if (o.fx === 'electric') {
      // Bolts crack out from its edge and the copy flashes on a strike.
      const beat = tick(tt, 90);
      if (noise(beat, o.print, 13) > 0.45) {
        const rim = edgeOf(k);
        for (let b = 0; b < (aura ? 1 : 2) && rim.length; b++) {
          let [x, y] = rim[Math.floor(noise(beat, b, o.print) * rim.length)];
          const sx = noise(beat, b, 2) > 0.5 ? 1 : -1;
          for (let j = 0; j < 4; j++) { if (j && !empty(x, y)) break; if (j) out[y][x] = j < 2 ? '#FFFFFF' : '#7FE8FF'; x += j % 2 ? sx : 0; y -= j % 2 ? 0 : 1; }
        }
      }
    }
    if (o.fx === 'bubbles') risers(o, k, aura ? 200 : 150, 6, aura ? 0.3 : 0.55, (x, y, step) => {
      // A round bubble two cells across, a glint at its top corner, popping at the top.
      if (step >= 5) { put(x, y, '#E8F8FF'); return; }
      put(x, y, '#FFFFFF'); put(x + 1, y, '#9ED8FF'); put(x, y + 1, '#9ED8FF'); put(x + 1, y + 1, '#5FB8F0');
    });
    if (o.fx === 'hearts') risers(o, k, aura ? 260 : 210, 6, aura ? 0.25 : 0.45, (x, y) => {
      // A heart: two lobes, a middle, a point.
      for (const [dx, dy, c] of [[-1, -1, '#FF8FBE'], [1, -1, '#FF8FBE'], [-1, 0, '#FF5C9A'], [0, 0, '#FF5C9A'], [1, 0, '#FF5C9A'], [0, 1, '#E0457F']] as const) put(x + dx, y + dy, c);
    });
    if (o.fx === 'embers') risers(o, k, aura ? 120 : 100, 6, aura ? 0.35 : 0.6, (x, y, step) => {
      // A spark two cells tall, cooling as it rises.
      const c = step < 2 ? ['#FFF2A8', '#FFC53D'] : step < 4 ? ['#FFC53D', '#FF7A1A'] : ['#FF7A1A', '#C2412E'];
      put(x, y, c[0]); put(x, y + 1, c[1]);
    });
    if (aura) {
      // Round the wearer, the effect's own pieces come and go two or three cells out.
      const spots: [number, number][] = [];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (out[y][x]) continue;
        let near = 9;
        for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const c = slots[y + dy]?.[x + dx]; if (colors[y + dy]?.[x + dx] && c !== AURA_SLOT) near = Math.min(near, Math.max(Math.abs(dx), Math.abs(dy))); }
        if (near >= 2 && near <= 3) spots.push([x, y]);
      }
      const life = 1200;
      for (let i = 0; i < 3 && spots.length; i++) {
        const at = tt + (i * life) / 3, gen = tick(at, 1200), f = cycle(at, 1200);
        if (f > 0.85) continue;
        const [x, y] = spots[Math.floor(noise(i, gen, o.print, 51) * spots.length)], sg = signature(o.fx, f, tt, i);
        const dy = -Math.round(f * sg.rise);
        for (const [cx, cy, c] of sg.cells) put(x + cx, y + cy + dy, c);
      }
    }
    if (o.fx === 'static' && noise(tick(tt, 90), o.print, 7) > 0.6) {
      // A band of rows slips sideways and the edge splits red and blue.
      const yy = Math.floor(noise(tick(tt, 90), o.print, 9) * H), dir = noise(tick(tt, 90), 1) > 0.5 ? 1 : -1;
      for (const r of [yy, yy + 1]) {
        if (r >= H) continue;
        const row = out[r], copy = [...row];
        slots[r].forEach((s, x) => { if (s === k + 1 && copy[x]) { const nx = x + dir; if (nx >= 0 && nx < W) row[nx] = copy[x]; } });
      }
      if (!aura) for (const [x, y] of cellsOf(k)) { if (empty(x - 1, y)) out[y][x - 1] = '#FF3D6E'; if (empty(x + 1, y)) out[y][x + 1] = '#3DD8FF'; }
    }
  });
  return out;
}
