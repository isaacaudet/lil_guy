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
}) | undefined)[], t: number): (string | null)[][]; //#endregion
//#region src/parts/art.d.ts

/** A small drawing: rows of tokens, not necessarily 16 wide. */
type Stamp = number[][]; //#endregion
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
   * sit beside, under or at a corner of an eye pixel: eyes that run into a mouth
   * turn a face into one shape (an H, a box, a zigzag), and it stops reading as
   * eyes and a mouth. Then the mouth drops a row or two where the head has
   * room for it, with a column of face either side if it can. Where it hasn't
   * (a heart's point, a car's bumper), the eyes go up a row instead, and only
   * if neither works is a corner touch allowed.
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
  /** Pixels `set` turned away at the border: what a part lost off the edge (`hatCut` counts them). */
  refused: number;
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
  /**
   * Skins: which of the item's colours arms and feet are drawn in, or none.
   * `'own'` draws them in the guy's own colour, for a costume worn as a hood
   * or a hat with his own body showing under it.
   */
  limb?: number | 'own';
  /** Hats: draws onto the head. */
  draw?: (c: Canvas) => void;
  /** Frames: which of the item's colours fills a background cell. */
  fill?: (x: number, y: number) => number;
  /** A machine's showpiece: its standout item, rarer than the rest. */
  showpiece?: boolean;
  /** A showpiece's own effect: every copy of it moves this way. */
  signature?: Fx;
  /** Seasonal items: the days of the year they drop, as `MM-DD`, inclusive. */
  season?: {
    from: string;
    to: string;
  };
  /** Out of its machine (./sets): copies people own still read and draw, but no capsule gives one. */
  retired?: boolean;
}
/** The seasonal items that drop on a day (`YYYY-MM-DD` or a Date, read in UTC). */
declare function inSeason(day: string | Date): Item[];
/** Every item: the first lists, each machine's set laid over them (redraws, retirements), then its new items. */
declare const items: Item[];
declare function itemById(id: string | undefined): Item | undefined;
/** Each machine's own colour: its set symbol on a card, as the site's machines are painted. */

/** Every machine, in the order they joined: a new one goes on the end, so nothing else moves. */
declare const GAMES: GameId[];
/** What a machine is called: its game's name, or the Pet shop. */
declare const machineName: (game: GameId) => string;
/** How often a showpiece comes out of its machine, against 1 for every other item. */
declare const SHOWPIECE_WEIGHT = 0.5;
/** An item's weight in its machine's draw: none once it's retired. */
declare const itemWeight: (item: Item) => number;
/** A game's items: what its machine holds now. Retired ones are left out; `itemById` still finds them. */
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
/**
 * The guy's own colours a hat can be drawn in (cat ears in his fur), in the
 * order a finished copy takes them into the hat's layer after the hat's own
 * colours (`ownFinishTokens`), so its finish reaches them too. Outline and
 * face ink stay his.
 */

declare function withItems(palette: Palette, config: AvatarConfig): Palette;

//#endregion
//#region src/paints.d.ts
/**
 * Paint, as in TF2: a tin of one colour brushed over a hat or a buddy. It
 * tints every colour of the item to the paint, keeping each one's light and
 * shade, so the drawing reads as before, only in the new colour. Paint never
 * changes a copy's finish, float or rarity, and it scrapes off.
 */
declare const PAINTS: {
  readonly 'lack-of-hue': {
    readonly name: "A Lack of Hue";
    readonly hex: "#2D2B36";
  };
  readonly abundance: {
    readonly name: "An Abundance of White";
    readonly hex: "#EEEDE6";
  };
  readonly 'pure-gold': {
    readonly name: "Pure Gold";
    readonly hex: "#E7B53B";
  };
  readonly 'pink-as-heck': {
    readonly name: "Pink as Heck";
    readonly hex: "#FF6EB4";
  };
  readonly 'noble-violet': {
    readonly name: "Noble Violet";
    readonly hex: "#7D4FA6";
  };
  readonly 'zesty-lime': {
    readonly name: "Zesty Lime";
    readonly hex: "#8FD43A";
  };
  readonly 'deep-sea': {
    readonly name: "Deep Sea Teal";
    readonly hex: "#2E8C8A";
  };
  readonly 'club-orange': {
    readonly name: "Club Orange";
    readonly hex: "#E8792F";
  };
  readonly 'team-red': {
    readonly name: "Team Red";
    readonly hex: "#C2403F";
  };
  readonly 'team-blue': {
    readonly name: "Team Blue";
    readonly hex: "#4E7FB3";
  };
  readonly mint: {
    readonly name: "Mint Condition";
    readonly hex: "#A8DDB5";
  };
  readonly 'clear-skies': {
    readonly name: "Clear Skies";
    readonly hex: "#8CC4F2";
  };
};
type PaintId = keyof typeof PAINTS;
declare const PAINT_IDS: PaintId[];
/** What can be painted. */
declare const PAINTABLE: readonly ["hat", "buddy"];
/**
 * An item's colours under a paint: the first colour (an item's main one)
 * becomes the paint, and every other colour sits as much lighter or darker
 * than the paint as it did than the main one.
 */
declare function painted(colors: string[], paint: PaintId | undefined): string[];

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
 *   while wearing it (a Strange copy, as TF2 calls it)
 * - a **craft number** if it was crafted from metal (see ./craft), and a
 *   **paint** if someone painted it (see ./paints)
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
  /** Crafted from metal: which craft it was, counting every copy ever crafted. */
  craft?: number;
  /** A hat or a buddy's paint (see ./paints). */
  paint?: PaintId;
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
 * The machine a mystery capsule comes from: any of them, each as likely as its
 * share of every machine's capsule pool (the items a capsule can give, by
 * weight), so every item across the machines is as likely as it is in its own.
 * Then `roll(seed, game)` opens it as that machine's capsule.
 */
declare function mysteryMachine(seed: string): GameId;
/**
 * A seasonal drop: one of the hats in season on `day` (`YYYY-MM-DD`), rolled
 * like a capsule and stamped with the day. Null when nothing is in season.
 */
declare function rollSeason(seed: string, day: string): Owned | null;
/** Which slot a copy goes in. */
declare function slotOf(o: Owned): Slot | undefined;

//#endregion
//#region src/types.d.ts
/** Where one of an item's own colours sits for a finish (`toneOf`). */
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
/** The capsule machines: the DLE Club games that have items, and the Pet shop. */
type GameId = 'amountle' | 'halfsies' | 'stackdle' | 'flipsies' | 'puttsies' | 'weighsies' | 'cutsies' | 'tiltsies' | 'trackdle' | 'pets';
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
  /** The founder's guy (./founder): picked by hand, not dealt, and ranked the one of one. */
  founder?: boolean;
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
//#region src/founder.d.ts
/**
 * The founder: the lil guys site keeps the name "isaac" for the person who
 * made the DLE Club, and deals him this seed. He isn't dealt from it: he is a
 * clean guy in a crown, picked by hand, so `resolve(FOUNDER_SEED)` gives this
 * look with `founder: true`, and `guyRank` ranks him the one of one rather
 * than by his traits' odds. Anything that draws or ranks a guy from the
 * library (the site, the Worker, the club's games) agrees.
 */
declare const FOUNDER_SEED = "founder:isaac";
/** His parts (laid over his seed's rotation) and colourway. */
declare const FOUNDER_LOOK: {
  parts: {
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
    lucky: boolean;
  };
  palette: number;
};
/** The two copies no capsule gives, both his: the Gold flag and the Origin aura. */
declare const FOUNDER_COPIES: {
  flag: Owned;
  aura: Owned;
};
/** Whether a seed is the founder's. */
declare const isFounder: (seed: string) => boolean;
/** Whether a copy is one of the founder's own, which no capsule gives (in his locker, nobody else's). */
declare const isFounderCopy: (o: Owned) => boolean;

//#endregion
//#region src/parts/weights.d.ts
/**
 * Parts no deal gives: only a capsule unlocks them (`rollPart` in ../look),
 * and metal crafts them. Each weighs 0 in its table above, so every guy dealt
 * from any deal stays exactly as he was, and the weight here is its share
 * among a slot's rare parts when a capsule picks one, as a dealt part's
 * weight is. The anime set, October 2026.
 */
declare const CAPSULE_ONLY: Partial<Record<'eyes' | 'mouth' | 'cheeks', Record<number, number>>>;
/** A part's weight when a capsule unlocks one: its deal weight, or its capsule-only weight. */

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
/** Where a buddy stands, as `buddySpot` works it out. */

/**
 * His buddy on its own, its whole art (in the buddy's layer) and outline where
 * it stands beside him (`buddyBeside`), on a grid that wide: what a moving
 * picture draws for it, and an item view of a buddy shows.
 */
declare function buddyAlone(config: AvatarConfig): PixelGrid | undefined;
/**
 * The cells he covers in any frame of any move, on his sixteen columns and the one a step takes him past them, as
 * ./animate moves him: his still with either arm out, turned round, a step to
 * either side (a dance's, an oops), down two rows where a squash lowers him
 * and up one for the hop a buddy takes on its own (it hops higher only while
 * he is off the ground too). Tighter than `roomFor`, which allows two steps.
 */

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
/**
 * How many of a hat's pixels the guy it is on cuts off: painted where the
 * face's room begins (and taken back), or off the grid's edge. Zero for every
 * hat on every head and skin: a hat too tall or wide for the room is fitted
 * to it (`fitRoom` in ./item-art), never chopped.
 */

