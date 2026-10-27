import { width, type Stamp } from './art';
import type { PixelGrid } from '../types';
import { GRID_SIZE } from '../types';

export interface RowExtent {
  left: number;
  right: number;
}

/** Where the face landed, once compose has placed the eyes and mouth. */
export interface Face {
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
  /** The very top of the head at its middle (on a pointed head, the tip). Hats see `crown` as `hatTop`. */
  readonly tip: number;
  /** Where the eyes and mouth go; set by compose before anything is worn. */
  face: Face | null = null;
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
    this.tip = this.crown;
    let bottom = this.crown;
    this.rows.forEach((r, y) => { if (r) bottom = y; });
    this.bottom = bottom;
  }

  /**
   * Places the face: the eye stamp's bottom row on the eye line, the mouth's
   * top row just under it, both centred. Everything worn is fitted to this.
   */
  setFace(eye: Stamp, mouth: Stamp): void {
    const x0 = this.centred(eye);
    const cols: number[] = [];
    for (let dx = 0; dx < width(eye); dx++) if (eye.some(row => row[dx])) cols.push(x0 + dx);
    const eyes: RowExtent[] = [];
    for (const x of cols) {
      const last = eyes[eyes.length - 1];
      if (last && x === last.right + 1) last.right = x; else eyes.push({ left: x, right: x });
    }
    const firstRow = eye.findIndex(row => row.some(Boolean));
    const m = this.placeMouth(eye, mouth);
    const top = m.line - eye.length + 1;
    this.face = { top: top + Math.max(0, firstRow), line: m.line, eyes, mouthTop: m.top, mouthBottom: m.top + m.art.length - 1, mouth: m.art };
  }

  /**
   * The mouth's top row goes just under the eyes, unless a pixel of it would
   * sit beside or under an eye pixel: eyes that run into a mouth turn a face
   * into one shape (an H, a box), and it stops reading as eyes and a mouth. A
   * corner touch is fine. Then the mouth drops a row or two where the head has
   * room for it, with a column of face either side if it can. Where it hasn't
   * (a heart's point, a car's bumper), the eyes go up a row instead.
   */
  private placeMouth(eye: Stamp, mouth: Stamp): { top: number; line: number; art: Stamp } {
    const ex = this.centred(eye), mx = this.centred(mouth), w = width(mouth);
    const eyeAt = (line: number) => {
      const at = new Set<number>(), ey = line - eye.length + 1;
      eye.forEach((row, dy) => row.forEach((t, dx) => { if (t && this.isBody(ex + dx, ey + dy)) at.add((ey + dy) * 64 + ex + dx); }));
      return at;
    };
    // No mouth pixel beside or under an eye pixel.
    const clear = (at: Set<number>, top: number) => mouth.every((row, dy) => row.every((t, dx) => {
      const x = mx + dx, y = top + dy;
      return !t || !this.isBody(x, y) || ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([ox, oy]) => at.has((y + oy) * 64 + x + ox));
    }));
    // Every pixel of it on the face, and with `margin` a column of face beyond each end (a tooth's roots split low down).
    const fits = (top: number, margin: boolean) => mouth.every((row, dy) => {
      const y = top + dy;
      if (!row.some(Boolean)) return true;
      return (!margin || (this.isBody(mx - 1, y) && this.isBody(mx + w, y))) && row.every((t, dx) => !t || this.isBody(mx + dx, y));
    });
    // Raised eyes must still be whole on the face, with a row of it above them.
    const eyesFit = (line: number) => {
      const ey = line - eye.length + 1;
      return eye.every((row, dy) => row.every((t, dx) => !t || (this.isBody(ex + dx, ey + dy) && this.isBody(ex + dx, ey + dy - 1))));
    };
    const line = this.eyeLine, top = line + 1, here = eyeAt(line);
    if (clear(here, top)) return { top, line, art: mouth };
    for (const margin of [true, false]) for (const drop of [1, 2]) {
      if (clear(here, top + drop) && fits(top + drop, margin)) return { top: top + drop, line, art: mouth };
    }
    if (eyesFit(line - 1)) {
      const up = eyeAt(line - 1);
      for (const drop of [0, 1]) if (clear(up, top + drop) && fits(top + drop, false)) return { top: top + drop, line: line - 1, art: mouth };
    }
    // A head with no room either way (a jellybean, a car): the corners of the
    // mouth's top row that would touch an eye are left off.
    const art = mouth.map((row, dy) => row.map((t, dx) => {
      const x = mx + dx, y = top + dy;
      return [[1, 0], [-1, 0], [0, -1]].some(([ox, oy]) => here.has((y + oy) * 64 + x + ox)) ? 0 : t;
    }));
    return { top, line, art };
  }

  /**
   * The row a collar, scarf or necklace goes on: three under the eye line, or
   * the first row under a mouth that reaches lower, where the body still has one.
   */
  get neck(): number {
    const low = (this.face?.mouthBottom ?? 0) + 1;
    return low > this.eyeLine + 3 && low <= this.bottom ? low : this.eyeLine + 3;
  }

  /**
   * The lowest row a hat or topper may paint on the head: it stops at least one
   * row above the eyes (two where the head has the room), so nothing worn on
   * top ever covers the face.
   */
  get floor(): number {
    const top = this.face ? this.face.top : this.eyeLine - 2;
    return Math.min(top - 1, Math.max(this.tip, top - 2));
  }

  /**
   * The first row wide enough to wear a hat on. On a round head it is the
   * crown; on a pointed one it is where the point has widened out, so a cap
   * sits round the head instead of balancing on its tip.
   */
  get hatTop(): number {
    for (let y = this.tip; y <= this.floor; y++) {
      const r = this.rows[y];
      if (r && r.right - r.left + 1 >= 6) return y;
    }
    return Math.min(this.tip, this.floor);
  }

  /**
   * The canvas as hats and toppers see it: its `crown` is `hatTop`, so every
   * "a row under the crown" lands on the head and not on a point.
   */
  forHats(): Canvas {
    const view = Object.create(this) as Canvas;
    // A row up where the forehead is short, so a band "a row under the crown" still lands above the floor.
    Object.defineProperty(view, 'crown', { value: Math.max(this.tip, Math.min(this.hatTop, this.floor - 1)) });
    return view;
  }

  /** A copy to try something on: the same measurements over its own grid. */
  clone(): Canvas {
    return Object.assign(Object.create(Canvas.prototype), this, { grid: this.grid.map(row => [...row]) });
  }

  /**
   * The same canvas with the head built up `k` rows into a dome, for a cap to
   * wrap on a head with almost no forehead. Returns the dome's cells too, so
   * whatever the cap leaves of them can be taken away again.
   */
  domed(k: number): { canvas: Canvas; dome: [number, number][] } {
    const grid = this.grid.map(row => [...row]), dome: [number, number][] = [];
    const r = this.rows[this.tip];
    if (r) for (let i = 1; i <= k && this.tip - i >= 1; i++) {
      const left = r.left + i, right = r.right - i;
      if (right - left < 1) break;
      for (let x = left; x <= right; x++) { grid[this.tip - i][x] = 1; dome.push([x, this.tip - i]); }
    }
    const canvas = new Canvas(grid, this.eyeLine);
    canvas.face = this.face;
    // The dome is a stand-in: the floor stays where the real face puts it.
    Object.defineProperty(canvas, 'floor', { value: this.floor });
    return { canvas, dome };
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
    else if (token) this.refused++;
  }

  /** Pixels `set` turned away at the border: what a part lost off the edge (`hatCut` counts them). */
  refused = 0;

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
