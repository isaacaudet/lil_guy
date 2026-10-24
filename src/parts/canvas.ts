import { width, type Stamp } from './art';
import type { PixelGrid } from '../types';
import { GRID_SIZE } from '../types';

export interface RowExtent {
  left: number;
  right: number;
}

/**
 * The grid a guy is being drawn on, plus the measurements every part needs to
 * sit properly on whichever shape it landed on: where the crown is, how wide
 * each row is, where the eyes go.
 *
 * Measurements are taken from the bare silhouette once, before anything is
 * worn, so a hat cannot change where the next part thinks the head is.
 */
export class Canvas {
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
  private readonly body: boolean[][];

  /**
   * The silhouette is everything the starting drawing covers — a plain body,
   * or a skin like a jar or a golf ball, which is drawn in its own colours.
   */
  constructor(grid: PixelGrid, eyeLine: number) {
    this.grid = grid;
    this.eyeLine = eyeLine;
    this.body = grid.map(row => row.map(v => v !== 0));
    this.rows = this.body.map(row => {
      const left = row.indexOf(true);
      return left === -1 ? null : { left, right: row.lastIndexOf(true) };
    });
    const waist = this.rows[eyeLine]!;
    this.centre = (waist.left + waist.right + 1) / 2;
    // The crown is the top of the head at its middle, so a hat sits on the
    // head and not on a crab's raised claw or between a bat's ears.
    const mid = Math.floor(this.centre);
    const tops = [mid - 1, mid].map(x => this.topOf(x)).filter((y): y is number => y !== null);
    this.crown = tops.length ? Math.min(...tops) : this.rows.findIndex(r => r !== null);
    let bottom = this.crown;
    this.rows.forEach((r, y) => { if (r) bottom = y; });
    this.bottom = bottom;
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
  }

  /** Whether the bare silhouette covers this cell. */
  isBody(x: number, y: number): boolean {
    return this.inside(x, y) && this.body[y][x];
  }

  get(x: number, y: number): number {
    return this.inside(x, y) ? this.grid[y][x] : 0;
  }

  /**
   * The grid's border belongs to the outline, so parts never paint on it: a
   * hat on a tall head or an arm beside a wide one stops a pixel short instead
   * of running off the edge with no outline.
   */
  set(x: number, y: number, token: number): void {
    if (x > 0 && y > 0 && x < GRID_SIZE - 1 && y < GRID_SIZE - 1) this.grid[y][x] = token;
  }

  /** First row the bare body covers in this column, or null. */
  topOf(x: number): number | null {
    for (let y = 0; y < GRID_SIZE; y++) if (this.isBody(x, y)) return y;
    return null;
  }

  /** First row at least `min` wide — where ears can sit on a pointed head. */
  shoulder(min = 8): number {
    for (let y = this.crown; y <= this.bottom; y++) {
      const r = this.rows[y];
      if (r && r.right - r.left + 1 >= min) return y;
    }
    return this.crown;
  }

  /**
   * Draws a stamp with its top-left at (x, y). `onBody` keeps it to the bare
   * silhouette, which is what stops a face from hanging off a narrow head.
   */
  draw(s: Stamp, x: number, y: number, onBody = false): void {
    s.forEach((row, dy) => row.forEach((token, dx) => {
      if (!token) return;
      if (onBody && !this.isBody(x + dx, y + dy)) return;
      this.set(x + dx, y + dy, token);
    }));
  }

  /** Left column that centres a stamp on the body. */
  centred(s: Stamp): number {
    return Math.floor(this.centre - width(s) / 2);
  }

  /** Repaints every body cell in a row. */
  paintRow(y: number, token: number): void {
    const r = this.rows[y];
    if (!r) return;
    for (let x = r.left; x <= r.right; x++) if (this.isBody(x, y)) this.set(x, y, token);
  }
}
