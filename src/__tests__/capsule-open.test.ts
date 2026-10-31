import { test, expect } from 'bun:test';
import { CAPSULE_OPEN_SIZE, GRADES, auraColors, capsuleById, capsuleOpenFrames, capsuleOpenTier, capsuleOpenUrl, itemFrame, playCapsuleOpen, upscale, type Owned } from '../index-headless';
import { installPage, runFrame, made, fakeCanvas } from './fake-canvas';

const S = CAPSULE_OPEN_SIZE;
// One copy of each grade, Everyday to Aura.
const BY_GRADE: Owned[] = [
  { item: 'puttsies.tam', finish: 'plain', scuff: 0.21, print: 5 },
  { item: 'puttsies.frog', finish: 'sunset', scuff: 0.03, print: 40 },
  { item: 'puttsies.crown', finish: 'nebula', scuff: 0.02, print: 13 },
  { item: 'puttsies.gopher', finish: 'prism', scuff: 0.01, print: 77 },
  { item: 'puttsies.ball', finish: 'gold', scuff: 0.01, print: 120 },
  { item: 'aura.flames', finish: 'classic', scuff: 0.2, print: 3 },
];
const CAPSULE_IDS = ['puttsies', 'mystery', 'free', 'season.pumpkin'];
const hex = (px: Uint8ClampedArray, i: number) => '#' + [px[i], px[i + 1], px[i + 2]].map(v => v.toString(16).padStart(2, '0')).join('');
const coloursIn = (px: Uint8ClampedArray, box = { x: 0, y: 0, width: S, height: S }, w = S) => {
  const out = new Set<string>();
  for (let y = box.y; y < box.y + box.height; y++) for (let x = box.x; x < box.x + box.width; x++) { const i = (y * w + x) * 4; if (px[i + 3] === 255) out.add(hex(px, i)); }
  return out;
};
// Opens are drawn once each here and shared between tests: the same options always draw the same open.
const drawn = new Map<string, ReturnType<typeof capsuleOpenFrames>>();
const openOf = (o: Parameters<typeof capsuleOpenFrames>[0]) => {
  const key = JSON.stringify(o);
  if (!drawn.has(key)) drawn.set(key, capsuleOpenFrames(o));
  return drawn.get(key)!;
};
const same = (a: Uint8ClampedArray, b: Uint8ClampedArray) => a.length === b.length && Buffer.compare(Buffer.from(a.buffer, a.byteOffset, a.length), Buffer.from(b.buffer, b.byteOffset, b.length)) === 0;
const starts = (delays: number[]) => { const s: number[] = []; delays.reduce((t, d) => { s.push(t); return t + d; }, 0); return s; };

test('an open is frames on a 96 stage that play once and end on a still hold', () => {
  for (const id of CAPSULE_IDS) for (const copy of [undefined, ...BY_GRADE]) {
    const f = openOf({ capsule: id, copy })!;
    expect([f.width, f.height]).toEqual([S, S]);
    expect(f.frames.length).toBe(f.delays.length);
    expect(f.frames.length).toBeGreaterThan(20);
    for (const px of f.frames) expect(px.length).toBe(S * S * 4);
    // Every frame shows long enough to be drawn, in whole hundredths, and the last is the hold.
    expect(f.delays.every(d => d >= 20 && d % 10 === 0)).toBe(true);
    expect(f.delays[f.delays.length - 1]).toBe(1000);
    expect(f.beats.hold).toBe(f.delays.slice(0, -1).reduce((a, b) => a + b, 0));
    // No two frames in a row alike: a pause is one frame shown longer.
    for (let k = 1; k < f.frames.length; k++) expect(same(f.frames[k], f.frames[k - 1])).toBe(false);
  }
}, 120_000);

