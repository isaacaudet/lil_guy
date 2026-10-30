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

//#endregion
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
  readonly frostbite: {
    readonly name: "Frostbite";
    readonly hex: "#9FD6F0";
    readonly month: "2026-11";
  };
  readonly 'last-ember': {
    readonly name: "Last Ember";
    readonly hex: "#C4502A";
    readonly month: "2026-11";
  };
  readonly evergreen: {
    readonly name: "Evergreen";
    readonly hex: "#2F6B45";
    readonly month: "2026-12";
  };
  readonly 'candy-cane': {
    readonly name: "Candy Cane";
    readonly hex: "#E04A5A";
    readonly month: "2026-12";
  };
  readonly midnight: {
    readonly name: "Midnight Blue";
    readonly hex: "#232F5C";
    readonly month: "2027-01";
  };
  readonly champagne: {
    readonly name: "Champagne";
    readonly hex: "#E9D9A6";
    readonly month: "2027-01";
  };
  readonly sweetheart: {
    readonly name: "Sweetheart";
    readonly hex: "#E36A8E";
    readonly month: "2027-02";
  };
  readonly 'sugar-plum': {
    readonly name: "Sugar Plum";
    readonly hex: "#6B3B6E";
    readonly month: "2027-02";
  };
  readonly 'lucky-clover': {
    readonly name: "Lucky Clover";
    readonly hex: "#3FA35B";
    readonly month: "2027-03";
  };
  readonly puddle: {
    readonly name: "Puddle Grey";
    readonly hex: "#8A93A0";
    readonly month: "2027-03";
  };
  readonly blossom: {
    readonly name: "Cherry Blossom";
    readonly hex: "#F3B8C8";
    readonly month: "2027-04";
  };
  readonly 'robins-egg': {
    readonly name: "Robin’s Egg";
    readonly hex: "#8FD3D0";
    readonly month: "2027-04";
  };
};
type PaintId = keyof typeof PAINTS; //#endregion
//#region src/owned.d.ts
/**
 * Owned copies of items, collected like toys.
 *
 * An item (`puttsies.ball`) is a design. A copy someone owns adds:
 *
 * - a **finish**: the paint job. Plain is common; Sunset, Tempered, Nebula,
 *   Prism, Negative and Gold are progressively rarer, and three graphic ones,
 *   Op, Impossible and Grid, sit beside Prism and Negative
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
type Finish = 'plain' | 'sunset' | 'tempered' | 'nebula' | 'prism' | 'negative' | 'gold' | 'classic' | 'fade' | 'frost' | 'toxic' | 'shadow' | 'sapphire' | 'ruby' | 'pearl' | 'op' | 'impossible' | 'grid';
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

//#endregion
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
 * 17 gold shade   18 red           19 deep shade
 * 20–28 the equipped skin's own colours, 30–38 the hat's, 40–48 the frame's,
 * 50–58 the buddy's
 */

interface Palette {
  name: string;
  colors: Record<number, string>;
}
/** The capsule machines: the DLE Club games that have items, and the Pet shop. */
type GameId = 'amountle' | 'halfsies' | 'stackdle' | 'flipsies' | 'puttsies' | 'weighsies' | 'cutsies' | 'tiltsies' | 'trackdle' | 'pets';
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
//#region src/palette.d.ts
declare const palettes: Palette[];
declare function getPalette(index: number): Palette;
/** The palette a guy is drawn in: their colourway, in their tone. Lucky keeps it (`luckyPalette`). */
declare function paletteOf(config: AvatarConfig): Palette;

//#endregion
//#region src/resolve.d.ts
declare function resolve(input: string, overrides?: RenderOptions['parts']): AvatarConfig;

//#endregion
//#region src/guy.d.ts
/** A guy as a version-1 code: `g1:` and his fields in base 36, dot-separated. */
declare function encodeGuy(config: AvatarConfig): string;
/**
 * A code back into a guy, or null for anything that isn't a version-1 code
 * this library can draw: another version, a field missing, or one out of range.
 * He comes back bare: items are worn on top with `dress`.
 */
declare function decodeGuy(code: string): AvatarConfig | null;

//#endregion
//#region src/render-string.d.ts
declare function toSvgString(input: string, options?: RenderOptions): string;

//#endregion
export { AvatarConfig, Palette, RenderOptions, accessories, bodies, cheeks, decodeGuy, encodeGuy, eyes, getPalette, hair, heads, mouths, paletteOf, palettes, resolve, toSvgString };