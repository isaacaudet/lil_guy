import { test, expect } from 'bun:test';
import { ART_VERSION, CAPSULES, CAPSULE_FILE_SIZES, CAPSULE_GRIDS, CAPSULE_STATES, GAMES, capsuleById, capsuleFrames, capsuleHalves, capsuleManifest, capsuleUrl, inSeason, items, lilGuysHost, setLilGuysHost } from '../index-headless';

const same = (a: Uint8ClampedArray, b: Uint8ClampedArray) => a.length === b.length && a.every((v, i) => v === b[i]);
const opaque = (f: Uint8ClampedArray) => { let n = 0; for (let i = 3; i < f.length; i += 4) if (f[i] > 127) n++; return n; };
// How much lighter a colour is than the club's navy, as WCAG measures it.
const onNavy = (hex: string) => {
  const lum = (h: string) => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  return (lum(hex) + 0.05) / (lum('#11151b') + 0.05);
};
// The dome over the candy, as a page stacks the two canvases.
function stacked(bot: Uint8ClampedArray, top: Uint8ClampedArray) {
  const out = new Uint8ClampedArray(bot.length);
  for (const l of [bot, top]) for (let i = 0; i < out.length; i += 4) {
    const sa = l[i + 3] / 255;
    if (!sa) continue;
    const da = out[i + 3] / 255, a = sa + da * (1 - sa);
    for (let k = 0; k < 3; k++) out[i + k] = Math.round((l[i + k] * sa + out[i + k] * da * (1 - sa)) / a);
    out[i + 3] = Math.round(a * 255);
  }
  return out;
}