test('the build-up tells the grade: each grade plays longer than the one under it, rocks more and bursts bigger', () => {
  for (const id of CAPSULE_IDS) for (const from of ['drop', 'still'] as const) {
    const opens = BY_GRADE.map(copy => openOf({ capsule: id, copy, from })!);
    expect(opens.map(o => o.tier)).toEqual([0, 1, 2, 3, 4, 5]);
    for (let g = 1; g < opens.length; g++) {
      expect(opens[g].beats.hold).toBeGreaterThan(opens[g - 1].beats.hold);
      expect(opens[g].beats.pop).toBeGreaterThan(opens[g - 1].beats.pop);
      expect(opens[g].beats.rocks.length).toBeGreaterThanOrEqual(opens[g - 1].beats.rocks.length);
    }
    // An Everyday pops quickly, about a second and a fifth from standing; the biggest take a few seconds more.
    if (from === 'still') {
      expect(opens[0].beats.hold).toBeGreaterThanOrEqual(1000);
      expect(opens[0].beats.hold).toBeLessThanOrEqual(1400);
      expect(opens[5].beats.hold).toBeGreaterThan(opens[0].beats.hold * 3);
    }
    for (const o of opens) expect(o.beats.rocks[0] < o.beats.crack && o.beats.crack < o.beats.pop && o.beats.pop < o.beats.hold).toBe(true);
  }
}, 120_000);

test('Prized and up leak light before the crack; Everyday keeps it shut till then', () => {
  // The grade's colour shows in some frame before the crack only from Prized up.
  const before = (copy: Owned, colour: string) => {
    const f = capsuleOpenFrames({ capsule: 'puttsies', copy, from: 'still' })!, s = starts(f.delays);
    return f.frames.some((px, k) => s[k] < f.beats.crack && [...coloursIn(px)].some(c => c === colour));
  };
  const light = (g: number) => {
    const c = GRADES[g].color.slice(1).match(/../g)!.map(v => parseInt(v, 16)), hot = c.map(v => Math.round(v + (255 - v) * 0.8));
    return '#' + hot.map(v => v.toString(16).padStart(2, '0')).join('');
  };
  expect(before(BY_GRADE[0], light(0))).toBe(false);
  expect(before(BY_GRADE[2], light(2))).toBe(true);
  expect(before(BY_GRADE[3], light(3))).toBe(true);
});

test('a showpiece or an unusual effect plays at least as a Prized', () => {
  const showpiece: Owned = { item: 'puttsies.ufo', finish: 'plain', scuff: 0.3, print: 9 };
  expect(capsuleOpenTier(showpiece)).toBe(2);
  expect(capsuleOpenTier({ ...BY_GRADE[0], fx: 'electric' })).toBeGreaterThanOrEqual(2);
  expect(capsuleOpenTier({ ...BY_GRADE[3], item: 'puttsies.ufo' })).toBe(3);
  expect(capsuleOpenTier(BY_GRADE[0])).toBe(0);
  expect(capsuleOpenTier()).toBeNull();
  const shown = capsuleOpenFrames({ capsule: 'puttsies', copy: showpiece, from: 'still' })!, prized = capsuleOpenFrames({ capsule: 'puttsies', copy: BY_GRADE[2], from: 'still' })!;
  expect(shown.tier).toBe(2);
  expect(shown.beats.pop).toBe(prized.beats.pop);
});

