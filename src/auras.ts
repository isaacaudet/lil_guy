import type { Item } from './items';
import type { Owned } from './owned';

/**
 * Auras: the top of the ladder, above a Grail. An aura is an effect drawn in
 * the empty pixels round a guy, never over him, so it shows on a board row as
 * well as on a card, and it moves whenever he does.
 *
 * About one capsule in a thousand, from any machine, is an aura instead of the
 * machine's own item (`AURA_ODDS`). A copy of one has a finish of its own (the
 * aura finishes in ./owned), a float and a print like any copy, and here they
 * show: a low float is a dense aura, a battered one flickers with gaps, and the
 * print sets its timing and which way it turns.
 */

/** One capsule in this many is an aura. */
export const AURA_ODDS = 1 / 1000;

/** A cell of an aura: where, and which of its colours (0 brightest). */
export type AuraCell = [x: number, y: number, k: number];

/** Where the guy is: `true` for each pixel he covers. */
export type Mask = boolean[][];

export interface Aura extends Pick<Item, 'id' | 'name' | 'colors'> {
  /** The cells to light at `t` ms, round the guy in `mask`. */
  cells: (mask: Mask, t: number, print: number) => AuraCell[];
  /** The moment a still picture shows. */
  still: number;
}

/** A well-mixed number in [0, 1) from integers. */
function noise(...n: number[]): number {
  let h = 0x9e3779b9;
  for (const v of n) {
    h = Math.imul(h ^ v, 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return (h >>> 0) / 4294967296;
}

/** The guy's extent, and the top of each column. */
function shape(mask: Mask) {
  const h = mask.length, w = mask[0].length;
  let top = h, bottom = -1, left = w, right = -1;
  const tops = new Array<number>(w).fill(-1);
  mask.forEach((row, y) => row.forEach((on, x) => {
    if (!on) return;
    top = Math.min(top, y); bottom = Math.max(bottom, y); left = Math.min(left, x); right = Math.max(right, x);
    if (tops[x] < 0) tops[x] = y;
  }));
  return { w, h, top, bottom, left, right, tops, cx: (left + right) / 2, cy: (top + bottom) / 2 };
}

/** Every empty cell within `reach` of the guy (by steps), with how far it is. */
function ring(mask: Mask, reach: number): [number, number, number][] {
  const h = mask.length, w = mask[0].length, out: [number, number, number][] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (mask[y][x]) continue;
    let d = Infinity;
    for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) {
      if (mask[y + dy]?.[x + dx]) d = Math.min(d, Math.max(Math.abs(dx), Math.abs(dy)));
    }
    if (d <= reach) out.push([x, y, d]);
  }
  return out;
}

const plus = (x: number, y: number, k: number, arm = 1): AuraCell[] => [[x, y, 0], [x - arm, y, k], [x + arm, y, k], [x, y - arm, k], [x, y + arm, k]];
const wrap = (v: number, n: number) => ((v % n) + n) % n;

