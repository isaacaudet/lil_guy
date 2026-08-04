// 16x16 grid where each cell is a color token (0-8)
// 0=transparent, 1=body, 2=feature, 3=pattern, 4=accent, 5=outline, 6=eye-white, 7=eye-pupil, 8=mouth
export type PixelGrid = number[][];

export type ColorToken = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface Palette {
  name: string;
  colors: Record<Exclude<ColorToken, 0>, string>; // token → hex color, no mapping for 0 (transparent)
}

export type Intensity3D = "none" | "subtle" | "medium" | "dramatic";

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
export type PartPlacement = "field" | "face" | "top" | "lower" | "edge" | "float";

export interface AvatarConfig {
  head: number;
  eyes: number;
  mouth: number;
  hair: number;
  body: number;
  accessory: number;
  palette: number;
  rotation: number; // index into SPHERE_POSITIONS
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