test('the grade’s colour lights the burst, gold for a Grail, and an aura opens in its own colours', () => {
  const burst = (copy: Owned) => {
    const f = openOf({ capsule: 'mystery', copy })!, s = starts(f.delays), seen = new Set<string>();
    f.frames.forEach((px, k) => { if (s[k] >= f.beats.pop) for (const c of coloursIn(px)) seen.add(c); });
    return seen;
  };
  expect(burst(BY_GRADE[3]).has(GRADES[3].color.toLowerCase())).toBe(true);
  expect(burst(BY_GRADE[0]).has(GRADES[0].color.toLowerCase())).toBe(true);
  expect(burst(BY_GRADE[4]).has('#e4ae39')).toBe(true);
  const aura = BY_GRADE[5], own = auraColors(aura.item, aura.finish, aura.print).map(c => c.toLowerCase());
  const auraBurst = burst(aura);
  expect(own.length).toBeGreaterThanOrEqual(2);
  for (const c of own) expect(auraBurst.has(c)).toBe(true);
  // Another aura in another finish lights in its colours, not the first one's.
  const frost: Owned = { item: 'aura.snow', finish: 'frost', scuff: 0.1, print: 8 }, ice = auraColors(frost.item, frost.finish, frost.print).map(c => c.toLowerCase());
  const frostBurst = burst(frost);
  for (const c of ice) expect(frostBurst.has(c)).toBe(true);
  expect(own.filter(c => !ice.includes(c)).some(c => frostBurst.has(c))).toBe(false);
  // A Mythic is never in an aura's colours.
  expect(own.some(c => burst(BY_GRADE[3]).has(c))).toBe(false);
}, 120_000);

test('the hold shows what came out, standing over the open half; with nothing inside, the capsule’s toy in its own light', () => {
  for (const id of CAPSULE_IDS) {
    const plain = BY_GRADE[0], f = openOf({ capsule: id, copy: plain })!, hold = f.frames[f.frames.length - 1];
    const box = f.item!;
    expect(box.x >= 0 && box.y >= 0 && box.x + box.width <= S).toBe(true);
    // Over the candy's rim, not in it.
    expect(box.y + box.height).toBeLessThanOrEqual(62);
    // Every colour of the item, as the library paints it on its own, is there.
    const own = new Set(itemFrame(plain, 'mystery').colors.flat().filter((c): c is string => !!c).map(c => c.toLowerCase()));
    const shown = coloursIn(hold, box);
    for (const c of own) expect([id, c, shown.has(c)]).toEqual([id, c, true]);
    // An empty capsule's hold has none of it there.
    const none = openOf({ capsule: id })!;
    expect(none.item).toBeUndefined();
    const empty = coloursIn(none.frames[none.frames.length - 1], box);
    expect([...own].filter(c => empty.has(c)).length).toBeLessThan(own.size);
    // Its own light: the capsule's colour among the sparks.
    const s = starts(none.delays), seen = new Set<string>();
    none.frames.forEach((px, k) => { if (s[k] >= none.beats.pop) for (const c of coloursIn(px)) seen.add(c); });
    expect(seen.has(capsuleById(id)!.colour)).toBe(true);
  }
  // A skin, a buddy and an aura come out too, the aura round a guy.
  for (const copy of [BY_GRADE[4], BY_GRADE[3], BY_GRADE[5]]) {
    const f = capsuleOpenFrames({ capsule: 'puttsies', copy })!, box = f.item!;
    expect(box.width).toBeGreaterThan(16);
    expect(box.height).toBeGreaterThan(12);
    let lit = 0;
    const hold = f.frames[f.frames.length - 1];
    for (let y = box.y; y < box.y + box.height; y++) for (let x = box.x; x < box.x + box.width; x++) if (hold[(y * S + x) * 4 + 3] === 255) lit++;
    expect(lit).toBeGreaterThan(box.width * box.height * 0.3);
  }
}, 120_000);