export const AURAS: Aura[] = [
  {
    id: 'aura.flames', name: 'Flames', colors: ['#FFE27A', '#FF8A2B', '#E5484D'], still: 300,
    cells: (mask, t, print) => {
      const s = shape(mask), step = Math.floor(t / 110) + print, out: AuraCell[] = [];
      s.tops.forEach((top, x) => {
        if (top < 0) return;
        const tall = 1 + Math.floor(noise(x, step) * 3.2);
        for (let k = 1; k <= tall; k++) out.push([x, top - k, Math.min(2, k - 1)]);
      });
      mask.forEach((row, y) => row.forEach((on, x) => {
        if (on) for (const dx of [-1, 1]) if (!row[x + dx] && noise(x + dx, y, step) > 0.86) out.push([x + dx, y - 1, 1]);
      }));
      return out;
    },
  },
  {
    id: 'aura.orbit', name: 'Orbit', colors: ['#FFFFFF', '#FFD45C', '#C98A1A'], still: 900,
    cells: (mask, t, print) => {
      // A tilted ring round his head, where he's narrowest, kept inside the frame.
      const s = shape(mask), out: AuraCell[] = [], turn = print % 2 ? -1 : 1, rx = Math.min(6.5, s.w / 2 - 1.5);
      for (let i = 0; i < 3; i++) {
        const a = turn * t / 560 + i * 2.094 + print;
        out.push(...plus(Math.round(s.w / 2 - 0.5 + Math.cos(a) * rx), Math.round(s.top + 1 + Math.sin(a) * 1.6), 1));
      }
      return out;
    },
  },
  {
    id: 'aura.halo', name: 'Halo', colors: ['#FFFFFF', '#FFD45C', '#B97A10'], still: 0,
    cells: (mask, t, print) => {
      const s = shape(mask), y = Math.max(1, s.top - 2 - (Math.floor((t + print * 7) / 400) % 2)), x0 = Math.round(s.cx) - 3, glint = Math.floor(t / 160) % 8, out: AuraCell[] = [];
      for (let x = x0; x <= x0 + 7; x++) out.push([x, y, x - x0 === glint || x - x0 === glint + 1 ? 0 : 1]);
      for (let x = x0 + 1; x <= x0 + 6; x++) out.push([x, y + 1, 2]);
      return out;
    },
  },
  {
    id: 'aura.sparkles', name: 'Sparkles', colors: ['#FFFFFF', '#FFF3B0', '#8FD8FF'], still: 500,
    cells: (mask, t, print) => {
      const near = ring(mask, 3), out: AuraCell[] = [];
      for (let i = 0; i < 5; i++) {
        const life = Math.floor((t + i * 173 + print * 11) / 520), phase = ((t + i * 173 + print * 11) % 520) / 520;
        const [x, y] = near[Math.floor(noise(i, life, print) * near.length)] ?? [0, 0];
        out.push(...(phase < 0.35 || phase > 0.85 ? [[x, y, 0] as AuraCell] : plus(x, y, phase < 0.6 ? 1 : 2)));
      }
      return out;
    },
  },
  {
    id: 'aura.hearts', name: 'Hearts', colors: ['#FFC2D4', '#FF5C8A', '#C2335F'], still: 700,
    cells: (mask, t, print) => {
      // Hearts float up the top corners and over his head, and fade at the top.
      const s = shape(mask), out: AuraCell[] = [], lanes = [0, s.w - 3, Math.round(s.w / 2) - 1];
      for (let i = 0; i < 3; i++) {
        const span = i === 2 ? Math.max(3, s.top) : s.cy + 1, y = Math.round(span - wrap(Math.floor((t + i * 520 + print * 13) / 150), span + 3));
        const x = lanes[i];
        out.push([x, y, 1], [x + 2, y, 1], [x, y + 1, 1], [x + 1, y + 1, 0], [x + 2, y + 1, 1], [x + 1, y + 2, 2]);
      }
      return out;
    },
  },
  {
    id: 'aura.bubbles', name: 'Bubbles', colors: ['#FFFFFF', '#A9E4FF', '#3E9BE0'], still: 400,
    cells: (mask, t, print) => {
      const s = shape(mask), out: AuraCell[] = [];
      for (let i = 0; i < 4; i++) {
        const x = [0, s.w - 3, 1, s.w - 4][i], y = s.h - 1 - wrap(Math.floor((t + i * 470 + print * 9) / 120), s.h + 3);
        const big = i % 2 === 0;
        if (big) out.push([x + 1, y, 1], [x, y + 1, 2], [x + 2, y + 1, 2], [x + 1, y + 2, 1], [x + 1, y + 1, -1]);
        else out.push([x, y, 1], [x + 1, y, 0], [x, y + 1, 2], [x + 1, y + 1, 1]);
      }
      return out.filter(c => c[2] >= 0);
    },
  },
  {
    id: 'aura.storm', name: 'Rain cloud', colors: ['#F4F6FB', '#B9C3D6', '#4F8BE8'], still: 600,
    cells: (mask, t, print) => {
      const s = shape(mask), cy = Math.max(1, s.top - 3), x0 = Math.round(s.cx) - 3, out: AuraCell[] = [];
      for (let x = x0 + 1; x <= x0 + 2; x++) out.push([x, cy - 2, 0]);
      for (let x = x0; x <= x0 + 5; x++) out.push([x, cy - 1, 0]);
      for (let x = x0 - 1; x <= x0 + 7; x++) out.push([x, cy, 1]);
      for (let i = 0; i < 4; i++) {
        const x = x0 + 1 + ((i * 2 + print) % 5), fall = wrap(Math.floor((t + i * 230) / 90), s.h - cy);
        out.push([x, cy + 1 + fall, 2]);
      }
      return out;
    },
  },
  {
    id: 'aura.lightning', name: 'Lightning', colors: ['#FFFFFF', '#8FD8FF', '#7C5CFF'], still: 200,
    cells: (mask, t, print) => {
      // Bolts crackle down the top corners towards his shoulders, flickering.
      const s = shape(mask), out: AuraCell[] = [], beat = Math.floor((t + print * 31) / 110), flash = beat % 5;
      if (flash === 4) return out;
      for (const [side, x0] of [[0, 1], [1, s.w - 2]] as const) {
        if ((beat + side) % 3 === 2) continue;
        let x = x0;
        for (let y = 0; y <= s.cy; y++) {
          if (mask[y]?.[x]) break;
          out.push([x, y, flash === 0 ? 0 : 1]);
          if ((y + beat + side) % 3 === 0) { x += side ? -1 : 1; out.push([x, y, 2]); }
        }
      }
      return out;
    },
  },
  {
    id: 'aura.notes', name: 'Music', colors: ['#FFFFFF', '#B9A4FF', '#6A4BD8'], still: 500,
    cells: (mask, t, print) => {
      const s = shape(mask), out: AuraCell[] = [];
      for (let i = 0; i < 2; i++) {
        const y = Math.round(s.cy - wrap(Math.floor((t + i * 700 + print * 17) / 170), s.cy + 4));
        const x = (i ? s.w - 4 : 0) + (Math.floor(t / 340 + i) % 2);
        out.push([x + 1, y, 1], [x + 2, y, 1], [x + 1, y + 1, 1], [x + 1, y + 2, 1], [x, y + 3, 2], [x + 1, y + 3, 2]);
      }
      return out;
    },
  },
  {
    id: 'aura.snow', name: 'Snowfall', colors: ['#FFFFFF', '#DCEEFF', '#8FBCE8'], still: 800,
    cells: (mask, t, print) => {
      const s = shape(mask), out: AuraCell[] = [];
      for (let i = 0; i < 12; i++) {
        const fall = wrap(Math.floor((t + i * 311 + print * 7) / 170), s.h), x = wrap(Math.round(noise(i, print) * s.w + Math.sin((t + i * 400) / 600) * 1.2), s.w);
        out.push([x, fall, i % 3 === 0 ? 0 : i % 3]);
      }
      return out;
    },
  },
  {
    id: 'aura.petals', name: 'Petals', colors: ['#FFE4EE', '#FF9EC2', '#E0558E'], still: 800,
    cells: (mask, t, print) => {
      const s = shape(mask), out: AuraCell[] = [];
      for (let i = 0; i < 8; i++) {
        const step = Math.floor((t + i * 377 + print * 5) / 150), y = wrap(step, s.h + 2) - 1, x = wrap(Math.round(noise(i, print) * s.w) - Math.floor(step / 2), s.w);
        out.push([x, y, 1], [x + 1, y + (i % 2), i % 2 ? 2 : 0]);
      }
      return out;
    },
  },
  {
    id: 'aura.galaxy', name: 'Galaxy', colors: ['#FFFFFF', '#7C5CFF', '#2A1D5C'], still: 600,
    cells: (mask, t, print) => {
      const step = Math.floor(t / 200);
      return ring(mask, 2).map(([x, y, d]): AuraCell => [x, y, noise(x, y, step, print) > 0.9 ? 0 : d === 1 ? 1 : 2]);
    },
  },
  {
    id: 'aura.rainbow', name: 'Rainbow', colors: ['#FF6B78', '#FFB347', '#FFE27A', '#7DD87A', '#5FB4FF', '#B98CFF'], still: 0,
    cells: (mask, t, print) => {
      // An arch from shoulder to shoulder over his head, three bands at a time, the colours running round it.
      const s = shape(mask), cx = s.w / 2 - 0.5, cy = s.cy + 2, top = Math.max(0, s.top - 4), shift = Math.floor(t / 200) + print, out: AuraCell[] = [];
      for (let y = top; y < cy; y++) for (let x = 0; x < s.w; x++) {
        const d = Math.hypot((x - cx) / (s.w / 2), (y - cy) / (cy - top));
        if (d >= 0.74 && d <= 1) out.push([x, y, wrap(Math.floor((1 - d) / 0.087) + shift, 6)]);
      }
      return out;
    },
  },
  {
    id: 'aura.glitch', name: 'Glitch', colors: ['#FFFFFF', '#2EF2FF', '#FF3DCB'], still: 260,
    cells: (mask, t, print) => {
      const step = Math.floor((t + print * 13) / 120), out: AuraCell[] = [];
      mask.forEach((row, y) => {
        if (noise(y, step, print) < 0.55) return;
        const shove = noise(y, step, 2) < 0.5 ? 1 : 2;
        row.forEach((on, x) => {
          if (!on) return;
          if (!row[x - 1]) out.push([x - shove, y, 1]);
          if (!row[x + 1]) out.push([x + shove, y, 2]);
        });
      });
      return out;
    },
  },
];

