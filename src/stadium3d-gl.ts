/**
 * The GPU side of the 3D stadium's guys (./stadium3d): where each one is and how they move lives in
 * small float textures, one texel a guy, so ten thousand of them draw in a handful of calls and a hop is
 * one texel changed. Near guys are their own toy meshes merged into big buffers that read their pose
 * from those textures; far guys are pictures of those same meshes, turned to face the camera.
 */
import * as THREE from 'three';
import type { Surface } from './voxel';

/** Guys a texture row holds. */
export const ROW = 256;

/** How a guy is drawn: not at all, as a stand-in in their colours, as their picture, or as their whole toy. */
export const MODE = { hidden: 0, standIn: 1, picture: 2, toy: 3 } as const;

/** The uniforms every guy-drawing shader shares. */
export interface GuyUniforms {
  uSeat: { value: THREE.Texture };
  uState: { value: THREE.Texture };
  uFrom: { value: THREE.Texture };
  uLook: { value: THREE.Texture };
  uTime: { value: number };
  uSlideAt: { value: number };
  /** The wave: x how strong (0 to 1), y when it started, z the stand's half reach, w an arc's radius (0 for a line). */
  uWave: { value: THREE.Vector4 };
  /** The arc's middle (z), for the wave's angle. */
  uArcZ: { value: number };
  uDim: { value: number };
  uSpot: { value: THREE.Vector4 };
}

/** Pose: a guy's place, yaw, lift and stretch from the textures, for a vertex shader. */
export const POSE_GLSL = /* glsl */ `
uniform sampler2D uSeat;
uniform sampler2D uState;
uniform sampler2D uFrom;
uniform sampler2D uLook;
uniform float uTime;
uniform float uSlideAt;
uniform vec4 uWave;
uniform float uArcZ;
vec4 guyTexel(sampler2D t, float i) { int n = int(i + 0.5); return texelFetch(t, ivec2(n % ${ROW}, n / ${ROW}), 0); }
struct GuyPose { vec3 pos; float yaw; float lift; float sx; float sy; float mode; float shade; float phase; vec3 tint; float glint; float glow; };
vec3 unpackRgb(float v) { float n = floor(v + 0.5); return vec3(floor(n / 65536.0), mod(floor(n / 256.0), 256.0), mod(n, 256.0)) / 255.0; }
GuyPose guyPose(float i) {
  GuyPose g;
  vec4 seat = guyTexel(uSeat, i), st = guyTexel(uState, i), from = guyTexel(uFrom, i), look = guyTexel(uLook, i);
  float slide = clamp((uTime - uSlideAt) / 0.45, 0.0, 1.0);
  slide = slide * slide * (3.0 - 2.0 * slide);
  g.pos = from.w > 0.5 ? mix(from.xyz, seat.xyz, slide) : seat.xyz;
  g.yaw = seat.w;
  g.mode = st.z;
  g.shade = st.w;
  g.tint = unpackRgb(look.x);
  g.glint = look.y;
  g.phase = look.z;
  g.lift = 0.0; g.sx = 1.0; g.sy = 1.0; g.glow = 0.0;
  float t = uTime - st.x;
  if (st.y > 0.5 && st.y < 1.5 && t >= 0.0 && t < 0.42) {
    // A hop: up and down in a parabola, stretched going up, squashed as they land.
    float u = t / 0.42;
    g.lift = 0.5 * 4.0 * u * (1.0 - u);
    g.sy = u < 0.75 ? 1.0 + 0.1 * sin(u / 0.75 * 3.14159) : 1.0 - 0.16 * sin((u - 0.75) / 0.25 * 3.14159);
    g.sx = 2.0 - g.sy;
  } else if (st.y > 1.5 && st.y < 2.5 && t >= 0.0 && t < 0.6) {
    // Arriving: dropped in from above, landing with a squash.
    float u = t / 0.6;
    float fall = clamp(u / 0.6, 0.0, 1.0);
    g.lift = 1.6 * (1.0 - fall * fall);
    float land = clamp((u - 0.6) / 0.4, 0.0, 1.0);
    g.sy = u < 0.6 ? 1.06 : 1.0 - 0.18 * sin(land * 3.14159) * (1.0 - land);
    g.sx = 2.0 - g.sy;
  } else if (st.y > 2.5 && t >= 0.0 && t < 0.62) {
    // A big jump, for a winner's neighbours.
    float u = t / 0.62;
    g.lift = 0.9 * 4.0 * u * (1.0 - u);
    g.sy = 1.0 + 0.14 * sin(u * 3.14159);
    g.sx = 2.0 - g.sy;
  }
  if (uWave.x > 0.0) {
    // The wave: a band sweeping across the stand; everyone in it stands up tall into a warm light.
    float along = uWave.w > 0.0 ? atan(g.pos.x, uArcZ - g.pos.z) * uWave.w : g.pos.x;
    float u = along / max(1.0, uWave.z);
    float band = mod((uTime - uWave.y) / 5.6, 1.0) * 2.8 - 1.4;
    float w = exp(-pow((u - band) / 0.2, 2.0)) * uWave.x;
    // Up on their feet and lit: a band of colour you can see from the back of the bowl, not only a ripple of heads.
    g.lift += 0.7 * w;
    g.sy *= 1.0 + 0.3 * w;
    g.sx *= 1.0 - 0.08 * w;
    g.shade *= 1.0 - w;
    g.glow = w;
  }
  return g;
}
mat3 yawMatrix(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
`;

