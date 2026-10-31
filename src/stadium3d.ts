/**
 * The 3D stadium: the 2D stadium's crowd (./stadium) as the library's own 3D toys (./voxel), for a game
 * that has three.js. The same venues at the same head counts (a porch's steps up to 20, bleachers 50, a
 * gym 100, a hall 200, an arena 1,000, a stadium 5,000, a bowl past that), the same calls (`add`,
 * `remove`, `hop`, `wave`, `spotlight`), so a game can swap one for the other.
 *
 * Every guy is themself: their colours, hat, face and the finishes of what they wear. The rows nearest
 * the camera are whole toy meshes, lit and casting shadows; further back each guy is a picture of their
 * own toy, rendered at the size the seat needs (never stretched), turned to face the camera, and hazed
 * with distance, so ten thousand read as a crowd of these guys rather than noise. Toys and pictures are
 * made a few at a time, front rows first; until then a guy stands in as a plain toy in their own colour.
 * Everything is geometry drawn at the device's resolution with antialiasing: nothing is upscaled.
 *
 * Motion plays whatever the device's reduced-motion setting says (Isaac's rule for the club's games).
 */
import * as THREE from 'three';
import { crowdBase } from './crowd';
import type { GuySpec } from './guy-code';
import { animate, frameAt, type Animation } from './animate';
import { ownedOf, surfaceOf, voxelColumns } from './voxel';
import { crowdColumns, paletteFor, roundToy, type ToyMesh } from './stadium3d-mesh';
import { layout3d, nearSeats, stepWith, tileFor, venueFor, TILES, VENUES, type Layout3D, type VenueId } from './stadium3d-layout';
import { MODE, POSE_GLSL, ROW, SurfaceMaterials, glowChunk, patchToy, pictureMaterial, quadGeometry, shaftMesh, type GuyUniforms } from './stadium3d-gl';
import { buildVenue, freeEnvironments, type VenueBuild } from './stadium3d-venues';
import { hash } from './hash';

export { VENUES, venueFor, type VenueId };

export interface Stadium3DOptions {
  /** A slow wave round the stands. */
  wave?: boolean;
  /** Called when the crowd moves to a bigger (or smaller) venue. */
  onVenue?: (id: VenueId) => void;
  /** The font for a spotlit guy's line, as a CSS font. */
  font?: string;
  /** The most device pixels per CSS pixel it draws at (2 by default; phones are capped lower by the canvas's size). */
  maxPixelRatio?: number;
  /** Milliseconds a frame it may spend making guys' toys and pictures (6 by default; more while thousands wait). */
  budget?: number;
  /** Smooth edges (on by default). */
  antialias?: boolean;
  /** Soft shadows from the venue's main light (on by default). */
  shadows?: boolean;
}

/** What a frame cost and holds, for a game that watches its budget. */
export interface Stadium3DInfo { calls: number; triangles: number; geometries: number; textures: number; toys: number; pictures: number; waiting: number; pixelRatio: number }

export interface Stadium3D {
  /** Seats a guy by name (lowercased, once), in their club look when given. The venue grows to fit. */
  add(name: string, guy?: Partial<GuySpec>): void;
  /** Takes a guy out; the venue shrinks again if it can. */
  remove(name: string): void;
  has(name: string): boolean;
  /** Makes a guy hop, as when they guess. */
  hop(name: string): void;
  wave(on: boolean): void;
  /** Swings a spotlight onto a guy, lifts them to the front with a line under them for `ms`, and throws confetti. */
  spotlight(name: string, label?: string, ms?: number): void;
  resize(): void;
  /** Frees everything it made on the GPU and stops drawing. */
  destroy(): void;
  info(): Stadium3DInfo;
  readonly count: number;
  readonly venue: VenueId;
}

// ------------------------------------------------------------ constants

/** A guy's picture frame, in guys, and how far up it their feet are. */
const FRAME = 1.3, FOOT = 0.14;
/** The pictures' camera looks down this much (degrees), about as the stands are seen. */
const BAKE_TILT = 9;
/** One sixteenth: a pixel of a guy, in guys. */
const CELL = 1 / 16;
const PAGE = 2048;
const HOP_S = 0.42;

interface Page {
  rt: THREE.WebGLRenderTarget; tile: number; cols: number; capacity: number; next: number; free: number[]; used: number;
  owner: Float32Array; attr: THREE.InstancedBufferAttribute; geometry: THREE.InstancedBufferGeometry; mesh: THREE.Mesh; material: THREE.ShaderMaterial;
}

interface Guy3 {
  key: string; spec: GuySpec; slot: number; seat: number; joined: number;
  tint: number; glint: number; phase: number;
  toy: ToyMesh | null;
  near: boolean; inChunks: boolean; queued: boolean;
  /** The picture size they want: about their frame's size on screen. */
  want: number;
  tile: { page: Page; index: number } | null;
  hidden: boolean;
}

/** A buffer of merged toys for one surface. */
interface Chunk {
  mesh: THREE.Mesh; geometry: THREE.BufferGeometry; cap: number; icap: number; used: number; iused: number; dead: number;
  pos: Float32Array; nor: Int8Array; col: Uint8Array; guy: Float32Array; idx: Uint32Array;
  ranges: Map<number, { v0: number; vn: number; i0: number; inn: number }>;
}

const SPOT_DEFAULT = 2600;

/**
 * A 3D stadium on `canvas` (sized with CSS). Needs WebGL2 and three.js (a peer dependency); throws
 * where WebGL2 is missing, so a game can fall back to `createStadium`.
 */
