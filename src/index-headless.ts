// Headless exports — no React dependency
export type { PixelGrid, ColorToken, Palette, AvatarConfig, RenderOptions, Intensity3D } from './types';
export { GRID_SIZE } from './types';

export { hash, hashNth } from './hash';
export { resolve } from './resolve';
export { compose } from './compose';

export { palettes, getPalette, resolveColor } from './palette';
export { heads, eyes, mouths, hair, bodies, accessories } from './parts';

export { toSvgString } from './render-string';
export { toPng } from './export-png';

export { DEFAULT_COLORS, DEFAULT_COLORS_LIGHT, DEFAULT_COLORS_DARK, getColor } from './utils/colors';
