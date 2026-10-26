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
  // ---------------------------------------------------------------- added Oct 26, 2026 (append only)
  {
    id: 'aura.fireflies', name: 'Fireflies', colors: ['#FFFDE0', '#FFE45C', '#9ED45A'], still: 450,
    cells: (mask, t, print) => {
      // Warm dots that drift close round him and blink in their own time, glowing at the peak.
      const near = ring(mask, 3), out: AuraCell[] = [];
      for (let i = 0; i < 8; i++) {
        const [ax, ay] = near[Math.floor(noise(i, print, 3) * near.length)] ?? [0, 0];
        const x = ax + Math.round(Math.sin(t / 700 + i * 1.7) * 1.5), y = ay + Math.round(Math.cos(t / 900 + i * 2.3));
        const phase = wrap(t + i * 397 + print * 29, 1600) / 1600;
        if (phase > 0.65) continue;
        out.push(...(phase > 0.15 && phase < 0.45 ? plus(x, y, 2) : [[x, y, 1] as AuraCell]));
      }
      return out;
    },
  },
  {
    id: 'aura.neon', name: 'Neon', colors: ['#FFFFFF', '#FF4FD8', '#7A2C9E'], still: 300,
    cells: (mask, t, print) => {
      // A neon tube a pixel off his outline: a hot spot runs round it, a few
      // segments buzz out, and now and then the whole sign stutters.
      const s = shape(mask), step = Math.floor((t + print * 17) / 90);
      const tube = ring(mask, 1).map(([x, y]) => [x, y, Math.atan2(y - s.cy, x - s.cx)] as const).sort((a, b) => a[2] - b[2]);
      if (noise(Math.floor(step / 3), print, 5) > 0.9) return tube.map(([x, y]): AuraCell => [x, y, 2]);
      const hot = wrap(step, tube.length);
      return tube.filter((_, i) => noise(Math.floor(i / 3), step, print) > 0.06).map(([x, y], i): AuraCell => [x, y, Math.abs(i - hot) <= 1 ? 0 : 1]);
    },
  },
  {
    id: 'aura.echo', name: 'Echo', colors: ['#EDE4FF', '#9B7CFF', '#3B2A73'], still: 400,
    cells: (mask, t, print) => {
      // Two shadows a step out of time sway out from behind him, one each side.
      const sway = Math.round((Math.sin((t + print * 41) / 380) + 1) * 1.2) + 1, out: AuraCell[] = [];
      mask.forEach((row, y) => row.forEach((on, x) => {
        if (!on) return;
        const edge = !mask[y - 1]?.[x];
        out.push([x - sway, y - 1, edge ? 1 : 2], [x + sway, y - 1, edge ? 1 : 2]);
      }));
      return out;
    },
  },
  {
    id: 'aura.comet', name: 'Comet', colors: ['#FFFFFF', '#8FE3FF', '#4A6BD8'], still: 300,
    cells: (mask, t, print) => {
      // A bright comet races round him two pixels out, a long tail streaming behind it.
      const s = shape(mask), turn = print % 2 ? -1 : 1;
      const track = ring(mask, 2).filter(([, , d]) => d === 2).map(([x, y]) => [x, y, Math.atan2(y - s.cy, x - s.cx)] as const).sort((p, q) => p[2] - q[2]);
      if (!track.length) return [];
      const n = track.length, head = wrap(turn * Math.floor(t / 45) + print * 7, n), out: AuraCell[] = [];
      for (let j = 10; j >= 1; j--) { const [x, y] = track[wrap(head - turn * j, n)]; out.push([x, y, j < 3 ? 0 : j < 6 ? 1 : 2]); }
      const [x, y] = track[head];
      out.push(...plus(x, y, 1));
      return out;
    },
  },
  {
    id: 'aura.butterflies', name: 'Butterflies', colors: ['#FFF5D6', '#FF9F43', '#8A4DFF'], still: 0,
    cells: (mask, t, print) => {
      // Two butterflies flutter in loops by his shoulders, wings opening and closing.
      const s = shape(mask), out: AuraCell[] = [];
      for (let i = 0; i < 2; i++) {
        const side = i ? 1 : -1, x = Math.round(s.w / 2 - 0.5 + side * (s.w / 2 - 2.5) + Math.sin(t / 800 + i * 3 + print) * 1.2);
        const y = Math.round(Math.max(2, s.top) + Math.sin(t / 520 + i * 2.1 + print) * 1.5 + i * 3);
        out.push([x, y, 0], [x, y + 1, 0]);
        if (Math.floor((t + i * 60) / 140) % 2 === 0) {
          // Open: an upper and a lower wing either side.
          for (const d of [-1, 1]) out.push([x + d, y - 1, 1], [x + 2 * d, y - 1, 1], [x + d, y, 1], [x + 2 * d, y, 2], [x + d, y + 1, 2], [x + d, y + 2, 2]);
        } else {
          // Closed: both wings up over its back.
          for (const d of [-1, 1]) out.push([x + d, y - 1, 1], [x + d, y - 2, 1], [x + d, y, 2]);
        }
      }
      return out;
    },
  },
  {
    id: 'aura.aurora', name: 'Aurora', colors: ['#E6FFF4', '#3DF2B0', '#7C5CFF'], still: 700,
    cells: (mask, t, print) => {
      // Northern lights hang behind him from the top of the frame: streaks of
      // green over violet that ripple, lengthen and fade, a glow running down them.
      const s = shape(mask), out: AuraCell[] = [], step = Math.floor(t / 180);
      for (let x = 0; x < s.w; x++) {
        if (noise(x, Math.floor(step / 4), print) < 0.25) continue;
        const start = 1 + Math.round((Math.sin(x * 0.7 + t / 700 + print) + 1) * 0.8);
        const len = 2 + Math.round((Math.sin(x * 0.45 - t / 600 + print * 2) + 1) * 1.6);
        const glow = start + wrap(Math.floor(t / 150) + x, len + 4);
        for (let y = start; y < start + len; y++) out.push([x, y, y === glow ? 0 : y === start ? 2 : 1]);
      }
      return out;
    },
  },
  {
    id: 'aura.datarain', name: 'Data rain', colors: ['#E6FFE9', '#3CFF6B', '#0E7A2C'], still: 500,
    cells: (mask, t, print) => {
      // Green code streams down behind him, each column at its own speed, a bright glyph at its head.
      const s = shape(mask), out: AuraCell[] = [];
      for (let x = 0; x < s.w; x++) {
        if (noise(x, print, 11) < 0.4) continue;
        const speed = 70 + Math.floor(noise(x, print, 12) * 70), head = wrap(Math.floor((t + noise(x, print) * 3000) / speed), s.h + 8) - 2;
        for (let j = 0; j < 5; j++) out.push([x, head - j, j === 0 ? 0 : j < 3 ? 1 : 2]);
      }
      return out;
    },
  },
  {
    id: 'aura.vortex', name: 'Vortex', colors: ['#FFFFFF', '#5FD3FF', '#3A3FD9'], still: 300,
    cells: (mask, t, print) => {
      // Three spiral arms wheel round him, tightest close in.
      const s = shape(mask), turn = print % 2 ? -1 : 1, out: AuraCell[] = [];
      for (const [x, y, d] of ring(mask, 4)) {
        const a = Math.atan2(y - s.cy, x - s.cx) / (2 * Math.PI), r = Math.hypot(x - s.cx, y - s.cy);
        const v = wrap(a * 3 + r * 0.3 - turn * t / 700 + print * 0.1, 1);
        if (v < 0.24) out.push([x, y, v < 0.08 ? 0 : d <= 2 ? 1 : 2]);
      }
      return out;
    },
  },
  {
    id: 'aura.fireworks', name: 'Fireworks', colors: ['#FFFFFF', '#FF5C8A', '#FFD45C'], still: 650,
    cells: (mask, t, print) => {
      // Rockets climb the top corners and burst into stars that open out and fade.
      const s = shape(mask), out: AuraCell[] = [];
      for (let i = 0; i < 2; i++) {
        const cycle = 1500, local = wrap(t + i * 750 + print * 37, cycle), shot = Math.floor((t + i * 750 + print * 37) / cycle);
        const cx = i ? s.w - 3 - Math.floor(noise(shot, i) * 2) : 2 + Math.floor(noise(shot, i) * 2), cy = 2 + Math.floor(noise(shot, i, 2) * 3), p = local / cycle;
        if (p < 0.2) { const y = Math.round(cy + (1 - p / 0.2) * 6); out.push([cx, y, 0], [cx, y + 1, 2]); continue; }
        if (p > 0.85) continue;
        const r = Math.min(3, 1 + Math.floor((p - 0.2) / 0.14)), k = p < 0.45 ? 0 : p < 0.65 ? 1 : 2;
        out.push([cx, cy, k]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
          const reach = dx && dy ? Math.max(1, r - 1) : r;
          out.push([cx + dx * reach, cy + dy * reach, k], ...(r > 1 && k < 2 ? [[cx + dx * (reach - 1), cy + dy * (reach - 1), 2] as AuraCell] : []));
        }
      }
      return out;
    },
  },
  {
    id: 'aura.ripple', name: 'Ripple', colors: ['#FFFFFF', '#7FE3FF', '#2F7FD6'], still: 250,
    cells: (mask, t, print) => {
      // A ring of light rolls out from his outline like a ripple on a pond, fading as it goes.
      const out: AuraCell[] = [], p = wrap(t + print * 23, 1100) / 1100, d = 1 + Math.floor(p * 3);
      for (const [x, y, dd] of ring(mask, 3)) {
        if (dd === d) out.push([x, y, d - 1]);
        else if (dd === d - 1 && (x + y) % 2) out.push([x, y, 2]);
      }
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
 * How much an aura copy does on top of its aura, by how rare its finish is
 * among auras: 0 for Classic (half of all auras) up to 4 for Black pearl
 * (three in a thousand); Origin, one of one, is 5 whatever its finish.
 */
const INTENSITY: Record<string, number> = { classic: 0, fade: 1, frost: 1, toxic: 2, shadow: 2, sapphire: 3, ruby: 3, pearl: 4 };
export function auraIntensity(id: string, finish?: string): number {
  if (ONE_OF_ONE_AURAS.some(a => a.id === id)) return 5;
  return INTENSITY[finish ?? 'classic'] ?? 0;
}

const TAU = Math.PI * 2;

/**
 * A closed loop one pixel wide round the guy, `gx` cells clear of his sides
 * and `gy` of his top and foot: a squarish ellipse (a superellipse, which
 * never cuts his box's corners), in order round it, with no doubled corners.
 */
function loop(s: ReturnType<typeof shape>, gx: number, gy: number): [number, number][] {
  const rx = (s.right - s.left) / 2 + gx, ry = (s.bottom - s.top) / 2 + gy, steps = 720;
  const pts: [number, number][] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * TAU, c = Math.cos(a), sn = Math.sin(a);
    const x = Math.round(s.cx + rx * Math.sign(c) * Math.abs(c) ** 0.5), y = Math.round(s.cy + ry * Math.sign(sn) * Math.abs(sn) ** 0.5);
    const last = pts[pts.length - 1];
    if (!last || last[0] !== x || last[1] !== y) pts.push([x, y]);
  }
  while (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
  // Drop the inside pixel of every L-shaped step, so the line is one pixel wide throughout.
  const out: [number, number][] = [];
  pts.forEach((c, i) => {
    const p = out[out.length - 1] ?? pts[pts.length - 1], n = pts[(i + 1) % pts.length];
    const corner = (p[0] === c[0] || p[1] === c[1]) && (n[0] === c[0] || n[1] === c[1]) && p[0] !== n[0] && p[1] !== n[1];
    if (!corner) out.push(c);
  });
  return out;
}

/**
 * `count` arcs evenly spaced round a loop, each `len` cells long, travelling
 * one cell every `speed` ms (`dir` 1 or -1): a bright head and a fading tail.
 */
function arcs(pts: [number, number][], t: number, count: number, len: number, speed: number, dir: 1 | -1, offset: number): AuraCell[] {
  const n = pts.length, head = Math.floor(t / speed) * dir + offset, out: AuraCell[] = [];
  for (let k = 0; k < count; k++) for (let j = 0; j < len; j++) {
    const [x, y] = pts[wrap(Math.round(head + (k * n) / count) - j * dir, n)];
    // Head and body only in the two bright colours: a finish's third can be near black.
    out.push([x, y, j < 2 ? 0 : 1]);
  }
  return out;
}

/**
 * What a rarer aura adds round the guy, level by level, each in the aura's
 * own colours: a twinkling haze (1), clean arcs of light running round a ring
 * (2), a second, wider ring turning the other way and sparks rising off him
 * (3), longer arcs and stars riding the outer ring (4), and for Origin a
 * glowing rim, a lit ring and a crown of rays pulsing over his head (5).
 * `mask` may be wider than the frame, so the rings can spread to the sides.
 */
function extras(mask: Mask, t: number, print: number, level: number): AuraCell[] {
  if (level <= 0) return [];
  const s = shape(mask), out: AuraCell[] = [], phase = noise(print, 3);
  const beat = Math.floor(t / 110);
  // A haze of twinkles a cell or two out, thicker the rarer.
  // From level 2 the rings take over, so the haze stays a level-1 thing.
  const haze = level === 1 ? 0.08 : 0;
  for (const [x, y, d] of ring(mask, 3)) {
    const n = noise(x, y, beat, print, 31);
    if (d >= 2 && n < haze) out.push([x, y, n < haze / 3 ? 0 : 1]);
  }
  // The rings, the outer always two cells clear of the inner. The inner keeps
  // under the frame's top where it can; the outer may run out of sight up there.
  const gy = Math.min(2, s.top), inner = loop(s, 2, gy), outer = loop(s, 4, gy + 2);
  if (level >= 2) {
    const n = inner.length, long = level >= 4 ? 0.22 : 0.16;
    // Origin's inner ring is lit all the way round, dimly, under its arcs.
    if (level >= 5) for (let i = 0; i < inner.length; i += 2) out.push([inner[i][0], inner[i][1], 2]);
    out.push(...arcs(inner, t, level >= 4 ? 3 : 2, Math.max(3, Math.round(n * long)), 70, 1, phase * n));
  }
  if (level >= 3) {
    const n = outer.length;
    out.push(...arcs(outer, t, 3, Math.max(3, Math.round(n * (level >= 4 ? 0.14 : 0.1))), 55, -1, phase * n * 2));
    // Sparks rising off him, swaying as they go.
    const count = [0, 0, 0, 3, 4, 5][level], life = 1300;
    for (let i = 0; i < count; i++) {
      const at = t + (i * life) / count + print * 13, gen = Math.floor(at / life), f = (at % life) / life;
      const x = s.left - 2 + Math.floor(noise(i, gen, print, 5) * (s.right - s.left + 5));
      const y = s.bottom - Math.floor(f * (s.bottom - s.top + 5));
      out.push([x + Math.round(Math.sin(at / 210 + i) * 0.7), y, f < 0.55 ? 0 : 1]);
    }
  }
  // Stars riding the outer ring, a bright plus each.
  if (level >= 4) {
    const stars = level >= 5 ? 3 : 2, n = outer.length;
    for (let i = 0; i < stars; i++) {
      const [x, y] = outer[wrap(Math.floor(t / 90) + Math.round((i * n) / stars + phase * n), n)];
      out.push(...plus(x, y, 1));
    }
  }
  // Origin: a crown of rays above his head, pulsing out from the middle.
  if (level >= 5) {
    const pulse = (t / 90) % 6;
    for (let r = 1; r <= 4; r++) for (const dx of [-3, -2, 0, 2, 3]) {
      const x = Math.round(s.cx + dx * (1 + r * 0.25)), y = s.top - r;
      const lit = Math.abs(r - pulse) < 1.2 || (dx === 0 && r <= 2);
      if (lit && (dx === 0 || r >= 2)) out.push([x, y, Math.abs(r - pulse) < 0.6 ? 0 : 1]);
    }
  }
  return out;
}

/**
 * An aura's cells round `mask` at `t`, only in empty pixels, thinned by the
 * copy's float: a Box Fresh aura is whole, a battered one flickers with gaps.
 * A rarer finish adds more (`extras`). With `pad`, those extras may spread
 * that many columns past either side of the frame (x from -pad to
 * width + pad - 1), for a picture with room round the guy, like a card.
 */
export function auraCells(id: string, mask: Mask, t: number, copy?: Owned, pad = 0): AuraCell[] {
  const aura = auraById(id);
  if (!aura) return [];
  const h = mask.length, w = mask[0].length, print = copy?.print ?? 0, scuff = copy?.scuff ?? 0;
  const seen = new Set<number>(), step = Math.floor(t / 150);
  const wide = pad ? mask.map(row => [...new Array<boolean>(pad).fill(false), ...row, ...new Array<boolean>(pad).fill(false)]) : mask;
  const more = extras(wide, t, print, auraIntensity(id, copy?.finish)).map(([x, y, k]): AuraCell => [x - pad, y, k]);
  const cells = [...aura.cells(mask, t, print), ...more];
  return cells.map(([x, y, k]): AuraCell => [Math.round(x), Math.round(y), k]).filter(([x, y]) => {
    if (x < -pad || y < 0 || x >= w + pad || y >= h || mask[y]?.[x] || seen.has(y * (w + 2 * pad) + x + pad)) return false;
    seen.add(y * (w + 2 * pad) + x + pad);
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
  // A one of one keeps its own colours in any finish, glinting in every colour.
  if (ONE_OF_ONE_AURAS.includes(aura)) {
    if (noise(x, y, Math.floor(t / 160), 9) > 0.86) return hsl(wrap(x * 40 + y * 25 + t / 5, 360), 0.9, 0.72);
    return aura.colors[k] ?? aura.colors[aura.colors.length - 1];
  }
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