export function createStadium3D(canvas: HTMLCanvasElement, options: Stadium3DOptions = {}): Stadium3D {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: options.antialias ?? true, alpha: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = options.shadows ?? true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // A frame is several passes (the venue, the winner, the line): `info()` counts them all.
  renderer.info.autoReset = false;
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  /** Shadows: a smaller map on a phone. */
  const shadowSize = coarse ? 1024 : 2048;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.5, 2000);
  const t0 = performance.now();
  const now = () => (performance.now() - t0) / 1000;

  // ------------------------------------------------------------ per-guy textures
  let cap = 0;
  let seatData: Float32Array<ArrayBuffer> = new Float32Array(0), stateData: Float32Array<ArrayBuffer> = new Float32Array(0), fromData: Float32Array<ArrayBuffer> = new Float32Array(0), lookData: Float32Array<ArrayBuffer> = new Float32Array(0);
  const blank = () => { const t = new THREE.DataTexture(new Float32Array(4), 1, 1, THREE.RGBAFormat, THREE.FloatType); t.needsUpdate = true; return t; };
  const uniforms: GuyUniforms = {
    uSeat: { value: blank() }, uState: { value: blank() }, uFrom: { value: blank() }, uLook: { value: blank() },
    uTime: { value: 0 }, uSlideAt: { value: -100 }, uWave: { value: new THREE.Vector4(0, 0, 1, 0) }, uArcZ: { value: 0 }, uDim: { value: 0 }, uSpot: { value: new THREE.Vector4() },
  };
  let dirty = { seat: false, state: false, from: false, look: false };
  function dataTexture(data: Float32Array<ArrayBuffer>, rows: number) {
    const t = new THREE.DataTexture(data, ROW, rows, THREE.RGBAFormat, THREE.FloatType);
    t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
    return t;
  }
  /** Room for `n` guys in the textures, doubling as the crowd grows. */
  function ensureCap(n: number) {
    if (n <= cap) return;
    let c = Math.max(ROW * 4, cap);
    while (c < n) c *= 2;
    const grow = (old: Float32Array<ArrayBuffer>) => { const a = new Float32Array(c * 4); a.set(old); return a; };
    seatData = grow(seatData); stateData = grow(stateData); fromData = grow(fromData); lookData = grow(lookData);
    for (const [u, d] of [[uniforms.uSeat, seatData], [uniforms.uState, stateData], [uniforms.uFrom, fromData], [uniforms.uLook, lookData]] as const) {
      u.value.dispose();
      u.value = dataTexture(d, c / ROW);
    }
    cap = c;
    standIns.geometry.instanceCount = cap;
  }

  // ------------------------------------------------------------ guys
  const guys = new Map<string, Guy3>();
  const bySlot: (Guy3 | undefined)[] = [];
  const freeSlots: number[] = [];
  let nextSlot = 0;
  const materials = new SurfaceMaterials((m, s) => {
    m.onBeforeCompile = shader => { patchToy(shader, uniforms, true); glowChunk(shader, s.glow); };
    m.customProgramCacheKey = () => `toy${s.glow}`;
  });
  const depthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  depthMaterial.onBeforeCompile = shader => patchToy(shader, uniforms, false);
  depthMaterial.customProgramCacheKey = () => 'toydepth';

  let layout: Layout3D | null = null, venue: VenueId = 'porch', laidFor = 1, venueBuild: VenueBuild | null = null;
  const free: number[] = [];
  let next = 0;
  /** Seat number to guy, for neighbours. */
  let bySeat: (Guy3 | undefined)[] = [];
  /** Per seat: its place in its row (left to right), and per row the seats left to right. */
  let rowOrder: number[][] = [], placeOf = new Int32Array(0);
  let near = new Set<number>(), shades: Float32Array = new Float32Array(0);

  const writeSeat = (g: Guy3) => {
    const s = g.slot * 4, seat = layout && g.seat >= 0 && g.seat < layout.seats.length ? layout.seats[g.seat] : null;
    if (seat) { seatData[s] = seat.x; seatData[s + 1] = seat.y; seatData[s + 2] = seat.z; seatData[s + 3] = seat.yaw; }
    stateData[s + 3] = seat ? shades[g.seat] ?? 0 : 0;
    dirty.seat = dirty.state = true;
  };
  const modeOf = (g: Guy3) => !layout || g.seat < 0 || g.seat >= layout.seats.length || g.hidden ? MODE.hidden : g.near && g.inChunks ? MODE.toy : g.tile ? MODE.picture : MODE.standIn;
  const writeMode = (g: Guy3) => { stateData[g.slot * 4 + 2] = modeOf(g); dirty.state = true; };
  const animateGuy = (g: Guy3, kind: number, at = now()) => { stateData[g.slot * 4] = at; stateData[g.slot * 4 + 1] = kind; dirty.state = true; };

  // ------------------------------------------------------------ near guys: toys merged by surface
  const chunks = new Map<THREE.Material, Chunk[]>();
  const toyGroup = new THREE.Group();
  scene.add(toyGroup);
  function newChunk(material: THREE.Material, cap: number): Chunk {
    const geometry = new THREE.BufferGeometry(), icap = Math.ceil(cap * 1.5);
    const c: Chunk = { mesh: null!, geometry, cap, icap, used: 0, iused: 0, dead: 0, pos: new Float32Array(cap * 3), nor: new Int8Array(cap * 3), col: new Uint8Array(cap * 3), guy: new Float32Array(cap).fill(-1), idx: new Uint32Array(icap), ranges: new Map() };
    geometry.setAttribute('position', new THREE.BufferAttribute(c.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('normal', new THREE.BufferAttribute(c.nor, 3, true).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('color', new THREE.BufferAttribute(c.col, 3, true).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aGuy', new THREE.BufferAttribute(c.guy, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setIndex(new THREE.BufferAttribute(c.idx, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setDrawRange(0, 0);
    c.mesh = new THREE.Mesh(geometry, material);
    c.mesh.frustumCulled = false; c.mesh.castShadow = true; c.mesh.receiveShadow = true;
    c.mesh.customDepthMaterial = depthMaterial;
    toyGroup.add(c.mesh);
    return c;
  }
  function addToy(g: Guy3, toy: ToyMesh) {
    const lift = -toy.min[1];
    for (const grp of toy.groups) {
      if (!grp.count) continue;
      const material = materials.get(grp.surface);
      let i0v = Infinity, i1v = -1;
      for (let i = grp.start; i < grp.start + grp.count; i++) { const v = toy.index[i]; if (v < i0v) i0v = v; if (v > i1v) i1v = v; }
      const vn = i1v - i0v + 1, inn = grp.count;
      let list = chunks.get(material);
      if (!list) chunks.set(material, list = []);
      let c = list.find(c => c.used + vn <= c.cap && c.iused + inn <= c.icap);
      if (!c) { c = newChunk(material, Math.max(1 << 15, vn)); list.push(c); }
      const v0 = c.used, ii0 = c.iused;
      for (let v = 0; v < vn; v++) {
        const s = (i0v + v) * 3, d = (v0 + v) * 3;
        c.pos[d] = toy.positions[s]; c.pos[d + 1] = toy.positions[s + 1] + lift; c.pos[d + 2] = toy.positions[s + 2];
        c.nor[d] = Math.round(toy.normals[s] * 127); c.nor[d + 1] = Math.round(toy.normals[s + 1] * 127); c.nor[d + 2] = Math.round(toy.normals[s + 2] * 127);
        c.col[d] = toy.colors[s]; c.col[d + 1] = toy.colors[s + 1]; c.col[d + 2] = toy.colors[s + 2];
        c.guy[v0 + v] = g.slot;
      }
      for (let i = 0; i < inn; i++) c.idx[ii0 + i] = toy.index[grp.start + i] - i0v + v0;
      c.used += vn; c.iused += inn;
      const prev = c.ranges.get(g.slot);
      // A guy whose toy has two groups on one surface keeps both.
      if (prev) c.ranges.set(g.slot, { v0: Math.min(prev.v0, v0), vn: v0 + vn - Math.min(prev.v0, v0), i0: Math.min(prev.i0, ii0), inn: ii0 + inn - Math.min(prev.i0, ii0) });
      else c.ranges.set(g.slot, { v0, vn, i0: ii0, inn });
      touch(c, v0, vn, ii0, inn);
    }
    g.inChunks = true;
    writeMode(g);
  }
  function touch(c: Chunk, v0: number, vn: number, i0: number, inn: number) {
    for (const name of ['position', 'normal', 'color', 'aGuy'] as const) {
      const a = c.geometry.getAttribute(name) as THREE.BufferAttribute;
      a.addUpdateRange(v0 * a.itemSize, vn * a.itemSize); a.needsUpdate = true;
    }
    const ix = c.geometry.index!;
    ix.addUpdateRange(i0, inn); ix.needsUpdate = true;
    c.geometry.setDrawRange(0, c.iused);
  }
  function removeToy(g: Guy3) {
    if (!g.inChunks) return;
    for (const [material, list] of chunks) for (const c of [...list]) {
      const r = c.ranges.get(g.slot);
      if (!r) continue;
      c.guy.fill(-1, r.v0, r.v0 + r.vn);
      c.ranges.delete(g.slot);
      c.dead += r.vn;
      if (!c.ranges.size) {
        // Nobody left in it: its buffers go back.
        toyGroup.remove(c.mesh); c.geometry.dispose();
        list.splice(list.indexOf(c), 1);
        if (!list.length) chunks.delete(material);
        continue;
      }
      const a = c.geometry.getAttribute('aGuy') as THREE.BufferAttribute;
      a.addUpdateRange(r.v0, r.vn); a.needsUpdate = true;
      if (c.dead > c.used * 0.5) compact(c);
    }
    g.inChunks = false;
    writeMode(g);
  }
  /** Packs a chunk's live toys to its front once half of it is gone. */
  function compact(c: Chunk) {
    const pos = new Float32Array(c.cap * 3), nor = new Int8Array(c.cap * 3), col = new Uint8Array(c.cap * 3), guy = new Float32Array(c.cap).fill(-1), idx = new Uint32Array(c.icap);
    let v = 0, i = 0;
    const ranges = new Map<number, { v0: number; vn: number; i0: number; inn: number }>();
    for (const [slot, r] of c.ranges) {
      pos.set(c.pos.subarray(r.v0 * 3, (r.v0 + r.vn) * 3), v * 3); nor.set(c.nor.subarray(r.v0 * 3, (r.v0 + r.vn) * 3), v * 3); col.set(c.col.subarray(r.v0 * 3, (r.v0 + r.vn) * 3), v * 3);
      guy.fill(slot, v, v + r.vn);
      for (let k = 0; k < r.inn; k++) idx[i + k] = c.idx[r.i0 + k] - r.v0 + v;
      ranges.set(slot, { v0: v, vn: r.vn, i0: i, inn: r.inn });
      v += r.vn; i += r.inn;
    }
    Object.assign(c, { pos, nor, col, guy, idx, ranges, used: v, iused: i, dead: 0 });
    const g = c.geometry;
    (g.getAttribute('position') as THREE.BufferAttribute).array = pos; (g.getAttribute('normal') as THREE.BufferAttribute).array = nor;
    (g.getAttribute('color') as THREE.BufferAttribute).array = col; (g.getAttribute('aGuy') as THREE.BufferAttribute).array = guy; g.index!.array = idx;
    for (const name of ['position', 'normal', 'color', 'aGuy']) { const a = g.getAttribute(name) as THREE.BufferAttribute; a.clearUpdateRanges(); a.needsUpdate = true; }
    g.index!.clearUpdateRanges(); g.index!.needsUpdate = true;
    g.setDrawRange(0, i);
  }

  // ------------------------------------------------------------ far guys: pictures of their toys
  let bake = makeBaker(renderer);
  const pages: Page[] = [];
  const pictureGroup = new THREE.Group();
  scene.add(pictureGroup);
  /** How many far guys want each size of picture, so a new page is made about as big as they need. */
  const wanting = new Map<number, number>();
  /** A new page's size: room for the far guys the pages of this size don't hold yet, a power of two up to PAGE. */
  function pageSize(tile: number) {
    let room = 0, held = 0;
    for (const p of pages) if (p.tile === tile && p !== standInPage) { room += p.capacity - p.used; held += p.used; }
    const side = tile * Math.ceil(Math.sqrt(Math.max(48, ((wanting.get(tile) ?? 0) - held - room) * 1.12)));
    return Math.max(256, Math.min(PAGE, 2 ** Math.ceil(Math.log2(side))));
  }
  function newPage(tile: number, size = pageSize(tile)): Page {
    const rt = new THREE.WebGLRenderTarget(size, size, { colorSpace: THREE.SRGBColorSpace, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
    const cols = Math.floor(size / tile), capacity = cols * cols, owner = new Float32Array(capacity).fill(-1);
    const geometry = quadGeometry(), attr = new THREE.InstancedBufferAttribute(owner, 1).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('aGuy', attr);
    geometry.instanceCount = 0;
    const material = pictureMaterial(uniforms, rt.texture, { tile, size, standIn: false, frame: FRAME, foot: FOOT });
    if (venueBuild) material.uniforms.uLight.value.copy(venueBuild.crowdLight);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    pictureGroup.add(mesh);
    const page: Page = { rt, tile, cols, capacity, next: 0, free: [], used: 0, owner, attr, geometry, mesh, material };
    pages.push(page);
    return page;
  }
  function allocTile(g: Guy3, tile: number): { page: Page; index: number } {
    let page = pages.find(p => p.tile === tile && p !== standInPage && (p.free.length || p.next < p.capacity));
    if (!page) page = newPage(tile);
    const index = page.free.length ? page.free.pop()! : page.next++;
    page.used++;
    page.owner[index] = g.slot;
    page.attr.addUpdateRange(index, 1); page.attr.needsUpdate = true;
    page.geometry.instanceCount = page.next;
    return { page, index };
  }
  function freeTile(g: Guy3) {
    if (!g.tile) return;
    const { page, index } = g.tile;
    page.owner[index] = -1; page.attr.addUpdateRange(index, 1); page.attr.needsUpdate = true;
    page.free.push(index); page.used--;
    g.tile = null;
    if (!page.used) dropPage(page);
  }
  function dropPage(page: Page) {
    pictureGroup.remove(page.mesh);
    page.rt.dispose(); page.geometry.dispose(); page.material.dispose();
    pages.splice(pages.indexOf(page), 1);
  }
  /** A guy's picture size for their seat: about their frame's size on screen, so far rows are as sharp as near ones. */
  const wantTile = (g: Guy3) => (layout && g.seat >= 0 && g.seat < layout.seats.length ? tileFor(layout.seats[g.seat].h * renderer.domElement.height * FRAME) : TILES[1]);
  /** A picture is kept while it is the size wanted or one size bigger; smaller would be stretched, bigger is copied down. */
  const roomy = (have: number, want: number) => have <= (TILES[TILES.indexOf(want as (typeof TILES)[number]) + 1] ?? want);
  /** Far guys' pictures made smaller: each copied down from the one they have, on the GPU, so nobody's toy is made again. */
  function shrinkPictures() {
    const moving = [...guys.values()].filter(g => !g.near && g.tile && g.tile.page.tile > g.want && !roomy(g.tile.page.tile, g.want));
    for (let i = 0; i < moving.length; i += 4096) {
      const batch = moving.slice(i, i + 4096);
      const spots = batch.map(g => { const old = g.tile; const spot = allocTile(g, g.want); g.tile = old; return spot; });
      bake.shrink(batch.map(g => g.tile!), spots);
      batch.forEach((g, k) => { freeTile(g); g.tile = spots[k]; writeMode(g); });
    }
  }

  // The stand-in: one plain toy, white, pictured once and tinted each guy's colour.
  const standInPage = (() => {
    const page = newPage(64, 64);
    pictureGroup.remove(page.mesh); page.material.dispose(); page.geometry.dispose();
    return page;
  })();
  const standInMaterial = pictureMaterial(uniforms, standInPage.rt.texture, { tile: 64, size: 64, standIn: true, frame: FRAME, foot: FOOT });
  const standIns = new THREE.Mesh(quadGeometry(), standInMaterial);
  standIns.frustumCulled = false;
  (standIns.geometry as THREE.InstancedBufferGeometry).instanceCount = 0;
  pictureGroup.add(standIns);
  const standInToy = roundToy(voxelColumns(standInSource()), CELL, { backs: false });
  bake.render([standInToy], 64, [{ page: standInPage, index: 0 }]);

  // ------------------------------------------------------------ making toys and pictures, a few a frame
  let queue: Guy3[] = [];
  let qHead = 0;
  function want(g: Guy3) { if (!g.queued) { g.queued = true; queue.push(g); } }
  function needs(g: Guy3) {
    if (!layout || g.seat < 0 || g.seat >= layout.seats.length || !guys.has(g.key)) return { toy: false, tile: false };
    return { toy: g.near && !g.inChunks, tile: !g.near && (!g.tile || g.tile.page.tile < g.want) };
  }
  function work(budget: number) {
    const start = performance.now();
    // Pictures are made in a batch a size.
    const batches = new Map<number, { guys: Guy3[]; toys: ToyMesh[] }>();
    while (qHead < queue.length && performance.now() - start < budget) {
      const g = queue[qHead++];
      g.queued = false;
      const need = needs(g);
      if (!need.toy && !need.tile) { if (!g.near) g.toy = null; continue; }
      const toy = g.toy ?? roundToy(crowdColumns(g.spec), CELL, { backs: false });
      if (need.toy) { g.toy = toy; addToy(g, toy); }
      if (need.tile) {
        let b = batches.get(g.want);
        if (!b) batches.set(g.want, b = { guys: [], toys: [] });
        b.guys.push(g); b.toys.push(toy);
        if (!g.near) g.toy = null;
        if (b.guys.length >= Math.min(32, Math.floor(4096 / g.want))) flush(b.guys, b.toys, g.want);
      }
    }
    for (const [tile, b] of batches) flush(b.guys, b.toys, tile);
    if (qHead > 4096 && qHead > queue.length / 2) { queue = queue.slice(qHead); qHead = 0; }
  }
  function flush(batch: Guy3[], toys: ToyMesh[], tile: number) {
    if (!batch.length) return;
    const spots = batch.map(g => { const old = g.tile; const spot = allocTile(g, tile); g.tile = old; return spot; });
    bake.render(toys, tile, spots);
    // Each guy's old picture is freed once the new one is in.
    batch.forEach((g, i) => { if (g.tile) freeTile(g); g.tile = spots[i]; writeMode(g); });
    batch.length = 0; toys.length = 0;
  }

  // ------------------------------------------------------------ the venue and where everyone sits
  function sortQueue() {
    const list = [...guys.values()].filter(g => needs(g).toy || needs(g).tile);
    list.sort((a, b) => a.seat - b.seat);
    for (const g of queue.slice(qHead)) g.queued = false;
    queue = []; qHead = 0;
    for (const g of list) want(g);
  }
  /** Which seats get toys, the picture size, and who needs what made. */
  function plan() {
    if (!layout) return;
    const devH = renderer.domElement.height, count = guys.size;
    const most = coarse ? 160 : 420;
    near = nearSeats(layout.seats, Math.min(count, layout.seats.length), devH, 52, most);
    wanting.clear();
    for (const g of guys.values()) {
      const was = g.near;
      g.near = g.seat >= 0 && near.has(g.seat);
      if (was && !g.near) { removeToy(g); g.toy = null; }
      // The picture holds the guy and their frame's margin, so it is made for the frame's size on screen.
      g.want = g.near ? 0 : wantTile(g);
      if (!g.near) wanting.set(g.want, (wanting.get(g.want) ?? 0) + 1);
      writeMode(g);
    }
    shrinkPictures();
    sortQueue();
  }
  /** Lays venue `id` out again for the crowd: `kind` is how the change looks. */
  function relayout(kind: 'cut' | 'slide' | 'dissolve', id: VenueId = layout?.id ?? venueFor(Math.max(1, guys.size))) {
    const aspect = renderer.domElement.width / Math.max(1, renderer.domElement.height);
    const before = layout, changed = !before || before.id !== id || Math.abs(before.aspect - aspect) > 1e-3;
    const fresh = layout3d(id, aspect, laidFor);
    // People re-seated in the order they sit, newcomers after.
    const seated = [...guys.values()].sort((a, b) => (a.seat < 0 ? 1e9 : a.seat) - (b.seat < 0 ? 1e9 : b.seat) || a.joined - b.joined);
    if (kind === 'slide') {
      for (const g of seated) { const s = g.slot * 4; fromData[s] = seatData[s]; fromData[s + 1] = seatData[s + 1]; fromData[s + 2] = seatData[s + 2]; fromData[s + 3] = g.seat >= 0 ? 1 : 0; }
      uniforms.uSlideAt.value = now(); dirty.from = true;
    } else { for (const g of seated) fromData[g.slot * 4 + 3] = 0; dirty.from = true; }
    if (kind === 'dissolve') fade.capture();
    layout = fresh;
    seated.forEach((g, i) => { g.seat = i < fresh.seats.length ? i : -1; });
    free.length = 0; next = Math.min(seated.length, fresh.seats.length);
    if (changed || !venueBuild || !fresh.spec.fixed) setVenue(fresh);
    shades = venueBuild!.shades;
    indexSeats();
    for (const g of seated) writeSeat(g);
    plan();
  }
  function indexSeats() {
    if (!layout) return;
    bySeat = [];
    for (const g of guys.values()) if (g.seat >= 0) bySeat[g.seat] = g;
    rowOrder = layout.rows.map(() => []);
    layout.seats.forEach((s, i) => rowOrder[s.row]?.push(i));
    placeOf = new Int32Array(layout.seats.length);
    rowOrder.forEach(row => { row.sort((a, b) => layout!.seats[a].x - layout!.seats[b].x); row.forEach((s, p) => { placeOf[s] = p; }); });
  }
  /** Venues taken down this frame: freed once the next frame is drawn, so the new one's shaders are the old one's, not compiled again. */
  let retired: VenueBuild[] = [];
  function setVenue(L: Layout3D) {
    const old = venueBuild;
    // The same venue for a bigger crowd: only its geometry changes; it keeps the old one's textures.
    venueBuild = buildVenue(L, renderer, { carry: old?.id === L.id ? old.textures : undefined, shadowSize: L.id === 'porch' || L.id === 'bleachers' || L.id === 'gym' || L.id === 'hall' ? shadowSize : 1024 });
    if (old) { scene.remove(old.group); retired.push(old); }
    scene.add(venueBuild.group);
    scene.fog = venueBuild.fog;
    scene.background = venueBuild.background;
    scene.environment = venueBuild.environment;
    scene.environmentIntensity = venueBuild.envIntensity;
    for (const p of pages) p.material.uniforms.uLight.value.copy(venueBuild.crowdLight);
    standInMaterial.uniforms.uLight.value.copy(venueBuild.crowdLight);
    camera.fov = L.camera.fov; camera.aspect = L.camera.aspect; camera.near = L.camera.near; camera.far = L.camera.far;
    camera.updateProjectionMatrix();
    uniforms.uArcZ.value = L.spec.shape === 'arc' ? L.spec.radius : 0;
    uniforms.uWave.value.z = L.spec.shape === 'arc' ? Math.max(0.05, L.reach) * L.spec.radius : Math.max(1, L.reach);
    uniforms.uWave.value.w = L.spec.shape === 'arc' ? L.spec.radius : 0;
  }

  // The crowd grew or shrank past a step: laid out again at the next frame, once however many come before it.
  let due = false;
  /** The step and venue for the crowd now: up at once, down only once well under (`stepWith`). */
  const target = () => stepWith(Math.max(1, guys.size), laidFor, layout?.id ?? venue);
  const changes = () => { const t = target(); return t.step !== laidFor || t.venue !== layout?.id; };
  function grown() {
    due = true;
    const id = target().venue;
    if (id !== venue) { venue = id; options.onVenue?.(venue); }
  }
  function regrow() {
    due = false;
    const t = target();
    if (layout && t.step === laidFor && t.venue === layout.id) return;
    const same = layout?.id === t.venue;
    laidFor = t.step;
    relayout(!layout ? 'cut' : same && guys.size <= 300 ? 'slide' : 'dissolve', t.venue);
  }

  // ------------------------------------------------------------ the old picture fading out under a new layout
  const fade = (() => {
    let tex: THREE.FramebufferTexture | null = null, from = -1;
    const material = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: null as THREE.Texture | null }, uAlpha: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'uniform sampler2D uTex; uniform float uAlpha; varying vec2 vUv; void main() { gl_FragColor = vec4(texture2D(uTex, vUv).rgb, uAlpha); }',
      transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    quad.frustumCulled = false;
    const holder = new THREE.Scene();
    holder.add(quad);
    const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    return {
      /** Keeps what the canvas shows now. */
      capture() {
        const w = renderer.domElement.width, h = renderer.domElement.height;
        // The canvas has no alpha, so the copy is RGB: an RGBA one can't be copied into from it.
        if (!tex || tex.image.width !== w || tex.image.height !== h) { tex?.dispose(); tex = new THREE.FramebufferTexture(w, h); tex.format = THREE.RGBFormat; tex.internalFormat = 'RGB8'; }
        draw(true);
        renderer.copyFramebufferToTexture(tex);
        material.uniforms.uTex.value = tex;
        from = now();
      },
      busy: () => from >= 0,
      draw() {
        if (from < 0 || !tex) return;
        const a = 1 - (now() - from) / 0.6;
        if (a <= 0) { from = -1; tex.dispose(); tex = null; return; }
        material.uniforms.uAlpha.value = a * a * (3 - 2 * a);
        renderer.autoClear = false;
        renderer.render(holder, ortho);
        renderer.autoClear = true;
      },
      dispose() { tex?.dispose(); material.dispose(); quad.geometry.dispose(); },
    };
  })();

  // ------------------------------------------------------------ the spotlight
  const spot = makeSpotlight(scene, renderer, options.font);
  const flashes = makeFlashes(pictureGroup, uniforms);
  let lit: { guy: Guy3; label: string; from: number; until: number; landed: boolean } | null = null;

  // ------------------------------------------------------------ size
  let cssW = 0, cssH = 0;
  function measure(): boolean {
    const w = canvas.clientWidth || 300, h = canvas.clientHeight || 150;
    const most = coarse ? 1.6e6 : 4.2e6;
    const ratio = Math.max(1, Math.min(globalThis.devicePixelRatio || 1, options.maxPixelRatio ?? 2, Math.sqrt(most / (w * h))));
    if (w === cssW && h === cssH && renderer.getPixelRatio() === ratio) return false;
    cssW = w; cssH = h;
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    return true;
  }
  const remeasure = () => { if (!gone && measure() && layout) relayout('cut'); };
  let watch: ResizeObserver | null = null;
  if (typeof ResizeObserver === 'function') { watch = new ResizeObserver(remeasure); watch.observe(canvas); }
  // Dragged to a screen with another pixel ratio, the canvas keeps its CSS size, so its pixels are watched too.
  let ratioQuery: MediaQueryList | null = null;
  const onRatio = () => { watchRatio(); remeasure(); };
  function watchRatio() {
    ratioQuery?.removeEventListener('change', onRatio);
    ratioQuery = typeof matchMedia === 'function' ? matchMedia(`(resolution: ${globalThis.devicePixelRatio || 1}dppx)`) : null;
    ratioQuery?.addEventListener('change', onRatio);
  }
  watchRatio();

  // ------------------------------------------------------------ a lost GPU
  // A phone backgrounding the tab, a GPU reset or an OBS source can take the context; three.js brings back
  // what it has the data for, and everything drawn into a texture (the pictures, the stand-in, the
  // environments) is made again here.
  let lost = false;
  const onLost = () => { lost = true; };
  const onRestored = () => {
    lost = false;
    if (gone) return;
    bake.dispose();
    bake = makeBaker(renderer);
    for (const p of [...pages]) if (p !== standInPage) dropPage(p);
    for (const g of guys.values()) { g.tile = null; writeMode(g); }
    bake.render([standInToy], 64, [{ page: standInPage, index: 0 }]);
    for (const v of retired) v.dispose();
    retired = [];
    freeEnvironments(renderer);
    if (venueBuild) { scene.remove(venueBuild.group); venueBuild.dispose(); venueBuild = null; }
    if (layout) setVenue(layout);
    sortQueue();
  };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  // ------------------------------------------------------------ the frame
  let frame = 0, gone = false, waving = false, waveAmp = 0, drawMs = 4;
  const drift = new THREE.Vector3();
  function draw(still = false) {
    if (!layout) return;
    const t = now();
    uniforms.uTime.value = t;
    // A gentle drift: the camera sways and breathes, never far enough to lose a seat off the frame's edge.
    const c = layout.camera, d = c.position[2];
    drift.set(Math.sin(t * 0.13) * d * 0.006, Math.sin(t * 0.09 + 1) * d * 0.003, Math.sin(t * 0.07) * d * 0.004);
    camera.position.set(c.position[0] + drift.x, c.position[1] + drift.y, c.position[2] + drift.z);
    camera.lookAt(c.target[0] + drift.x * 0.5, c.target[1], c.target[2]);
    waveAmp += ((waving ? 1 : 0) - waveAmp) * 0.06;
    if (waveAmp < 0.002 && !waving) waveAmp = 0;
    uniforms.uWave.value.x = waveAmp;
    if (lit && !still) spotFrame(t);
    venueBuild?.update(t, uniforms.uDim.value);
    flashes.set(!!venueBuild?.night, nextSlot, renderer.domElement.width, renderer.domElement.height);
    if (dirty.seat) uniforms.uSeat.value.needsUpdate = true;
    if (dirty.state) uniforms.uState.value.needsUpdate = true;
    if (dirty.from) uniforms.uFrom.value.needsUpdate = true;
    if (dirty.look) uniforms.uLook.value.needsUpdate = true;
    dirty = { seat: false, state: false, from: false, look: false };
    renderer.setRenderTarget(null);
    if (!still) renderer.info.reset();
    renderer.render(scene, camera);
    if (!still) { fade.draw(); spot.drawStage(camera); }
  }
  function loop() {
    frame = 0;
    if (gone) return;
    if (!lost) {
      if (due) regrow();
      // Making toys and pictures in what the frame has left after drawing: more while many wait, less while
      // the spotlight or a change of venue plays.
      const waiting = queue.length - qHead, base = options.budget ?? 6;
      const budget = waiting > 200 && !lit && !fade.busy() ? Math.max(base, Math.min(base * 2.2, 14 - drawMs)) : base * 0.7;
      const start = performance.now();
      spot.work(base * 0.5);
      work(Math.max(1, budget - (performance.now() - start)));
      const d0 = performance.now();
      draw();
      drawMs += (performance.now() - d0 - drawMs) * 0.1;
      // The venues taken down for this one are freed now its shaders are in use.
      if (retired.length) {
        for (const v of retired) v.dispose();
        retired = [];
        freeEnvironments(renderer, venueBuild?.environment);
      }
      // Nothing waiting: the strip the toys are pictured in goes back.
      if (qHead >= queue.length) bake.rest();
    }
    frame = requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------ the spotlight's turn of a frame
  function spotFrame(t: number) {
    const s = lit!;
    if (t >= s.until || guys.get(s.guy.key) !== s.guy) { endSpot(); return; }
    const seat = layout && s.guy.seat >= 0 && s.guy.seat < layout.seats.length ? layout.seats[s.guy.seat] : null;
    const dim = Math.max(0, Math.min(1, (t - s.from) / 0.25, (s.until - t) / 0.3));
    uniforms.uDim.value = dim;
    if (!s.landed && t - s.from > 0.3) {
      s.landed = true;
      // The neighbours jump as the light lands.
      if (seat && s.guy.seat < placeOf.length) {
        const row = rowOrder[seat.row] ?? [], p = placeOf[s.guy.seat];
        [-1, 1, -2, 2, -3, 3].forEach((d, k) => { const n = bySeat[row[p + d]]; if (n) animateGuy(n, 3, t + 0.04 * k); });
      }
    }
    spot.frame(t, seat, camera, layout!, venueBuild!, scene);
  }
  function endSpot() {
    if (!lit) return;
    const g = lit.guy;
    lit = null;
    g.hidden = false;
    if (guys.has(g.key)) writeMode(g);
    uniforms.uDim.value = 0;
    spot.end();
  }

  // ------------------------------------------------------------ start
  measure();
  ensureCap(ROW * 4);
  relayout('cut');
  spot.warm(camera, scene);
  if (options.wave) { waving = true; uniforms.uWave.value.y = now(); }
  frame = requestAnimationFrame(loop);

  return {
    add(name, look = {}) {
      const key = name.toLowerCase();
      if (gone || guys.has(key)) return;
      const spec = { ...look, seed: look.seed ?? key } as GuySpec;
      const slot = freeSlots.length ? freeSlots.pop()! : nextSlot++;
      ensureCap(slot + 1);
      const b = crowdBase(spec), n = parseInt(b.body.slice(1, 7), 16);
      const g: Guy3 = { key, spec, slot, seat: -1, joined: performance.now(), tint: n, glint: b.shine ? parseInt(b.shine.color.slice(1, 7), 16) : 0, phase: (hash(key) % 1000) / 1000, toy: null, near: false, inChunks: false, queued: false, want: TILES[1], tile: null, hidden: false };
      guys.set(key, g); bySlot[slot] = g;
      const l = slot * 4;
      lookData[l] = g.tint; lookData[l + 1] = g.glint; lookData[l + 2] = g.phase; dirty.look = true;
      fromData[l + 3] = 0; dirty.from = true;
      const before = changes();
      g.seat = before ? next : free.length ? free.shift()! : next++;
      if (before) { next++; grown(); }
      if (layout && g.seat < layout.seats.length) {
        bySeat[g.seat] = g;
        writeSeat(g);
        g.near = near.has(g.seat) || (layout.seats[g.seat].h * renderer.domElement.height >= 52 && near.size < (coarse ? 160 : 420));
        if (g.near) near.add(g.seat);
        else { g.want = wantTile(g); wanting.set(g.want, (wanting.get(g.want) ?? 0) + 1); }
        animateGuy(g, 2);
      }
      writeMode(g);
      want(g);
    },
    remove(name) {
      const g = guys.get(name.toLowerCase());
      if (gone || !g) return;
      if (lit?.guy === g) endSpot();
      guys.delete(g.key);
      removeToy(g); freeTile(g);
      g.toy = null;
      stateData[g.slot * 4 + 2] = MODE.hidden; dirty.state = true;
      bySlot[g.slot] = undefined; freeSlots.push(g.slot);
      if (g.seat >= 0) { if (bySeat[g.seat] === g) bySeat[g.seat] = undefined; let i = 0; while (i < free.length && free[i] < g.seat) i++; free.splice(i, 0, g.seat); }
      if (changes()) grown();
    },
    has: name => guys.has(name.toLowerCase()),
    hop(name) {
      const g = guys.get(name.toLowerCase());
      if (gone || !g) return;
      const t = now(), s = g.slot * 4;
      if (stateData[s + 1] > 0.5 && t - stateData[s] < HOP_S) return;
      animateGuy(g, 1, t);
    },
    wave(on) { if (gone) return; if (on && !waving) uniforms.uWave.value.y = now(); waving = on; },
    spotlight(name, label, ms = SPOT_DEFAULT) {
      const g = guys.get(name.toLowerCase());
      if (gone || !g || !layout) return;
      if (lit) endSpot();
      const t = now();
      lit = { guy: g, label: label ?? name, from: t, until: t + ms / 1000, landed: false };
      g.hidden = true;
      writeMode(g);
      spot.start(g.spec, g.toy, lit.label, t, lit.until);
    },
    resize() { remeasure(); },
    destroy() {
      if (gone) return;
      gone = true;
      if (frame) cancelAnimationFrame(frame);
      watch?.disconnect();
      ratioQuery?.removeEventListener('change', onRatio);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      endSpot();
      spot.dispose();
      flashes.dispose();
      fade.dispose();
      for (const v of retired) v.dispose();
      retired = [];
      venueBuild?.dispose();
      freeEnvironments(renderer);
      for (const list of chunks.values()) for (const c of list) c.geometry.dispose();
      chunks.clear();
      materials.dispose(); depthMaterial.dispose();
      for (const p of [...pages]) { if (p === standInPage) { p.rt.dispose(); continue; } dropPage(p); }
      standIns.geometry.dispose(); standInMaterial.dispose();
      bake.dispose();
      for (const u of [uniforms.uSeat, uniforms.uState, uniforms.uFrom, uniforms.uLook]) u.value.dispose();
      guys.clear();
      // Everything it made is freed above; the canvas keeps its context, so a new stadium can draw on it,
      // with the context's upload settings back as a fresh one has them.
      const gl = renderer.getContext();
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      renderer.dispose();
    },
    info() {
      const i = renderer.info;
      let pictures = 0, toys = 0;
      for (const g of guys.values()) { if (g.tile) pictures++; if (g.inChunks) toys++; }
      return { calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, toys, pictures, waiting: queue.length - qHead, pixelRatio: renderer.getPixelRatio() };
    },
    get count() { return guys.size; },
    get venue() { return venue; },
  };
}

// ------------------------------------------------------------ the stand-in

/** A plain round toy: white, an ink outline and two eyes, tinted each waiting guy's colour. */
function standInSource() {
  const S = 16, colors: (string | null)[][] = [], slots: number[][] = [];
  for (let y = 0; y < S; y++) {
    colors.push([]); slots.push([]);
    for (let x = 0; x < S; x++) {
      const u = (x + 0.5 - 8) / 6.4, v = (y + 0.5 - 9.6) / 6;
      const inside = u * u + v * v <= 1;
      colors[y].push(inside ? '#ffffff' : null); slots[y].push(0);
    }
  }
  const edge = (x: number, y: number) => colors[y][x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !colors[y + dy]?.[x + dx]);
  const ring: [number, number][] = [];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (edge(x, y)) ring.push([x, y]);
  for (const [x, y] of ring) colors[y][x] = '#4a4a4a';
  for (const [x, y] of [[5, 8], [5, 9], [10, 8], [10, 9]]) colors[y][x] = '#141414';
  return { colors, slots };
}

// ------------------------------------------------------------ the baker: toys into pictures

/**
 * Renders toys into atlas tiles: a row of them at a time into a small antialiased strip, then each
 * copied into its tile, so a page only ever gets whole new tiles and keeps its mipmaps clean.
 */
function makeBaker(renderer: THREE.WebGLRenderer) {
  const scene = new THREE.Scene();
  const key = new THREE.DirectionalLight('#fff4e6', 2.4);
  key.position.set(-4, 7, 9);
  const fill = new THREE.DirectionalLight('#cfdcff', 0.7);
  fill.position.set(6, 2, 4);
  scene.add(key, fill, new THREE.HemisphereLight('#e8eeff', '#3a3028', 0.9));
  const pm = new THREE.PMREMGenerator(renderer), room = studio();
  const env = pm.fromScene(room, 0.04);
  scene.environment = env.texture;
  room.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); } });
  scene.environmentIntensity = 0.55;
  pm.dispose();
  const materials = new SurfaceMaterials((m, s) => { if (s.glow) { m.onBeforeCompile = sh => glowChunk(sh, s.glow); m.customProgramCacheKey = () => `bake${s.glow}`; } });
  const camera = new THREE.OrthographicCamera(0, 1, 1, 0, -50, 50);
  const tilt = BAKE_TILT * Math.PI / 180;
  // The camera looks down by the tilt; guys stand in a row along its right, feet FOOT up its up.
  camera.position.set(0, 0, 0);
  camera.lookAt(0, -Math.sin(tilt), -Math.cos(tilt));
  camera.updateMatrixWorld();
  const up = new THREE.Vector3(0, Math.cos(tilt), -Math.sin(tilt)), fwd = new THREE.Vector3(0, -Math.sin(tilt), -Math.cos(tilt));
  let strip: THREE.WebGLRenderTarget | null = null;
  // Copies tiles out of the strip: one instanced quad a tile, each from its place in the strip to its place on a page.
  const blitGeometry = quadGeometry();
  const MOST = 4096;
  const src = new THREE.InstancedBufferAttribute(new Float32Array(MOST * 4), 4), dst = new THREE.InstancedBufferAttribute(new Float32Array(MOST * 4), 4);
  src.setUsage(THREE.DynamicDrawUsage); dst.setUsage(THREE.DynamicDrawUsage);
  blitGeometry.setAttribute('aSrc', src); blitGeometry.setAttribute('aDst', dst);
  const blitMaterial = new THREE.ShaderMaterial({
    uniforms: { uStrip: { value: null as THREE.Texture | null } },
    vertexShader: 'attribute vec4 aSrc; attribute vec4 aDst; varying vec2 vUv; void main() { vec2 c = vec2(position.x + 0.5, position.y); vUv = mix(aSrc.xy, aSrc.zw, c); gl_Position = vec4(mix(aDst.xy, aDst.zw, c), 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D uStrip; varying vec2 vUv; void main() { gl_FragColor = texture2D(uStrip, vUv); }',
    depthTest: false, depthWrite: false, blending: THREE.NoBlending, toneMapped: false,
  });
  const blit = new THREE.Mesh(blitGeometry, blitMaterial);
  blit.frustumCulled = false;
  const blitScene = new THREE.Scene();
  blitScene.add(blit);
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const clear = new THREE.Color();
  /** Places tile `i` of a draw: from `from` (u0, v0, u1, v1 in its texture) to tile `to` of a page. */
  const place = (i: number, from: [number, number, number, number], to: { page: Page; index: number }, tile: number) => {
    const cx = to.index % to.page.cols, cy = Math.floor(to.index / to.page.cols), S = to.page.rt.width;
    src.setXYZW(i, ...from);
    dst.setXYZW(i, cx * tile / S * 2 - 1, cy * tile / S * 2 - 1, (cx + 1) * tile / S * 2 - 1, (cy + 1) * tile / S * 2 - 1);
  };
  /** Draws `count` placed tiles from `texture` into `page`. */
  const copy = (texture: THREE.Texture, page: Page, count: number) => {
    src.needsUpdate = dst.needsUpdate = true;
    blitGeometry.instanceCount = count;
    blitMaterial.uniforms.uStrip.value = texture;
    renderer.setRenderTarget(page.rt);
    renderer.autoClear = false;
    renderer.render(blitScene, ortho);
    renderer.autoClear = true;
  };
  return {
    /** Pictures `toys` at `tile` pixels into the tiles `spots`. */
    render(toys: ToyMesh[], tile: number, spots: { page: Page; index: number }[]) {
      const n = toys.length, width = Math.min(4096, Math.max(tile, Math.floor(4096 / tile) * tile));
      if (!strip || strip.height !== tile || strip.width !== width) {
        strip?.dispose();
        strip = new THREE.WebGLRenderTarget(width, tile, { samples: 4, colorSpace: THREE.SRGBColorSpace, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false });
      }
      const per = Math.floor(width / tile);
      for (let from = 0; from < n; from += per) {
        const meshes: THREE.Mesh[] = [];
        for (let k = from; k < Math.min(n, from + per); k++) {
          const toy = toys[k], geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.BufferAttribute(toy.positions, 3));
          geometry.setAttribute('normal', new THREE.BufferAttribute(toy.normals, 3));
          // Colours as linear floats here: a picture is made once, so it takes the plain path.
          const lin = new Float32Array(toy.colors.length);
          for (let i = 0; i < lin.length; i++) { const c = toy.colors[i] / 255; lin[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
          geometry.setAttribute('color', new THREE.BufferAttribute(lin, 3));
          geometry.setIndex(new THREE.BufferAttribute(toy.index, 1));
          const mats: THREE.Material[] = [];
          toy.groups.forEach((g, i) => { geometry.addGroup(g.start, g.count, i); mats.push(materials.get(g.surface)); });
          const mesh = new THREE.Mesh(geometry, mats);
          // Feet at the bottom middle of its tile, FOOT up.
          const x = (k - from + 0.5) * FRAME;
          mesh.position.set(x, 0, 0).addScaledVector(up, FOOT).addScaledVector(fwd, 10);
          mesh.position.y -= toy.min[1];
          scene.add(mesh); meshes.push(mesh);
        }
        camera.left = 0; camera.right = per * FRAME; camera.top = FRAME; camera.bottom = 0;
        camera.updateProjectionMatrix();
        renderer.getClearColor(clear);
        const alpha = renderer.getClearAlpha();
        renderer.setRenderTarget(strip);
        renderer.setClearColor(0x000000, 0);
        renderer.clear();
        renderer.render(scene, camera);
        renderer.setClearColor(clear, alpha);
        for (const m of meshes) { scene.remove(m); m.geometry.dispose(); }
        // Each tile copied to its page, one page a draw.
        const byPage = new Map<Page, number[]>();
        for (let k = from; k < Math.min(n, from + per); k++) { const list = byPage.get(spots[k].page) ?? []; list.push(k); byPage.set(spots[k].page, list); }
        for (const [page, ks] of byPage) {
          ks.forEach((k, i) => { const c = k - from; place(i, [c * tile / width, 0, (c + 1) * tile / width, 1], spots[k], tile); });
          copy(strip.texture, page, ks.length);
        }
      }
      renderer.setRenderTarget(null);
    },
    /** Copies pictures down to a smaller size: `from` tiles to `to` tiles, filtered through the bigger one's mipmaps. */
    shrink(from: { page: Page; index: number }[], to: { page: Page; index: number }[]) {
      const pairs = new Map<Page, Map<Page, number[]>>();
      from.forEach((f, k) => {
        let byTo = pairs.get(f.page);
        if (!byTo) pairs.set(f.page, byTo = new Map());
        let list = byTo.get(to[k].page);
        if (!list) byTo.set(to[k].page, list = []);
        list.push(k);
      });
      for (const [fromPage, byTo] of pairs) for (const [toPage, ks] of byTo) {
        for (let at = 0; at < ks.length; at += MOST) {
          const part = ks.slice(at, at + MOST), S = fromPage.rt.width, t = fromPage.tile;
          part.forEach((k, i) => {
            const cx = from[k].index % fromPage.cols, cy = Math.floor(from[k].index / fromPage.cols);
            place(i, [cx * t / S, cy * t / S, (cx + 1) * t / S, (cy + 1) * t / S], to[k], toPage.tile);
          });
          copy(fromPage.rt.texture, toPage, part.length);
        }
      }
      renderer.setRenderTarget(null);
    },
    /** Lets the strip go while nothing waits to be pictured. */
    rest() { strip?.dispose(); strip = null; },
    dispose() {
      strip?.dispose();
      env.dispose();
      materials.dispose();
      blitGeometry.dispose(); blitMaterial.dispose();
    },
  };
}

/** A soft studio for the pictures' reflections: a dim room with a big light overhead and two at the sides. */
function studio(): THREE.Scene {
  const s = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(20, 12, 20), new THREE.MeshBasicMaterial({ color: '#3c4150', side: THREE.BackSide }));
  s.add(room);
  const panel = (w: number, h: number, c: string, p: [number, number, number], look: [number, number, number]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
    m.position.set(...p); m.lookAt(...look); s.add(m);
  };
  panel(10, 6, '#ffffff', [0, 5.9, 2], [0, 0, 0]);
  panel(4, 8, '#ffe7c8', [-9.9, 1, 3], [0, 1, 3]);
  panel(4, 8, '#c8dcff', [9.9, 1, -2], [0, 1, -2]);
  return s;
}

// ------------------------------------------------------------ the spotlight

/**
 * The winner's moment: a beam swings onto their seat, the stand dims, the neighbours jump, and the
 * winner (their whole self, cheering) leaps out of their seat to the front with a line under them;
 * confetti bursts as they land.
 */
function makeSpotlight(scene: THREE.Scene, renderer: THREE.WebGLRenderer, font?: string) {
  const group = new THREE.Group();
  scene.add(group);
  const materials = new SurfaceMaterials((m, s) => { if (s.glow) { m.onBeforeCompile = sh => glowChunk(sh, s.glow); m.customProgramCacheKey = () => `win${s.glow}`; } });
  // The winner stands in their own pass over the venue, lit as on a stage whatever the venue's lights do
  // (dimmed for the moment, or behind them): a key from the front, the spotlight's warm rim, a soft fill.
  const stage3 = new THREE.Scene();
  const key = new THREE.DirectionalLight('#fff6ea', 2.3), rim = new THREE.DirectionalLight('#ffe2b0', 2.2);
  stage3.add(key, key.target, rim, rim.target, new THREE.HemisphereLight('#e8eeff', '#3a3028', 0.9));
  // The beam: a shaft from the light down onto the winner, and a real spotlight to light them.
  const beam = shaftMesh('#fff2d6');
  beam.visible = false;
  beam.renderOrder = 5;
  group.add(beam);
  const light = new THREE.SpotLight('#fff1d8', 0, 0, 0.32, 0.5, 0);
  light.castShadow = false;
  group.add(light, light.target);
  // The pool of light on the floor under them.
  const poolMaterial = new THREE.MeshBasicMaterial({ color: '#fff2d6', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, map: radial() });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 48), poolMaterial);
  pool.rotation.x = -Math.PI / 2;
  pool.visible = false;
  group.add(pool);
  // Confetti is drawn with the winner, against the venue's depth, so it falls round them and behind the rows in front.
  const confetti = makeConfetti(stage3);
  // The line under them, drawn on a canvas at the device's pixels, shown over the frame.
  const label = makeLabel(renderer, font);

  /** A winner, built: their seated toy straight away, their cheer a few frames at a time; kept for the next few spotlights. */
  interface Winner { key: string; spec: GuySpec; root: THREE.Group; still: THREE.Mesh; anim: Animation | null; frames: THREE.Mesh[]; made: number; bySig: Map<string, THREE.Mesh> }
  const kept: Winner[] = [];
  let figure: Winner | null = null, shown: THREE.Mesh | null = null;
  const meshOf = (toy: ToyMesh) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(toy.positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(toy.normals, 3));
    const lin = new Float32Array(toy.colors.length);
    for (let i = 0; i < lin.length; i++) { const c = toy.colors[i] / 255; lin[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
    geometry.setAttribute('color', new THREE.BufferAttribute(lin, 3));
    geometry.setIndex(new THREE.BufferAttribute(toy.index, 1));
    const mats: THREE.Material[] = [];
    toy.groups.forEach((g, i) => { geometry.addGroup(g.start, g.count, i); mats.push(materials.get(g.surface)); });
    const mesh = new THREE.Mesh(geometry, mats);
    // Feet on the floor.
    mesh.position.y = -toy.min[1];
    mesh.visible = false;
    return mesh;
  };
  const free = (w: Winner) => { stage3.remove(w.root); for (const m of w.root.children) (m as THREE.Mesh).geometry.dispose(); };
  const show = (m: THREE.Mesh) => { if (shown === m) return; if (shown) shown.visible = false; m.visible = true; shown = m; };

  const at = new THREE.Vector3(), seatAt = new THREE.Vector3(), stage = new THREE.Vector3(), lightAt = new THREE.Vector3(), ray = new THREE.Vector3(), fwd = new THREE.Vector3();
  const up = new THREE.Vector3(), side = new THREE.Vector3(), top = new THREE.Vector3();
  let from = 0, until = 0, confettiAt = -1, scale = 1, fixture: THREE.Vector3 | null = null;
  const ease = (x: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
  return {
    /** The winner's moment from `t` to `end`: `seated` is their crowd toy if it is already made. */
    start(spec: GuySpec, seated: ToyMesh | null, line: string, t: number, end: number) {
      this.clear();
      const k = JSON.stringify([spec.seed, spec.parts ?? null, spec.equip ?? null, spec.palette ?? null]);
      let w = kept.find(x => x.key === k);
      if (w) kept.splice(kept.indexOf(w), 1);
      else {
        const still = meshOf(seated ?? roundToy(crowdColumns(spec), CELL, { backs: true }));
        const root = new THREE.Group();
        root.add(still);
        w = { key: k, spec, root, still, anim: null, frames: [], made: 0, bySig: new Map() };
      }
      kept.push(w);
      while (kept.length > 4) free(kept.shift()!);
      stage3.add(w.root);
      figure = w;
      shown = null;
      from = t; until = end; confettiAt = -1; fixture = null;
      label.set(line);
    },
    /** Makes the winner's cheer, a little a frame: the moves first (once), then each new pose's toy. */
    work(budget: number) {
      const w = figure;
      if (!w || w.anim && w.made >= w.anim.frames.length) return;
      const start = performance.now();
      if (!w.anim) {
        // In their own colours, as their toy in the crowd is.
        w.anim = animate(w.spec.seed, 'cheer', { parts: w.spec.parts, equip: w.spec.equip, palette: paletteFor(w.spec), rarity: false });
        return;
      }
      const owned = ownedOf(w.spec.equip ?? []);
      while (w.made < w.anim.frames.length && performance.now() - start < budget) {
        const f = w.anim.frames[w.made++], sig = JSON.stringify(f.colors);
        let m = w.bySig.get(sig);
        if (!m) { m = meshOf(roundToy(voxelColumns(f, owned).filter(c => c.slot !== 3), CELL, { backs: true })); w.root.add(m); w.bySig.set(sig, m); }
        w.frames.push(m);
      }
    },
    frame(t: number, seat: { x: number; y: number; z: number; yaw: number } | null, cam: THREE.PerspectiveCamera, L: Layout3D, venue: VenueBuild, scene: THREE.Scene) {
      const w = figure;
      if (!w) return;
      const k = t - from, back = until - t;
      // Where they land: low in the frame, on the floor in front of the stand, or up on a theatre's stage in front of its lip.
      const front = L.spec.shape === 'arc' ? 0 : -(L.rows[0]?.back ?? 0), raised = venue.raised, floorY = raised ? raised.y : 0;
      for (let ny = -0.5; ny >= -0.96; ny -= 0.02) {
        ray.set(0, ny, 0.5).unproject(cam).sub(cam.position).normalize();
        if (ray.y > -0.01) continue;
        stage.copy(cam.position).addScaledVector(ray, (floorY - cam.position.y) / ray.y);
        if (raised ? stage.z >= raised.z + 0.6 : stage.z >= front + 0.9) break;
      }
      cam.getWorldDirection(fwd);
      const depth = stage.clone().sub(cam.position).dot(fwd), frameH = 2 * depth * Math.tan(cam.fov * Math.PI / 360);
      // About a fifth of the frame, and never more than about 9 CSS pixels a pixel of them: the moment is the
      // light, their line and their cheer, not a blown-up toy.
      const cssH = renderer.domElement.height / renderer.getPixelRatio();
      const want = Math.min(0.32 * frameH, 16 * 9 * frameH / Math.max(1, cssH));
      scale = want;
      if (seat) seatAt.set(seat.x, seat.y, seat.z); else seatAt.copy(stage).add(new THREE.Vector3(0, -2, 0));
      const rise = seat ? ease((k - 0.25) / 0.45) * ease(back / 0.35) : ease(k / 0.3) * ease(back / 0.35);
      at.lerpVectors(seatAt, stage, rise);
      // A hop in the arc between, so it reads as a leap, not a slide.
      const hop = Math.sin(Math.PI * rise) * want * 0.5;
      at.y += hop;
      const sc = 1 + (want - 1) * rise;
      w.root.position.copy(at);
      w.root.scale.setScalar(sc);
      w.root.rotation.y = seat ? seat.yaw * (1 - rise) : 0;
      // Their cheer once it is made; their seated self until then.
      if (w.anim && w.made >= w.anim.frames.length) show(w.frames[w.anim.frames.indexOf(frameAt(w.anim, k * 1000))]);
      else show(w.still);
      // The light: from the fixture nearest their seat, landing on it, then swinging with them (the same fixture throughout).
      if (!fixture) {
        const fixtures = venue.fixtures;
        fixture = fixtures.length ? fixtures.reduce((a, b) => (Math.abs(b.x - at.x) < Math.abs(a.x - at.x) ? b : a)).clone() : new THREE.Vector3(at.x, at.y + 30, at.z);
      }
      lightAt.copy(fixture);
      const on = Math.max(0, Math.min(1, k / 0.25, back / 0.3));
      top.copy(at).y += sc * 0.55;
      const len = lightAt.distanceTo(top) + sc * 0.6;
      beam.visible = on > 0;
      const radius = sc * 0.95, bu = beam.material.uniforms;
      bu.uFrom.value.copy(lightAt); bu.uTo.value.copy(at); bu.uTo.value.y -= hop;
      bu.uR0.value = sc * 0.12; bu.uR1.value = radius; bu.uFade.value = 0.5; bu.uAlpha.value = 0.42 * on;
      light.position.copy(lightAt);
      light.target.position.copy(at);
      light.intensity = 7 * on;
      light.distance = 0;
      light.angle = Math.min(0.5, Math.atan(radius * 0.9 / len));
      pool.visible = on > 0;
      pool.position.set(at.x, at.y - hop + 0.02, at.z);
      pool.scale.setScalar(sc * 0.7);
      poolMaterial.opacity = 0.32 * on;
      // Confetti as they land, from about their chest.
      if (confettiAt < 0 && k > 0.72) { confettiAt = t; confetti.burst(stage.clone().add(new THREE.Vector3(0, want * 0.55, 0)), want, t); }
      confetti.update(t);
      // The stage's lights: the key from over the camera's shoulder, the rim from the spotlight's fixture.
      up.set(0, 1, 0).applyQuaternion(cam.quaternion); side.set(1, 0, 0).applyQuaternion(cam.quaternion);
      key.position.copy(cam.position).addScaledVector(up, sc * 4).addScaledVector(side, -sc * 2.5); key.target.position.copy(at);
      rim.position.copy(lightAt); rim.target.position.copy(at); rim.intensity = 2.2 * on;
      stage3.environment = scene.environment; stage3.environmentIntensity = scene.environmentIntensity;
      // Their line, under their feet.
      const feet = at.clone().project(cam);
      label.place((feet.x + 1) / 2, (1 - feet.y) / 2, Math.max(0, Math.min(1, (k - 0.45) / 0.3, back / 0.3)));
    },
    /** Draws the winner into the frame just drawn (behind the rows in front of their seat as they rise), then their line. */
    drawStage(cam: THREE.PerspectiveCamera) {
      if (figure) {
        renderer.autoClear = false;
        renderer.render(stage3, cam);
        renderer.autoClear = true;
      }
      label.draw();
    },
    /** Compiles the winner's pass ahead of the first win, so it doesn't stall the moment. */
    warm(cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
      const dummy = new THREE.Mesh(new THREE.BufferGeometry(), materials.get(surfaceOf('body')));
      dummy.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
      dummy.geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(9), 3));
      dummy.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(9), 3));
      stage3.add(dummy);
      stage3.environment = scene.environment;
      const shown = [beam.visible, pool.visible];
      beam.visible = pool.visible = true;
      const done = () => { stage3.remove(dummy); dummy.geometry.dispose(); };
      const compile = (renderer as THREE.WebGLRenderer & { compileAsync?: (s: THREE.Object3D, c: THREE.Camera, t?: THREE.Scene) => Promise<unknown> }).compileAsync;
      if (compile) {
        compile.call(renderer, stage3, cam).then(done, done);
        compile.call(renderer, group, cam, scene).catch(() => {});
      } else done();
      [beam.visible, pool.visible] = shown;
    },
    clear() {
      if (figure) { stage3.remove(figure.root); if (shown) shown.visible = false; figure = null; shown = null; }
    },
    end() { this.clear(); beam.visible = false; pool.visible = false; light.intensity = 0; label.place(0, 0, 0); confetti.stop(); },
    dispose() {
      this.end();
      for (const w of kept) free(w);
      kept.length = 0;
      beam.geometry.dispose(); beam.material.dispose(); pool.geometry.dispose(); poolMaterial.map?.dispose(); poolMaterial.dispose();
      materials.dispose(); confetti.dispose(); label.dispose(); scene.remove(group);
    },
  };
}

