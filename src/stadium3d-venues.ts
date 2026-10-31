/**
 * The 3D stadium's venues (./stadium3d), built from plain geometry round a layout (./stadium3d-layout):
 * the stand's steps swept along its line or arc, a seat back behind every seat, the floor in front,
 * and each venue's own place round them (a house's porch, bleachers at dusk, a gym, a theatre, an
 * arena, an open stadium and a roofed bowl), each lit as it would be.
 */
import * as THREE from 'three';
import type { Layout3D, Row3D } from './stadium3d-layout';
import type { VenueId } from './stadium';
import { shaftMesh } from './stadium3d-gl';

/** A venue, built. */
export interface VenueBuild {
  id: VenueId;
  group: THREE.Group;
  fog: THREE.Fog;
  background: THREE.Color;
  environment: THREE.Texture;
  envIntensity: number;
  /** How the pictures of far guys are lit here. */
  crowdLight: THREE.Color;
  /** Where a spotlight's beam may come from. */
  fixtures: THREE.Vector3[];
  /** Per seat: how much it is in shade (under a tier, a roof). */
  shades: Float32Array;
  /** A night venue, where phones light up in the crowd. */
  night: boolean;
  /** A raised floor in front of the stand (a theatre's stage): from `z` toward the camera, `y` high. */
  raised?: { z: number; y: number };
  /** Moves what moves (boards scrolling, bulbs twinkling) and dims what the spotlight dims, each frame. */
  update(t: number, dim: number): void;
  /** Its textures, for the same venue built again for a bigger crowd to take (what it doesn't take is freed with this one). */
  textures: Map<string, THREE.Texture>;
  dispose(): void;
}

/** How a venue is built: the textures of the one it replaces (the same venue, laid out again), and the shadows' size. */
export interface VenueOptions { carry?: Map<string, THREE.Texture>; shadowSize?: number }

/** The club's colours, for boards, banners and fascias. */
export const CLUB = ['#e8792f', '#2e8c8a', '#4e7fb3', '#c2403f', '#3fa35b', '#7d4fa6', '#e36a8e', '#e7b53b'];

// ------------------------------------------------------------ helpers

/** Everything a venue makes, so it can all be freed. */
class Kit {
  group = new THREE.Group();
  private things: { dispose(): void }[] = [];
  /** Textures by what they show: taken from the venue this one replaces where it had them, so nothing is drawn or uploaded twice. */
  textures = new Map<string, THREE.Texture>();
  constructor(private carry?: Map<string, THREE.Texture>, readonly shadowSize = 2048) {}
  texture<T extends THREE.Texture>(key: string, make: () => T): T {
    let t = this.textures.get(key) as T | undefined;
    if (t) return t;
    t = this.carry?.get(key) as T | undefined;
    if (t) this.carry!.delete(key);
    else t = make();
    this.textures.set(key, t);
    return t;
  }
  lights: { light: THREE.Light; base: number }[] = [];
  glows: { set(v: number): void; base: number }[] = [];
  ticks: ((t: number, dim: number) => void)[] = [];
  keep<T extends { dispose(): void }>(t: T): T { this.things.push(t); return t; }
  mesh(geometry: THREE.BufferGeometry, material: THREE.Material, shadow: 'cast' | 'receive' | 'both' | 'none' = 'receive', parent: THREE.Object3D = this.group): THREE.Mesh {
    this.keep(geometry); this.keep(material);
    const m = new THREE.Mesh(geometry, material);
    m.castShadow = shadow === 'cast' || shadow === 'both';
    m.receiveShadow = shadow === 'receive' || shadow === 'both';
    parent.add(m);
    return m;
  }
  private made = new Map<string, THREE.MeshStandardMaterial>();
  /** A plain surface, one material for each look however many meshes wear it, so they can be merged. */
  std(color: THREE.ColorRepresentation, roughness = 0.8, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) {
    const key = `s|${new THREE.Color(color).getHexString()}|${roughness}|${metalness}|${Object.entries(extra).map(([k, v]) => `${k}:${(v as { uuid?: string })?.uuid ?? v}`).join(',')}`;
    let m = this.made.get(key);
    if (!m) { m = this.keep(new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra })); this.made.set(key, m); }
    return m;
  }
  /** A glowing surface: its own colour as light, dimmed with the spotlight like the rest. */
  lamp(color: THREE.ColorRepresentation, strength = 1.6, map?: THREE.Texture) {
    const key = `l|${new THREE.Color(color).getHexString()}|${strength}|${map?.uuid ?? ''}`;
    let m = this.made.get(key);
    if (!m) {
      const made = m = this.keep(new THREE.MeshStandardMaterial({ color: '#000000', emissive: color, emissiveIntensity: strength, emissiveMap: map ?? null, roughness: 0.6 }));
      this.made.set(key, m);
      this.glows.push({ set: v => { made.emissiveIntensity = v; }, base: strength });
    }
    return m;
  }
  /**
   * Merges the venue's still meshes that share a material (and shadow) into one each: a venue is a
   * few dozen draws, not hundreds.
   */
  merge() {
    const sets = new Map<string, THREE.Mesh[]>();
    for (const o of [...this.group.children]) {
      const m = o as THREE.Mesh;
      if (!m.isMesh || (m as THREE.InstancedMesh).isInstancedMesh || !(m.material as THREE.Material).type?.startsWith('MeshStandard') || m.renderOrder) continue;
      const g = m.geometry, key = `${(m.material as THREE.Material).uuid}|${m.castShadow}|${m.receiveShadow}|${Object.keys(g.attributes).sort().join(',')}|${!!g.index}`;
      let list = sets.get(key);
      if (!list) sets.set(key, list = []);
      list.push(m);
    }
    for (const list of sets.values()) {
      if (list.length < 2) continue;
      const names = Object.keys(list[0].geometry.attributes);
      const data: Record<string, number[]> = {}, index: number[] = [];
      for (const n of names) data[n] = [];
      let base = 0;
      const v = new THREE.Vector3(), nm = new THREE.Matrix3();
      for (const m of list) {
        m.updateMatrix();
        nm.getNormalMatrix(m.matrix);
        const g = m.geometry, count = g.attributes.position.count;
        for (const n of names) {
          const a = g.attributes[n] as THREE.BufferAttribute;
          for (let i = 0; i < count; i++) {
            if (n === 'position') { v.fromBufferAttribute(a, i).applyMatrix4(m.matrix); data[n].push(v.x, v.y, v.z); }
            else if (n === 'normal') { v.fromBufferAttribute(a, i).applyMatrix3(nm).normalize(); data[n].push(v.x, v.y, v.z); }
            else for (let k = 0; k < a.itemSize; k++) data[n].push(a.array[i * a.itemSize + k] as number);
          }
        }
        if (g.index) for (let i = 0; i < g.index.count; i++) index.push(g.index.getX(i) + base);
        base += count;
        this.group.remove(m);
      }
      const merged = new THREE.BufferGeometry();
      for (const n of names) merged.setAttribute(n, new THREE.Float32BufferAttribute(data[n], (list[0].geometry.attributes[n] as THREE.BufferAttribute).itemSize));
      if (index.length) merged.setIndex(index);
      this.mesh(merged, list[0].material as THREE.Material, list[0].castShadow && list[0].receiveShadow ? 'both' : list[0].castShadow ? 'cast' : list[0].receiveShadow ? 'receive' : 'none');
    }
  }
  light<L extends THREE.Light>(l: L): L { this.lights.push({ light: l, base: l.intensity }); this.group.add(l); return l; }
  /** One mesh drawn at many places, each its own colour if given. */
  many(geometry: THREE.BufferGeometry, material: THREE.Material, at: THREE.Matrix4[], colours?: THREE.Color[], shadow: 'cast' | 'receive' | 'both' | 'none' = 'receive') {
    if (!at.length) return null;
    this.keep(geometry); this.keep(material);
    const m = this.keep(new THREE.InstancedMesh(geometry, material, at.length));
    at.forEach((x, i) => { m.setMatrixAt(i, x); if (colours) m.setColorAt(i, colours[i]); });
    m.castShadow = shadow === 'cast' || shadow === 'both';
    m.receiveShadow = shadow === 'receive' || shadow === 'both';
    this.group.add(m);
    return m;
  }
  dispose() {
    for (const t of this.things) t.dispose();
    this.things = [];
    for (const t of this.textures.values()) t.dispose();
    this.textures.clear();
    for (const { light } of this.lights) (light as THREE.Light & { shadow?: THREE.LightShadow }).shadow?.map?.dispose();
  }
}

