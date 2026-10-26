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
  neon:      { name: 'Neon',      what: 'A buzzing neon edge runs round it, changing colour.', item: 250, aura: 30 },
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

/** A colour turned round the wheel by `deg`, keeping how light and how strong it is. */
function turn(c: RGB, deg: number): RGB {
  const [r, g, b] = c.map(v => v / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (d < 0.04) return c;
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? 60 * (((g - b) / d) % 6) : max === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
  return hue((h + deg + 720) % 360, Math.min(1, s), l);
}

/** One pixel of a copy with an effect, at `t` ms; `print` offsets it so no two copies move together. */
export function fxColor(color: string, fx: Fx, x: number, y: number, t: number, print = 0): string {
  const c = rgb(color), tt = t + print * 37;
  switch (fx) {
    case 'shimmer': {
      // Two glint bands chase across it, edged in a cool tint so they show on white too.
      const at = ((tt % 900) / 900) * 34 - 8;
      for (const band of [at, at - 14]) {
        const d = x + y - band;
        if (d >= 0 && d < 1.5) return '#FFFFFF';
        if (d >= -1.5 && d < 0) return hex(mix(c, [150, 220, 255], 0.75));
      }
      return noise(x, y, Math.floor(tt / 140)) > 0.94 ? '#FFFFFF' : color;
    }
    case 'pulse':
      // Breathes in its own colour, deeper and brighter, with a glow round it (see applyFx).
      return hex(mix(c, Math.sin(tt / 260) > 0 ? WHITE : [0, 0, 0], 0.4 * Math.abs(Math.sin(tt / 260))));
    case 'holo':
      return hex(mix(c, hue(((x * 22 + y * 14 + tt / 5) % 360 + 360) % 360), 0.45));
    case 'chroma': {
      // White and grey parts take the cycling colour as a tint, so every item shows it.
      const turned = turn(c, tt / 9 + x * 6);
      return turned === c ? hex(mix(c, hue(((tt / 9 + x * 6) % 360 + 360) % 360, 0.9, 0.6), 0.45)) : hex(turned);
    }
    case 'starlight': {
      const n = noise(x, y, Math.floor(tt / 220), print);
      const night = mix(mix(c, [26, 18, 70], 0.62), [90, 60, 200], 0.12 * (1 + Math.sin(tt / 700 + x * 0.6 + y)));
      return n > 0.92 ? '#FFFFFF' : n > 0.84 ? hex(mix(night, [200, 180, 255], 0.7)) : hex(night);
    }
    case 'embers':
      return hex(mix(c, [255, 140, 60], 0.12 + 0.1 * Math.sin(tt / 180 + x)));
    case 'neon':
      // Lit from within in the edge's colour (see applyFx for the tube itself).
      return hex(mix(c, hue(((tt / 12) % 360 + 360) % 360, 1, 0.62), 0.18));
    case 'bubbles':
      return hex(mix(c, [190, 235, 255], 0.1 + 0.08 * Math.sin(tt / 300 + y)));
    case 'hearts':
      return hex(mix(c, [255, 140, 190], 0.14 + 0.08 * Math.sin(tt / 400 + x * 0.5)));
    case 'rime': {
      // Frost grows in from the edges of the grid and melts back, in a slow breath.
      const reach = 4 + 4 * Math.sin(tt / 1200), edge = Math.min(x, y, 15 - x, 15 - y);
      const frost = edge < reach ? 1 - edge / Math.max(1, reach) : 0;
      const n = noise(x, y, Math.floor(tt / 500), print);
      if (frost > 0.3 && n > 0.86) return '#FFFFFF';
      return hex(mix(c, [205, 235, 255], 0.75 * frost));
    }
    case 'static': {
      // Now and then the colours split: red one way, blue the other.
      const burst = noise(Math.floor(tt / 90), print, 7) > 0.7;
      // Between bursts, faint scanlines, like an old screen.
      if (!burst) return y % 2 ? hex(mix(c, [0, 0, 0], 0.12)) : color;
      const r = noise(x, y, Math.floor(tt / 60));
      return r > 0.85 ? '#FFFFFF' : hex(mix(c, r > 0.5 ? [255, 60, 90] : [60, 200, 255], 0.45));
    }
    case 'lava': {
      // Bright veins rise through a crust darkened from the item's own colour.
      const flow = Math.sin(y * 1.1 + tt / 220 + Math.sin(x * 0.9 + tt / 700) * 2);
      const crust = mix(c, [40, 18, 12], 0.55);
      return flow > 0.55 ? hex(mix([255, 120, 30], [255, 230, 120], (flow - 0.55) * 2.2)) : flow > 0.25 ? hex(mix(crust, [220, 70, 20], 0.6)) : hex(crust);
    }
    case 'electric': {
      // A flash every so often, and a cold blue cast between.
      const flash = noise(Math.floor(tt / 120), print, 11) > 0.82;
      return flash ? hex(mix(c, WHITE, 0.65)) : hex(mix(c, [120, 190, 255], 0.16));
    }
  }
}

/**
 * Applies the effects of the copies a frame shows: `slots` says which slot
 * each pixel belongs to (1 skin, 2 hat, 3 frame, 4 buddy, 5 aura, as in
 * `FRAME_SLOTS`), `copies` the copy in each slot. Embers also send sparks up
 * into the empty pixels above their copy.
 */
export function applyFx(colors: (string | null)[][], slots: number[][], copies: (({ fx?: Fx; print: number }) | undefined)[], t: number): (string | null)[][] {
  if (!copies.some(o => o?.fx)) return colors;
  const out = colors.map(row => [...row]);
  slots.forEach((row, y) => row.forEach((s, x) => {
    const o = copies[s - 1];
    if (s && o?.fx && colors[y][x]) out[y][x] = fxColor(colors[y][x]!, o.fx, x, y, t, o.print);
  }));
  copies.forEach((o, k) => {
    if (o?.fx !== 'pulse') return;
    // A glow in the copy's own colours round its edge, there on the breath in.
    const breath = Math.sin((t + o.print * 37) / 260);
    if (breath < 0.2) return;
    slots.forEach((row, y) => row.forEach((s, x) => {
      if (s !== k + 1 || !colors[y][x]) return;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (ny >= 0 && ny < out.length && nx >= 0 && nx < out[0].length && !out[ny][nx]) out[ny][nx] = hex(mix(rgb(colors[y][x]!), WHITE, 0.25 + 0.3 * breath));
      }
    }));
  });
  // The edges of a copy: empty cells beside one of its pixels.
  const edgeOf = (k: number) => {
    const cells: [number, number][] = [];
    slots.forEach((row, y) => row.forEach((s, x) => {
      if (s || out[y][x]) return;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => slots[y + dy]?.[x + dx] === k + 1)) cells.push([x, y]);
    }));
    return cells;
  };
  // Things that rise off the top of a copy (bubbles, hearts): one per column now and then.
  const risers = (o: { print: number }, k: number, spacing: number, draw: (x: number, y: number, step: number) => void) => {
    const tops = new Map<number, number>();
    slots.forEach((row, y) => row.forEach((s, x) => { if (s === k + 1 && !tops.has(x)) tops.set(x, y); }));
    for (const [x, top] of tops) {
      if (noise(x, o.print, 5) > 0.35) continue;
      const step = Math.floor((t + noise(x, o.print) * 2400) / spacing) % 9;
      if (step < 6) draw(x + (step % 4 === 3 ? 1 : 0), top - 1 - step, step);
    }
  };
  copies.forEach((o, k) => {
    if (!o?.fx) return;
    const tt = t + o.print * 37;
    if (o.fx === 'neon') {
      // A tube of light round the outside, its colour cycling, buzzing off for a beat now and then.
      if (noise(Math.floor(tt / 130), o.print, 3) > 0.93) return;
      for (const [x, y] of edgeOf(k)) out[y][x] = hex(hue(((tt / 12 + (x + y) * 8) % 360 + 360) % 360, 1, 0.6));
    }
    if (o.fx === 'electric' && noise(Math.floor(tt / 90), o.print, 13) > 0.6) {
      // Crackle: a few edge cells light white and cyan, jumping each beat.
      for (const [x, y] of edgeOf(k)) { const n = noise(x, y, Math.floor(tt / 90)); if (n > 0.72) out[y][x] = n > 0.86 ? '#FFFFFF' : '#7FE8FF'; }
    }
    if (o.fx === 'bubbles') risers(o, k, 160, (x, y, step) => { if (y >= 0 && y < out.length && x < out[0].length && !out[y][x]) out[y][x] = step > 3 ? '#E8F8FF' : '#9ED8FF'; });
    if (o.fx === 'hearts') risers(o, k, 200, (x, y) => { if (y >= 0 && y < out.length && x < out[0].length && !out[y][x]) out[y][x] = '#FF6FA8'; if (y >= 0 && x + 1 < out[0].length && !out[y][x + 1] && y < out.length) out[y][x + 1] = '#FF8FBE'; });
    if (o.fx === 'static' && noise(Math.floor(tt / 90), o.print, 7) > 0.7) {
      // A row of the copy slips a pixel sideways.
      const yy = Math.floor(noise(Math.floor(tt / 90), o.print, 9) * out.length);
      const row = out[yy], dir = noise(Math.floor(tt / 90), 1) > 0.5 ? 1 : -1, copy = [...row];
      slots[yy].forEach((s, x) => { if (s === k + 1 && copy[x]) { const nx = x + dir; if (nx >= 0 && nx < row.length) row[nx] = copy[x]; } });
    }
  });
  copies.forEach((o, k) => {
    if (o?.fx !== 'embers') return;
    const tops = new Map<number, number>();
    slots.forEach((row, y) => row.forEach((s, x) => { if (s === k + 1 && !tops.has(x)) tops.set(x, y); }));
    for (const [x, top] of tops) {
      if (noise(x, o.print, 3) > 0.45) continue;
      const rise = 5, step = Math.floor((t + noise(x, o.print) * 900) / 110) % (rise + 3), y = top - 1 - step;
      if (step < rise && y >= 0 && !out[y][x]) out[y][x] = step < 2 ? '#FFE27A' : step < 4 ? '#FF8A2B' : '#C2412E';
    }
  });
  return out;
}