/** A soft round fall-off, for pools of light and glows. */
export function radial(size = 128): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!, grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.45, 'rgba(255,255,255,0.55)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Confetti: small paper rectangles in the club's colours, thrown up and fluttering down, all on the GPU. */
function makeConfetti(group: THREE.Object3D) {
  const N = 200;
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]), 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  const seed = new Float32Array(N * 4), colour = new Float32Array(N * 3);
  const CLUB = ['#e8792f', '#2e8c8a', '#4e7fb3', '#c2403f', '#3fa35b', '#7d4fa6', '#e36a8e', '#e7b53b', '#f3eee4'];
  for (let i = 0; i < N; i++) {
    seed.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
    const c = new THREE.Color(CLUB[i % CLUB.length]);
    colour.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
  geometry.setAttribute('aColour', new THREE.InstancedBufferAttribute(colour, 3));
  geometry.instanceCount = N;
  const material = new THREE.ShaderMaterial({
    uniforms: { uT: { value: -10 }, uOrigin: { value: new THREE.Vector3() }, uSize: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute vec4 aSeed; attribute vec3 aColour;
      uniform float uT; uniform vec3 uOrigin; uniform float uSize;
      varying vec3 vColour; varying float vLight;
      void main() {
        float t = uT;
        if (t < 0.0 || t > 3.2) { gl_Position = vec4(0.0, 0.0, -2.0, 1.0); return; }
        // Out from their chest, wide and not high: it peaks about a head over them and falls round them.
        float a = aSeed.x * 6.2832, up = 0.55 + aSeed.y * 0.8, wide = 0.35 + aSeed.z * 0.7;
        vec3 v = vec3(cos(a) * wide * 3.2, up * 1.3, sin(a) * wide * 1.2) * uSize;
        // Thrown up, slowed by the air, then drifting down with a flutter.
        float drag = 1.0 - exp(-t * 2.2);
        vec3 p = uOrigin + v * drag / 2.2 - vec3(0.0, 0.55 * uSize * t * t * 0.5 + 0.15 * uSize * t, 0.0);
        p.x += sin(t * (4.0 + aSeed.w * 4.0) + aSeed.x * 9.0) * 0.12 * uSize;
        float spin = t * (6.0 + aSeed.z * 8.0) + aSeed.y * 6.0;
        float c = cos(spin), s = sin(spin);
        vec3 local = vec3(position.x * 0.075, position.y * 0.042 * c, position.y * 0.042 * s) * uSize;
        float yaw = aSeed.w * 6.2832 + t * 2.0;
        local = vec3(local.x * cos(yaw) - local.z * sin(yaw), local.y, local.x * sin(yaw) + local.z * cos(yaw));
        vec4 mv = modelViewMatrix * vec4(p + local, 1.0);
        gl_Position = projectionMatrix * mv;
        vColour = aColour;
        vLight = 0.55 + 0.45 * abs(c);
        float fadeOut = clamp((3.2 - t) / 0.6, 0.0, 1.0);
        vLight *= fadeOut;
      }`,
    fragmentShader: 'varying vec3 vColour; varying float vLight; void main() { if (vLight < 0.02) discard; gl_FragColor = vec4(vColour * vLight, 1.0); \n#include <colorspace_fragment>\n }',
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  group.add(mesh);
  let at = -10;
  return {
    burst(origin: THREE.Vector3, size: number, t: number) { material.uniforms.uOrigin.value.copy(origin); material.uniforms.uSize.value = size; at = t; },
    update(t: number) { material.uniforms.uT.value = t - at; },
    stop() { at = -10; material.uniforms.uT.value = -10; },
    dispose() { geometry.dispose(); material.dispose(); },
  };
}

/**
 * Phones in a night crowd: now and then someone's camera flashes, and a few hold a phone light up,
 * each at a seated guy's chest, picked afresh each time from whoever is in. More of them while the
 * spotlight is on. One draw for all of them.
 */
function makeFlashes(group: THREE.Group, uniforms: GuyUniforms) {
  const N = 480;
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  const seed = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) seed.set([((i * 2654435761) >>> 0) / 4294967296, ((i * 40503 + 17) % 1013) / 1013, ((i * 9301 + 49297) % 233280) / 233280, i], i * 4);
  geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
  geometry.instanceCount = 0;
  const material = new THREE.ShaderMaterial({
    uniforms: { ...uniforms, uCount: { value: 0 }, uPx: { value: new THREE.Vector2(1, 1) } },
    vertexShader: /* glsl */ `
      ${POSE_GLSL}
      uniform float uCount, uDim;
      uniform vec2 uPx;
      attribute vec4 aSeed;
      varying vec2 vQ;
      varying float vA;
      varying float vPhone;
      float rand(float a, float b) { return fract(sin(a * 12.9898 + b * 78.233) * 43758.5453); }
      void main() {
        gl_Position = vec4(0.0, 0.0, -2.0, 1.0);
        // A third of them only while the spotlight is on.
        if (aSeed.w > ${(N * 0.62).toFixed(1)} && uDim < 0.3) return;
        bool phone = aSeed.y < 0.22;
        float period = phone ? 7.0 + aSeed.z * 9.0 : 2.4 + aSeed.z * 5.0;
        float t = uTime + aSeed.x * period, k = floor(t / period), local = t - k * period;
        float on = phone ? 2.6 + aSeed.z * 2.0 : 0.16;
        if (local > on) return;
        float guy = floor(rand(aSeed.w, k) * uCount);
        GuyPose gp = guyPose(guy);
        if (gp.mode < 0.5) return;
        vec3 at = gp.pos + vec3(0.0, gp.lift + (phone ? 0.95 : 0.62), 0.0);
        vec4 mv = viewMatrix * vec4(at, 1.0);
        mv.z += 0.3;
        vec4 clip = projectionMatrix * mv;
        // A flash bursts and fades; a phone light comes on, sways a little and goes off.
        float a = phone ? smoothstep(0.0, 0.3, local) * smoothstep(on, on - 0.4, local) * 0.75 : exp(-local * 22.0);
        float size = phone ? 0.09 : 0.32 * (0.6 + 0.4 * exp(-local * 12.0));
        // Never under a couple of pixels, so a far one still twinkles.
        vec2 px = max(vec2(size) * vec2(projectionMatrix[0][0], projectionMatrix[1][1]) / clip.w, (phone ? 1.6 : 2.6) * uPx);
        if (phone) clip.x += sin(uTime * 1.3 + aSeed.x * 20.0) * 0.04 * px.x * clip.w * 4.0;
        clip.xy += position.xy * px * clip.w;
        gl_Position = clip;
        vQ = position.xy;
        vA = a * (1.0 - 0.5 * gp.shade);
        vPhone = phone ? 1.0 : 0.0;
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vQ;
      varying float vA;
      varying float vPhone;
      void main() {
        float d = length(vQ);
        if (d > 1.0) discard;
        float core = exp(-d * d * 10.0), halo = exp(-d * d * 3.0) * 0.35;
        vec3 c = mix(vec3(1.0, 0.98, 0.94), vec3(0.86, 0.93, 1.0), vPhone);
        float a = vA * (core + halo) * (1.0 - d);
        gl_FragColor = vec4(c * a, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  group.add(mesh);
  return {
    /** On in a night venue, for `count` guys' slots, on a canvas `w` × `h` device pixels. */
    set(on: boolean, count: number, w: number, h: number) {
      geometry.instanceCount = on && count > 30 ? Math.min(N, Math.max(12, Math.round(count / 18))) : 0;
      material.uniforms.uCount.value = count;
      material.uniforms.uPx.value.set(1 / Math.max(1, w), 1 / Math.max(1, h));
    },
    dispose() { group.remove(mesh); geometry.dispose(); material.dispose(); },
  };
}

/** The spotlit guy's line: a pill drawn on a canvas at the device's pixels, laid over the frame. */
function makeLabel(renderer: THREE.WebGLRenderer, font?: string) {
  const canvas = document.createElement('canvas');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  const scene = new THREE.Scene();
  scene.add(quad);
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -1, 1);
  let text = '', shown = 0, x = 0, y = 0, drawnFor = '';
  function paint() {
    const dpr = renderer.getPixelRatio(), W = renderer.domElement.width / dpr;
    const g = canvas.getContext('2d')!;
    let px = 16, line = text;
    const fontOf = (size: number) => font ?? `700 ${size}px system-ui, -apple-system, sans-serif`;
    g.font = fontOf(px);
    const maxW = W - 16;
    while (!font && px > 11 && g.measureText(line).width + 24 > maxW) g.font = fontOf(--px);
    const cut = line.lastIndexOf(' · '), tail = cut > 0 ? line.slice(cut) : '';
    let head = cut > 0 ? line.slice(0, cut) : line;
    while (head.length > 1 && g.measureText(line).width + 24 > maxW) { head = head.slice(0, -1); line = head.trimEnd() + '…' + tail; }
    const w = Math.ceil(Math.min(maxW, g.measureText(line).width + 24)), h = 30;
    const cw = Math.ceil(w * dpr) + 4, ch = Math.ceil(h * dpr) + 4;
    // A texture's storage is fixed once made: a new size needs a new one.
    if (cw !== canvas.width || ch !== canvas.height) { canvas.width = cw; canvas.height = ch; texture.dispose(); }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cw, ch);
    g.setTransform(dpr, 0, 0, dpr, 2, 2);
    g.font = fontOf(px);
    g.fillStyle = 'rgba(12, 15, 24, 0.82)';
    g.beginPath(); g.roundRect(0, 0, w, h, h / 2); g.fill();
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(line, w / 2, h / 2 + 1);
    texture.needsUpdate = true;
    drawnFor = `${text}|${dpr}|${W}`;
  }
  return {
    set(t: string) { text = t; drawnFor = ''; },
    /** Puts it at (u, v) of the canvas (0 to 1 from the top left), at `alpha`. */
    place(u: number, v: number, alpha: number) { x = u; y = v; shown = alpha; },
    draw() {
      if (!text || shown <= 0.01) return;
      const dpr = renderer.getPixelRatio(), W = renderer.domElement.width, H = renderer.domElement.height;
      if (drawnFor !== `${text}|${dpr}|${W / dpr}`) paint();
      // Whole device pixels, so the text stays as sharp as it was drawn.
      const w = canvas.width, h = canvas.height;
      const cx = Math.round(Math.max(w / 2 + 8 * dpr, Math.min(W - w / 2 - 8 * dpr, x * W)) - w / 2), cy = Math.round(Math.min(H - h - 6 * dpr, y * H + 8 * dpr));
      camera.left = 0; camera.right = W; camera.top = 0; camera.bottom = -H; camera.updateProjectionMatrix();
      quad.scale.set(w, h, 1);
      quad.position.set(cx + w / 2, -(cy + h / 2), 0);
      material.opacity = shown;
      renderer.autoClear = false;
      renderer.render(scene, camera);
      renderer.autoClear = true;
    },
    dispose() { texture.dispose(); material.dispose(); quad.geometry.dispose(); },
  };
}