/**
 * Whether a guy's markings (`body`) or cheeks are drawn at all: on a crowded or
 * small guy one may give way, and then it is the same guy as without it.
 */
declare function shows(config: AvatarConfig, slot: 'body' | 'cheeks'): boolean;

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
/** The colourway a guy is drawn in: his own, unless a brown on a pointed head would read as a poo. */

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
 * made the old set look dead-eyed. Most also carry a pixel of the accent low
 * in the eye, a little colour on the far side from the shine, so a face isn't
 * only black dots.
 *
 * An eye's bottom row stays on the outer columns where it can (the inner
 * edges four apart): the mouth goes just under it, and a mouth pixel right
 * under an eye pixel makes them one shape (compose then has to move it).
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
 * room to jump into. A guy with a buddy gets wider frames: his sixteen
 * columns, then the buddy's own room to his right (`buddyBeside`), where it
 * stands on the floor with a little life of its own, never on him.
 *
 * Rarity shows in the frames too, so it reads in any game without a shader:
 * from Special up a shine sweeps across the item, from Prized up a ring in the
 * grade's colour pulses around the guy, and Mythic and Grail copies throw off
 * sparkles.
 *
 * Each guy keeps his own time. His idle is dealt from his name like his parts
 * are: how many breaths he takes in a loop, where in it he starts, and his
 * habits (a blink or a double blink, a glance, a smile, an "ooh", a little
 * hop). The same guy always moves the same way, and two guys side by side are
 * never in step. A squash never cuts his face: rows are only lost or repeated
 * below his mouth or above his eyes, and a guy with no room there bobs instead.
 */
declare const MOVES: readonly ["idle", "blink", "hop", "wave", "look", "cheer", "sad", "dance", "squish", "sleep", "shy", "huff", "oops"];
type Move = (typeof MOVES)[number];
/** Rows of room above the guy for jumps. */
declare const HEADROOM = 4;
/** A frame's width: his own sixteen columns. A guy with a buddy is wider (`Animation.width`, at most `WIDE_FRAME_WIDTH`). */
declare const FRAME_WIDTH = 16;
/** The widest a frame is: his sixteen columns and a buddy's room beside him. */
declare const WIDE_FRAME_WIDTH: number;
declare const FRAME_HEIGHT: number;
interface AnimationFrame {
  /** FRAME_HEIGHT rows of `Animation.width` colours (FRAME_WIDTH, or more with a buddy); null is transparent. */
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
   * with x from -AURA_PAD to width + AURA_PAD - 1. Only there when there
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
  /** For a loop, how many turns of LOOP_MS it spans. */
  turns?: number;
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
   * there at the start. `{ fit: true }` picks the repeats and turns itself, as
   * `fitLoop` does for the move's length, without building the move twice.
   */
  loop?: {
    repeats: number;
    turns: number;
    fine?: boolean;
  } | {
    fit: true;
    fine?: boolean;
  };
}
/**
 * Little pictures that pop up beside his head. The last three are manga's
 * own: a sweat drop, the cross-shaped anger vein and a little floating heart.
 */
type Emote = 'note' | 'question' | 'bang' | 'heart' | 'zzz' | 'crown' | 'fire' | 'sweat' | 'anger' | 'hearts';
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
/** A buddy's own little hops, dealt from his name: how often (ms), where in LOOP_MS they start, and whether each is a double hop. */
type BuddyHop = [period: number, phase: number, double: number];
/** The buddy's own hops for the guy `input` would render as, the same ones his moving pictures play. */

/**
 * What each squash in his moves does to the guy `input` would render as: the
 * frame rows it takes out (or, for a negative one, repeats), or null where he
 * has no room and bobs instead; and the rows of his face, which it never touches.
 */
declare function squashRows(input: string, options?: AnimateOptions): {
  face: number[];
  rows: Record<number, number[] | null>;
};
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
  /** His width in pixels (his own sixteen columns); the height is a quarter more, and a buddy beside him adds its room. Default 128. */
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
 * The founder's rank (./founder). He was picked by hand, not dealt, so his
 * traits' odds don't place him: he is the one of one, at the top tier.
 */
declare const FOUNDER_RANK: GuyRank;
/**
 * Where a guy stands among every guy dealt: "one in 56 billion" says every
 * combination is unique, which they all are, so a card shows this instead.
 * The founder (`founder: true`, as `resolve` gives him) is `FOUNDER_RANK`.
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
 *
 * A rare part can also be earned: every capsule unlocks one the player hasn't
 * got (`rollPart`), and metal crafts the exact one they want (`partCost`).
 * Then it's theirs to pick (`Unlocks`). Capsules are how a player builds the
 * guy they want; earned parts change how a guy looks, never how rare the guy
 * is: that stays the deal's.
 */
/** A slot in a look code: its letter, its config key and its weights. */
declare const SLOTS: readonly [readonly ["h", "head", number[]], readonly ["e", "eyes", number[]], readonly ["m", "mouth", number[]], readonly ["c", "cheeks", number[]], readonly ["t", "hair", number[]], readonly ["b", "body", number[]], readonly ["a", "accessory", number[]], readonly ["p", "palette", number[]]];
type LookSlot = (typeof SLOTS)[number][1];
type Look = Partial<Record<LookSlot, number>>;
/** Rare parts a player has earned from capsules, by slot. */
type Unlocks = Partial<Record<LookSlot, number[]>>;
/**
 * A random seed to draw a new player's guy from, made once and kept: the deal
 * prefix (`3-`), then 12 characters of base 36, about 62 bits.
 */
declare function makeSeed(): string;
/** Which options a player may pick in a slot: every common one, their own, and any they've earned. */
declare function pickable(own: AvatarConfig, slot: LookSlot, unlocks?: Unlocks): number[];
/** Whether a look only uses parts this player may pick. */
declare function allowed(own: AvatarConfig, look: Look, unlocks?: Unlocks): boolean;
/** The slots a capsule can unlock a part in: every one, the shape and the colour too. */
declare const PART_SLOTS: LookSlot[];
/** One capsule in this many also unlocks a part: every one, until there's none left to unlock. */
declare const PART_ODDS = 1;
/** A part a capsule unlocked. */
interface PartDrop {
  slot: LookSlot;
  index: number;
}
/**
 * The rare parts in a slot, the ones a picker locks: what a capsule can
 * unlock. The parts no deal gives (`CAPSULE_ONLY`, the anime set) are among them.
 */
declare function rareParts(slot: LookSlot): number[];
/**
 * The part a capsule unlocks. Only rare parts, since common ones can already
 * be picked, and the rarer a part is to be dealt the rarer it is to unlock.
 * Given what the player `has`, it's one they don't have, from a slot that
 * still has some, so a capsule never wastes its part; null once there's none
 * left. Like `roll`, the seed must come from the server.
 */
declare function rollPart(seed: string, has?: (p: PartDrop) => boolean): PartDrop | null;
/**
 * Scrap to craft a part (./craft's metal): a reclaimed for one dealt about
 * one guy in 200 or more, a refined for rarer, two for the rarest (rarer than
 * one in 2,000).
 */
declare function partCost(p: PartDrop): number;
/** A part's name, as a player reads it: "Galaxy eyes", "Crown topper". */
declare function partName(p: PartDrop): string;
/** A part as a short code, like a look's (`e12`), and back. */
declare const partCode: (p: PartDrop) => string;
declare function readPart(code: string): PartDrop | null;
/** Earned part codes as `Unlocks`. */
declare function unlocksOf(codes: string[]): Unlocks;
/** A picked look as a versioned code: `2:h3.e5.p17`, only the slots picked. */
declare function encodeLook(look: Look): string;
/**
 * A code back into a look, or null for anything that isn't a version-2 code
 * this library can draw: an old seven-number code from before 0.2, a part out
 * of range, or (given the player's own guy) a rare part they didn't roll.
 */