/** Turns vertex colours stored as sRGB bytes into the linear colours three.js lights. */
const SRGB_GLSL = /* glsl */ `vec3 srgbDecode(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c)); }`;

/** The wave's light on a guy: brighter and warmer, in linear colour. */
const GLOW_GLSL = /* glsl */ `vec3 waveLit(vec3 c, float w) { return mix(c, c * vec3(1.55, 1.38, 1.12) + vec3(0.05, 0.035, 0.0), w); }`;

/** Patches a material so each vertex takes its guy's pose: `normals` when the shader turns normals and colours too. */
export function patchToy(shader: THREE.WebGLProgramParametersWithUniforms, uniforms: GuyUniforms, normals: boolean) {
  Object.assign(shader.uniforms, uniforms);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\nattribute float aGuy;\n${POSE_GLSL}\n${SRGB_GLSL}\n${GLOW_GLSL}`)
    .replace('void main() {', 'void main() {\n  GuyPose gp = guyPose(aGuy);')
    .replace('#include <begin_vertex>', `vec3 transformed = yawMatrix(gp.yaw) * (position * vec3(gp.sx, gp.sy, gp.sx)) + gp.pos + vec3(0.0, gp.lift, 0.0);
      if (abs(gp.mode - ${MODE.toy}.0) > 0.5) transformed = vec3(0.0, -1e5, 0.0);`);
  if (normals) shader.vertexShader = shader.vertexShader
    .replace('#include <beginnormal_vertex>', `vec3 objectNormal = yawMatrix(gp.yaw) * normal;\n#ifdef USE_TANGENT\nvec3 objectTangent = vec3( tangent.xyz );\n#endif`)
    // A thin shadow where they sit, not a dark lower half.
    .replace('#include <color_vertex>', `#include <color_vertex>\n#ifdef USE_COLOR\nvColor = waveLit(srgbDecode(color) * (1.0 - gp.shade * 0.4) * mix(0.8, 1.0, smoothstep(0.0, 0.16, position.y)), gp.glow);\n#endif`);
}

/** Materials for each surface a toy wears, made once each. */
export class SurfaceMaterials {
  private made = new Map<string, THREE.MeshStandardMaterial>();
  constructor(private patch?: (m: THREE.MeshStandardMaterial, s: Surface) => void) {}
  get(s: Surface): THREE.MeshStandardMaterial {
    const key = `${s.kind}|${s.roughness}|${s.clearcoat}`;
    let m = this.made.get(key);
    if (m) return m;
    const plain = !s.clearcoat && !s.iridescence && !s.sheen || s.kind === 'body' || s.kind === 'plain';
    m = plain
      ? new THREE.MeshStandardMaterial({ roughness: s.roughness, metalness: s.metalness, vertexColors: true })
      : new THREE.MeshPhysicalMaterial({ roughness: s.roughness, metalness: s.metalness, clearcoat: s.clearcoat, clearcoatRoughness: s.clearcoatRoughness, iridescence: s.iridescence, iridescenceIOR: 1.7, iridescenceThicknessRange: [180, 820], sheen: s.sheen, sheenRoughness: 0.3, sheenColor: new THREE.Color('#ffc59a'), vertexColors: true });
    this.patch?.(m, s);
    this.made.set(key, m);
    return m;
  }
  dispose() { for (const m of this.made.values()) m.dispose(); this.made.clear(); }
}

