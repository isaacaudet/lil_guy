//#region src/types.d.ts
/**
 * A 16x16 grid where each cell is a colour token. Tokens are roles, not
 * colours — "body", "blush", "hat" — and a palette decides what each looks
 * like, so every part works in every colourway.
 */
type PixelGrid = number[][];
/**
 *  0 transparent
 *  1 body          2 body shade     3 body highlight   4 outline
 *  5 eye           6 white (shine)  7 blush            8 mouth
 *  9 tongue       10 accent        11 accent shade    12 trim
 * 13 belly        14 leaf          15 leaf shade      16 gold
 * 17 gold shade   18 red
 */
type ColorToken = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18;
interface Palette {
  name: string;
  colors: Record<Exclude<ColorToken, 0>, string>;
}
type Intensity3D = "none" | "subtle" | "medium" | "dramatic";
interface AvatarConfig {
  /** Body silhouette. */
  head: number;
  eyes: number;
  mouth: number;
  /** Blush, freckles or bare cheeks. */
  cheeks: number;
  /** Whatever sits on top: ears, a sprout, a hat. */
  hair: number;
  /** Markings on the body: a belly patch, spots, a heart. */
  body: number;
  /** Glasses, a bow tie, a scarf. */
  accessory: number;
  /** Arm pose: none, by the sides, waving, both up. */
  arms: number;
  /** Feet: little nubs, wide paws, or tucked away. */
  feet: number;
  palette: number;
  /** Colour tone: 0 pastel, 1 as authored, 2 vivid. */
  shade: number;
  /** Mirror the finished character. */
  flip: boolean;
  rotation: number;
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
 * ./parts/weights) so the simple, sweet looks are the common ones.
 */
declare function resolve(input: string, overrides?: RenderOptions['parts']): AvatarConfig;

//#endregion
//#region src/compose.d.ts
/**
 * Feet, as columns either side of the centre seam. `null` tucks them away.
 */
declare const FOOT_STYLES: (null | {
  offsets: number[];
  token: number;
})[];
/** Arm poses. */

/**
 * The body and its markings, lit, with no face, hat or accessory on it.
 * The blink frame fills vacated eye cells from here.
 */
declare function composeBase(config: AvatarConfig): PixelGrid;
/**
 * Composes every part into one 16x16 grid of colour tokens.
 *
 * The order matters and is the same for every guy: the lit body and its
 * markings, then whatever sits on top of the head, then anything worn over
 * the eyes, then the face itself (cheeks, eyes, mouth), then whatever is worn
 * on the body. Feet and arms are added before the outline, and the outline is
 * drawn around the finished shape so hats, ears and arms all get one too.
 */
declare function compose(config: AvatarConfig): PixelGrid;

//#endregion
//#region src/palette.d.ts
declare const palettes: Palette[];
declare function getPalette(index: number): Palette;
declare function resolveColor(palette: Palette, token: ColorToken): string | null;
/** Tones a colourway can be worn in: pastel, as picked, vivid. */
declare const SHADE_COUNT = 3;
/**
 * Re-derives a palette in another tone. The pastel tone lifts the body and
 * accent towards white; the vivid tone deepens them. It deliberately barely
 * adds saturation — saturating an already-bright lime turns it acid. Either way
 * the outline, shading and blush are worked out again from the result, so a
 * toned palette is as coherent as the original.
 */
declare function shadePalette(palette: Palette, shade: number): Palette;

//#endregion
//#region src/parts/art.d.ts
/** A small drawing: rows of tokens, not necessarily 16 wide. */
type Stamp = number[][];

//#endregion
//#region src/parts/heads.d.ts
/**
 * Body silhouettes. Only the fill is drawn here: the outline, the soft shading
 * along the bottom and right, the gleam on the upper left, and the feet are
 * all added by compose, so every shape gets the same finish.
 *
 * The rules every shape keeps, so any face and any hat will sit on it:
 * - symmetric about the seam between columns 7 and 8
 * - at least ten wide (columns 3–12) across the eye and mouth rows
 * - column 0, column 15 and row 15 left empty for the outline
 * - nothing below row 13, which is where the feet go
 *
 * `eyes` is the row the bottom of the eyes sits on. Kawaii proportions put
 * the eyes at or below the middle of the face with a big forehead above.
 */
