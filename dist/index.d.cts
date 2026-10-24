import * as React$4 from "react";
import * as React$3 from "react";
import * as React$2 from "react";
import * as React$1 from "react";
import * as React from "react";

//#region src/types.d.ts
/**
* A 16x16 grid where each cell is a colour token. Tokens are roles, not
* colours — "body", "blush", "hat" — and a palette decides what each looks
* like, so every part works in every colourway.
*/
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
 * 17 gold shade   18 red           19 deep shade
 * 20–28 the equipped skin's own colours, 30–38 the hat's, 40–48 the frame's
 */
type ColorToken = number;
interface Palette {
  name: string;
  colors: Record<number, string>;
}
/** The DLE Club games that have items. */
type GameId = 'amountle' | 'halfsies' | 'stackdle' | 'flipsies' | 'puttsies' | 'weighsies' | 'cutsies' | 'tiltsies' | 'trackdle';
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
  /** Equipped item ids (see `items`). A skin replaces the body, a hat the topper. */
  skin?: string;
  hat?: string;
  frame?: string;
}
interface RenderOptions {
  size?: number;
  square?: boolean;
  palette?: Palette;
  parts?: Partial<Omit<AvatarConfig, 'palette'>>;
  /**
   * Dress the guy for a game: he wears that game's free hat unless `equip`
   * says otherwise. The guy himself — face, shape, colours — stays the same in
   * every game, so a player is recognisable everywhere.
   */
  game?: GameId;
  /** Item ids to wear, at most one per slot; later ids win. Unknown ids are ignored. */
  equip?: string[];
  /**
   * Accessible name for the avatar. Omit when the avatar sits beside the name
   * it represents — it is then marked decorative, which is what a screen
   * reader wants. Pass it when the avatar is the only identifier.
   */
  title?: string;
}
declare const GRID_SIZE = 16; //#endregion
//#region src/lil-guy.d.ts
interface LilGuyProps extends Omit<React$4.HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * String to generate a deterministic avatar from.
   * Same string always produces the same character.
   */
  name: string;
  /**
   * Size in pixels or CSS units.
   * @default 40
   */
  size?: number | string;
  /**
   * Shape of the avatar.
   * - "circle": Circular clip (default)
   * - "square": No clipping
   * @default "circle"
   */
  shape?: "circle" | "square";
  /**
   * Background style.
   * - "gradient": Adds subtle gradient overlay
   * - "solid": Plain background from palette
   * - "transparent": No background (default)
   * @default "transparent"
   */
  variant?: "gradient" | "solid" | "transparent";
  /**
   * Enable hover interaction.
   * When true, character scales up slightly on hover.
   * @default true
   */
  interactive?: boolean;
  /**
   * Override the palette with a custom one.
   */
  palette?: Palette;
  /**
   * Pin specific parts by index. Other parts remain hash-derived.
   */
  parts?: Partial<{
    head: number;
    eyes: number;
    mouth: number;
    cheeks: number;
    hair: number;
    body: number;
    accessory: number;
    arms: number;
    feet: number;
    shade: number;
    flip: boolean;
  }>;
  /**
   * Dress the guy for a DLE Club game: he wears its free hat unless `equip`
   * says otherwise.
   */
  game?: GameId;
  /**
   * Item ids to wear (see `items`), one per slot.
   */
  equip?: string[];
  /**
   * 3D rotation intensity.
   * @default "dramatic"
   */
  intensity3d?: Intensity3D;
  /**
   * Enable blink animation.
   * @default false
   */
  enableBlink?: boolean;
  /**
   * Hex background color overrides.
   */
  colors?: string[];
  /**
   * Tailwind bg class overrides.
   */
  colorClasses?: string[];
  /**
   * CSS class for gradient overlay.
   */
  gradientOverlayClass?: string;
  /**
   * Show first letter overlay.
   * @default false
   */
  showInitial?: boolean;
  /**
   * Custom mouth render function.
   */
  onRenderMouth?: () => React$4.ReactNode;
}
/**
 * LilGuy - Deterministic pixel art avatars from any string.
 *
 * @example
 * ```tsx
 * // Simple
 * <LilGuy name="alice@example.com" />
 *
 * // Customized
 * <LilGuy name="alice" size={64} shape="square" />
 *
 * // Pin specific parts
 * <LilGuy name="alice" parts={{ hair: 2, eyes: 0 }} />
 * ```
 */