declare function decodeLook(code: string, own?: AvatarConfig, unlocks?: Unlocks): Look | null;
/** A player's guy: from their seed, with their picked look laid over it. */
declare function lookOf(seed: string, code?: string, unlocks?: Unlocks): AvatarConfig;

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
 * RGBA byte arrays, the frame's size (16×20, wider with a buddy).
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
/** The shader, for a game that runs its own WebGL: textures \`base\`, \`info\`, \`noise\` from shineData, \`time\` in loop seconds, \`res\` the frame's size. */
declare const SHINE_FRAGMENT = "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n\nvarying vec2 uv;\nuniform sampler2D base, info, noise;\nuniform float time;\nuniform vec2 res;\n\nconst float TAU = 6.28318530718;\nvec3 hsv(vec3 c) { vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0); return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y); }\nvec3 hueShift(vec3 c, float a) {\n  const mat3 toYIQ = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);\n  const mat3 toRGB = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);\n  vec3 yiq = toYIQ * c;\n  float h = atan(yiq.z, yiq.y) + a, ch = length(yiq.yz);\n  return toRGB * vec3(yiq.x, ch * cos(h), ch * sin(h));\n}\nfloat band(float d, float time, float print) { return 1.0 - clamp(abs(mod(d - time * 10.0 + print, 60.0) - 30.0) - 0.5, 0.0, 1.0); }\nfloat soft(float d, float time, float print) { return 1.0 - clamp(abs(mod(d - time * 10.0 + print, 60.0) - 30.0) / 3.0, 0.0, 1.0); }\nvec3 finishColor(vec3 c, float finish, float scuff, float h, float d, float row, float print, float time, float scan) {\n  float b = band(d, time, print);\n  float w = soft(d, time, print);\n  float coat = clamp(1.0 - scuff * 1.4, 0.0, 1.0) * step(scuff * 0.55, h);\n  if (finish < 0.5) c += b * 0.45 * step(scuff, 0.07);\n  else if (finish < 1.5) { float s = 0.5 + 0.5 * sin(d * 0.8 - time * TAU / 2.0 + print); c = mix(c, c * vec3(0.86, 0.96, 1.18) + 0.08, 0.4 * s * coat) + b * 0.5 * coat; }\n  else if (finish < 2.5) c = mix(c, c * vec3(0.9, 0.98, 1.1) + vec3(0.2, 0.2, 0.16), w * 0.5 * coat) + b * 0.2 * coat;\n  else if (finish < 3.5) {\n    c = hueShift(c, 0.32 * sin(time * TAU / 6.0 + d * 0.12 + fract(print * 0.618) * TAU) * coat);\n    float s = max(0.0, sin(time * TAU / 3.0 + h * 97.0));\n    c = mix(c, vec3(1.0, 0.94, 1.0), step(0.972, h) * s * s * s * coat);\n  }\n  else if (finish < 4.5) c = hueShift(c, time * TAU / 6.0 * coat) + w * 0.14 * coat;\n  else if (finish < 5.5) c += vec3(0.28, 0.12, 0.45) * b * coat + 0.07 * sin(time * TAU / 3.0 + d * 0.5 + fract(print * 0.618) * TAU) * coat;\n  else c = mix(c, vec3(1.0, 0.94, 0.66), w * 0.45 * coat) + vec3(0.36, 0.3, 0.16) * b * coat;\n  return c;\n}\n\nvoid main() {\n  vec2 cell = floor(uv * res);\n  vec2 at = (cell + 0.5) / res;\n  vec4 b = texture2D(base, at);\n  if (b.a < 0.5) { gl_FragColor = vec4(0.0); return; }\n  vec3 c = b.rgb;\n  vec4 k = texture2D(info, at);\n  float finish = floor(k.r * 255.0 / 32.0 + 0.5) - 1.0;\n  if (k.a > 0.5 && finish >= 0.0) c = finishColor(c, finish, k.g, texture2D(noise, at).r, cell.x + cell.y, cell.y, floor(k.b * 255.0 + 0.5) * 4.0, time, 0.0);\n  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);\n}";
interface Shine {
  /** The canvas the shader draws into, the size of the last frame drawn (16×20, wider with a buddy); copy it out with drawImage. */
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
declare function auraColor(id: string, k: number, finish: string, x: number, y: number, t: number, print?: number): string;
/**
 * The one colour an aura copy is known by, in its finish: its most vivid
 * colour (Flames' orange, Frost's ice blue, a Neon copy's tube). Its card is
 * dressed in it.
 */

/** The colours an aura copy's card is dressed from, in its finish: the list `auraHue` picks the most vivid of. */
declare function auraColors(id: string, finish: string, print?: number): string[];

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

declare const GLSL_COMMON = "\nconst float TAU = 6.28318530718;\nvec3 hsv(vec3 c) { vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0); return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y); }\nvec3 hueShift(vec3 c, float a) {\n  const mat3 toYIQ = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);\n  const mat3 toRGB = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);\n  vec3 yiq = toYIQ * c;\n  float h = atan(yiq.z, yiq.y) + a, ch = length(yiq.yz);\n  return toRGB * vec3(yiq.x, ch * cos(h), ch * sin(h));\n}\nfloat band(float d, float time, float print) { return 1.0 - clamp(abs(mod(d - time * 10.0 + print, 60.0) - 30.0) - 0.5, 0.0, 1.0); }\nfloat soft(float d, float time, float print) { return 1.0 - clamp(abs(mod(d - time * 10.0 + print, 60.0) - 30.0) / 3.0, 0.0, 1.0); }\nvec3 finishColor(vec3 c, float finish, float scuff, float h, float d, float row, float print, float time, float scan) {\n  float b = band(d, time, print);\n  float w = soft(d, time, print);\n  float coat = clamp(1.0 - scuff * 1.4, 0.0, 1.0) * step(scuff * 0.55, h);\n  if (finish < 0.5) c += b * 0.45 * step(scuff, 0.07);\n  else if (finish < 1.5) { float s = 0.5 + 0.5 * sin(d * 0.8 - time * TAU / 2.0 + print); c = mix(c, c * vec3(0.86, 0.96, 1.18) + 0.08, 0.4 * s * coat) + b * 0.5 * coat; }\n  else if (finish < 2.5) c = mix(c, c * vec3(0.9, 0.98, 1.1) + vec3(0.2, 0.2, 0.16), w * 0.5 * coat) + b * 0.2 * coat;\n  else if (finish < 3.5) {\n    c = hueShift(c, 0.32 * sin(time * TAU / 6.0 + d * 0.12 + fract(print * 0.618) * TAU) * coat);\n    float s = max(0.0, sin(time * TAU / 3.0 + h * 97.0));\n    c = mix(c, vec3(1.0, 0.94, 1.0), step(0.972, h) * s * s * s * coat);\n  }\n  else if (finish < 4.5) c = hueShift(c, time * TAU / 6.0 * coat) + w * 0.14 * coat;\n  else if (finish < 5.5) c += vec3(0.28, 0.12, 0.45) * b * coat + 0.07 * sin(time * TAU / 3.0 + d * 0.5 + fract(print * 0.618) * TAU) * coat;\n  else c = mix(c, vec3(1.0, 0.94, 0.66), w * 0.45 * coat) + vec3(0.36, 0.3, 0.16) * b * coat;\n  return c;\n}\n";
type Vec3 = [number, number, number];
/**
 * `finishColor` from GLSL_COMMON. `finish` is an index in SHADER_FINISHES.
 * Each finish moves in smooth light across the whole item, never pixel by
 * pixel: Tempered and Gold a soft sheen and a fine glint, Nebula a slow drift
 * of its colours and a few fixed stars pulsing, Prism its rainbow sweeping
 * round, Negative a slow pulse.
 */
declare function finishColor(c: Vec3, finish: number, scuff: number, h: number, d: number, row: number, print: number, time: number, scan: number): Vec3;

//#endregion
//#region src/card-looks.d.ts
/** A colour channel as the GPU stores it. */
/**
 * How a card's edition is painted, after the way Balatro paints its cards.
 * Each edition has its look, chosen by `lookFor`:
 *
 * - `paint` (an aura card): its ground as banded paint in the aura's own
 *   colours, cut in hard bands: each aura its own pattern (a spiral, waves,
 *   rings, rising tongues, streaks or a nebula; `paintForm`), its copy's
 *   print nudging the middle and the timing.
 * - `sheen` (a Grail): once a loop a band of light crosses the card corner to
 *   corner, as light catches metal: brighter on what stands proud, a glint on
 *   the bevel as it passes, and still the rest of the time.
 * - `liquid` (a Tempered card): its window flowing chrome, hard bands of dark,
 *   sky and silver round a white highlight, slowly swirling, and its frame
 *   chrome that catches the same highlights.
 * - `opal` (a Polychrome card): a pale pearl with soft patches of colour
 *   shifting over it.
 * - `bands` (a Holographic card): a cool drifting tint and a few slow broad
 *   bands of light, their edges in rainbow.
 * - `classic`: the edition as `editionColor` draws it (./finish-shader), the
 *   only look for Foil and Negative cards, and any card's if asked for.
 *
 * Each is written twice, as GLSL (`GLSL_LOOKS`) and as plain code
 * (`lookField`), with the same result, and every motion comes round in
 * LOOP_MS: time enters only as whole turns of the loop's angle.
 */
declare const CARD_LOOKS: readonly ["classic", "paint", "sheen", "liquid", "opal", "bands"];
type CardLook = (typeof CARD_LOOKS)[number];
/** A look and what it is drawn with. */
interface LookOptions {
  /** A look other than the edition's own, where it fits the edition (`classic` always does). */
  look?: CardLook;
  /** How hard `paint`'s bands are: 2 a soft wash, 7 the default, 12 near cut paper. */
  contrast?: number;
}
/** Whether a look (as the shaders number it) can paint a card of edition `ed` (an index in EDITIONS). */

/**
 * The look a card of edition `ed` is painted in, as the shaders number it: its
 * edition's own (a Holographic card's by its finish: Tempered is liquid metal,
 * Nebula bands), or `look` where that fits.
 */
declare function lookFor(ed: number, finish: string | undefined, look?: CardLook): number;
/** The default hardness of `paint`'s bands. */

/**
 * `lookColor` falls back to `editionColor` (GLSL_EDITIONS) for `classic`, so
 * it goes after it. `p` is the cell in face cells, `o` the window's middle,
 * `region` 1 face and 2 window, `th` the loop's angle.
 */
declare const GLSL_LOOKS = "\nvec3 fromHsl(vec3 c) {\n  vec3 k = clamp(abs(fract(c.x + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);\n  return c.z + c.y * (1.0 - abs(2.0 * c.z - 1.0)) * (k - 0.5);\n}\nfloat polyField(vec2 p, vec2 o, float th) {\n  vec2 a = p - o - vec2(7.0 * cos(th), 9.0 * sin(th));\n  vec2 b = p - o - vec2(-8.0 * sin(th), 6.0 * cos(2.0 * th));\n  vec2 e = p - o - vec2(6.0 * cos(2.0 * th + 1.3), -7.0 * sin(th + 0.4));\n  return cos(length(a) * 0.38) + sin(length(b) * 0.27 + th) * cos(b.y * 0.21) + cos(length(e) * 0.33 - th) * sin(e.x * 0.19);\n}\nfloat paintField(vec2 p, vec2 o, float th, vec4 form, float phase) {\n  vec2 q = (p - o - form.zw) / 9.0;\n  float r = length(q), k = form.y;\n  if (form.x < 0.5) return 0.5 + 0.5 * sin(abs(k) * atan(q.y, q.x + 1e-4) + sign(k) * 5.0 * r - th + phase + 0.7 * sin(2.3 * r - th) + 0.5 * sin(q.x * 2.0 - q.y * 1.6 + th));\n  if (form.x < 1.5) { vec2 u = q * 2.0; return 0.5 + 0.5 * sin(u.y * 2.2 * k + 1.3 * sin(u.x * 1.4 + th + phase) + 0.7 * sin(u.x * 3.1 - u.y * 0.8 - th) + 0.6 * sin(u.y * 1.1 + u.x * 0.6 - 2.0 * th)); }\n  if (form.x < 2.5) return 0.5 + 0.5 * sin(r * 6.5 - th + phase + 0.7 * sin(q.x * 3.0 + q.y * 2.0 + th) + 0.5 * sin(q.y * 2.4 - q.x * 1.3 - th));\n  if (form.x < 3.5) return 0.5 + 0.5 * sin(q.x * 6.0 + 1.6 * sin(q.y * 2.4 + k * th + phase) + 0.8 * sin(q.x * 2.1 - th)) + 0.15 * q.y * k;\n  if (form.x < 4.5) return 0.5 + 0.5 * sin((q.x + q.y * 1.7 * k) * 5.0 + 0.8 * sin((q.x - q.y) * 2.6 + th + phase) + 0.5 * sin(q.y * 3.1 + 2.0 * th) - th);\n  float tw = 0.6 * r + 0.35 * sin(th);\n  vec2 u = vec2(q.x * cos(tw) - q.y * sin(tw), q.x * sin(tw) + q.y * cos(tw)) * 1.9;\n  float ct = 0.8 * cos(th + phase), st = 0.8 * sin(th + phase);\n  u += 0.8 * vec2(sin(1.3 * u.y + ct), sin(1.1 * u.x + st));\n  u += 0.8 * vec2(sin(1.7 * u.y - st + 0.9), sin(1.5 * u.x + ct - 0.7));\n  u += 0.8 * vec2(sin(2.1 * u.y + ct + 1.8), sin(1.9 * u.x - st + 2.6));\n  return 0.5 + 0.5 * sin(u.x * 0.9 + u.y * 1.2 + r * 1.5);\n}\nvec3 paintColor(vec2 p, vec2 o, float th, vec3 c1, vec3 c2, vec3 c3, float contrast, vec4 form, float phase) {\n  float t = paintField(p, o, th, form, phase), w = 0.5 / contrast;\n  float k1 = clamp((t - 0.38) / w + 0.5, 0.0, 1.0), k2 = clamp((t - 0.74) / w + 0.5, 0.0, 1.0);\n  return mix(mix(c1, c2, k1), c3, k2) * (1.0 - 0.22 * clamp(length(p - o) / 9.0 * 0.5 - 0.35, 0.0, 1.0));\n}\nfloat sheenPos(float time) { return -6.0 + 84.0 * clamp(time / 1.4, 0.0, 1.0); }\nfloat glint(vec2 p, vec2 g, float pos) {\n  vec2 q = abs(p - g) * 5.0;\n  float a = min(q.x, q.y), b = max(q.x, q.y);\n  float star = b < 0.5 ? 1.0 : (a < 0.5 && b < 3.5 ? 0.8 - 0.2 * b : 0.0);\n  return star * clamp(1.0 - abs(g.x + g.y - pos) / 1.2, 0.0, 1.0);\n}\nvec3 sheenColor(vec3 c, vec2 p, float region, float raised, float px, float time) {\n  float pos = sheenPos(time), d = abs(p.x + p.y - pos);\n  float halo = clamp(1.0 - d / 4.5, 0.0, 1.0), glow = clamp(1.0 - d / 2.2, 0.0, 1.0), core = clamp(1.0 - d / 0.7, 0.0, 1.0);\n  float k = (0.65 + 0.35 * raised) * (region > 1.5 ? 0.6 : 1.0);\n  c = mix(c, vec3(1.0, 0.88, 0.52), halo * halo * 0.35 * k);\n  c = mix(c, vec3(1.0, 0.93, 0.7), glow * 0.55 * k);\n  c = mix(c, vec3(1.0, 0.99, 0.93), core * 0.85 * k);\n  if (px < 0.5) c += vec3(1.0, 0.97, 0.88) * (glint(p, vec2(4.8, 0.8), pos) + glint(p, vec2(23.0, 38.8), pos));\n  return c;\n}\nfloat liquidField(vec2 p, vec2 o, float th) {\n  vec2 u = (p - o) / 10.0 * 1.6;\n  u += 0.6 * vec2(sin(1.4 * u.y + th), sin(1.2 * u.x - th + 0.8));\n  u += 0.5 * vec2(sin(2.1 * u.y - th + 1.7), sin(1.8 * u.x + 2.0 * th));\n  return 0.5 + 0.5 * sin(u.x * 1.3 + u.y * 2.1 + 0.6 * sin(u.x * 0.7 - th));\n}\nvec3 liquidColor(vec3 c, vec2 p, vec2 o, float region, float th) {\n  float t = liquidField(p, o, th);\n  float a = clamp((t - 0.28) / 0.06 + 0.5, 0.0, 1.0), b = clamp((t - 0.5) / 0.06 + 0.5, 0.0, 1.0), d = clamp((t - 0.82) / 0.05 + 0.5, 0.0, 1.0);\n  vec3 metal = mix(mix(mix(vec3(0.1, 0.12, 0.18), vec3(0.55, 0.75, 0.95), a), vec3(0.78, 0.82, 0.88), b), vec3(1.0), d);\n  if (region > 1.5) return metal;\n  float l = dot(c, vec3(0.299, 0.587, 0.114));\n  return mix(vec3(0.42 + 0.5 * l) * vec3(0.93, 0.96, 1.04), vec3(1.0), 0.4 * d);\n}\nvec3 opalColor(vec3 c, vec2 p, vec2 o, float region, float th) {\n  float f = polyField(p, o, th);\n  vec3 base = mix(c, vec3(0.94, 0.95, 0.98), 0.5);\n  vec3 fire = fromHsl(vec3(fract(0.5 + 0.35 * f), 0.55, 0.78));\n  return mix(base, fire, (region > 1.5 ? 0.45 : 0.3) * clamp(0.5 + f / 3.0, 0.0, 1.0));\n}\nvec3 bandsColor(vec3 c, vec2 p, vec2 o, float region, float th) {\n  float k = region > 1.5 ? 0.6 : 1.0, b = sin((p.x * 0.3 + p.y * 0.5) * 0.45 - th);\n  float band = clamp((b - 0.6) / 0.3, 0.0, 1.0), edge = band * (1.0 - band) * 4.0;\n  vec3 tint = fromHsl(vec3(fract(0.58 + 0.12 * polyField(p, o, th)), 0.75, 0.66));\n  vec3 rim = fromHsl(vec3(fract(0.55 + 0.3 * b + p.y * 0.01), 0.8, 0.7));\n  return mix(c, c * 0.5 + tint * 0.55, 0.5 * k) + vec3(0.9, 0.95, 1.0) * band * 0.16 * k + rim * edge * 0.3 * k;\n}\nvec3 lookColor(vec3 c, float look, float ed, float v, vec2 p, vec2 o, float region, float raised, float h, float px, float time, vec3 c1, vec3 c2, vec3 c3, float contrast, vec4 form, float phase) {\n  float th = time * TAU / 6.0;\n  if (look > 0.5 && look < 1.5) return region > 1.5 ? paintColor(p, o, th, c1, c2, c3, contrast, form, phase) : c;\n  if (look > 1.5 && look < 2.5) return sheenColor(c, p, region, raised, px, time);\n  if (look > 2.5 && look < 3.5) return liquidColor(c, p, o, region, th);\n  if (look > 3.5 && look < 4.5) return opalColor(c, p, o, region, th);\n  if (look > 4.5) return bandsColor(c, p, o, region, th);\n  return editionColor(c, ed, v, p, o, region, h, px, time);\n}\n";
/**
 * What `paint` is drawn in: three colours, 0 to 1, how hard its bands are, and its pattern: a
 * family, a number for it (a spiral's arms, signed for the way it turns; waves' tightness;
 * which way tongues and streaks run), where its middle is from the window's, in face cells, and
 * where its motion starts.
 */
interface PaintSpec {
  colors: [Vec3, Vec3, Vec3];
  contrast: number;
  form: [number, number, number, number];
  phase: number;
}

//#endregion
//#region src/card.d.ts
/** The pattern families `paint` draws, in the order the shaders number them. */
/**
 * Trading cards, drawn by the library so every game, the site and an export
 * show the same card: a guy wearing his copies, moving, each copy's finish
 * shining on its own pixels, its effect playing, the card's face dressed for
 * the grade, and the words written in the club's pixel type.
 *
 * A card is `CARD_WIDTH` by `CARD_HEIGHT` card pixels, several to each of
 * the guy's pixels, so a shine can sweep across a single pixel of a hat. Scale it
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
  /** The grade's badge, then a short line beside it (his @name). Any ★ is left off. */
  lines?: string[];
  /** The small line at the foot, as "1st edition", on one line; a part starting with "#" (a print number) is left off. */
  footer?: string;
  /** 0 Everyday to 5 Aura; -1 for a plain card. */
  grade?: number;
  /** How he moves on the card. Default `idle`. */
  move?: Move;
}
/** How wide a line of text is, in pixels. */
declare const textWidth: (s: string) => number;
/**
 * A Grail: `framed` (the default) a dark card round a window of gold in a few large soft bands, a thin
 * bright gold line along its bevel and inside the window's rim, on the dark plate every card has;
 * `brushed` the earlier brushed gold card, its words struck into the gold.
 */