test('there is a capsule for every machine, mystery, the free one and every season, each id once', () => {
  expect(CAPSULES.filter(c => c.kind === 'machine').map(c => c.id)).toEqual(GAMES);
  expect(CAPSULES.filter(c => c.kind !== 'machine' && c.kind !== 'season').map(c => c.id)).toEqual(['mystery', 'free']);
  expect(CAPSULES.filter(c => c.kind === 'season').map(c => c.item)).toEqual(items.filter(i => i.season).map(i => i.id));
  expect(new Set(CAPSULES.map(c => c.id)).size).toBe(CAPSULES.length);
  for (const c of CAPSULES) {
    expect(c.id).toMatch(/^[a-z]+(\.[a-z]+)?$/);
    expect(c.colour).toMatch(/^#[0-9a-f]{6}$/);
    expect(c.name.length).toBeGreaterThan(0);
    // A chip tinted with it reads on the club's navy (New Year's black hat makes a silver capsule).
    expect([c.id, onNavy(c.colour) >= 4]).toEqual([c.id, true]);
  }
  expect(capsuleById('pets')?.name).toBe('Pet shop');
  expect(capsuleById('season', 'club.pumpkin')?.id).toBe('season.pumpkin');
  expect(capsuleById('season', 'pumpkin')?.id).toBe('season.pumpkin');
  expect(capsuleById('season')).toBeUndefined();
  expect(capsuleById('club')).toBeUndefined();
  // Whatever is in season on a day has its capsule.
  for (const it of inSeason('2026-10-25')) expect(capsuleById('season', it.id)?.from).toBe(it.season!.from);
});

test('every capsule draws in every state on every grid, square, at the size asked', () => {
  for (const c of CAPSULES) for (const state of CAPSULE_STATES) for (const grid of CAPSULE_GRIDS) {
    const f = capsuleFrames({ machine: c.id, state, size: grid })!;
    expect([f.width, f.height]).toEqual([grid, grid]);
    expect(f.frames.length).toBe(state === 'wobble' ? f.delays.length : 1);
    for (const px of f.frames) {
      expect(px.length).toBe(grid * grid * 4);
      // Mostly capsule, and never right to the edge but for an open one's light.
      expect(opaque(px)).toBeGreaterThan(grid * grid * 0.45);
    }
  }
  expect(capsuleFrames({ machine: 'season', season: 'club.snowcap', state: 'wobble', size: 32 })).not.toBeNull();
});

test('a bigger size is a grid scaled up by whole pixels: 64 first, then 32, 24 and 16', () => {
  const at = (size: number, grid?: 16 | 24 | 32 | 64) => capsuleFrames({ machine: 'puttsies', size, grid });
  const scaledFrom = (big: Uint8ClampedArray, small: Uint8ClampedArray, g: number, k: number) => {
    for (let y = 0; y < g * k; y++) for (let x = 0; x < g * k; x++) {
      const i = (y * g * k + x) * 4, j = (Math.floor(y / k) * g + Math.floor(x / k)) * 4;
      for (let c = 0; c < 4; c++) if (big[i + c] !== small[j + c]) return false;
    }
    return true;
  };
  for (const [size, grid] of [[128, 64], [192, 64], [96, 32], [48, 24], [80, 16], [256, 64]] as const) {
    const f = at(size)!, base = at(grid)!;
    expect(f.width).toBe(size);
    expect(scaledFrom(f.frames[0], base.frames[0], grid, size / grid)).toBe(true);
  }
  expect(at(48, 16)!.width).toBe(48);
  expect(scaledFrom(at(48, 16)!.frames[0], at(16)!.frames[0], 16, 3)).toBe(true);
  for (const size of [0, 8, 40, 63, 100, 64.5]) expect(at(size)).toBeNull();
  expect(at(64, 24)).toBeNull();
  expect(capsuleFrames({ machine: 'puttsies' })!.width).toBe(64);
});

test('the small grids are drawn on their own, not the master shrunk', () => {
  const master = capsuleFrames({ machine: 'amountle', size: 64 })!.frames[0];
  for (const grid of [16, 24, 32] as const) {
    const small = capsuleFrames({ machine: 'amountle', size: grid })!.frames[0], k = 64 / grid;
    let differ = 0;
    for (let y = 0; y < grid; y++) for (let x = 0; x < grid; x++) {
      const i = (y * grid + x) * 4, j = (Math.floor((y + 0.5) * k) * 64 + Math.floor((x + 0.5) * k)) * 4;
      if (Math.abs(small[i] - master[j]) + Math.abs(small[i + 1] - master[j + 1]) + Math.abs(small[i + 2] - master[j + 2]) > 60) differ++;
    }
    expect(differ).toBeGreaterThan(grid * grid * 0.08);
    // A pixel of room each side, and every row of the capsule a whole outline.
    const alphaAt = (x: number, y: number) => small[(y * grid + x) * 4 + 3];
    for (let y = 0; y < grid; y++) expect(alphaAt(0, y) + alphaAt(grid - 1, y)).toBe(0);
  }
});

test('the capsules tell apart: no two machines, seasons or club capsules draw alike, even at 16', () => {
  for (const grid of [16, 64] as const) {
    const seen = new Map<string, string>();
    for (const c of CAPSULES) {
      const key = Array.from(capsuleFrames({ machine: c.id, size: grid })!.frames[0]).join(',');
      expect(seen.get(key)).toBeUndefined();
      seen.set(key, c.id);
    }
  }
});

test('the wobble rests on the shut capsule, rocks twice the same way and comes back to where it began', () => {
  for (const grid of CAPSULE_GRIDS) {
    const shut = capsuleFrames({ machine: 'mystery', size: grid })!.frames[0];
    const w = capsuleFrames({ machine: 'mystery', state: 'wobble', size: grid })!;
    const n = w.frames.length, half = n / 2;
    expect(n).toBe(16);
    expect(same(w.frames[0], shut)).toBe(true);
    // Upright again halfway through each rock, and the second rock the first again.
    for (const k of [4, 8, 12]) expect(same(w.frames[k], shut)).toBe(true);
    for (let k = 1; k < half; k++) expect(same(w.frames[k], w.frames[k + half])).toBe(true);
    // It does move, and the last frame leans back toward the first.
    expect(same(w.frames[2], shut)).toBe(false);
    expect(same(w.frames[6], w.frames[2])).toBe(false);
    expect(w.delays[0]).toBeGreaterThan(w.delays[1] * 5);
    expect(w.delays.every(d => d >= 20 && d % 10 === 0)).toBe(true);
  }
});

test('the toy rides the wobble upright, moved by whole pixels, so the question mark and the stamp never break up', () => {
  // The question mark's and the stamp's coral, in the dome: where each pixel of it is.
  const coral = (f: Uint8ClampedArray, g: number) => { const at = new Set<number>(); for (let y = 0; y < g / 2; y++) for (let x = 0; x < g; x++) { const i = (y * g + x) * 4; if (f[i + 3] === 255 && f[i] > 200 && f[i + 1] < 150 && f[i + 2] < 150) at.add(y * 1000 + x); } return at; };
  for (const id of ['mystery', 'free']) for (const grid of CAPSULE_GRIDS) {
    const w = capsuleFrames({ machine: id, state: 'wobble', size: grid })!, shut = coral(w.frames[0], grid);
    expect(shut.size).toBeGreaterThan(2);
    for (const f of w.frames) {
      const now = coral(f, grid);
      let best = 0;
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) best = Math.max(best, [...shut].filter(p => now.has(p + dy * 1000 + dx)).length);
      expect([id, grid, best]).toEqual([id, grid, shut.size]);
    }
  }
});

test('no pixel stands alone in any capsule, state or frame: no specks round the dome or at the light’s end', () => {
  for (const c of CAPSULES) for (const state of CAPSULE_STATES) for (const grid of CAPSULE_GRIDS) for (const f of capsuleFrames({ machine: c.id, state, size: grid })!.frames) {
    const a = (x: number, y: number) => (x < 0 || y < 0 || x >= grid || y >= grid ? 0 : f[(y * grid + x) * 4 + 3]);
    for (let y = 0; y < grid; y++) for (let x = 0; x < grid; x++) {
      if (!a(x, y)) continue;
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].filter(([dx, dy]) => a(x + dx, y + dy)).length;
      if (n <= 1) expect([c.id, state, grid, x, y]).toBeNull();
    }
  }
});