declare const LilGuy: React$4.ForwardRefExoticComponent<LilGuyProps & React$4.RefAttributes<HTMLDivElement>>; //#endregion
//#region src/avatar.d.ts
type ImageLoadingStatus$1 = "idle" | "loading" | "loaded" | "error";
type AvatarContextValue = {
  imageLoadingStatus: ImageLoadingStatus$1;
  onImageLoadingStatusChange: (status: ImageLoadingStatus$1) => void;
};
/**
 * Hook to access the Avatar context.
 * Throws an error if used outside of Avatar.
 */
declare const useAvatarContext: () => AvatarContextValue;
type AvatarProps = React$3.HTMLAttributes<HTMLSpanElement> & {
  /** Render as the child element instead of a span */
  asChild?: boolean;
};
/**
 * Root avatar component that provides context for image loading state.
 *
 * @example
 * ```tsx
 * <Avatar className="w-10 h-10 rounded-full overflow-hidden">
 *   <AvatarImage src="/photo.jpg" alt="John" />
 *   <AvatarFallback name="John Doe" />
 * </Avatar>
 * ```
 */
declare const Avatar: React$3.ForwardRefExoticComponent<React$3.HTMLAttributes<HTMLSpanElement> & {
  /** Render as the child element instead of a span */
  asChild?: boolean;
} & React$3.RefAttributes<HTMLSpanElement>>;

//#endregion
//#region src/avatar-fallback.d.ts
type AvatarFallbackProps = Omit<React$2.HTMLAttributes<HTMLSpanElement>, "children"> & {
  /**
   * The name to derive initials and LilGuy from.
   */
  name?: string;
  /**
   * Delay in milliseconds before showing the fallback.
   * Useful to prevent flashing when images load quickly.
   * @default 0
   */
  delayMs?: number;
  /**
   * Custom children to render instead of initials or LilGuy.
   */
  children?: React$2.ReactNode;
  /**
   * Use the LilGuy pixel avatar as fallback instead of initials.
   * @default true
   */
  lilGuy?: boolean;
  /**
   * Props to pass to the LilGuy component.
   */
  lilGuyProps?: Omit<LilGuyProps, "name">;
};
/**
 * Fallback component that displays when the image fails to load.
 * Uses LilGuy pixel avatar by default, can show initials or custom content.
 *
 * @example
 * ```tsx
 * // With LilGuy pixel avatar (default)
 * <AvatarFallback name="John Doe" />
 *
 * // With initials
 * <AvatarFallback name="John Doe" lilGuy={false} />
 *
 * // With custom content
 * <AvatarFallback>
 *   <UserIcon />
 * </AvatarFallback>
 * ```
 */
declare const AvatarFallback: React$2.ForwardRefExoticComponent<Omit<React$2.HTMLAttributes<HTMLSpanElement>, "children"> & {
  /**
   * The name to derive initials and LilGuy from.
   */
  name?: string;
  /**
   * Delay in milliseconds before showing the fallback.
   * Useful to prevent flashing when images load quickly.
   * @default 0
   */
  delayMs?: number;
  /**
   * Custom children to render instead of initials or LilGuy.
   */
  children?: React$2.ReactNode;
  /**
   * Use the LilGuy pixel avatar as fallback instead of initials.
   * @default true
   */
  lilGuy?: boolean;
  /**
   * Props to pass to the LilGuy component.
   */
  lilGuyProps?: Omit<LilGuyProps, "name">;
} & React$2.RefAttributes<HTMLSpanElement>>;

//#endregion
//#region src/avatar-image.d.ts
type ImageLoadingStatus = "idle" | "loading" | "loaded" | "error";
type AvatarImageProps = Omit<React$1.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  /**
   * The image source URL. If empty or undefined, triggers error state.
   */
  src?: string | null;
  /**
   * Callback when the image loading status changes.
   */
  onLoadingStatusChange?: (status: ImageLoadingStatus) => void;
};
/**
 * Image component that syncs its loading state with the Avatar context.
 * Automatically hides when loading fails, allowing fallback to show.
 *
 * @example
 * ```tsx
 * <Avatar>
 *   <AvatarImage src="/photo.jpg" alt="User" />
 *   <AvatarFallback name="John Doe" />
 * </Avatar>
 * ```
 */
declare const AvatarImage: React$1.ForwardRefExoticComponent<Omit<React$1.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  /**
   * The image source URL. If empty or undefined, triggers error state.
   */
  src?: string | null;
  /**
   * Callback when the image loading status changes.
   */
  onLoadingStatusChange?: (status: ImageLoadingStatus) => void;
} & React$1.RefAttributes<HTMLImageElement>>;

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
//#region src/parts/cheeks.d.ts
/**
 * Cheeks sit on the row just under the eyes, outside them, and are drawn
 * before the mouth so a wide grin can cut through them.
 */