declare const CARD_GOLDS: readonly ["framed", "brushed"];
type CardGold = (typeof CARD_GOLDS)[number];
/**
 * How he stands out from the window: `none` (the default) on his own dark outline, everything in the
 * window on his own grid and his whole move kept inside it; `sticker` the earlier white sticker edge a
 * card pixel or two round him, a tall hat poking out over the window.
 */
declare const CARD_EDGES: readonly ["none", "sticker"];
type CardEdge = (typeof CARD_EDGES)[number];
/** How a card is drawn, where it differs from the defaults: its edition's look, a Grail's gold, his edge. */
type CardStyle = LookOptions & {
  gold?: CardGold;
  edge?: CardEdge;
};
/**
 * The card as frames, `ms` apart, covering one loop of his move (at least two
 * seconds, so a shine gets across). Every frame is the whole card in RGBA;
 * the corners are transparent.
 */
declare function cardFrames(input: CardInput, ms?: number): Frames;
/** How a page plays a card. */
interface CardPlayerOptions {
  /**
   * Keep every frame once drawn (the default), so the next loop only shows
   * them; or `false` to draw each frame into one picture that is reused, for
   * a page showing many cards: a frame costs about a millisecond.
   */
  keep?: boolean;
  /** A look other than the edition's own (./card-looks), such as `classic` or `liquid`. */
  look?: LookOptions['look'];
  /** How hard an aura card's paint bands are. */
  contrast?: number;
  /** A Grail's gold: `framed` (the default) or `brushed`. */
  gold?: CardGold;
  /** How he stands out from the window: `none` (the default) or `sticker`. */
  edge?: CardEdge;
}
/**
 * A card to play on screen: each frame is drawn the first time it is asked
 * for and kept, so a page can show a card at once and spread the work out.
 * It loops perfectly: his move played the whole number of times that fits
 * whole turns of LOOP_MS, with every sheen on the card on the same clock. A
 * card with nothing shining draws each pose of his once and shows it again.
 */
