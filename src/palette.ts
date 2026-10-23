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
  { name: 'Peach',        body: '#FFB38A', accent: '#7FC8F8', trim: '#FFF3E0' },
  { name: 'Bubblegum',    body: '#FF9EC7', accent: '#8C7CF0', trim: '#FFFFFF' },
  { name: 'Butter',       body: '#FFE07A', accent: '#FF7F96', trim: '#FFFFFF' },
  { name: 'Mint',         body: '#8FE3B8', accent: '#FF8FB1', trim: '#FFF6C8' },
  { name: 'Sky',          body: '#8CCBFF', accent: '#FFC857', trim: '#FFFFFF' },
  { name: 'Lilac',        body: '#C9A7F5', accent: '#FFD166', trim: '#FFF0F6' },
  { name: 'Coral',        body: '#FF8E7F', accent: '#5CC8C0', trim: '#FFF6E8' },
  { name: 'Lime',         body: '#C6E86E', accent: '#FF8C69', trim: '#FFFFFF' },
  { name: 'Aqua',         body: '#78DCE8', accent: '#FF7AA8', trim: '#FFF8D6' },
  { name: 'Tangerine',    body: '#FFA552', accent: '#6C8CF5', trim: '#FFF1D6' },
  { name: 'Strawberry',   body: '#FF7A93', accent: '#7FD1AE', trim: '#FFF0F3' },
  { name: 'Periwinkle',   body: '#9DAEFF', accent: '#FF9F7A', trim: '#FFFFFF' },
  { name: 'Cream',        body: '#FFF1D0', accent: '#FF8FAB', trim: '#9AD9F5' },
  { name: 'Cocoa',        body: '#C69276', accent: '#FF9FB5', trim: '#FFF1DC' },
  { name: 'Caramel',      body: '#E8B074', accent: '#7EC4CF', trim: '#FFF6E6' },
  { name: 'Grape',        body: '#A68BF0', accent: '#7FE0C8', trim: '#FFF4C2' },
  { name: 'Teal',         body: '#5ED3C3', accent: '#FFB86B', trim: '#FFFFFF' },
  { name: 'Snow',         body: '#F2F5FA', accent: '#7BB8FF', trim: '#FFB5C8' },
  { name: 'Sage',         body: '#A9D6A0', accent: '#F7A072', trim: '#FFF8E7' },
  { name: 'Rose',         body: '#F6A6C1', accent: '#6FC2B8', trim: '#FFFFFF' },
  { name: 'Honey',        body: '#FFC94D', accent: '#E86A8E', trim: '#FFF4D6' },
  { name: 'Seafoam',      body: '#A8F0D8', accent: '#9A8CF5', trim: '#FFFFFF' },
  { name: 'Blush',        body: '#FFC4C4', accent: '#7AA9F0', trim: '#FFFFFF' },
  { name: 'Ocean',        body: '#6FB4F2', accent: '#FFDD6B', trim: '#FFFFFF' },
  { name: 'Plum',         body: '#D48BD8', accent: '#FFD36B', trim: '#FFF0FA' },
  { name: 'Sunflower',    body: '#FFD84A', accent: '#6FA8F0', trim: '#FFFFFF' },
  { name: 'Melon',        body: '#B8F28C', accent: '#FF7A8A', trim: '#FFF5E0' },
  { name: 'Lavender',     body: '#B8B6F7', accent: '#FF9EBB', trim: '#FFFFFF' },
  { name: 'Pumpkin',      body: '#FF9446', accent: '#7C6BE0', trim: '#FFE9A8' },
  { name: 'Cotton Candy', body: '#A9DCFF', accent: '#FFA3D1', trim: '#FFFFFF' },
  { name: 'Matcha',       body: '#9CCB7A', accent: '#E9A2C8', trim: '#FFF7E0' },
  { name: 'Ruby',         body: '#F2697E', accent: '#FFD56B', trim: '#FFF3E0' },
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
  const outline = fromHsl([outlineHue, 0.42, 0.3]);
  const ink = fromHsl([outlineHue, 0.38, 0.14]);

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
    return fromHsl([h, Math.min(0.8, s + 0.04), l - 0.08]);
  };
  const c = palette.colors;
  return derive(palette.name, tone(c[1]), tone(c[10]), c[12]);
}
