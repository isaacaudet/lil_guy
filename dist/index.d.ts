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
* has its phase. Every copy from a capsule rolls once for one, on its own,
* whatever its finish or grade; an aura is far more likely to get one, so aura
* effects make a ladder of their own. They run from Shimmer, one copy in 25,
* to Electric, one in 4,000. Listed commonest first; new ones are added in
* their place on the ladder (copies keep the effect they rolled).
*
* An effect moves in `animate`, and shows in a still picture as it stands at
* the start. It never changes the item's own drawing, only how it shines.
*/
/**
 * Effects: a rare layer a copy can roll on top of its finish, the way a knife
 * has its phase. Every copy from a capsule rolls once for one, on its own,
 * whatever its finish or grade; an aura is far more likely to get one, so aura
 * effects make a ladder of their own. They run from Shimmer, one copy in 25,
 * to Electric, one in 4,000. Listed commonest first; new ones are added in
 * their place on the ladder (copies keep the effect they rolled).
 *
 * An effect moves in `animate`, and shows in a still picture as it stands at
 * the start. It never changes the item's own drawing, only how it shines.
 */
type Fx = 'shimmer' | 'pulse' | 'holo' | 'neon' | 'bubbles' | 'hearts' | 'chroma' | 'rime' | 'embers' | 'static' | 'lava' | 'starlight' | 'electric';
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
 * `FRAME_SLOTS`), `copies` the copy in each slot. Some effects also draw in
 * the empty pixels round their copy: bubbles, hearts and embers rise off it,
 * a neon tube and electric bolts run round it.
 *
 * On an aura the effect is an accent, not a flood: the aura's own pieces take
 * it, nothing is drawn round its scattered cells, and its signature (hearts,
 * bubbles, sparks, a strike) rises off it more sparingly than off an item.
 */
declare function applyFx(colors: (string | null)[][], slots: number[][], copies: (({
  fx?: Fx;
  print: number;
}) | undefined)[], t: number): (string | null)[][];

//#endregion
//#region src/parts/art.d.ts

/** A small drawing: rows of tokens, not necessarily 16 wide. */
type Stamp = number[][];
//#endregion
//#region src/parts/canvas.d.ts
interface RowExtent {
  left: number;
  right: number;
}
/** Where the face landed, once compose has placed the eyes and mouth. */
interface Face {
  /** First and last row of the eyes. */
  top: number;
  line: number;
  /** Each eye's columns, left to right: two for a pair, one for a cyclops. */
  eyes: RowExtent[];
  /** First and last row of the mouth. */
  mouthTop: number;
  mouthBottom: number;
  /** The mouth's art. */
  mouth: Stamp;
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
  /** The very top of the head at its middle (on a pointed head, the tip). Hats see `crown` as `hatTop`. */
  readonly tip: number;
  /** Where the eyes and mouth go; set by compose before anything is worn. */
  face: Face | null;
  private readonly body;
  /**
   * The silhouette is everything the starting drawing covers — a plain body,
   * or a skin like a jar or a golf ball, which is drawn in its own colours.
   */
  constructor(grid: PixelGrid, eyeLine: number);
  /**
   * Places the face: the eye stamp's bottom row on the eye line, the mouth's
   * top row just under it, both centred. Everything worn is fitted to this.
   */
  setFace(eye: Stamp, mouth: Stamp): void;
  /**
   * The mouth's top row goes just under the eyes, unless a pixel of it would
   * sit right under an eye: eyes that run into a mouth turn a face into one
   * shape (an H, a box), and it stops reading as eyes and a mouth. Then the
   * mouth drops a row where the head has room for it, with a column of face
   * either side. Where it hasn't (a heart's point, a bat), it stays put:
   * taking the corners off a smile left a frown.
   */
  private placeMouth;
  /**
   * The row a collar, scarf or necklace goes on: three under the eye line, or
   * the first row under a mouth that reaches lower, where the body still has one.
   */
  get neck(): number;
  /**
   * The lowest row a hat or topper may paint on the head: it stops at least one
   * row above the eyes (two where the head has the room), so nothing worn on
   * top ever covers the face.
   */
  get floor(): number;
  /**
   * The first row wide enough to wear a hat on. On a round head it is the
   * crown; on a pointed one it is where the point has widened out, so a cap
   * sits round the head instead of balancing on its tip.
   */
  get hatTop(): number;
  /**
   * The canvas as hats and toppers see it: its `crown` is `hatTop`, so every
   * "a row under the crown" lands on the head and not on a point.
   */
  forHats(): Canvas;
  /** A copy to try something on: the same measurements over its own grid. */
  clone(): Canvas;
  /**
   * The same canvas with the head built up `k` rows into a dome, for a cap to
   * wrap on a head with almost no forehead. Returns the dome's cells too, so
   * whatever the cap leaves of them can be taken away again.
   */
  domed(k: number): {
    canvas: Canvas;
    dome: [number, number][];
  };
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
} //#endregion
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
  /** One line on what it is, for items that don't explain themselves. */
  about?: string;
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
 *   battered. The condition (Box Fresh … Battered) is a range of it, and
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
  readonly name: "Box Fresh";
  readonly short: "BF";
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
  readonly name: "Box Fresh";
  readonly short: "BF";
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
 * is a little different — a lucky name gets a 0.003 Box Fresh.
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
 * show is the scuff. `glint` is set once the first Box Fresh glint has been
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
 * Seeds made now start with this. They draw from today's parts and weights;
 * an older seed draws from its own deal's frozen tables (`3-` from deal 3,
 * anything else, plain names included, from deal 2), so a guy already dealt
 * never changes when parts are added or weights move.
 */
