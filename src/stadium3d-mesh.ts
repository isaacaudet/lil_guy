/**
 * A crowd guy as a 3D toy, quickly: the same columns (./voxel's `voxelColumns`) and the same mesh as
 * `voxelMesh` (pillow-round, eyes and mouth proud, every pixel its own flat colour), built on typed
 * grids instead of string-keyed maps, about ten times faster, and indexed, so a stand of thousands can
 * be made a few guys a frame. A crowd guy is their still as the 2D crowd draws it: what they wear, but
 * no frame, buddy or aura.
 */
import type { GuySpec } from './guy-code';
import { compose } from './compose';
import { dress, withItems, type Slot } from './items';
import type { Owned } from './owned';
import { paint } from './paint';
import { paletteOf } from './palette';
import { LAYER } from './parts/art';
import { resolve } from './resolve';
import { voxelColumns, type Surface, type VoxelColumn, type VoxelSource } from './voxel';

const slotIndex = (t: number) => (t >= LAYER.aura ? 0 : t >= LAYER.buddy ? 4 : t >= LAYER.frame ? 3 : t >= LAYER.hat ? 2 : t >= LAYER.skin ? 1 : 0);

/** A crowd guy's still as voxel columns' source, and the copies they wear (for their finishes). */
export function crowdSource(spec: GuySpec): { source: VoxelSource; owned: Partial<Record<Slot, Owned>> } {
  const config = dress(resolve(spec.seed, spec.parts), { equip: spec.equip }, spec.seed);
  const grid = compose({ ...config, frame: undefined, aura: undefined, buddy: undefined }) as number[][];
  const base = spec.palette !== undefined ? paletteOf({ ...config, palette: spec.palette }) : paletteOf(config);
  const colors = paint(grid, { ...config, aura: undefined }, withItems(base, config), false, true);
  const owned = { ...(config.owned ?? {}) } as Partial<Record<Slot, Owned>>;
  delete owned.frame; delete owned.buddy; delete owned.aura;
  return { source: { colors, slots: grid.map(row => row.map(slotIndex)) }, owned };
}

/** The palette a guy's own look sets (their override, if they have one), so an animation of them matches their toy. */
export function paletteFor(spec: GuySpec) {
  if (spec.palette === undefined) return undefined;
  return paletteOf({ ...dress(resolve(spec.seed, spec.parts), { equip: spec.equip }, spec.seed), palette: spec.palette });
}

/** A crowd guy's columns: their still, worn copies on their finishes' surfaces. */
export function crowdColumns(spec: GuySpec): VoxelColumn[] {
  const { source, owned } = crowdSource(spec);
  return voxelColumns(source, owned);
}

/** A toy mesh: indexed quads (two triangles each), sRGB vertex colours, one index range a surface. */
export interface ToyMesh {
  positions: Float32Array;
  normals: Float32Array;
  /** sRGB bytes, three a vertex. */
  colors: Uint8Array;
  index: Uint32Array;
  /** Index ranges sharing a surface. */
  groups: { start: number; count: number; surface: Surface }[];
  min: [number, number, number];
  max: [number, number, number];
}

const HEX = new Map<string, number>();
const hexOf = (c: string) => { let n = HEX.get(c); if (n === undefined) { n = parseInt(c.slice(1, 7), 16); if (HEX.size > 4096) HEX.clear(); HEX.set(c, n); } return n; };

/** Buffers a mesh is built in, kept from one guy to the next. */
let scratch = { pos: new Float32Array(0), nor: new Float32Array(0), col: new Uint8Array(0), idx: new Uint32Array(0) };

/**
 * Columns as one toy mesh, `cell` units a pixel: `voxelMesh` (./voxel), quad for quad and normal for
 * normal, indexed. `backs: false` leaves out the faces turned away from the front (a crowd guy is never
 * seen from behind).
 */
