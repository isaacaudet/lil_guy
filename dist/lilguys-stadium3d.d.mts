import "three";

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
 *   Op, Impossible and Grid, are Grails beside Gold
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
} //#endregion
//#region src/animate.d.ts
interface AnimateOptions extends RenderOptions {
  /** Show the best equipped copy's grade: shine, aura, sparkles and a trail. Default true. */
  rarity?: boolean;
  /** An emote to show over the whole move, bobbing beside his head; mind blown and galaxy brain open the head instead (`openHead`). */
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
  /**
   * Drawn for a small view (an icon, a face), where an aura's pieces are a stray pixel or two: the
   * aura shows as one ring round the guy in bands of its own colours (`glanceRing`), as a copy of
   * Prized or better already rings the guy in its grade's colour.
   */
  glance?: boolean;
}
/**
 * Poses: the guy as he is, with eyes shut or glancing, with an arm up or
 * down, and with a few expressions — a laugh for a win, a wobble for a loss,
 * an "ooh" when squished. His own eyes stay: they are who he is.
 */

/**
 * Little pictures that pop up beside the head. Three are manga's own: a sweat
 * drop, the cross-shaped anger vein and a little floating heart. The last four
 * are thoughts: a light bulb, a burst, a daydream's cloud and a galaxy.
 */
type Emote = 'note' | 'question' | 'bang' | 'heart' | 'zzz' | 'crown' | 'fire' | 'sweat' | 'anger' | 'hearts' | 'bulb' | 'burst' | 'cloud' | 'galaxy'; //#endregion
//#region src/guy-code.d.ts

/**
 * Emotes a player can show after a game, and how each is unlocked. The
 * moves use some on their own; `emote` in the options shows one over any move
 * (mind blown and galaxy brain by opening the head, `openHead`).
 */
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
declare const ART_VERSION = 16;
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

//#endregion
//#region src/stadium.d.ts
/** What a card shows, as an address carries it. */

/** The venues, smallest first: who fits. */
declare const VENUES: readonly [{
  readonly id: "porch";
  readonly name: "The porch";
  readonly upTo: 20;
}, {
  readonly id: "bleachers";
  readonly name: "The bleachers";
  readonly upTo: 50;
}, {
  readonly id: "gym";
  readonly name: "The gym";
  readonly upTo: 100;
}, {
  readonly id: "hall";
  readonly name: "The hall";
  readonly upTo: 200;
}, {
  readonly id: "arena";
  readonly name: "The arena";
  readonly upTo: 1000;
}, {
  readonly id: "stadium";
  readonly name: "The stadium";
  readonly upTo: 5000;
}, {
  readonly id: "bowl";
  readonly name: "The bowl";
  readonly upTo: 12000;
}];
type VenueId = (typeof VENUES)[number]['id'];
/** The venue for `count` people: the smallest that seats them all (the bowl past its size). */
declare const venueFor: (count: number) => VenueId;

//#endregion
//#region src/stadium3d-layout.d.ts
/**
 * The seats of venue `id`, in the order they fill: the front row first, from the middle out, then the row
 * behind, so a part-full venue is full at the front. Laid out for a canvas (`width` × `height` CSS pixels
 * at `dpr`, 1280 × 720 at 1 unless given) and `count` people (the venue's size unless given), as a
 * stadium on that canvas lays it out.
 */
/** A tier of the stand: each row's rise and depth, and the share of the rows it ends at. */
interface Tier3D {
  rise: number;
  tread: number;
  share: number;
}
/** How a venue's stand is shaped and framed. */
interface Spec3D {
  shape: 'steps' | 'line' | 'arc';
  /** An arc's front row radius, and how far it turns either side of the middle at most (radians). */
  radius: number;
  span: number;
  /** Seat to seat along a row. */
  pitch: number;
  tiers: Tier3D[];
  /** Between tiers: the fascia's height and the walkway's depth. */
  fascia: number;
  walkway: number;
  /** Seats between stair aisles (0 for none) and an aisle's width. */
  section: number;
  aisle: number;
  /** The front row's floor above the pitch, and how many rows the venue has at most. */
  front: number;
  rowsMax: number;
  /** The camera: vertical field of view and downward tilt (degrees), and where the stand sits in the frame. */
  fov: number;
  tilt: number;
  feet: number;
  top: number;
  /** The tallest a front-row guy may be, as a share of the canvas's height. */
  cap: number;
  /** Rows of empty benches kept above the people (bleachers, a gym's pull-outs). */
  empty: number;
  /** Laid out for the venue's capacity, not the people in now (its benches never change). */
  fixed?: boolean;
  /** Rows are centred groups of the people present (the porch), at most this many rows. */
  centred?: number;
}
/** Each venue's stand and camera. */
declare const SPECS: Record<VenueId, Spec3D>;
/** The most a venue seats, however many come: past it, guys wait for a seat. */