declare const DEAL_PREFIX = "4-";
/** Which deal an input draws from. */
declare const dealOf: (input: string) => 2 | 3 | 4;
declare function resolve(input: string, overrides?: RenderOptions['parts']): AvatarConfig;

//#endregion
//#region src/parts/weights.d.ts
/**
 * Picks an index from a weight table using a hash value, so the result is
 * deterministic for a given input and the distribution follows the weights.
 */
/**
 * Eyes no guy has any more: never dealt, picked or drawn. They stay in their
 * arrays (an index is what a saved look or game stores), so every other part
 * keeps its place. 16 is the cyclops.
 */
declare const RETIRED_EYES: readonly number[];

//#endregion
//#region src/compose.d.ts
/** A slot's weights with its retired parts at zero. */
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
  /** `face` goes on before the eyes, `over` after them (it covers an eye), `body` after the face. */
  layer: 'face' | 'over' | 'body';
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
  /** Where its own-clock things (auras, effects, finishes) are, in ms. */
  at?: number;
  /**
   * A rare aura's cells that fall past the frame's sides, as `[x, y, colour]`
   * with x from -AURA_PAD to FRAME_WIDTH + AURA_PAD - 1. Only there when there
   * are some; a picture with room round the guy (a card) draws them, anything
   * else can leave them out.
   */
  outside?: [number, number, string][];
}
/** How many columns past each side of the frame a rare aura may reach (`outside`). */