export function toyMesh(columns: readonly VoxelColumn[], cell = 1, options: { smooth?: boolean; backs?: boolean } = {}): ToyMesh {
  const smooth = options.smooth ?? true, backs = options.backs ?? true;
  // The grid the columns sit on: x and y are pixel middles (k + .5), so floor gives each cell's lower-left corner.
  let x0g = Infinity, y0g = Infinity, x1g = -Infinity, y1g = -Infinity;
  for (const c of columns) { const ix = Math.floor(c.x), iy = Math.floor(c.y); if (ix < x0g) x0g = ix; if (ix > x1g) x1g = ix; if (iy < y0g) y0g = iy; if (iy > y1g) y1g = iy; }
  if (!columns.length) return { positions: new Float32Array(0), normals: new Float32Array(0), colors: new Uint8Array(0), index: new Uint32Array(0), groups: [], min: [0, 0, 0], max: [0, 0, 0] };
  // Padded by 3 cells each way, so the softened surface and the corner normals never read past the edge.
  const P = 3, ox = x0g - P, oy = y0g - P, W = x1g - x0g + 1 + 2 * P, H = y1g - y0g + 1 + 2 * P;
  const at = new Int32Array(W * H).fill(-1);
  const OUTSIDE = -.6;
  const body = new Float32Array(W * H).fill(OUTSIDE);
  // Every column is a neighbour (a frame's plate too); only the figure's make the surface the normals come from.
  columns.forEach((c, i) => {
    const k = (Math.floor(c.y) - oy) * W + Math.floor(c.x) - ox;
    at[k] = i;
    if (c.slot !== 3) body[k] = (c.depth - c.lift) / 2;
  });
  const soft = new Float32Array(W * H);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    let v = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) v += body[(y + dy) * W + x + dx];
    soft[y * W + x] = v / 9;
  }
  // The surface's normal at each grid corner (as nx, ny, and the front's z; the back's z is its negative).
  const cn = new Float32Array(W * H * 3);
  for (let y = 2; y < H - 1; y++) for (let x = 2; x < W - 1; x++) {
    const a = soft[(y - 1) * W + x - 1], b = soft[(y - 1) * W + x], c = soft[y * W + x - 1], d = soft[y * W + x];
    const dx = (b + d - a - c) / 2, dy = (c + d - a - b) / 2, l = Math.sqrt(dx * dx + dy * dy + 1), k = (y * W + x) * 3;
    cn[k] = -dx / l; cn[k + 1] = -dy / l; cn[k + 2] = 1 / l;
  }

  // At most eighteen quads a column: front, back, and four sides each split in two by a neighbour and again at the rim.
  const most = columns.length * 18;
  if (scratch.pos.length < most * 12) scratch = { pos: new Float32Array(most * 12), nor: new Float32Array(most * 12), col: new Uint8Array(most * 12), idx: new Uint32Array(most * 6) };
  const { pos, nor, col, idx } = scratch;
  let np = 0, ni = 0;
  let flat = false, wall = 0;
  const Q = new Float64Array(12);
  /** One quad from the corners in Q, facing (n0, n1, n2), in colour `rgb`. */
  const quad = (n0: number, n1: number, n2: number, rgb: number) => {
    const v = np / 3, r = rgb >> 16 & 255, g = rgb >> 8 & 255, b = rgb & 255;
    for (let i = 0; i < 4; i++) {
      const px = Q[i * 3], py = Q[i * 3 + 1], pz = Q[i * 3 + 2];
      let m0 = n0, m1 = n1, m2 = n2;
      if (smooth && !flat) {
        // The softened surface's normal at this corner, leaning toward the wall's own facing on the silhouette.
        const k = ((Math.round(py) - oy) * W + Math.round(px) - ox) * 3;
        m0 = cn[k]; m1 = cn[k + 1]; m2 = pz >= 0 ? cn[k + 2] : -cn[k + 2];
        if (wall) {
          const v0 = m0 + n0 * wall, v1 = m1 + n1 * wall, v2 = m2 + n2 * wall, l = Math.sqrt(v0 * v0 + v1 * v1 + v2 * v2);
          m0 = v0 / l; m1 = v1 / l; m2 = v2 / l;
        }
      }
      pos[np] = px * cell; pos[np + 1] = py * cell; pos[np + 2] = pz * cell;
      nor[np] = m0; nor[np + 1] = m1; nor[np + 2] = m2;
      col[np] = r; col[np + 1] = g; col[np + 2] = b;
      np += 3;
    }
    idx[ni] = v; idx[ni + 1] = v + 1; idx[ni + 2] = v + 2; idx[ni + 3] = v; idx[ni + 4] = v + 2; idx[ni + 5] = v + 3;
    ni += 6;
  };
  /** The quad's corners into Q, a, b, c, d in order. */
  const set = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number, dx: number, dy: number, dz: number) => {
    Q[0] = ax; Q[1] = ay; Q[2] = az; Q[3] = bx; Q[4] = by; Q[5] = bz; Q[6] = cx; Q[7] = cy; Q[8] = cz; Q[9] = dx; Q[10] = dy; Q[11] = dz;
  };
  // The part of [z0, z1] a neighbour does not cover: up to two spans, as (a, b) pairs in `spans`.
  const spans = new Float64Array(4);
  const open = (z0: number, z1: number, n: number): number => {
    if (n < 0) { spans[0] = z0; spans[1] = z1; return 1; }
    const nc = columns[n], n0 = nc.z - nc.depth / 2, n1 = nc.z + nc.depth / 2;
    let k = 0;
    if (n0 > z0) { const b = Math.min(z1, n0); if (b - z0 > 1e-6) { spans[k * 2] = z0; spans[k * 2 + 1] = b; k++; } }
    if (n1 < z1) { const a = Math.max(z0, n1); if (z1 - a > 1e-6) { spans[k * 2] = a; spans[k * 2 + 1] = z1; k++; } }
    return k;
  };
  // Which side a wall is on: its corners for a z span, and its own facing.
  const LEFT = 0, RIGHT = 1, UP = 2, DOWN = 3;
  let x0 = 0, x1 = 0, y0 = 0, y1 = 0;
  const corners = (which: number, a: number, b: number) => {
    if (which === LEFT) set(x0, y0, a, x0, y0, b, x0, y1, b, x0, y1, a);
    else if (which === RIGHT) set(x1, y0, b, x1, y0, a, x1, y1, a, x1, y1, b);
    else if (which === UP) set(x0, y1, b, x1, y1, b, x1, y1, a, x0, y1, a);
    else set(x0, y0, a, x1, y0, a, x1, y0, b, x0, y0, b);
  };
  const FACING = [-1, 0, 0, 1, 0, 0, 0, 1, 0, 0, -1, 0], STEP = [-1, 0, 1, 0, 0, 1, 0, -1];

  const key = (s: Surface) => `${s.kind}|${s.roughness}|${s.clearcoat}`;
  const bySurface = new Map<string, VoxelColumn[]>();
  for (const c of columns) { const k = key(c.surface); let l = bySurface.get(k); if (!l) bySurface.set(k, l = []); l.push(c); }
  const groups: ToyMesh['groups'] = [];
  const RIM = .4;
  for (const list of bySurface.values()) {
    const start = ni;
    for (const c of list) {
      x0 = c.x - .5; x1 = c.x + .5; y0 = c.y - .5; y1 = c.y + .5;
      const z0 = c.z - c.depth / 2, z1 = c.z + c.depth / 2;
      const face = hexOf(c.color), back = hexOf(c.back), side = hexOf(c.side ?? c.color), split = c.side !== undefined && c.side !== c.color;
      flat = c.slot === 3; wall = 0;
      const rim = z1 - RIM;
      set(x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1); quad(0, 0, 1, face);
      if (backs) { set(x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0); quad(0, 0, -1, back); }
      const cx = Math.floor(c.x) - ox, cy = Math.floor(c.y) - oy;
      for (let w = 0; w < 4; w++) {
        const n = at[(cy + STEP[w * 2 + 1]) * W + cx + STEP[w * 2]], n0 = FACING[w * 3], n1 = FACING[w * 3 + 1], n2 = FACING[w * 3 + 2];
        wall = n >= 0 ? 0 : .9;
        // A side: its front RIM in the face's colour, the rest in the side's.
        const k = open(z0, z1, n);
        for (let s = 0; s < k; s++) {
          const a = spans[s * 2], b = spans[s * 2 + 1];
          if (!split || b <= rim) { corners(w, a, b); quad(n0, n1, n2, b <= rim ? side : face); continue; }
          if (a < rim) { corners(w, a, rim); quad(n0, n1, n2, side); }
          corners(w, Math.max(a, rim), b); quad(n0, n1, n2, face);
        }
      }
    }
    groups.push({ start, count: ni - start, surface: list[0].surface });
  }
  const min: [number, number, number] = [Infinity, Infinity, Infinity], max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const c of columns) {
    const lo = [(c.x - .5) * cell, (c.y - .5) * cell, (c.z - c.depth / 2) * cell], hi = [(c.x + .5) * cell, (c.y + .5) * cell, (c.z + c.depth / 2) * cell];
    for (let i = 0; i < 3; i++) { if (lo[i] < min[i]) min[i] = lo[i]; if (hi[i] > max[i]) max[i] = hi[i]; }
  }
  return { positions: pos.slice(0, np), normals: nor.slice(0, np), colors: col.slice(0, np), index: idx.slice(0, ni), groups, min, max };
}

