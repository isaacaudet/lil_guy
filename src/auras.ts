import { cycle, fit, LOOP_MS, steps, tick, wave } from './loop';
import { sparkleAt } from './sparkle';
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
  /** The cells to light at `t` ms, round the guy in `mask`: never fewer than about eight in any frame. */
  cells: (mask: Mask, t: number, print: number) => AuraCell[];
  /** The moment a still picture shows: the aura at its fullest. */
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

/**
 * A still piece every frame shows, so even an aura of a few moving specks
 * always has something there: a picture (rows of `0`–`3` for its colours,
 * `.` empty) of at least eight cells, in the empty spot nearest one of the
 * top corners beside the guy's head, the print choosing which, a cell clear
 * of the guy on every side. The first of `arts` that fits is drawn: a big one
 * where there is room, a small one over the head of a guy who nearly fills
 * the frame. The last is three cells wide at most: for a guy who leaves no
 * room at all, it goes just past the frame's edge beside the head, in the
 * columns a padded picture keeps for an aura (`auraCells`' `pad`). It bobs a
 * cell every `bob` ms when given.
 */
function anchor(mask: Mask, t: number, print: number, arts: string[][], bob = 0): AuraCell[] {
  const H = mask.length, W = mask[0].length, s = shape(mask), right = print % 2 === 1;
  const on = (x: number, y: number) => !!mask[y]?.[x];
  const draw = (art: string[], x0: number, y0: number) => {
    const out: AuraCell[] = [];
    art.forEach((row, dy) => [...row].forEach((ch, dx) => { if (ch !== '.') out.push([x0 + dx, y0 + dy, Number(ch)]); }));
    return out;
  };
  for (const art of arts) {
    // Only the big picture bobs: a small one sits where there is barely room.
    const bobs = bob && art === arts[0], h = art.length + (bobs ? 1 : 0), w = art[0].length, tx = right ? W - w : 0, ty = Math.max(0, s.top - h);
    let best: [number, number] | null = null, far = Infinity;
    for (let y = 0; y + h <= H; y++) for (let x = 0; x + w <= W; x++) {
      let clear = true;
      for (let dy = 0; dy < h && clear; dy++) for (let dx = 0; dx < w && clear; dx++) {
        const X = x + dx, Y = y + dy;
        if (on(X, Y) || on(X - 1, Y) || on(X + 1, Y) || on(X, Y - 1) || on(X, Y + 1)) clear = false;
      }
      const d = Math.abs(x - tx) + Math.abs(y - ty) * 1.5;
      if (clear && d < far) { far = d; best = [x, y]; }
    }
    if (best) return draw(art, best[0], best[1] + (bobs && Math.floor(t / steps(bob, 2)) % 2 ? 1 : 0));
  }
  // Past the frame's edge: on the row nearest the head's top whose edge column is clear of the guy
  // beside it, a row either side too, so it never touches the guy; on the head's top when none is.
  const art = arts[arts.length - 1], w = art[0].length, h = art.length, edge = right ? W - 1 : 0;
  let y0 = Math.max(0, Math.min(H - h, s.top)), far = Infinity;
  for (let y = 0; y + h <= H; y++) {
    let clear = true;
    for (let Y = y - 1; Y <= y + h && clear; Y++) if (on(edge, Y)) clear = false;
    if (clear && Math.abs(y - s.top) < far) { far = Math.abs(y - s.top); y0 = y; }
  }
  return draw(art, right ? W : -w, y0);
}

