/**
 * The few things a page needs to draw plain faces with `toSvgString` (the club's boards): the parts,
 * the palettes, the deal and the guy codes, minified. Built by `npx tsdown -c tsdown.headless.config.ts`
 * as dist-headless/faces.js, about 57 KB gzipped (the whole build is about 185 KB). Not a
 * drop-in for the club's faces.js: see GAMES.md.
 */
export type { AvatarConfig, Palette, RenderOptions } from './types';
export { heads, eyes, mouths, cheeks, hair, bodies, accessories } from './parts';
export { palettes, getPalette, paletteOf } from './palette';
export { resolve } from './resolve';
export { encodeGuy, decodeGuy } from './guy';
export { toSvgString } from './render-string';