const EMPTY = (): ToyMesh => ({ positions: new Float32Array(0), normals: new Float32Array(0), colors: new Uint8Array(0), index: new Uint32Array(0), groups: [], min: [0, 0, 0], max: [0, 0, 0] });

/** Buffers a round toy is built in, kept from one guy to the next. */
let roundScratch = { pos: new Float32Array(0), nor: new Float32Array(0), col: new Uint8Array(0), idx: new Uint32Array(0) };

const luma = (rgb: number) => 0.299 * (rgb >> 16 & 255) + 0.587 * (rgb >> 8 & 255) + 0.114 * (rgb & 255);

/**
 * Columns as a moulded toy: one pillow-round surface over the whole figure (each corner as high as the
 * pixels round it), so no terraces show between its rings, and the outline's stairs cut to diagonals
 * (a corner with both sides open is bevelled, an inner corner filled), so the silhouette is smooth
 * rather than stepped. Every pixel keeps its own flat colour on that surface, and eyes and mouth stand
 * proud as in `voxelMesh`. A frame's plate (slot 3) is left out. `backs: false` leaves out the back.
 */
export function roundToy(columns: readonly VoxelColumn[], cell = 1, options: { backs?: boolean } = {}): ToyMesh {
  const backs = options.backs ?? true;
  const cols = columns.filter(c => c.slot !== 3);
  if (!cols.length) return EMPTY();
  let mx = Infinity, my = Infinity, Mx = -Infinity, My = -Infinity;
  for (const c of cols) { const x = c.x - .5, y = c.y - .5; if (x < mx) mx = x; if (x > Mx) Mx = x; if (y < my) my = y; if (y > My) My = y; }
  // The grid of cells, padded by 2 each way; corners are a grid one bigger each way.
  const P = 2, W = Math.round(Mx - mx) + 1 + 2 * P, H = Math.round(My - my) + 1 + 2 * P, CW = W + 1;
  const ox = mx - P, oy = my - P;
  const at = new Int32Array(W * H).fill(-1);
  const rgb = new Int32Array(cols.length), backRgb = new Int32Array(cols.length), sideRgb = new Int32Array(cols.length);
  cols.forEach((c, i) => {
    at[Math.round(c.y - .5 - oy) * W + Math.round(c.x - .5 - ox)] = i;
    rgb[i] = hexOf(c.color); backRgb[i] = hexOf(c.back); sideRgb[i] = hexOf(c.side ?? c.color);
  });
  const filled = (gx: number, gy: number) => at[gy * W + gx] >= 0;

  // Each corner's height front and back: the mean of the pixels round it (eyes and mouth without their lift).
  const Hf = new Float32Array(CW * (H + 1)), Hb = new Float32Array(CW * (H + 1));
  const front = new Float32Array(cols.length), rear = new Float32Array(cols.length);
  cols.forEach((c, i) => { front[i] = c.z + c.depth / 2 - c.lift; rear[i] = c.z - c.depth / 2; });
  for (let j = 1; j < H; j++) for (let i = 1; i < W; i++) {
    let f = 0, b = 0, n = 0, ci: number;
    if ((ci = at[(j - 1) * W + i - 1]) >= 0) { f += front[ci]; b += rear[ci]; n++; }
    if ((ci = at[(j - 1) * W + i]) >= 0) { f += front[ci]; b += rear[ci]; n++; }
    if ((ci = at[j * W + i - 1]) >= 0) { f += front[ci]; b += rear[ci]; n++; }
    if ((ci = at[j * W + i]) >= 0) { f += front[ci]; b += rear[ci]; n++; }
    if (n) { Hf[j * CW + i] = f / n; Hb[j * CW + i] = b / n; }
  }
  // The pillow's normals, as `voxelMesh` makes them: from the figure's thickness, softened.
  const OUTSIDE = -.6, body = new Float32Array(W * H).fill(OUTSIDE);
  for (const c of cols) body[Math.round(c.y - .5 - oy) * W + Math.round(c.x - .5 - ox)] = (c.depth - c.lift) / 2;
  const soft = new Float32Array(W * H);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    let v = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) v += body[(y + dy) * W + x + dx];
    soft[y * W + x] = v / 9;
  }
  const cn = new Float32Array(CW * (H + 1) * 3);
  for (let y = 1; y < H; y++) for (let x = 1; x < W; x++) {
    const a = soft[(y - 1) * W + x - 1], b = soft[(y - 1) * W + x], c = soft[y * W + x - 1], d = soft[y * W + x];
    const dx = (b + d - a - c) / 2, dy = (c + d - a - b) / 2, l = Math.sqrt(dx * dx + dy * dy + 1), k = (y * CW + x) * 3;
    cn[k] = -dx / l; cn[k + 1] = -dy / l; cn[k + 2] = 1 / l;
  }

  // Points are in half cells (u, v): even on corners, odd on an edge's or a cell's middle.
  const hAt = (f: Float32Array, u: number, v: number) => {
    const i0 = u >> 1, i1 = (u + 1) >> 1, j0 = v >> 1, j1 = (v + 1) >> 1;
    return (f[j0 * CW + i0] + f[j0 * CW + i1] + f[j1 * CW + i0] + f[j1 * CW + i1]) / 4;
  };
  const N = [0, 0, 0];
  const nAt = (u: number, v: number) => {
    const a = ((v >> 1) * CW + (u >> 1)) * 3, b = ((v >> 1) * CW + ((u + 1) >> 1)) * 3, c = (((v + 1) >> 1) * CW + (u >> 1)) * 3, d = (((v + 1) >> 1) * CW + ((u + 1) >> 1)) * 3;
    const x = cn[a] + cn[b] + cn[c] + cn[d], y = cn[a + 1] + cn[b + 1] + cn[c + 1] + cn[d + 1], z = cn[a + 2] + cn[b + 2] + cn[c + 2] + cn[d + 2];
    const l = Math.sqrt(x * x + y * y + z * z) || 1;
    N[0] = x / l; N[1] = y / l; N[2] = z / l;
    return N;
  };

  // Corners cut on the outline (both sides and the corner open), and inner corners filled (the three round them full).
  const BL = 1, BR = 2, TR = 4, TL = 8;
  const cut = new Uint8Array(W * H), fill = new Uint8Array(W * H);
  const fills: { k: number; corner: number; owner: number }[] = [];
  for (let gy = 1; gy < H - 1; gy++) for (let gx = 1; gx < W - 1; gx++) {
    const k = gy * W + gx, l = filled(gx - 1, gy), r = filled(gx + 1, gy), d = filled(gx, gy - 1), t = filled(gx, gy + 1);
    if (at[k] >= 0) {
      let m = 0;
      if (!l && !d && !filled(gx - 1, gy - 1)) m |= BL;
      if (!r && !d && !filled(gx + 1, gy - 1)) m |= BR;
      if (!r && !t && !filled(gx + 1, gy + 1)) m |= TR;
      if (!l && !t && !filled(gx - 1, gy + 1)) m |= TL;
      cut[k] = m;
      continue;
    }
    const pick = (a: number, b: number) => (luma(rgb[a]) <= luma(rgb[b]) ? a : b);
    const add = (corner: number, a: [number, number], b: [number, number]) => { fill[k] |= corner; fills.push({ k, corner, owner: pick(at[a[1] * W + a[0]], at[b[1] * W + b[0]]) }); };
    if (l && d && filled(gx - 1, gy - 1)) add(BL, [gx - 1, gy], [gx, gy - 1]);
    if (r && d && filled(gx + 1, gy - 1)) add(BR, [gx + 1, gy], [gx, gy - 1]);
    if (r && t && filled(gx + 1, gy + 1)) add(TR, [gx + 1, gy], [gx, gy + 1]);
    if (l && t && filled(gx - 1, gy + 1)) add(TL, [gx - 1, gy], [gx, gy + 1]);
  }
  const fillsOf = new Map<number, typeof fills>();
  for (const f of fills) { let l = fillsOf.get(f.owner); if (!l) fillsOf.set(f.owner, l = []); l.push(f); }

  const most = cols.length * 120 + fills.length * 16 + 64;
  if (roundScratch.pos.length < most * 3) roundScratch = { pos: new Float32Array(most * 3), nor: new Float32Array(most * 3), col: new Uint8Array(most * 3), idx: new Uint32Array(most * 3) };
  const { pos, nor, col, idx } = roundScratch;
  let np = 0, ni = 0;
  const vert = (u: number, v: number, z: number, nx: number, ny: number, nz: number, c: number) => {
    pos[np] = (ox + u / 2) * cell; pos[np + 1] = (oy + v / 2) * cell; pos[np + 2] = z * cell;
    nor[np] = nx; nor[np + 1] = ny; nor[np + 2] = nz;
    col[np] = c >> 16 & 255; col[np + 1] = c >> 8 & 255; col[np + 2] = c & 255;
    np += 3;
    return np / 3 - 1;
  };
  /** A triangle, turned to face `(fx, fy, fz)`. */
  const tri = (a: number, b: number, c: number, fx: number, fy: number, fz: number) => {
    const ax = pos[b * 3] - pos[a * 3], ay = pos[b * 3 + 1] - pos[a * 3 + 1], az = pos[b * 3 + 2] - pos[a * 3 + 2];
    const bx = pos[c * 3] - pos[a * 3], by = pos[c * 3 + 1] - pos[a * 3 + 1], bz = pos[c * 3 + 2] - pos[a * 3 + 2];
    const d = (ay * bz - az * by) * fx + (az * bx - ax * bz) * fy + (ax * by - ay * bx) * fz;
    if (d >= 0) { idx[ni] = a; idx[ni + 1] = b; idx[ni + 2] = c; } else { idx[ni] = a; idx[ni + 1] = c; idx[ni + 2] = b; }
    ni += 3;
  };
  /** A face over the ring of points `ring` (u, v pairs), fanned from (cu, cv) when it is not a plain quad. */
  const ring: number[] = [];
  const face = (cu: number, cv: number, lift: number, c: number, front: boolean) => {
    const f = front ? Hf : Hb, s = front ? 1 : -1, ids: number[] = [];
    for (let i = 0; i < ring.length; i += 2) { const n = nAt(ring[i], ring[i + 1]); ids.push(vert(ring[i], ring[i + 1], hAt(f, ring[i], ring[i + 1]) + (front ? lift : 0), n[0], n[1], n[2] * s, c)); }
    if (ids.length === 4 || ids.length === 3) { tri(ids[0], ids[1], ids[2], 0, 0, s); if (ids.length === 4) tri(ids[0], ids[2], ids[3], 0, 0, s); return; }
    const n = nAt(cu, cv), m = vert(cu, cv, hAt(f, cu, cv) + (front ? lift : 0), n[0], n[1], n[2] * s, c);
    for (let i = 0; i < ids.length; i++) tri(m, ids[i], ids[(i + 1) % ids.length], 0, 0, s);
  };
  const RIM = .4, LEAN = .9;
  /** A wall down the outline from (u0, v0) to (u1, v1), facing out along (fx, fy): its front RIM in `c`, the rest in `side`. */
  const wall = (u0: number, v0: number, u1: number, v1: number, fx: number, fy: number, lift: number, c: number, side: number) => {
    const f0 = hAt(Hf, u0, v0) + lift, f1 = hAt(Hf, u1, v1) + lift, b0 = hAt(Hb, u0, v0), b1 = hAt(Hb, u1, v1);
    const split = side !== c && f0 - RIM > b0 && f1 - RIM > b1;
    const levels = split ? [[f0, f1, c], [f0 - RIM, f1 - RIM, side], [b0, b1, side]] : [[f0, f1, c], [b0, b1, c]];
    for (let s = 0; s < levels.length - 1; s++) {
      const [za, zb, colour] = levels[s], [zc, zd] = levels[s + 1];
      const corner = (u: number, v: number, z: number) => {
        const n = nAt(u, v), x = n[0] + fx * LEAN, y = n[1] + fy * LEAN, w = z >= 0 ? n[2] : -n[2], l = Math.sqrt(x * x + y * y + w * w);
        return vert(u, v, z, x / l, y / l, w / l, colour);
      };
      const a = corner(u0, v0, za), b = corner(u1, v1, zb), cc = corner(u1, v1, zd), d = corner(u0, v0, zc);
      tri(a, b, cc, fx, fy, 0); tri(a, cc, d, fx, fy, 0);
    }
  };
  /** A step up from a neighbour's face to a raised eye or mouth pixel's, along a whole edge. */
  const step = (u0: number, v0: number, u1: number, v1: number, fx: number, fy: number, lo: number, hi: number, c: number) => {
    const l = Math.sqrt(fx * fx + fy * fy + .1225);
    const p = [vert(u0, v0, hAt(Hf, u0, v0) + hi, fx / l, fy / l, .35 / l, c), vert(u1, v1, hAt(Hf, u1, v1) + hi, fx / l, fy / l, .35 / l, c)];
    const q = [vert(u1, v1, hAt(Hf, u1, v1) + lo, fx / l, fy / l, .35 / l, c), vert(u0, v0, hAt(Hf, u0, v0) + lo, fx / l, fy / l, .35 / l, c)];
    tri(p[0], p[1], q[0], fx, fy, 0); tri(p[0], q[0], q[1], fx, fy, 0);
  };
  const H2 = Math.SQRT1_2;

  const key = (s: Surface) => `${s.kind}|${s.roughness}|${s.clearcoat}`;
  const bySurface = new Map<string, number[]>();
  cols.forEach((c, i) => { const k = key(c.surface); let l = bySurface.get(k); if (!l) bySurface.set(k, l = []); l.push(i); });
  const groups: ToyMesh['groups'] = [];
  for (const list of bySurface.values()) {
    const start = ni;
    for (const ci of list) {
      const c = cols[ci], gx = Math.round(c.x - .5 - ox), gy = Math.round(c.y - .5 - oy), k = gy * W + gx, m = cut[k], lift = c.lift;
      const u = gx * 2, v = gy * 2;
      // The face: the cell's square with its cut corners bevelled.
      ring.length = 0;
      if (m & BL) ring.push(u, v + 1, u + 1, v); else ring.push(u, v);
      if (m & BR) ring.push(u + 1, v, u + 2, v + 1); else ring.push(u + 2, v);
      if (m & TR) ring.push(u + 2, v + 1, u + 1, v + 2); else ring.push(u + 2, v + 2);
      if (m & TL) ring.push(u + 1, v + 2, u, v + 1); else ring.push(u, v + 2);
      face(u + 1, v + 1, lift, rgb[ci], true);
      if (backs) face(u + 1, v + 1, 0, backRgb[ci], false);
      // The outline: each open side, less what a bevel or a neighbour's fill takes, then the bevels.
      const fl = (gx2: number, gy2: number, corner: number) => (fill[gy2 * W + gx2] & corner) !== 0;
      if (!filled(gx, gy - 1)) { const s = m & BL || fl(gx, gy - 1, TL) ? 1 : 0, e = m & BR || fl(gx, gy - 1, TR) ? 1 : 2; if (e > s) wall(u + s, v, u + e, v, 0, -1, lift, rgb[ci], sideRgb[ci]); }
      if (!filled(gx + 1, gy)) { const s = m & BR || fl(gx + 1, gy, BL) ? 1 : 0, e = m & TR || fl(gx + 1, gy, TL) ? 1 : 2; if (e > s) wall(u + 2, v + s, u + 2, v + e, 1, 0, lift, rgb[ci], sideRgb[ci]); }
      if (!filled(gx, gy + 1)) { const s = m & TL || fl(gx, gy + 1, BL) ? 1 : 0, e = m & TR || fl(gx, gy + 1, BR) ? 1 : 2; if (e > s) wall(u + s, v + 2, u + e, v + 2, 0, 1, lift, rgb[ci], sideRgb[ci]); }
      if (!filled(gx - 1, gy)) { const s = m & BL || fl(gx - 1, gy, BR) ? 1 : 0, e = m & TL || fl(gx - 1, gy, TR) ? 1 : 2; if (e > s) wall(u, v + s, u, v + e, -1, 0, lift, rgb[ci], sideRgb[ci]); }
      if (m & BL) wall(u, v + 1, u + 1, v, -H2, -H2, lift, rgb[ci], sideRgb[ci]);
      if (m & BR) wall(u + 1, v, u + 2, v + 1, H2, -H2, lift, rgb[ci], sideRgb[ci]);
      if (m & TR) wall(u + 2, v + 1, u + 1, v + 2, H2, H2, lift, rgb[ci], sideRgb[ci]);
      if (m & TL) wall(u + 1, v + 2, u, v + 1, -H2, H2, lift, rgb[ci], sideRgb[ci]);
      // A raised eye or mouth pixel steps up from a lower neighbour.
      if (lift > 0) {
        const lower = (nx: number, ny: number) => { const n = at[ny * W + nx]; return n >= 0 && cols[n].lift < lift ? cols[n].lift : -1; };
        let lo: number;
        if ((lo = lower(gx, gy - 1)) >= 0) step(u, v, u + 2, v, 0, -1, lo, lift, rgb[ci]);
        if ((lo = lower(gx + 1, gy)) >= 0) step(u + 2, v, u + 2, v + 2, 1, 0, lo, lift, rgb[ci]);
        if ((lo = lower(gx, gy + 1)) >= 0) step(u, v + 2, u + 2, v + 2, 0, 1, lo, lift, rgb[ci]);
        if ((lo = lower(gx - 1, gy)) >= 0) step(u, v, u, v + 2, -1, 0, lo, lift, rgb[ci]);
      }
      // Inner corners this pixel fills, in its colour.
      for (const f of fillsOf.get(ci) ?? []) {
        const dx = f.k % W, dy = Math.floor(f.k / W), du = dx * 2, dv = dy * 2;
        const [pu, pv, au, av, bu, bv] = f.corner === BL ? [du, dv, du, dv + 1, du + 1, dv] : f.corner === BR ? [du + 2, dv, du + 2, dv + 1, du + 1, dv] : f.corner === TR ? [du + 2, dv + 2, du + 2, dv + 1, du + 1, dv + 2] : [du, dv + 2, du, dv + 1, du + 1, dv + 2];
        ring.length = 0; ring.push(pu, pv, au, av, bu, bv);
        face(pu, pv, 0, rgb[ci], true);
        if (backs) face(pu, pv, 0, backRgb[ci], false);
        const fx = (au + bu) / 2 - pu, fy = (av + bv) / 2 - pv, l = Math.hypot(fx, fy);
        wall(au, av, bu, bv, fx / l, fy / l, 0, rgb[ci], sideRgb[ci]);
      }
    }
    groups.push({ start, count: ni - start, surface: cols[list[0]].surface });
  }
  const min: [number, number, number] = [Infinity, Infinity, Infinity], max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < np; i += 3) for (let a = 0; a < 3; a++) { const p = pos[i + a]; if (p < min[a]) min[a] = p; if (p > max[a]) max[a] = p; }
  return { positions: pos.slice(0, np), normals: nor.slice(0, np), colors: col.slice(0, np), index: idx.slice(0, ni), groups, min, max };
}
