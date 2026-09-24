//#region src/types.d.ts
type PixelGrid = number[][];
type ColorToken = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
interface Palette {
  name: string;
  colors: Record<Exclude<ColorToken, 0>, string>;
}
/**
 * How a layer is positioned against the head silhouette it lands on.
 * - `field`  — drawn where authored (patterns that cover the whole guy)
 * - `face`   — follows the face block (eyes, mouth, eyewear)
 * - `top`    — rests on the crown of the head (hats, hair)
 * - `lower`  — hangs off the bottom of the body (belly motifs, bowtie)
 * - `edge`   — hugs the left/right edge of the silhouette (blush, freckles, the
 *              side bow), so an off-centre part stays on the head instead of
 *              drifting off a narrow one
 */
type PartPlacement = "field" | "face" | "top" | "lower" | "edge" | "float";
interface AvatarConfig {
  head: number;
  eyes: number;
  mouth: number;
  hair: number;
  body: number;
  accessory: number;
  palette: number;
  rotation: number;
  /**
   * Mirror the finished character horizontally. Nearly half the part library
   * is asymmetric — the side bow, the wink, the sash, the monocle — so this is
   * a different-looking guy rather than a duplicate.
   */
  flip: boolean;
  /**
   * Tone of the palette: 0 soft, 1 as authored, 2 deep. Applied to the body,
   * feature, pattern, accent, outline and mouth tokens; the eye white and
   * pupil are left alone so the face keeps its contrast.
   */
  shade: number;
  /** Index into FOOT_STYLES — 0 keeps whatever the head was drawn with. */
  feet: number;
  /** 0 draws body patterns in the pattern colour, 1 in the accent colour. */
  patternTone: number;
} //#endregion
//#region src/v2/types.d.ts
/**
 * v2 draws on a 32x32 grid — exactly twice v1's 16. Every v1 part converts by
 * doubling each pixel, so the old art carries over without being redrawn.
 */
declare const GRID_SIZE_V2 = 32;
/** Pixels per v1 cell. Placement is measured in cells and applied in pixels. */
declare const CELL = 2;
/**
 * v1's nine tokens plus a highlight:
 * 0 transparent, 1 body, 2 feature, 3 pattern, 4 accent, 5 outline,
 * 6 eye white, 7 pupil, 8 mouth, 9 highlight.
 */
type ColorTokenV2 = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
interface PaletteV2 {
  /** Stable forever, e.g. "rose-gold". Commerce and saves refer to this. */
  id: string;
  name: string;
  /** Token 9 (highlight) is optional; it is derived from the body when absent. */
  colors: Record<Exclude<ColorTokenV2, 0 | 9>, string> & {
    9?: string;
  };
}
/** Every slot a part can live in. `top` is v1's `hair` (hair and hats). */
type Slot = 'head' | 'eyes' | 'mouth' | 'top' | 'body' | 'accessory' | 'outfit' | 'held' | 'backdrop';
type PartSource = 'free' | 'earned' | 'plus' | `pack:${string}`;
interface PartMeta {
  /** Stable forever, e.g. "top.chef-hat". Purchases and unlocks key on this. */
  id: string;
  slot: Slot;
  /** Position in its slot's array. Arrays are append-only, so this never moves. */
  index: number;
  /** Shown in the builder, e.g. "chef hat". */
  name: string;
  source: PartSource;
  tags: string[];
  rarity?: 'common' | 'rare' | 'legendary';
  /** Library version the part first shipped in, for "new" badges. */
  introduced: string;
}
/** One authored part: its art, where it sits, and what it is. */
interface PartDef {
  id: string;
  name: string;
  grid: PixelGrid;
  placement?: PartPlacement;
  /** Eyes only: an authored closed frame. Without one, the blink is derived. */
  blink?: PixelGrid;
  source?: PartSource;
  tags?: string[];
  rarity?: PartMeta['rarity'];
  introduced: string;
}
/**
 * A v1 config plus the slots v2 adds. Every new field defaults to "nothing",
 * so any v1 config is a valid v2 config and draws exactly as it did.
 */
interface AvatarConfigV2 extends AvatarConfig {
  /** Index into `outfits`; 0 is none. */
  outfit?: number;
  /** Index into `held`; 0 is none. */
  held?: number;
  /** Index into `backdrops`; 0 is none. Only drawn on cards, never in lists. */
  backdrop?: number;
  /**
   * Per-slot colour choice: draw the hat or outfit from another palette's
   * colours (an index into `palettesV2`) while the guy keeps his own.
   */
  tints?: {
    top?: number;
    outfit?: number;
  };
}
type AnimationState = 'still' | 'idle' | 'happy' | 'sad' | 'cheer' | 'look'; //#endregion
//#region src/hash.d.ts
/**
 * FNV-1a hash — returns a positive 32-bit integer.
 */
declare function hash(input: string): number;
/**
 * Returns an independent hash for each body-part slot by appending a separator and index.
 */
declare function hashNth(input: string, index: number): number;