const C = (c: string) => new THREE.Color(c);
const M = (x: number, y: number, z: number, yaw = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), new THREE.Vector3(sx, sy, sz));
/** A repeatable random number from a seed and an index, 0 to 1. */
const rnd = (seed: number, i: number) => { let h = (seed * 374761393 + i * 668265263) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/** A size rounded up to the next step of 10%, so a texture drawn for it is drawn again only when it grows that much. */
const quant = (x: number) => +Math.pow(1.1, Math.ceil(Math.log(Math.max(1, x)) / Math.log(1.1))).toFixed(3);

/** A cross-section's points, front to back, as (z, y) with the colour of the face up to the next point. */
type Section = { z: number; y: number; c: THREE.Color }[];

/** Where a point of the stand's cross-section (z, y) is at `u` along it: x on a line, an angle on an arc (whose centre is at z = radius). */
function place(L: Layout3D, z: number, y: number, u: number): THREE.Vector3 {
  if (L.spec.shape !== 'arc') return new THREE.Vector3(u, y, z);
  const R0 = L.spec.radius, r = R0 - z;
  return new THREE.Vector3(r * Math.sin(u), y, R0 - r * Math.cos(u));
}
/** Which way is "out of the stand, toward the floor" at `u`, as a yaw. */
const facing = (L: Layout3D, u: number) => (L.spec.shape === 'arc' ? -u : 0);

/**
 * A cross-section swept along the stand: straight across from -reach to reach, or round the arc through
 * ±reach radians, in `steps` pieces. Faces point toward the front; `uv` runs 0 to 1 along it and down
 * each face.
 */
function sweep(section: Section, L: Layout3D, reach: number, steps = 64): THREE.BufferGeometry {
  const arc = L.spec.shape === 'arc';
  const pos: number[] = [], nor: number[] = [], col: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i < section.length - 1; i++) {
    const a = section[i], b = section[i + 1], dz = b.z - a.z, dy = b.y - a.y, l = Math.hypot(dz, dy);
    if (l < 1e-6) continue;
    const ny = -dz / l, nin = dy / l;
    const v0 = pos.length / 3;
    for (let s = 0; s <= steps; s++) {
      const u = -reach + (2 * reach * s) / steps;
      // On an arc, "toward the front" is toward the centre.
      const nx = arc ? -Math.sin(u) * nin : 0, nz = arc ? Math.cos(u) * nin : nin;
      [a, b].forEach((p, k) => { const q = place(L, p.z, p.y, u); pos.push(q.x, q.y, q.z); nor.push(nx, ny, nz); col.push(a.c.r, a.c.g, a.c.b); uv.push(s / steps, 1 - k); });
      if (s < steps) { const k = v0 + s * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** Where a row's tread starts and ends, front to back (z), and its floor's height. */
function treadOf(L: Layout3D, r: number): { zf: number; zb: number; y: number } {
  const row = L.rows[r], tread = L.spec.tiers[row.tier].tread;
  return { zf: -row.back + tread * 0.5, zb: -row.back - tread * 0.5, y: row.y };
}

/** The stand's cross-section: a front wall, then each row's tread and the riser up to the next, then a back wall `wall` tall and a roof `behind` deep. */
function standSection(L: Layout3D, colours: { tread: (r: Row3D) => THREE.Color; riser: (r: Row3D) => THREE.Color; front: THREE.Color; back: THREE.Color }, wall: number, behind = 6): Section {
  const out: Section = [];
  const first = treadOf(L, 0);
  out.push({ z: first.zf, y: 0, c: colours.front });
  for (let r = 0; r < L.rows.length; r++) {
    const t = treadOf(L, r), row = L.rows[r];
    out.push({ z: r === 0 ? t.zf : out[out.length - 1].z, y: t.y, c: colours.tread(row) });
    const nextY = r + 1 < L.rows.length ? L.rows[r + 1].y : t.y + wall;
    out.push({ z: t.zb, y: t.y, c: r + 1 < L.rows.length ? colours.riser(L.rows[r + 1]) : colours.back });
    out.push({ z: t.zb, y: nextY, c: r + 1 < L.rows.length ? colours.tread(L.rows[r + 1]) : colours.back });
  }
  const last = out[out.length - 1];
  out.push({ z: last.z - behind, y: last.y, c: colours.back });
  return out;
}

/** How far the stand's structure runs either side: well past what the camera sees. */
function reachOf(L: Layout3D): number {
  if (L.spec.shape === 'arc') return Math.min(Math.PI * 0.95, L.reach + 0.6);
  return L.reach * 1.8 + 40;
}

/** A seat back behind every seat: one instanced mesh, coloured by tier, a little different each. */
function seatBacks(kit: Kit, L: Layout3D, colours: string[], size: { w: number; h: number; d: number; up: number; back: number }) {
  if (!L.seats.length) return;
  const back = new THREE.BoxGeometry(size.w, size.h, size.d);
  back.translate(0, size.up + size.h / 2, -size.back);
  const at: THREE.Matrix4[] = [], tint: THREE.Color[] = [];
  L.seats.forEach((s, i) => {
    at.push(M(s.x, s.y, s.z, L.spec.shape === 'arc' ? s.yaw / 0.6 : 0));
    tint.push(C(colours[Math.min(L.rows[s.row].tier, colours.length - 1)]).multiplyScalar(0.92 + rnd(3, i) * 0.12));
  });
  kit.many(back, kit.std('#ffffff', 0.55), at, tint, 'receive');
}

/** Stair aisles: a lighter step on every row where an aisle runs up. */
function aisleSteps(kit: Kit, L: Layout3D, colour: string) {
  if (!L.spec.section) return;
  const at: THREE.Matrix4[] = [], arc = L.spec.shape === 'arc';
  L.rows.forEach((row, r) => {
    const t = treadOf(L, r), w = L.spec.aisle;
    for (const a of L.aisles) {
      const u = arc ? a : a, p = place(L, (t.zf + t.zb) / 2, t.y + 0.02, u);
      at.push(M(p.x, p.y, p.z, facing(L, u), w, 1, t.zf - t.zb));
    }
  });
  kit.many(new THREE.BoxGeometry(1, 0.05, 1), kit.std(colour, 0.85), at, undefined, 'receive');
}

/** A canvas texture, drawn by `paint` at `w` × `h`, or the one already drawn for `key` (what it shows). */
function canvasTexture(kit: Kit, key: string, w: number, h: number, paint: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]): THREE.CanvasTexture {
  const t = kit.texture(`${key}|${w}x${h}`, () => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    paint(c.getContext('2d')!);
    const made = new THREE.CanvasTexture(c);
    made.colorSpace = THREE.SRGBColorSpace;
    made.anisotropy = 8;
    return made;
  });
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}

/** Glows at points: soft additive discs turned to the camera, all of one call drawn at once. */
function glows(kit: Kit, points: THREE.Vector3[], size: number, colour: THREE.ColorRepresentation, opacity = 0.9, twinkle = 0) {
  if (!points.length) return;
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]), 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  const at = new Float32Array(points.length * 4);
  points.forEach((p, i) => at.set([p.x, p.y, p.z, i * 1.7], i * 4));
  geometry.setAttribute('aAt', new THREE.InstancedBufferAttribute(at, 4));
  geometry.instanceCount = points.length;
  const material = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(colour) }, uAlpha: { value: opacity }, uSize: { value: size }, uT: { value: 0 }, uTwinkle: { value: twinkle } },
    vertexShader: 'attribute vec4 aAt; uniform float uSize, uT, uTwinkle; varying vec2 vQ; void main() { vQ = position.xy * 2.0; float s = uSize * (1.0 + uTwinkle * sin(uT * 3.1 + aAt.w)); vec4 mv = viewMatrix * vec4(aAt.xyz, 1.0); mv.xy += position.xy * s; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uColor; uniform float uAlpha; varying vec2 vQ; void main() { float d = length(vQ); if (d > 1.0) discard; float a = uAlpha * (exp(-d * d * 9.0) * 0.8 + exp(-d * d * 2.5) * 0.25) * (1.0 - d); gl_FragColor = vec4(uColor * a, a); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const m = kit.mesh(geometry, material, 'none');
  m.frustumCulled = false;
  m.renderOrder = 3;
  kit.glows.push({ set: v => { material.uniforms.uAlpha.value = v; }, base: opacity });
  if (twinkle) kit.ticks.push(t => { material.uniforms.uT.value = t; });
}

/** A shaft of light from `from` toward `to`, `radius` wide at the far end (./stadium3d-gl's `shaftMesh`). */
function cone(kit: Kit, from: THREE.Vector3, to: THREE.Vector3, radius: number, colour: THREE.ColorRepresentation, strength = 0.1) {
  const m = shaftMesh(colour);
  kit.keep(m.geometry); kit.keep(m.material);
  const u = m.material.uniforms;
  u.uFrom.value.copy(from); u.uTo.value.copy(to); u.uR0.value = radius * 0.06; u.uR1.value = radius; u.uAlpha.value = strength; u.uFade.value = 1.7;
  m.renderOrder = 2;
  kit.group.add(m);
  kit.glows.push({ set: v => { u.uAlpha.value = v; }, base: strength });
}

/** A sky: a big dome with a gradient from `horizon` up to `top`, worked out per pixel, and stars on a night one. */
function sky(kit: Kit, top: string, mid: string, horizon: string, radius: number, stars = 0, glow?: string) {
  const geometry = new THREE.SphereGeometry(radius, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2 + 0.3);
  const material = new THREE.ShaderMaterial({
    uniforms: { uTop: { value: C(top) }, uMid: { value: C(mid) }, uHorizon: { value: C(horizon) }, uGlow: { value: C(glow ?? horizon) } },
    vertexShader: 'varying vec3 vWorld; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: 'uniform vec3 uTop, uMid, uHorizon, uGlow; varying vec3 vWorld; void main() { vec3 d = normalize(vWorld - cameraPosition); float h = clamp(d.y * 1.5 + 0.05, 0.0, 1.0); vec3 c = h < 0.3 ? mix(uHorizon, uMid, smoothstep(0.0, 0.3, h)) : mix(uMid, uTop, smoothstep(0.3, 1.0, h)); c += uGlow * 0.25 * exp(-pow(d.x * 1.4, 2.0)) * (1.0 - smoothstep(0.0, 0.4, h)); gl_FragColor = vec4(c, 1.0);\n#include <colorspace_fragment>\n}',
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const dome = kit.mesh(geometry, kit.keep(material), 'none');
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  if (stars) {
    const p: number[] = [], s: number[] = [];
    for (let i = 0; i < stars; i++) {
      const a = rnd(11, i) * Math.PI * 2, h = 0.08 + Math.pow(rnd(12, i), 0.7) * 1.2, r = radius * 0.97;
      p.push(Math.cos(a) * Math.cos(h) * r, Math.sin(h) * r, Math.sin(a) * Math.cos(h) * r);
      s.push(rnd(13, i));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('aSize', new THREE.Float32BufferAttribute(s, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 } },
      vertexShader: 'attribute float aSize; uniform float uT; varying float vA; void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = 1.0 + aSize * 1.8; vA = 0.45 + 0.55 * (0.5 + 0.5 * sin(uT * (0.6 + aSize) + aSize * 40.0)); }',
      fragmentShader: 'varying float vA; void main() { vec2 q = gl_PointCoord - 0.5; float d = length(q); if (d > 0.5) discard; gl_FragColor = vec4(vec3(0.85, 0.88, 1.0) * vA * (1.0 - d * 1.6), 1.0); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(kit.keep(g), kit.keep(m));
    pts.frustumCulled = false;
    pts.renderOrder = -9;
    kit.group.add(pts);
    kit.ticks.push(t => { m.uniforms.uT.value = t; });
  }
}

/** A directional light that casts soft shadows over `span` round `centre`. */
function keyLight(kit: Kit, colour: string, intensity: number, dir: [number, number, number], centre: THREE.Vector3, span: number, mapSize = kit.shadowSize) {
  const light = new THREE.DirectionalLight(colour, intensity);
  light.position.copy(centre).add(new THREE.Vector3(...dir).normalize().multiplyScalar(span * 3));
  light.target.position.copy(centre);
  light.castShadow = true;
  light.shadow.mapSize.set(mapSize, mapSize);
  const cam = light.shadow.camera;
  cam.left = -span; cam.right = span; cam.top = span; cam.bottom = -span; cam.near = 0.5; cam.far = span * 7;
  light.shadow.bias = -0.0005; light.shadow.normalBias = 0.03; light.shadow.radius = 4;
  kit.light(light);
  kit.group.add(light.target);
  return light;
}

/** Each renderer's environments, made once a venue and kept while it is on show: a venue laid out again as its crowd grows reuses its own. */
const ENVIRONMENTS = new WeakMap<THREE.WebGLRenderer, Map<string, THREE.WebGLRenderTarget>>();

/** Frees the environments kept for `renderer`, all but the one whose texture is `keep` (the venue on show). */
export function freeEnvironments(renderer: THREE.WebGLRenderer, keep?: THREE.Texture) {
  const kept = ENVIRONMENTS.get(renderer);
  if (!kept) return;
  for (const [key, rt] of kept) if (rt.texture !== keep) { rt.dispose(); kept.delete(key); }
  if (!kept.size) ENVIRONMENTS.delete(renderer);
}

/** An environment for reflections: a room in `room`, panels of light in `lit` round its top, a floor. */
function environment(renderer: THREE.WebGLRenderer, room: string, lit: string[], floor: string): THREE.Texture {
  let kept = ENVIRONMENTS.get(renderer);
  if (!kept) ENVIRONMENTS.set(renderer, kept = new Map());
  const key = [room, ...lit, floor].join('|'), had = kept.get(key);
  if (had) return had.texture;
  const s = new THREE.Scene();
  const box = new THREE.Mesh(new THREE.BoxGeometry(30, 14, 30), new THREE.MeshBasicMaterial({ color: room, side: THREE.BackSide }));
  s.add(box);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({ color: floor }));
  fl.rotation.x = -Math.PI / 2; fl.position.y = -6.9; s.add(fl);
  lit.forEach((c, i) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(9, 4), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
    const a = (i / lit.length) * Math.PI * 2 + 0.6;
    p.position.set(Math.cos(a) * 9, 6.8, Math.sin(a) * 9); p.lookAt(0, 0, 0); s.add(p);
  });
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(s, 0.04);
  pm.dispose();
  s.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); } });
  kept.set(key, rt);
  return rt.texture;
}