test('pixel art at whole scales: a bigger size is the 96 stage scaled up by whole pixels; anything else is null', () => {
  const base = capsuleOpenFrames({ capsule: 'free', copy: BY_GRADE[2] })!;
  for (const k of [2, 3]) {
    const big = capsuleOpenFrames({ capsule: 'free', copy: BY_GRADE[2], size: S * k })!;
    expect([big.width, big.height]).toEqual([S * k, S * k]);
    expect(big.delays).toEqual(base.delays);
    expect(big.beats).toEqual(base.beats);
    expect(big.item).toEqual({ x: base.item!.x * k, y: base.item!.y * k, width: base.item!.width * k, height: base.item!.height * k });
    big.frames.forEach((px, i) => expect(same(px, upscale(base.frames[i], S, S, k))).toBe(true));
  }
  for (const size of [0, 64, 95, 100, 144, 96.5]) expect(capsuleOpenFrames({ capsule: 'free', size })).toBeNull();
  expect(capsuleOpenFrames({ capsule: 'nope' })).toBeNull();
  expect(capsuleOpenFrames({ capsule: 'season' })).toBeNull();
  expect(capsuleOpenFrames({ capsule: 'free', copy: { item: 'nope.hat', finish: 'plain', scuff: 0, print: 0 } })).toBeNull();
});

test('no pixel stands alone in any frame of any open: no specks, no slivers at the stage’s edge', () => {
  for (const id of CAPSULE_IDS) for (const copy of [undefined, ...BY_GRADE]) for (const from of ['drop', 'still'] as const) {
    if (from === 'still' && id !== 'puttsies') continue;
    openOf({ capsule: id, copy, from })!.frames.forEach((px, k) => {
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        if (!px[(y * S + x) * 4 + 3]) continue;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if ((dx || dy) && xx >= 0 && yy >= 0 && xx < S && yy < S && px[(yy * S + xx) * 4 + 3]) n++;
        }
        if (n <= 1) expect([id, copy?.item, k, x, y]).toBeNull();
      }
    });
  }
}, 120_000);

test('an open is the same every time it’s drawn, and drops in only when asked to', () => {
  const a = capsuleOpenFrames({ capsule: 'season.pumpkin', copy: BY_GRADE[4] })!, b = capsuleOpenFrames({ capsule: 'season.pumpkin', copy: BY_GRADE[4] })!;
  expect(a.delays).toEqual(b.delays);
  a.frames.forEach((px, i) => expect(same(px, b.frames[i])).toBe(true));
  const still = capsuleOpenFrames({ capsule: 'season.pumpkin', copy: BY_GRADE[4], from: 'still' })!;
  expect(a.beats.land).toBeGreaterThan(0);
  expect(still.beats.land).toBeUndefined();
  expect(a.beats.hold).toBeGreaterThan(still.beats.hold);
  // Standing still, the first frame is the shut capsule at the stage's foot; dropping, it comes in from above.
  const top = (px: Uint8ClampedArray) => { for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (px[(y * S + x) * 4 + 3]) return y; return S; };
  expect(top(still.frames[0])).toBeGreaterThanOrEqual(30);
  expect(top(a.frames[0])).toBe(0);
});

test('its address, at the Worker', () => {
  const host = 'https://lilguys.test', copy = BY_GRADE[1];
  expect(capsuleOpenUrl('puttsies', copy, { host })).toMatch(/^https:\/\/lilguys\.test\/g\/\d+\/capsule-open\/puttsies-puttsies\.frog~sunset~0\.0300000~40\.png$/);
  expect(capsuleOpenUrl('mystery', null, { host, scale: 2, from: 'still' })).toMatch(/\/capsule-open\/mystery-none-still@2\.png$/);
  expect(capsuleOpenUrl('free', undefined, { host, sheet: 'json', scale: 3 })).toMatch(/\/capsule-open\/free-none\.sheet@3\.json$/);
  expect(capsuleOpenUrl('free', undefined, { host, sheet: 'png' })).toMatch(/\/capsule-open\/free-none\.sheet\.png$/);
});

