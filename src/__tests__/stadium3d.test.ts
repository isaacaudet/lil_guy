import { test, expect } from 'bun:test';
import { VENUES as VENUES2D, venueFor as venueFor2D, stadiumSeats } from '../stadium';
import { layout3d, nearSeats, profile, projector, stepFor, stepWith, tileFor, venueFor, SPECS, TILES, VENUES, MOST_SEATS, type VenueId } from '../stadium3d-layout';
import { crowdColumns, crowdSource, paletteFor, roundToy, toyMesh } from '../stadium3d-mesh';
import { animate } from '../animate';
import { voxelColumns, voxelMesh } from '../voxel';
import { ownedOf } from '../voxel';

/** Canvases a game might give it: a 16:9 overlay, a 640 × 240 strip, a phone. */
const ASPECTS = [16 / 9, 640 / 240, 390 / 300];
const COUNTS: [VenueId, number][] = [['porch', 20], ['bleachers', 50], ['gym', 100], ['hall', 200], ['arena', 1000], ['stadium', 5000], ['bowl', 10000]];

test('the same venues at the same head counts as the 2D stadium, so a game can swap one for the other', () => {
  expect(VENUES).toBe(VENUES2D);
  expect(VENUES.map(v => [v.id, v.upTo])).toEqual([['porch', 20], ['bleachers', 50], ['gym', 100], ['hall', 200], ['arena', 1000], ['stadium', 5000], ['bowl', 12000]]);
  for (const n of [1, 20, 21, 50, 51, 100, 101, 200, 201, 999, 1000, 1001, 5000, 5001, 10000, 12000]) expect(venueFor(n)).toBe(venueFor2D(n));
  for (const id of Object.keys(SPECS)) expect(VENUES.some(v => v.id === id)).toBe(true);
});

test('a venue is laid out in steps of about 15%, every head on the porch and bleachers', () => {
  for (const n of [1, 7, 20, 33, 50]) expect(stepFor(n)).toBe(n);
  for (const n of [51, 80, 150, 201, 700, 1001, 4000, 5001, 9000, 10000, 15000]) {
    const s = stepFor(n);
    expect(s).toBeGreaterThanOrEqual(n);
    expect(venueFor(s)).toBe(venueFor(n) === 'bowl' ? 'bowl' : venueFor(n));
    expect(s).toBeLessThanOrEqual(Math.max(n * 1.16 + 1, VENUES.find(v => v.id === venueFor(n))!.upTo + 1));
  }
  // The 2D stadium's seats for a count are laid out for the same step.
  expect(stadiumSeats('arena', { count: 700 }).length).toBeGreaterThanOrEqual(stepFor(700));
});

test("a venue's first step is already past its first head, so the next few in don't lay it out again", () => {
  for (const first of [51, 101, 201, 1001, 5001]) {
    expect(stepFor(first)).toBe(Math.ceil(first * 1.15));
    expect(stepFor(first + 1)).toBe(stepFor(first));
  }
});

test('a crowd grows its venue at once but shrinks it only once well under, so one chatter at an edge never flips it', () => {
  // Up at the same head counts as the 2D stadium.
  expect(stepWith(1001, 1000, 'arena')).toEqual({ step: stepFor(1001), venue: 'stadium' });
  expect(stepWith(stepFor(700) + 1, stepFor(700), 'arena').step).toBeGreaterThan(stepFor(700));
  // Back and forth across a step, or a venue's first head: nothing changes.
  const laid = stepFor(1001);
  for (const n of [1000, 1001, 999, 1000, 960]) expect(stepWith(n, laid, 'stadium')).toEqual({ step: laid, venue: 'stadium' });
  const s = stepFor(800);
  for (const n of [s, s - 1, s - 20, s + 0]) expect(stepWith(n, s, 'arena')).toEqual({ step: s, venue: 'arena' });
  // Well under, it does.
  expect(stepWith(900, laid, 'stadium')).toEqual({ step: stepFor(900), venue: 'arena' });
  expect(stepWith(Math.floor(s / 1.3), s, 'arena')).toEqual({ step: stepFor(Math.floor(s / 1.3)), venue: 'arena' });
  // The porch and bleachers seat every head, so they follow it exactly.
  expect(stepWith(30, 31, 'bleachers')).toEqual({ step: 30, venue: 'bleachers' });
  expect(stepWith(20, 21, 'bleachers')).toEqual({ step: 21, venue: 'bleachers' });
  expect(stepWith(18, 21, 'bleachers')).toEqual({ step: 18, venue: 'porch' });
});