/** The camera a layout frames with, as three.js takes it. */
function cameraOf(L: Layout3D): THREE.PerspectiveCamera {
  const c = new THREE.PerspectiveCamera(L.camera.fov, L.camera.aspect, L.camera.near, L.camera.far);
  c.position.set(...L.camera.position);
  c.lookAt(...L.camera.target);
  c.updateMatrixWorld();
  c.updateProjectionMatrix();
  return c;
}
/** The point at (nx, ny) of the frame, `depth` along the camera's view. */
function atFrame(cam: THREE.PerspectiveCamera, nx: number, ny: number, depth: number): THREE.Vector3 {
  const dir = new THREE.Vector3(nx, ny, 0.5).unproject(cam).sub(cam.position).normalize();
  const fwd = cam.getWorldDirection(new THREE.Vector3());
  return cam.position.clone().addScaledVector(dir, depth / dir.dot(fwd));
}
/** Where a world point lands on the frame (x, y from -1 to 1). */
function onFrame(cam: THREE.PerspectiveCamera, p: THREE.Vector3): THREE.Vector3 { return p.clone().project(cam); }

/**
 * Per seat shade: the two rows under a tier's fascia sit in its shadow; `roof` shades rows with a roof
 * over them; `edge` darkens the stand toward its ends, out of the lights' middle, so a big crowd has the
 * shape of its lighting rather than an even sheet.
 */
function shading(L: Layout3D, under = 0.22, roof?: (row: Row3D, r: number) => number, edge = 0): Float32Array {
  const out = new Float32Array(L.seats.length);
  const shade = L.rows.map((row, r) => {
    let s = 0;
    if (r + 1 < L.rows.length && L.rows[r + 1].tier !== row.tier) s = under;
    else if (r + 2 < L.rows.length && L.rows[r + 2].tier !== row.tier) s = under * 0.6;
    return s + (roof?.(row, r) ?? 0);
  });
  const arc = L.spec.shape === 'arc', R = L.spec.radius, reach = Math.max(1e-3, L.reach);
  L.seats.forEach((s, i) => {
    const u = Math.min(1, Math.abs(arc ? Math.atan2(s.x, R - s.z) : s.x) / reach), side = u * u * (3 - 2 * u);
    out[i] = Math.min(0.6, shade[s.row] + edge * side * side);
  });
  return out;
}

/** Fog from the front row to `amount` of the way to `colour` at the back row. */
function haze(L: Layout3D, colour: string, amount: number): THREE.Fog {
  const near = L.depth[0] * 0.98, far = near + Math.max(1, L.depth[1] - near) / Math.max(0.02, amount);
  return new THREE.Fog(colour, near, far);
}

/** A floor in front of the stand: from its front (z = `from`) toward the camera and past it, wide enough to fill the frame. */
function floorPlane(kit: Kit, L: Layout3D, material: THREE.Material, from = 0.6, y = 0) {
  const D = L.camera.position[2], arc = L.spec.shape === 'arc';
  const depth = D * 1.6 + 40, width = (arc ? L.spec.radius * 4 : L.reach * 4) + D * 3 + 60;
  const g = new THREE.PlaneGeometry(width, depth);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, from + depth / 2);
  return kit.mesh(g, material, 'receive');
}

