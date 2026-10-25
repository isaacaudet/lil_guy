import { compose } from './compose';
import { dress, withItems, type Slot } from './items';
import { decode, encode, slotOf, type Finish, type Owned } from './owned';
import { paint } from './paint';
import { paletteOf } from './palette';
import { LAYER } from './parts/art';
import { resolve } from './resolve';

/**
 * Pixels to 3D: a guy, or one item on its own, as voxel columns, and the
 * columns as one mesh. Nothing here draws: a mesh is positions, normals and
 * colours a 3D engine takes as they are (three.js's BufferGeometry), split
 * into groups by the surface each finish should have, with the points a
 * convex collider needs.
 *
 * Each pixel is a column, deeper the further it sits inside the silhouette,
 * so a guy comes out pillow-round rather than a slab. Eyes and mouth stand
 * proud of the face, a hat sits forward, a frame becomes a plate behind
 * him and a buddy is its own little figure. An item on its own stays
 * shallow, since it is only a few pixels tall.
 */

/** What a frame holds: a colour per pixel and which worn copy it belongs to (0 none, 1 skin, 2 hat, 3 frame, 4 buddy). */
export interface VoxelSource {
  colors: (string | null)[][];
  slots: number[][];
}

export type SurfaceKind = Finish | 'body';

/** A physically based surface, in the terms three.js's MeshPhysicalMaterial takes. */
export interface Surface {
  kind: SurfaceKind;
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  /** Thin-film rainbow as it turns (Prism). */
  iridescence: number;
  /** Soft satin sheen (Sunset). */
  sheen: number;
  /** Light from inside, as a share of the surface's own colour (Nebula, Negative). */
  glow: number;
}

const SURFACES: Record<SurfaceKind, Omit<Surface, 'kind'>> = {
  body:     { roughness: .46, metalness: 0,   clearcoat: .35, clearcoatRoughness: .35, iridescence: 0, sheen: 0, glow: 0 },
  plain:    { roughness: .5,  metalness: 0,   clearcoat: .3,  clearcoatRoughness: .4,  iridescence: 0, sheen: 0, glow: 0 },
  sunset:   { roughness: .3,  metalness: .05, clearcoat: .9,  clearcoatRoughness: .12, iridescence: 0, sheen: 1, glow: 0 },
  tempered: { roughness: .28, metalness: .85, clearcoat: .4,  clearcoatRoughness: .2,  iridescence: 0, sheen: 0, glow: 0 },
  nebula:   { roughness: .22, metalness: .1,  clearcoat: 1,   clearcoatRoughness: .08, iridescence: 0, sheen: 0, glow: .9 },
  prism:    { roughness: .12, metalness: .35, clearcoat: 1,   clearcoatRoughness: .04, iridescence: 1, sheen: 0, glow: 0 },
  negative: { roughness: .1,  metalness: .2,  clearcoat: 1,   clearcoatRoughness: .03, iridescence: 0, sheen: 0, glow: .2 },
  gold:     { roughness: .16, metalness: 1,   clearcoat: .5,  clearcoatRoughness: .08, iridescence: 0, sheen: 0, glow: 0 },
};

/** A finish's surface, worn: scuff roughens it and dulls its coat, in tenths so copies share materials. */
export function surfaceOf(kind: SurfaceKind, scuff = 0): Surface {
  const s = SURFACES[kind], wear = Math.round(Math.min(1, Math.max(0, scuff)) * 10) / 10;
  return { kind, ...s, roughness: Math.min(1, +(s.roughness + wear * .55).toFixed(3)), clearcoat: +(s.clearcoat * (1 - wear)).toFixed(3) };
}

/** One pixel as a column: its middle in pixel units (y up, the grid centred on 0), how deep, its colours and surface. */
export interface VoxelColumn {
  x: number;
  y: number;
  z: number;
  depth: number;
  /** The front and sides, sRGB hex, darkened where a deeper neighbour shades it. */
  color: string;
  /** The back: the body's colour behind an eye or mouth. */
  back: string;
  slot: number;
  surface: Surface;
}

export interface VoxelOptions {
  /** An item on its own: shallow columns, nothing pushed forward. */
  item?: boolean;
}

const lum = (hex: string) => {
  const n = parseInt(hex.slice(1, 7), 16);
  return ((n >> 16 & 255) * .299 + (n >> 8 & 255) * .587 + (n & 255) * .114) / 255;
};
const darken = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1, 7), 16), f = (v: number) => Math.round(v * k).toString(16).padStart(2, '0');
  return `#${f(n >> 16 & 255)}${f(n >> 8 & 255)}${f(n & 255)}`;
};

/** Steps to the nearest pixel outside, 4-way; the border counts as outside. */
function inset(w: number, h: number, inside: (x: number, y: number) => boolean): number[][] {
  const d = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => inside(x, y) ? 99 : 0));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[y][x]) d[y][x] = Math.min(d[y][x], (d[y - 1]?.[x] ?? 0) + 1, (d[y][x - 1] ?? 0) + 1);
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) if (d[y][x]) d[y][x] = Math.min(d[y][x], (d[y + 1]?.[x] ?? 0) + 1, (d[y][x + 1] ?? 0) + 1);
  return d;
}

