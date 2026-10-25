// ============================================================================
// Primary Export - This is what you want
// ============================================================================

export type { LilGuyProps } from "./lil-guy";
export { LilGuy } from "./lil-guy";

// ============================================================================
// Avatar Compound Components - For image + fallback pattern
// ============================================================================

export {
	Avatar,
	type AvatarContextValue,
	type AvatarProps,
	useAvatarContext,
} from "./avatar";
export { AvatarFallback, type AvatarFallbackProps } from "./avatar-fallback";
export { AvatarImage, type AvatarImageProps } from "./avatar-image";

// ============================================================================
// Core Types & Constants
// ============================================================================

export type { PixelGrid, ColorToken, Palette, AvatarConfig, RenderOptions, Intensity3D, GameId } from "./types";
export { GRID_SIZE } from "./types";

// ============================================================================
// Headless Rendering - No React needed
// ============================================================================

export { toSvgString } from "./render-string";
export { toPng } from "./export-png";

// ============================================================================
// Internals (for advanced use)
// ============================================================================

export { hash, hashNth } from "./hash";
export { resolve, LUCKY_ODDS } from "./resolve";
export { compose, composeBase, FOOT_STYLES } from "./compose";
export { palettes, getPalette, resolveColor, shadePalette, SHADE_COUNT, luckyPalette, paletteOf } from "./palette";
export { heads, eyes, mouths, cheeks, hair, bodies, accessories } from "./parts";
export { items, itemById, gameItems, freeItem, dress, withItems, inSeason, GAMES } from "./items";
export type { Item, Slot, ItemGame } from "./items";
export { encode, decode, starter, roll, wearOf, gradeOf, nameOf, special, nebulaPhase, temperTint, slotOf, rollSeason, FINISHES, GRADES, WEAR, DEEP_BLUE_PRINTS } from "./owned";
export type { Owned, Finish, Grade } from "./owned";
export { paint, SMALL_SIZE } from "./paint";
export { animate, frameAt, drawFrame, toAnimatedSvg, closeEyes, MOVES, HEADROOM, FRAME_WIDTH, FRAME_HEIGHT, EMOTE_UNLOCKS } from "./animate";
export { PINS, MAX_PINS, pinById, tallyMarks, GOLD_RIM_DAYS } from "./pins";
export type { Pin } from "./pins";
export type { Emote, Move, Animation, AnimationFrame, AnimateOptions, AnimatedSvgOptions, PixelTarget } from "./animate";

// ============================================================================
// Utilities
// ============================================================================

export { mergeRefs, useMergeRefs } from "./utils/merge-refs";
export { DEFAULT_COLORS, DEFAULT_COLORS_LIGHT, DEFAULT_COLORS_DARK, getColor } from "./utils/colors";
export { traitOdds, guyOneIn, copyOneIn } from "./rarity";
export type { TraitOdds } from "./rarity";
export { makeSeed, pickable, allowed, encodeLook, decodeLook, lookOf } from "./look";
export type { Look, LookSlot } from "./look";
export { toShareSvg } from "./share";
export type { ShareOptions } from "./share";
export { LilGuyAnimated, type LilGuyAnimatedProps } from "./lil-guy-animated";
export { createShine, shineData, type Shine } from "./shine";
export { voxelColumns, voxelItem, voxelMesh, itemFrame, ownedOf, surfaceOf } from "./voxel";
export type { VoxelColumn, VoxelMesh, VoxelSource, VoxelOptions, Surface, SurfaceKind } from "./voxel";
export { FRAME_SLOTS } from "./animate";
