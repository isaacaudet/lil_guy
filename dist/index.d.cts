import * as React$5 from "react";
import * as React$4 from "react";
import * as React$3 from "react";
import * as React$2 from "react";
import * as React$1 from "react";
import * as React from "react";
import * as react_jsx_runtime1 from "react/jsx-runtime";

//#region src/effects.d.ts
/**
* Effects: a rare layer a copy can roll on top of its finish, the way a knife
* has its phase. Any copy from a capsule can have one; an aura is far more
* likely to, so aura effects make a ladder of their own. Three are versions
* (Shimmer, Pulse, Holo) and three are rarer (Chroma, Embers, Starlight).
*
* An effect moves in `animate`, and shows in a still picture as it stands at
* the start. It never changes the item's own drawing, only how it shines.
*/
/**
 * Effects: a rare layer a copy can roll on top of its finish, the way a knife
 * has its phase. Any copy from a capsule can have one; an aura is far more
 * likely to, so aura effects make a ladder of their own. Three are versions
 * (Shimmer, Pulse, Holo) and three are rarer (Chroma, Embers, Starlight).
 *
 * An effect moves in `animate`, and shows in a still picture as it stands at
 * the start. It never changes the item's own drawing, only how it shines.
 */
type Fx = 'shimmer' | 'pulse' | 'holo' | 'chroma' | 'embers' | 'starlight';
interface Effect {
  name: string;
  /** One line on what it does. */
  what: string;
  /** About one item copy in this many has it. */
  item: number;
  /** About one aura in this many has it. */
  aura: number;
}
declare const EFFECTS: Record<Fx, Effect>;
declare const FX_IDS: Fx[];
/** The effect a uniform number in [0, 1) gives, rarest checked first, or none. */
declare function rollFx(u: number, aura: boolean): Fx | undefined;
/** One pixel of a copy with an effect, at `t` ms; `print` offsets it so no two copies move together. */
declare function fxColor(color: string, fx: Fx, x: number, y: number, t: number, print?: number): string;
/**
 * Applies the effects of the copies a frame shows: `slots` says which slot
 * each pixel belongs to (1 skin, 2 hat, 3 frame, 4 buddy, 5 aura, as in
 * `FRAME_SLOTS`), `copies` the copy in each slot. Embers also send sparks up
 * into the empty pixels above their copy.
 */
declare function applyFx(colors: (string | null)[][], slots: number[][], copies: (({
  fx?: Fx;
  print: number;
}) | undefined)[], t: number): (string | null)[][];

//#endregion
//#region src/parts/art.d.ts

/** A small drawing: rows of tokens, not necessarily 16 wide. */
type Stamp = number[][]; //#endregion
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
  /**
   * The grid's border belongs to the outline, so parts never paint on it: a
   * hat on a tall head or an arm beside a wide one stops a pixel short instead
   * of running off the edge with no outline.
   */
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
//#region src/items.d.ts
/**
 * Items: things a player earns or buys in a DLE Club game and wears
 * everywhere. Each game has
 *
 * - four skins, which turn the guy into one of the game's own objects (a jar,
 *   a golf ball, a traffic cone) while keeping his face
 * - four hats, one of them free: every player has it from the start
 * - three frames, the backdrop behind him
 * - three buddies, a tiny pet at his feet
 *
 * So each game's capsule machine holds thirteen. Lists are append-only: a
 * saved copy stores its item's id, so an item is never renamed or removed.
 *
 * An item is the design. A copy someone owns adds a finish, a scuff and a
 * print number (see ./owned), which is what makes one copy worth more than
 * another. Items are drawn in their own colours (the `1`–`9` characters),
 * listed with the item, and a finish repaints them. The free hats use the
 * guy's own accent colour, so they still vary by name.
 *
 * This file only draws them. Who owns what, and what it costs, belongs to the
 * game or the club.
 */
type Slot = 'skin' | 'hat' | 'frame' | 'buddy' | 'aura';
/** Which game an item belongs to; `club` items are seasonal and belong to no one game. */
type ItemGame = GameId | 'club';
interface Item {
  /** `game.name`. */
  id: string;
  game: ItemGame;
  slot: Slot;
  name: string;
  /** The hat every player has in this game from the start. */
  free?: boolean;
  /** Colours for the art's `1`–`9`. */
  colors: string[];
  /** A skin's outline colour, replacing the one worked out from the palette. */
  outline?: string;
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
  /** Seasonal items: the days of the year they drop, as `MM-DD`, inclusive. */
  season?: {
    from: string;
    to: string;
  };
}
/** The seasonal items that drop on a day (`YYYY-MM-DD` or a Date, read in UTC). */
declare function inSeason(day: string | Date): Item[];
/** Every item: each game's skins, then hats, then frames, then buddies, then the seasonal hats. */
declare const items: Item[];
declare function itemById(id: string | undefined): Item | undefined;
declare const GAMES: GameId[];
/** A game's items. */
declare function gameItems(game: ItemGame): Item[];
/** The hat every player wears in a game until they put something else on. */
declare function freeItem(game: GameId): Item;
/**
 * Puts items on a resolved guy. Naming a game puts on that game's free hat —
 * the player's own copy of it when their `name` is given. Then each `equip`
 * entry, an item id or an encoded owned copy, takes its slot.
 */
