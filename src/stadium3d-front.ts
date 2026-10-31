/**
 * What the 3D stadium (./stadium3d) draws in front of its stands: the numbers guys hold up over their
 * heads, the sparks and sparkles of their reactions to a result, and the spotlit winner's light rays and
 * falling confetti. Signs and bursts follow each guy's pose on the GPU (a hop lifts their sign with
 * them), and a sign is drawn at whole device pixels, so it reads as sharply as its lettering was drawn.
 * The pure parts (which signs show, where a winner stands) are here too, so they can be tested.
 */
import * as THREE from 'three';
import { POSE_GLSL, quadGeometry, type GuyUniforms } from './stadium3d-gl';

/** A sign's colours: the plain card, gold for an exact guess, or the game's own colour (the round's closest). */
export type SignTone = 'plain' | 'gold' | 'accent';

/** A box on the canvas in CSS pixels from its top left. */
export interface Rect { left: number; top: number; right: number; bottom: number }

/** The club's colours, for confetti. */
const CLUB = ['#e8792f', '#2e8c8a', '#4e7fb3', '#c2403f', '#3fa35b', '#7d4fa6', '#e36a8e', '#e7b53b', '#f3eee4'];

const overlaps = (a: Rect, b: Rect, gap = 0) => a.right + gap > b.left && a.left < b.right + gap && a.bottom + gap > b.top && a.top < b.bottom + gap;

// ------------------------------------------------------------ which signs show

/** A sign that wants holding up: the top of the guy's head on the canvas and how tall they are there, and the sign's size, all CSS px. */
export interface SignAsk { x: number; y: number; h: number; w: number; sh: number }
/** What a guy holds up: their sign, a dot (too small on screen for a number), or nothing (no clear room). */
export type SignShow = 'sign' | 'dot' | 'none';
export interface SignSpot { show: SignShow; dx: number }

/** Under this tall on screen (CSS px), a guy holds up a dot rather than a number nobody could read. */
export const SIGN_MIN_H = 18;
/** Gap kept between two signs (px), and from the canvas's edge. */
const SIGN_GAP = 3, SIGN_EDGE = 4;

/**
 * Which signs are held up, from `asks` in the order they matter (the game's first, then the newest): a sign
 * goes up where it touches no sign already up and nothing in `keepOut`, nudged in from the canvas's edges;
 * the rest stay down (their guys still hop). Far guys hold up a dot, where it has room.
 */
export function placeSigns(asks: SignAsk[], view: { w: number; h: number }, keepOut: Rect[] = []): SignSpot[] {
  const placed: Rect[] = [];
  const clear = (r: Rect, gap: number) => placed.every(o => !overlaps(r, o, gap)) && keepOut.every(o => !overlaps(r, o));
  return asks.map(a => {
    if (a.x < 0 || a.x > view.w || a.y > view.h || a.y < 0) return { show: 'none', dx: 0 };
    if (a.h < SIGN_MIN_H) {
      const d = dotSize(a.h), r = { left: a.x - d / 2, right: a.x + d / 2, top: a.y - d - 2, bottom: a.y - 2 };
      if (r.top < SIGN_EDGE || !clear(r, 1)) return { show: 'none', dx: 0 };
      placed.push(r);
      return { show: 'dot', dx: 0 };
    }
    const dx = Math.round(Math.max(SIGN_EDGE + a.w / 2 - a.x, Math.min(view.w - SIGN_EDGE - a.w / 2 - a.x, 0)));
    const r = { left: a.x + dx - a.w / 2, right: a.x + dx + a.w / 2, top: a.y - a.sh, bottom: a.y };
    if (r.top < SIGN_EDGE || !clear(r, SIGN_GAP)) return { show: 'none', dx: 0 };
    placed.push(r);
    return { show: 'sign', dx };
  });
}

/** Lettering sizes (CSS px): a few steps, so guys of about one size share the same pictures. */
export const SIGN_SIZES = [12, 14, 16, 19, 23] as const;
/** A sign's lettering for a guy `h` CSS px tall on screen: about a third of them, read from a stream. */
export function signSize(h: number): number {
  const want = h * 0.34;
  let s: number = SIGN_SIZES[0];
  for (const z of SIGN_SIZES) if (z <= want) s = z;
  return s;
}
/** A far guy's dot (CSS px). */
export function dotSize(h: number): number { return h < 9 ? 3 : h < 14 ? 4 : 5; }

