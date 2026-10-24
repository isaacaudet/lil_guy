import type { Palette, ColorToken } from './types';

/**
 * Colourways. Each one is three hand-picked colours — the body, an accent for
 * hats and clothes, and a trim — and everything else is worked out from the
 * body so it always belongs to it:
 *
 * - the outline is a deep, hue-shifted version of the body rather than black,
 *   which is what keeps a pale guy soft instead of cartoon-heavy
 * - the shade leans towards violet and the gleam towards white, the way
 *   pixel artists shade by hand
 * - the eyes and mouth are a near-black taken from the outline's hue
 * - the blush is a pink that always stands off the body, even a pink one
 *
 * Every body colour is light and clean on purpose. There are no greys,
 * olives or murky browns here: those are what made the old set look ill.
 */
interface Colourway {
  name: string;
  body: string;
  accent: string;
  trim: string;
}

const COLOURWAYS: Colourway[] = [
  { name: 'Tomato',   body: '#E8483D', accent: '#2E3A59', trim: '#F2C230' },
  { name: 'Tangerine',body: '#F28A2E', accent: '#2D4F9E', trim: '#FFF1D6' },
  { name: 'Gold',     body: '#F2C230', accent: '#C2302B', trim: '#2E3A59' },
  { name: 'Lime',     body: '#9ACD32', accent: '#6B2FA3', trim: '#FFFFFF' },
  { name: 'Emerald',  body: '#2EB872', accent: '#F2C230', trim: '#1E2A3A' },
  { name: 'Teal',     body: '#1FAFA6', accent: '#F25C54', trim: '#FFFFFF' },
  { name: 'Cyan',     body: '#3DB8F5', accent: '#F28A2E', trim: '#1E2A3A' },
  { name: 'Cobalt',   body: '#3D6FE0', accent: '#F2C230', trim: '#FFFFFF' },
  { name: 'Violet',   body: '#8A54E8', accent: '#3DE0B0', trim: '#FFE066' },
  { name: 'Grape',    body: '#B04FC9', accent: '#F2C230', trim: '#FFFFFF' },
  { name: 'Hot Pink', body: '#EF4F9A', accent: '#2E3A59', trim: '#FFE066' },
  { name: 'Coral',    body: '#FF7A66', accent: '#1FAFA6', trim: '#FFFFFF' },
  { name: 'Mint',     body: '#5FE0B0', accent: '#E8483D', trim: '#1E2A3A' },
  { name: 'Sky',      body: '#6FC2FF', accent: '#E8483D', trim: '#FFFFFF' },
  { name: 'Plum',     body: '#7A3F9E', accent: '#F28A2E', trim: '#FFE066' },
  { name: 'Rust',     body: '#C2602B', accent: '#3DB8F5', trim: '#FFF1D6' },
  { name: 'Slate',    body: '#5E7290', accent: '#F2C230', trim: '#FFFFFF' },
  { name: 'Charcoal', body: '#4A4E5E', accent: '#E8483D', trim: '#F2C230' },
  { name: 'Bone',     body: '#E8DEC8', accent: '#2D4F9E', trim: '#E8483D' },
  { name: 'Sand',     body: '#D8B07A', accent: '#2EB872', trim: '#FFFFFF' },
  { name: 'Cherry',   body: '#D93250', accent: '#F2C230', trim: '#FFFFFF' },
  { name: 'Olive',    body: '#8C9A3A', accent: '#E8483D', trim: '#FFF1D6' },
  { name: 'Ice',      body: '#BDEAF5', accent: '#3D6FE0', trim: '#E8483D' },
  { name: 'Lava',     body: '#FF5A1F', accent: '#2E3A59', trim: '#FFE066' },
];

// ---------------------------------------------------------------- colour math

type HSL = [number, number, number];

function hexToRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b]
    .map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