declare function dress(config: AvatarConfig, options?: Pick<RenderOptions, 'game' | 'equip'>, name?: string): AvatarConfig;
/** Adds the equipped items' own colours to a palette. */
declare function withItems(palette: Palette, config: AvatarConfig): Palette;

//#endregion
//#region src/owned.d.ts
/**
 * Owned copies of items, collected like toys.
 *
 * An item (`puttsies.ball`) is a design. A copy someone owns adds:
 *
 * - a **finish**: the paint job. Plain is common; Sunset, Tempered, Nebula,
 *   Prism, Negative and Gold are progressively rarer
 * - a **scuff** between 0 and 1: how worn it is. Low is pristine, high is
 *   battered. The condition (Mint in Box … Battered) is a range of it, and
 *   the scuffs really show: paint chips off as it rises
 * - a **print** number between 0 and 999: where the finish lands. Most prints
 *   are ordinary; a few are famous (a Deep Blue Tempered, a Red Giant or
 *   Black Hole Nebula)
 * - sometimes a **tally**: a counter of the days its owner finished the game
 *   while wearing it
 *
 * Two copies of the same item are almost never the same: the scuff alone has
 * millions of values. Everything is deterministic from the stored numbers, so
 * a copy looks the same everywhere it is drawn.
 */
type Finish = 'plain' | 'sunset' | 'tempered' | 'nebula' | 'prism' | 'negative' | 'gold' | 'classic' | 'fade' | 'frost' | 'toxic' | 'shadow' | 'sapphire' | 'ruby' | 'pearl';
interface Owned {
  item: string;
  finish: Finish;
  /** 0–1, how worn. */
  scuff: number;
  /** 0–999, where the finish and the scuffs land. */
  print: number;
  /** Days the owner finished the game wearing it, if it keeps a tally. */
  tally?: number;
  /** Pins earned and stuck on it (see ./pins), at most three. */
  pins?: string[];
  /** A seasonal copy's drop day, `YYYY-MM-DD`; it is part of what the copy is. */
  date?: string;
  /** A souvenir: the day's free capsule for finishing every game, and that day. */
  souvenir?: string;
  /** A rare effect on top of the finish (see ./effects). */
  fx?: Fx;
}
declare const GRADES: readonly [{
  readonly id: "everyday";
  readonly name: "Everyday";
  readonly color: "#4B69FF";
}, {
  readonly id: "special";
  readonly name: "Special";
  readonly color: "#8847FF";
}, {
  readonly id: "prized";
  readonly name: "Prized";
  readonly color: "#D32CE6";
}, {
  readonly id: "mythic";
  readonly name: "Mythic";
  readonly color: "#EB4B4B";
}, {
  readonly id: "grail";
  readonly name: "★ Grail";
  readonly color: "#E4AE39";
}, {
  readonly id: "aura";
  readonly name: "★ Aura";
  readonly color: "#19D3C5";
}];
type Grade = (typeof GRADES)[number];
/**
 * Each finish: its grade, the chance a capsule rolls it, and the scuff range
 * it can come in. The flashy finishes only exist barely worn, so there is no
 * Battered Nebula.
 */
declare const FINISHES: Record<Finish, {
  name: string;
  grade: number;
  odds: number;
  scuffs: [number, number];
  aura?: number;
}>;
/** Condition, by scuff, in the words toy collectors use. */
declare const WEAR: readonly [{
  readonly name: "Mint in Box";
  readonly short: "MIB";
  readonly max: 0.07;
}, {
  readonly name: "Like New";
  readonly short: "LN";
  readonly max: 0.15;
}, {
  readonly name: "Played With";
  readonly short: "PW";
  readonly max: 0.38;
}, {
  readonly name: "Well Loved";
  readonly short: "WL";
  readonly max: 0.45;
}, {
  readonly name: "Battered";
  readonly short: "BT";
  readonly max: 1.01;
}];
declare function wearOf(scuff: number): {
  readonly name: "Mint in Box";
  readonly short: "MIB";
  readonly max: 0.07;
} | {
  readonly name: "Like New";
  readonly short: "LN";
  readonly max: 0.15;
} | {
  readonly name: "Played With";
  readonly short: "PW";
  readonly max: 0.38;
} | {
  readonly name: "Well Loved";
  readonly short: "WL";
  readonly max: 0.45;
} | {
  readonly name: "Battered";
  readonly short: "BT";
  readonly max: 1.01;
};
/** The famous prints. A Tempered copy with one of these comes out nearly all blue. */
declare const DEEP_BLUE_PRINTS: number[];
/** A Tempered copy's tint, from its print. */
declare function temperTint(print: number): string;
/** A Nebula copy's look, from its print: three rare ones, otherwise one of four. */
declare function nebulaPhase(print: number): string;
/** What makes this copy special beyond its finish, if anything. */
declare function special(o: Owned): string | undefined;
declare function gradeOf(o: Owned): Grade;
/** The name as it would show on an inventory card. */
declare function nameOf(o: Owned): string;
/**
 * A copy as one short string, to store or put in a URL:
 * `puttsies.ball~nebula~0.0123456~20`; with a tally `…~20~t412`; with pins
 * `…~p` and their ids joined by `+`, as in `…~t412~pstar+flame`.
 */