/** A sign's parts at lettering size `f` (CSS px): the card's padding and height, its lip, and the stick under it. */
export function signParts(f: number) {
  const padX = Math.round(f * 0.42), padY = Math.round(f * 0.14), card = Math.round(f * 1.06) + 2 * padY;
  return { padX, padY, card, lip: Math.max(1, Math.round(f * 0.12)), stick: Math.round(f * 0.5), stickW: Math.max(2, Math.round(f * 0.16)), radius: Math.round(f * 0.3) };
}

// ------------------------------------------------------------ where the winner stands

/**
 * The steps down the floor a winner may stand from their first spot in front of the stand, toward the camera,
 * and (negative) up over the stand's front rows, popping up out of the crowd where the floor is too tight.
 */
export const WINNER_STEPS = [0, 1, 2, 3, 4, -1, -2, -3] as const;

/**
 * Where the spotlit winner lands: `probe(across, size, down)` says what they would cover there (their
 * figure, and their line under them), `across` from -1 (the left edge) to 1, `size` a share of their full size, and `down`
 * steps further down the floor toward the camera than the first spot in front of the stand; null where
 * there's no floor. The nearest to `prefer` at the biggest size that keeps clear of `keepOut` and the
 * canvas's edges wins: being moved along a tenth of the width costs about as much as shrinking by a
 * twentieth, each step down a little less, each step up over the stand a little more.
 */
export function fitWinner(prefer: number, probe: (across: number, size: number, down: number) => Rect[] | null, view: { w: number; h: number }, keepOut: Rect[] = []): { across: number; size: number; down: number; clear: boolean } {
  const p = Math.max(-0.92, Math.min(0.92, prefer));
  let best: { across: number; size: number; down: number; cost: number } | null = null;
  // Nowhere clear at all (a tiny window): wherever covers least.
  let least: { across: number; size: number; down: number; over: number } | null = null;
  const area = (r: Rect, o: Rect) => Math.max(0, Math.min(r.right, o.right) - Math.max(r.left, o.left)) * Math.max(0, Math.min(r.bottom, o.bottom) - Math.max(r.top, o.top));
  for (const size of [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.42, 0.34, 0.26]) {
    for (const down of WINNER_STEPS) for (let k = 0; k <= 80; k++) {
      const d = Math.ceil(k / 2) * 0.025 * (k % 2 ? -1 : 1), across = p + d;
      if (across < -0.92 || across > 0.92) continue;
      const cost = Math.abs(d) * 0.5 + (1 - size) + (down < 0 ? -down * 0.06 : down * 0.03);
      if (best && cost >= best.cost) continue;
      const rs = probe(across, size, down);
      if (!rs) continue;
      const edge = rs.some(r => r.left < 10 || r.right > view.w - 10 || r.top < 6 || r.bottom > view.h - 4);
      if (!edge && rs.every(r => keepOut.every(o => !overlaps(r, o, 8)))) { best = { across, size, down, cost }; continue; }
      if (!best && !edge) {
        const over = rs.reduce((n, r) => n + keepOut.reduce((m, o) => m + area(r, o), 0), 0);
        if (!least || over < least.over) least = { across, size, down, over };
      }
    }
  }
  if (best) return { across: best.across, size: best.size, down: best.down, clear: true };
  return least ? { across: least.across, size: least.size, down: least.down, clear: false } : { across: p, size: 0.42, down: 0, clear: false };
}

// ------------------------------------------------------------ the signs' pictures

interface Entry { x: number; y: number; w: number; h: number; gen: number }

/** Colours of a sign's card, its lip and lettering, and the stick it is held up on. */
function toneColours(tone: SignTone, accent: string) {
  if (tone === 'gold') return { card: '#f2c94c', lip: '#a87a12', ink: '#2a1d00', stick: '#6b4a1e' };
  if (tone === 'accent') { const c = new THREE.Color(accent); return { card: accent, lip: `#${c.clone().multiplyScalar(0.62).getHexString()}`, ink: '#ffffff', stick: '#4a3b30' }; }
  return { card: '#f3eee4', lip: '#a99d88', ink: '#11151b', stick: '#5b4a3a' };
}