declare function cardPlayer(input: CardInput, ms?: number, options?: CardPlayerOptions): {
  width: number;
  height: number;
  count: number;
  delay: number;
  delays: number[];
  /** The frame showing at `i` (wraps round). Without `keep`, the same picture redrawn: show it before asking for the next. */
  frame(i: number): Uint8ClampedArray;
};
/**
 * The card's window alone, as a square, played as `cardPlayer` plays the whole card: the art behind
 * him (its edition, look, frame item or aura ground) and him moving. Its side is the window's
 * height or width, whichever is less; give it `edge: 'none'` (or another grid edge) so his whole move
 * stays in the square.
 */
declare function cardArtPlayer(input: CardInput, ms?: number, options?: CardPlayerOptions): {
  width: number;
  height: number;
  count: number;
  delay: number;
  delays: number[];
  /** The frame showing at `i` (wraps round). Without `keep`, the same picture redrawn: show it before asking for the next. */
  frame(i: number): Uint8ClampedArray;
};
/** The card standing still, for a picture. */
declare function cardStill(input: CardInput, t?: number, looks?: CardStyle): Uint8ClampedArray;
/** The card as a looping GIF, each card pixel `scale` by `scale`. */
declare function toCardGif(input: CardInput, scale?: number): Uint8Array;
/** The card's window art alone as frames, as `cardFrames` gives the whole card. */
declare function cardArtFrames(input: CardInput, ms?: number, options?: CardPlayerOptions): Frames;
/** The card's window art alone as a looping GIF, each pixel `scale` by `scale`. */
declare function toCardArtGif(input: CardInput, scale?: number, options?: CardPlayerOptions): Uint8Array;
/** The card's window art alone as a PNG, its first frame. */
declare function toCardArtPng(input: CardInput, scale?: number, options?: CardPlayerOptions): Promise<Uint8Array>;
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
//#region src/card-face.d.ts
/**
 * The trading card a guy or an item is shown on: a 26×42 face printed in its
 * grade's colour, a dark plate across the top for the name, the guy standing
 * in a window, and a plain dark plate at the foot. Its words (name, print,
 * odds) are the page's to write over it. A buddy he wears stands at his full
 * size too, in front of the window's bottom-right corner and half over the
 * plate under it (`FaceSpec.buddy`), hopping now and then as it does beside him.
 *
 * Like Balatro's cards, each has an edition, from the finish that sets its
 * grade: Foil (Sunset), Holographic (Tempered, Nebula), Polychrome (Prism),
 * Negative, Gold for a Grail, and Spectral for an aura card, which is
 * full-art: its aura's own colours swirl edge to edge. Each worn copy's pixels
 * shine in their own finish, and everything comes round in `LOOP_MS`.
 *
 * The face is built once (`cardFace`), then drawn at a time either by the GPU
 * (`CARD_FRAGMENT`, `createCardShader`) or in plain code (`cardFaceAt`), with
 * the same result.
 */
declare const FACE_WIDTH = 26;
declare const FACE_HEIGHT = 42;
/**
 * Where a buddy he wears stands on the face, the guy and the face the same size
 * either way: `peek`, in front of the window's bottom-right corner, its feet on
 * the plate under it, as if peeking out; `floor`, wholly on the plate under the
 * window, to the right, where the page's words would otherwise run.
 */