export const AURAS: Aura[] = [
  {
    id: 'aura.flames', name: 'Flames', colors: ['#FFE27A', '#FF8A2B', '#E5484D'], still: 2510,
    cells: (mask, t, print) => {
      const s = shape(mask), step = tick(t, 110) + print, out: AuraCell[] = [];
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
    id: 'aura.orbit', name: 'Orbit', colors: ['#FFFFFF', '#FFD45C', '#C98A1A'], still: 330,
    cells: (mask, t, print) => {
      // A tilted ring round his head, where he's narrowest, kept inside the frame.
      const s = shape(mask), out: AuraCell[] = [], turn = print % 2 ? -1 : 1, rx = Math.min(6.5, s.w / 2 - 1.5);
      // The ring they ride, dotted in its deep gold, so the orbit shows whole between them.
      for (let k = 0; k < 28; k += 2) { const a = (k / 28) * Math.PI * 2; out.push([Math.round(s.w / 2 - 0.5 + Math.cos(a) * rx), Math.round(s.top + 1 + Math.sin(a) * 1.6), 2]); }
      for (let i = 0; i < 3; i++) {
        const a = turn * t / wave(560) + i * 2.094 + print;
        out.push(...plus(Math.round(s.w / 2 - 0.5 + Math.cos(a) * rx), Math.round(s.top + 1 + Math.sin(a) * 1.6), 1));
      }
      // A ringed planet they circle sits by the head.
      return [...out, ...anchor(mask, t, print, [['.111.', '21012', '.111.'], ['.1.', '111', '202', '111', '.1.']])];
    },
  },
  {
    id: 'aura.halo', name: 'Halo', colors: ['#FFFFFF', '#FFD45C', '#B97A10'], still: 0,
    cells: (mask, t, print) => {
      const s = shape(mask), y = Math.max(1, s.top - 2 - (Math.floor((t + print * 7) / steps(400, 2)) % 2)), x0 = Math.round(s.cx) - 3, glint = Math.floor(t / steps(160, 8)) % 8, out: AuraCell[] = [];
      for (let x = x0; x <= x0 + 7; x++) out.push([x, y, x - x0 === glint || x - x0 === glint + 1 ? 0 : 1]);
      for (let x = x0 + 1; x <= x0 + 6; x++) out.push([x, y + 1, 2]);
      return out;
    },
  },
  {
    id: 'aura.sparkles', name: 'Sparkles', colors: ['#FFFFFF', '#FFF3B0', '#8FD8FF'], still: 5660,
    cells: (mask, t, print) => {
      const near = ring(mask, 3), out: AuraCell[] = [];
      for (let i = 0; i < 5; i++) {
        const at = t + i * 173 + print * 11, life = tick(at, 520), phase = cycle(at, 520);
        const [x, y] = near[Math.floor(noise(i, life, print) * near.length)] ?? [0, 0];
        out.push(...glint(x, y, phase));
      }
      // One big sparkle that stays, its heart twinkling.
      const on = Math.floor(t / steps(260, 2)) % 2 === 0;
      return [...out, ...anchor(mask, t, print, on
        ? [['..2..', '..1..', '21012', '..1..', '..2..'], ['.2.2.', '21012', '.2.2.'], ['2.2', '.1.', '101', '.1.', '2.2']]
        : [['.2.2.', '2.1.2', '.101.', '2.1.2', '.2.2.'], ['2.1.2', '.101.', '2.1.2'], ['.1.', '212', '.0.', '212', '.1.']])];
    },
  },
  {
    id: 'aura.hearts', name: 'Hearts', colors: ['#FFC2D4', '#FF5C8A', '#C2335F'], still: 4670,
    cells: (mask, t, print) => {
      // Hearts float up the top corners and over his head, and fade at the top.
      const s = shape(mask), out: AuraCell[] = [], lanes = [0, s.w - 3, Math.round(s.w / 2) - 1];
      for (let i = 0; i < 3; i++) {
        const span = i === 2 ? Math.max(3, s.top) : Math.ceil(s.cy) + 1, y = Math.round(span - wrap(Math.floor((t + i * 520 + print * 13) / steps(150, span + 3)), span + 3));
        const x = lanes[i];
        out.push([x, y, 1], [x + 2, y, 1], [x, y + 1, 1], [x + 1, y + 1, 0], [x + 2, y + 1, 1], [x + 1, y + 2, 2]);
      }
      // A big heart by the head that beats.
      const beat = cycle(t + print * 13, 700) < 0.2;
      return [...out, ...anchor(mask, t, print, beat
        ? [['.1.1.', '10111', '11111', '.111.', '..2..'], ['11.11', '10111', '.121.'], ['1.1', '101', '111', '.1.', '.2.']]
        : [['.1.1.', '10111', '.111.', '..2..'], ['.1.1.', '10111', '.121.'], ['1.1', '101', '111', '.2.']])];
    },
  },
  {
    id: 'aura.bubbles', name: 'Bubbles', colors: ['#FFFFFF', '#A9E4FF', '#3E9BE0'], still: 4740,
    cells: (mask, t, print) => {
      const s = shape(mask), out: AuraCell[] = [];
      for (let i = 0; i < 4; i++) {
        const x = [0, s.w - 3, 1, s.w - 4][i], y = s.h - 1 - wrap(Math.floor((t + i * 470 + print * 9) / steps(120, s.h + 3)), s.h + 3);
        const big = i % 2 === 0;
        if (big) out.push([x + 1, y, 1], [x, y + 1, 2], [x + 2, y + 1, 2], [x + 1, y + 2, 1], [x + 1, y + 1, -1]);
        else out.push([x, y, 1], [x + 1, y, 0], [x, y + 1, 2], [x + 1, y + 1, 1]);
      }
      // A big bubble by the head, bobbing.
      return [...out.filter(c => c[2] >= 0), ...anchor(mask, t, print, [['.11.', '10.2', '1..2', '.22.'], ['.11.', '1002', '.22.'], ['11.', '102', '1.2', '.22']], 300)];
    },
  },
  {
    id: 'aura.storm', name: 'Rain cloud', colors: ['#F4F6FB', '#B9C3D6', '#4F8BE8'], still: 1120,
    cells: (mask, t, print) => {
      const s = shape(mask), cy = Math.max(1, s.top - 3), x0 = Math.round(s.cx) - 3, out: AuraCell[] = [];
      for (let x = x0 + 1; x <= x0 + 2; x++) out.push([x, cy - 2, 0]);
      for (let x = x0; x <= x0 + 5; x++) out.push([x, cy - 1, 0]);
      for (let x = x0 - 1; x <= x0 + 7; x++) out.push([x, cy, 1]);
      for (let i = 0; i < 4; i++) {
        const x = x0 + 1 + ((i * 2 + print) % 5), fall = wrap(Math.floor((t + i * 230) / steps(90, s.h - cy)), s.h - cy);
        out.push([x, cy + 1 + fall, 2]);
      }
      return out;
    },
  },
  {
    id: 'aura.lightning', name: 'Lightning', colors: ['#FFFFFF', '#8FD8FF', '#7C5CFF'], still: 0,
    cells: (mask, t, print) => {
      // Bolts crackle down the top corners towards his shoulders, flickering.
      // Between strikes the last bolt glows on dimly, so the sky is never empty.
      const s = shape(mask), out: AuraCell[] = [], beat = Math.floor((t + print * 31) / steps(110, 15)), flash = beat % 5;
      for (const [side, x0] of [[0, 1], [1, s.w - 2]] as const) {
        if ((beat + side) % 3 === 2 && flash !== 4) continue;
        let x = x0;
        for (let y = 0; y <= s.cy; y++) {
          if (mask[y]?.[x]) break;
          out.push([x, y, flash === 0 ? 0 : flash === 4 ? 2 : 1]);
          if ((y + beat + side) % 3 === 0) { x += side ? -1 : 1; out.push([x, y, 2]); }
        }
      }
      // A small bolt sits by the head, flaring on a strike.
      return [...out, ...anchor(mask, t, print, [flash === 0 ? ['.11', '.1.', '101', '.1.', '11.'] : ['.22', '.2.', '212', '.2.', '22.']])];
    },
  },
  {
    id: 'aura.notes', name: 'Music', colors: ['#FFFFFF', '#B9A4FF', '#6A4BD8'], still: 4670,
    cells: (mask, t, print) => {
      const s = shape(mask), out: AuraCell[] = [];
      for (let i = 0; i < 2; i++) {
        const span = Math.ceil(s.cy) + 4, y = Math.round(s.cy - wrap(Math.floor((t + i * 700 + print * 17) / steps(170, span)), span));
        const x = (i ? s.w - 4 : 0) + (Math.floor(t / steps(340, 2) + i) % 2);
        out.push([x + 1, y, 1], [x + 2, y, 1], [x + 1, y + 1, 1], [x + 1, y + 2, 1], [x, y + 3, 2], [x + 1, y + 3, 2]);
      }
      // A big note by the head, bobbing to the beat.
      return [...out, ...anchor(mask, t, print, [['..11', '..12', '..1.', '011.', '12..'], ['..11', '..12', '011.', '11..'], ['.11', '.12', '.1.', '11.', '12.']], 340)];
    },
  },
  {
    id: 'aura.snow', name: 'Snowfall', colors: ['#FFFFFF', '#DCEEFF', '#8FBCE8'], still: 2740,
    cells: (mask, t, print) => {
      const s = shape(mask), out: AuraCell[] = [];
      for (let i = 0; i < 12; i++) {
        const fall = wrap(Math.floor((t + i * 311 + print * 7) / steps(170, s.h)), s.h), x = wrap(Math.round(noise(i, print) * s.w + Math.sin((t + i * 400) / wave(600)) * 1.2), s.w);
        out.push([x, fall, i % 3 === 0 ? 0 : i % 3]);
      }
      // One big flake by the head, turning.
      const turn = Math.floor(t / steps(500, 2)) % 2;
      return [...out, ...anchor(mask, t, print, turn
        ? [['2.1.2', '.212.', '11011', '.212.', '2.1.2'], ['2.1.2', '.101.', '2.1.2'], ['2.2', '.1.', '101', '.1.', '2.2']]
        : [['..1..', '2.1.2', '11011', '2.1.2', '..1..'], ['.212.', '11011', '.212.'], ['.1.', '212', '101', '212', '.1.']])];
    },
  },
  {
    id: 'aura.petals', name: 'Petals', colors: ['#FFE4EE', '#FF9EC2', '#E0558E'], still: 5820,
    cells: (mask, t, print) => {
      const s = shape(mask), out: AuraCell[] = [];
      for (let i = 0; i < 8; i++) {
        // Each fall starts somewhere new, drifting sideways as it goes, and the falls come round each loop.
        const fallN = s.h + 2, at = Math.floor((t + i * 377 + print * 5) / steps(150, fallN)), step = wrap(at, fallN), y = step - 1;
        const gen = wrap(Math.floor(at / fallN), Math.round(LOOP_MS / (steps(150, fallN) * fallN)));
        const x = wrap(Math.round(noise(i, print, gen) * s.w) - Math.floor(step / 2), s.w);
        out.push([x, y, 1], [x + 1, y + (i % 2), i % 2 ? 2 : 0]);
      }
      // A blossom by the head.
      return [...out, ...anchor(mask, t, print, [['2.1.2', '.111.', '11011', '.111.', '2.1.2'], ['2.1.2', '11011', '2.1.2'], ['.2.', '212', '101', '212', '.2.']])];
    },
  },
  {
    id: 'aura.galaxy', name: 'Galaxy', colors: ['#FFFFFF', '#A88BFF', '#5B3FC8'], still: 3670,
    cells: (mask, t, print) => {
      // Clouds of nebula, each a soft clump of violet with a lit core, wheel
      // slowly round him two cells out, and stars twinkle open between them.
      const s = shape(mask), out: AuraCell[] = [], turn = print % 2 ? -1 : 1;
      const track = ring(mask, 2).filter(([, , d]) => d === 2).map(([x, y]) => [x, y, Math.atan2(y - s.cy, x - s.cx)] as const).sort((a, b) => a[2] - b[2]);
      const n = track.length;
      for (let i = 0; i < 3 && n; i++) {
        const [x, y] = track[wrap(turn * Math.floor(t / steps(120, n)) + Math.round((i * n) / 3) + print * 5, n)];
        for (const [dx, dy, k] of [[0, 0, 1], [1, 0, 2], [0, 1, 2], [-1, 0, 2], [0, -1, 2], [1, 1, 2]] as const) out.push([x + dx, y + dy, k]);
      }
      const far = ring(mask, 4).filter(([, , d]) => d >= 3);
      for (let i = 0; i < 4; i++) {
        const life = fit(900), at = t + i * (life / 4) + print * 31, gen = tick(at, 900), f = cycle(at, 900);
        const [x, y] = far[Math.floor(noise(i, gen, print, 23) * far.length)] ?? [0, 0];
        if (f < 0.75) out.push(...glint(x, y, f / 0.75));
      }
      return out;
    },
  },
  {
    id: 'aura.rainbow', name: 'Rainbow', colors: ['#FF6B78', '#FFB347', '#FFE27A', '#7DD87A', '#5FB4FF', '#B98CFF', '#FFFFFF'], still: 0,
    cells: (mask, t, print) => {
      // An arch from shoulder to shoulder over his head in six clean bands, a
      // glint running along it, and a puff of cloud at each foot.
      const s = shape(mask), cx = s.w / 2 - 0.5, cy = s.cy + 2, top = Math.max(0, s.top - 4), out: AuraCell[] = [];
      const glint = wrap(Math.floor((t + print * 40) / steps(70, 40)), 40) - 6;
      for (let y = top; y < cy; y++) for (let x = 0; x < s.w; x++) {
        const d = Math.hypot((x - cx) / (s.w / 2), (y - cy) / (cy - top));
        if (d < 0.74 || d > 1) continue;
        const band = Math.min(5, Math.floor((1 - d) / 0.0435));
        const along = Math.round(Math.atan2(cy - y, x - cx) / Math.PI * 30);
        out.push([x, y, Math.abs(along - glint) <= 1 && band % 2 === 0 ? 6 : band]);
      }
      for (const fx of [0, s.w - 3]) for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [2, 1]]) out.push([fx + dx, cy - 1 + dy, 6]);
      return out;
    },
  },
  {
    id: 'aura.glitch', name: 'Glitch', colors: ['#FFFFFF', '#2EF2FF', '#FF3DCB'], still: 1920,
    cells: (mask, t, print) => {
      const step = tick(t + print * 13, 120), out: AuraCell[] = [];
      // The rows that slip: every one the noise picks, then the next likeliest until at least eight cells show.
      const slipped = (y: number): AuraCell[] => {
        const row = mask[y], shove = noise(y, step, 2) < 0.5 ? 1 : 2, cells: AuraCell[] = [];
        row.forEach((on, x) => {
          if (!on) return;
          if (!row[x - 1] && x - shove >= 0 && !row[x - shove]) cells.push([x - shove, y, 1]);
          if (!row[x + 1] && x + shove < row.length && !row[x + shove]) cells.push([x + shove, y, 2]);
        });
        return cells;
      };
      const rows = mask.map((_, y) => [y, noise(y, step, print)] as const).sort((a, b) => b[1] - a[1]);
      for (const [y, n] of rows) {
        if (n < 0.55 && out.length >= 8) break;
        out.push(...slipped(y));
      }
      // A torn-off strip of scanline hangs by the head, flipping its colours.
      const flip = noise(step, print, 4) > 0.5;
      return [...out, ...anchor(mask, t, print, flip ? [['111.2', '.2221'], ['112', '.21', '221']] : [['1.222', '2111.'], ['122', '21.', '211']])];
    },
  },
  // ---------------------------------------------------------------- added Oct 26, 2026 (append only)
  {
    id: 'aura.fireflies', name: 'Fireflies', colors: ['#FFFDE0', '#FFE45C', '#9ED45A'], still: 3540,
    cells: (mask, t, print) => {
      // Warm dots that drift close round him and blink in their own time, glowing at the peak.
      const near = ring(mask, 3), out: AuraCell[] = [];
      for (let i = 0; i < 8; i++) {
        const [ax, ay] = near[Math.floor(noise(i, print, 3) * near.length)] ?? [0, 0];
        const x = ax + Math.round(Math.sin(t / wave(700) + i * 1.7) * 1.5), y = ay + Math.round(Math.cos(t / wave(900) + i * 2.3));
        const phase = cycle(t + i * 397 + print * 29, 1600);
        if (phase > 0.65 && i > 1) continue;
        out.push(...(phase > 0.15 && phase < 0.45 ? plus(x, y, 2) : [[x, y, 1] as AuraCell]));
      }
      // Two resting by the head, glowing in turn, slowly.
      const glow = Math.floor(t / steps(400, 2)) % 2 === 0;
      return [...out, ...anchor(mask, t, print, glow
        ? [['.2...', '202..', '.2.1.', '..101', '...1.'], ['.2.', '202', '.2.', '.1.', '101', '.1.']]
        : [['.1...', '101..', '.1.2.', '..202', '...2.'], ['.1.', '101', '.1.', '.2.', '202', '.2.']])];
    },
  },
  {
    id: 'aura.neon', name: 'Neon', colors: ['#FFE3F4', '#FF3FA4', '#8A1F62'], still: 300,
    cells: (mask, t, print) => {
      // A neon tube bent round him a pixel off his outline, in one colour: a
      // white-hot core (0) hugging him, its colour glowing round it (1). It
      // hums steady, and twice a loop, at moments its print deals, it
      // flickers as a real sign does: a stretch of tube dims, the whole tube
      // stutters off to bare glass (2) and back.
      const s = shape(mask), beat = tick(t + print * 53, 90), n = Math.round(LOOP_MS / fit(90));
      const since = Math.min(...[1, 2].map(k => wrap(beat - Math.floor(noise(print, k) * n), n)));
      const off = since === 2 || since === 4, dim = since <= 5 && !off;
      const stretch = Math.floor(noise(print, 3) * 4);
      return ring(mask, 2).flatMap(([x, y, d]): AuraCell[] => {
        if (off) return d === 1 ? [[x, y, 2]] : [];
        const quarter = Math.floor(wrap(Math.atan2(y - s.cy, x - s.cx) / TAU + 0.5, 1) * 4);
        if (dim && quarter === stretch) return d === 1 ? [[x, y, 1]] : [];
        return [[x, y, d === 1 ? 0 : 1]];
      });
    },
  },
  {
    id: 'aura.echo', name: 'Echo', colors: ['#EDE4FF', '#9B7CFF', '#3B2A73'], still: 400,
    cells: (mask, t, print) => {
      // Two shadows a step out of time sway out from behind him, one each side.
      const sway = Math.round((Math.sin((t + print * 41) / wave(380)) + 1) * 1.2) + 1, out: AuraCell[] = [];
      mask.forEach((row, y) => row.forEach((on, x) => {
        if (!on) return;
        const edge = !mask[y - 1]?.[x];
        out.push([x - sway, y - 1, edge ? 1 : 2], [x + sway, y - 1, edge ? 1 : 2]);
      }));
      return out;
    },
  },
  {
    id: 'aura.comet', name: 'Comet', colors: ['#FFFFFF', '#8FE3FF', '#4A6BD8'], still: 4830,
    cells: (mask, t, print) => {
      // A bright comet races round him two pixels out, a long tail streaming behind it.
      const s = shape(mask), turn = print % 2 ? -1 : 1;
      const track = ring(mask, 2).filter(([, , d]) => d === 2).map(([x, y]) => [x, y, Math.atan2(y - s.cy, x - s.cx)] as const).sort((p, q) => p[2] - q[2]);
      if (!track.length) return [];
      const n = track.length, head = wrap(turn * Math.floor(t / steps(45, n)) + print * 7, n), out: AuraCell[] = [];
      for (let j = 10; j >= 1; j--) { const [x, y] = track[wrap(head - turn * j, n)]; out.push([x, y, j < 3 ? 0 : j < 6 ? 1 : 2]); }
      const [x, y] = track[head];
      out.push(...plus(x, y, 1));
      return out;
    },
  },
  {
    id: 'aura.butterflies', name: 'Butterflies', colors: ['#FFF5D6', '#FF9F43', '#8A4DFF'], still: 3720,
    cells: (mask, t, print) => {
      // Two butterflies flutter in loops by his shoulders, wings opening and closing.
      const s = shape(mask), out: AuraCell[] = [];
      for (let i = 0; i < 2; i++) {
        const side = i ? 1 : -1, x = Math.round(s.w / 2 - 0.5 + side * (s.w / 2 - 2.5) + Math.sin(t / wave(800) + i * 3 + print) * 1.2);
        const y = Math.round(Math.max(2, s.top) + Math.sin(t / wave(520) + i * 2.1 + print) * 1.5 + i * 3);
        out.push([x, y, 0], [x, y + 1, 0]);
        if (Math.floor((t + i * 60) / steps(140, 2)) % 2 === 0) {
          // Open: an upper and a lower wing either side.
          for (const d of [-1, 1]) out.push([x + d, y - 1, 1], [x + 2 * d, y - 1, 1], [x + d, y, 1], [x + 2 * d, y, 2], [x + d, y + 1, 2], [x + d, y + 2, 2]);
        } else {
          // Closed: both wings up over its back.
          for (const d of [-1, 1]) out.push([x + d, y - 1, 1], [x + d, y - 2, 1], [x + d, y, 2]);
        }
      }
      // A third rests by the head, slowly opening and closing its wings.
      const open = Math.floor(t / steps(600, 2)) % 2 === 0;
      return [...out, ...anchor(mask, t, print, open ? [['11.11', '21012', '.2.2.'], ['1.1', '101', '1.1', '2.2']] : [['.111.', '.101.', '.2.2.'], ['1.1', '101', '.1.', '2.2']])];
    },
  },
  {
    id: 'aura.aurora', name: 'Aurora', colors: ['#F2FFF8', '#46F0B4', '#2BB59A', '#8A6BFF'], still: 2380,
    cells: (mask, t, print) => {
      // A curtain of northern light across the sky behind him: violet high up,
      // green at its wavy hem, brighter and dimmer rays drifting along it, a
      // bright fold running along the hem, and a star or two above.
      const s = shape(mask), out: AuraCell[] = [], d = print % 2 ? 1 : -1;
      const fold = wrap((t + print * 90) / steps(90, s.w + 10), s.w + 10) - 5;
      for (let x = 0; x < s.w; x++) {
        const hem = Math.round(3.4 + Math.sin(x * 0.42 + d * t / wave(520) + print) * 1.3 + Math.sin(x * 1.1 - t / wave(330)) * 0.6);
        const ray = Math.sin(x * 1.25 + d * t / wave(260) + print * 0.7);
        for (let y = 0; y <= hem; y++) {
          const up = hem - y;
          // A dim ray leaves only its hem; a bright one runs up into violet.
          if (ray < -0.2 && up > 1) continue;
          const k = up === 0 ? (Math.abs(x - fold) < 1.5 ? 0 : 1) : up === 1 ? (ray > 0.5 ? 1 : 2) : up === 2 ? 2 : 3;
          out.push([x, y, k]);
        }
      }
      for (let i = 0; i < 2; i++) {
        const x = Math.floor(noise(i, print, 41) * s.w);
        if (Math.sin(t / wave(240) + i * 2.1) > 0.3) out.push([x, 0, 0]);
      }
      return out;
    },
  },
  {
    id: 'aura.datarain', name: 'Data rain', colors: ['#E6FFE9', '#3CFF6B', '#159A3C'], still: 5740,
    cells: (mask, t, print) => {
      // Green code pours down behind him in nearly every column, each at its
      // own speed, long trails under a white glyph at the head that flickers.
      // It runs on past the frame's edges, into the three columns either side a
      // padded picture keeps for an aura, so a guy who fills the frame still has rain.
      const s = shape(mask), out: AuraCell[] = [];
      for (let x = -3; x < s.w + 3; x++) {
        if (noise(x, print, 11) < 0.15) continue;
        const speed = 40 + Math.floor(noise(x, print, 12) * 50), len = 6 + Math.floor(noise(x, print, 13) * 4);
        const head = wrap(Math.floor((t + noise(x, print) * 3000) / steps(speed, s.h + len + 2)), s.h + len + 2) - 1;
        for (let j = 0; j < len; j++) {
          const glyph = noise(x, head - j, tick(t, 160)) > 0.82;
          out.push([x, head - j, j === 0 ? 0 : glyph ? 0 : j < len / 2 ? 1 : 2]);
        }
      }
      return out;
    },
  },
  {
    id: 'aura.vortex', name: 'Vortex', colors: ['#FFFFFF', '#5FD3FF', '#3A3FD9'], still: 1790,
    cells: (mask, t, print) => {
      // Three spiral arms wheel round him, tightest close in.
      const s = shape(mask), turn = print % 2 ? -1 : 1, out: AuraCell[] = [];
      for (const [x, y, d] of ring(mask, 4)) {
        const a = Math.atan2(y - s.cy, x - s.cx) / (2 * Math.PI), r = Math.hypot(x - s.cx, y - s.cy);
        const v = wrap(a * 3 + r * 0.3 - turn * t / fit(700) + print * 0.1, 1);
        if (v < 0.24) out.push([x, y, v < 0.08 ? 0 : d <= 2 ? 1 : 2]);
      }
      return out;
    },
  },
  {
    id: 'aura.fireworks', name: 'Fireworks', colors: ['#FFFFFF', '#FF5C8A', '#FFD45C'], still: 4260,
    cells: (mask, t, print) => {
      // Rockets climb the top corners and burst into stars that open out and fade.
      const s = shape(mask), out: AuraCell[] = [];
      for (let i = 0; i < 2; i++) {
        const cycle = fit(1500), local = wrap(t + i * 750 + print * 37, cycle), shot = tick(t + i * 750 + print * 37, 1500);
        const cx = i ? s.w - 3 - Math.floor(noise(shot, i) * 2) : 2 + Math.floor(noise(shot, i) * 2), cy = 2 + Math.floor(noise(shot, i, 2) * 3), p = local / cycle;
        if (p < 0.2) { const y = Math.round(cy + (1 - p / 0.2) * 6); out.push([cx, y, 0], [cx, y + 1, 2]); continue; }
        if (p > 0.92) continue;
        const r = Math.min(3, 1 + Math.floor((p - 0.2) / 0.14)), k = p < 0.45 ? 0 : p < 0.65 ? 1 : 2;
        out.push([cx, cy, k]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
          const reach = dx && dy ? Math.max(1, r - 1) : r;
          out.push([cx + dx * reach, cy + dy * reach, k], ...(r > 1 && k < 2 ? [[cx + dx * (reach - 1), cy + dy * (reach - 1), 2] as AuraCell] : []));
        }
      }
      // A spark from the last burst glows on by the head between them.
      const lit = Math.floor(t / steps(300, 2)) % 2 === 0;
      return [...out, ...anchor(mask, t, print, [lit ? ['2.2', '.1.', '101', '.1.', '2.2'] : ['.2.', '212', '.0.', '212', '.2.']])];
    },
  },
  {
    id: 'aura.ripple', name: 'Ripple', colors: ['#FFFFFF', '#A6EEFF', '#4FB8F2', '#2F6FC8'], still: 250,
    cells: (mask, t, print) => {
      // Rings of light spread out from him like ripples on a pond: round, two
      // at a time, bright and pale close in and fading to deep blue as they
      // widen, with a glint here and there catching the light.
      const out: AuraCell[] = [], reach = 6;
      const h = mask.length, w = mask[0].length;
      const p = cycle(t + print * 23, 1600), rings = [p, wrap(p + 0.5, 1)].map(q => 0.8 + q * reach);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (mask[y][x]) continue;
        let d = Infinity;
        for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) {
          if (mask[y + dy]?.[x + dx]) d = Math.min(d, Math.hypot(dx, dy));
        }
        for (const r of rings) {
          if (Math.abs(d - r) > 0.5) continue;
          const k = r < 2.2 ? 1 : r < 3.8 ? 2 : 3;
          // The outer ring breaks up as it fades.
          if (k === 3 && (x + y) % 2) continue;
          // The first ring is dotted, so it reads as water leaving him rather than an outline.
          if (r < 1.6 && (x + y + tick(t, 200)) % 2) continue;
          out.push([x, y, k === 1 && noise(x, y, tick(t, 400)) > 0.86 ? 0 : k]);
        }
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
 * Points round the guy on a squarish ellipse, `gx` cells clear of his sides
 * and `gy` of his top and foot, in order: where a rarer aura's pieces ride.
 */
function loop(s: ReturnType<typeof shape>, gx: number, gy: number): [number, number][] {
  const rx = (s.right - s.left) / 2 + gx, ry = (s.bottom - s.top) / 2 + gy, steps = 720;
  const pts: [number, number][] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * TAU, c = Math.cos(a), sn = Math.sin(a);
    const x = Math.round(s.cx + rx * Math.sign(c) * Math.abs(c) ** 0.6), y = Math.round(s.cy + ry * Math.sign(sn) * Math.abs(sn) ** 0.6);
    const last = pts[pts.length - 1];
    if (!last || last[0] !== x || last[1] !== y) pts.push([x, y]);
  }
  return pts;
}