/**
 * Auras no capsule gives: the founder's Origin, a gold halo with stars going
 * round him and a shimmer in every colour. One of one.
 */
export const ONE_OF_ONE_AURAS: Aura[] = [
  {
    id: 'aura.origin', name: 'Origin', colors: ['#FFFFFF', '#FFD45C', '#B97A10'], still: 900,
    cells: (mask, t, print) => [
      ...AURAS.find(a => a.id === 'aura.halo')!.cells(mask, t, print),
      ...AURAS.find(a => a.id === 'aura.orbit')!.cells(mask, t, print),
    ],
  },
];

const byId = new Map([...AURAS, ...ONE_OF_ONE_AURAS].map(a => [a.id, a]));
export const auraById = (id: string | undefined) => (id ? byId.get(id) : undefined);

/**
 * An aura's cells round `mask` at `t`, only in empty pixels and inside the
 * frame, thinned by the copy's float: a Mint in Box aura is whole, a battered
 * one flickers with gaps.
 */
export function auraCells(id: string, mask: Mask, t: number, copy?: Owned): AuraCell[] {
  const aura = auraById(id);
  if (!aura) return [];
  const h = mask.length, w = mask[0].length, print = copy?.print ?? 0, scuff = copy?.scuff ?? 0;
  const seen = new Set<number>(), step = Math.floor(t / 150);
  return aura.cells(mask, t, print).map(([x, y, k]): AuraCell => [Math.round(x), Math.round(y), k]).filter(([x, y]) => {
    if (x < 0 || y < 0 || x >= w || y >= h || mask[y][x] || seen.has(y * w + x)) return false;
    seen.add(y * w + x);
    return noise(x, y, step, print, 7) >= scuff * 0.45;
  });
}

