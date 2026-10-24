// Headless exports — no React dependency
export type { PixelGrid, ColorToken, Palette, AvatarConfig, RenderOptions, Intensity3D, GameId } from './types';
export { GRID_SIZE } from './types';

export { hash, hashNth } from './hash';
export { resolve } from './resolve';
export { compose, composeBase, FOOT_STYLES } from './compose';

export { palettes, getPalette, resolveColor, shadePalette, SHADE_COUNT } from './palette';
export { heads, eyes, mouths, cheeks, hair, bodies, accessories } from './parts';
export { items, itemById, gameItems, freeItem, dress, withItems, GAMES } from './items';
export type { Item, Slot } from './items';
export { encode, decode, starter, roll, wearOf, gradeOf, nameOf, special, nebulaPhase, slotOf, FINISHES, GRADES, WEAR, DEEP_BLUE_PRINTS } from './owned';
export type { Owned, Finish, Grade } from './owned';
export { paint } from './paint';

export { toSvgString } from './render-string';
export { toPng } from './export-png';

export { DEFAULT_COLORS, DEFAULT_COLORS_LIGHT, DEFAULT_COLORS_DARK, getColor } from './utils/colors';
export { traitOdds, guyOneIn, copyOneIn } from './rarity';
export type { TraitOdds } from './rarity';