/** A frame (an animation frame, or `itemFrame`) as columns, each worn copy's pixels on its finish's surface. */
export function voxelColumns(frame: VoxelSource, owned: Partial<Record<Slot, Owned>> = {}, options: VoxelOptions = {}): VoxelColumn[] {
  const C = frame.colors, S = frame.slots, H = C.length, W = C[0]?.length ?? 0, small = !!options.item;
  const slotName = (s: number) => (['skin', 'hat', 'frame', 'buddy'] as const)[s - 1];
  const figure = inset(W, H, (x, y) => !!C[y][x] && S[y][x] !== 3 && S[y][x] !== 4);
  const buddy = inset(W, H, (x, y) => !!C[y][x] && S[y][x] === 4);
  const feature = (x: number, y: number) => {
    const c = C[y][x];
    if (!c || S[y][x] !== 0 || figure[y][x] < 2) return 0;
    const l = lum(c);
    return l < .22 ? .45 : l > .86 ? .3 : 0;
  };

  const front = Array.from({ length: H }, () => new Array<number>(W).fill(-Infinity));
  const span: ({ z0: number; z1: number } | null)[][] = Array.from({ length: H }, () => new Array(W).fill(null));
  let deepest = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = C[y][x], s = S[y][x];
    if (!c || s === 3) continue;
    const d = s === 4 ? buddy[y][x] : figure[y][x];
    let t = small ? 1 + .45 * Math.min(d, 3) : 1.3 + 1.05 * Math.min(d, 4);
    if (s === 4 && !small) t *= .82;
    if (s === 2 && !small) t += .5;
    const lift = feature(x, y);
    span[y][x] = { z0: -t / 2, z1: t / 2 + lift };
    front[y][x] = t / 2 + lift;
    deepest = Math.max(deepest, t);
  }

  const out: VoxelColumn[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = C[y][x], s = S[y][x];
    if (!c) continue;
    const copy = s ? owned[slotName(s)] : undefined;
    const surface = surfaceOf(copy ? copy.finish : 'body', copy ? copy.scuff : 0);
    const px = x - W / 2 + .5, py = H / 2 - y - .5;
    if (s === 3) {
      // A frame stands behind him as a plate.
      out.push({ x: px, y: py, z: -(deepest / 2 + .5), depth: .7, color: c, back: c, slot: s, surface });
      continue;
    }
    const { z0, z1 } = span[y][x]!;
    // Shaded where a deeper neighbour stands over it.
    let shade = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && (front[y + dy]?.[x + dx] ?? -Infinity) > z1 + .4) shade++;
    let back = c;
    if (feature(x, y)) {
      const around = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => { const n = C[y + dy]?.[x + dx]; return !!n && !feature(x + dx, y + dy) && lum(n) >= .22 && lum(n) <= .86; });
      if (around) back = C[y + around[1]][x + around[0]]!;
    }
    out.push({ x: px, y: py, z: (z0 + z1) / 2, depth: z1 - z0, color: shade ? darken(c, 1 - shade * .045) : c, back, slot: s, surface });
  }
  return out;
}

const SLOT_TOKENS: Record<Slot, [number, number]> = { skin: [LAYER.skin, LAYER.hat], hat: [LAYER.hat, LAYER.frame], frame: [LAYER.frame, LAYER.buddy], buddy: [LAYER.buddy, LAYER.buddy + 10] };

/** One copy on its own, cut out of a guy wearing it: a 16×16 frame with only the item's pixels. */
export function itemFrame(o: Owned, seed = 'display stand'): VoxelSource {
  const slot = slotOf(o);
  if (!slot) throw new Error(`Unknown item "${o.item}"`);
  const [lo, hi] = SLOT_TOKENS[slot], want = ['skin', 'hat', 'frame', 'buddy'].indexOf(slot) + 1;
  const base = resolve(seed);
  const draw = (equip: string[]) => { const cfg = dress(base, { equip }); const grid = compose(cfg); return { grid, colors: paint(grid, cfg, withItems(paletteOf(cfg), cfg)) }; };
  const worn = draw([encode(o)]);
  let mask = worn.grid.map(row => row.map(t => t >= lo && t < hi));
  if (!mask.some(r => r.some(Boolean))) {
    // A skin redraws the whole guy in its own colours, so it is whatever changed.
    const bare = draw([]);
    mask = worn.colors.map((row, y) => row.map((c, x) => !!c && c !== bare.colors[y][x]));
  }
  const colors = worn.colors.map((row, y) => row.map((c, x) => (mask[y][x] ? c : null)));
  return { colors, slots: colors.map(row => row.map(c => (c ? want : 0))) };
}