/** A 2x2 orb: a bright corner, two mid, one deep. */
const orb = (x: number, y: number): AuraCell[] => [[x, y, 0], [x + 1, y, 1], [x, y + 1, 1], [x + 1, y + 1, 2]];
/** A sparkle (./sparkle) as aura cells: its heart, arms and edges are the aura's colours 0, 1 and 2. */
const glint = (x: number, y: number, f: number): AuraCell[] => sparkleAt(f).map(([dx, dy, k]) => [x + dx, y + dy, k]);

/**
 * What a rarer aura adds round the guy, in chunky pieces at his own pixel
 * size (no thin lines: a one-pixel line reads as drawn, not as pixel art):
 * a sparkle opening now and then a few cells out (1), two orbs circling him
 * (2), more of both (3, 4, and Origin's 5). Pieces may sit past the frame's
 * sides when `mask` is padded, so a card shows them whole.
 */
function extras(mask: Mask, t: number, print: number, level: number): AuraCell[] {
  if (level <= 0) return [];
  const s = shape(mask), out: AuraCell[] = [], phase = noise(print, 3);
  const gy = Math.min(2, s.top), inner = loop(s, 3, gy), near = loop(s, 4, gy);
  // Sparkles a few cells out, one at a time per run, each on its own time and gone between.
  const runs = [0, 1, 1, 2, 2, 3][level], life = fit(1300);
  for (let i = 0; i < runs; i++) {
    const at = t + (i * life) / runs + print * 29, gen = tick(at, 1300), f = cycle(at, 1300) / 0.55;
    const [x, y] = near[Math.floor(noise(i, gen, print, 41) * near.length)];
    if (f < 1) out.push(...glint(x, y, f));
  }
  // Orbs riding the inner path, evenly spaced, slowly.
  const orbs = [0, 0, 2, 2, 3, 3][level];
  for (let i = 0; i < orbs; i++) {
    const n = inner.length, [x, y] = inner[wrap(Math.floor(t / steps(26, n)) + Math.round((i * n) / orbs + phase * n), n)];
    out.push(...orb(x - 1, y - 1));
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
  const seen = new Set<number>(), step = tick(t, 150);
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
  // No near-black: a dark step showed as blotches on a light card and vanished on the night one.
  shadow: ['#EEE8FF', '#A08AF2', '#6B54C9'],
  sapphire: ['#E6F0FF', '#5C8DFF', '#2F5DE6'],
  ruby: ['#FFE3EA', '#FF5279', '#CF1F48'],
  pearl: ['#F6F0FF', '#CDBEFF', '#9A86E0'],
};
/** Black pearl, as its card is dressed: its nacre's pale sheen, then the teal and rose its highlights catch. */
const PEARL = ['#A995E8', '#46B5A6', '#C863A0'];
const FADE = ['#FFE07A', '#FF6FB5', '#7C5CFF'];

/**
 * Neon is one colour a copy: the finish's own (Frost ice blue, Toxic acid
 * green and so on), or for Classic, Fade and Black pearl one the print deals
 * from a sign maker's tubes. Its core, its colour, and the bare glass when it
 * flickers off.
 */
const NEON_TUBES: Record<string, string[]> = {
  classic: ['#FF3FA4', '#2FD9FF', '#FF5A3C', '#B45CFF', '#3DFF8F', '#FFC23A'],
  fade: ['#FF6A4D', '#FF4F9A', '#FFB23A'],
  frost: ['#7FD8FF'], toxic: ['#9DFF3A'], shadow: ['#9A6BFF'], sapphire: ['#3D7BFF'], ruby: ['#FF2D55'],
  pearl: ['#C9A2FF', '#FF9EC9', '#7FF5D2'],
};
function neonRamp(finish: string, print: number): [string, string, string] {
  const tubes = NEON_TUBES[finish] ?? NEON_TUBES.classic, c = tubes[print % tubes.length];
  const rgb = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const to = (target: number, a: number) => '#' + rgb.map(v => Math.round(v + (target - v) * a).toString(16).padStart(2, '0')).join('').toUpperCase();
  // The lit tube runs a little toward white, its glow is the colour falling off, bare glass is the colour gone dark.
  return [to(255, 0.35), to(15, 0.38), to(25, 0.72)];
}

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
export function auraColor(id: string, k: number, finish: string, x: number, y: number, t: number, print = 0): string {
  const aura = auraById(id);
  if (!aura) return '#FFFFFF';
  if (id === 'aura.neon') return neonRamp(finish, print)[Math.min(2, k)];
  // A one of one keeps its own colours in any finish, glinting in every colour.
  // Light runs across in one smooth band rather than random glints, as a
  // Balatro foil does: rare looks rich, never noisy.
  const sweep = wrap(x + y * 0.7 - t / steps(55, 26), 26) < 1.6;
  if (ONE_OF_ONE_AURAS.includes(aura)) {
    if (sweep) return hsl(wrap((x + y) * 18 + t * 360 / fit(2160), 360), 0.9, 0.78);
    return aura.colors[k] ?? aura.colors[aura.colors.length - 1];
  }
  if (finish === 'fade') {
    const i = wrap(Math.floor((y + x * 0.5 + t / steps(140, 6)) / 2), 3);
    return k === 0 ? '#FFFFFF' : FADE[(i + k) % 3];
  }
  const ramp = RAMPS[finish];
  if (!ramp) return aura.colors[k] ?? aura.colors[aura.colors.length - 1];
  // Black pearl is nacre: the aura's pieces lit, catching teal, violet and
  // rose in bands that drift along it, as an oil slick does, brightest where
  // the light runs; only its deepest cells, its edges, keep the pearl's dark
  // body. Never the whole rainbow.
  if (finish === 'pearl') {
    const hue = [168, 278, 328][wrap(Math.floor((x + y * 0.7) / 3 + t / steps(420, 3)), 3)];
    if (sweep) return hsl(hue, 0.5, 0.9);
    return [hsl(hue, 0.55, 0.84), hsl(hue, 0.5, 0.66), hsl(hue, 0.3, 0.34)][Math.min(2, k)];
  }
  if (sweep && (finish === 'sapphire' || finish === 'ruby')) return ramp[0];
  return ramp[Math.min(2, k % 3)];
}

/**
 * The one colour an aura copy is known by, in its finish: its most vivid
 * colour (Flames' orange, Frost's ice blue, a Neon copy's tube). Its card is
 * dressed in it.
 */
export function auraHue(id: string, finish: string, print = 0): string {
  // Black pearl is known by its nacre's sheen, not the colours its highlights catch.
  if (finish === 'pearl' && id !== 'aura.neon' && !ONE_OF_ONE_AURAS.some(a => a.id === id)) return PEARL[0];
  const colors = auraColors(id, finish, print);
  const vivid = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255), max = Math.max(r, g, b), min = Math.min(r, g, b);
    // Chroma, a little in favour of the middle of the range: a near-white or near-black step never wins.
    return (max - min) * (1 - Math.abs(max + min - 1) * 0.3);
  };
  return colors.reduce((a, c) => (vivid(c) > vivid(a) ? c : a), colors[0]);
}

/** The colours an aura copy's card is dressed from, in its finish: the list `auraHue` picks the most vivid of. */
export function auraColors(id: string, finish: string, print = 0): string[] {
  const aura = auraById(id);
  return id === 'aura.neon' ? [neonRamp(finish, print)[0], NEON_TUBES[finish]?.[print % NEON_TUBES[finish].length] ?? '#FF3FA4']
    : aura && ONE_OF_ONE_AURAS.includes(aura) ? aura.colors
      : finish === 'fade' ? FADE : finish === 'pearl' ? PEARL : RAMPS[finish] ?? aura?.colors ?? ['#19D3C5'];
}
