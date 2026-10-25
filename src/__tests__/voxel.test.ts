import { describe, expect, test } from 'bun:test';
import { animate } from '../animate';
import { encode, type Owned } from '../owned';
import { itemFrame, ownedOf, surfaceOf, voxelColumns, voxelItem, voxelMesh } from '../voxel';

const crown: Owned = { item: 'amountle.crown', finish: 'gold', scuff: .012, print: 7 };
const plate: Owned = { item: 'flipsies.target', finish: 'sunset', scuff: .04, print: 18 };

describe('voxel', () => {
  test('an item on its own keeps only its own pixels, all on its slot', () => {
    const f = itemFrame(crown);
    const lit = f.colors.flat().filter(Boolean).length;
    expect(lit).toBeGreaterThan(6);
    expect(lit).toBeLessThan(16 * 16 / 2);
    f.colors.forEach((row, y) => row.forEach((c, x) => expect(f.slots[y][x]).toBe(c ? 2 : 0)));
  });

  test('a guy comes out round: the middle deeper than the edge', () => {
    const frame = animate('mia', 'idle', { rarity: false }).frames[0];
    const cols = voxelColumns(frame);
    const depth = Math.max(...cols.map(c => c.depth));
    const edge = cols.filter(c => !cols.some(o => o.x === c.x - 1 && o.y === c.y));
    expect(depth).toBeGreaterThan(4);
    expect(Math.min(...edge.map(c => c.depth))).toBeLessThan(2.5);
  });

  test('each copy wears its finish; wear roughens it', () => {
    const frame = animate('rex', 'idle', { equip: [encode(crown)], rarity: false }).frames[0];
    const cols = voxelColumns(frame, ownedOf([encode(crown)]));
    expect(cols.filter(c => c.slot === 2).every(c => c.surface.kind === 'gold' && c.surface.metalness === 1)).toBe(true);
    expect(cols.filter(c => c.slot === 0).every(c => c.surface.kind === 'body')).toBe(true);
    expect(surfaceOf('plain', .9).roughness).toBeGreaterThan(surfaceOf('plain', 0).roughness);
    expect(surfaceOf('gold', .9).clearcoat).toBeLessThan(surfaceOf('gold', 0).clearcoat);
  });

  test('a cap squeezes a figure to its depth, the lift with it', () => {
    const frame = animate('rex', 'idle', { equip: [encode(crown)], rarity: false }).frames[0];
    const free = voxelColumns(frame, ownedOf([encode(crown)]));
    const capped = voxelColumns(frame, ownedOf([encode(crown)]), { deepest: 4 });
    const extent = (cols: typeof free) => Math.max(...cols.map(c => c.z + c.depth / 2)) - Math.min(...cols.map(c => c.z - c.depth / 2));
    expect(extent(free)).toBeGreaterThan(4);
    expect(extent(capped)).toBeCloseTo(4, 5);
    expect(Math.max(...capped.map(c => c.lift))).toBeLessThan(Math.max(...free.map(c => c.lift)));
  });

  test('a frame is a plate behind', () => {
    const cols = voxelItem(plate);
    expect(cols.every(c => c.slot === 3 && c.depth < 1)).toBe(true);
  });

  test('the mesh: whole triangles, one group a surface, normals agreeing with winding', () => {
    const m = voxelMesh(voxelItem(crown), .1, { smooth: false });
    expect(m.positions.length % 9).toBe(0);
    expect(m.groups.reduce((n, g) => n + g.count, 0)).toBe(m.positions.length / 3);
    for (let i = 0; i < m.positions.length; i += 9) {
      const p = m.positions, n = m.normals;
      const u = [p[i + 3] - p[i], p[i + 4] - p[i + 1], p[i + 5] - p[i + 2]], v = [p[i + 6] - p[i], p[i + 7] - p[i + 1], p[i + 8] - p[i + 2]];
      const cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      expect(cross[0] * n[i] + cross[1] * n[i + 1] + cross[2] * n[i + 2]).toBeGreaterThan(0);
    }
    expect(m.hull.length).toBeGreaterThan(0);
    // The hull spans the whole mesh, its deepest middle included.
    const span = (k: number) => { let lo = Infinity, hi = -Infinity; for (let i = k; i < m.hull.length; i += 3) { lo = Math.min(lo, m.hull[i]); hi = Math.max(hi, m.hull[i]); } return [lo, hi]; };
    for (let k = 0; k < 3; k++) { expect(span(k)[0]).toBeCloseTo(m.min[k], 6); expect(span(k)[1]).toBeCloseTo(m.max[k], 6); }
    for (let i = 0; i < m.hull.length; i += 3) for (let k = 0; k < 3; k++) {
      expect(m.hull[i + k]).toBeGreaterThanOrEqual(m.min[k] - 1e-6);
      expect(m.hull[i + k]).toBeLessThanOrEqual(m.max[k] + 1e-6);
    }
  });

  test('smooth normals: unit length, the front facing out, the middle flatter than the edge', () => {
    const frame = animate('mia', 'idle', { rarity: false }).frames[0];
    const m = voxelMesh(voxelColumns(frame), 1);
    const flat = voxelMesh(voxelColumns(frame), 1, { smooth: false });
    expect(m.positions).toEqual(flat.positions);
    let tilt = { middle: 0, edge: 0 }, seen = { middle: 0, edge: 0 };
    const reach = Math.max(...Array.from(m.positions).filter((_, i) => i % 3 === 0).map(Math.abs));
    for (let i = 0; i < m.normals.length; i += 3) {
      expect(Math.hypot(m.normals[i], m.normals[i + 1], m.normals[i + 2])).toBeCloseTo(1, 4);
      if (flat.normals[i + 2] !== 1) continue;
      expect(m.normals[i + 2]).toBeGreaterThan(0);
      const where = Math.abs(m.positions[i]) < 2 ? 'middle' : Math.abs(m.positions[i]) > reach - 1.5 ? 'edge' : null;
      if (where) { tilt[where] += 1 - m.normals[i + 2]; seen[where]++; }
    }
    expect(tilt.edge / seen.edge).toBeGreaterThan(tilt.middle / seen.middle * 3);
  });

  test('faces between touching columns of one depth are left out', () => {
    const block = { colors: [['#ff0000', '#ff0000'], ['#ff0000', '#ff0000']], slots: [[0, 0], [0, 0]] };
    const cols = voxelColumns(block, {}, { item: true });
    expect(new Set(cols.map(c => c.depth)).size).toBe(1);
    // Four columns, each a front, a back and its two outer sides: 16 quads.
    expect(voxelMesh(cols).positions.length / 18).toBe(16);
  });

  test('the same copy always builds the same mesh', () => {
    expect(voxelMesh(voxelItem(crown)).positions).toEqual(voxelMesh(voxelItem(crown)).positions);
  });
});