test('open lets warm light out of the seam', () => {
  const warm = (f: Uint8ClampedArray) => { let n = 0; for (let i = 0; i < f.length; i += 4) if (f[i + 3] > 200 && f[i] > 240 && f[i + 1] > 180 && f[i + 2] < f[i + 1] - 15) n++; return n; };
  for (const grid of CAPSULE_GRIDS) {
    const shut = capsuleFrames({ machine: 'weighsies', size: grid })!.frames[0], open = capsuleFrames({ machine: 'weighsies', state: 'open', size: grid })!.frames[0];
    expect(warm(open)).toBeGreaterThan(warm(shut) + grid / 2);
  }
});

test('the master is the site’s capsule: its halves stack into the shut capsule, the dome over the seam', () => {
  for (const id of ['amountle', 'pets', 'mystery', 'free', 'season.maple']) for (const grid of CAPSULE_GRIDS) {
    const h = capsuleHalves(id, { grid })!;
    expect(h.size).toBe(grid);
    expect(same(stacked(h.bottom, h.top), capsuleFrames({ machine: id, size: grid })!.frames[0])).toBe(true);
    // The candy half is nothing above the seam's groove; the dome nothing below the seam.
    const seam = Math.ceil(grid / 2 - 1.5);
    for (let x = 0; x < grid; x++) {
      for (let y = 0; y < seam - 1; y++) expect(h.bottom[(y * grid + x) * 4 + 3]).toBe(0);
      for (let y = seam + 2; y < grid; y++) expect(h.top[(y * grid + x) * 4 + 3]).toBe(0);
    }
  }
  expect(capsuleHalves('nope')).toBeNull();
  expect(capsuleHalves('season')).toBeNull();
});

test('a machine’s capsule is its colour: its candy half shows its own colour, and no other machine’s', () => {
  const machines = CAPSULES.filter(c => c.kind === 'machine'), hex = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  for (const c of machines) {
    const { bottom } = capsuleHalves(c.id)!;
    const near = (h: string) => { const [r, g, b] = hex(h); let n = 0; for (let i = 0; i < bottom.length; i += 4) if (bottom[i + 3] === 255 && Math.abs(bottom[i] - r) + Math.abs(bottom[i + 1] - g) + Math.abs(bottom[i + 2] - b) < 16) n++; return n; };
    expect(near(c.colour)).toBeGreaterThan(30);
    for (const m of machines) if (m.id !== c.id) expect(near(m.colour)).toBeLessThan(near(c.colour) / 4);
  }
});

test('anything else is null: an unknown machine, state or size', () => {
  expect(capsuleFrames({ machine: 'nope' })).toBeNull();
  expect(capsuleFrames({ machine: 'season' })).toBeNull();
  expect(capsuleFrames({ machine: 'amountle', state: 'shaking' as any })).toBeNull();
  expect(capsuleFrames({ machine: 'amountle', size: 20 })).toBeNull();
});

test('the manifest lists every capsule with its files and its pictures in every state on every grid', () => {
  const m = capsuleManifest('https://lilguys.test');
  expect(m.version).toBe(ART_VERSION);
  expect(m.capsules.map(c => c.id)).toEqual(CAPSULES.map(c => c.id));
  expect(m.url).toBe(`https://lilguys.test/g/${ART_VERSION}/capsule/{id}-{state}-{grid}{scale}.png`);
  for (const c of m.capsules) {
    expect(Object.keys(c.files)).toEqual(CAPSULE_FILE_SIZES.map(String));
    expect(c.files['32']).toBe(`https://lilguys.test/capsules/${c.id}-32.png`);
    for (const state of CAPSULE_STATES) {
      expect(Object.keys(c[state]).sort()).toEqual(['128', '16', '24', '32', '64']);
      expect(c[state]['24']).toBe(capsuleUrl(c.id, state, 24, { host: 'https://lilguys.test' }));
      expect(c[state]['128']).toBe(`https://lilguys.test/g/${ART_VERSION}/capsule/${c.id}-${state}-64@2.png`);
      expect(c[state]['16']).toBe(m.url.replace('{id}', c.id).replace('{state}', state).replace('{grid}', '16').replace('{scale}', ''));
    }
  }
  expect(capsuleUrl('free', 'wobble', 16, { scale: 3 })).toBe(`${lilGuysHost()}/g/${ART_VERSION}/capsule/free-wobble-16@3.png`);
});

test('the addresses follow setLilGuysHost, as a guy’s do', () => {
  const was = lilGuysHost();
  setLilGuysHost('http://localhost:8787/');
  try {
    expect(capsuleUrl('pets')).toBe(`http://localhost:8787/g/${ART_VERSION}/capsule/pets-closed-64.png`);
    expect(capsuleManifest().capsules[0].files['16']).toBe(`http://localhost:8787/capsules/${CAPSULES[0].id}-16.png`);
  } finally { setLilGuysHost(was); }
  expect(capsuleUrl('pets')).toBe(`${was}/g/${ART_VERSION}/capsule/pets-closed-64.png`);
});
