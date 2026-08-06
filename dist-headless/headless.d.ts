//#region src/types.d.ts
type PixelGrid = number[][];
type ColorToken = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
interface Palette {
  name: string;
  colors: Record<Exclude<ColorToken, 0>, string>;
}
type Intensity3D = "none" | "subtle" | "medium" | "dramatic";
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
}
interface RenderOptions {
  size?: number;
  square?: boolean;
  palette?: Palette;
  parts?: Partial<Omit<AvatarConfig, 'palette'>>;
  /**
   * Accessible name for the avatar. Omit when the avatar sits beside the name
   * it represents — it is then marked decorative, which is what a screen
   * reader wants. Pass it when the avatar is the only identifier.
   */
  title?: string;
}
declare const GRID_SIZE = 16; //#endregion
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
//#region src/resolve.d.ts
/**
 * Resolves an input string to a full AvatarConfig.
 *
 * Each slot is hashed independently so adding or removing variants from one
 * part doesn't cascade into the others, and each pick is weighted (see
 * ./parts/weights) so the set keeps its character as the library grows —
 * a uniform roll over a big library averages out to something bland.
 */
declare function resolve(input: string, overrides?: RenderOptions['parts']): AvatarConfig;

//#endregion
//#region src/compose.d.ts
/**
 * Foot styles, as runs of columns measured outwards from the centre seam.
 * Index 0 means "leave the head's own feet alone", which is what keeps the
 * ghost's drips and the tri's stumps intact.
 */
declare const FOOT_STYLES: (null | {
  inner: number;
  width: number;
  rows: number;
})[];
/**
 * The head and its body pattern, with no face, topper or accessory on top.
 * Useful when something needs to know what sits underneath a face part — the
 * blink frame fills vacated eye cells from here.
 */
/**
 * Composes all part layers into a single 16x16 grid of colour tokens.
 *
 * Head first (base body shape), then body patterns masked onto body pixels,
 * then eyes, mouth, hair and accessories on top. Everything above the head is
 * positioned relative to that head's geometry — toppers rest on its crown, the
 * face block follows its centre, cheek marks hug its edges — so the parts stay
 * in register across all eight shapes instead of floating.
 */
declare function composeBase(config: AvatarConfig): PixelGrid;
declare function compose(config: AvatarConfig): PixelGrid;

//#endregion
//#region src/palette.d.ts
declare const palettes: Palette[];
declare function getPalette(index: number): Palette;
declare function resolveColor(palette: Palette, token: ColorToken): string | null;
/** How many tones `shadePalette` offers. */
declare const SHADE_COUNT = 3;
declare function shadePalette(palette: Palette, shade: number): Palette;

//#endregion
//#region src/parts/heads.d.ts
declare const heads: PixelGrid[];

//#endregion
//#region src/parts/eyes.d.ts
declare const eyes: PixelGrid[];

//#endregion
//#region src/parts/mouths.d.ts
declare const mouths: PixelGrid[];

//#endregion
//#region src/parts/hair.d.ts
declare const hair: PixelGrid[];

//#endregion
//#region src/parts/bodies.d.ts
declare const bodies: PixelGrid[];

//#endregion
//#region src/parts/accessories.d.ts
declare const accessories: PixelGrid[];

//#endregion
//#region src/render-string.d.ts
/**
 * Generates a complete SVG string for a lil_guy avatar.
 * Works anywhere — no React or DOM required.
 *
 * Without `title` the SVG is marked decorative, which is right when the avatar
 * sits next to the name it stands for. Pass `title` when it is the only thing
 * identifying that person.
 */
declare function toSvgString(input: string, options?: RenderOptions): string;

//#endregion
//#region src/export-png.d.ts
/**
 * Renders a lil_guy avatar to a PNG data URL.
 * Browser-only — requires canvas and Image APIs.
 */
declare function toPng(input: string, options?: RenderOptions): Promise<string>;

//#endregion
//#region src/utils/colors.d.ts
/** Default background colors for avatar containers (Tailwind 500 equivalents) */
declare const DEFAULT_COLORS: readonly ["#ec4899", "#f59e0b", "#3b82f6", "#f97316", "#10b981"];
/** Light mode variants (Tailwind 100 equivalents) */
declare const DEFAULT_COLORS_LIGHT: readonly ["#fce7f3", "#fef3c7", "#dbeafe", "#ffedd5", "#d1fae5"];
/** Dark mode variants (Tailwind 600 equivalents) */
declare const DEFAULT_COLORS_DARK: readonly ["#db2777", "#d97706", "#2563eb", "#ea580c", "#059669"];
/** Get a color from an array by index (wraps around) */
declare function getColor(colors: readonly string[], index: number): string;

//#endregion
export { AvatarConfig, ColorToken, DEFAULT_COLORS, DEFAULT_COLORS_DARK, DEFAULT_COLORS_LIGHT, FOOT_STYLES, GRID_SIZE, Intensity3D, Palette, PixelGrid, RenderOptions, SHADE_COUNT, accessories, bodies, compose, composeBase, eyes, getColor, getPalette, hair, hash, hashNth, heads, mouths, palettes, resolve, resolveColor, shadePalette, toPng, toSvgString };