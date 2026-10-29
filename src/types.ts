/**
 * A 16x16 grid where each cell is a colour token. Tokens are roles, not
 * colours — "body", "blush", "hat" — and a palette decides what each looks
 * like, so every part works in every colourway.
 */
export type PixelGrid = number[][];

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
export type ColorToken = number;

export interface Palette {
  name: string;
  colors: Record<number, string>; // token → hex colour; 0 is transparent
}

/** The capsule machines: the DLE Club games that have items, and the Pet shop. */
export type GameId =
  | 'amountle' | 'halfsies' | 'stackdle' | 'flipsies' | 'puttsies'
  | 'weighsies' | 'cutsies' | 'tiltsies' | 'trackdle' | 'pets';

export type Intensity3D = "none" | "subtle" | "medium" | "dramatic";

export interface AvatarConfig {
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
  rotation: number; // index into SPHERE_POSITIONS
  /** Equipped item ids (see `items`). A skin replaces the body, a hat the topper. */
  skin?: string;
  hat?: string;
  frame?: string;
  /** A tiny pet that sits beside him. */
  buddy?: string;
  /** An aura round him (see ./auras). */
  aura?: string;
  /** The owned copies behind those items, if known: finish, scuff, print. */
  owned?: Partial<Record<'skin' | 'hat' | 'frame' | 'buddy' | 'aura', import('./owned').Owned>>;
}

export interface RenderOptions {
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

export const GRID_SIZE = 16;
