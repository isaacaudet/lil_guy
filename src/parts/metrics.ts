import type { PixelGrid } from '../types';
import { GRID_SIZE } from '../types';
import { heads } from './heads';

/** Horizontal span of filled pixels on a single row. */
export interface RowExtent {
  left: number;
  right: number;
}

/**
 * Geometry of a head silhouette, used to place every other layer.
 *
 * Parts are authored against a reference head (see REFERENCE below) and then
 * shifted/clipped to fit whichever head was actually rolled, so hats rest on
 * the skull instead of floating above it and cheek marks stay on the face.
 */
export interface HeadMetrics {
  /** First row containing any pixel. */
  top: number;
  /**
   * First unbroken row — the crown of the main mass. On a head wearing horns
   * or ears this sits below `top`, and it is where a hat has to rest: seating
   * a hat on the horn row leaves it hovering over the gap between the horns.
   */
  crown: number;
  /** Last row of the contiguous main mass — feet and drips are excluded. */
  bottom: number;
  /** Per-row horizontal span, or null for empty rows. */
  rows: (RowExtent | null)[];
}

function rowExtent(row: number[]): RowExtent | null {
  let left = -1;
  let right = -1;
  for (let x = 0; x < GRID_SIZE; x++) {
    if (row[x] !== 0) {
      if (left === -1) left = x;
      right = x;
    }
  }
  return left === -1 ? null : { left, right };
}

function isContiguous(row: number[], extent: RowExtent): boolean {
  for (let x = extent.left; x <= extent.right; x++) {
    if (row[x] === 0) return false;
  }
  return true;
}

function measure(head: PixelGrid): HeadMetrics {
  const rows = head.map(rowExtent);

  const top = rows.findIndex(e => e !== null);

  // Find the widest unbroken row — the body's waist — then walk down from it
  // to the last unbroken row. Anything past that is feet or drips, which
  // shouldn't anchor belly patterns or a bowtie. Starting from the waist rather
  // than from `top` is what lets a head wear horns or ears: those rows are
  // broken, but they sit above the mass rather than ending it.
  let crown = top;
  for (let y = top; y < GRID_SIZE; y++) {
    const extent = rows[y];
    if (extent && isContiguous(head[y], extent)) {
      crown = y;
      break;
    }
  }

  let waist = top;
  let widest = -1;
  for (let y = top; y < GRID_SIZE; y++) {
    const extent = rows[y];
    if (!extent || !isContiguous(head[y], extent)) continue;
    const width = extent.right - extent.left + 1;
    if (width > widest) {
      widest = width;
      waist = y;
    }
  }

  let bottom = waist;
  for (let y = waist; y < GRID_SIZE; y++) {
    const extent = rows[y];
    if (!extent || !isContiguous(head[y], extent)) break;
    bottom = y;
  }

  return { top, crown, bottom, rows };
}

export const headMetrics: HeadMetrics[] = heads.map(measure);

/**
 * Every non-head part is drawn against this silhouette: toppers rest at row 4,
 * eyes occupy rows 5-7, the mouth rows 8-9, and belly motifs rows 10-12.
 * Placement shifts each layer by the delta between this and the rolled head.
 */
export const REFERENCE = headMetrics[0];