declare function encode(o: Owned): string;
declare function decode(s: string): Owned | null;
/**
 * The copy every player has from the start: their game's free hat, plain, with
 * a scuff and print taken from their name. Everyone gets one, and everyone's
 * is a little different — a lucky name gets a 0.003 Mint in Box.
 */
declare function starter(name: string, game: GameId): Owned;
/**
 * Opens a capsule for a game: one of its items (the free hat aside), with a
 * finish, scuff, print and maybe a tally, all rolled from `seed`.
 *
 * The seed decides everything, so the same seed always opens the same thing.
 * In production the seed must come from the server — a random value made at
 * drop time and stored with the copy — never from anything a player picks.
 */
declare function roll(seed: string, game: GameId): Owned;
/**
 * A seasonal drop: one of the hats in season on `day` (`YYYY-MM-DD`), rolled
 * like a capsule and stamped with the day. Null when nothing is in season.
 */
declare function rollSeason(seed: string, day: string): Owned | null;
/** Which slot a copy goes in. */
declare function slotOf(o: Owned): Slot | undefined;

//#endregion
//#region src/types.d.ts
/**
 * Paints one cell of an owned item: its finish, then its wear. Chips land in
 * places fixed by the print, so a copy always wears the same way, and how many
 * show is the scuff. `glint` is set once the first Mint in Box glint has been
 * placed.
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
 * 20–28 the equipped skin's own colours, 30–38 the hat's, 40–48 the frame's,
 * 50–58 the buddy's
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
  /** The rare Lucky colour variant: about one name in 400. */
  lucky?: boolean;
  rotation: number;
  /** Equipped item ids (see `items`). A skin replaces the body, a hat the topper. */
  skin?: string;
  hat?: string;
  frame?: string;
  /** A tiny pet that sits beside him. */
  buddy?: string;
  /** An aura round him (see ./auras). */
  aura?: string;
  /** The owned copies behind those items, if known: finish, scuff, print. */
  owned?: Partial<Record<'skin' | 'hat' | 'frame' | 'buddy' | 'aura', Owned>>;
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
  /**
   * What to wear, at most one per slot; later entries win. Each entry is an
   * item id (`puttsies.ball`) or an owned copy from `encode`
   * (`puttsies.ball~nebula~0.0123456~20`). Anything unrecognised is ignored.
   */
  equip?: string[];
  /**
   * Accessible name for the avatar. Omit when the avatar sits beside the name
   * it represents — it is then marked decorative, which is what a screen
   * reader wants. Pass it when the avatar is the only identifier.
   */
  title?: string;
  /**
   * Draw for a small size: solid eyes, darker ink, no soft highlight, so the
   * face still reads at a pixel or two a cell. `toSvgString` turns it on at
   * 36px and under; pass `false` to keep the full drawing.
   */
  small?: boolean;
}
declare const GRID_SIZE = 16;

