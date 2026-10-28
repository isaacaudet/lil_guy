import { buddyAlone, compose } from './compose';
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
  // An aura's own finishes: glowing light, never a solid thing.
  classic:  { roughness: .3,  metalness: 0,   clearcoat: .6,  clearcoatRoughness: .2,  iridescence: 0,  sheen: 0, glow: .7 },
  fade:     { roughness: .2,  metalness: .1,  clearcoat: .9,  clearcoatRoughness: .1,  iridescence: .5, sheen: 0, glow: .6 },
  frost:    { roughness: .1,  metalness: .2,  clearcoat: 1,   clearcoatRoughness: .04, iridescence: .3, sheen: 0, glow: .5 },
  toxic:    { roughness: .25, metalness: 0,   clearcoat: .8,  clearcoatRoughness: .12, iridescence: 0,  sheen: 0, glow: .9 },
  shadow:   { roughness: .4,  metalness: .3,  clearcoat: .5,  clearcoatRoughness: .2,  iridescence: 0,  sheen: 0, glow: .3 },
  sapphire: { roughness: .1,  metalness: .4,  clearcoat: 1,   clearcoatRoughness: .03, iridescence: .2, sheen: 0, glow: .6 },
  ruby:     { roughness: .1,  metalness: .4,  clearcoat: 1,   clearcoatRoughness: .03, iridescence: .2, sheen: 0, glow: .6 },
  pearl:    { roughness: .08, metalness: .5,  clearcoat: 1,   clearcoatRoughness: .02, iridescence: .6, sheen: 0, glow: .3 },
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
  /** The sides behind a thin rim of `color`: the body's colour where the front is the dark outline, so the outline reads as a line drawn on the front, not a dark wall. */
  side: string;
  slot: number;
  surface: Surface;
  /** How far an eye or mouth stands proud of the body: left out of the mesh's shading. */
  lift: number;
}

export interface VoxelOptions {
  /** An item on its own: shallow columns, nothing pushed forward. */
  item?: boolean;
  /** At most this many pixels deep, front to back, everything squeezed to fit (a game's pile piece keeps to its collider). */
  deepest?: number;
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
  const d = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x): number => inside(x, y) ? 99 : 0));
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
  // Squeezed to a cap, the face's lift with it.
  let squeeze = 1;
  if (options.deepest) {
    let lo = Infinity, hi = -Infinity;
    for (const row of span) for (const s of row) if (s) { lo = Math.min(lo, s.z0); hi = Math.max(hi, s.z1); }
    if (hi - lo > options.deepest) squeeze = options.deepest / (hi - lo);
  }
  if (squeeze < 1) {
    for (const row of span) for (const s of row) if (s) { s.z0 *= squeeze; s.z1 *= squeeze; }
    for (const row of front) row.forEach((v, x) => { row[x] = v * squeeze; });
    deepest *= squeeze;
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
      out.push({ x: px, y: py, z: -(deepest / 2 + .5), depth: .7, color: c, back: c, side: c, slot: s, surface, lift: 0 });
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
    const color = shade ? darken(c, 1 - shade * .045) : c;
    let side = color;
    if (lum(c) < .3 && (s === 4 ? buddy[y][x] : figure[y][x]) === 1) {
      // An outline pixel: its sides take the colour just inside it.
      const inside = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => C[y + dy]?.[x + dx]).filter((n): n is string => !!n && lum(n) >= .3);
      if (inside.length) side = darken(inside[0], .92);
    }
    out.push({ x: px, y: py, z: (z0 + z1) / 2, depth: z1 - z0, color, back, side, slot: s, surface, lift: feature(x, y) * squeeze });
  }
  return out;
}

const SLOT_TOKENS: Record<Slot, [number, number]> = { skin: [LAYER.skin, LAYER.hat], hat: [LAYER.hat, LAYER.frame], frame: [LAYER.frame, LAYER.buddy], buddy: [LAYER.buddy, LAYER.aura], aura: [LAYER.aura, LAYER.aura + 10] };

/** One copy on its own, cut out of a guy wearing it: a 16×16 frame with only the item's pixels. */
export function itemFrame(o: Owned, seed = 'display stand'): VoxelSource {
  const slot = slotOf(o);
  if (!slot) throw new Error(`Unknown item "${o.item}"`);
  const [lo, hi] = SLOT_TOKENS[slot], want = ['skin', 'hat', 'frame', 'buddy'].indexOf(slot) + 1;
  const base = resolve(seed);
  // A buddy is taken from where it stands beside him, whole: on his own sixteen columns it gives way to his face.
  const draw = (equip: string[]) => { const cfg = dress(base, { equip }); const grid = (slot === 'buddy' && buddyAlone(cfg)) || compose(cfg); return { grid, colors: paint(grid, cfg, withItems(paletteOf(cfg), cfg)) }; };
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
  /** The silhouette's corners, front and back, and the front and back of every column inside it: enough for a convex collider or a box. */
  hull: Float32Array;
  min: [number, number, number];
  max: [number, number, number];
}

const linear = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1, 7), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => { const c = v / 255; return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); }) as [number, number, number];
};

/**
 * Columns as one mesh, `cell` units a pixel, with faces between touching
 * columns left out. Normals come from a softened height map of the columns
 * (eyes and mouth left out of it), so a figure shades as one domed, moulded
 * toy with its edges rolling off round, while every pixel keeps its flat
 * colour; `smooth: false` gives each face its own flat normal instead.
 */