/** An LED board's picture: panels in the club's colours with bands and dots, for a strip `w` × `h` pixels. */
function boardTexture(kit: Kit, seed: number, w = 1024, h = 64): THREE.CanvasTexture {
  const t = canvasTexture(kit, `board|${seed}`, w, h, g => {
    let x = 0, i = 0;
    while (x < w) {
      const pw = 90 + Math.floor(rnd(seed, i) * 140), c = CLUB[Math.floor(rnd(seed, i + 50) * CLUB.length)], c2 = CLUB[Math.floor(rnd(seed, i + 90) * CLUB.length)];
      g.fillStyle = c; g.fillRect(x, 0, pw, h);
      g.fillStyle = c2; g.fillRect(x, h * 0.84, pw, h * 0.16);
      // A simple mark on each panel: a ring, bars or chevrons, never words.
      g.fillStyle = 'rgba(255,255,255,0.85)'; g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = h * 0.12;
      const k = Math.floor(rnd(seed, i + 130) * 3), cx = x + pw / 2, cy = h / 2;
      if (k === 0) { g.beginPath(); g.arc(cx, cy, h * 0.28, 0, Math.PI * 2); g.stroke(); }
      else if (k === 1) for (let b = -1; b <= 1; b++) g.fillRect(cx + b * h * 0.32 - h * 0.08, h * 0.25, h * 0.16, h * 0.5);
      else { g.beginPath(); for (let b = -1; b <= 1; b++) { g.moveTo(cx + b * h * 0.4 - h * 0.15, h * 0.25); g.lineTo(cx + b * h * 0.4 + h * 0.1, cy); g.lineTo(cx + b * h * 0.4 - h * 0.15, h * 0.75); } g.stroke(); }
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(x + pw - 3, 0, 3, h);
      x += pw; i++;
    }
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/** A band of LED board along the stand at `z` from `y0` to `y1`, scrolling slowly. */
function board(kit: Kit, L: Layout3D, z: number, y0: number, y1: number, seed: number, strength = 1.3, speed = 0.012) {
  const reach = reachOf(L), sec: Section = [{ z, y: y0, c: C('#ffffff') }, { z, y: y1, c: C('#ffffff') }];
  const map = boardTexture(kit, seed);
  const length = L.spec.shape === 'arc' ? 2 * reach * (L.spec.radius - z) : 2 * reach;
  map.repeat.set(Math.max(1, Math.round(length / ((y1 - y0) * 16))), 1);
  const m = kit.mesh(sweep(sec, L, reach, L.spec.shape === 'arc' ? 128 : 2), kit.lamp('#ffffff', strength, map), 'none');
  kit.ticks.push(t => { map.offset.x = t * speed; });
  return m;
}

/** Seven-segment digits for a scoreboard, drawn on a canvas. */
function digits(g: CanvasRenderingContext2D, text: string, x: number, y: number, h: number, on: string, off: string) {
  const SEG: Record<string, number> = { '0': 0b1111110, '1': 0b0110000, '2': 0b1101101, '3': 0b1111001, '4': 0b0110011, '5': 0b1011011, '6': 0b1011111, '7': 0b1110000, '8': 0b1111111, '9': 0b1111011, ':': 0 };
  const w = h * 0.55, t = h * 0.12;
  for (const ch of text) {
    if (ch === ':') { g.fillStyle = on; g.fillRect(x + w * 0.2, y + h * 0.3, t, t); g.fillRect(x + w * 0.2, y + h * 0.62, t, t); x += w * 0.6; continue; }
    const m = SEG[ch] ?? 0;
    const seg = [[t, 0, w - 2 * t, t], [w - t, t, t, h / 2 - t * 1.5], [w - t, h / 2 + t / 2, t, h / 2 - t * 1.5], [t, h - t, w - 2 * t, t], [0, h / 2 + t / 2, t, h / 2 - t * 1.5], [0, t, t, h / 2 - t * 1.5], [t, h / 2 - t / 2, w - 2 * t, t]];
    seg.forEach(([sx, sy, sw, sh], k) => { g.fillStyle = (m >> (6 - k)) & 1 ? on : off; g.fillRect(x + sx, y + sy, sw, sh); });
    x += w + t * 1.6;
  }
}

/** A pitch: mown stripes across, a touchline near the stand, halfway line and centre circle. */
function pitchTexture(kit: Kit, W: number, Dz: number, centreZ: number, colours: [string, string], stripes = 14): THREE.CanvasTexture {
  const px = 2048, py = Math.round(px * Dz / W);
  return canvasTexture(kit, `pitch|${W}|${Dz}|${centreZ}|${colours}|${stripes}`, px, Math.min(2048, py), g => {
    const ppu = px / W, H = Math.min(2048, py);
    for (let i = 0; i < stripes; i++) { g.fillStyle = colours[i % 2]; g.fillRect(0, (i * H) / stripes, px, H / stripes + 1); }
    g.strokeStyle = 'rgba(255,255,255,0.82)'; g.lineWidth = Math.max(2, 0.18 * ppu);
    const touch = 3 * ppu, cz = centreZ * ppu;
    g.beginPath(); g.moveTo(0, touch); g.lineTo(px, touch); g.stroke();
    g.beginPath(); g.moveTo(px / 2, touch); g.lineTo(px / 2, H); g.stroke();
    g.beginPath(); g.arc(px / 2, cz, 9 * ppu, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(px / 2, cz, 0.5 * ppu, 0, Math.PI * 2); g.fill();
  });
}

// ------------------------------------------------------------ the venues

interface Built { fog: THREE.Fog; background: THREE.Color; environment: THREE.Texture; envIntensity: number; crowdLight: THREE.Color; fixtures: THREE.Vector3[]; shades: Float32Array; night: boolean; raised?: { z: number; y: number } }

/** Builds the venue for a layout. */
export function buildVenue(L: Layout3D, renderer: THREE.WebGLRenderer, options: VenueOptions = {}): VenueBuild {
  const kit = new Kit(options.carry, options.shadowSize);
  const v = VENUES3D[L.id](kit, L, renderer);
  kit.merge();
  return {
    id: L.id, textures: kit.textures,
    group: kit.group, fog: v.fog, background: v.background, environment: v.environment, envIntensity: v.envIntensity, crowdLight: v.crowdLight, fixtures: v.fixtures, shades: v.shades, night: v.night, raised: v.raised,
    update(t, dim) {
      for (const { light, base } of kit.lights) light.intensity = base * (1 - 0.62 * dim);
      for (const { set, base } of kit.glows) set(base * (1 - 0.45 * dim));
      for (const tick of kit.ticks) tick(t, dim);
    },
    dispose() { kit.dispose(); },
  };
}

const VENUES3D: Record<VenueId, (kit: Kit, L: Layout3D, renderer: THREE.WebGLRenderer) => Built> = {
  porch(kit, L, renderer) {
    // A house's porch at night: painted siding, a warm lit window and a door behind the steps, string lights under the eave.
    const D = L.camera.position[2], cam = cameraOf(L);
    const steps = L.rows.length, half = L.reach + 3.2, width = half * 2 + 30;
    const wood = C('#b07c50'), riser = C('#6b4a33');
    for (let r = 0; r < steps; r++) {
      const t = treadOf(L, r);
      const tread = kit.mesh(new THREE.BoxGeometry(half * 2, 0.12, t.zf - t.zb + 0.06), kit.std(wood, 0.62), 'both');
      tread.position.set(0, t.y - 0.06, (t.zf + t.zb) / 2);
      const nose = kit.mesh(new THREE.BoxGeometry(half * 2, 0.04, 0.04), kit.std('#d39a68', 0.5), 'none');
      nose.position.set(0, t.y - 0.01, t.zf + 0.02);
      const face = kit.mesh(new THREE.BoxGeometry(half * 2, t.y - 0.12, 0.06), kit.std(riser, 0.85), 'receive');
      face.position.set(0, (t.y - 0.12) / 2, t.zf - 0.03);
    }
    const back = treadOf(L, steps - 1), deckY = back.y + L.spec.tiers[0].rise;
    const deck = kit.mesh(new THREE.BoxGeometry(width, 0.14, 3), kit.std(wood, 0.62), 'receive');
    deck.position.set(0, deckY - 0.07, back.zb - 1.5);
    const deckFace = kit.mesh(new THREE.BoxGeometry(width, deckY, 0.1), kit.std(riser, 0.9), 'receive');
    deckFace.position.set(0, deckY / 2, back.zb);
    // The house: siding up to the eave, a window glowing warm, a door with a lamp beside it.
    const wallZ = back.zb - 3, wallH = 14;
    const siding = canvasTexture(kit, 'porch-siding', 256, 256, g => {
      g.fillStyle = '#4c5f78'; g.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 256; y += 32) { const grad = g.createLinearGradient(0, y, 0, y + 32); grad.addColorStop(0, '#5a6f8a'); grad.addColorStop(0.85, '#45576f'); grad.addColorStop(1, '#2f3c4f'); g.fillStyle = grad; g.fillRect(0, y, 256, 32); }
    }, [width / 6, wallH / 3]);
    const wall = kit.mesh(new THREE.PlaneGeometry(width, wallH), kit.std('#ffffff', 0.85, 0, { map: siding }), 'receive');
    wall.position.set(0, deckY + wallH / 2, wallZ);
    const win = new THREE.Vector3(-half * 0.42, deckY + 2.6, wallZ);
    const glass = canvasTexture(kit, 'porch-glass', 128, 96, g => {
      const grad = g.createRadialGradient(64, 70, 4, 64, 60, 90); grad.addColorStop(0, '#fff1c4'); grad.addColorStop(0.6, '#ffc46e'); grad.addColorStop(1, '#d9813f');
      g.fillStyle = grad; g.fillRect(0, 0, 128, 96);
    });
    kit.mesh(new THREE.PlaneGeometry(2.6, 1.9), kit.lamp('#ffffff', 0.85, glass), 'none').position.set(win.x, win.y, wallZ + 0.03);
    const trim = kit.std('#e9e2d4', 0.55);
    for (const [w, h, x, y] of [[3, 0.16, 0, 1.03], [3, 0.2, 0, -1.05], [0.16, 2.2, -1.38, 0], [0.16, 2.2, 1.38, 0], [0.07, 1.9, 0, 0], [2.6, 0.07, 0, 0]] as const) {
      kit.mesh(new THREE.BoxGeometry(w, h, 0.1), trim, 'cast').position.set(win.x + x, win.y + y, wallZ + 0.06);
    }
    const doorX = half * 0.45;
    kit.mesh(new THREE.BoxGeometry(1.7, 3.3, 0.14), kit.std('#7a3f2e', 0.55), 'receive').position.set(doorX, deckY + 1.65, wallZ + 0.07);
    for (const y of [0.9, 2.3]) kit.mesh(new THREE.BoxGeometry(1.2, 0.9, 0.04), kit.std('#6a3626', 0.6), 'none').position.set(doorX, deckY + y, wallZ + 0.16);
    kit.mesh(new THREE.BoxGeometry(2, 0.18, 0.14), trim, 'none').position.set(doorX, deckY + 3.38, wallZ + 0.08);
    kit.mesh(new THREE.SphereGeometry(0.08, 12, 8), kit.std('#e7b53b', 0.25, 0.9), 'none').position.set(doorX + 0.6, deckY + 1.6, wallZ + 0.2);
    // A lamp by the door.
    const lampAt = new THREE.Vector3(doorX - 1.35, deckY + 2.4, wallZ + 0.25);
    kit.mesh(new THREE.BoxGeometry(0.3, 0.42, 0.3), kit.lamp('#ffd08a', 1.4), 'none').position.copy(lampAt);
    kit.mesh(new THREE.BoxGeometry(0.38, 0.06, 0.38), kit.std('#1d1a20', 0.5), 'none').position.set(lampAt.x, lampAt.y + 0.24, lampAt.z);
    glows(kit, [lampAt], 1.6, '#ffc778', 0.65);
    // Posts at the sides and the eave over everything, at the frame's top.
    const eave = atFrame(cam, 0, 0.93, D - (back.zb - 1));
    const eaveY = Math.max(deckY + 4.2, eave.y);
    const postMat = kit.std('#e9e2d4', 0.6);
    for (const x of [-half - 0.2, half + 0.2]) kit.mesh(new THREE.BoxGeometry(0.36, eaveY, 0.36), postMat, 'both').position.set(x, eaveY / 2, treadOf(L, 0).zf - 0.4);
    kit.mesh(new THREE.BoxGeometry(width, 0.6, 5.4), kit.std('#232634', 0.8), 'cast').position.set(0, eaveY + 0.3, wallZ + 2.4);
    kit.mesh(new THREE.BoxGeometry(width, 0.3, 0.12), trim, 'none').position.set(0, eaveY + 0.1, treadOf(L, 0).zf - 0.62);
    // String lights sagging under the eave, each bulb with a little glow.
    const bulbs: THREE.Vector3[] = [], colours = ['#ffd45c', '#ff8a8a', '#8fd8ff', '#b7f28a'];
    const n = Math.max(9, Math.round(half * 2.2)), x0 = -half, x1 = half, zl = treadOf(L, 0).zf - 0.55;
    const sag = (u: number) => eaveY - 0.12 - Math.sin(Math.PI * ((u * 3) % 1)) * 0.45;
    const wire: number[] = [];
    for (let i = 0; i <= 120; i++) { const u = i / 120; wire.push(x0 + (x1 - x0) * u, sag(u) + 0.07, zl); }
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3));
    kit.group.add(new THREE.Line(kit.keep(wg), kit.keep(new THREE.LineBasicMaterial({ color: '#14111a' }))));
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, p = new THREE.Vector3(x0 + (x1 - x0) * u, sag(u), zl);
      bulbs.push(p);
      kit.mesh(new THREE.SphereGeometry(0.08, 10, 8), kit.lamp(colours[i % 4], 2.2), 'none').position.copy(p);
    }
    colours.forEach((c, k) => glows(kit, bulbs.filter((_, i) => i % 4 === k), 0.85, c, 0.55, 0.08));
    // The lawn, and a path up to the steps.
    floorPlane(kit, L, kit.std('#22301f', 0.95), treadOf(L, 0).zf);
    const path = kit.mesh(new THREE.PlaneGeometry(3.4, D * 2), kit.std('#6b6560', 0.9), 'receive');
    path.rotation.x = -Math.PI / 2; path.position.set(0, 0.01, treadOf(L, 0).zf + D);
    // Night: a cool moon behind the camera, the window's warm light spilling out, the string lights.
    kit.light(new THREE.HemisphereLight('#4a5a8c', '#1a1612', 1.0));
    keyLight(kit, '#a8bcff', 0.85, [4, 7, 6], new THREE.Vector3(0, 1, -1), 10);
    const warm = kit.light(new THREE.PointLight('#ffb36b', 14, 14, 1.6));
    warm.position.set(win.x, win.y - 0.3, wallZ + 1.6);
    const string = kit.light(new THREE.PointLight('#ffd7a0', 26, 12, 1.4));
    string.position.set(0, eaveY - 0.8, zl + 1.2);
    return { fog: new THREE.Fog('#0d1220', D * 1.6, D * 6), background: C('#0d1220'), environment: environment(renderer, '#1a2032', ['#ffcf8a', '#6c7fb8'], '#1a1612'), envIntensity: 0.45, crowdLight: C('#d8cfd8'), fixtures: [new THREE.Vector3(0, eaveY - 0.2, zl)], shades: new Float32Array(L.seats.length), night: false };
  },

  bleachers(kit, L, renderer) {
    // Dusk over a field: aluminium planks on a steel frame, a field in front, trees and the sky going down behind.
    const D = L.camera.position[2], cam = cameraOf(L), half = L.reach + 6, width = half * 2;
    const last = L.rows.length - 1, top = treadOf(L, last), front = treadOf(L, 0);
    const plank = kit.std('#c3ccd8', 0.32, 0.85), foot = kit.std('#8d97a6', 0.4, 0.75), steel = kit.std('#4d5666', 0.5, 0.6);
    for (let r = 0; r <= last; r++) {
      const t = treadOf(L, r);
      kit.mesh(new THREE.BoxGeometry(width, 0.09, 0.62), plank, 'both').position.set(0, t.y - 0.045, -L.rows[r].back - 0.05);
      kit.mesh(new THREE.BoxGeometry(width, 0.07, 0.34), foot, 'both').position.set(0, t.y - L.spec.tiers[0].rise * 0.55, -L.rows[r].back + 0.4);
    }
    for (let x = -half + 1.5; x < half; x += 4.4) {
      // Legs and a brace under each section.
      kit.mesh(new THREE.BoxGeometry(0.12, top.y, 0.12), steel, 'cast').position.set(x, top.y / 2, top.zb + 0.2);
      kit.mesh(new THREE.BoxGeometry(0.12, front.y, 0.12), steel, 'cast').position.set(x, front.y / 2, front.zf - 0.1);
      const dz = top.zb - front.zf, dy = top.y - front.y, len = Math.hypot(dz, dy);
      const brace = kit.mesh(new THREE.BoxGeometry(0.08, 0.08, len), steel, 'cast');
      brace.position.set(x, (top.y + front.y) / 2 - 0.35, (top.zb + front.zf) / 2);
      brace.rotation.x = Math.atan2(dy, -dz);
    }
    // A rail along the back row.
    kit.mesh(new THREE.BoxGeometry(width, 0.07, 0.07), steel, 'cast').position.set(0, top.y + 1.25, top.zb - 0.1);
    for (let x = -half + 1.5; x < half; x += 4.4) kit.mesh(new THREE.BoxGeometry(0.06, 1.25, 0.06), steel, 'cast').position.set(x, top.y + 0.62, top.zb - 0.1);
    // The field: grass in mown bands and a chalk line.
    const field = canvasTexture(kit, 'bleachers-field', 512, 512, g => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#3d8a4f' : '#357d47'; g.fillRect(0, i * 64, 512, 64); } }, [1, D / 7]);
    floorPlane(kit, L, kit.std('#ffffff', 0.92, 0, { map: field }), front.zf);
    const chalk = kit.mesh(new THREE.PlaneGeometry(width * 3, 0.14), kit.std('#f2f2ea', 0.9), 'receive');
    chalk.rotation.x = -Math.PI / 2; chalk.position.set(0, 0.012, front.zf + D * 0.32);
    // Behind: a strip of field, a fence, then trees and the dusk sky.
    floorPlane(kit, L, kit.std('#2c5a35', 0.95), -40, -0.01).position.z -= 0;
    const ground = kit.mesh(new THREE.PlaneGeometry(width * 6, 120), kit.std('#28452a', 0.95), 'receive');
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.02, top.zb - 60);
    const treeZ = top.zb - 26, trees: THREE.Matrix4[] = [], tints: THREE.Color[] = [], trunks: THREE.Matrix4[] = [];
    for (let i = 0; i < 70; i++) {
      const x = -width * 1.2 + i * width * 2.4 / 70 + (rnd(5, i) - 0.5) * 3, s = 2.2 + rnd(6, i) * 2.6, z = treeZ - rnd(7, i) * 10;
      trees.push(M(x, s * 1.1 + 0.8, z, rnd(8, i) * 3, s * 0.6, s * 1.25, s * 0.6));
      trunks.push(M(x, 0.5, z, 0, 0.25, 1, 0.25));
      tints.push(C(['#24382f', '#2c4234', '#1e3029'][i % 3]));
    }
    kit.many(new THREE.ConeGeometry(1, 2, 7), kit.std('#ffffff', 0.9), trees, tints, 'none');
    kit.many(new THREE.CylinderGeometry(1, 1, 1, 6), kit.std('#2a2018', 0.9), trunks, undefined, 'none');
    sky(kit, '#2a2f5c', '#9a5f86', '#f29a6a', D * 10, 40, '#ffb27a');
    // Two light poles, just switched on.
    const poles: THREE.Vector3[] = [];
    for (const side of [-1, 1]) {
      const base = new THREE.Vector3(side * (half * 0.8), 0, top.zb - 6), head = atFrame(cam, side * 0.78, 0.82, D - base.z);
      const h = Math.max(top.y + 4, head.y);
      kit.mesh(new THREE.CylinderGeometry(0.12, 0.18, h, 8), steel, 'cast').position.set(base.x, h / 2, base.z);
      kit.mesh(new THREE.BoxGeometry(2.2, 0.9, 0.3), kit.std('#2a2f3d', 0.5), 'cast').position.set(base.x, h + 0.3, base.z);
      const lamps: THREE.Vector3[] = [];
      for (let i = 0; i < 3; i++) lamps.push(new THREE.Vector3(base.x - 0.7 + i * 0.7, h + 0.3, base.z + 0.18));
      lamps.forEach(p => kit.mesh(new THREE.BoxGeometry(0.5, 0.6, 0.06), kit.lamp('#fff3d0', 2.4), 'none').position.copy(p));
      glows(kit, lamps, 2.4, '#fff1d0', 0.5);
      poles.push(new THREE.Vector3(base.x, h + 0.3, base.z + 0.2));
    }
    // A scoreboard off to one side, numbers lit.
    const sbAt = atFrame(cam, 0.55, 0.62, D - (top.zb - 9));
    const sb = kit.mesh(new THREE.BoxGeometry(4.8, 2.4, 0.3), kit.std('#151a26', 0.5), 'cast');
    sb.position.set(sbAt.x, Math.max(top.y + 3, sbAt.y), top.zb - 9);
    kit.mesh(new THREE.BoxGeometry(0.22, sb.position.y, 0.22), steel, 'cast').position.set(sb.position.x - 1.6, sb.position.y / 2, sb.position.z - 0.2);
    kit.mesh(new THREE.BoxGeometry(0.22, sb.position.y, 0.22), steel, 'cast').position.set(sb.position.x + 1.6, sb.position.y / 2, sb.position.z - 0.2);
    const face = canvasTexture(kit, 'bleachers-score', 320, 160, g => { g.fillStyle = '#0d1018'; g.fillRect(0, 0, 320, 160); digits(g, '07', 30, 40, 80, '#ff8a3c', '#2a1a14'); digits(g, '12', 190, 40, 80, '#ff8a3c', '#2a1a14'); g.fillStyle = '#ffd45c'; g.fillRect(150, 70, 20, 20); });
    kit.mesh(new THREE.PlaneGeometry(4.4, 2.1), kit.lamp('#ffffff', 1.2, face), 'none').position.set(sb.position.x, sb.position.y, sb.position.z + 0.16);
    // The sun just down behind the trees: low and warm from the side, long soft shadows, a cool sky over.
    kit.light(new THREE.HemisphereLight('#9a8ac8', '#3a4a2a', 1.15));
    keyLight(kit, '#ffb27a', 2.1, [-7, 2.4, 3.5], new THREE.Vector3(0, 1.5, -2), 14);
    return { fog: new THREE.Fog('#c47a78', D * 2.2, D * 9), background: C('#3b3358'), environment: environment(renderer, '#4a3d62', ['#ffb27a', '#8a7ab8'], '#2a3a22'), envIntensity: 0.6, crowdLight: C('#f2d2c0'), fixtures: poles, shades: new Float32Array(L.seats.length), night: false };
  },

  gym(kit, L, renderer) {
    // A school gym: pull-out wooden bleachers, block walls with high windows, banners, hanging lamps, a hardwood court.
    const D = L.camera.position[2], cam = cameraOf(L), reach = reachOf(L);
    const last = L.rows.length - 1, top = treadOf(L, last), front = treadOf(L, 0);
    const plankTex = canvasTexture(kit, 'gym-planks', 512, 64, g => { for (let i = 0; i < 8; i++) { g.fillStyle = ['#cf9a5e', '#c58f55', '#d4a266', '#c99358'][i % 4]; g.fillRect(i * 64, 0, 64, 64); g.fillStyle = 'rgba(80,45,15,0.35)'; g.fillRect(i * 64, 0, 2, 64); } }, [reach / 4, 1]);
    for (let r = 0; r <= last; r++) {
      const t = treadOf(L, r);
      kit.mesh(new THREE.BoxGeometry(reach * 2, 0.1, t.zf - t.zb - 0.06), kit.std('#ffffff', 0.55, 0, { map: plankTex }), 'both').position.set(0, t.y - 0.05, (t.zf + t.zb) / 2);
      kit.mesh(new THREE.BoxGeometry(reach * 2, t.y - 0.1, 0.08), kit.std('#3b2616', 0.9), 'receive').position.set(0, (t.y - 0.1) / 2, t.zf - 0.08);
    }
    // The wall behind: painted block, a band of colour, high windows letting the day in, banners between.
    const wallZ = top.zb - 1.6, wallTop = atFrame(cam, 0, 1.05, D - wallZ).y + 2;
    const blocks = canvasTexture(kit, 'gym-blocks', 256, 128, g => {
      g.fillStyle = '#d9cfb8'; g.fillRect(0, 0, 256, 128);
      g.fillStyle = '#c4b99f';
      for (let y = 0; y < 128; y += 32) { g.fillRect(0, y, 256, 3); for (let x = (y / 32) % 2 ? 0 : 64; x < 256; x += 128) g.fillRect(x, y, 3, 32); }
    }, [reach / 3, wallTop / 1.5]);
    kit.mesh(new THREE.PlaneGeometry(reach * 2, wallTop), kit.std('#ffffff', 0.92, 0, { map: blocks }), 'receive').position.set(0, wallTop / 2, wallZ);
    kit.mesh(new THREE.PlaneGeometry(reach * 2, 0.7), kit.std('#2c4a7e', 0.7), 'none').position.set(0, top.y + 2.4, wallZ + 0.02);
    const winY = atFrame(cam, 0, 0.78, D - wallZ).y, winH = Math.max(1.6, (atFrame(cam, 0, 0.95, D - wallZ).y - winY)), winW = 3.2;
    const winTex = canvasTexture(kit, 'gym-window', 128, 96, g => { const grad = g.createLinearGradient(0, 0, 0, 96); grad.addColorStop(0, '#e8f4ff'); grad.addColorStop(1, '#9cc4ea'); g.fillStyle = grad; g.fillRect(0, 0, 128, 96); g.fillStyle = '#5d6676'; g.fillRect(62, 0, 4, 96); g.fillRect(0, 46, 128, 4); });
    const span = Math.abs(atFrame(cam, 1, 0, D - wallZ).x);
    const windows: THREE.Vector3[] = [];
    for (let x = -span * 1.6; x <= span * 1.6; x += winW * 2.2) windows.push(new THREE.Vector3(x, winY + winH / 2, wallZ + 0.03));
    for (const w of windows) {
      kit.mesh(new THREE.PlaneGeometry(winW, winH), kit.lamp('#ffffff', 1.1, winTex), 'none').position.copy(w);
      kit.mesh(new THREE.BoxGeometry(winW + 0.3, 0.16, 0.2), kit.std('#4a5160', 0.6), 'none').position.set(w.x, w.y - winH / 2 - 0.08, wallZ + 0.1);
    }
    // Banners in the club's colours between the windows: a pennant each.
    const pennant = new THREE.Shape();
    pennant.moveTo(-0.9, 0); pennant.lineTo(0.9, 0); pennant.lineTo(0.9, -2); pennant.lineTo(0, -2.9); pennant.lineTo(-0.9, -2); pennant.closePath();
    windows.slice(0, -1).forEach((w, i) => {
      const c = CLUB[(i * 3) % CLUB.length];
      const tex = canvasTexture(kit, `gym-pennant|${c}`, 64, 96, g => { g.fillStyle = c; g.fillRect(0, 0, 64, 96); g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(0, 14, 64, 6); g.beginPath(); g.arc(32, 50, 12, 0, Math.PI * 2); g.fill(); g.fillStyle = c; g.beginPath(); g.arc(32, 50, 7, 0, Math.PI * 2); g.fill(); });
      const geo = new THREE.ShapeGeometry(pennant);
      const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, (uv.getX(k) + 0.9) / 1.8, (uv.getY(k) + 2.9) / 2.9);
      kit.mesh(geo, kit.std('#ffffff', 0.85, 0, { map: tex, side: THREE.DoubleSide }), 'none').position.set(w.x + winW * 1.1, winY + winH + 0.1, wallZ + 0.05);
    });
    // The scoreboard over the middle.
    const sbY = Math.min(winY + winH * 0.5, atFrame(cam, 0, 0.86, D - wallZ).y);
    const sb = kit.mesh(new THREE.BoxGeometry(5.6, 2.4, 0.4), kit.std('#141821', 0.5), 'cast');
    sb.position.set(0, sbY, wallZ + 0.3);
    const face = canvasTexture(kit, 'gym-score', 448, 192, g => { g.fillStyle = '#090b10'; g.fillRect(0, 0, 448, 192); digits(g, '42', 40, 50, 92, '#ff5a4a', '#24120f'); digits(g, '38', 290, 50, 92, '#ff5a4a', '#24120f'); digits(g, '4', 205, 70, 56, '#ffd45c', '#241d0f'); });
    kit.mesh(new THREE.PlaneGeometry(5.3, 2.15), kit.lamp('#ffffff', 1.3, face), 'none').position.set(0, sbY, wallZ + 0.51);
    // Lamps hanging over the stand: a shade and a warm glow each.
    const lamps: THREE.Vector3[] = [];
    const lampY = atFrame(cam, 0, 0.9, D - (top.zb + 2)).y;
    // None in the middle, where the scoreboard hangs.
    for (const i of [-3, -2, -1, 1, 2, 3]) lamps.push(new THREE.Vector3(i * Math.max(5, span * 0.42), lampY, (top.zb + front.zf) / 2));
    const shade = new THREE.CylinderGeometry(0.35, 1.1, 0.7, 20, 1, true);
    for (const p of lamps) {
      kit.mesh(shade.clone(), kit.std('#3d4452', 0.45, 0.5, { side: THREE.DoubleSide }), 'cast').position.copy(p);
      kit.mesh(new THREE.CylinderGeometry(0.02, 0.02, wallTop - p.y, 4), kit.std('#222', 0.6), 'none').position.set(p.x, p.y + (wallTop - p.y) / 2, p.z);
      kit.mesh(new THREE.SphereGeometry(0.32, 16, 10), kit.lamp('#fff3c4', 2.4), 'none').position.set(p.x, p.y - 0.28, p.z);
    }
    shade.dispose();
    glows(kit, lamps.map(p => p.clone().add(new THREE.Vector3(0, -0.4, 0))), 3.2, '#ffe9b8', 0.4);
    // The court: hardwood boards, a sideline by the stand, the centre circle and lane lines in the club's colours.
    const W = Math.max(60, quant(span * 4)), Dq = quant(D), Dz = Dq * 1.4 + 20;
    const court = canvasTexture(kit, `gym-court|${W}|${Dq}`, 2048, 1024, g => {
      for (let i = 0; i < 128; i++) { g.fillStyle = ['#c98f55', '#c28950', '#cf965b', '#c58c52'][i % 4]; g.fillRect(i * 16, 0, 16, 1024); }
      for (let i = 0; i < 400; i++) { g.fillStyle = 'rgba(120,70,30,0.18)'; g.fillRect(Math.floor(rnd(9, i) * 128) * 16, rnd(10, i) * 1024, 16, 2); }
      const ppu = 2048 / W, cz = 1024 * (Dq * 0.5) / Dz;
      g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 0.14 * ppu;
      g.beginPath(); g.moveTo(0, 2.5 * ppu); g.lineTo(2048, 2.5 * ppu); g.stroke();
      g.beginPath(); g.moveTo(1024, 2.5 * ppu); g.lineTo(1024, 1024); g.stroke();
      g.fillStyle = 'rgba(46,140,138,0.55)'; g.beginPath(); g.arc(1024, cz, 6 * ppu, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(1024, cz, 6 * ppu, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(1024, cz, 2.2 * ppu, 0, Math.PI * 2); g.stroke();
      for (const s of [-1, 1]) { g.fillStyle = 'rgba(232,121,47,0.5)'; g.fillRect(1024 + s * W * 0.36 * ppu - 4 * ppu, 2.5 * ppu, 8 * ppu, 14 * ppu); g.strokeRect(1024 + s * W * 0.36 * ppu - 4 * ppu, 2.5 * ppu, 8 * ppu, 14 * ppu); }
    });
    const floor = floorPlane(kit, L, kit.std('#ffffff', 0.38, 0, { map: court }), front.zf + 0.2);
    floor.geometry.dispose();
    floor.geometry = kit.keep(new THREE.PlaneGeometry(W, Dz).rotateX(-Math.PI / 2).translate(0, 0, front.zf + 0.2 + Dz / 2));
    // Daylight from the windows above and the lamps' warmth.
    kit.light(new THREE.HemisphereLight('#fff4e0', '#6a4a2a', 1.3));
    keyLight(kit, '#fff1d8', 1.6, [-2, 7, 5], new THREE.Vector3(0, top.y * 0.5, (top.zb + front.zf) / 2), Math.max(10, span * 0.9));
    return { fog: haze(L, '#e8dcc4', 0.1), background: C('#d9cfb8'), environment: environment(renderer, '#b8ab90', ['#ffffff', '#fff1d0', '#dfeaff'], '#8a6040'), envIntensity: 0.7, crowdLight: C('#ffffff'), fixtures: lamps, shades: shading(L), night: false };
  },

  hall(kit, L, renderer) {
    // A theatre seen from its stage: velvet rows rising to a gold-trimmed balcony, plum walls with sconces, chandeliers, footlights at the lip.
    const D = L.camera.position[2], cam = cameraOf(L), reach = reachOf(L);
    const last = L.rows.length - 1, top = treadOf(L, last), front = treadOf(L, 0);
    const section = standSection(L, { tread: r => C(r.tier ? '#4a1626' : '#5a1c2c'), riser: () => C('#2a0c16'), front: C('#1d0810'), back: C('#24101a') }, 3, 3);
    kit.mesh(sweep(section, L, reach, 4), kit.std('#ffffff', 0.9, 0, { vertexColors: true }), 'receive');
    seatBacks(kit, L, ['#a52a40', '#8e2238'], { w: 0.88, h: 0.62, d: 0.16, up: 0.12, back: 0.34 });
    // Seat backs' gold-piped tops.
    const caps: THREE.Matrix4[] = [];
    L.seats.forEach(s => caps.push(M(s.x, s.y + 0.74, s.z - 0.34)));
    kit.many(new THREE.BoxGeometry(0.9, 0.06, 0.18), kit.std('#c79a3e', 0.35, 0.8), caps, undefined, 'none');
    aisleSteps(kit, L, '#7a2c3a');
    // The balcony's front: plum with gold trim and a row of little lights.
    const breakRow = L.rows.findIndex((r, i) => i > 0 && r.tier !== L.rows[i - 1].tier);
    if (breakRow > 0) {
      const below = treadOf(L, breakRow - 1), y0 = below.y + 0.5, y1 = L.rows[breakRow].y - 0.05;
      kit.mesh(sweep([{ z: below.zb + 0.02, y: y0, c: C('#3a1424') }, { z: below.zb + 0.02, y: y1, c: C('#3a1424') }], L, reach, 4), kit.std('#ffffff', 0.7, 0, { vertexColors: true }), 'receive');
      for (const [y, h] of [[y1 - 0.08, 0.12], [y0 + 0.06, 0.1], [(y0 + y1) / 2, 0.05]] as const) kit.mesh(new THREE.BoxGeometry(reach * 2, h, 0.06), kit.std('#d9a441', 0.3, 0.9), 'none').position.set(0, y, below.zb + 0.06);
      const dots: THREE.Vector3[] = [];
      for (let x = -L.reach * 1.4; x <= L.reach * 1.4; x += 1.6) dots.push(new THREE.Vector3(x, (y0 + y1) / 2 + 0.2, below.zb + 0.1));
      dots.forEach(p => kit.mesh(new THREE.SphereGeometry(0.06, 8, 6), kit.lamp('#ffd27a', 2.2), 'none').position.copy(p));
      glows(kit, dots, 0.5, '#ffc978', 0.6);
    }
    // Walls: plum between gold-capped pilasters, a sconce on each.
    const wallZ = top.zb - 1, wallTop = atFrame(cam, 0, 1.05, D - wallZ).y + 3;
    kit.mesh(new THREE.PlaneGeometry(reach * 2, wallTop), kit.std('#3a2040', 0.9), 'receive').position.set(0, wallTop / 2, wallZ);
    const span = Math.abs(atFrame(cam, 1, 0, D - wallZ).x), pil: THREE.Matrix4[] = [], sconces: THREE.Vector3[] = [];
    for (let x = -span * 1.3; x <= span * 1.3; x += Math.max(4, span / 3)) {
      pil.push(M(x, wallTop / 2, wallZ + 0.25, 0, 0.6, wallTop, 0.5));
      sconces.push(new THREE.Vector3(x, top.y + 2.2, wallZ + 0.6));
    }
    kit.many(new THREE.BoxGeometry(1, 1, 1), kit.std('#4a2a50', 0.85), pil, undefined, 'receive');
    sconces.forEach(p => { kit.mesh(new THREE.ConeGeometry(0.22, 0.36, 12, 1, true), kit.std('#c79a3e', 0.3, 0.9, { side: THREE.DoubleSide }), 'none').position.copy(p); kit.mesh(new THREE.SphereGeometry(0.12, 10, 8), kit.lamp('#ffd27a', 2.4), 'none').position.set(p.x, p.y + 0.18, p.z); });
    glows(kit, sconces.map(p => p.clone().add(new THREE.Vector3(0, 0.2, 0.1))), 1.6, '#ffc070', 0.55);
    // The ceiling: coffered, dark, with a gold cornice; chandeliers hanging into the frame's top.
    const ceilY = atFrame(cam, 0, 1.02, D - (top.zb + 6)).y;
    kit.mesh(new THREE.PlaneGeometry(reach * 2.4, D * 2.4).rotateX(Math.PI / 2), kit.std('#22121e', 0.95), 'none').position.set(0, ceilY + 0.6, wallZ + D * 0.9);
    const coffers: THREE.Matrix4[] = [];
    for (let x = -span * 1.4; x <= span * 1.4; x += 2.4) for (let z = wallZ; z < D * 0.9; z += 2.4) coffers.push(M(x, ceilY + 0.4, z, 0, 2.0, 0.3, 2.0));
    kit.many(new THREE.BoxGeometry(1, 1, 1), kit.std('#2e1828', 0.9), coffers, undefined, 'none');
    kit.mesh(new THREE.BoxGeometry(reach * 2, 0.35, 0.4), kit.std('#b58a3a', 0.35, 0.8), 'none').position.set(0, ceilY - 0.1, wallZ + 0.3);
    const chandeliers: THREE.Vector3[] = [];
    const cy = atFrame(cam, 0, 0.82, D - (top.zb + front.zf) / 2).y;
    for (const u of [-0.55, 0, 0.55]) {
      const p = atFrame(cam, u, 0.82, D - (top.zb + front.zf) / 2);
      p.y = cy;
      chandeliers.push(p);
      const gold = kit.std('#d9a441', 0.25, 0.95);
      const outer = kit.mesh(new THREE.TorusGeometry(1.1, 0.07, 10, 40), gold, 'none');
      outer.position.copy(p); outer.rotation.x = Math.PI / 2;
      const inner = kit.mesh(new THREE.TorusGeometry(0.65, 0.06, 10, 32), gold, 'none');
      inner.position.set(p.x, p.y - 0.45, p.z); inner.rotation.x = Math.PI / 2;
      kit.mesh(new THREE.CylinderGeometry(0.03, 0.03, ceilY - p.y, 6), gold, 'none').position.set(p.x, (ceilY + p.y) / 2, p.z);
      kit.mesh(new THREE.SphereGeometry(0.25, 14, 10), kit.lamp('#fff0c8', 1.6), 'none').position.set(p.x, p.y - 0.75, p.z);
      const candles: THREE.Vector3[] = [];
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; candles.push(new THREE.Vector3(p.x + Math.cos(a) * 1.1, p.y + 0.16, p.z + Math.sin(a) * 1.1)); }
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + 0.3; candles.push(new THREE.Vector3(p.x + Math.cos(a) * 0.65, p.y - 0.3, p.z + Math.sin(a) * 0.65)); }
      candles.forEach(c => kit.mesh(new THREE.SphereGeometry(0.06, 8, 6), kit.lamp('#ffe2a0', 3), 'none').position.copy(c));
      glows(kit, candles, 0.55, '#ffd890', 0.6, 0.05);
      glows(kit, [p.clone().add(new THREE.Vector3(0, -0.3, 0))], 5, '#ffc070', 0.25);
    }
    // The stage: boards to the lip, footlights along it, and the stalls' floor below.
    const stageY = 1.1, lip = front.zf + 1.4;
    const boards = canvasTexture(kit, 'hall-boards', 512, 512, g => { for (let i = 0; i < 16; i++) { g.fillStyle = ['#5a3d28', '#523722', '#614230', '#57391f'][i % 4]; g.fillRect(0, i * 32, 512, 32); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, i * 32, 512, 2); } }, [reach / 8, D / 8]);
    floorPlane(kit, L, kit.std('#ffffff', 0.5, 0, { map: boards }), lip, stageY);
    kit.mesh(new THREE.BoxGeometry(reach * 2, stageY, 0.2), kit.std('#1d0e10', 0.8), 'receive').position.set(0, stageY / 2, lip + 0.1);
    floorPlane(kit, L, kit.std('#2a1018', 0.95), front.zf, 0.005).position.z -= 0;
    const foot: THREE.Vector3[] = [];
    for (let x = -span * 1.4; x <= span * 1.4; x += 1.4) foot.push(new THREE.Vector3(x, stageY + 0.12, lip + 0.3));
    // Footlights: low, lit on the stage's side, so they glow along the lip without hiding the front row's feet.
    foot.forEach(p => kit.mesh(new THREE.BoxGeometry(0.5, 0.09, 0.2), kit.std('#2a2a2a', 0.5, 0.6), 'none').position.set(p.x, stageY + 0.045, p.z));
    foot.forEach(p => kit.mesh(new THREE.BoxGeometry(0.38, 0.05, 0.02), kit.lamp('#ffd9a0', 2.6), 'none').position.set(p.x, stageY + 0.05, p.z + 0.11));
    glows(kit, foot.map(p => new THREE.Vector3(p.x, stageY + 0.08, p.z + 0.16)), 1.1, '#ffcf8a', 0.4);
    // Warm house lights and the stage's wash on the front rows.
    kit.light(new THREE.HemisphereLight('#ffd9b0', '#2a1018', 0.85));
    keyLight(kit, '#ffe2bd', 1.6, [1, 4, 6], new THREE.Vector3(0, top.y * 0.5, (top.zb + front.zf) / 2), Math.max(10, span));
    return { fog: haze(L, '#2a1424', 0.28), background: C('#1d1222'), environment: environment(renderer, '#2a1422', ['#ffd27a', '#ffb070'], '#1a0a10'), envIntensity: 0.6, crowdLight: C('#ffe6cf'), fixtures: chandeliers, shades: shading(L, 0.3, undefined, 0.16), night: false, raised: { z: lip, y: stageY } };
  },

  arena(kit, L, renderer) {
    // An indoor arena on event night: two tiers round the court, LED boards, a dark roof of trusses and light banks, a scoreboard hung over the middle.
    const D = L.camera.position[2], cam = cameraOf(L), reach = reachOf(L);
    const last = L.rows.length - 1, top = treadOf(L, last), front = treadOf(L, 0);
    const section = standSection(L, { tread: r => C(r.tier ? '#323a52' : '#3a4460'), riser: () => C('#202638'), front: C('#141824'), back: C('#1a1f2e') }, 4, 4);
    kit.mesh(sweep(section, L, reach, 160), kit.std('#ffffff', 0.85, 0, { vertexColors: true }), 'receive');
    seatBacks(kit, L, ['#2c56a8', '#4a3a92'], { w: 0.86, h: 0.44, d: 0.1, up: 0.16, back: 0.36 });
    aisleSteps(kit, L, '#56607a');
    board(kit, L, front.zf + 0.03, 0.06, L.spec.front - 0.08, 3, 1.25);
    const breakRow = L.rows.findIndex((r, i) => i > 0 && r.tier !== L.rows[i - 1].tier);
    if (breakRow > 0) { const b = treadOf(L, breakRow - 1); board(kit, L, b.zb + 0.03, b.y + 0.3, L.rows[breakRow].y - 0.1, 7, 1.1, -0.008); }
    // Above the top row: a lit ring, then the dark roof.
    const ring = top.y + 3.2;
    board(kit, L, top.zb + 0.02, ring - 0.5, ring + 0.2, 11, 0.9, 0.006);
    const roofY = atFrame(cam, 0, 1.05, D - top.zb).y + 2;
    kit.mesh(new THREE.PlaneGeometry(L.spec.radius * 6, L.spec.radius * 6).rotateX(Math.PI / 2), kit.std('#0b0e16', 0.95), 'none').position.set(0, roofY + 2, 0);
    // Trusses across the roof: a grid of beams catching light.
    const beams: THREE.Matrix4[] = [], trussY = roofY - 1;
    for (let x = -L.spec.radius * 2; x <= L.spec.radius * 2; x += 7) beams.push(M(x, trussY, D * 0.3, 0, 0.35, 0.5, D * 2.2));
    for (let z = top.zb - 6; z < D * 1.1; z += 7) beams.push(M(0, trussY - 0.3, z, 0, L.spec.radius * 4, 0.35, 0.35));
    kit.many(new THREE.BoxGeometry(1, 1, 1), kit.std('#2a3042', 0.6, 0.5), beams, undefined, 'none');
    // Light banks on the trusses, aimed at the court, and the soft cones under them.
    const banks: THREE.Vector3[] = [], bulbs: THREE.Vector3[] = [];
    for (const u of [-0.75, -0.38, 0.38, 0.75]) {
      const p = atFrame(cam, u, 0.86, D - (top.zb + 10)); p.y = trussY - 0.6;
      banks.push(p);
      kit.mesh(new THREE.BoxGeometry(3.6, 1.2, 0.5), kit.std('#232838', 0.6), 'none').position.copy(p);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const b = new THREE.Vector3(p.x - 1.2 + i * 0.8, p.y - 0.25 + j * 0.5, p.z + 0.27); bulbs.push(b); kit.mesh(new THREE.PlaneGeometry(0.6, 0.38), kit.lamp('#fff3d6', 3), 'none').position.copy(b); }
      cone(kit, p, new THREE.Vector3(p.x * 0.5, 0, D * 0.35), 6, '#dce6ff', 0.12);
    }
    glows(kit, bulbs, 1.6, '#fff3d6', 0.5);
    glows(kit, banks, 9, '#cfdcff', 0.12);
    // The scoreboard hung over the court: four screens and a lit rim.
    const sbAt = atFrame(cam, 0, 0.72, D * 0.62);
    const sbW = Math.max(5, Math.abs(atFrame(cam, 0.2, 0, D * 0.62).x - sbAt.x) * 2), sbH = sbW * 0.45;
    sbAt.y = Math.min(sbAt.y, trussY - sbH);
    kit.mesh(new THREE.BoxGeometry(sbW, sbH, sbW * 0.8), kit.std('#161a26', 0.5, 0.3), 'none').position.copy(sbAt);
    const screen = canvasTexture(kit, 'arena-screen', 512, 230, g => {
      g.fillStyle = '#060912'; g.fillRect(0, 0, 512, 230);
      g.fillStyle = '#e8792f'; g.fillRect(8, 8, 244, 40); g.fillStyle = '#2e8c8a'; g.fillRect(260, 8, 244, 40);
      digits(g, '88', 24, 66, 120, '#ffffff', '#151a28'); digits(g, '86', 330, 66, 120, '#ffffff', '#151a28'); digits(g, '2:14', 214, 118, 40, '#ffd45c', '#221d10');
      g.fillStyle = '#e8792f'; g.fillRect(8, 200, 160, 20); g.fillStyle = '#2e8c8a'; g.fillRect(344, 200, 160, 20);
    });
    kit.mesh(new THREE.PlaneGeometry(sbW * 0.94, sbH * 0.86), kit.lamp('#ffffff', 1.25, screen), 'none').position.set(sbAt.x, sbAt.y, sbAt.z + sbW * 0.4 + 0.02);
    kit.mesh(new THREE.BoxGeometry(sbW * 1.04, 0.22, sbW * 0.84), kit.lamp('#5fb4ff', 1.4), 'none').position.set(sbAt.x, sbAt.y - sbH / 2 - 0.12, sbAt.z);
    kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, trussY - sbAt.y - sbH / 2, 6), kit.std('#222', 0.5), 'none').position.set(sbAt.x - sbW * 0.4, (trussY + sbAt.y + sbH / 2) / 2, sbAt.z);
    kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, trussY - sbAt.y - sbH / 2, 6), kit.std('#222', 0.5), 'none').position.set(sbAt.x + sbW * 0.4, (trussY + sbAt.y + sbH / 2) / 2, sbAt.z);
    // The court: hardwood in the middle, painted surround, lines.
    const W = L.spec.radius * 2.6, Dz = D * 1.6;
    const court = canvasTexture(kit, `arena-court|${W}`, 2048, 1024, g => {
      g.fillStyle = '#1d3f73'; g.fillRect(0, 0, 2048, 1024);
      const ppu = 2048 / W, cx = 1024, cz = (D * 0.42) * 1024 / Dz;
      const cw = 48 * ppu, ch = (D * 0.9) * 1024 / Dz;
      for (let i = 0; i < cw / 12; i++) { g.fillStyle = ['#c98f55', '#c28950', '#cf965b'][i % 3]; g.fillRect(cx - cw / 2 + i * 12, 3 * ppu, 12, ch); }
      g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 0.16 * ppu;
      g.strokeRect(cx - cw / 2, 3 * ppu, cw, ch);
      g.beginPath(); g.moveTo(cx, 3 * ppu); g.lineTo(cx, 3 * ppu + ch); g.stroke();
      g.fillStyle = '#2e8c8a'; g.beginPath(); g.arc(cx, cz, 5 * ppu, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#e8792f'; g.beginPath(); g.arc(cx, cz, 2 * ppu, 0, Math.PI * 2); g.fill();
    });
    const floor = floorPlane(kit, L, kit.std('#ffffff', 0.35, 0, { map: court }), front.zf + 0.1);
    floor.geometry.dispose();
    floor.geometry = kit.keep(new THREE.PlaneGeometry(W, Dz).rotateX(-Math.PI / 2).translate(0, 0, front.zf + 0.1 + Dz / 2));
    // Lit from the banks overhead; a cool fill; the court's bounce.
    kit.light(new THREE.HemisphereLight('#6b7fb8', '#2a2018', 1.0));
    keyLight(kit, '#f2f4ff', 2.6, [0, 8, 6], new THREE.Vector3(0, top.y * 0.5, -L.rows[last].back * 0.5), Math.max(16, Math.abs(atFrame(cam, 1, 0, D).x)));
    return { fog: haze(L, '#1c2338', 0.4), background: C('#080b12'), environment: environment(renderer, '#0e1220', ['#ffffff', '#cfdcff', '#5fb4ff'], '#1d3f73'), envIntensity: 0.55, crowdLight: C('#e4e8f4'), fixtures: banks, shades: shading(L, 0.22, undefined, 0.24), night: true };
  },

  stadium: (kit, L, renderer) => bigBowl(kit, L, renderer, false),
  bowl: (kit, L, renderer) => bigBowl(kit, L, renderer, true),
};