function toHsl(hex: string): HSL {
  const [r, g, b] = hexToRgb(hex).map(v => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function fromHsl([h, s, l]: HSL): string {
  h = ((h % 360) + 360) % 360;
  s = Math.min(1, Math.max(0, s));
  l = Math.min(1, Math.max(0, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

function mix(a: string, b: string, amount: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * amount, ag + (bg - ag) * amount, ab + (bb - ab) * amount);
}

/** Moves a hue `amount` degrees towards `target` along the short way round. */
function towards(hue: number, target: number, amount: number): number {
  const diff = ((target - hue + 540) % 360) - 180;
  return hue + Math.sign(diff) * Math.min(Math.abs(diff), amount);
}

function luminance(hex: string): number {
  const channel = (v: number) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Shade a colour by hand: darker and leaning towards violet, but never richer.
 * Adding saturation in the shadow is what turned a green body's shade neon.
 */
function shadeOf(hex: string, depth = 0.12): string {
  const [h, s, l] = toHsl(hex);
  return fromHsl([towards(h, 265, 12), s * 0.85, l - depth]);
}

// ---------------------------------------------------------------- palettes

/** Builds the full set of token colours from a body, an accent and a trim. */
function derive(name: string, body: string, accent: string, trim: string): Palette {
  const [h] = toHsl(body);
  const outlineHue = towards(h, 285, 25);
  const outline = fromHsl([outlineHue, 0.35, 0.1]);
  // Dark eyes on most bodies; on a body too dark for them, the eyes and mouth
  // glow a light cream instead, which reads as a look rather than a mistake.
  const dark = fromHsl([outlineHue, 0.38, 0.08]);
  const ink = contrast(dark, body) >= 4.2 || contrast(dark, body) > contrast('#FFF1D6', body) ? dark : '#FFF1D6';

  // A rosy pink, deepened until it reads on this body.
  let blush = '#FF8FA8';
  for (let i = 0; i < 8 && contrast(blush, body) < 1.3; i++) blush = shadeOf(blush, 0.06);

  let tongue = '#FF6B88';
  for (let i = 0; i < 8 && contrast(tongue, body) < 1.4; i++) tongue = shadeOf(tongue, 0.06);

  return {
    name,
    colors: {
      1: body,
      2: shadeOf(body),
      3: mix(body, '#FFFFFF', 0.55),
      4: outline,
      5: ink,
      6: '#FFFFFF',
      7: blush,
      8: ink,
      9: tongue,
      10: accent,
      11: shadeOf(accent),
      12: trim,
      13: mix(body, '#FFFBF0', 0.6),
      14: '#7DD87A',
      15: '#4FAE5C',
      16: '#FFD45C',
      17: '#F0A93A',
      18: '#FF6B78',
      19: shadeOf(body, 0.24),
    },
  };
}

export const palettes: Palette[] = COLOURWAYS.map(w => derive(w.name, w.body, w.accent, w.trim));

export function getPalette(index: number): Palette {
  return palettes[index % palettes.length];
}

export function resolveColor(palette: Palette, token: ColorToken): string | null {
  if (token === 0) return null;
  return palette.colors[token] ?? null;
}

/** Tones a colourway can be worn in: pastel, as picked, vivid. */
export const SHADE_COUNT = 3;

/**
 * Re-derives a palette in another tone. The pastel tone lifts the body and
 * accent towards white; the vivid tone deepens them. It deliberately barely
 * adds saturation — saturating an already-bright lime turns it acid. Either way
 * the outline, shading and blush are worked out again from the result, so a
 * toned palette is as coherent as the original.
 */
export function shadePalette(palette: Palette, shade: number): Palette {
  if (shade === 1) return palette;
  const tone = (hex: string) => {
    if (shade === 0) return mix(hex, '#FFFFFF', 0.3);
    const [h, s, l] = toHsl(hex);
    return fromHsl([h, Math.min(0.8, s + 0.04), l > 0.4 ? l - 0.08 : l]);
  };
  const c = palette.colors;
  return derive(palette.name, tone(c[1]), tone(c[10]), c[12]);
}