//#endregion
//#region src/lil-guy.d.ts
interface LilGuyProps extends Omit<React$5.HTMLAttributes<HTMLDivElement>, "children"> {
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
  onRenderMouth?: () => React$5.ReactNode;
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
declare const LilGuy: React$5.ForwardRefExoticComponent<LilGuyProps & React$5.RefAttributes<HTMLDivElement>>;

//#endregion
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
type AvatarProps = React$4.HTMLAttributes<HTMLSpanElement> & {
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
declare const Avatar: React$4.ForwardRefExoticComponent<React$4.HTMLAttributes<HTMLSpanElement> & {
  /** Render as the child element instead of a span */
  asChild?: boolean;
} & React$4.RefAttributes<HTMLSpanElement>>;

//#endregion
//#region src/avatar-fallback.d.ts
type AvatarFallbackProps = Omit<React$3.HTMLAttributes<HTMLSpanElement>, "children"> & {
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
  children?: React$3.ReactNode;
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
declare const AvatarFallback: React$3.ForwardRefExoticComponent<Omit<React$3.HTMLAttributes<HTMLSpanElement>, "children"> & {
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
  children?: React$3.ReactNode;
  /**
   * Use the LilGuy pixel avatar as fallback instead of initials.
   * @default true
   */
  lilGuy?: boolean;
  /**
   * Props to pass to the LilGuy component.
   */
  lilGuyProps?: Omit<LilGuyProps, "name">;
} & React$3.RefAttributes<HTMLSpanElement>>;

//#endregion
//#region src/avatar-image.d.ts
type ImageLoadingStatus = "idle" | "loading" | "loaded" | "error";
type AvatarImageProps = Omit<React$2.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
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
declare const AvatarImage: React$2.ForwardRefExoticComponent<Omit<React$2.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  /**
   * The image source URL. If empty or undefined, triggers error state.
   */
  src?: string | null;
  /**
   * Callback when the image loading status changes.
   */
  onLoadingStatusChange?: (status: ImageLoadingStatus) => void;
} & React$2.RefAttributes<HTMLImageElement>>;

//#endregion
//#region src/render-string.d.ts
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
/** One name in this many gets the Lucky colour variant. */
declare const LUCKY_ODDS = 400;
/**
 * Seeds made from deal 3 on start with this. They draw from today's parts and
 * weights; anything else (an older seed, a plain name) draws from the frozen
 * deal 2 tables, so a guy already dealt never changes when parts are added.
 */
declare const DEAL_PREFIX = "3-";
/** Which deal an input draws from. */
declare const dealOf: (input: string) => 2 | 3;
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
/**
 * The Lucky variant: the same colourway turned round the colour wheel, with
 * gold trim. Derived again, so the face and outline read as well as ever.
 */
declare function luckyPalette(palette: Palette): Palette;
/** The palette a guy is drawn in: his colourway, in his tone, Lucky if he is. */
declare function paletteOf(config: AvatarConfig): Palette;

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
//#region src/paint.d.ts
/**
 * Turns a composed grid into colours. Most cells take their token's palette
 * colour; a cell belonging to an owned item is repainted with that copy's
 * finish and wear.
 */
declare function paint(grid: PixelGrid, config: AvatarConfig, palette: Palette, small?: boolean, still?: boolean): (string | null)[][];
/** At or under this many pixels across, a guy is drawn for a small size (`forSmall`). */
declare const SMALL_SIZE = 36;

//#endregion
//#region src/animate.d.ts
/**
 * Animations for games: a guy that hops, waves, cheers, sulks.
 *
 * Every move is a short list of frames drawn on the same pixels as the still
 * avatar — the body squashes by losing a row and stretches by repeating one,
 * eyes close and glance by moving their own pixels — so nothing is ever
 * resampled or blurred. Frames are 16 wide and 20 tall: the guy stands in the
 * bottom 16 rows exactly as he does in the still, and the 4 rows above are
 * room to jump into.
 *
 * Rarity shows in the frames too, so it reads in any game without a shader:
 * from Special up a shine sweeps across the item, from Prized up a ring in the
 * grade's colour pulses around the guy, and Mythic and Grail copies throw off
 * sparkles.
 */
declare const MOVES: readonly ["idle", "blink", "hop", "wave", "look", "cheer", "sad", "dance", "squish", "sleep"];
type Move = (typeof MOVES)[number];
/** Rows of room above the guy for jumps. */
declare const HEADROOM = 4;
declare const FRAME_WIDTH = 16;
declare const FRAME_HEIGHT: number;
interface AnimationFrame {
  /** FRAME_HEIGHT rows of FRAME_WIDTH colours; null is transparent. */
  colors: (string | null)[][];
  /**
   * Which worn item each pixel belongs to: 0 none, 1 skin, 2 hat, 3 frame,
   * 4 buddy (`FRAME_SLOTS`). A shader uses it to run each copy's finish on
   * that copy's own pixels (see ./shine).
   */
  slots: number[][];
  /** How long the frame shows. */
  ms: number;
}
interface Animation {
  move: Move;
  width: number;
  height: number;
  frames: AnimationFrame[];
  /** All the frames' times added up. */
  duration: number;
}
interface AnimateOptions extends RenderOptions {
  /** Show the best equipped copy's grade: shine, aura, sparkles and a trail. Default true. */
  rarity?: boolean;
  /** An emote to show over the whole move, bobbing beside his head. */
  emote?: Emote;
}
/** Little pictures that pop up beside his head. */
type Emote = 'note' | 'question' | 'bang' | 'heart' | 'zzz' | 'crown' | 'fire';
/**
 * Emotes a player can show after a game, and how each is unlocked. The
 * moves use some on their own; `emote` in the options shows one over any move.
 */
declare const EMOTE_UNLOCKS: {
  id: Emote;
  name: string;
  how: string;
}[];
/**
 * The same guy with his eyes shut: each eye drops to a line on its bottom row
 * and the cells it leaves show whatever the body has there. Derived, not
 * drawn, so it works for every eye part.
 */
declare function closeEyes(grid: PixelGrid, config: AvatarConfig): PixelGrid;
/** The order of `AnimationFrame.slots`, from 1. */
declare const FRAME_SLOTS: readonly ["skin", "hat", "frame", "buddy", "aura"];
/**
 * Builds the frames of a move for the guy `input` would render as. Takes the
 * same options as `toSvgString` (game, equip, parts, palette).
 */
declare function animate(input: string, move: Move, options?: AnimateOptions): Animation;
/** The frame showing `ms` into the animation, looping unless `once`. */
declare function frameAt(animation: Animation, ms: number, once?: boolean): AnimationFrame;
/** Anything with a 2D canvas's fillStyle and fillRect: a canvas, an OffscreenCanvas, a test double. */
interface PixelTarget {
  fillStyle: string | CanvasGradient | CanvasPattern;
  fillRect(x: number, y: number, w: number, h: number): void;
}
/** Draws a frame at (x, y), each pixel `scale` units square. */
declare function drawFrame(ctx: PixelTarget, frame: AnimationFrame, x?: number, y?: number, scale?: number): void;
interface AnimatedSvgOptions extends AnimateOptions {
  /** Width in pixels; the height is a quarter more. Default 128. */
  size?: number;
  /** Play once and hold the last frame. Default false: loop. */
  once?: boolean;
  /**
   * Hold still on the first frame when the viewer asks for reduced motion.
   * Off by default: the DLE Club games play motion whatever that setting says.
   */
  stillWhenReduced?: boolean;
}
/**
 * The animation as one self-contained SVG: every frame is a group, and a CSS
 * animation shows them in turn. Works as an <img>, inline, or as a file.
 */
declare function toAnimatedSvg(input: string, move: Move, options?: AnimatedSvgOptions): string;

//#endregion
//#region src/pins.d.ts
/**
 * What a copy collects by being worn: pins, earned for things done in the
 * games and stuck onto the item, and tally marks, scratched into it as its
 * tally climbs.
 *
 * - 30 days: two marks along its bottom edge
 * - 100 days: four
 * - 365 days: and its outline turns gold
 *
 * Neither is rolled. The club grants pins and counts the days; the library
 * only draws them, on the item's own pixels, so they move with it.
 */
interface Pin {
  id: string;
  name: string;
  /** How a player earns it. */
  how: string;
  art: Stamp;
}
/**
 * Each pin is its own silhouette, so the gold ones never read alike: a
 * twinkling star, a zigzag bolt, a crown with a red jewel. Append only: copies
 * store pin ids.
 */
declare const PINS: Pin[];
/** A copy holds at most this many pins. */
declare const MAX_PINS = 3;
declare const pinById: (id: string) => Pin | undefined;
/** The tally marks a copy shows for its tally: none, 2 or 4. */
declare function tallyMarks(tally: number | undefined): number;
/** A year of days: the item's outline goes gold. */
declare const GOLD_RIM_DAYS = 365;

//#endregion
//#region src/utils/merge-refs.d.ts
type PossibleRef<T> = React$1.Ref<T> | React$1.RefCallback<T> | undefined | null;
/**
 * Merges multiple refs into a single callback ref.
 * Useful for forwarding refs to a component while also using a local ref.
 */
declare function mergeRefs<T>(refs: PossibleRef<T>[]): React$1.RefCallback<T> | null;
/**
 * Hook version of mergeRefs that memoizes the result.
 */
declare function useMergeRefs<T>(refs: PossibleRef<T>[]): React$1.RefCallback<T> | null;

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
//#region src/rarity.d.ts
/**
 * How rare things are, as "one in N".
 *
 * A guy's rarity is the chance of rolling his exact combination of visible
 * traits — shape, eyes, mouth, cheeks, topper, markings, accessory and
 * colourway — so a laser-eyed guy in a crown is rarer than one with bean eyes
 * and no hat. A copy's rarity is the chance a capsule gives exactly that: its
 * item, its finish, a print as special as its print, a scuff at least as low
 * as its scuff, and a tally if it has one.
 */
interface TraitOdds {
  slot: string;
  name: string;
  /** Chance of this trait, 0–1. */
  chance: number;
}
/** Each visible trait of a guy and how likely it was. */
declare function traitOdds(config: AvatarConfig): TraitOdds[];
/** One in how many guys has exactly this combination. */
declare function guyOneIn(config: AvatarConfig): number;
/** One in how many capsules for its game give a copy at least this good. */
declare function copyOneIn(o: Owned): number;

//#endregion
//#region src/look.d.ts
/**
 * Keeping rarity real.
 *
 * A guy's rare traits only mean something if nobody can choose them. Two
 * rules make that so:
 *
 * 1. **Draw the guy from a seed, not the name on the board.** A name can be
 *    typed and changed, so anyone could try names until a rare guy came out,
 *    and a rename would change him. The club makes a random seed once
 *    (`makeSeed`), keeps it with the player, and draws from that:
 *    `toSvgString(seed, …)`, `starter(seed, game)`. The name stays a label.
 * 2. **A picker offers only common parts, plus the player's own.** A part
 *    someone rolled stays theirs to keep; a rare part they didn't roll can't be
 *    picked.
 *
 * Picked looks are saved as versioned codes (`2:h3.e5…`), so a later change to
 * the parts can't silently turn a saved look into someone else.
 */
/** A slot in a look code: its letter, its config key and its weights. */
declare const SLOTS: readonly [readonly ["h", "head", number[]], readonly ["e", "eyes", number[]], readonly ["m", "mouth", number[]], readonly ["c", "cheeks", number[]], readonly ["t", "hair", number[]], readonly ["b", "body", number[]], readonly ["a", "accessory", number[]], readonly ["p", "palette", number[]]];
type LookSlot = (typeof SLOTS)[number][1];
type Look = Partial<Record<LookSlot, number>>;
/**
 * A random seed to draw a new player's guy from, made once and kept: the deal
 * prefix (`3-`), then 12 characters of base 36, about 62 bits.
 */
declare function makeSeed(): string;
/** Which options a player may pick in a slot: every common one, and their own. */
declare function pickable(own: AvatarConfig, slot: LookSlot): number[];
/** Whether a look only uses parts this player may pick. */
declare function allowed(own: AvatarConfig, look: Look): boolean;
/** A picked look as a versioned code: `2:h3.e5.p17`, only the slots picked. */
declare function encodeLook(look: Look): string;
/**
 * A code back into a look, or null for anything that isn't a version-2 code
 * this library can draw: an old seven-number code from before 0.2, a part out
 * of range, or (given the player's own guy) a rare part they didn't roll.
 */
declare function decodeLook(code: string, own?: AvatarConfig): Look | null;
/** A player's guy: from their seed, with their picked look laid over it. */
declare function lookOf(seed: string, code?: string): AvatarConfig;

//#endregion
//#region src/share.d.ts
/**
 * A card to share a copy: the guy wearing it, big, and what makes it rare.
 * 1200×630, the size link previews use, as one SVG string with no fonts or
 * images to fetch, so a server can turn it into a PNG for an og:image.
 */
interface ShareOptions {
  /** The player's name, shown as a label. The guy is drawn from `input`. */
  name?: string;
  /** Small line at the bottom, like the site's address. */
  footer?: string;
  /** The guy as the player has him: a picked look laid over `input` (see `lookOf`). */
  config?: AvatarConfig;
}
declare function toShareSvg(input: string, copy: Owned, options?: ShareOptions): string;

//#endregion
//#region src/lil-guy-animated.d.ts
interface LilGuyAnimatedProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children" | "title"> {
  /** The seed the guy is drawn from. */
  name: string;
  /** Which move to play. */
  move: Move;
  /** Width in pixels; the height is a quarter more, for jumps. @default 64 */
  size?: number;
  /** Dress him for a game: its free hat unless `equip` says otherwise. */
  game?: GameId;
  /** Item ids or encoded copies to wear. */
  equip?: string[];
  /** Pin specific parts. */
  parts?: RenderOptions["parts"];
  /** An emote to show over the move. */
  emote?: Emote;
  /** Play once and hold the last frame. @default false */
  once?: boolean;
  /** Show the best copy's grade in the frames. @default true */
  rarity?: boolean;
  /** Accessible name; without it the guy is decorative. */
  title?: string;
}
/**
 * A lil guy playing a move: the library's animated SVG, which plays itself
 * with CSS, so there is no timer running in React.
 *
 * @example
 * ```tsx
 * <LilGuyAnimated name={player.seed} move="cheer" equip={[player.hat]} size={96} />
 * ```
 */
declare function LilGuyAnimated({
  name,
  move,
  size,
  game,
  equip,
  parts,
  emote,
  once,
  rarity,
  title,
  style,
  ...props
}: LilGuyAnimatedProps): react_jsx_runtime1.JSX.Element;

//#endregion
//#region src/shine.d.ts
/**
 * A frame as the shader reads it: its colours, and for each pixel the finish,
 * scuff and print of the copy it belongs to. Two RGBA byte arrays, 16×20.
 */
declare function shineData(frame: AnimationFrame, owned?: AvatarConfig['owned']): {
  colors: Uint8Array;
  info: Uint8Array;
};
interface Shine {
  /** The 16×20 canvas the shader draws into; copy it out with drawImage. */
  canvas: HTMLCanvasElement | OffscreenCanvas;
  /** Draws a frame with its copies' finishes `ms` into the shimmer. */
  draw(frame: AnimationFrame, owned: AvatarConfig['owned'], ms: number): void;
}
/** One shader to share across a page or a game, or null without WebGL. */
declare function createShine(canvas?: HTMLCanvasElement | OffscreenCanvas): Shine | null;

//#endregion
//#region src/voxel.d.ts
/**
 * Pixels to 3D: a guy, or one item on its own, as voxel columns, and the
 * columns as one mesh. Nothing here draws: a mesh is positions, normals and
 * colours a 3D engine takes as they are (three.js's BufferGeometry), split
 * into groups by the surface each finish should have, with the points a
 * convex collider needs.
 *
 * Each pixel is a column, deeper the further it sits inside the silhouette,
 * so a guy comes out pillow-round rather than a slab. Eyes and mouth stand
 * proud of the face, a hat sits forward, a frame becomes a plate behind
 * him and a buddy is its own little figure. An item on its own stays
 * shallow, since it is only a few pixels tall.
 */
/** What a frame holds: a colour per pixel and which worn copy it belongs to (0 none, 1 skin, 2 hat, 3 frame, 4 buddy). */
interface VoxelSource {
  colors: (string | null)[][];
  slots: number[][];
}
type SurfaceKind = Finish | 'body';
/** A physically based surface, in the terms three.js's MeshPhysicalMaterial takes. */
interface Surface {
  kind: SurfaceKind;
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  /** Thin-film rainbow as it turns (Prism). */
  iridescence: number;
  /** Soft satin sheen (Sunset). */
  sheen: number;
  /** Light from inside, as a share of the surface's own colour (Nebula, Negative). */
  glow: number;
}
/** A finish's surface, worn: scuff roughens it and dulls its coat, in tenths so copies share materials. */
declare function surfaceOf(kind: SurfaceKind, scuff?: number): Surface;
/** One pixel as a column: its middle in pixel units (y up, the grid centred on 0), how deep, its colours and surface. */
interface VoxelColumn {
  x: number;
  y: number;
  z: number;
  depth: number;
  /** The front and sides, sRGB hex, darkened where a deeper neighbour shades it. */
  color: string;
  /** The back: the body's colour behind an eye or mouth. */
  back: string;
  /** The sides behind a thin rim of `color`: the body's colour where the front is the dark outline, so the outline reads as a line drawn on the front, not a dark wall. */
  side: string;
  slot: number;
  surface: Surface;
  /** How far an eye or mouth stands proud of the body: left out of the mesh's shading. */
  lift: number;
}
interface VoxelOptions {
  /** An item on its own: shallow columns, nothing pushed forward. */
  item?: boolean;
  /** At most this many pixels deep, front to back, everything squeezed to fit (a game's pile piece keeps to its collider). */
  deepest?: number;
}
/** A frame (an animation frame, or `itemFrame`) as columns, each worn copy's pixels on its finish's surface. */
declare function voxelColumns(frame: VoxelSource, owned?: Partial<Record<Slot, Owned>>, options?: VoxelOptions): VoxelColumn[];
/** One copy on its own, cut out of a guy wearing it: a 16×16 frame with only the item's pixels. */
declare function itemFrame(o: Owned, seed?: string): VoxelSource;
/** One copy on its own as columns. */
declare function voxelItem(o: Owned): VoxelColumn[];
/** Worn copies by slot, from their codes, for `voxelColumns` on a guy's animation frames. */
declare function ownedOf(codes: readonly string[]): Partial<Record<Slot, Owned>>;
interface VoxelMesh {
  /** Triangles, not indexed: three floats a vertex. */
  positions: Float32Array;
  normals: Float32Array;
  /** Linear RGB (sRGB decoded), as three.js wants vertex colours. */
  colors: Float32Array;
  /** Vertex ranges sharing a surface: one material each. */
  groups: {
    start: number;
    count: number;
    surface: Surface;
  }[];
  /** The silhouette's corners, front and back, and the front and back of every column inside it: enough for a convex collider or a box. */
  hull: Float32Array;
  min: [number, number, number];
  max: [number, number, number];
}
/**
 * Columns as one mesh, `cell` units a pixel, with faces between touching
 * columns left out. Normals come from a softened height map of the columns
 * (eyes and mouth left out of it), so a figure shades as one domed, moulded
 * toy with its edges rolling off round, while every pixel keeps its flat
 * colour; `smooth: false` gives each face its own flat normal instead.
 */
declare function voxelMesh(columns: readonly VoxelColumn[], cell?: number, options?: {
  smooth?: boolean;
}): VoxelMesh;

//#endregion
//#region src/auras.d.ts
/**
 * Auras: the top of the ladder, above a Grail. An aura is an effect drawn in
 * the empty pixels round a guy, never over him, so it shows on a board row as
 * well as on a card, and it moves whenever he does.
 *
 * About one capsule in a thousand, from any machine, is an aura instead of the
 * machine's own item (`AURA_ODDS`). A copy of one has a finish of its own (the
 * aura finishes in ./owned), a float and a print like any copy, and here they
 * show: a low float is a dense aura, a battered one flickers with gaps, and the
 * print sets its timing and which way it turns.
 */
/** One capsule in this many is an aura. */
declare const AURA_ODDS: number;
/** A cell of an aura: where, and which of its colours (0 brightest). */
type AuraCell = [x: number, y: number, k: number];
/** Where the guy is: `true` for each pixel he covers. */
type Mask = boolean[][];
interface Aura extends Pick<Item, 'id' | 'name' | 'colors'> {
  /** The cells to light at `t` ms, round the guy in `mask`. */
  cells: (mask: Mask, t: number, print: number) => AuraCell[];
  /** The moment a still picture shows. */
  still: number;
}
declare const AURAS: Aura[];
/**
 * Auras no capsule gives: the founder's Origin, a gold halo with stars going
 * round him and a shimmer in every colour. One of one.
 */
declare const ONE_OF_ONE_AURAS: Aura[];
declare const auraById: (id: string | undefined) => Aura | undefined;
/**
 * An aura's cells round `mask` at `t`, only in empty pixels and inside the
 * frame, thinned by the copy's float: a Mint in Box aura is whole, a battered
 * one flickers with gaps.
 */
declare function auraCells(id: string, mask: Mask, t: number, copy?: Owned): AuraCell[];
/**
 * The colour of one aura cell in a finish. Fade runs its sunset down the aura
 * and drifts; the Deep sea finishes glint; Black pearl glints in every colour.
 */
declare function auraColor(id: string, k: number, finish: string, x: number, y: number, t: number): string;

//#endregion
//#region src/collector.d.ts
/**
 * What a collector looks for in a copy beyond its grade: the small facts that
 * make two copies of the same item in the same finish worth different things.
 * None of them change how rare the item is; they are why one copy of it is the
 * one people want.
 */
interface Note {
  id: string;
  /** A short badge. */
  name: string;
  /** One line on why it matters. */
  why: string;
  /** About one copy in this many has it. */
  oneIn: number;
}
/** Every note that applies to a copy, most wanted first. */
declare function collectorNotes(o: Owned): Note[];

//#endregion
export { AURAS, AURA_ODDS, AnimateOptions, AnimatedSvgOptions, Animation, AnimationFrame, Avatar, AvatarConfig, AvatarContextValue, AvatarFallback, AvatarFallbackProps, AvatarImage, AvatarImageProps, AvatarProps, ColorToken, DEAL_PREFIX, DEEP_BLUE_PRINTS, DEFAULT_COLORS, DEFAULT_COLORS_DARK, DEFAULT_COLORS_LIGHT, EFFECTS, EMOTE_UNLOCKS, Effect, Emote, FINISHES, FOOT_STYLES, FRAME_HEIGHT, FRAME_SLOTS, FRAME_WIDTH, FX_IDS, Finish, Fx, GAMES, GOLD_RIM_DAYS, GRADES, GRID_SIZE, GameId, Grade, HEADROOM, Intensity3D, Item, ItemGame, LUCKY_ODDS, LilGuy, LilGuyAnimated, LilGuyAnimatedProps, LilGuyProps, Look, LookSlot, MAX_PINS, MOVES, Move, Note, ONE_OF_ONE_AURAS, Owned, PINS, Palette, Pin, PixelGrid, PixelTarget, RenderOptions, SHADE_COUNT, SMALL_SIZE, ShareOptions, Shine, Slot, Surface, SurfaceKind, TraitOdds, VoxelColumn, VoxelMesh, VoxelOptions, VoxelSource, WEAR, accessories, allowed, animate, applyFx, auraById, auraCells, auraColor, bodies, cheeks, closeEyes, collectorNotes, compose, composeBase, copyOneIn, createShine, dealOf, decode, decodeLook, drawFrame, dress, encode, encodeLook, eyes, frameAt, freeItem, fxColor, gameItems, getColor, getPalette, gradeOf, guyOneIn, hair, hash, hashNth, heads, inSeason, itemById, itemFrame, items, lookOf, luckyPalette, makeSeed, mergeRefs, mouths, nameOf, nebulaPhase, ownedOf, paint, paletteOf, palettes, pickable, pinById, resolve, resolveColor, roll, rollFx, rollSeason, shadePalette, shineData, slotOf, special, starter, surfaceOf, tallyMarks, temperTint, toAnimatedSvg, toPng, toShareSvg, toSvgString, traitOdds, useAvatarContext, useMergeRefs, voxelColumns, voxelItem, voxelMesh, wearOf, withItems };
//# sourceMappingURL=index.d.cts.map