// 16x16 grid where each cell is a color token (0-8)
// 0=transparent, 1=body, 2=feature, 3=pattern, 4=accent, 5=outline, 6=eye-white, 7=eye-pupil, 8=mouth
export type PixelGrid = number[][];

export type ColorToken = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface Palette {
  name: string;
  colors: Record<Exclude<ColorToken, 0>, string>; // token → hex color, no mapping for 0 (transparent)
}

export type Intensity3D = "none" | "subtle" | "medium" | "dramatic";

export interface AvatarConfig {
  head: number;
  eyes: number;
  mouth: number;
  hair: number;
  body: number;
  accessory: number;
  palette: number;
  rotation: number; // index into SPHERE_POSITIONS
}

export interface RenderOptions {
  size?: number;
  square?: boolean;
  palette?: Palette;
  parts?: Partial<Omit<AvatarConfig, 'palette'>>;
}

export const GRID_SIZE = 16;