/** Adds a finish's own light (Nebula, Negative, an aura's) to a material's shader. */
export function glowChunk(shader: THREE.WebGLProgramParametersWithUniforms, glow: number) {
  if (!glow) return;
  shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * ${glow.toFixed(2)};`);
}

/** A unit quad, feet at the bottom middle: x from -0.5 to 0.5, y from 0 to 1. */
export function quadGeometry(): THREE.InstancedBufferGeometry {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0]), 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}

/**
 * The picture shader: a quad per guy, facing the camera, showing their tile of an atlas page (or the
 * stand-in, tinted their colour), lit for the venue, hazed with distance.
 */
export function pictureMaterial(uniforms: GuyUniforms, atlas: THREE.Texture, opts: { tile: number; size: number; standIn: boolean; frame: number; foot: number }): THREE.ShaderMaterial {
  const m = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uAtlas: { value: null }, uTile: { value: opts.tile }, uSize: { value: opts.size }, uFrame: { value: opts.frame }, uFoot: { value: opts.foot },
      uLight: { value: new THREE.Color(1, 1, 1) }, uHaze: { value: 0.5 },
    }]),
    vertexShader: /* glsl */ `
      ${POSE_GLSL}
      attribute float aGuy;
      uniform float uTile, uSize, uFrame, uFoot;
      varying vec2 vUv;
      varying vec4 vCell;
      varying float vShade;
      varying float vUp;
      varying vec3 vTint;
      varying float vGlow;
      #include <fog_pars_vertex>
      void main() {
        float guy = ${opts.standIn ? 'float(gl_InstanceID)' : 'aGuy'};
        GuyPose gp = guyPose(guy);
        if (guy < -0.5 || abs(gp.mode - ${opts.standIn ? MODE.standIn : MODE.picture}.0) > 0.5) { gl_Position = vec4(0.0, 0.0, -2.0, 1.0); return; }
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        vec3 base = gp.pos + vec3(0.0, gp.lift, 0.0);
        vec3 world = base + right * (position.x * uFrame * gp.sx) + up * ((position.y * uFrame - uFoot) * gp.sy);
        vec4 mvPosition = viewMatrix * vec4(world, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float n = ${opts.standIn ? '0.0' : 'float(gl_InstanceID)'};
        float cols = floor(uSize / uTile);
        vec2 cell = vec2(mod(n, cols), floor(n / cols));
        vUv = (cell * uTile + vec2(position.x + 0.5, position.y) * uTile) / uSize;
        vCell = vec4(cell * uTile, (cell + 1.0) * uTile) / uSize;
        vShade = gp.shade;
        vUp = position.y * uFrame - uFoot;
        vTint = ${opts.standIn ? 'gp.tint' : 'vec3(1.0)'};
        vGlow = gp.glow;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uAtlas;
      uniform vec3 uLight;
      uniform float uDim, uSize, uHaze;
      varying vec2 vUv;
      varying vec4 vCell;
      varying float vShade;
      varying float vUp;
      varying vec3 vTint;
      varying float vGlow;
      #include <fog_pars_fragment>
      ${GLOW_GLSL}
      void main() {
        // Kept a texel inside the guy's own tile, so a neighbour in the atlas never bleeds in as the picture shrinks;
        // a little sharper than the GPU would pick, since a picture is already made at about its size on screen.
        vec4 c = texture2D(uAtlas, clamp(vUv, vCell.xy + 1.0 / uSize, vCell.zw - 1.0 / uSize), -0.6);
        if (c.a < 0.02) discard;
        // A thin shadow along each row where they sit, and the light overhead catching their tops, so rows read as rows.
        float lit = mix(0.6, 1.0, smoothstep(0.0, 0.14, vUp)) * (1.0 + 0.12 * smoothstep(0.62, 1.0, vUp));
        vec3 rgb = waveLit(c.rgb / c.a * vTint * uLight * lit * (1.0 - vShade * 0.4), vGlow) * (1.0 - 0.62 * uDim);
        gl_FragColor = vec4(rgb, c.a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #ifdef USE_FOG
          // Hazed less than the venue round them, so a far stand keeps its colours.
          gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, smoothstep(fogNear, fogFar, vFogDepth) * uHaze);
        #endif
      }`,
    fog: true,
    alphaToCoverage: true,
  });
  Object.assign(m.uniforms, uniforms);
  m.uniforms.uAtlas.value = atlas;
  return m;
}

/**
 * A shaft of light from `uFrom` to `uTo`: a ribbon turned to face the camera along its length, so it
 * reads as light in the air from any side, even looked at down its length. Soft across, brightest by
 * the lamp and fading long before it lands (`uFade`), additive.
 */
export function shaftMesh(colour: THREE.ColorRepresentation): THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> {
  const g = new THREE.BufferGeometry(), along: number[] = [], across: number[] = [], index: number[] = [];
  const steps = 24;
  for (let i = 0; i <= steps; i++) { along.push(i / steps, i / steps); across.push(-1, 1); if (i < steps) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(along.length * 3), 3));
  g.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1));
  g.setAttribute('aAcross', new THREE.Float32BufferAttribute(across, 1));
  g.setIndex(index);
  const m = new THREE.ShaderMaterial({
    uniforms: { uFrom: { value: new THREE.Vector3() }, uTo: { value: new THREE.Vector3(0, -1, 0) }, uR0: { value: 0.1 }, uR1: { value: 1 }, uAlpha: { value: 0 }, uFade: { value: 4.5 }, uColor: { value: new THREE.Color(colour) } },
    vertexShader: /* glsl */ `
      attribute float aAlong, aAcross;
      uniform vec3 uFrom, uTo;
      uniform float uR0, uR1;
      varying float vAlong, vAcross;
      void main() {
        vec3 p = mix(uFrom, uTo, aAlong), axis = normalize(uTo - uFrom);
        vec3 side = cross(axis, normalize(cameraPosition - p));
        float l = length(side);
        side = l > 1e-4 ? side / l : vec3(1.0, 0.0, 0.0);
        p += side * aAcross * mix(uR0, uR1, aAlong);
        vAlong = aAlong; vAcross = aAcross;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uAlpha, uFade;
      varying float vAlong, vAcross;
      void main() {
        float a = uAlpha * exp(-vAcross * vAcross * 3.2) * (1.0 - vAcross * vAcross) * smoothstep(0.0, 0.03, vAlong) * exp(-vAlong * uFade);
        gl_FragColor = vec4(uColor * a, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  return mesh;
}