/** Every sign's picture on one canvas, drawn at the device's pixels as it is first needed; drawn again from empty when full. */
function makeAtlas(fontOf: (px: number) => string, accent: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  const g = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  const entries = new Map<string, Entry>();
  let x = 0, y = 0, row = 0, gen = 0, dirty = false;
  const reset = () => { entries.clear(); g.clearRect(0, 0, canvas.width, canvas.height); x = y = row = 0; gen++; dirty = true; };
  function room(w: number, h: number): [number, number] | null {
    if (x + w + 2 > canvas.width) { x = 0; y += row + 2; row = 0; }
    if (y + h + 2 > canvas.height) return null;
    const at: [number, number] = [x + 1, y + 1];
    x += w + 2; row = Math.max(row, h);
    return at;
  }
  return {
    texture,
    get generation() { return gen; },
    /** A sign's picture: `text` at lettering size `f` CSS px (or a dot `f` px wide when `text` is null), at `dpr`. */
    get(text: string | null, tone: SignTone, f: number, dpr: number): Entry {
      const key = `${text ?? '•'}|${tone}|${f}|${dpr}`;
      const had = entries.get(key);
      if (had) return had;
      const c = toneColours(tone, accent), P = (n: number) => Math.max(1, Math.round(n * dpr));
      let w: number, h: number, draw: (ox: number, oy: number) => void;
      if (text === null) {
        // A dot: a little card held up, too far to read.
        const s = P(f), lip = P(1);
        w = s; h = s + lip;
        draw = (ox, oy) => { g.fillStyle = c.lip; g.fillRect(ox, oy + lip, s, s); g.fillStyle = c.card; g.fillRect(ox, oy, s, s); };
      } else {
        const parts = signParts(f), font = fontOf(P(f));
        g.font = font;
        const tw = Math.ceil(g.measureText(text).width);
        const cw = tw + 2 * P(parts.padX), ch = P(parts.card), lip = P(parts.lip), stick = P(parts.stick), sw = P(parts.stickW), r = P(parts.radius);
        w = cw; h = ch + lip + stick;
        draw = (ox, oy) => {
          // The stick, then the card's lip under it, then the card and its number.
          g.fillStyle = c.stick; g.fillRect(ox + Math.round((cw - sw) / 2), oy + ch, sw, lip + stick);
          g.fillStyle = c.lip; g.beginPath(); g.roundRect(ox, oy + lip, cw, ch, r); g.fill();
          g.fillStyle = c.card; g.beginPath(); g.roundRect(ox, oy, cw, ch, r); g.fill();
          g.font = font; g.fillStyle = c.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText(text, ox + cw / 2, oy + Math.round(ch / 2) + P(1));
        };
      }
      let at = room(w, h);
      if (!at) { reset(); at = room(w, h)!; }
      draw(at[0], at[1]);
      dirty = true;
      const e = { x: at[0], y: at[1], w, h, gen };
      entries.set(key, e);
      return e;
    },
    /** Uploads what was drawn since the last frame, once. */
    flush() { if (dirty) { texture.needsUpdate = true; dirty = false; } },
    reset,
    size: () => [canvas.width, canvas.height] as const,
    dispose() { texture.dispose(); },
  };
}

// ------------------------------------------------------------ the signs

interface Sign {
  slot: number; text: string; tone: SignTone; order: number;
  /** Shown or not (placed with room), how much, and when it popped up, changed or flipped to another colour. */
  show: SignShow; dot: boolean; alpha: number; popAt: number; flipAt: number; was: { text: string; tone: SignTone } | null;
  dropped: boolean; dx: number; f: number;
  /** Its picture now, and the one it is flipping from, with what each shows. */
  entry: Entry | null; key: string; old: Entry | null; oldKey: string;
}

/** Where a guy's sign is held, from the top of the toy, in guys. */
const HEAD = 1.04;
const MOST_SIGNS = 768;