declare const FACE_BUDDY_SPOTS: readonly ["peek", "floor"];
type FaceBuddySpot = (typeof FACE_BUDDY_SPOTS)[number];
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
  /** A look other than its edition's own (./card-looks), and an aura card's paint contrast. */
  look?: LookOptions['look'];
  contrast?: number;
  /** Where his buddy stands, if he wears one. Default `peek`. */
  buddy?: FaceBuddySpot;
}
interface CardFace {
  /** Colours, 26×42 RGBA. */
  base: Uint8Array;
  /** Per pixel: what it is (card, window, guy, item, plate), its copy's finish, scuff and print. */
  kind: Uint8Array;
  /** Per pixel noise, in the red channel; the buddy's (`buddy`), in the green. */
  noise: Uint8Array;
  /**
   * His buddy standing still, 26×42 RGBA, drawn over everything else and up a row
   * while it hops (`buddyLift`): alpha 255 for its own colours, where its copy's
   * finish runs, 128 for its outline, 0 elsewhere. All clear without one.
   */
  buddy: Uint8Array;
  /** The buddy's copy: its finish (an index in SHADER_FINISHES, -1 for none), scuff and print. */
  buddyCopy: [number, number, number];
  /** The buddy's own hops, as his moving pictures play them; null without a buddy. */
  hop: BuddyHop | null;
  grade: number;
  negative: boolean;
  /** Where the face's wide band starts: the last copy's print. */
  seed: number;
  /** The last copy's finish, an index in SHADER_FINISHES (0 for none), and its print's variant 0–3. */
  holo: number;
  variant: number;
  /** The card's edition, an index in EDITIONS. */
  edition: number;
  /** The window's middle, in face cells: where a Spectral swirl turns round. */
  origin: [number, number];
  /** Its edition's look, an index in CARD_LOOKS, and what an aura card's paint is drawn in. */
  look: number;
  paint?: PaintSpec;
}
/** The card's face, ready to draw at any time. */
declare function cardFace(spec: FaceSpec): CardFace;
/** Whether a face changes over time at all: a plain card with no finishes is one picture. */
declare const faceMoves: (f: CardFace) => boolean;
/** How many rows the face's buddy is up `ms` into its loop: 1 now and then, as it hops; 0 without one. */
declare const buddyLift: (f: CardFace, ms: number) => number;
/** The pointer's light on a card (a page's hover): where it is, 0 to 1 across and down, and how strong. */
interface Hover {
  x: number;
  y: number;
  strength: number;
}
/** The face `ms` into its loop, in plain code: RGBA bytes, the same the GPU draws. */
declare function cardFaceAt(f: CardFace, ms: number, hover?: Hover): Uint8ClampedArray;
/** The face's shader, for a page or a game with WebGL: textures `base`, `kind`, `noise`, `buddy` from `cardFace`. */
declare const CARD_FRAGMENT = "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n\nvarying vec2 uv;\nuniform sampler2D base, kind, noise, buddy;\nuniform float time, hover, edition, variant, look, contrast, buddyLift, buddyFinish, buddyScuff, buddyPrint;\nuniform vec2 light, origin;\nuniform vec3 paint1, paint2, paint3;\nuniform vec4 paintForm;\nuniform float paintPhase;\n\nconst float TAU = 6.28318530718;\nvec3 hsv(vec3 c) { vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0); return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y); }\nvec3 hueShift(vec3 c, float a) {\n  const mat3 toYIQ = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);\n  const mat3 toRGB = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);\n  vec3 yiq = toYIQ * c;\n  float h = atan(yiq.z, yiq.y) + a, ch = length(yiq.yz);\n  return toRGB * vec3(yiq.x, ch * cos(h), ch * sin(h));\n}\nfloat band(float d, float time, float print) { return 1.0 - clamp(abs(mod(d - time * 10.0 + print, 60.0) - 30.0) - 0.5, 0.0, 1.0); }\nfloat soft(float d, float time, float print) { return 1.0 - clamp(abs(mod(d - time * 10.0 + print, 60.0) - 30.0) / 3.0, 0.0, 1.0); }\nvec3 finishColor(vec3 c, float finish, float scuff, float h, float d, float row, float print, float time, float scan) {\n  float b = band(d, time, print);\n  float w = soft(d, time, print);\n  float coat = clamp(1.0 - scuff * 1.4, 0.0, 1.0) * step(scuff * 0.55, h);\n  if (finish < 0.5) c += b * 0.45 * step(scuff, 0.07);\n  else if (finish < 1.5) { float s = 0.5 + 0.5 * sin(d * 0.8 - time * TAU / 2.0 + print); c = mix(c, c * vec3(0.86, 0.96, 1.18) + 0.08, 0.4 * s * coat) + b * 0.5 * coat; }\n  else if (finish < 2.5) c = mix(c, c * vec3(0.9, 0.98, 1.1) + vec3(0.2, 0.2, 0.16), w * 0.5 * coat) + b * 0.2 * coat;\n  else if (finish < 3.5) {\n    c = hueShift(c, 0.32 * sin(time * TAU / 6.0 + d * 0.12 + fract(print * 0.618) * TAU) * coat);\n    float s = max(0.0, sin(time * TAU / 3.0 + h * 97.0));\n    c = mix(c, vec3(1.0, 0.94, 1.0), step(0.972, h) * s * s * s * coat);\n  }\n  else if (finish < 4.5) c = hueShift(c, time * TAU / 6.0 * coat) + w * 0.14 * coat;\n  else if (finish < 5.5) c += vec3(0.28, 0.12, 0.45) * b * coat + 0.07 * sin(time * TAU / 3.0 + d * 0.5 + fract(print * 0.618) * TAU) * coat;\n  else c = mix(c, vec3(1.0, 0.94, 0.66), w * 0.45 * coat) + vec3(0.36, 0.3, 0.16) * b * coat;\n  return c;\n}\n\n\nfloat sweep(float s, float time, float width) { return 1.0 - clamp(abs(mod(s - time * 10.0, 60.0) - 30.0) / width, 0.0, 1.0); }\nvec3 editionColor(vec3 c, float ed, float v, vec2 p, vec2 o, float region, float h, float px, float time) {\n  if (ed < 0.5) return c;\n  float wide = sweep(p.x + p.y * 0.6 + v * 13.0, time, 5.0);\n  float glint = step(0.965, h) * pow(max(0.0, sin(time * TAU / 2.0 + h * 91.0)), 6.0);\n  if (ed < 1.5) {\n    float l = dot(c, vec3(0.299, 0.587, 0.114));\n    float fine = pow(0.5 + 0.5 * sin((p.x * 0.7 + p.y * 0.45 + v * 3.0) * 1.3 - time * TAU / 2.0), 6.0);\n    return mix(c, l * vec3(0.8, 0.92, 1.1) + vec3(0.05, 0.08, 0.16), 0.6) + vec3(0.6, 0.75, 1.0) * (fine * 0.22 + wide * 0.4);\n  }\n  if (ed < 2.5) {\n    vec3 tint = mix(vec3(1.0, 0.3, 0.42), vec3(0.28, 0.62, 1.0), 0.5 + 0.5 * sin(p.x * 0.35 - p.y * 0.55 + v * 2.0 - time * TAU / 3.0));\n    float k = region > 1.5 ? 0.6 : 1.0;\n    return mix(c, c * 0.5 + tint * 0.55, 0.55 * k) + step(0.5, fract(p.y / (px * 2.0))) * 0.05 * (2.0 - region) + wide * 0.25;\n  }\n  if (ed < 3.5) {\n    vec3 rb = hsv(vec3(fract((p.x + p.y) * 0.03 + v * 0.25 - time / 6.0), 0.6, 1.0));\n    return mix(hueShift(c, (p.x - p.y) * 0.05 - time * TAU / 6.0), c * 0.45 + rb * 0.6, 0.5) + wide * 0.18;\n  }\n  if (ed < 4.5) {\n    vec3 n = vec3(1.0) - c;\n    return mix(n, n * vec3(0.75, 0.68, 1.1) + vec3(0.02, 0.0, 0.06), 0.55) + vec3(0.3, 0.16, 0.5) * wide * 0.6;\n  }\n  if (ed < 5.5) {\n    if (region > 1.5) return mix(c, vec3(1.0, 0.94, 0.78), sweep(p.x + p.y * 0.6 + v * 13.0, time, 9.0) * 0.16);\n    return mix(c, vec3(1.0, 0.97, 0.84), wide * 0.6);\n  }\n  vec2 q = (p - o) / (region > 1.5 ? 7.0 : 12.0);\n  float r = length(q), a = atan(q.y, q.x) + r * 1.8 - time * TAU / 6.0;\n  vec2 w = vec2(cos(a), sin(a)) * r;\n  float f = floor((0.5 + 0.5 * sin(w.x * 3.2 + sin(w.y * 2.6 + time * TAU / 3.0) * 1.5)) * 3.99);\n  if (region > 1.5) return c * (0.7 + 0.25 * f) + wide * 0.12 + glint * 0.6;\n  return hueShift(c * (0.86 + 0.1 * f), 0.4 * sin((p.x - p.y) * 0.16 + time * TAU / 6.0 + v)) + wide * 0.35 + glint * 0.6;\n}\n\n\nvec3 fromHsl(vec3 c) {\n  vec3 k = clamp(abs(fract(c.x + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);\n  return c.z + c.y * (1.0 - abs(2.0 * c.z - 1.0)) * (k - 0.5);\n}\nfloat polyField(vec2 p, vec2 o, float th) {\n  vec2 a = p - o - vec2(7.0 * cos(th), 9.0 * sin(th));\n  vec2 b = p - o - vec2(-8.0 * sin(th), 6.0 * cos(2.0 * th));\n  vec2 e = p - o - vec2(6.0 * cos(2.0 * th + 1.3), -7.0 * sin(th + 0.4));\n  return cos(length(a) * 0.38) + sin(length(b) * 0.27 + th) * cos(b.y * 0.21) + cos(length(e) * 0.33 - th) * sin(e.x * 0.19);\n}\nfloat paintField(vec2 p, vec2 o, float th, vec4 form, float phase) {\n  vec2 q = (p - o - form.zw) / 9.0;\n  float r = length(q), k = form.y;\n  if (form.x < 0.5) return 0.5 + 0.5 * sin(abs(k) * atan(q.y, q.x + 1e-4) + sign(k) * 5.0 * r - th + phase + 0.7 * sin(2.3 * r - th) + 0.5 * sin(q.x * 2.0 - q.y * 1.6 + th));\n  if (form.x < 1.5) { vec2 u = q * 2.0; return 0.5 + 0.5 * sin(u.y * 2.2 * k + 1.3 * sin(u.x * 1.4 + th + phase) + 0.7 * sin(u.x * 3.1 - u.y * 0.8 - th) + 0.6 * sin(u.y * 1.1 + u.x * 0.6 - 2.0 * th)); }\n  if (form.x < 2.5) return 0.5 + 0.5 * sin(r * 6.5 - th + phase + 0.7 * sin(q.x * 3.0 + q.y * 2.0 + th) + 0.5 * sin(q.y * 2.4 - q.x * 1.3 - th));\n  if (form.x < 3.5) return 0.5 + 0.5 * sin(q.x * 6.0 + 1.6 * sin(q.y * 2.4 + k * th + phase) + 0.8 * sin(q.x * 2.1 - th)) + 0.15 * q.y * k;\n  if (form.x < 4.5) return 0.5 + 0.5 * sin((q.x + q.y * 1.7 * k) * 5.0 + 0.8 * sin((q.x - q.y) * 2.6 + th + phase) + 0.5 * sin(q.y * 3.1 + 2.0 * th) - th);\n  float tw = 0.6 * r + 0.35 * sin(th);\n  vec2 u = vec2(q.x * cos(tw) - q.y * sin(tw), q.x * sin(tw) + q.y * cos(tw)) * 1.9;\n  float ct = 0.8 * cos(th + phase), st = 0.8 * sin(th + phase);\n  u += 0.8 * vec2(sin(1.3 * u.y + ct), sin(1.1 * u.x + st));\n  u += 0.8 * vec2(sin(1.7 * u.y - st + 0.9), sin(1.5 * u.x + ct - 0.7));\n  u += 0.8 * vec2(sin(2.1 * u.y + ct + 1.8), sin(1.9 * u.x - st + 2.6));\n  return 0.5 + 0.5 * sin(u.x * 0.9 + u.y * 1.2 + r * 1.5);\n}\nvec3 paintColor(vec2 p, vec2 o, float th, vec3 c1, vec3 c2, vec3 c3, float contrast, vec4 form, float phase) {\n  float t = paintField(p, o, th, form, phase), w = 0.5 / contrast;\n  float k1 = clamp((t - 0.38) / w + 0.5, 0.0, 1.0), k2 = clamp((t - 0.74) / w + 0.5, 0.0, 1.0);\n  return mix(mix(c1, c2, k1), c3, k2) * (1.0 - 0.22 * clamp(length(p - o) / 9.0 * 0.5 - 0.35, 0.0, 1.0));\n}\nfloat sheenPos(float time) { return -6.0 + 84.0 * clamp(time / 1.4, 0.0, 1.0); }\nfloat glint(vec2 p, vec2 g, float pos) {\n  vec2 q = abs(p - g) * 5.0;\n  float a = min(q.x, q.y), b = max(q.x, q.y);\n  float star = b < 0.5 ? 1.0 : (a < 0.5 && b < 3.5 ? 0.8 - 0.2 * b : 0.0);\n  return star * clamp(1.0 - abs(g.x + g.y - pos) / 1.2, 0.0, 1.0);\n}\nvec3 sheenColor(vec3 c, vec2 p, float region, float raised, float px, float time) {\n  float pos = sheenPos(time), d = abs(p.x + p.y - pos);\n  float halo = clamp(1.0 - d / 4.5, 0.0, 1.0), glow = clamp(1.0 - d / 2.2, 0.0, 1.0), core = clamp(1.0 - d / 0.7, 0.0, 1.0);\n  float k = (0.65 + 0.35 * raised) * (region > 1.5 ? 0.6 : 1.0);\n  c = mix(c, vec3(1.0, 0.88, 0.52), halo * halo * 0.35 * k);\n  c = mix(c, vec3(1.0, 0.93, 0.7), glow * 0.55 * k);\n  c = mix(c, vec3(1.0, 0.99, 0.93), core * 0.85 * k);\n  if (px < 0.5) c += vec3(1.0, 0.97, 0.88) * (glint(p, vec2(4.8, 0.8), pos) + glint(p, vec2(23.0, 38.8), pos));\n  return c;\n}\nfloat liquidField(vec2 p, vec2 o, float th) {\n  vec2 u = (p - o) / 10.0 * 1.6;\n  u += 0.6 * vec2(sin(1.4 * u.y + th), sin(1.2 * u.x - th + 0.8));\n  u += 0.5 * vec2(sin(2.1 * u.y - th + 1.7), sin(1.8 * u.x + 2.0 * th));\n  return 0.5 + 0.5 * sin(u.x * 1.3 + u.y * 2.1 + 0.6 * sin(u.x * 0.7 - th));\n}\nvec3 liquidColor(vec3 c, vec2 p, vec2 o, float region, float th) {\n  float t = liquidField(p, o, th);\n  float a = clamp((t - 0.28) / 0.06 + 0.5, 0.0, 1.0), b = clamp((t - 0.5) / 0.06 + 0.5, 0.0, 1.0), d = clamp((t - 0.82) / 0.05 + 0.5, 0.0, 1.0);\n  vec3 metal = mix(mix(mix(vec3(0.1, 0.12, 0.18), vec3(0.55, 0.75, 0.95), a), vec3(0.78, 0.82, 0.88), b), vec3(1.0), d);\n  if (region > 1.5) return metal;\n  float l = dot(c, vec3(0.299, 0.587, 0.114));\n  return mix(vec3(0.42 + 0.5 * l) * vec3(0.93, 0.96, 1.04), vec3(1.0), 0.4 * d);\n}\nvec3 opalColor(vec3 c, vec2 p, vec2 o, float region, float th) {\n  float f = polyField(p, o, th);\n  vec3 base = mix(c, vec3(0.94, 0.95, 0.98), 0.5);\n  vec3 fire = fromHsl(vec3(fract(0.5 + 0.35 * f), 0.55, 0.78));\n  return mix(base, fire, (region > 1.5 ? 0.45 : 0.3) * clamp(0.5 + f / 3.0, 0.0, 1.0));\n}\nvec3 bandsColor(vec3 c, vec2 p, vec2 o, float region, float th) {\n  float k = region > 1.5 ? 0.6 : 1.0, b = sin((p.x * 0.3 + p.y * 0.5) * 0.45 - th);\n  float band = clamp((b - 0.6) / 0.3, 0.0, 1.0), edge = band * (1.0 - band) * 4.0;\n  vec3 tint = fromHsl(vec3(fract(0.58 + 0.12 * polyField(p, o, th)), 0.75, 0.66));\n  vec3 rim = fromHsl(vec3(fract(0.55 + 0.3 * b + p.y * 0.01), 0.8, 0.7));\n  return mix(c, c * 0.5 + tint * 0.55, 0.5 * k) + vec3(0.9, 0.95, 1.0) * band * 0.16 * k + rim * edge * 0.3 * k;\n}\nvec3 lookColor(vec3 c, float look, float ed, float v, vec2 p, vec2 o, float region, float raised, float h, float px, float time, vec3 c1, vec3 c2, vec3 c3, float contrast, vec4 form, float phase) {\n  float th = time * TAU / 6.0;\n  if (look > 0.5 && look < 1.5) return region > 1.5 ? paintColor(p, o, th, c1, c2, c3, contrast, form, phase) : c;\n  if (look > 1.5 && look < 2.5) return sheenColor(c, p, region, raised, px, time);\n  if (look > 2.5 && look < 3.5) return liquidColor(c, p, o, region, th);\n  if (look > 3.5 && look < 4.5) return opalColor(c, p, o, region, th);\n  if (look > 4.5) return bandsColor(c, p, o, region, th);\n  return editionColor(c, ed, v, p, o, region, h, px, time);\n}\n\nvoid main() {\n  vec2 res = vec2(26.0, 42.0);\n  vec2 cell = floor(uv * res);\n  vec2 at = (cell + 0.5) / res;\n  vec4 b = texture2D(base, at);\n  if (b.a < 0.5) { gl_FragColor = vec4(0.0); return; }\n  vec3 c = b.rgb;\n  vec4 kd = texture2D(kind, at);\n  float k = floor(kd.r * 255.0 / 32.0 + 0.5);\n  float finish = floor(kd.g * 255.0 / 32.0 + 0.5) - 1.0;\n  float print = floor(kd.a * 255.0 + 0.5) * 4.0;\n  float h = texture2D(noise, at).r;\n  vec2 src = cell + vec2(0.0, buddyLift);\n  vec2 sat = (src + 0.5) / res;\n  vec4 bd = src.y < res.y ? texture2D(buddy, sat) : vec4(0.0);\n  if (bd.a > 0.25) {\n    c = bd.rgb;\n    if (bd.a > 0.75 && buddyFinish >= 0.0) c = finishColor(c, buddyFinish, buddyScuff, texture2D(noise, sat).g, src.x + src.y, src.y, buddyPrint, time, 1.0);\n  }\n  else if (k > 3.5 && k < 4.5 && finish >= 0.0) c = finishColor(c, finish, kd.b, h, cell.x + cell.y, cell.y, print, time, 1.0);\n  else if (k < 2.5) {\n    vec2 e = min(cell, res - 1.0 - cell);\n    float raised = e.x == 1.0 || e.y == 1.0 || e.x + e.y == 3.0 ? 1.0 : 0.0;\n    c = lookColor(c, look, edition, variant, cell, origin, k, raised, h, 1.0, time, paint1, paint2, paint3, contrast, paintForm, paintPhase);\n  }\n  c += (1.0 - smoothstep(0.0, 0.34, distance(at, light))) * 0.35 * hover;\n  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);\n}";
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
declare const ART_VERSION = 13;
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
/**
 * A baked guy's size (`GUY_WIDTH` by `GUY_HEIGHT` in ./bake), a guy with a
 * buddy beside him (`BUDDY_GUY_WIDTH`), and a card's. Nothing tells a page
 * from an address alone which of the first two a guy is, so size a box by its
 * height and let the picture set its width.
 */