/** Each aura finish's three colours, brightest first; Classic keeps the aura's own. */
const RAMPS: Record<string, string[]> = {
  frost: ['#FFFFFF', '#BFE8FF', '#6FB4F2'],
  toxic: ['#F2FF9A', '#7DFF4F', '#1FA84A'],
  shadow: ['#D9CCFF', '#5B3FA8', '#1C1233'],
  sapphire: ['#D6E6FF', '#2F6BFF', '#0B2A8A'],
  ruby: ['#FFD6DF', '#E0204F', '#6E0622'],
  pearl: ['#EFE6FF', '#6A54B8', '#140F2A'],
};
const FADE = ['#FFE07A', '#FF6FB5', '#7C5CFF'];

const hsl = (h: number, s: number, l: number) => {
  const f = (n: number) => {
    const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
};

/**
 * The colour of one aura cell in a finish. Fade runs its sunset down the aura
 * and drifts; the Deep sea finishes glint; Black pearl glints in every colour.
 */
export function auraColor(id: string, k: number, finish: string, x: number, y: number, t: number): string {
  const aura = auraById(id);
  if (!aura) return '#FFFFFF';
  if (finish === 'fade') {
    const i = wrap(Math.floor((y + x * 0.5 + t / 140) / 2), 3);
    return k === 0 ? '#FFFFFF' : FADE[(i + k) % 3];
  }
  const ramp = RAMPS[finish];
  if (!ramp) return aura.colors[k] ?? aura.colors[aura.colors.length - 1];
  const glint = (finish === 'sapphire' || finish === 'ruby' || finish === 'pearl') && noise(x, y, Math.floor(t / 180), 9) > 0.86;
  if (glint) return finish === 'pearl' ? hsl(wrap(x * 40 + y * 25 + t / 6, 360), 0.85, 0.7) : ramp[0];
  return ramp[Math.min(2, k % 3)];
}