//#endregion
//#region src/v2/resolve.d.ts
type PartOverridesV2 = Partial<Omit<AvatarConfigV2, 'palette'>>;
/**
 * Resolves a name to a v2 config — and it is v1's resolve, untouched.
 *
 * Same hash, same weights, and it only ever rolls over v1's parts, so a
 * name-drawn guy is the same guy on v2 as he was on v1. New parts reach a
 * character only when the player picks them; the new slots start empty.
 */
declare function resolveV2(input: string, overrides?: PartOverridesV2): AvatarConfigV2;

//#endregion
//#region src/parts/metrics.d.ts
/** Horizontal span of filled pixels on a single row. */
interface RowExtent {
  left: number;
  right: number;
}
/**
 * Geometry of a head silhouette, used to place every other layer.
 *
 * Parts are authored against a reference head (see REFERENCE below) and then
 * shifted/clipped to fit whichever head was actually rolled, so hats rest on
 * the skull instead of floating above it and cheek marks stay on the face.
 */
interface HeadMetrics {
  /** First row containing any pixel. */
  top: number;
  /**
   * First unbroken row — the crown of the main mass. On a head wearing horns
   * or ears this sits below `top`, and it is where a hat has to rest: seating
   * a hat on the horn row leaves it hovering over the gap between the horns.
   */
  crown: number;
  /** Last row of the contiguous main mass — feet and drips are excluded. */
  bottom: number;
  /** Per-row horizontal span, or null for empty rows. */
  rows: (RowExtent | null)[];
}

//#endregion
//#region src/v2/compose.d.ts
/**
 * This is v1's compose run at 32x32, and for any v1 part it must produce
 * exactly v1's grid doubled — the parity test holds it to that over every
 * part and ten thousand names.
 *
 * The trick is that geometry is measured in 16x16 cells (see `toCells`) and
 * only applied in pixels. Every offset is therefore a whole cell: v1's
 * rounding happens at v1's resolution, and nothing a doubled part does can
 * land half a cell off where v1 put it. New parts are drawn on the same 2px
 * rhythm, so they sit on the same lattice.
 */
/** Head geometry, in cells. */
declare const headMetricsV2: HeadMetrics[];
/** What each pixel is and which slot painted it, so tints know what to recolour. */
interface Composed {
  grid: PixelGrid;
  layers: (Slot | null)[][];
}
/**
 * What an animation frame changes. Parts don't carry per-frame art: a state
 * swaps the eyes or mouth for another part, closes or slides the eyes, or
 * raises the arms, and everything else is a transform of the finished guy.
 */
interface FrameOverrides {
  eyes?: number;
  mouth?: number;
  /** Close the eyes: the part's own blink frame, or one derived from it. */
  blink?: boolean;
  /** Slide the eyes this many pixels sideways, to look left or right. */
  eyeShift?: number;
  arms?: 'up';
}
/** Composes a v2 config into a 32x32 grid plus the slot that painted each pixel. */
declare function composeLayersV2(config: AvatarConfigV2, frame?: FrameOverrides): Composed;
/** Composes a v2 config into a 32x32 grid of colour tokens. */
declare function composeV2(config: AvatarConfigV2, frame?: FrameOverrides): PixelGrid;

//#endregion
//#region src/v2/grid.d.ts
/**
 * The v1 → v2 converter: every pixel becomes a 2x2 block of the same token.
 * No reinterpretation, which is what lets a v1 guy come through untouched.
 */
declare function upscale2x(grid: PixelGrid): PixelGrid;
/**
 * Which 16x16 cells a 32x32 grid touches. A cell holds the first non-zero
 * token found in its 2x2 block, so occupancy is exact and a doubled v1 part
 * comes back as the part it was.
 *
 * Placement is measured on this, never on raw pixels: that keeps every offset
 * a whole number of cells, so doubled v1 parts land exactly where v1 put them
 * and new parts drawn on the 2px rhythm stay on it.
 */
declare function toCells(grid: PixelGrid): PixelGrid;

//#endregion
//#region src/v2/parts.d.ts
/**
 * Every slot's parts, in saved-index order. v1's come first at their v1
 * indices, doubled to 32x32; anything new is appended after them.
 *
 * Art is added here as a `PartDef` on the end of its slot. The import script
 * and the append-only test both work from this table.
 */
declare const PART_DEFS: Record<Slot, PartDef[]>;
declare const SLOTS: Slot[];
declare const headsV2: PixelGrid[];
declare const eyesV2: PixelGrid[];
declare const mouthsV2: PixelGrid[];
declare const topsV2: PixelGrid[];
declare const bodiesV2: PixelGrid[];
declare const accessoriesV2: PixelGrid[];
declare const outfits: PixelGrid[];
declare const held: PixelGrid[];
declare const backdrops: PixelGrid[];
/** Every part's metadata, across all slots. */
declare const catalog: PartMeta[];
/** Looks a part up by its stable id. */
declare function partById(id: string): PartMeta | undefined;
/** The saved index for an id, or -1 if this build does not know the part. */
declare function indexOfPart(id: string): number;
/** The stable id for a slot and saved index. */
declare function partId(slot: Slot, index: number): string | undefined;