/**
 * How many people a venue is laid out for while `count` are in: steps of about 15% (the porch and
 * bleachers, every head). A venue's first step is already 15% past its first head, so the people
 * walking in just behind them don't lay it out again.
 */
declare function stepFor(count: number): number;
/**
 * What a venue laid out for `laid` people (`laidVenue`) does now that `count` are in: grows at once,
 * but only shrinks once the crowd is well under it (a step and a bit, or a venue's first head and a
 * twentieth), so someone joining and leaving at a step's edge doesn't lay it out again each time.
 */

type Vec3 = [number, number, number];
/** A perspective camera: where it is, what it looks at, its vertical field of view (degrees) and aspect. */
interface Camera3D {
  position: Vec3;
  target: Vec3;
  fov: number;
  aspect: number;
  near: number;
  far: number;
}
/** Projects world points through a camera to normalised device coordinates (x right, y up, -1 to 1). */

/** A row: its tier, its floor's height above the front row's, how far back it is (or its radius on an arc), and its seats. */
interface Row3D {
  tier: number;
  y: number;
  back: number;
  radius: number;
  first: number;
  seats: number;
}
/** A seat: where a guy's feet are, which way they face (radians about y), their row, and how tall they are on the canvas (a share of its height). */
interface Seat3D {
  x: number;
  y: number;
  z: number;
  yaw: number;
  row: number;
  h: number;
}
/** A row's profile, front first: its tier, floor height above the front row and depth behind it, up to `rowsMax`. */

/** The venue laid out on a canvas. */
interface Layout3D {
  id: VenueId;
  spec: Spec3D;
  aspect: number;
  /** How many it was laid out for. */
  count: number;
  camera: Camera3D;
  /** Rows with seats, then any empty ones kept above them. */
  rows: Row3D[];
  /** Every seat, in the order they fill: the front row's middle first. */
  seats: Seat3D[];
  /** Rows that hold people (the rest are empty benches). */
  used: number;
  /** Aisles: their middles, as x (a line) or angles (an arc), in the lower tier's terms. */
  aisles: number[];
  /** How far the stand runs either side: half a width (a line) or an angle (an arc), past what the camera sees. */
  reach: number;
  /** The camera's depth to the front row's middle and to the last row's. */
  depth: [number, number];
}
/** Lays venue `id` out on a canvas of `aspect` (width over height) for `count` people. */
declare function layout3d(id: VenueId, aspect: number, count: number): Layout3D;
/** Sizes a far guy's picture comes in, in device pixels square. */

/**
 * Which of the first `count` seats get a whole 3D guy: those at least `nearPx` device pixels tall on a
 * canvas `devH` tall, the biggest first, at most `most`. Everyone else is a picture of their own guy.
 */
declare function nearSeats(seats: readonly Seat3D[], count: number, devH: number, nearPx: number, most: number): Set<number>;
/** The picture size for far guys up to `px` device pixels tall: the smallest that is a little bigger, so a picture is never stretched. */
declare function tileFor(px: number): number;

//#endregion
//#region src/stadium3d-front.d.ts
/** A sign's colours: the plain card, gold for an exact guess, or the game's own colour (the round's closest). */
type SignTone = 'plain' | 'gold' | 'accent';
/** A box on the canvas in CSS pixels from its top left. */
interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

//#endregion
//#region src/stadium3d.d.ts
/** A sign that wants holding up: the top of the guy's head on the canvas and how tall they are there, and the sign's size, all CSS px. */

