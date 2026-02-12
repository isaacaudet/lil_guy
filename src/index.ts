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

export type { PixelGrid, ColorToken, Palette, AvatarConfig, RenderOptions, Intensity3D } from "./types";
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
export { resolve } from "./resolve";
export { compose } from "./compose";
export { palettes, getPalette, resolveColor } from "./palette";
export { heads, eyes, mouths, hair, bodies, accessories } from "./parts";

// ============================================================================
// Utilities
// ============================================================================

export { mergeRefs, useMergeRefs } from "./utils/merge-refs";
export { DEFAULT_COLORS, DEFAULT_COLORS_LIGHT, DEFAULT_COLORS_DARK, getColor } from "./utils/colors";