interface Cheeks {
  name: string;
  art: Stamp;
}
declare const cheeks: Cheeks[];

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
  /**
   * The silhouette is everything the starting drawing covers — a plain body,
   * or a skin like a jar or a golf ball, which is drawn in its own colours.
   */
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
/**
 * Seats a drawing on the head: its bottom row lands on the highest body row
 * beneath it. A tall part on a tall head is pushed down rather than allowed to
 * touch the top of the grid, where it would lose its outline.
 */

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
//#region src/items.d.ts
/**
 * Items: things a player earns or buys in a DLE Club game and wears
 * everywhere. Each game has
 *
 * - a skin, which turns the guy into the game's own object (a jar, a golf
 *   ball, a toy block) while keeping his face
 * - two hats: a free one, worn by default in that game, and a rare one
 * - a frame, the backdrop behind him
 *
 * and every skin, rare hat and frame also comes in a gold edition, which adds
 * a sparkle. Items are drawn in their own colours (the `1`–`9` characters),
 * listed with the item, so a golf ball is white whatever the guy's palette.
 * The free hats use the guy's own accent colour, so they still vary by name.
 *
 * This file only draws them. Who owns what, and what it costs, belongs to the
 * game or the club.
 */
type Slot = 'skin' | 'hat' | 'frame';
type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
interface Item {
  /** `game.name`, with `.gold` on the end for a gold edition. */
  id: string;
  game: GameId;
  slot: Slot;
  name: string;
  rarity: Rarity;
  /** Colours for the art's `1`–`9`. */
  colors: string[];
  /** A skin's outline colour, replacing the one worked out from the palette. */
  outline?: string;
  /** Gold editions sparkle. */
  shine?: boolean;
  /** Skins: the body, drawn on the full 16x16 grid. */
  art?: Stamp;
  /** Skins: the row the bottom of the eyes sits on. */
  eyes?: number;
  /** Skins: which of the item's colours arms and feet are drawn in, or none. */
  limb?: number;
  /** Hats: draws onto the head. */
  draw?: (c: Canvas) => void;
  /** Frames: which of the item's colours fills a background cell. */
  fill?: (x: number, y: number) => number;
}
/** Every item, in game order: skins, hats and frames, then the gold editions. */
declare const items: Item[];
declare function itemById(id: string | undefined): Item | undefined;
declare const GAMES: GameId[];
/** A game's items. */
declare function gameItems(game: GameId): Item[];
/** The hat every player wears in a game until they put something else on. */
declare function freeItem(game: GameId): Item;
/**
 * Puts items on a resolved guy: the game's free hat if a game is named, then
 * whatever `equip` lists, one per slot.
 */
declare function dress(config: AvatarConfig, options?: Pick<RenderOptions, 'game' | 'equip'>): AvatarConfig;
/** Adds the equipped items' own colours to a palette. */
declare function withItems(palette: Palette, config: AvatarConfig): Palette;

//#endregion
//#region src/utils/merge-refs.d.ts
type PossibleRef<T> = React.Ref<T> | React.RefCallback<T> | undefined | null;
/**
 * Merges multiple refs into a single callback ref.
 * Useful for forwarding refs to a component while also using a local ref.
 */
declare function mergeRefs<T>(refs: PossibleRef<T>[]): React.RefCallback<T> | null;
/**
 * Hook version of mergeRefs that memoizes the result.
 */
declare function useMergeRefs<T>(refs: PossibleRef<T>[]): React.RefCallback<T> | null;

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
export { Avatar, AvatarConfig, AvatarContextValue, AvatarFallback, AvatarFallbackProps, AvatarImage, AvatarImageProps, AvatarProps, ColorToken, DEFAULT_COLORS, DEFAULT_COLORS_DARK, DEFAULT_COLORS_LIGHT, FOOT_STYLES, GAMES, GRID_SIZE, GameId, Intensity3D, Item, LilGuy, LilGuyProps, Palette, PixelGrid, Rarity, RenderOptions, SHADE_COUNT, Slot, accessories, bodies, cheeks, compose, composeBase, dress, eyes, freeItem, gameItems, getColor, getPalette, hair, hash, hashNth, heads, itemById, items, mergeRefs, mouths, palettes, resolve, resolveColor, shadePalette, toPng, toSvgString, useAvatarContext, useMergeRefs, withItems };
//# sourceMappingURL=index.d.cts.map