test("a big stand's crowd reaches its lower corners: nobody sits on bare steps below the people at its sides", () => {
  for (const [id, n] of [['arena', 1000], ['stadium', 5000], ['bowl', 10000]] as [VenueId, number][]) for (const aspect of ASPECTS) {
    const L = layout3d(id, aspect, stepFor(n)), project = projector(L.camera);
    // The sides come toward the camera and drop below the front row's middle; their people go down with them.
    const front = project(0, L.spec.front, 0)[1];
    const lowest = Math.min(...L.seats.slice(0, n).map(s => project(s.x, s.y, s.z)[1]));
    expect(lowest).toBeLessThan(front - 0.04);
    // A full bowl's reach the frame's bottom corners.
    if (id === 'bowl') expect(lowest).toBeLessThan(-0.88);
  }
});

test('every venue seats its crowd on every shape of canvas, and the same way every time', () => {
  for (const [id, n] of COUNTS) for (const aspect of ASPECTS) {
    const L = layout3d(id, aspect, stepFor(n));
    expect(L.id).toBe(id);
    expect(L.seats.length).toBeGreaterThanOrEqual(n);
    expect(layout3d(id, aspect, stepFor(n)).seats).toEqual(L.seats);
  }
});

test('seats fill the front row first, from its middle out', () => {
  for (const [id, n] of COUNTS) for (const aspect of ASPECTS) {
    const { seats, spec } = layout3d(id, aspect, stepFor(n));
    for (let i = 1; i < seats.length; i++) expect(seats[i].row).toBeGreaterThanOrEqual(seats[i - 1].row);
    // The first in sits in the middle of the front row; the next ones either side of them.
    expect(Math.abs(seats[0].x)).toBeLessThanOrEqual(spec.pitch * 0.51);
    const front = seats.filter(s => s.row === 0);
    for (let i = 1; i < front.length; i++) expect(Math.abs(front[i].x)).toBeGreaterThanOrEqual(Math.abs(front[i - 1].x) - 1e-9);
  }
});

test('everyone seated stands whole in the frame, and nobody is drawn bigger than the venue allows', () => {
  for (const [id, n] of COUNTS) for (const aspect of ASPECTS) {
    const L = layout3d(id, aspect, stepFor(n)), project = projector(L.camera);
    for (const s of L.seats.slice(0, n)) {
      const head = project(s.x, s.y + 1, s.z), feet = project(s.x, s.y, s.z);
      expect(Math.abs(head[0])).toBeLessThanOrEqual(1);
      expect(head[1]).toBeLessThanOrEqual(1);
      expect(feet[1]).toBeGreaterThanOrEqual(-1);
      expect(head[2]).toBeGreaterThan(L.camera.near);
      expect(s.h).toBeGreaterThan(0);
      expect(s.h).toBeLessThanOrEqual(L.spec.cap * 1.01);
    }
  }
});

test('a back row is never drawn bigger than a front one, and the stand climbs going back', () => {
  for (const [id, n] of COUNTS) for (const aspect of ASPECTS) {
    const L = layout3d(id, aspect, stepFor(n));
    const mid = L.rows.map(r => L.seats[r.first]?.h ?? 0).filter(h => h > 0);
    for (let i = 1; i < mid.length; i++) expect(mid[i]).toBeLessThanOrEqual(mid[i - 1] * 1.001);
    for (let i = 1; i < L.rows.length; i++) { expect(L.rows[i].y).toBeGreaterThan(L.rows[i - 1].y); expect(L.rows[i].back).toBeGreaterThan(L.rows[i - 1].back); }
    expect(L.depth[1]).toBeGreaterThanOrEqual(L.depth[0]);
  }
});