export function voxelMesh(columns: readonly VoxelColumn[], cell = 1, options: { smooth?: boolean } = {}): VoxelMesh {
  const smooth = options.smooth ?? true;
  const at = new Map<string, VoxelColumn>();
  for (const c of columns) at.set(`${c.x},${c.y}`, c);
  // The body's surface by grid cell (a column's lower-left corner), softened over its 3x3; a frame's plate stays flat.
  const OUTSIDE = -.6;
  const body = new Map<string, number>();
  for (const c of columns) if (c.slot !== 3) body.set(`${Math.floor(c.x)},${Math.floor(c.y)}`, (c.depth - c.lift) / 2);
  const softened = new Map<string, number>();
  const soft = (ix: number, iy: number) => {
    const k = `${ix},${iy}`;
    let v = softened.get(k);
    if (v === undefined) {
      v = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) v += body.get(`${ix + dx},${iy + dy}`) ?? OUTSIDE;
      softened.set(k, v /= 9);
    }
    return v;
  };
  // The surface's normal at a grid corner (gx, gy), front (+1) or back (-1).
  const surfaceNormal = (gx: number, gy: number, side: number): number[] => {
    const dx = (soft(gx, gy - 1) + soft(gx, gy) - soft(gx - 1, gy - 1) - soft(gx - 1, gy)) / 2;
    const dy = (soft(gx - 1, gy) + soft(gx, gy) - soft(gx - 1, gy - 1) - soft(gx, gy - 1)) / 2;
    const l = Math.hypot(dx, dy, 1);
    return [-dx / l, -dy / l, side / l];
  };
  const key = (s: Surface) => `${s.kind}|${s.roughness}|${s.clearcoat}`;
  const bySurface = new Map<string, VoxelColumn[]>();
  for (const c of columns) { const k = key(c.surface); if (!bySurface.has(k)) bySurface.set(k, []); bySurface.get(k)!.push(c); }

  const pos: number[] = [], nor: number[] = [], col: number[] = [], groups: VoxelMesh['groups'] = [];
  // `wall`: how much a side keeps its own facing over the surface's (the silhouette's sides; inner steps take none, so they never show as stripes).
  let flat = false, wall = 0;
  const shade = (p: number[], n: number[]) => {
    if (!smooth || flat) return n;
    const s = surfaceNormal(Math.round(p[0]), Math.round(p[1]), p[2] >= 0 ? 1 : -1);
    if (!wall) return s;
    const v = [s[0] + n[0] * wall, s[1] + n[1] * wall, s[2] + n[2] * wall], l = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / l, v[1] / l, v[2] / l];
  };
  const quad = (a: number[], b: number[], c: number[], d: number[], n: number[], rgb: number[]) => {
    const shaded = [a, b, c, d].map(p => shade(p, n));
    for (const i of [0, 1, 2, 0, 2, 3]) { const p = [a, b, c, d][i]; pos.push(p[0] * cell, p[1] * cell, p[2] * cell); nor.push(...shaded[i]); col.push(...rgb); }
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
      const face = linear(c.color), back = linear(c.back), side = linear(c.side ?? c.color);
      flat = c.slot === 3; wall = 0;
      // A side: its front RIM in the face's colour, the rest in the side's.
      const RIM = .4, rim = z1 - RIM;
      const wallQuads = (spans: [number, number][], corners: (a: number, b: number) => number[][], n: number[]) => {
        for (const [a, b] of spans) {
          if (c.side === undefined || c.side === c.color || b <= rim) { const q = corners(a, b); quad(q[0], q[1], q[2], q[3], n, b <= rim ? side : face); continue; }
          if (a < rim) { const q = corners(a, rim); quad(q[0], q[1], q[2], q[3], n, side); }
          const q = corners(Math.max(a, rim), b); quad(q[0], q[1], q[2], q[3], n, face);
        }
      };
      quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], face);
      quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], back);
      const left = at.get(`${c.x - 1},${c.y}`), right = at.get(`${c.x + 1},${c.y}`), up = at.get(`${c.x},${c.y + 1}`), down = at.get(`${c.x},${c.y - 1}`);
      wall = left ? 0 : .9;
      wallQuads(open(z0, z1, left), (a, b) => [[x0, y0, a], [x0, y0, b], [x0, y1, b], [x0, y1, a]], [-1, 0, 0]);
      wall = right ? 0 : .9;
      wallQuads(open(z0, z1, right), (a, b) => [[x1, y0, b], [x1, y0, a], [x1, y1, a], [x1, y1, b]], [1, 0, 0]);
      wall = up ? 0 : .9;
      wallQuads(open(z0, z1, up), (a, b) => [[x0, y1, b], [x1, y1, b], [x1, y1, a], [x0, y1, a]], [0, 1, 0]);
      wall = down ? 0 : .9;
      wallQuads(open(z0, z1, down), (a, b) => [[x0, y0, a], [x1, y0, a], [x1, y0, b], [x0, y0, b]], [0, -1, 0]);
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
    // Inside the silhouette only its front and back matter, the deepest there.
    if (!edge) for (const pz of [c.z - c.depth / 2, c.z + c.depth / 2]) hull.push(c.x * cell, c.y * cell, pz * cell);
  }
  return { positions: new Float32Array(pos), normals: new Float32Array(nor), colors: new Float32Array(col), groups, hull: new Float32Array(hull), min, max };
}