/**
 * The open stadium and the roofed bowl: tiers round a striped pitch under floodlights. The stadium has a
 * cantilever roof over its upper tier and four floodlight towers; the bowl's roof closes over the top
 * tier, with screens in its corners and light banks along its edge.
 */
function bigBowl(kit: Kit, L: Layout3D, renderer: THREE.WebGLRenderer, closed: boolean): Built {
  const D = L.camera.position[2], cam = cameraOf(L), reach = reachOf(L);
  const last = L.rows.length - 1, top = treadOf(L, last), front = treadOf(L, 0);
  const seatColours = closed ? ['#2c5fae', '#e07a34', '#2a8f8c'] : ['#2c5fae', '#3a4fa0'];
  const section = standSection(L, { tread: r => C(['#4a5368', '#434b60', '#3d455a'][r.tier] ?? '#3d455a'), riser: () => C('#262c3c'), front: C('#141824'), back: C('#1e2433') }, 5, 3);
  kit.mesh(sweep(section, L, reach, 200), kit.std('#ffffff', 0.85, 0, { vertexColors: true }), 'receive');
  seatBacks(kit, L, seatColours, { w: 0.86, h: 0.42, d: 0.1, up: 0.16, back: 0.36 });
  aisleSteps(kit, L, '#6a7488');
  board(kit, L, front.zf + 0.03, 0.06, L.spec.front - 0.08, 5, 1.25);
  L.rows.forEach((r, i) => { if (i > 0 && r.tier !== L.rows[i - 1].tier) { const b = treadOf(L, i - 1); board(kit, L, b.zb + 0.03, b.y + 0.35, r.y - 0.12, 13 + i, 1.05, (i % 2 ? 1 : -1) * 0.007); } });
  const R = L.spec.radius, backR = R - top.zb;
  // The roof: a slab along the arc over the upper rows, its underside lit along the front edge.
  const roofY = Math.max(top.y + 5, atFrame(cam, 0, closed ? 0.78 : 0.64, D - top.zb).y);
  const reachOver = closed ? 16 : 6;
  // The bowl's roof rises to its back and closes over it; the stadium's is a thin canopy falling away behind
  // its lit front edge, so the night sky and the floodlight towers fill the frame above it.
  const back0 = closed ? roofY + 1.6 : roofY - 1.1, back1 = closed ? roofY + 2.4 : roofY - 0.75;
  const roof: Section = [{ z: top.zb - 2, y: back0, c: C('#1b2030') }, { z: top.zb + reachOver, y: roofY, c: C('#232a3c') }, { z: top.zb + reachOver, y: roofY + 0.6, c: C('#2c3346') }, { z: top.zb - 2, y: back1, c: C('#2c3346') }];
  kit.mesh(sweep(roof, L, reach, 160), kit.std('#ffffff', 0.7, 0.2, { vertexColors: true, side: THREE.DoubleSide }), 'both');
  board(kit, L, top.zb + reachOver + 0.02, roofY + 0.02, roofY + 0.55, 21, closed ? 1.2 : 0.8, 0.004);
  if (!closed) {
    // The canopy's edge: a lit strip along its lip, so its outline reads against the sky.
    kit.mesh(sweep([{ z: top.zb + reachOver + 0.04, y: roofY + 0.56, c: C('#ffffff') }, { z: top.zb + reachOver + 0.04, y: roofY + 0.66, c: C('#ffffff') }], L, reach, 160), kit.lamp('#e6eeff', 1.6), 'none');
  }
  // Under the roof: ribs out to its edge, and strips of light along it, so it reads as a structure in the dark.
  const under0 = { z: top.zb - 2, y: back0 }, under1 = { z: top.zb + reachOver, y: roofY };
  const ulen = Math.hypot(under1.z - under0.z, under1.y - under0.y), slope = Math.atan2(under1.y - under0.y, under1.z - under0.z);
  const ribs: THREE.Matrix4[] = [];
  const ribStep = L.spec.shape === 'arc' ? 3.2 / (R - top.zb) : 3.2;
  for (let u = -reach; u <= reach; u += ribStep) {
    const mid = place(L, (under0.z + under1.z) / 2, (under0.y + under1.y) / 2 - 0.25, u);
    ribs.push(new THREE.Matrix4().compose(mid, new THREE.Quaternion().setFromEuler(new THREE.Euler(-slope, facing(L, u), 0, 'YXZ')), new THREE.Vector3(0.22, 0.5, ulen)));
  }
  kit.many(new THREE.BoxGeometry(1, 1, 1), kit.std('#2f3850', 0.55, 0.4), ribs, undefined, 'none');
  for (const f of closed ? [0.35, 0.7] : [0.6]) {
    const z = under0.z + (under1.z - under0.z) * f, y = under0.y + (under1.y - under0.y) * f - 0.52;
    kit.mesh(sweep([{ z: z + 0.2, y, c: C('#ffffff') }, { z: z - 0.2, y, c: C('#ffffff') }], L, reach, 160), kit.lamp('#dfe8ff', 1.5), 'none');
  }
  // The back wall, up to the roof's underside and no further.
  kit.mesh(sweep([{ z: top.zb - 1.8, y: top.y, c: C('#1a1f2c') }, { z: top.zb - 1.8, y: back0 + (closed ? 0.4 : 0.1), c: C('#1a1f2c') }], L, reach, 120), kit.std('#ffffff', 0.9, 0, { vertexColors: true }), 'receive');
  // A band of boxes along it, their windows lit warm, a few dark.
  const boxY0 = top.y + 1.5, boxY1 = Math.min(top.y + 4.6, back0 - 0.4, boxY0 + 2.2);
  if (boxY1 - boxY0 > 0.8) {
    const boxes = canvasTexture(kit, 'bowl-boxes', 512, 64, g => {
      g.fillStyle = '#0d1018'; g.fillRect(0, 0, 512, 64);
      for (let i = 0; i < 16; i++) {
        const on = rnd(31, i) > 0.18, warm = ['#ffd9a0', '#ffe8c4', '#fff1dc', '#ffcf8a'][i % 4];
        g.fillStyle = on ? warm : '#1c2232'; g.fillRect(i * 32 + 3, 10, 26, 40);
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(i * 32 + 3, 30, 26, 2);
      }
    });
    const length = L.spec.shape === 'arc' ? 2 * reach * (R - top.zb) : 2 * reach;
    boxes.wrapS = THREE.RepeatWrapping; boxes.repeat.set(Math.max(1, Math.round(length / ((boxY1 - boxY0) * 9))), 1);
    kit.mesh(sweep([{ z: top.zb + 0.03, y: boxY0, c: C('#ffffff') }, { z: top.zb + 0.03, y: boxY1, c: C('#ffffff') }], L, reach, 160), kit.lamp('#ffffff', 1.1, boxes), 'none');
  }
  // Lamps along the roof's edge: banks of floodlights, each a grid of lit cells with a glow and a cone onto the pitch.
  const fixtures: THREE.Vector3[] = [], cells: THREE.Vector3[] = [], cellAt: THREE.Matrix4[] = [];
  const banks = closed ? 6 : 4, centre = new THREE.Vector3(0, 0, R * 0.9);
  // The bowl's screens hang between its inner two banks either side.
  const screenAt = 0.38;
  for (let b = 0; b < banks; b++) {
    const u = (b - (banks - 1) / 2) / ((banks - 1) / 2) * L.reach * (closed ? 0.95 : 0.85);
    let p: THREE.Vector3;
    if (closed) p = place(L, top.zb + reachOver - 0.6, roofY - 0.5, u);
    else {
      // The stadium's towers stand behind the stand, their heads up over the roof.
      const base = place(L, top.zb - 8, 0, u), head = atFrame(cam, onFrame(cam, base).x, 0.84, D - base.z);
      p = new THREE.Vector3(base.x, Math.max(roofY + 6, head.y), base.z);
      const h = p.y;
      kit.mesh(new THREE.CylinderGeometry(0.35, 0.9, h, 6), kit.std('#2a3042', 0.6, 0.4), 'cast').position.set(base.x, h / 2, base.z);
    }
    const yaw = Math.atan2(centre.x - p.x, centre.z - p.z);
    const w = closed ? 4.2 : 5.6, h = closed ? 1.3 : 3.2, cols = closed ? 6 : 6, rows = closed ? 2 : 4;
    const frame = kit.mesh(new THREE.BoxGeometry(w + 0.4, h + 0.4, 0.4), kit.std('#1d2232', 0.6, 0.4), 'none');
    frame.position.copy(p); frame.rotation.y = yaw;
    const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const c = p.clone().addScaledVector(right, (i - (cols - 1) / 2) * (w / cols)).add(new THREE.Vector3(0, (j - (rows - 1) / 2) * (h / rows), 0)).addScaledVector(fwd, 0.22);
      cells.push(c); cellAt.push(M(c.x, c.y, c.z, yaw, (w / cols) * 0.78, (h / rows) * 0.74, 1));
    }
    fixtures.push(p.clone().addScaledVector(fwd, 0.5));
    const aim = new THREE.Vector3(p.x * 0.35, 0, R * (0.55 + 0.25 * Math.abs(u) / Math.max(0.01, L.reach)));
    cone(kit, p.clone().addScaledVector(fwd, 0.4), aim, closed ? 6 : 7, '#dfe8ff', closed ? 0.2 : 0.24);
  }
  kit.many(new THREE.PlaneGeometry(1, 1), kit.lamp('#fff6dc', 3.2), cellAt, undefined, 'none');
  glows(kit, cells, closed ? 2.2 : 3, '#f4f6ff', 0.6);
  glows(kit, fixtures, closed ? 12 : 22, '#d6e2ff', closed ? 0.22 : 0.3);
  if (closed) {
    // Screens hung under the roof between the light banks, their tops clear of its underside.
    for (const s of [-1, 1]) {
      const z = top.zb + reachOver - 3, under = under0.y + (under1.y - under0.y) * ((z - under0.z) / (under1.z - under0.z));
      const sw = Math.min(Math.max(9, backR * 0.14), 2 * 0.15 * L.reach * (R - z)), sh = sw * 0.5;
      const u = s * L.reach * screenAt, p = place(L, z, under - 0.6 - sh / 2 - 0.3, u);
      const screen = canvasTexture(kit, `bowl-screen|${s}`, 512, 256, g => {
        g.fillStyle = '#0b0f1a'; g.fillRect(0, 0, 512, 256);
        g.fillStyle = s < 0 ? '#e8792f' : '#2e8c8a'; g.fillRect(0, 0, 512, 22); g.fillRect(0, 234, 512, 22);
        digits(g, s < 0 ? '3' : '1', 120, 60, 140, '#ffffff', 'rgba(255,255,255,0.08)');
        digits(g, s < 0 ? '1' : '3', 300, 60, 140, '#ffffff', 'rgba(255,255,255,0.08)');
      });
      const m = kit.mesh(new THREE.PlaneGeometry(sw, sh), kit.lamp('#ffffff', 1.15, screen), 'none');
      m.position.copy(p); m.rotation.y = facing(L, u);
      const box = kit.mesh(new THREE.BoxGeometry(sw + 0.6, sh + 0.6, 0.8), kit.std('#141824', 0.5), 'none');
      box.position.copy(p).add(new THREE.Vector3(-Math.sin(facing(L, u)) * 0.45, 0, -Math.cos(facing(L, u)) * 0.45)); box.rotation.y = facing(L, u);
    }
  }
  // The pitch: stripes and lines, and the ground round it.
  const Dq = quant(D), W = R * 3, Dz = Dq * 1.8 + 20, centreZ = Math.min(R * 0.95, Dq * 0.6);
  const pitch = pitchTexture(kit, W, Dz, centreZ - front.zf, ['#2f8a4c', '#2a7d44'], 18);
  const floor = floorPlane(kit, L, kit.std('#ffffff', 0.85, 0, { map: pitch }), front.zf + 0.05);
  floor.geometry.dispose();
  floor.geometry = kit.keep(new THREE.PlaneGeometry(W, Dz).rotateX(-Math.PI / 2).translate(0, 0, front.zf + 0.05 + Dz / 2));
  floorPlane(kit, L, kit.std('#1c2a22', 0.95), front.zf, -0.02);
  // Inside the camera's far plane, so the sky over the stand is never cut away to black.
  sky(kit, '#070b18', '#121c36', '#2a3a62', Math.min(D * 12, L.camera.far * 0.7), closed ? 500 : 900, '#3a5288');
  // Floodlit: a strong cool key from over the camera and the banks, a dim fill, shadows under the roof.
  kit.light(new THREE.HemisphereLight('#5a6c9c', '#1a2a1a', 0.9));
  keyLight(kit, '#f4f6ff', 2.6, [0.2, 9, 7], new THREE.Vector3(0, top.y * 0.55, R - (R + L.rows[last].back * 0.5)), Math.max(30, Math.abs(atFrame(cam, 1, 0, D).x)), 2048);
  // Rows under the roof sit in its shade.
  const under = (row: Row3D) => (-row.back < top.zb + reachOver ? 0.16 : 0);
  return { fog: haze(L, '#222c44', closed ? 0.55 : 0.5), background: C('#04060c'), environment: environment(renderer, '#0c1020', ['#ffffff', '#dfe8ff', '#ffffff'], '#1a3a24'), envIntensity: 0.55, crowdLight: C('#e2e6f2'), fixtures, shades: shading(L, 0.22, under, 0.3), night: true };
}
