import type { AvatarConfig, PartPlacement, PixelGrid } from '../types';

/**
 * v2 draws on a 32x32 grid — exactly twice v1's 16. Every v1 part converts by
 * doubling each pixel, so the old art carries over without being redrawn.
 */
export const GRID_SIZE_V2 = 32;

/** Pixels per v1 cell. Placement is measured in cells and applied in pixels. */
export const CELL = 2;

/**
 * v1's nine tokens plus a highlight:
 * 0 transparent, 1 body, 2 feature, 3 pattern, 4 accent, 5 outline,
 * 6 eye white, 7 pupil, 8 mouth, 9 highlight.
 */
export type ColorTokenV2 = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface PaletteV2 {
  /** Stable forever, e.g. "rose-gold". Commerce and saves refer to this. */
  id: string;
  name: string;
  /** Token 9 (highlight) is optional; it is derived from the body when absent. */
  colors: Record<Exclude<ColorTokenV2, 0 | 9>, string> & { 9?: string };
}

/** Every slot a part can live in. `top` is v1's `hair` (hair and hats). */
export type Slot = 'head' | 'eyes' | 'mouth' | 'top' | 'body' | 'accessory' | 'outfit' | 'held' | 'backdrop';

export type PartSource = 'free' | 'earned' | 'plus' | `pack:${string}`;

export interface PartMeta {
  /** Stable forever, e.g. "top.chef-hat". Purchases and unlocks key on this. */
  id: string;
  slot: Slot;
  /** Position in its slot's array. Arrays are append-only, so this never moves. */
  index: number;
  /** Shown in the builder, e.g. "chef hat". */
  name: string;
  source: PartSource;
  tags: string[];
  rarity?: 'common' | 'rare' | 'legendary';
  /** Library version the part first shipped in, for "new" badges. */
  introduced: string;
}

/** One authored part: its art, where it sits, and what it is. */
export interface PartDef {
  id: string;
  name: string;
  grid: PixelGrid;
  placement?: PartPlacement;
  /** Eyes only: an authored closed frame. Without one, the blink is derived. */
  blink?: PixelGrid;
  source?: PartSource;
  tags?: string[];
  rarity?: PartMeta['rarity'];
  introduced: string;
}

/**
 * A v1 config plus the slots v2 adds. Every new field defaults to "nothing",
 * so any v1 config is a valid v2 config and draws exactly as it did.
 */
export interface AvatarConfigV2 extends AvatarConfig {
  /** Index into `outfits`; 0 is none. */
  outfit?: number;
  /** Index into `held`; 0 is none. */
  held?: number;
  /** Index into `backdrops`; 0 is none. Only drawn on cards, never in lists. */
  backdrop?: number;
  /**
   * Per-slot colour choice: draw the hat or outfit from another palette's
   * colours (an index into `palettesV2`) while the guy keeps his own.
   */
  tints?: { top?: number; outfit?: number };
}

export type AnimationState = 'still' | 'idle' | 'happy' | 'sad' | 'cheer' | 'look';