/** The signs guys hold up over their heads, drawn in their own pass over the stands. */
export function makeSigns(uniforms: GuyUniforms, opts: { font?: string; accent?: string }) {
  const fontOf = (px: number) => opts.font ? opts.font.replace(/\d+(\.\d+)?px/, `${px}px`) : `700 ${px}px system-ui, -apple-system, sans-serif`;
  const atlas = makeAtlas(fontOf, opts.accent ?? '#e8792f');
  const geometry = quadGeometry();
  const aGuy = new THREE.InstancedBufferAttribute(new Float32Array(MOST_SIGNS), 1).setUsage(THREE.DynamicDrawUsage);
  const aBox = new THREE.InstancedBufferAttribute(new Float32Array(MOST_SIGNS * 4), 4).setUsage(THREE.DynamicDrawUsage);
  const aShow = new THREE.InstancedBufferAttribute(new Float32Array(MOST_SIGNS * 4), 4).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('aGuy', aGuy); geometry.setAttribute('aBox', aBox); geometry.setAttribute('aShow', aShow);
  geometry.instanceCount = 0;
  const material = new THREE.ShaderMaterial({
    uniforms: { ...uniforms, uMap: { value: atlas.texture }, uView: { value: new THREE.Vector2(1, 1) }, uAtlas: { value: new THREE.Vector2(1024, 1024) }, uHead: { value: HEAD } },
    vertexShader: /* glsl */ `
      ${POSE_GLSL}
      attribute float aGuy;
      attribute vec4 aBox, aShow;
      uniform vec2 uView, uAtlas;
      uniform float uHead;
      varying vec2 vUv;
      varying float vA;
      void main() {
        GuyPose gp = guyPose(aGuy);
        if (aShow.x < 0.005 || gp.mode < 0.5) { gl_Position = vec4(0.0, 0.0, -2.0, 1.0); return; }
        // Over their head as it moves (a hop, the wave), turned with any lean.
        vec3 head = gp.pos + vec3(-sin(gp.roll) * uHead * gp.sy, gp.lift + cos(gp.roll) * uHead * gp.sy, 0.0);
        vec4 clip = projectionMatrix * viewMatrix * vec4(head, 1.0);
        if (clip.w <= 0.0) { gl_Position = vec4(0.0, 0.0, -2.0, 1.0); return; }
        vec2 px = (clip.xy / clip.w * 0.5 + 0.5) * uView;
        // Its foot on whole pixels; at full size every corner is, so the lettering is exactly as drawn.
        vec2 foot = floor(vec2(px.x + aShow.w - aBox.z * 0.5, px.y) + 0.5);
        vec2 corner = vec2((position.x + 0.5) * aBox.z, position.y * aBox.w);
        // Popping (y) and flipping (x) about the middle of its foot.
        corner = vec2((corner.x - aBox.z * 0.5) * aShow.y + aBox.z * 0.5, corner.y * aShow.z);
        gl_Position = vec4((foot + corner) / uView * 2.0 - 1.0, 0.0, 1.0);
        vUv = vec2(aBox.x + (position.x + 0.5) * aBox.z, uAtlas.y - (aBox.y + (1.0 - position.y) * aBox.w)) / uAtlas;
        vA = aShow.x;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      varying vec2 vUv;
      varying float vA;
      void main() {
        vec4 c = texture2D(uMap, vUv);
        if (c.a < 0.01) discard;
        gl_FragColor = vec4(c.rgb, c.a * vA);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(mesh);
  const signs = new Map<number, Sign>();
  let order = 0, gen = -1, dpr = 1;
  const pop = (k: number) => k >= 1 ? 1 : 1 - 0.42 * Math.exp(-k * 7) * Math.cos(k * 15);
  const fonts = () => { atlas.reset(); for (const s of signs.values()) { s.entry = s.old = null; s.key = s.oldKey = ''; } };
  document.fonts?.addEventListener?.('loadingdone', fonts);
  return {
    get count() { let n = 0; for (const s of signs.values()) if (s.show !== 'none' && !s.dropped) n++; return n; },
    has: (slot: number) => { const s = signs.get(slot); return !!s && !s.dropped; },
    /** Holds `text` up over guy `slot`, or changes what they hold up (a new number pops, a new colour flips the card). */
    set(slot: number, text: string, tone: SignTone, t: number) {
      const s = signs.get(slot);
      if (s && !s.dropped) {
        if (s.text === text && s.tone === tone) return;
        s.was = { text: s.text, tone: s.tone };
        if (s.tone !== tone) s.flipAt = t; else s.popAt = t;
        s.old = s.entry; s.oldKey = s.key; s.entry = null; s.key = '';
        s.text = text; s.tone = tone; s.order = ++order;
        return;
      }
      signs.set(slot, { slot, text, tone, order: ++order, show: 'none', dot: false, alpha: s?.alpha ?? 0, popAt: t, flipAt: -10, was: null, dropped: false, dx: 0, f: SIGN_SIZES[0], entry: null, key: '', old: null, oldKey: '' });
    },
    /** Turns the card guy `slot` holds up to another colour (it flips), keeping its number; nothing if they hold none. */
    retone(slot: number, tone: SignTone, t: number) {
      const s = signs.get(slot);
      if (!s || s.dropped || s.tone === tone) return;
      s.was = { text: s.text, tone: s.tone };
      s.old = s.entry; s.oldKey = s.key; s.entry = null; s.key = '';
      s.tone = tone; s.flipAt = t; s.order = ++order;
    },
    /** Puts guy `slot`'s sign down. */
    drop(slot: number) { const s = signs.get(slot); if (s) s.dropped = true; },
    /** Puts every sign down. */
    clear() { for (const s of signs.values()) s.dropped = true; },
    /** Forgets a guy's sign at once (they left). */
    forget(slot: number) { signs.delete(slot); },
    /**
     * Which signs show, from where each guy is now (`where`: the top of their head and their height, CSS px, or
     * null when they can't hold one up): the gold ones first, then the game's colour, then the newest.
     */
    place(where: (slot: number) => { x: number; y: number; h: number } | null, view: { w: number; h: number }, keepOut: Rect[], ratio: number, t: number) {
      if (ratio !== dpr) { dpr = ratio; fonts(); }
      const rank = (s: Sign) => (s.tone === 'gold' ? 0 : s.tone === 'accent' ? 1 : 2);
      const live = [...signs.values()].filter(s => !s.dropped).sort((a, b) => rank(a) - rank(b) || b.order - a.order);
      const asks: SignAsk[] = [], whom: Sign[] = [];
      for (const s of live) {
        const at = where(s.slot);
        if (!at) { s.show = 'none'; continue; }
        s.f = at.h < SIGN_MIN_H ? dotSize(at.h) : signSize(at.h);
        const e = atlas.get(at.h < SIGN_MIN_H ? null : s.text, s.tone, s.f, dpr);
        asks.push({ x: at.x, y: at.y, h: at.h, w: e.w / dpr, sh: e.h / dpr });
        whom.push(s);
      }
      const spots = placeSigns(asks, view, keepOut);
      spots.forEach((spot, i) => {
        const s = whom[i];
        // Newly up, it pops.
        if (spot.show !== 'none' && s.show === 'none' && s.alpha < 0.3) s.popAt = t;
        s.show = spot.show; s.dx = spot.dx;
        if (spot.show !== 'none') s.dot = spot.show === 'dot';
      });
    },
    /** Moves each sign on a frame (fading, popping, flipping) and writes them out; false when none shows. */
    frame(t: number, dt: number, view: { w: number; h: number }): boolean {
      for (const s of [...signs.values()]) {
        const want = !s.dropped && s.show !== 'none' ? 1 : 0;
        s.alpha += Math.sign(want - s.alpha) * Math.min(Math.abs(want - s.alpha), dt / (want ? 0.12 : 0.2));
        if (s.dropped && s.alpha <= 0) signs.delete(s.slot);
      }
      let n = 0;
      // Written out twice at most: once more if the pictures were drawn again from empty partway through.
      for (let pass = 0; pass < 2; pass++) {
        if (atlas.generation !== gen) { gen = atlas.generation; for (const s of signs.values()) { s.entry = s.old = null; s.key = s.oldKey = ''; } }
        n = 0;
        for (const s of signs.values()) {
          if (s.alpha <= 0 || n >= MOST_SIGNS) continue;
          // Flipping: the old card turns away, the new one turns in.
          const fk = (t - s.flipAt) / 0.36, flipping = fk >= 0 && fk < 1;
          const was = flipping && fk < 0.5 ? s.was : null;
          const key = `${s.dot ? '' : (was ?? s).text}|${(was ?? s).tone}|${s.f}`;
          let e: Entry;
          if (was) {
            if (s.oldKey !== key || !s.old) { s.old = atlas.get(s.dot ? null : was.text, was.tone, s.f, dpr); s.oldKey = key; }
            e = s.old;
          } else {
            if (s.key !== key || !s.entry) { s.entry = atlas.get(s.dot ? null : s.text, s.tone, s.f, dpr); s.key = key; }
            e = s.entry;
          }
          const sx = flipping ? Math.max(0.04, Math.abs(Math.cos(Math.PI * fk))) : 1;
          const sy = pop((t - s.popAt) / 0.5) * (flipping ? 1 + 0.12 * Math.sin(Math.PI * fk) : 1);
          aGuy.array[n] = s.slot;
          aBox.array.set([e.x, e.y, e.w, e.h], n * 4);
          aShow.array.set([s.alpha, sx, sy, s.dx * dpr], n * 4);
          n++;
        }
        if (atlas.generation === gen) break;
      }
      geometry.instanceCount = n;
      aGuy.needsUpdate = aBox.needsUpdate = aShow.needsUpdate = true;
      atlas.flush();
      const [aw, ah] = atlas.size();
      material.uniforms.uAtlas.value.set(aw, ah);
      material.uniforms.uView.value.set(view.w, view.h);
      return n > 0;
    },
    draw(renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
      if (!geometry.instanceCount) return;
      renderer.render(scene, camera);
    },
    dispose() { document.fonts?.removeEventListener?.('loadingdone', fonts); geometry.dispose(); material.dispose(); atlas.dispose(); },
  };
}

// ------------------------------------------------------------ the bursts

/** A burst's kind: an exact guess's sparks and confetti, or a close one's sparkle. */
export const BURST = { exact: 0, sparkle: 1 } as const;
const BURSTS = 24, PER = 44;

/** Sparks, confetti and sparkles over guys' heads as they react, following them as they jump. One draw for all. */
export function makeBursts(uniforms: GuyUniforms) {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  const n = BURSTS * PER, seed = new Float32Array(n * 4), index = new Float32Array(n * 2), colour = new Float32Array(n * 3);
  // Seeded from the particle's number, so a burst looks the same each time it is drawn.
  const rand = (i: number, k: number) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  for (let i = 0; i < n; i++) {
    seed.set([rand(i, 1), rand(i, 2), rand(i, 3), rand(i, 4)], i * 4);
    index.set([Math.floor(i / PER), i % PER], i * 2);
    const c = new THREE.Color(CLUB[Math.floor(rand(i, 5) * CLUB.length)]);
    colour.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
  geometry.setAttribute('aIndex', new THREE.InstancedBufferAttribute(index, 2));
  geometry.setAttribute('aColour', new THREE.InstancedBufferAttribute(colour, 3));
  geometry.instanceCount = n;
  const bursts = Array.from({ length: BURSTS }, () => new THREE.Vector4(-1, -100, 0, 0));
  const material = new THREE.ShaderMaterial({
    uniforms: { ...uniforms, uBursts: { value: bursts }, uView: { value: new THREE.Vector2(1, 1) }, uRatio: { value: 1 } },
    vertexShader: /* glsl */ `
      ${POSE_GLSL}
      uniform vec4 uBursts[${BURSTS}];
      uniform vec2 uView;
      uniform float uRatio;
      attribute vec4 aSeed;
      attribute vec2 aIndex;
      attribute vec3 aColour;
      varying vec2 vQ;
      varying vec3 vColour;
      varying float vA;
      varying float vShape;
      void hide() { gl_Position = vec4(0.0, 0.0, -2.0, 1.0); vA = 0.0; }
      void main() {
        vec4 b = uBursts[int(aIndex.x + 0.5)];
        float t = uTime - b.y, p = aIndex.y;
        bool exact = b.z < 0.5;
        if (b.x < -0.5 || t < 0.0 || t > (exact ? 2.1 : 1.0)) { hide(); return; }
        GuyPose gp = guyPose(b.x);
        if (gp.mode < 0.5) { hide(); return; }
        vec3 head = gp.pos + vec3(0.0, gp.lift + 1.0 * gp.sy, 0.0);
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        vec3 at; float size; float a; vec2 turn = vec2(1.0, 0.0);
        vColour = aColour;
        if (exact && p < 16.0) {
          // Sparks out from their head, slowing, gold to ivory.
          float ang = (p / 16.0 + aSeed.x * 0.05) * 6.28318, speed = 1.0 + aSeed.y * 0.9;
          float d = speed * (1.0 - exp(-t * 6.0)) / 2.2;
          at = head + (right * cos(ang) + up * sin(ang) * 0.85) * d + up * 0.15;
          size = 0.075 * (1.0 - smoothstep(0.15, 0.8, t));
          a = 1.0 - smoothstep(0.45, 0.8, t);
          vColour = mix(vec3(1.0, 0.82, 0.32), vec3(1.0, 0.97, 0.88), aSeed.z);
          vShape = 0.0;
        } else if (exact) {
          // Confetti thrown up over them, fluttering down round them.
          vec3 v = right * (aSeed.x - 0.5) * 3.0 + up * (2.2 + aSeed.y * 1.6);
          float drag = (1.0 - exp(-t * 2.6)) / 2.6;
          at = head + v * drag - up * (0.9 * t * t * 0.5) + right * sin(t * (5.0 + aSeed.w * 4.0) + aSeed.x * 9.0) * 0.12;
          float spin = t * (7.0 + aSeed.z * 8.0) + aSeed.y * 6.0;
          turn = vec2(cos(spin), sin(spin * 0.7));
          size = 0.07;
          a = 1.0 - smoothstep(1.6, 2.1, t);
          vShape = 1.0;
        } else {
          // A close guess's sparkle: a few stars winking on and off round their head.
          if (p > 6.0) { hide(); return; }
          float k = (t - p * 0.07) / 0.5;
          if (k < 0.0 || k > 1.0) { hide(); return; }
          at = head + right * (aSeed.x - 0.5) * 1.3 + up * (0.05 + aSeed.y * 0.75);
          size = 0.12 * sin(k * 3.14159) * (0.7 + 0.5 * aSeed.z);
          a = 1.0;
          vColour = mix(vec3(1.0, 0.93, 0.7), vec3(1.0, 1.0, 1.0), aSeed.w);
          vShape = 2.0;
        }
        vec4 clip = projectionMatrix * viewMatrix * vec4(at, 1.0);
        if (clip.w <= 0.0) { hide(); return; }
        // Sized with the guy, never under a couple of pixels or blown up past a few.
        float unit = projectionMatrix[1][1] / clip.w * 0.5 * uView.y;
        float px = clamp(size * unit, (vShape > 1.5 ? 3.0 : 1.5) * uRatio, (vShape > 1.5 ? 12.0 : 7.0) * uRatio);
        vec2 q = position.xy;
        vec2 shape = vShape > 0.5 && vShape < 1.5 ? vec2(0.6, 1.0) * vec2(1.0, max(0.25, abs(turn.x))) : vec2(1.0);
        vec2 r = vec2(q.x * shape.x * turn.x - q.y * shape.y * turn.y, q.x * shape.x * turn.y + q.y * shape.y * turn.x);
        clip.xy += r * px / uView * 2.0 * clip.w;
        gl_Position = clip;
        gl_Position.z = 0.0;
        vQ = q;
        vA = a;
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vQ;
      varying vec3 vColour;
      varying float vA;
      varying float vShape;
      void main() {
        float a;
        if (vShape < 0.5) {
          // A spark: a bright point with a little warm halo.
          float d = length(vQ);
          a = exp(-d * d * 7.0) + 0.25 * exp(-d * d * 2.0);
          a *= 1.0 - smoothstep(0.85, 1.0, d);
        } else if (vShape < 1.5) {
          a = 1.0;
        } else {
          // A four-pointed star.
          vec2 q = abs(vQ);
          a = clamp(1.0 - (q.x * q.y) * 30.0 - length(vQ) * 0.55, 0.0, 1.0);
        }
        a *= vA;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vColour, a);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(mesh);
  let next = 0, until = -1;
  return {
    /** A burst over guy `slot` from time `at` (s). */
    burst(slot: number, kind: number, at: number) {
      bursts[next].set(slot, at, kind, 0);
      next = (next + 1) % BURSTS;
      until = Math.max(until, at + 2.2);
    },
    /** Takes bursts off a guy who left. */
    forget(slot: number) { for (const b of bursts) if (b.x === slot) b.set(-1, -100, 0, 0); },
    active: (t: number) => t < until,
    draw(renderer: THREE.WebGLRenderer, camera: THREE.Camera, view: { w: number; h: number }, ratio: number, t: number) {
      if (t >= until) return;
      material.uniforms.uView.value.set(view.w, view.h);
      material.uniforms.uRatio.value = ratio;
      renderer.render(scene, camera);
    },
    dispose() { geometry.dispose(); material.dispose(); },
  };
}

// ------------------------------------------------------------ the winner's light and confetti

/**
 * Behind the spotlit winner: soft rays turning slowly round them; round them, confetti falling from above
 * and stars winking on their outline. All in their own pass, drawn with them.
 */
export function makeWinnerGlow(group: THREE.Object3D) {
  const raysMaterial = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uAlpha: { value: 0 }, uColour: { value: new THREE.Color('#fff1d6') } },
    vertexShader: 'varying vec2 vQ; void main() { vQ = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */ `
      uniform float uT, uAlpha;
      uniform vec3 uColour;
      varying vec2 vQ;
      void main() {
        float r = length(vQ), ang = atan(vQ.y, vQ.x);
        // Fourteen soft rays, turning slowly, brightest near them and gone well before the edge.
        float rays = pow(0.5 + 0.5 * cos(ang * 14.0 + uT * 0.35), 3.0);
        float fall = exp(-r * r * 2.4) * (1.0 - smoothstep(0.6, 1.0, r));
        float a = uAlpha * (0.62 * rays * fall + 0.4 * exp(-r * r * 7.0));
        gl_FragColor = vec4(uColour * a, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const rays = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), raysMaterial);
  rays.renderOrder = -1;
  rays.frustumCulled = false;
  group.add(rays);

  // Falling confetti and winking stars, round a box about them: each piece loops down through it.
  const N = 90;
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]), 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  const seed = new Float32Array(N * 4), colour = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = (k: number) => { const x = Math.sin(i * 91.17 + k * 47.3) * 43758.5453; return x - Math.floor(x); };
    seed.set([r(1), r(2), r(3), r(4)], i * 4);
    const c = new THREE.Color(CLUB[i % CLUB.length]);
    colour.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
  geometry.setAttribute('aColour', new THREE.InstancedBufferAttribute(colour, 3));
  geometry.instanceCount = N;
  const rainMaterial = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uAlpha: { value: 0 }, uSize: { value: 1 }, uAt: { value: new THREE.Vector3() } },
    vertexShader: /* glsl */ `
      attribute vec4 aSeed; attribute vec3 aColour;
      uniform float uT, uAlpha, uSize; uniform vec3 uAt;
      varying vec3 vColour; varying float vA; varying vec2 vQ; varying float vStar;
      void main() {
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        vec3 fwd = cross(right, up);
        vStar = aSeed.w < 0.22 ? 1.0 : 0.0;
        vec3 p; vec3 local;
        if (vStar > 0.5) {
          // A star winking on somewhere on them, then gone, then somewhere else.
          float cycle = 1.1 + aSeed.z, k = mod(uT + aSeed.x * cycle, cycle) / 0.55;
          float s = k < 1.0 ? sin(k * 3.14159) : 0.0;
          float n = floor((uT + aSeed.x * cycle) / cycle);
          float rx = fract(sin(n * 12.9898 + aSeed.y * 78.233) * 43758.5453), ry = fract(sin(n * 39.346 + aSeed.z * 11.135) * 24634.6345);
          p = uAt + (right * (rx - 0.5) * 0.95 + up * (0.1 + ry * 0.95)) * uSize + fwd * 0.2 * uSize;
          local = (right * position.x + up * position.y) * 0.13 * uSize * s;
          vQ = position.xy * 2.0;
        } else {
          // Paper falling past them, fluttering, a little in front and behind.
          float fall = 1.9 * uSize, speed = (0.22 + aSeed.y * 0.18) * uSize;
          float y = 1.5 * uSize - mod(uT * speed + aSeed.x * fall, fall);
          float x = (aSeed.z - 0.5) * 2.4 * uSize + sin(uT * (1.6 + aSeed.w * 2.0) + aSeed.x * 9.0) * 0.08 * uSize;
          p = uAt + right * x + up * y + fwd * (aSeed.w - 0.5) * 0.8 * uSize;
          float spin = uT * (4.0 + aSeed.z * 5.0) + aSeed.y * 6.0;
          local = (right * position.x * 0.06 + up * position.y * 0.038 * cos(spin)) * uSize;
          vQ = position.xy;
          // Faded in at the top of the fall and out near the floor.
          vA = smoothstep(1.5, 1.2, y / uSize) * smoothstep(-0.35, 0.0, y / uSize);
        }
        vColour = aColour;
        if (vStar > 0.5) { vColour = vec3(1.0, 0.95, 0.78); vA = 1.0; }
        vA *= uAlpha;
        gl_Position = projectionMatrix * viewMatrix * vec4(p + local, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColour; varying float vA; varying vec2 vQ; varying float vStar;
      void main() {
        float a = vA;
        if (vStar > 0.5) { vec2 q = abs(vQ); a *= clamp(1.0 - q.x * q.y * 30.0 - length(vQ) * 0.55, 0.0, 1.0); }
        if (a < 0.01) discard;
        gl_FragColor = vec4(vColour, a);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  });
  const rain = new THREE.Mesh(geometry, rainMaterial);
  rain.frustumCulled = false;
  rain.renderOrder = 2;
  group.add(rain);
  return {
    /** Where they stand (feet), how tall they are (world units), how much shows, and the time (s), each frame. */
    frame(feet: THREE.Vector3, size: number, alpha: number, t: number, cam: THREE.Camera) {
      rays.visible = rain.visible = alpha > 0.005;
      if (!rays.visible) return;
      // The rays sit just behind them, square to the camera, centred on their chest.
      rays.position.copy(feet).y += size * 0.55;
      const back = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
      rays.position.addScaledVector(back, size * 0.4);
      rays.quaternion.copy(cam.quaternion);
      rays.scale.setScalar(size * 1.7 * (0.55 + 0.45 * Math.min(1, alpha * 1.2)));
      raysMaterial.uniforms.uT.value = t;
      raysMaterial.uniforms.uAlpha.value = alpha;
      rainMaterial.uniforms.uT.value = t;
      rainMaterial.uniforms.uAlpha.value = alpha;
      rainMaterial.uniforms.uSize.value = size;
      rainMaterial.uniforms.uAt.value.copy(feet);
    },
    hide() { rays.visible = rain.visible = false; },
    dispose() { group.remove(rays, rain); rays.geometry.dispose(); raysMaterial.dispose(); geometry.dispose(); rainMaterial.dispose(); },
  };
}