/** One copy on its own as columns. */
export function voxelItem(o: Owned): VoxelColumn[] {
  return voxelColumns(itemFrame(o), { [slotOf(o)!]: o }, { item: true });
}

/** Worn copies by slot, from their codes, for `voxelColumns` on a guy's animation frames. */
export function ownedOf(codes: readonly string[]): Partial<Record<Slot, Owned>> {
  const out: Partial<Record<Slot, Owned>> = {};
  for (const code of codes) { const o = decode(code); const slot = o && slotOf(o); if (o && slot) out[slot] = o; }
  return out;
}

export interface VoxelMesh {
  /** Triangles, not indexed: three floats a vertex. */
  positions: Float32Array;
  normals: Float32Array;
  /** Linear RGB (sRGB decoded), as three.js wants vertex colours. */
  colors: Float32Array;
  /** Vertex ranges sharing a surface: one material each. */
  groups: { start: number; count: number; surface: Surface }[];
  /** The silhouette's corners, front and back: enough for a convex collider. */
  hull: Float32Array;
  min: [number, number, number];
  max: [number, number, number];
}

const linear = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1, 7), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => { const c = v / 255; return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); }) as [number, number, number];
};

/** Columns as one mesh, `cell` units a pixel, with faces between touching columns left out. */
export function voxelMesh(columns: readonly VoxelColumn[], cell = 1): VoxelMesh {
  const at = new Map<string, VoxelColumn>();
  for (const c of columns) at.set(`${c.x},${c.y}`, c);
  const key = (s: Surface) => `${s.kind}|${s.roughness}|${s.clearcoat}`;
  const bySurface = new Map<string, VoxelColumn[]>();
  for (const c of columns) { const k = key(c.surface); if (!bySurface.has(k)) bySurface.set(k, []); bySurface.get(k)!.push(c); }

  const pos: number[] = [], nor: number[] = [], col: number[] = [], groups: VoxelMesh['groups'] = [];
  const quad = (a: number[], b: number[], c: number[], d: number[], n: number[], rgb: number[]) => {
    for (const p of [a, b, c, a, c, d]) { pos.push(p[0] * cell, p[1] * cell, p[2] * cell); nor.push(...n); col.push(...rgb); }
  };
  // The part of [z0, z1] a neighbour does not cover.
  const open = (z0: number, z1: number, n?: VoxelColumn): [number, number][] => {
    if (!n) return [[z0, z1]];
    const n0 = n.z - n.depth / 2, n1 = n.z + n.depth / 2, out: [number, number][] = [];
    if (n0 > z0) out.push([z0, Math.min(z1, n0)]);
    if (n1 < z1) out.push([Math.max(z0, n1), z1]);
    return out.filter(([a, b]) => b - a > 1e-6);
  };

  for (const list of bySurface.values()) {
    const start = pos.length / 3;
    for (const c of list) {
      const x0 = c.x - .5, x1 = c.x + .5, y0 = c.y - .5, y1 = c.y + .5, z0 = c.z - c.depth / 2, z1 = c.z + c.depth / 2;
      const face = linear(c.color), back = linear(c.back);
      quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], face);
      quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], back);
      for (const [a, b] of open(z0, z1, at.get(`${c.x - 1},${c.y}`))) quad([x0, y0, a], [x0, y0, b], [x0, y1, b], [x0, y1, a], [-1, 0, 0], face);
      for (const [a, b] of open(z0, z1, at.get(`${c.x + 1},${c.y}`))) quad([x1, y0, b], [x1, y0, a], [x1, y1, a], [x1, y1, b], [1, 0, 0], face);
      for (const [a, b] of open(z0, z1, at.get(`${c.x},${c.y + 1}`))) quad([x0, y1, b], [x1, y1, b], [x1, y1, a], [x0, y1, a], [0, 1, 0], face);
      for (const [a, b] of open(z0, z1, at.get(`${c.x},${c.y - 1}`))) quad([x0, y0, a], [x1, y0, a], [x1, y0, b], [x0, y0, b], [0, -1, 0], face);
    }
    groups.push({ start, count: pos.length / 3 - start, surface: list[0].surface });
  }

  const seen = new Set<string>(), hull: number[] = [];
  const min: [number, number, number] = [Infinity, Infinity, Infinity], max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const c of columns) {
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !at.has(`${c.x + dx},${c.y + dy}`));
    for (const px of [c.x - .5, c.x + .5]) for (const py of [c.y - .5, c.y + .5]) for (const pz of [c.z - c.depth / 2, c.z + c.depth / 2]) {
      const p = [px * cell, py * cell, pz * cell];
      p.forEach((v, i) => { min[i] = Math.min(min[i], v); max[i] = Math.max(max[i], v); });
      if (!edge) continue;
      const k = p.join(',');
      if (!seen.has(k)) { seen.add(k); hull.push(...p); }
    }
  }
  return { positions: new Float32Array(pos), normals: new Float32Array(nor), colors: new Float32Array(col), groups, hull: new Float32Array(hull), min, max };
}