test('a big venue is laid out for the people in it, not for its capacity, so a half-full bowl is full at the front', () => {
  for (const [id, counts] of [['arena', [300, 800]], ['stadium', [2000, 4500]], ['bowl', [6000, 11000]]] as [VenueId, number[]][]) {
    for (const count of counts) for (const aspect of ASPECTS) {
      const L = layout3d(id, aspect, stepFor(count));
      expect(L.seats.length).toBeGreaterThanOrEqual(count);
      expect(L.seats.length).toBeLessThanOrEqual(stepFor(count));
    }
    // Fewer people: the camera comes closer.
    expect(layout3d(id, 16 / 9, stepFor(counts[0])).camera.position[2]).toBeLessThan(layout3d(id, 16 / 9, stepFor(counts[1])).camera.position[2]);
  }
  // Past the bowl's size it keeps seating, up to its most.
  expect(layout3d('bowl', 16 / 9, 14000).seats.length).toBeGreaterThanOrEqual(14000);
  expect(layout3d('bowl', 16 / 9, 40000).seats.length).toBeLessThanOrEqual(MOST_SEATS);
});

test('the small venues keep their benches whoever is in: the porch centres its rows, bleachers and a gym keep empty rows above', () => {
  const few = layout3d('porch', 16 / 9, 3), full = layout3d('porch', 16 / 9, 20);
  expect(few.camera).toEqual(full.camera);
  expect(few.seats.length).toBe(3);
  expect(Math.abs(few.seats.reduce((a, s) => a + s.x, 0))).toBeLessThan(1e-9);
  const b = layout3d('bleachers', 16 / 9, 12);
  expect(b.camera).toEqual(layout3d('bleachers', 16 / 9, 50).camera);
  expect(b.seats.length).toBeGreaterThanOrEqual(50);
  expect(b.rows.length).toBeGreaterThanOrEqual(b.used);
});

test('the stand is shaped as each venue is: steps, straight rows, or an arc that wraps toward the camera', () => {
  const arena = layout3d('arena', 16 / 9, 1000);
  const edge = arena.seats.reduce((a, s) => (Math.abs(s.x) > Math.abs(a.x) ? s : a));
  // Out at the sides an arc's rows come forward, and their guys turn in toward the floor.
  expect(edge.z).toBeGreaterThan(arena.seats.find(s => s.row === edge.row)!.z);
  expect(Math.sign(edge.yaw)).toBe(-Math.sign(edge.x));
  const gym = layout3d('gym', 16 / 9, 100);
  for (const s of gym.seats) { expect(s.yaw).toBe(0); expect(s.z).toBeCloseTo(-gym.rows[s.row].back, 9); }
  // Tiers: a walkway and a fascia between them.
  const p = profile(SPECS.bowl, 150);
  expect(new Set(p.map(r => r.tier)).size).toBe(3);
  const breaks = p.filter((r, i) => i && r.tier !== p[i - 1].tier).length;
  expect(breaks).toBe(2);
});

test('laying out ten thousand is quick enough to do on a frame', () => {
  const t = performance.now();
  layout3d('bowl', 16 / 9, 10063);
  expect(performance.now() - t).toBeLessThan(250);
});

// ------------------------------------------------------------ near and far

test('the biggest seats get whole toys, up to a limit; everyone else is a picture', () => {
  const { seats } = layout3d('hall', 16 / 9, 200);
  const near = nearSeats(seats, 200, 720, 52, 60);
  expect(near.size).toBeLessThanOrEqual(60);
  for (const i of near) expect(seats[i].h * 720).toBeGreaterThanOrEqual(52);
  // Nobody left out is bigger than someone kept.
  const smallest = Math.min(...[...near].map(i => seats[i].h));
  for (let i = 0; i < 200; i++) if (!near.has(i)) expect(seats[i].h).toBeLessThanOrEqual(smallest + 1e-12);
  // Only seats with someone in them.
  expect([...nearSeats(seats, 10, 720, 52, 60)].every(i => i < 10)).toBe(true);
  // A bowl on a phone is all pictures; a porch is all toys.
  expect(nearSeats(layout3d('bowl', 390 / 300, 10063).seats, 10000, 600, 52, 160).size).toBe(0);
  expect(nearSeats(layout3d('porch', 16 / 9, 20).seats, 20, 720, 52, 160).size).toBe(20);
});

test("a far guy's picture is about the size it is drawn, so ten thousand are sharp rows, not a blur", () => {
  // A bowl's guys at 8 pixels tall get a picture of 12, not 16.
  expect(tileFor(8 * 1.3)).toBe(12);
  for (const px of [10, 14, 20, 28, 40, 56, 80]) expect(tileFor(px) / px).toBeLessThan(1.8);
});

