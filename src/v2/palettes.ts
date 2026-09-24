import { palettes, shadePalette } from '../palette';
import type { Palette } from '../types';
import type { ColorTokenV2, PaletteV2 } from './types';

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

/**
 * Palettes that lived in Amountle (as EXTRA_PALETTES) before the library owned
 * them. They sit at 32-39, the indices the app already saves them under, so no
 * saved avatar moves. The app keeps its own migration for saves older than
 * that; nothing here needs one.
 */
const APP_PALETTES: Palette[] = [
  { name: 'Monochrome', colors: { 1: '#C8C8C8', 2: '#888888', 3: '#E0E0E0', 4: '#A8A8A8', 5: '#686868', 6: '#F8F8F8', 7: '#101010', 8: '#B0B0B0' } },
  { name: 'Voltage',    colors: { 1: '#22FF88', 2: '#FF0099', 3: '#00EEFF', 4: '#FF8800', 5: '#8822FF', 6: '#FFFFFF', 7: '#000814', 8: '#FF2244' } },
  { name: 'Midnight',   colors: { 1: '#3D5FA8', 2: '#253E88', 3: '#6080D0', 4: '#4D70C0', 5: '#2A3E78', 6: '#D0D8FF', 7: '#06080E', 8: '#8860A8' } },
  { name: 'Rose Gold',  colors: { 1: '#E8A888', 2: '#C87860', 3: '#F8D0B0', 4: '#D89870', 5: '#B07868', 6: '#FFF4EE', 7: '#180808', 8: '#CC7090' } },
  { name: 'Citrus',     colors: { 1: '#F0D018', 2: '#E06010', 3: '#A8DC28', 4: '#F0A008', 5: '#A09008', 6: '#FFFFF0', 7: '#0C1400', 8: '#E84020' } },
  { name: 'Lavender',   colors: { 1: '#C0A8E8', 2: '#9070C8', 3: '#E0D0FF', 4: '#B098D8', 5: '#7060A8', 6: '#F8F4FF', 7: '#140818', 8: '#D080C0' } },
  { name: 'Graphite',   colors: { 1: '#8898B8', 2: '#5870A0', 3: '#A8C0D0', 4: '#7898B8', 5: '#486080', 6: '#EEF4F8', 7: '#080C14', 8: '#9080B0' } },
  { name: 'Forge',      colors: { 1: '#D04020', 2: '#A02810', 3: '#F06030', 4: '#E05028', 5: '#803018', 6: '#FFF0E8', 7: '#0E0200', 8: '#C04050' } },
];

/**
 * Every palette, by saved index. v1's 32 first, then the app's 8, then
 * anything new. Append-only, like the parts.
 */
export const palettesV2: PaletteV2[] = [...palettes, ...APP_PALETTES].map(p => ({
  id: slug(p.name),
  name: p.name,
  colors: { ...p.colors },
}));

const byId = new Map(palettesV2.map((p, i) => [p.id, i]));

/** The saved index for a palette id, or -1 if this build does not know it. */
export function paletteIndex(id: string): number {
  return byId.get(id) ?? -1;
}

/**
 * A palette by index or id, exactly as authored — no shade, no legibility
 * pass. This is what a customized character is drawn with today, so it is
 * what keeps a customized character looking the same.
 */
export function getPaletteV2(key: number | string): PaletteV2 {
  const index = typeof key === 'string' ? paletteIndex(key) : key;
  return palettesV2[((index % palettesV2.length) + palettesV2.length) % palettesV2.length] ?? palettesV2[0];
}

function mix(hex: string, towards: number, amount: number): string {
  const channel = (i: number) => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
    return Math.round(v + (towards - v) * amount).toString(16).padStart(2, '0');
  };
  return `#${channel(0)}${channel(1)}${channel(2)}`.toUpperCase();
}

/**
 * The same shade and legibility pass v1 applies to a name-drawn guy, extended
 * to carry the id and the highlight through.
 */
export function shadePaletteV2(palette: PaletteV2, shade: number): PaletteV2 {
  const shaded = shadePalette({ name: palette.name, colors: palette.colors }, shade);
  const colors: PaletteV2['colors'] = { ...shaded.colors };
  if (palette.colors[9]) colors[9] = palette.colors[9];
  return { id: palette.id, name: palette.name, colors };
}

/**
 * Colour for a token. v1 palettes have no highlight, so it is derived: the
 * body lifted towards white, which reads as a shine on any hue.
 */
export function resolveColorV2(palette: Palette | PaletteV2, token: ColorTokenV2): string | null {
  if (token === 0) return null;
  if (token === 9) {
    const colors = palette.colors as PaletteV2['colors'];
    return colors[9] ?? mix(colors[1], 255, 0.45);
  }
  return palette.colors[token];
}