//#endregion
//#region src/v2/palettes.d.ts
/**
 * Every palette, by saved index. v1's 32 first, then the app's 8, then
 * anything new. Append-only, like the parts.
 */
declare const palettesV2: PaletteV2[];
/** The saved index for a palette id, or -1 if this build does not know it. */
declare function paletteIndex(id: string): number;
/**
 * A palette by index or id, exactly as authored — no shade, no legibility
 * pass. This is what a customized character is drawn with today, so it is
 * what keeps a customized character looking the same.
 */
declare function getPaletteV2(key: number | string): PaletteV2;
/**
 * The same shade and legibility pass v1 applies to a name-drawn guy, extended
 * to carry the id and the highlight through.
 */
declare function shadePaletteV2(palette: PaletteV2, shade: number): PaletteV2;
/**
 * Colour for a token. v1 palettes have no highlight, so it is derived: the
 * body lifted towards white, which reads as a shine on any hue.
 */
declare function resolveColorV2(palette: Palette | PaletteV2, token: ColorTokenV2): string | null;

//#endregion
//#region src/v2/animate.d.ts
/** One step of a state: what changes on the guy, where he is, and for how long. */
interface FrameSpec {
  over?: FrameOverrides;
  /** Whole-character offset, in grid pixels. */
  dx?: number;
  dy?: number;
  ms: number;
}
/**
 * The states, as a few overrides and transforms each. None of them needs
 * per-frame art: they swap in parts that already exist, close or slide the
 * eyes, raise the arms, and move the whole guy.
 */
declare const STATES: Record<AnimationState, FrameSpec[]>;
interface Frame extends Composed {
  dx: number;
  dy: number;
  ms: number;
}
/**
 * Every frame of a state as a composed grid, for drawing onto a canvas.
 * Frames that change nothing but position share one grid.
 */
declare function animationFrames(config: AvatarConfigV2, state: AnimationState): Frame[];

//#endregion
//#region src/v2/render.d.ts
interface RenderOptionsV2 {
  /** Rendered width and height in CSS pixels. Default 128. */
  size?: number;
  square?: boolean;
  /**
   * Draw with this palette exactly as given — no shade, no legibility pass.
   * That is how a customized guy is drawn today, and passing the same palette
   * keeps him the same colour.
   */
  palette?: Palette | PaletteV2;
  /** Part overrides, applied on top of the name's roll (string input only). */
  parts?: PartOverridesV2;
  /** Accessible name. Omit when the avatar sits beside the name it stands for. */
  title?: string;
  /** Animation state. Default `still`, which is what lists should use. */
  state?: AnimationState;
  /** Backdrop tile for cards and the profile. Overrides the config's own. */
  backdrop?: number;
  /**
   * The tiny preview (for ~24px): drops the outline around the silhouette and
   * any backdrop, which at that size are just noise around a smaller face.
   */
  preview?: boolean;
}
type ColorGrid = (string | null)[][];
/**
 * Turns a colour grid into one `<path>` per colour.
 *
 * Runs of one colour along a row become a rectangle, and a rectangle keeps
 * growing downwards for as long as the next row has the same run. At 32x32
 * the big flat areas of a body collapse to a handful of rectangles, which is
 * what keeps a character to a few KB in a hundred-row leaderboard.
 */
declare function toPaths(colors: ColorGrid): string;
/**
 * A complete SVG for a guy, from a name (rolled exactly as v1 rolls it) or a
 * config. Works anywhere — no DOM — and `api/og.mjs` calls it the same way it
 * calls v1's.
 *
 * The viewBox is the 32x32 grid, so the output is the same whatever `size`
 * is asked for, apart from the width and height.
 */
declare function toSvgStringV2(input: string | AvatarConfigV2, options?: RenderOptionsV2): string;
/**
 * Renders a guy to a PNG data URL, for share cards. Browser-only — it needs
 * canvas and Image. Always the still frame.
 */
declare function toPngV2(input: string | AvatarConfigV2, options?: RenderOptionsV2): Promise<string>;

//#endregion
export { AnimationState, AvatarConfigV2, CELL, ColorTokenV2, Composed, Frame, FrameOverrides, FrameSpec, GRID_SIZE_V2, PART_DEFS, Palette, PaletteV2, PartDef, PartMeta, PartOverridesV2, PartPlacement, PartSource, PixelGrid, RenderOptionsV2, SLOTS, STATES, Slot, accessoriesV2, animationFrames, backdrops, bodiesV2, catalog, composeLayersV2, composeV2, eyesV2, getPaletteV2, hash, hashNth, headMetricsV2, headsV2, held, indexOfPart, mouthsV2, outfits, paletteIndex, palettesV2, partById, partId, resolveColorV2, resolveV2, shadePaletteV2, toCells, toPaths, toPngV2, toSvgStringV2, topsV2, upscale2x };