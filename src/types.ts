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
 * 17 gold shade   18 red
 */
export type ColorToken =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
  | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18;

export interface Palette {
  name: string;
  colors: Record<Exclude<ColorToken, 0>, string>; // token → hex colour; 0 is transparent
}

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
  rotation: number; // index into SPHERE_POSITIONS
}

export interface RenderOptions {
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

export const GRID_SIZE = 16;