interface Animation {
  move: Move;
  width: number;
  height: number;
  frames: AnimationFrame[];
  /** All the frames' times added up. */
  duration: number;
  /** Whether anything moves on its own clock (an aura, an effect, sparkles), not just with the move. */
  timed: boolean;
}
interface AnimateOptions extends RenderOptions {
  /** Show the best equipped copy's grade: shine, aura, sparkles and a trail. Default true. */
  rarity?: boolean;
  /** An emote to show over the whole move, bobbing beside his head. */
  emote?: Emote;
  /**
   * Play the move `repeats` times with everything on its own clock (auras,
   * effects, sparkles) running through `turns` LOOP_MS in that time, so the
   * loop closes perfectly (see ./bake's `shineFit`). The clock is worked out
   * from whole milliseconds into the loop, so every lap reads the same times
   * to the last bit.
   * `fine` cuts frames to 80 ms for a finish to move in. A lap is played first
   * and left out, so what carries from frame to frame (a trail) is already
   * there at the start.
   */
  loop?: {
    repeats: number;
    turns: number;
    fine?: boolean;
  };
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
/**
 * The move as a loop that closes perfectly: as it is when nothing moves on its
 * own clock, else played the whole number of times that fits whole turns of
 * LOOP_MS (`fitLoop`). What to hand `frameAt`, a player or an animated SVG.
 */
declare function animateLoop(input: string, move: Move, options?: AnimateOptions): Animation;
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
 * traits — shape, eyes, mouth, cheeks, topper, markings, accessory, colourway,
 * tone, arms, feet and whether he is Lucky — so a laser-eyed guy in a crown is rarer than one with bean eyes
 * and no hat. A copy's rarity is the chance a capsule gives exactly that: its
 * item, its finish, a print as special as its print, a scuff at least as low
 * as its scuff, and a tally if it has one.
 */
/** The twelve traits, in the order `traitOdds` lists them. */
declare const TRAIT_SLOTS: readonly ["shape", "eyes", "mouth", "cheeks", "topper", "markings", "accessory", "colour", "tone", "arms", "feet", "lucky"];
type TraitSlot = (typeof TRAIT_SLOTS)[number];
/** Names for the traits that are only an index: tone (`shade`), arms and feet. */
declare const TONE_NAMES: readonly ["pastel", "as picked", "vivid"];
declare const ARM_NAMES: readonly ["none", "by the sides", "waving"];
declare const FOOT_NAMES: readonly ["nubs", "tiptoes", "wide", "socks", "tucked"];
interface TraitOdds {
  slot: TraitSlot;
  name: string;
  /** Chance of this trait, 0–1. */
  chance: number;
}
/** Each of a guy's twelve traits and how likely it was, always in `TRAIT_SLOTS` order. */
declare function traitOdds(config: AvatarConfig): TraitOdds[];
/** One in how many guys has exactly this combination. */
declare function guyOneIn(config: AvatarConfig): number;
/** One in how many capsules for its game give a copy at least this good. */
declare function copyOneIn(o: Owned): number;
/** A guy's tiers, commonest first: each is the share of guys at least that rare. */
declare const GUY_TIERS: readonly [{
  readonly id: "common";
  readonly name: "Common";
  readonly top: 1;
}, {
  readonly id: "uncommon";
  readonly name: "Uncommon";
  readonly top: 0.5;
}, {
  readonly id: "rare";
  readonly name: "Rare";
  readonly top: 0.1;
}, {
  readonly id: "epic";
  readonly name: "Epic";
  readonly top: 0.01;
}, {
  readonly id: "legendary";
  readonly name: "Legendary";
  readonly top: 0.001;
}, {
  readonly id: "mythic";
  readonly name: "Mythic";
  readonly top: 0.0001;
}];
interface GuyRank {
  /** The share of guys at least this rare, 0–1: 0.003 is the rarest 0.3%. */
  top: number;
  /** Index into `GUY_TIERS`, 0 Common to 5 Mythic. */
  tier: number;
  name: string;
  /** "Top 0.3%", or "Common" for the commoner half. */
  label: string;
}
/**
 * What a guy's rank is measured on: the odds of his whole combination, with his
 * single rarest trait counted twice. One standout (galaxy eyes, Lucky) is what
 * people see as rare, more than a handful of slightly unusual picks.
 */
declare function guyScore(config: AvatarConfig): number;
/**
 * Where a guy stands among every guy dealt: "one in 56 billion" says every
 * combination is unique, which they all are, so a card shows this instead.
 */
declare function guyRank(config: AvatarConfig): GuyRank;

//#endregion
//#region src/icons.d.ts
declare const TRAIT_ICONS: Record<TraitSlot, string>;
/** The rarity tiers the site shows, rising: a pip, a diamond, a gem, a star, a crown. */
type Tier = 'Common' | 'Uncommon' | 'Rare' | 'Legendary' | 'Chase';
declare const TIER_ICONS: Record<Tier, string>;

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
 * The finishes, moving: a WebGL shader that runs each worn copy's finish on
 * that copy's own pixels — Sunset's sheen, Tempered's glint, Nebula's drift,
 * Prism's rainbow, Negative's pulse, Gold's sparkle — while the guy plays a
 * move. Scuffed pixels shine less, the way they're painted.
 *
 * Browsers allow only a handful of WebGL contexts per page, so make one shine
 * and share it: draw each guy into it in turn and copy the result out with
 * `drawImage` into that guy's own 2D canvas. Without WebGL `createShine`
 * returns null; draw the frame's colours as they are.
 */
/**
 * A frame as the shader reads it: its colours; for each pixel the finish,
 * scuff and print of the copy it belongs to; and each pixel's noise. Three
 * RGBA byte arrays, 16×20.
 */
declare function shineData(frame: AnimationFrame, owned?: AvatarConfig['owned']): {
  colors: Uint8Array;
  info: Uint8Array;
  noise: Uint8Array;
};
/** Whether any pixel of the frame belongs to a copy with a finish that shimmers. */
declare const shines: (frame: AnimationFrame, owned?: AvatarConfig["owned"]) => boolean;
/**
 * The shader's picture, in plain code: the frame with each copy's finish
 * running `ms` into its loop, as RGBA bytes. The same colours the GPU draws.
 */
declare function shineFrame(frame: AnimationFrame, owned: AvatarConfig['owned'], ms: number): Uint8ClampedArray;
/** The shader, for a game that runs its own WebGL: textures \`base\`, \`info\`, \`noise\` from shineData, \`time\` in loop seconds. */
declare const SHINE_FRAGMENT = "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n\nvarying vec2 uv;\nuniform sampler2D base, info, noise;\nuniform float time;\n\nconst float TAU = 6.28318530718;\nvec3 hsv(vec3 c) { vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0); return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y); }\nvec3 hueShift(vec3 c, float a) {\n  const mat3 toYIQ = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);\n  const mat3 toRGB = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);\n  vec3 yiq = toYIQ * c;\n  float h = atan(yiq.z, yiq.y) + a, ch = length(yiq.yz);\n  return toRGB * vec3(yiq.x, ch * cos(h), ch * sin(h));\n}\nfloat band(float d, float time, float print) { return 1.0 - clamp(abs(mod(d - time * 10.0 + print, 60.0) - 30.0) - 0.5, 0.0, 1.0); }\nvec3 finishColor(vec3 c, float finish, float scuff, float h, float d, float row, float print, float time, float scan) {\n  float b = band(d, time, print);\n  float twinkle = step(0.965, fract(h * 13.0 + time / 3.0));\n  float coat = clamp(1.0 - scuff * 1.4, 0.0, 1.0) * step(scuff * 0.55, h);\n  if (finish < 0.5) c += b * 0.45 * step(scuff, 0.07);\n  else if (finish < 1.5) { float s = 0.5 + 0.5 * sin(d * 0.8 - time * TAU / 2.0 + print); c = mix(c, c * vec3(0.86, 0.96, 1.18) + 0.08, 0.4 * s * coat) + b * 0.5 * coat; }\n  else if (finish < 2.5) c += twinkle * 0.55 * coat + b * 0.25 * coat;\n  else if (finish < 3.5) { c = hueShift(c, (time * TAU / 6.0 + d * 0.22) * coat); c = mix(c, vec3(1.0), twinkle * coat); }\n  else if (finish < 4.5) {\n    vec3 rain = hsv(vec3(fract(d * 0.07 - time / 3.0 + print * 0.013), 0.65, 1.0));\n    c = mix(c, c * 0.45 + rain * 0.75, 0.6 * coat);\n    c *= 1.0 + 0.12 * scan * step(mod(row + floor(time * 10.0), 3.0), 0.5);\n  }\n  else if (finish < 5.5) c += vec3(0.28, 0.12, 0.45) * b * coat + 0.07 * sin(time * TAU / 3.0 + d * 0.5) * coat;\n  else c += b * 0.7 * coat + vec3(1.0, 0.9, 0.5) * twinkle * 0.6 * coat;\n  return c;\n}\n\nvoid main() {\n  vec2 res = vec2(16.0, 20.0);\n  vec2 cell = floor(uv * res);\n  vec2 at = (cell + 0.5) / res;\n  vec4 b = texture2D(base, at);\n  if (b.a < 0.5) { gl_FragColor = vec4(0.0); return; }\n  vec3 c = b.rgb;\n  vec4 k = texture2D(info, at);\n  float finish = floor(k.r * 255.0 / 32.0 + 0.5) - 1.0;\n  if (k.a > 0.5 && finish >= 0.0) c = finishColor(c, finish, k.g, texture2D(noise, at).r, cell.x + cell.y, cell.y, floor(k.b * 255.0 + 0.5) * 4.0, time, 0.0);\n  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);\n}";
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
 * An aura's cells round `mask` at `t`, only in empty pixels, thinned by the
 * copy's float: a Box Fresh aura is whole, a battered one flickers with gaps.
 * A rarer finish adds more (`extras`). With `pad`, those extras may spread
 * that many columns past either side of the frame (x from -pad to
 * width + pad - 1), for a picture with room round the guy, like a card.
 */
declare function auraCells(id: string, mask: Mask, t: number, copy?: Owned, pad?: number): AuraCell[];
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
//#region src/collect.d.ts
/**
 * What a collector does with copies beyond opening them: name one, put five
 * into a trade up, and fill a machine's set. The site and the Worker both use
 * these, so a tag, a trade's float and a set read the same everywhere.
 */
/** The longest name tag. */
declare const TAG_MAX = 20;
/**
 * A name tag as it would be stored: spaces tidied, at most `TAG_MAX`
 * characters. `''` takes a tag off; null means it can't be used.
 */
declare function cleanTag(raw: string): string | null;
/** Where a float sits within what its finish can roll, 0 (cleanest) to 1. */
declare function floatShare(o: {
  finish: Finish;
  scuff: number;
}): number;
/**
 * A trade up's float, the way CS works it out: how clean each input is within
 * its own finish, averaged, then placed at the same point in the result's
 * finish. Five clean inputs make a clean result, whatever comes out.
 */
declare function tradeFloat(inputs: {
  finish: Finish;
  scuff: number;
}[], out: Finish): number;
/** Which machine a trade up's result comes from: each game's share of the inputs. */
declare function tradeGames(inputs: Owned[]): Partial<Record<ItemGame, number>>;
/** A machine's set: every item its capsules give (starters and auras aside). */
declare function machineSet(game: ItemGame): Item[];
/** How far a collection is through a machine's set: which of its items are owned, in any finish. */
declare function setProgress(game: ItemGame, owned: Owned[]): {
  items: Item[];
  have: Set<string>;
  got: number;
  total: number;
  complete: boolean;
};

//#endregion
//#region src/gif.d.ts
/**
 * Animated GIFs and PNGs from RGBA frames, with no dependencies, so a card or
 * a guy can be saved anywhere the library runs (a browser, a game's server,
 * a script). Pixel art stays crisp: frames are scaled up by whole pixels,
 * never smoothed.
 */
interface Frames {
  width: number;
  height: number;
  /** RGBA, `width * height * 4` bytes each. Alpha under 128 is transparent. */
  frames: Uint8ClampedArray[];
  /** How long each frame shows, in milliseconds. */
  delays: number[];
}
/** Each pixel made a `scale` by `scale` block. */
declare function upscale(rgba: Uint8ClampedArray, width: number, height: number, scale: number): Uint8ClampedArray;
/**
 * An animated GIF that loops forever. Transparent pixels stay transparent
 * (each frame clears to them), so a guy can be saved without a background.
 */
declare function encodeGif(input: Frames, scale?: number): Uint8Array;
/** A PNG of one RGBA frame, scaled up by whole pixels. */
declare function encodePng(rgba: Uint8ClampedArray, width: number, height: number, scale?: number): Promise<Uint8Array>;
/**
 * An animated PNG of the frames, looping for ever. Browsers play it in a plain
 * `<img>` with no script, keep its transparency whole, and a still viewer
 * shows its first frame. Scale it up by whole pixels here, or in CSS with
 * `image-rendering: pixelated`.
 */
declare function encodeApng(input: Frames, scale?: number): Promise<Uint8Array>;

//#endregion
//#region src/card.d.ts
/**
 * Trading cards, drawn by the library so every game, the site and an export
 * show the same card: a guy wearing his copies, moving, each copy's finish
 * shining on its own pixels, its effect playing, the card's face dressed for
 * the grade, and the words written in the club's pixel type.
 *
 * A card is `CARD_WIDTH` by `CARD_HEIGHT` card pixels, six to each of the
 * guy's pixels, so a shine can sweep across a single pixel of a hat. Scale it
 * up by whole numbers to show it; `toCardGif` and `toCardPng` do that for you.
 */
declare const CARD_WIDTH = 140;
declare const CARD_HEIGHT = 204;
interface CardInput {
  /** The guy: a name or a seed, as for `animate`. */
  seed: string;
  /** His parts and colours when they aren't the ones the seed deals (a picked look). */
  parts?: AnimateOptions['parts'];
  palette?: AnimateOptions['palette'];
  /** What he wears. The rarest sets the card's grade unless `grade` says. */
  copies?: Owned[];
  /** Across the top band. */
  title: string;
  /** A tag in the window's top-right corner, such as a print number. */
  corner?: string;
  /** Up to two lines under the grade pips. */
  lines?: string[];
  /** 0 Everyday to 5 Aura; -1 for a plain card. */
  grade?: number;
  /** How he moves on the card. Default `idle`. */
  move?: Move;
}
/** How wide a line of text is, in pixels. */
declare const textWidth: (s: string) => number;
/**
 * The card as frames, `ms` apart, covering one loop of his move (at least two
 * seconds, so a shine gets across). Every frame is the whole card in RGBA;
 * the corners are transparent.
 */
declare function cardFrames(input: CardInput, ms?: number): Frames;
/**
 * A card to play on screen: each frame is drawn the first time it is asked
 * for and kept, so a page can show a card at once and spread the work out.
 * It loops perfectly: his move played the whole number of times that fits
 * whole turns of LOOP_MS, with every sheen on the card on the same clock.
 */
declare function cardPlayer(input: CardInput, ms?: number): {
  width: number;
  height: number;
  count: number;
  delay: number;
  delays: number[];
  /** The frame showing at `i` (wraps round). */
  frame(i: number): Uint8ClampedArray;
};
/** The card standing still, for a picture. */
declare function cardStill(input: CardInput, t?: number): Uint8ClampedArray;
/** The card as a looping GIF, each card pixel `scale` by `scale`. */
declare function toCardGif(input: CardInput, scale?: number): Uint8Array;
/** The card as a PNG, each card pixel `scale` by `scale`. */
declare function toCardPng(input: CardInput, scale?: number): Promise<Uint8Array>;
/**
 * The guy on his own as a looping GIF: his move with everything he wears,
 * effects and auras moving, on a transparent background or `background`.
 */
declare function toGuyGif(seed: string, move: Move, options?: AnimateOptions & {
  background?: string;
}, scale?: number): Uint8Array;

//#endregion
//#region src/loop.d.ts
/**
 * Everything that moves on its own clock (auras, effects, finishes, a Lucky
 * guy's sheen, live eyes, sparkles) repeats in LOOP_MS, so any loop of a whole
 * number of LOOP_MS closes perfectly: its last frame runs into its first like
 * any other frame. Each motion keeps its own speed as near as it can, nudged
 * so a whole number of its cycles fill LOOP_MS, and anything drawn from noise
 * per step or per generation draws the same noise again each LOOP_MS.
 */
declare const LOOP_MS = 6000;
/** `v` brought into 0 to `n`, negative numbers too. */

/**
 * How many times to play something `duration` ms long so everything on its own
 * clock comes round with it: the plays that get closest to whole turns of
 * LOOP_MS (`turns`), the clock running `speed` times as fast to close exactly.
 */
declare function fitLoop(duration: number): {
  repeats: number;
  turns: number;
  speed: number;
};

//#endregion
//#region src/finish-shader.d.ts
/**
 * The finishes' shimmer, written twice: as GLSL for a page or a game that has
 * WebGL, and as plain code that gives the same colours anywhere (a server, a
 * test, a browser without WebGL). Both read the same inputs: a pixel's colour,
 * its copy's finish, scuff and print, a fixed noise value for the pixel, and
 * the time. Two things keep them the same:
 *
 * - Nothing random is computed on the GPU. A sine hash comes out differently
 *   on every graphics card, so each pixel's noise is made here (`noiseOf`) and
 *   handed to the shader in a texture.
 * - Every movement repeats in `LOOP_MS`, so a baked loop closes without a jump
 *   and the GPU never sees a large time.
 *
 * `scripts/verify-shaders.mjs` runs the GLSL in a browser and checks it
 * against the plain code, pixel by pixel.
 */
/** The finishes in the order the shaders number them. */
declare const SHADER_FINISHES: readonly ["plain", "sunset", "tempered", "nebula", "prism", "negative", "gold"];
/** A pixel's noise, 0 to 255: the same for a cell and print everywhere. */
declare const noiseOf: (x: number, y: number, print: number) => number;
/** Highest precision the device has: mediump is 16-bit on phones, too coarse for the bands. */

declare const GLSL_COMMON = "\nconst float TAU = 6.28318530718;\nvec3 hsv(vec3 c) { vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0); return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y); }\nvec3 hueShift(vec3 c, float a) {\n  const mat3 toYIQ = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);\n  const mat3 toRGB = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);\n  vec3 yiq = toYIQ * c;\n  float h = atan(yiq.z, yiq.y) + a, ch = length(yiq.yz);\n  return toRGB * vec3(yiq.x, ch * cos(h), ch * sin(h));\n}\nfloat band(float d, float time, float print) { return 1.0 - clamp(abs(mod(d - time * 10.0 + print, 60.0) - 30.0) - 0.5, 0.0, 1.0); }\nvec3 finishColor(vec3 c, float finish, float scuff, float h, float d, float row, float print, float time, float scan) {\n  float b = band(d, time, print);\n  float twinkle = step(0.965, fract(h * 13.0 + time / 3.0));\n  float coat = clamp(1.0 - scuff * 1.4, 0.0, 1.0) * step(scuff * 0.55, h);\n  if (finish < 0.5) c += b * 0.45 * step(scuff, 0.07);\n  else if (finish < 1.5) { float s = 0.5 + 0.5 * sin(d * 0.8 - time * TAU / 2.0 + print); c = mix(c, c * vec3(0.86, 0.96, 1.18) + 0.08, 0.4 * s * coat) + b * 0.5 * coat; }\n  else if (finish < 2.5) c += twinkle * 0.55 * coat + b * 0.25 * coat;\n  else if (finish < 3.5) { c = hueShift(c, (time * TAU / 6.0 + d * 0.22) * coat); c = mix(c, vec3(1.0), twinkle * coat); }\n  else if (finish < 4.5) {\n    vec3 rain = hsv(vec3(fract(d * 0.07 - time / 3.0 + print * 0.013), 0.65, 1.0));\n    c = mix(c, c * 0.45 + rain * 0.75, 0.6 * coat);\n    c *= 1.0 + 0.12 * scan * step(mod(row + floor(time * 10.0), 3.0), 0.5);\n  }\n  else if (finish < 5.5) c += vec3(0.28, 0.12, 0.45) * b * coat + 0.07 * sin(time * TAU / 3.0 + d * 0.5) * coat;\n  else c += b * 0.7 * coat + vec3(1.0, 0.9, 0.5) * twinkle * 0.6 * coat;\n  return c;\n}\n";
type Vec3 = [number, number, number];
/** `finishColor` from GLSL_COMMON. `finish` is an index in SHADER_FINISHES. */
declare function finishColor(c: Vec3, finish: number, scuff: number, h: number, d: number, row: number, print: number, time: number, scan: number): Vec3;

//#endregion
//#region src/card-face.d.ts
/** A colour channel as the GPU stores it. */
/**
 * The trading card a guy or an item is shown on: a 26×42 face, its window
 * tinted by grade, the guy standing in it, grade pips under him. The face
 * shimmers by grade (a sheen, foil, holo, gold) and each worn copy's pixels by
 * their finish, all in `LOOP_MS`. Its words (name, print, odds) are the page's
 * to write over it.
 *
 * The face is built once (`cardFace`), then drawn at a time either by the GPU
 * (`CARD_FRAGMENT`, `createCardShader`) or in plain code (`cardFaceAt`), with
 * the same result.
 */
declare const FACE_WIDTH = 26;
declare const FACE_HEIGHT = 42;
interface FaceSpec {
  /** The guy's seed or name. */
  name: string;
  /** Picked parts (a look), as `resolve` takes them. */
  parts?: Parameters<typeof resolve>[1];
  /** A palette index, overriding the dealt one. */
  palette?: number;
  /** The copies he wears. */
  copies?: Owned[];
  /** The grade the card is shown at; by default the best of his copies'. */
  grade?: number;
  /** The window's tint when there's no grade. */
  tint?: string;
}
interface CardFace {
  /** Colours, 26×42 RGBA. */
  base: Uint8Array;
  /** Per pixel: what it is (card, window, guy, item), its copy's finish, scuff and print. */
  kind: Uint8Array;
  /** Per pixel noise, in the red channel. */
  noise: Uint8Array;
  grade: number;
  negative: boolean;
  /** Where the face's wide band starts: the last copy's print. */
  seed: number;
}
/** The card's face, ready to draw at any time. */
declare function cardFace(spec: FaceSpec): CardFace;
/** Whether a face changes over time at all: a plain card with no finishes is one picture. */
declare const faceMoves: (f: CardFace) => boolean;
/** The pointer's light on a card (a page's hover): where it is, 0 to 1 across and down, and how strong. */
interface Hover {
  x: number;
  y: number;
  strength: number;
}
/** The face `ms` into its loop, in plain code: RGBA bytes, the same the GPU draws. */
declare function cardFaceAt(f: CardFace, ms: number, hover?: Hover): Uint8ClampedArray;
/** The face's shader, for a page or a game with WebGL: textures `base`, `kind`, `noise` from `cardFace`. */
declare const CARD_FRAGMENT = "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n\nvarying vec2 uv;\nuniform sampler2D base, kind, noise;\nuniform float time, hover, grade, neg, seed;\nuniform vec2 light;\n\nconst float TAU = 6.28318530718;\nvec3 hsv(vec3 c) { vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0); return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y); }\nvec3 hueShift(vec3 c, float a) {\n  const mat3 toYIQ = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);\n  const mat3 toRGB = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);\n  vec3 yiq = toYIQ * c;\n  float h = atan(yiq.z, yiq.y) + a, ch = length(yiq.yz);\n  return toRGB * vec3(yiq.x, ch * cos(h), ch * sin(h));\n}\nfloat band(float d, float time, float print) { return 1.0 - clamp(abs(mod(d - time * 10.0 + print, 60.0) - 30.0) - 0.5, 0.0, 1.0); }\nvec3 finishColor(vec3 c, float finish, float scuff, float h, float d, float row, float print, float time, float scan) {\n  float b = band(d, time, print);\n  float twinkle = step(0.965, fract(h * 13.0 + time / 3.0));\n  float coat = clamp(1.0 - scuff * 1.4, 0.0, 1.0) * step(scuff * 0.55, h);\n  if (finish < 0.5) c += b * 0.45 * step(scuff, 0.07);\n  else if (finish < 1.5) { float s = 0.5 + 0.5 * sin(d * 0.8 - time * TAU / 2.0 + print); c = mix(c, c * vec3(0.86, 0.96, 1.18) + 0.08, 0.4 * s * coat) + b * 0.5 * coat; }\n  else if (finish < 2.5) c += twinkle * 0.55 * coat + b * 0.25 * coat;\n  else if (finish < 3.5) { c = hueShift(c, (time * TAU / 6.0 + d * 0.22) * coat); c = mix(c, vec3(1.0), twinkle * coat); }\n  else if (finish < 4.5) {\n    vec3 rain = hsv(vec3(fract(d * 0.07 - time / 3.0 + print * 0.013), 0.65, 1.0));\n    c = mix(c, c * 0.45 + rain * 0.75, 0.6 * coat);\n    c *= 1.0 + 0.12 * scan * step(mod(row + floor(time * 10.0), 3.0), 0.5);\n  }\n  else if (finish < 5.5) c += vec3(0.28, 0.12, 0.45) * b * coat + 0.07 * sin(time * TAU / 3.0 + d * 0.5) * coat;\n  else c += b * 0.7 * coat + vec3(1.0, 0.9, 0.5) * twinkle * 0.6 * coat;\n  return c;\n}\n\nvoid main() {\n  vec2 res = vec2(26.0, 42.0);\n  vec2 cell = floor(uv * res);\n  vec2 at = (cell + 0.5) / res;\n  vec4 b = texture2D(base, at);\n  if (b.a < 0.5) { gl_FragColor = vec4(0.0); return; }\n  vec3 c = b.rgb;\n  vec4 kd = texture2D(kind, at);\n  float k = floor(kd.r * 4.0 + 0.5);\n  float finish = floor(kd.g * 255.0 / 32.0 + 0.5) - 1.0;\n  float print = floor(kd.a * 255.0 + 0.5) * 4.0;\n  float h = texture2D(noise, at).r;\n  float d = cell.x + cell.y;\n  float wide = 1.0 - clamp(abs(mod(d - time * 10.0 + seed, 60.0) - 30.0) / 3.0, 0.0, 1.0);\n  if (k > 3.5 && finish >= 0.0) c = finishColor(c, finish, kd.b, h, d, cell.y, print, time, 1.0);\n  else if (k < 2.5) {\n    if (neg > 0.5) c = mix(vec3(1.0) - c, vec3(0.36, 0.2, 0.62), 0.25);\n    if (grade > 0.5 && grade < 1.5) c += wide * 0.08;\n    else if (grade > 1.5 && grade < 2.5) { float s = 0.5 + 0.5 * sin(d * 0.55 - time * TAU / 3.0); c = mix(c, c * vec3(0.82, 0.94, 1.2) + 0.06, 0.45 * s) + wide * 0.12; }\n    else if (grade > 2.5 && grade < 3.5) { if (k > 1.5) c = hueShift(c, time * TAU / 6.0 + d * 0.18); c += wide * 0.12; }\n    else if (grade > 3.5) { if (k < 1.5) c = mix(c, vec3(1.0, 0.82, 0.36), 0.35 + 0.2 * wide); c = mix(c, vec3(1.0, 0.95, 0.7), step(0.965, fract(h * 13.0 + time / 3.0)) * 0.8); }\n  }\n  c += (1.0 - smoothstep(0.0, 0.34, distance(at, light))) * 0.35 * hover;\n  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);\n}";
interface CardShader {
  /** The 26×42 canvas the shader draws into; copy it out with drawImage. */
  canvas: HTMLCanvasElement | OffscreenCanvas;
  /** Draws a face `ms` into its loop, with a hover light if given. */
  draw(face: CardFace, ms: number, hover?: Hover): void;
}
/** One card shader to share across a page or a game, or null without WebGL. */
declare function createCardShader(canvas?: HTMLCanvasElement | OffscreenCanvas): CardShader | null;

//#endregion
//#region src/guy-code.d.ts
/**
 * A guy as an address carries him, and the art version every address names.
 * Kept apart from the renderer so a page that only shows guys from the lil
 * guys Worker (`<lil-guy>` with a host) can build their addresses without
 * shipping the library.
 */
/**
 * Bumped whenever the art changes. It is part of every baked image's address,
 * so a redraw reaches every board at once and an old address keeps its picture.
 */
declare const ART_VERSION = 1;
/** Everything that makes a guy look the way he does. */
interface GuySpec {
  /** His seed, or the name or text he is drawn from. */
  seed: string;
  /** Parts laid over the dealt ones (a picked look, a founder's guy). */
  parts?: AnimateOptions['parts'];
  /** A palette index laid over the dealt one. */
  palette?: number;
  /** The copies he wears, as `encode` writes them. */
  equip?: string[];
}
/** What a card shows, as an address carries it. */
interface CardSpec extends GuySpec {
  /** The grade the card is shown at; by default the best of his copies'. */
  grade?: number;
  /** The window's tint when there's no grade. */
  tint?: string;
}
/** A spec as a short, address-safe code. Anything that draws the same guy gives the same code. */
declare function guyCode(spec: CardSpec): string;
/** A baked guy's size, and a card's. */
declare const BAKED_SIZE: {
  readonly guy: {
    readonly width: 22;
    readonly height: 20;
  };
  readonly card: {
    readonly width: 26;
    readonly height: 42;
  };
};
/** What a baked picture shows: a move looping, his still, or his card. */
type View = string;

//#endregion
//#region src/element.d.ts
/**
 * `<lil-guy>`: a guy, finished, in any page.
 *
 *   <lil-guy name="mia"></lil-guy>                 a claimed name, as he's worn (needs a host)
 *   <lil-guy seed="Sneaky Gumdrop"></lil-guy>      a guy drawn from any text
 *   <lil-guy code="eyJzIjoi…"></lil-guy>           an exact guy (`guyCode`), or set `.spec`
 *   view="idle"   a move looping (default), or `still`, `card`, `card-still`
 *   size="4"      screen pixels per art pixel (default 4)
 *   label="mia"   what a screen reader says; without it he's decorative
 *
 * With a host (`defineLilGuy({ host })`) it is an `<img>` of the Worker's
 * picture: no library on the page, cached for good. Without one it plays the
 * same frames, baked in the page by the library, which is what the lil guys
 * site does. Either way the picture is the library's plain-code renderer's,
 * so it matches the URL pixel for pixel.
 */
interface LilGuyOptions {
  /** Where the lil guys Worker is, e.g. `https://lilguys.dleclub.com`. */
  host?: string;
  /** Bakes a view of a spec or a code in the page (the full library passes its own); without it a host is needed. */
  bake?: (guy: CardSpec | string, view: string) => Frames | null;
  /** The element's tag, `lil-guy` by default. */
  tag?: string;
}

//#endregion
//#region src/bake.d.ts
/** Defines `<lil-guy>` (once per tag). */
/**
 * A guy or his card, finished: every frame as a page with WebGL draws it,
 * auras, effects, emotes and his copies' finishes included, ready to save as
 * an image or play anywhere. The lil guys Worker serves these (`/g/`), the
 * `<lil-guy>` element plays them, and the lil guys site shows them, all from
 * this one function, so a guy is the same wherever he turns up.
 */
/** A baked guy is his frame with room for a rare aura's rings either side: the same size for every guy. */
declare const GUY_WIDTH: number;
declare const GUY_HEIGHT: number;
/** A spec as `animate` takes it: what `<lil-guy>`, the Worker and the site all draw from. */
declare function animateOptions(spec: GuySpec): AnimateOptions;
/** How many times to play a move so everything on its own clock comes round with it (./loop's `fitLoop`). */
declare const shineFit: typeof fitLoop;
/**
 * A guy playing a move, every frame finished, as a loop that closes perfectly:
 * a guy with nothing on its own clock is his move; one with an aura, an
 * effect, sparkles or a shimmering copy plays the move the whole number of
 * times that fits whole turns of LOOP_MS, everything on its own clock running
 * through without a jump.
 */
declare function bakeGuy(spec: GuySpec, move?: Move): Frames;
/** The guy's card face over one turn of its shimmer (a single frame if it doesn't shimmer). */
declare function bakeCard(spec: FaceSpec): Frames;
/** The frames side by side in one strip, with how long each shows: a sprite sheet for a game. */
declare function sheetOf(f: Frames): {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  delays: number[];
};
/** The image a baked guy or card is served as. */
type BakedKind = 'loop' | 'still' | 'sheet';
/** Bakes and encodes: an animated PNG (`loop`), its first frame (`still`), or a sprite strip (`sheet`). */
declare function bakedImage(frames: Frames, kind: BakedKind, scale?: number): Promise<Uint8Array>;
/** A code back into a spec, or null for anything that isn't one. */
declare function readGuyCode(code: string): CardSpec | null;
/** A card spec as the face builder takes it. */
declare function faceSpec(spec: CardSpec): FaceSpec;
/** Whether a move name is one this library plays. */
declare const isMove: (m: string) => m is Move;
/**
 * A view as the Worker serves it and `<lil-guy>` plays it: a move looping
 * (`idle`, `hop`…), `still` (his first idle frame), `card` or `card-still`.
 * Null for a view there isn't.
 */
declare function bakeView(spec: CardSpec, view: string): Frames | null;
/** `<lil-guy>` with the library on the page: baked in the page, or from a host if given. */
declare function defineLilGuyHere(options?: Omit<LilGuyOptions, 'bake'>): void;

//#endregion
export { ARM_NAMES, ART_VERSION, AURAS, AURA_ODDS, AnimateOptions, AnimatedSvgOptions, Animation, AnimationFrame, Avatar, AvatarConfig, AvatarContextValue, AvatarFallback, AvatarFallbackProps, AvatarImage, AvatarImageProps, AvatarProps, BAKED_SIZE, BakedKind, CARD_FRAGMENT, CARD_HEIGHT, CARD_WIDTH, CardFace, CardInput, CardShader, CardSpec, ColorToken, DEAL_PREFIX, DEEP_BLUE_PRINTS, DEFAULT_COLORS, DEFAULT_COLORS_DARK, DEFAULT_COLORS_LIGHT, EFFECTS, EMOTE_UNLOCKS, Effect, Emote, FACE_HEIGHT, FACE_WIDTH, FINISHES, FOOT_NAMES, FOOT_STYLES, FRAME_HEIGHT, FRAME_SLOTS, FRAME_WIDTH, FX_IDS, FaceSpec, Finish, Frames, Fx, GAMES, GLSL_COMMON, GOLD_RIM_DAYS, GRADES, GRID_SIZE, GUY_HEIGHT, GUY_TIERS, GUY_WIDTH, GameId, Grade, GuyRank, GuySpec, HEADROOM, Hover, Intensity3D, Item, ItemGame, LOOP_MS, LUCKY_ODDS, LilGuy, LilGuyAnimated, LilGuyAnimatedProps, LilGuyOptions, LilGuyProps, Look, LookSlot, MAX_PINS, MOVES, Move, Note, ONE_OF_ONE_AURAS, Owned, PINS, Palette, Pin, PixelGrid, PixelTarget, RETIRED_EYES, RenderOptions, SHADER_FINISHES, SHADE_COUNT, SHINE_FRAGMENT, SMALL_SIZE, ShareOptions, Shine, Slot, Surface, SurfaceKind, TAG_MAX, TIER_ICONS, TONE_NAMES, TRAIT_ICONS, TRAIT_SLOTS, Tier, TraitOdds, TraitSlot, View, VoxelColumn, VoxelMesh, VoxelOptions, VoxelSource, WEAR, accessories, allowed, animate, animateLoop, animateOptions, applyFx, auraById, auraCells, auraColor, bakeCard, bakeGuy, bakeView, bakedImage, bodies, cardFace, cardFaceAt, cardFrames, cardPlayer, cardStill, cheeks, cleanTag, closeEyes, collectorNotes, compose, composeBase, copyOneIn, createCardShader, createShine, dealOf, decode, decodeLook, defineLilGuyHere as defineLilGuy, drawFrame, dress, encode, encodeApng, encodeGif, encodeLook, encodePng, eyes, faceMoves, faceSpec, finishColor, floatShare, frameAt, freeItem, fxColor, gameItems, getColor, getPalette, gradeOf, guyCode, guyOneIn, guyRank, guyScore, hair, hash, hashNth, heads, inSeason, isMove, itemById, itemFrame, items, lookOf, luckyPalette, machineSet, makeSeed, mergeRefs, mouths, nameOf, nebulaPhase, noiseOf, ownedOf, paint, paletteOf, palettes, pickable, pinById, readGuyCode, resolve, resolveColor, roll, rollFx, rollSeason, setProgress, shadePalette, sheetOf, shineData, shineFit, shineFrame, shines, slotOf, special, starter, surfaceOf, tallyMarks, temperTint, textWidth, toAnimatedSvg, toCardGif, toCardPng, toGuyGif, toPng, toShareSvg, toSvgString, tradeFloat, tradeGames, traitOdds, upscale, useAvatarContext, useMergeRefs, voxelColumns, voxelItem, voxelMesh, wearOf, withItems };
//# sourceMappingURL=index.d.ts.map