declare const BAKED_SIZE: {
  readonly guy: {
    readonly width: 22;
    readonly height: 20;
  };
  readonly buddy: {
    readonly width: 34;
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
 *   size="4"      screen pixels per art pixel (default 4); a guy with a buddy is wider (`BAKED_SIZE.buddy`)
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
/**
 * A baked guy is his frame with room for a rare aura's rings either side: the
 * same size for every guy without a buddy. A guy with a buddy is
 * `BUDDY_GUY_WIDTH` across, the buddy on the floor beside him and the two of
 * them centred, so every buddy picture is one size too.
 */
declare const GUY_WIDTH: number;
declare const BUDDY_GUY_WIDTH: number;
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
/** The size Discord shows a profile picture at, and asks for at least 128 of. */
declare const PROFILE_SIZE = 512;
/**
 * A guy as a profile picture (Discord and the like): square, with room all round so the round crop
 * never cuts him, his buddy or his aura, centred on all of them, on a solid ground in a light tint
 * of his own colour, or on the backdrop he wears, run out to every edge. Every frame of the move.
 */
declare function profileFrames(spec: GuySpec, move?: Move): Frames;
/** A still profile picture as a PNG, about `size` across. */
declare function toProfilePng(spec: GuySpec, size?: number): Promise<Uint8Array>;
/** A moving profile picture as a GIF, about `size` across: Discord takes animated pictures only as GIFs. */
declare function toProfileGif(spec: GuySpec, size?: number, move?: Move): Uint8Array;
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
 * (`idle`, `hop`…), `still` (his first idle frame), `card` or `card-still`, `pfp` or `pfp-still`
 * (a profile picture, `profileFrames`), `art` or `art-still` (his big card's window alone, a square:
 * `cardArtPlayer`).
 * Null for a view there isn't.
 */
declare function bakeView(spec: CardSpec, view: string): Frames | null;
/** `<lil-guy>` with the library on the page: baked in the page, or from a host if given. */
declare function defineLilGuyHere(options?: Omit<LilGuyOptions, 'bake'>): void;

//#endregion
//#region src/craft.d.ts
/**
 * Crafting, as in TF2. A copy you don't want smelts into metal, and metal
 * crafts the exact item you want.
 *
 * Metal comes in scrap: three scrap are a reclaimed, three reclaimed a
 * refined. A crafted copy is Plain, with a craft number: the count of every
 * copy ever crafted, so the first ones are worth having for that alone.
 */
declare const SCRAP = 1;
declare const RECLAIMED = 3;
declare const REFINED = 9;
/** Metal to craft one item of your choice. */
declare const CRAFT_COST = 9;
/** Metal to paint a hat or a buddy. Scraping the paint off is free. */
declare const PAINT_COST = 3;
/**
 * What a copy smelts into, or 0 when it can't be: a starter (it's free), a
 * Grail or an aura (too rare to melt down by accident), or a showpiece.
 */
declare function smeltValue(o: Owned): number;
/** Whether an item can be crafted: anything a machine holds but its showpiece and the free hat. */
declare const craftable: (it: Item | undefined) => boolean;
/** Metal as TF2 writes it: refined with a hundredth per scrap, `2.44 ref`. */
declare function metalText(scrap: number): string;
/** Metal as coins: `{ refined, reclaimed, scrap }`. */
declare function metalCoins(scrap: number): {
  refined: number;
  reclaimed: number;
  scrap: number;
};
/** A crafted copy: Plain, a float and print from the seed, and its craft number. */
declare function craftCopy(itemId: string, seed: string, number: number): Owned;

//#endregion
//#region src/name-key.d.ts
/**
 * A claimed name as it is kept: lowercase letters and digits, with underscores only between them
 * (`cool_guy`, never `_cool`, `cool_` or `cool__guy`), 2 to 16 long.
 */
declare const NAME_KEY: RegExp;
/** Whatever a player typed, as a name key: other characters dropped, runs of underscores made one, none at the ends. */
declare function nameKey(typed: string): string;
/**
 * The name with its underscores taken out. Names claimed before underscores were allowed lost theirs
 * (`cool_guy` was claimed as `coolguy`), so two names with the same skeleton are one name: a new claim
 * can't take `cool_guy` while `coolguy` is held, and `cool_guy` finds `coolguy`'s guy.
 */
declare const nameSkeleton: (key: string) => string;

//#endregion
export { ARM_NAMES, ART_VERSION, AURAS, AURA_ODDS, AnimateOptions, AnimatedSvgOptions, Animation, AnimationFrame, AvatarConfig, BAKED_SIZE, BUDDY_GUY_WIDTH, BakedKind, CAPSULE_ONLY, CARD_EDGES, CARD_FRAGMENT, CARD_GOLDS, CARD_HEIGHT, CARD_LOOKS, CARD_WIDTH, CRAFT_COST, CardEdge, CardFace, CardGold, CardInput, CardLook, CardPlayerOptions, CardShader, CardSpec, CardStyle, ColorToken, DEAL_PREFIX, DEEP_BLUE_PRINTS, DEFAULT_COLORS, DEFAULT_COLORS_DARK, DEFAULT_COLORS_LIGHT, EFFECTS, EMOTE_UNLOCKS, Effect, Emote, FACE_BUDDY_SPOTS, FACE_HEIGHT, FACE_WIDTH, FINISHES, FOOT_NAMES, FOOT_STYLES, FOUNDER_COPIES, FOUNDER_LOOK, FOUNDER_RANK, FOUNDER_SEED, FRAME_HEIGHT, FRAME_SLOTS, FRAME_WIDTH, FX_IDS, FaceBuddySpot, FaceSpec, Finish, Frames, Fx, GAMES, GLSL_COMMON, GLSL_LOOKS, GOLD_RIM_DAYS, GRADES, GRID_SIZE, GUY_HEIGHT, GUY_TIERS, GUY_WIDTH, GameId, Grade, GuyRank, GuySpec, HEADROOM, Hover, Intensity3D, Item, ItemGame, LOOP_MS, LUCKY_ODDS, LilGuyOptions, Look, LookOptions, LookSlot, MAX_PINS, MOVES, Move, NAME_KEY, Note, ONE_OF_ONE_AURAS, Owned, PAINTABLE, PAINTS, PAINT_COST, PAINT_IDS, PART_ODDS, PART_SLOTS, PINS, PROFILE_SIZE, PaintId, Palette, PartDrop, Pin, PixelGrid, PixelTarget, RECLAIMED, REFINED, RETIRED_EYES, RenderOptions, SCRAP, SHADER_FINISHES, SHADE_COUNT, SHINE_FRAGMENT, SHOWPIECE_WEIGHT, SMALL_SIZE, ShareOptions, Shine, Slot, Surface, SurfaceKind, TAG_MAX, TIER_ICONS, TONE_NAMES, TRAIT_ICONS, TRAIT_SLOTS, Tier, TraitOdds, TraitSlot, Unlocks, View, VoxelColumn, VoxelMesh, VoxelOptions, VoxelSource, WEAR, WIDE_FRAME_WIDTH, accessories, allowed, animate, animateLoop, animateOptions, applyFx, auraById, auraCells, auraColor, auraColors, bakeCard, bakeGuy, bakeView, bakedImage, bodies, buddyAlone, buddyLift, cardArtFrames, cardArtPlayer, cardFace, cardFaceAt, cardFrames, cardPlayer, cardStill, cheeks, cleanTag, closeEyes, collectorNotes, compose, composeBase, copyOneIn, craftCopy, craftable, createCardShader, createShine, dealOf, decode, decodeLook, defineLilGuyHere as defineLilGuy, drawFrame, dress, encode, encodeApng, encodeGif, encodeLook, encodePng, eyes, faceMoves, faceSpec, finishColor, floatShare, frameAt, freeItem, fxColor, gameItems, getColor, getPalette, gradeOf, guyCode, guyOneIn, guyRank, guyScore, hair, hash, hashNth, heads, inSeason, isFounder, isFounderCopy, isMove, itemById, itemFrame, itemWeight, items, lookFor, lookOf, luckyPalette, machineName, machineSet, makeSeed, metalCoins, metalText, mouths, mysteryMachine, nameKey, nameOf, nameSkeleton, nebulaPhase, noiseOf, ownedOf, paint, painted, paletteOf, palettes, partCode, partCost, partName, pickable, pinById, profileFrames, rareParts, readGuyCode, readPart, resolve, resolveColor, roll, rollFx, rollPart, rollSeason, setProgress, shadePalette, sheetOf, shineData, shineFit, shineFrame, shines, shows, slotOf, smeltValue, special, squashRows, starter, surfaceOf, tallyMarks, temperTint, textWidth, toAnimatedSvg, toCardArtGif, toCardArtPng, toCardGif, toCardPng, toGuyGif, toPng, toProfileGif, toProfilePng, toShareSvg, toSvgString, tradeFloat, tradeGames, traitOdds, unlocksOf, upscale, voxelColumns, voxelItem, voxelMesh, wearOf, withItems };