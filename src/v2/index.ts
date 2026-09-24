// lil_guy v2 — headless, no React. Vendored by apps the same way as v1:
// one ESM file plus its .d.ts (see tsdown.headless.config.ts).
export type { PixelGrid, Palette, PartPlacement } from '../types';
export type {
  AvatarConfigV2, AnimationState, ColorTokenV2, PaletteV2, PartDef, PartMeta, PartSource, Slot,
} from './types';
export { GRID_SIZE_V2, CELL } from './types';

export { hash, hashNth } from '../hash';
export { resolveV2, type PartOverridesV2 } from './resolve';
export { composeV2, composeLayersV2, headMetricsV2, type Composed, type FrameOverrides } from './compose';
export { upscale2x, toCells } from './grid';

export {
  PART_DEFS, SLOTS, catalog, partById, indexOfPart, partId,
  headsV2, eyesV2, mouthsV2, topsV2, bodiesV2, accessoriesV2, outfits, held, backdrops,
} from './parts';
export { palettesV2, getPaletteV2, paletteIndex, shadePaletteV2, resolveColorV2 } from './palettes';

export { STATES, animationFrames, type Frame, type FrameSpec } from './animate';
export { toSvgStringV2, toPngV2, toPaths, type RenderOptionsV2 } from './render';