/** How a guy takes a result: an exact guess, a close one, or a long way off. */
type Reaction = 'exact' | 'close' | 'far';
interface Stadium3DOptions {
  /** A slow wave round the stands. */
  wave?: boolean;
  /** Called when the crowd moves to a bigger (or smaller) venue. */
  onVenue?: (id: VenueId) => void;
  /** The font for a spotlit guy's line, as a CSS font. */
  font?: string;
  /** The most device pixels per CSS pixel it draws at (2 by default; phones are capped lower by the canvas's size). */
  maxPixelRatio?: number;
  /** Milliseconds a frame it may spend making guys' toys and pictures (6 by default; more while thousands wait). */
  budget?: number;
  /** Smooth edges (on by default). */
  antialias?: boolean;
  /** Soft shadows from the venue's main light (on by default). */
  shadows?: boolean;
  /**
   * A transparent canvas laid exactly over `canvas`, for what is drawn in front of the stands: the signs guys
   * hold up, their sparks, and the spotlit winner with their line. It draws at the device's full resolution
   * (up to 2× CSS), so all of that stays sharp when the stands draw at fewer pixels (`maxPixelRatio`).
   * Without it, they are drawn into `canvas` after the stands.
   */
  front?: HTMLCanvasElement;
  /** The font signs are lettered in, as a CSS font (its size is set to fit each guy). */
  signFont?: string;
  /** The colour of a sign in the game's own colour (`sign(..., 'accent')`): the club's coral by default. */
  signAccent?: string;
}
/** What a frame cost and holds, for a game that watches its budget. */
interface Stadium3DInfo {
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
  toys: number;
  pictures: number;
  waiting: number;
  pixelRatio: number;
  signs: number;
  frontPixelRatio: number;
}
interface Stadium3D {
  /** Seats a guy by name (lowercased, once), in their club look when given. The venue grows to fit. */
  add(name: string, guy?: Partial<GuySpec>): void;
  /** Takes a guy out; the venue shrinks again if it can. */
  remove(name: string): void;
  has(name: string): boolean;
  /** Makes a guy hop, as when they guess. */
  hop(name: string): void;
  wave(on: boolean): void;
  /**
   * Swings a spotlight onto a guy, who leaps out of their seat to the front with their line under them for
   * `ms`: light rays behind them, confetti falling round them. `at` is where across the frame they would
   * rather land, -1 the left edge to 1 the right (the middle by default); they land as near it as keeps clear
   * of what `keepOut` names, a little smaller if they must.
   */
  spotlight(name: string, label?: string, ms?: number, at?: number): void;
  /**
   * How many frames a second it draws at most: 0 holds the last frame and makes nothing until it is paced
   * again (a game's busy moment), 60 or more every frame.
   */
  pace(fps: number): void;
  /**
   * Holds `text` (a guess, say) up on a sign over a guy's head, or puts it down with null. Signs go up only
   * where they have clear room, gold ones first, then the accent's, then the newest; the rest stay down
   * while their guys still hop, and guys too far back to read hold up a dot. A new number pops; a new tone
   * flips the card.
   */
  sign(name: string, text: string | null, tone?: SignTone): void;
  /** Puts every sign down. */
  clearSigns(): void;
  /**
   * A guy takes a result, after `delay` ms: 'exact' leaps high with a turn in the air and sparks and
   * confetti over them (a sign they hold flips to gold), 'close' cheers with a sparkle, 'far' slumps or shrugs.
   */
  react(name: string, how: Reaction, delay?: number): void;
  /** A quick ripple through everyone, left to right; anyone reacting carries on with that. */
  ripple(): void;
  /**
   * Boxes of the canvas the game covers with its own things (CSS px from the canvas's top left): no sign
   * goes up there, and the spotlit winner lands clear of them. `soon`: more the winner alone keeps clear
   * of, such as room the game's own things are about to grow into, so the winner needn't move, unless that
   * would leave them tiny (then they glide aside if it comes).
   */
  keepOut(rects: Rect[], soon?: Rect[]): void;
  resize(): void;
  /** Frees everything it made on the GPU and stops drawing. */
  destroy(): void;
  info(): Stadium3DInfo;
  readonly count: number;
  readonly venue: VenueId;
}
/**
 * A 3D stadium on `canvas` (sized with CSS). Needs WebGL2 and three.js (a peer dependency); throws
 * where WebGL2 is missing, so a game can fall back to `createStadium`.
 */
declare function createStadium3D(canvas: HTMLCanvasElement, options?: Stadium3DOptions): Stadium3D;

//#endregion
/** A soft round fall-off, for pools of light and glows. */

export { ART_VERSION, Layout3D, Reaction, Rect, SPECS, Seat3D, SignTone, Spec3D, Stadium3D, Stadium3DInfo, Stadium3DOptions, VENUES, VenueId, createStadium3D, layout3d, nearSeats, stepFor, tileFor, venueFor };