interface Head {
  name: string;
  art: Stamp;
  eyes: number;
  /** Shapes that float — a ghost, a cloud — have no feet. */
  feet: boolean;
}
declare const heads: Head[];

//#endregion
//#region src/parts/eyes.d.ts
/**
 * Eyes, drawn as a pair and centred on the seam. The bottom row of each
 * drawing sits on the head's eye line, so taller eyes grow upwards into the
 * forehead rather than down into the mouth.
 *
 * Every pair keeps the same spacing — the inner edges four columns apart —
 * which is the wide-set look that reads as friendly. Any eye with a solid
 * dark area gets a white catchlight: a flat dark square with no shine is what
 * made the old set look dead-eyed.
 */
interface Eyes {
  name: string;
  art: Stamp;
}
declare const eyes: Eyes[];

//#endregion
//#region src/parts/mouths.d.ts
/**
 * Mouths, centred on the seam, top row one below the eye line. Every one of
 * them is pleased about something: there are no frowns, no bared teeth and no
 * flat lines here, so no eyes-and-mouth pairing can come out glum.
 */
interface Mouth {
  name: string;
  art: Stamp;
}
declare const mouths: Mouth[];

//#endregion
//#region src/parts/canvas.d.ts
interface RowExtent {
  left: number;
  right: number;
}
/**
 * The grid a guy is being drawn on, plus the measurements every part needs to
 * sit properly on whichever shape it landed on: where the crown is, how wide
 * each row is, where the eyes go.
 *
 * Measurements are taken from the bare silhouette once, before anything is
 * worn, so a hat cannot change where the next part thinks the head is.
 */
declare class Canvas {
  readonly grid: PixelGrid;
  /** Per-row span of the bare body, or null for rows it doesn't reach. */
  readonly rows: (RowExtent | null)[];
  /** First row of the body. */
  readonly crown: number;
  /** Last row of the body (feet excluded). */
  readonly bottom: number;
  /** Row the bottom of the eyes sits on. */
  readonly eyeLine: number;
  /** Centre of the body, between two columns: 8 means the seam of 7 and 8. */
  readonly centre: number;
  private readonly body;
  constructor(grid: PixelGrid, eyeLine: number);
  inside(x: number, y: number): boolean;
  /** Whether the bare silhouette covers this cell. */
  isBody(x: number, y: number): boolean;
  get(x: number, y: number): number;
  set(x: number, y: number, token: number): void;
  /** First row the bare body covers in this column, or null. */
  topOf(x: number): number | null;
  /** First row at least `min` wide — where ears can sit on a pointed head. */
  shoulder(min?: number): number;
  /**
   * Draws a stamp with its top-left at (x, y). `onBody` keeps it to the bare
   * silhouette, which is what stops a face from hanging off a narrow head.
   */
  draw(s: Stamp, x: number, y: number, onBody?: boolean): void;
  /** Left column that centres a stamp on the body. */
  centred(s: Stamp): number;
  /** Repaints every body cell in a row. */
  paintRow(y: number, token: number): void;
}

//#endregion
//#region src/parts/hair.d.ts
/**
 * Whatever sits on top of the head.
 *
 * Most are small drawings seated on the crown: the bottom row of the drawing
 * overlaps the top of the head so it looks attached rather than balanced on
 * it. Ears and other pairs are drawn once, for the left, and mirrored. Hats
 * that hug the head are painted onto the head's own top rows, so a beanie
 * always fits whatever shape it lands on.
 */
interface Topper {
  name: string;
  draw: (c: Canvas) => void;
}
declare const hair: Topper[];

//#endregion
//#region src/parts/bodies.d.ts
/**
 * Markings on the body. They are painted before the face, and only onto the
 * body itself, so the face always draws over them and nothing sticks out past
 * the outline. They stay quiet on purpose: a busy pattern fights the face,
 * which is the part that carries the character.
 */
interface Marking {
  name: string;
  draw: (c: Canvas) => void;
}
declare const bodies: Marking[];

//#endregion
//#region src/parts/accessories.d.ts
/**
 * Small things a guy wears. Each says when it is drawn: `face` pieces go on
 * before the eyes, so the eyes always show through a pair of glasses; `body`
 * pieces go on after the face but never over the mouth, so a scarf can't hide
 * a smile.
 */
interface Accessory {
  name: string;
  layer: 'face' | 'body';
  draw: (c: Canvas) => void;
}
declare const accessories: Accessory[];

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