test("a far guy's picture is always made a little bigger than it is drawn, never stretched", () => {
  for (const px of [3, 8, 12, 15, 16, 21, 30, 44, 60, 83]) {
    const t = tileFor(px);
    expect(TILES).toContain(t as (typeof TILES)[number]);
    expect(t).toBeGreaterThanOrEqual(px * 1.15);
    // And not much more than it needs.
    const smaller = TILES.filter(s => s < t);
    if (smaller.length) expect(smaller[smaller.length - 1]).toBeLessThan(px * 1.15);
  }
  expect(tileFor(400)).toBe(TILES[TILES.length - 1]);
});

// ------------------------------------------------------------ the toy mesh

/** A mesh's triangles as sorted strings of their corners (rounded), so two meshes can be compared whatever their order. */
function triangles(pos: ArrayLike<number>, index?: ArrayLike<number>): string[] {
  const at = (i: number) => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]].map(v => v.toFixed(4)).join(',');
  const out: string[] = [], n = index ? index.length : pos.length / 3;
  for (let t = 0; t < n; t += 3) {
    const k = index ? [index[t], index[t + 1], index[t + 2]] : [t, t + 1, t + 2];
    out.push(k.map(at).sort().join('|'));
  }
  return out.sort();
}

test("a crowd guy's toy is the library's own voxel mesh, quad for quad, built quicker and indexed", () => {
  for (const spec of [{ seed: 'isaac' }, { seed: 'mochiku' }, { seed: 'bee42', equip: ['amountle.crown~gold~0.0300000~12'] }, { seed: 'ra', equip: ['cutsies.kiwi~nebula~0.0300000~4'] }]) {
    const columns = crowdColumns(spec);
    const fast = toyMesh(columns, 1 / 16), slow = voxelMesh(columns, 1 / 16);
    expect(fast.index.length).toBe(slow.positions.length / 3);
    expect(triangles(fast.positions, fast.index)).toEqual(triangles(slow.positions));
    expect(fast.min).toEqual(slow.min);
    expect(fast.max).toEqual(slow.max);
    // Every corner's normal is one the slow mesh gives that corner.
    const key = (p: ArrayLike<number>, i: number) => [0, 1, 2].map(k => p[i * 3 + k].toFixed(4)).join(',');
    const byPos = new Map<string, number[][]>();
    for (let i = 0; i < slow.positions.length / 3; i++) { const k = key(slow.positions, i); byPos.set(k, [...(byPos.get(k) ?? []), [0, 1, 2].map(j => slow.normals[i * 3 + j])]); }
    for (let i = 0; i < fast.positions.length / 3; i++) {
      const n = [0, 1, 2].map(j => fast.normals[i * 3 + j]);
      expect(Math.min(...byPos.get(key(fast.positions, i))!.map(m => Math.hypot(m[0] - n[0], m[1] - n[1], m[2] - n[2])))).toBeLessThan(1e-4);
    }
    // Surfaces kept apart: a finish's own material.
    expect(fast.groups.map(g => g.surface.kind).sort()).toEqual(slow.groups.map(g => g.surface.kind).sort());
  }
});

test("a crowd guy is never seen from behind, so their toy can leave its back faces out", () => {
  const columns = crowdColumns({ seed: 'isaac' });
  const all = toyMesh(columns, 1 / 16), front = toyMesh(columns, 1 / 16, { backs: false });
  expect(all.index.length - front.index.length).toBe(columns.length * 6);
});

test('a worn copy keeps its finish in the crowd', () => {
  const equip = ['amountle.crown~gold~0.0300000~12'];
  const columns = crowdColumns({ seed: 'isaac', equip });
  expect(columns.some(c => c.surface.kind === 'gold')).toBe(true);
  // The same columns voxelColumns makes from the still, with what they wear.
  expect(voxelColumns({ colors: [['#ffffff']], slots: [[1]] }, ownedOf(equip)).length).toBe(1);
});

test('making a crowd guy is quick: a few hundred a second at the least', () => {
  const t = performance.now();
  for (let i = 0; i < 60; i++) toyMesh(crowdColumns({ seed: `chatter${i}` }), 1 / 16, { backs: false });
  expect((performance.now() - t) / 60).toBeLessThan(8);
});