test('the player draws each frame at whole device pixels, smoothing off, centred, and ends on the hold', async () => {
  const restore = installPage();
  const g = globalThis as { devicePixelRatio?: number };
  const dpr = g.devicePixelRatio;
  try {
    g.devicePixelRatio = 2;
    const open = capsuleOpenFrames({ capsule: 'puttsies', copy: BY_GRADE[0], from: 'still' })!;
    const canvas = fakeCanvas(300, 150), beats: string[] = [];
    const player = playCapsuleOpen(canvas as unknown as HTMLCanvasElement, { capsule: 'puttsies', copy: BY_GRADE[0], from: 'still', onBeat: b => beats.push(b) });
    // The CSS box in device pixels, the stage at the most whole pixels that fit (300 by 150 at 2× fits 3), centred.
    expect([canvas.width, canvas.height]).toEqual([600, 300]);
    const ctx = canvas.getContext() as { imageSmoothingEnabled: boolean };
    expect(ctx.imageSmoothingEnabled).toBe(false);
    let finished = false;
    player.done.then(() => { finished = true; });
    runFrame(1000);
    const first = canvas.calls.filter(c => c.name === 'putImageData');
    expect(first.length).toBe(1);
    const [image, x, y] = first[0].args as [{ data: Uint8ClampedArray; width: number; height: number }, number, number];
    expect([image.width, image.height, x, y]).toEqual([288, 288, 156, 6]);
    expect(same(image.data, upscale(open.frames[0], S, S, 3))).toBe(true);
    // Played through, frame by frame, to the hold; the beats in order; then it stops asking for frames.
    let t = 1000;
    while (runFrame(t += 16)) await Promise.resolve();
    await player.done;
    expect(finished).toBe(true);
    const shown = canvas.calls.filter(c => c.name === 'putImageData');
    const last = shown[shown.length - 1].args[0] as { data: Uint8ClampedArray };
    expect(same(last.data, upscale(open.frames[open.frames.length - 1], S, S, 3))).toBe(true);
    expect(shown.length).toBeLessThanOrEqual(open.frames.length);
    expect(beats).toEqual(['rock', 'crack', 'pop', 'hold']);
    expect(t - 1000).toBeGreaterThanOrEqual(open.beats.hold);
    expect(t - 1000).toBeLessThan(open.beats.hold + 100);
  } finally {
    g.devicePixelRatio = dpr;
    restore();
  }
});

test('skip jumps to the hold and finishes; destroy stops drawing; a set scale sizes the canvas', async () => {
  const restore = installPage();
  try {
    const open = capsuleOpenFrames({ capsule: 'mystery', copy: BY_GRADE[3] })!;
    const canvas = fakeCanvas(0, 0), beats: string[] = [];
    const player = playCapsuleOpen(canvas as unknown as HTMLCanvasElement, { capsule: 'mystery', copy: BY_GRADE[3], scale: 2, onBeat: b => beats.push(b) });
    expect([canvas.width, canvas.height]).toEqual([192, 192]);
    runFrame(0);
    runFrame(100);
    expect(beats).toEqual([]);
    runFrame(open.beats.land! + 10);
    expect(beats).toEqual(['land']);
    player.skip();
    await player.done;
    const shown = canvas.calls.filter(c => c.name === 'putImageData'), last = shown[shown.length - 1].args;
    expect(same((last[0] as { data: Uint8ClampedArray }).data, upscale(open.frames[open.frames.length - 1], S, S, 2))).toBe(true);
    expect([last[1], last[2]]).toEqual([0, 0]);
    expect(beats).toEqual(['land', 'hold']);
    runFrame(10000);
    expect(canvas.calls.filter(c => c.name === 'putImageData').length).toBe(shown.length);

    const other = fakeCanvas(96, 96), stopped = playCapsuleOpen(other as unknown as HTMLCanvasElement, { capsule: 'free' });
    runFrame(0);
    stopped.destroy();
    await stopped.done;
    const drawn = other.calls.filter(c => c.name === 'putImageData').length;
    runFrame(5000);
    expect(other.calls.filter(c => c.name === 'putImageData').length).toBe(drawn);
    expect(() => playCapsuleOpen(fakeCanvas() as unknown as HTMLCanvasElement, { capsule: 'nope' })).toThrow();
    expect(made.length).toBe(0);
  } finally {
    restore();
  }
});