// ------------------------------------------------------------ the round toy

test("a round toy is one smooth surface: fewer triangles than the columns', its outline bevelled, its corners where the pixels are", () => {
  for (const spec of [{ seed: 'isaac' }, { seed: 'mochiku' }, { seed: 'bee42', equip: ['amountle.crown~gold~0.0300000~12'] }, { seed: 'founder:isaac' }]) {
    const columns = crowdColumns(spec), round = roundToy(columns, 1 / 16, { backs: false }), blocky = toyMesh(columns, 1 / 16, { backs: false });
    expect(round.index.length).toBeLessThan(blocky.index.length);
    for (const v of round.positions) expect(Number.isFinite(v)).toBe(true);
    for (let i = 0; i < round.normals.length; i += 3) expect(Math.hypot(round.normals[i], round.normals[i + 1], round.normals[i + 2])).toBeCloseTo(1, 4);
    for (const i of round.index) expect(i).toBeLessThan(round.positions.length / 3);
    // As wide and tall as the pixels, and its surfaces those of the columns.
    expect(round.min.slice(0, 2)).toEqual(blocky.min.slice(0, 2));
    expect(round.max.slice(0, 2)).toEqual(blocky.max.slice(0, 2));
    expect(round.groups.map(g => g.surface.kind).sort()).toEqual(blocky.groups.map(g => g.surface.kind).sort());
  }
  // A lone pixel's corners are all cut: its face is a diamond.
  const one = roundToy([{ x: 0.5, y: 0.5, z: 0, depth: 2, color: '#ff0000', back: '#ff0000', side: '#ff0000', slot: 0, surface: crowdColumns({ seed: 'isaac' })[0].surface, lift: 0 }], 1, { backs: false });
  const front = [];
  for (let i = 0; i < one.positions.length / 3; i++) if (one.normals[i * 3 + 2] > 0.99) front.push([one.positions[i * 3], one.positions[i * 3 + 1]].join(','));
  expect(new Set(front)).toEqual(new Set(['0,0.5', '0.5,0', '1,0.5', '0.5,1', '0.5,0.5']));
  // An inner corner is filled: an L of three pixels gains a triangle in the empty fourth.
  const surface = one.groups[0].surface;
  const px = (x: number, y: number) => ({ x, y, z: 0, depth: 2, color: '#00ff00', back: '#00ff00', side: '#00ff00', slot: 0, surface, lift: 0 });
  const ell = roundToy([px(0.5, 0.5), px(1.5, 0.5), px(0.5, 1.5)], 1, { backs: false });
  let filled = false;
  for (let t = 0; t < ell.index.length; t += 3) {
    const c = [0, 1, 2].map(k => ell.index[t + k]);
    const xs = c.map(i => ell.positions[i * 3]), ys = c.map(i => ell.positions[i * 3 + 1]);
    if (xs.every(x => x >= 1 - 1e-6) && ys.every(y => y >= 1 - 1e-6) && c.every(i => ell.normals[i * 3 + 2] > 0.5)) filled = true;
  }
  expect(filled).toBe(true);
});

test('a round toy is quick enough to make thousands of', () => {
  const columns = [...Array(40)].map((_, i) => crowdColumns({ seed: `chatter${i}` }));
  const t = performance.now();
  for (const c of columns) roundToy(c, 1 / 16, { backs: false });
  expect((performance.now() - t) / columns.length).toBeLessThan(4);
});

test("a spotlit winner cheers in their own colours, the ones their toy in the crowd wears", () => {
  const spec = { seed: 'mochiku', palette: 3 };
  const seated = crowdSource(spec).source.colors.flat().filter(Boolean);
  const cheer = animate(spec.seed, 'cheer', { palette: paletteFor(spec), rarity: false }).frames[0].colors.flat().filter(Boolean);
  const dealt = animate(spec.seed, 'cheer', { rarity: false }).frames[0].colors.flat().filter(Boolean);
  const share = (a: (string | null)[], b: (string | null)[]) => { const B = new Set(b); return a.filter(c => B.has(c)).length / a.length; };
  expect(share(cheer, seated)).toBeGreaterThan(share(dealt, seated));
  expect(share(cheer, seated)).toBeGreaterThan(0.8);
  expect(paletteFor({ seed: 'mochiku' })).toBeUndefined();
});
