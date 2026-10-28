import { RETIRED_EYES } from './parts/weights';
import { heads, eyes, mouths, cheeks, hair, bodies, accessories } from './parts';
import { LAYER, LOCAL, T, width, type Stamp } from './parts/art';
import { Canvas, type Face } from './parts/canvas';
import { itemById, OWN_TOKENS, ownFinishTokens, type Item } from './items';
import { auraById, auraCells } from './auras';
import { goldRim, GOLD_RIM_DAYS, markItem } from './pins';
import { contrast, paletteOf } from './palette';
import type { AvatarConfig, PixelGrid } from './types';
import { GRID_SIZE } from './types';

/**
 * Feet, as columns either side of the centre seam. `null` tucks them away.
 */
export const FOOT_STYLES: (null | { offsets: number[]; token: number })[] = [
  { offsets: [2, 3], token: T.BODY },      // nubs
  { offsets: [2], token: T.BODY },         // tiptoes
  { offsets: [3, 4], token: T.BODY },      // wide stance
  { offsets: [2, 3], token: T.TRIM },      // socks
  null,                                    // tucked
];

/** Arm poses. */
export const ARM_STYLES = ['none', 'sides', 'wave'] as const;

/**
 * Light from the upper left, as on a glossy vinyl toy: a white specular point
 * and a gleam near the top-left of the head, a shade along the bottom and the
 * lower right, and a deeper shade where those meet. Applied the same way to
 * every shape, which is a lot of what makes the set look like one hand drew it.
 */
function light(c: Canvas): void {
  const middle = (c.crown + c.bottom) / 2;
  for (let y = c.crown; y <= c.bottom; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (!c.isBody(x, y)) continue;
      const below = !c.isBody(x, y + 1);
      const right = y > middle && !c.isBody(x + 1, y);
      if (below || right) c.set(x, y, below && x >= c.centre + 1 ? T.DEEP : T.SHADE);
    }
  }
  // The gleam sits one row in, where the head is wide enough to hold it.
  const y = c.crown + 1;
  const r = c.rows[y];
  if (r && r.right - r.left >= 5) {
    c.set(r.left + 1, y, T.WHITE);
    c.set(r.left + 2, y, T.LIGHT);
    if (c.isBody(r.left + 1, y + 1)) c.set(r.left + 1, y + 1, T.LIGHT);
  }
}

function feet(c: Canvas, style: number, limb: number): void {
  const spec = FOOT_STYLES[style];
  if (!spec) return;
  const base = c.rows[c.bottom];
  if (!base) return;
  const y = c.bottom + 1;
  const mid = Math.floor(c.centre);
  for (const off of spec.offsets) {
    for (const x of [mid - off, mid + off - 1]) {
      if (x >= base.left && x <= base.right) c.set(x, y, spec.token === T.BODY ? limb : spec.token);
    }
  }
}

function arms(c: Canvas, style: number, limb: number): void {
  const pose = ARM_STYLES[style];
  if (pose === 'none') return;
  const y = c.eyeLine + 2;
  const r = c.rows[y];
  // Arms need a column for themselves and one more for their outline.
  if (!r || r.left < 2 || r.right > GRID_SIZE - 3) return;

  const nub = (x: number, top: number) => { c.set(x, top, limb); c.set(x, top + 1, limb); };

  nub(r.left - 1, y);
  if (pose === 'sides') nub(r.right + 1, y);
  // A wave is the same nub lifted two rows, beside the cheek.
  if (pose === 'wave') {
    const raised = c.rows[y - 2];
    if (raised) nub(raised.right + 1, y - 2);
  }
}

/**
 * Every empty cell touching something gets the outline colour. Diagonals are
 * left open, which rounds the corners off instead of boxing them in. Lines
 * already drawn in the outline colour — an antenna stalk, a glasses frame —
 * don't get outlined themselves, or they'd come out three pixels thick.
 */
function outline(grid: PixelGrid): void {
  const filled = grid.map(row => row.map(v => v !== 0 && v !== T.OUTLINE));
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (grid[y][x] !== 0) continue;
      if (
        (y > 0 && filled[y - 1][x]) || (y < GRID_SIZE - 1 && filled[y + 1][x]) ||
        (x > 0 && filled[y][x - 1]) || (x < GRID_SIZE - 1 && filled[y][x + 1])
      ) grid[y][x] = T.OUTLINE;
    }
  }
}

/** Moves an item's `1`–`9` colours into its layer's range. */
function claim(grid: PixelGrid, layer: number): void {
  for (const row of grid) {
    for (let x = 0; x < GRID_SIZE; x++) if (row[x] >= LOCAL) row[x] = row[x] - LOCAL + layer;
  }
}

function skinOf(config: AvatarConfig): Item | undefined {
  const item = itemById(config.skin);
  return item?.slot === 'skin' ? item : undefined;
}

/** Where a guy's eyes and mouth sit, for anything that moves them afterwards (animate). */
export function faceOf(config: AvatarConfig): Face {
  const c = startCanvas(config);
  c.setFace(eyes[RETIRED_EYES.includes(config.eyes) ? 0 : config.eyes].art, mouths[config.mouth].art);
  return c.face!;
}

function startCanvas(config: AvatarConfig): Canvas {
  const skin = skinOf(config);
  if (skin) {
    const grid = skin.art!.map(row => [...row]);
    claim(grid, LAYER.skin);
    return new Canvas(grid, skin.eyes!);
  }
  const head = heads[config.head];
  return new Canvas(head.art.map(row => [...row]), head.eyes);
}

/**
 * Heads that are their own hairdo: a bat's ears and wings leave a face of a
 * few rows, and ears or a hat on top of them crowded it out. A hat the player
 * puts on still goes on.
 */
const EARED = new Set(['bat']);

/**
 * Patterns that scatter pale marks all over: on a skin dark enough for light
 * ink they crowd round the eyes' whites and the face is lost in them, so a
 * dark guy goes plain. Single marks, a belly and the chase finishes stay.
 */
const SCATTERED = new Set(['tabby', 'spots', 'gleam', 'stripes', 'zigzag', 'polka dots', 'sprinkles']);
const darkSkin = (config: AvatarConfig) => {
  const ink = paletteOf(config).colors[T.EYE];
  return !!ink && contrast(ink, '#000000') > 10;
};

/** Parts meant to be shown off: they always show. */
const CHASE = new Set(['kintsugi', 'gold dipped', 'gold leaf', 'jewels', 'rainbow']);

/**
 * What of a guy's extras is drawn. Hair (or a hat), something worn, cheek
 * marks and a body pattern all at once crowd sixteen pixels, so a guy shows
 * at most two of them, one on a head with eight rows or fewer (a bat, a crab):
 * the pattern goes first, then the cheeks. Hair and what he wears always
 * show, and so does a chase part. On a skin dark enough for light ink, the
 * scattered patterns go too.
 */
function extrasOf(config: AvatarConfig, c: Canvas): { pattern: boolean; cheeks: boolean } {
  const body = bodies[config.body].name, cheek = cheeks[config.cheeks];
  let pattern = config.body !== 0 && !(SCATTERED.has(body) && darkSkin(config));
  let marks = cheek.art.length > 0;
  const top = itemById(config.hat)?.slot === 'hat' || (config.hair !== 0 && !EARED.has(heads[config.head].name));
  const worn = config.accessory !== 0;
  const small = c.bottom - c.crown + 1 <= 8, limit = small ? 2 : 3;
  // One quiet mark (a belly, a star, a split) doesn't crowd a full-size head: it only counts on a small one.
  const quiet = pattern && !SCATTERED.has(body) && body !== 'starry' && !small;
  const count = () => [top, worn, pattern && !quiet, marks].filter(Boolean).length;
  if (count() > limit && pattern && !CHASE.has(body)) pattern = false;
  if (count() > limit && marks && !CHASE.has(cheek.name)) marks = false;
  return { pattern, cheeks: marks };
}

/**
 * The body and its markings, lit, with no face, hat or accessory on it.
 * The blink frame fills vacated eye cells from here.
 */
export function composeBase(config: AvatarConfig): PixelGrid {
  const c = startCanvas(config);
  if (!skinOf(config)) {
    light(c);
    if (extrasOf(config, c).pattern) bodies[config.body].draw(c);
  }
  return c.grid;
}

/**
 * A four-point twinkle in a corner the guy leaves empty: the mark of a Gold
 * finish. Top right first, then top left.
 */
function sparkle(grid: PixelGrid): void {
  for (const [x, y] of [[13, 2], [2, 2]]) {
    const cells = [[x, y], [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
    if (cells.every(([cx, cy]) => grid[cy][cx] === 0)) {
      for (const [cx, cy] of cells) grid[cy][cx] = cx === x && cy === y ? T.WHITE : T.GOLD;
      return;
    }
  }
}

/** The cells the eyes and mouth cover, as `y * GRID_SIZE + x`. */
function faceCells(c: Canvas, eye: Stamp, mouth: Stamp): Set<number> {
  const face = new Set<number>();
  const mark = (s: Stamp, x0: number, y0: number) => s.forEach((row, dy) => row.forEach((t, dx) => { if (t && c.isBody(x0 + dx, y0 + dy)) face.add((y0 + dy) * GRID_SIZE + x0 + dx); }));
  mark(eye, c.centred(eye), c.face!.line - eye.length + 1);
  mark(c.face!.mouth, c.centred(mouth), c.face!.mouthTop);
  return face;
}

const touches = (face: Set<number>, x: number, y: number) => {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (face.has((y + dy) * GRID_SIZE + x + dx)) return true;
  return false;
};

/**
 * Cheeks, kept off the face: each side slides out (up to three columns, or
 * a row lower) to where the most of it shows without touching an eye or the mouth. Patterns
 * (whiskers, stars, a scar) keep clear of the face diagonally too and off the
 * body's edge, where a dark one would read as the outline; a plain blush may
 * sit diagonally by an eye, as a blush does.
 */
function placeCheeks(c: Canvas, cheek: Stamp, face: Set<number>): void {
  const w = width(cheek), x0 = c.centred(cheek), y0 = c.face!.line + 1, half = Math.floor(w / 2);
  const side = (x: number, y: number) => face.has(y * GRID_SIZE + x - 1) || face.has(y * GRID_SIZE + x + 1) || face.has((y - 1) * GRID_SIZE + x) || face.has((y + 1) * GRID_SIZE + x);
  const inner = (x: number, y: number) => c.isBody(x - 1, y) && c.isBody(x + 1, y) && c.isBody(x, y - 1) && c.isBody(x, y + 1);
  const ok = (x: number, y: number, t: number) => c.isBody(x, y) && !face.has(y * GRID_SIZE + x)
    && (t === T.BLUSH ? !side(x, y) : !touches(face, x, y) && inner(x, y));
  for (const [from, to, dir] of [[0, half, -1], [w - half, w, 1]] as const) {
    let best: [number, number, number][] = [];
    // Out first, then a row lower where a wide mouth leaves no room beside it.
    for (const down of [0, 1]) for (let shift = 0; shift <= 3; shift++) {
      const cells: [number, number, number][] = [];
      cheek.forEach((row, dy) => { for (let dx = from; dx < to; dx++) { const x = x0 + dx + dir * shift, y = y0 + dy + down; if (row[dx] && ok(x, y, row[dx])) cells.push([x, y, row[dx]]); } });
      if (cells.length > best.length) best = cells;
    }
    for (const [x, y, t] of best) c.set(x, y, t);
  }
}

/**
 * The face is a few pixels; a marking that runs into them turns it into a
 * smudge. So any patterned skin pixel touching the eyes or mouth (diagonals
 * too) goes back to plain skin. Things worn on the face stay.
 */
function clearFace(c: Canvas, face: Set<number>, bare: PixelGrid, worn: boolean[][]): void {
  for (const k of face) {
    const fx = k % GRID_SIZE, fy = Math.floor(k / GRID_SIZE);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = fx + dx, y = fy + dy;
      if (!c.isBody(x, y) || face.has(y * GRID_SIZE + x) || worn[y][x]) continue;
      if (c.grid[y][x] < LAYER.skin && c.grid[y][x] !== bare[y][x]) c.grid[y][x] = bare[y][x];
    }
  }
}

/** Where a buddy stands, as `buddySpot` works it out. */
export interface BuddySpot {
  /** `[x, y, token]`: the art in its own `1`–`9` colours, and its outline (`T.OUTLINE`). */
  cells: [number, number, number][];
  /** Whether it stands apart, a clear pixel between its outline and everything of him. */
  apart: boolean;
}

/**
 * Where a buddy stands, on a picture whose cells `taken` marks as his (in any
 * frame of any move: `roomFor` grows the still to cover them). It stands on
 * the floor, right then left, as close to its corner as it can while a clear
 * pixel, diagonals included, runs between its outline and him.
 *
 * Where there is no such spot, it stands in front of him in the bottom-right
 * corner, as it always has, with its own outline, leaving out any pixel that
 * would touch his eyes or mouth (`face`). That is every head and skin there is
 * today: a guy fills his sixteen columns, and a 6x5 buddy apart from him
 * needs nine to eleven more (`scripts/buddy-room.ts` measures it), so `apart`
 * only comes true on a picture wider than his own.
 */
export function buddySpot(art: Stamp, taken: boolean[][], face: (x: number, y: number) => boolean = () => false): BuddySpot {
  const H = taken.length, W = taken[0].length, h = art.length, w = width(art);
  const at = (x0: number, y0: number) => {
    const cells: [number, number, number][] = [];
    const on = (x: number, y: number) => (art[y - y0]?.[x - x0] ?? 0) !== 0;
    for (let y = y0 - 1; y <= y0 + h; y++) for (let x = x0 - 1; x <= x0 + w; x++) {
      if (on(x, y)) cells.push([x, y, art[y - y0][x - x0]]);
      else if (on(x + 1, y) || on(x - 1, y) || on(x, y + 1) || on(x, y - 1)) cells.push([x, y, T.OUTLINE]);
    }
    return cells;
  };
  const clear = (cells: [number, number, number][]) => cells.every(([x, y]) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (taken[y + dy]?.[x + dx]) return false;
    return true;
  });
  const y0 = H - 1 - h;
  for (let k = 0; k + w + 2 <= W; k++) for (const x0 of [W - 1 - w - k, 1 + k]) {
    const cells = at(x0, y0);
    if (clear(cells)) return { cells, apart: true };
  }
  const corner = at(W - 1 - w, y0).filter(([x, y]) => x >= 0 && y >= 0 && x < W && y < H && !face(x, y));
  return { cells: corner, apart: false };
}

/**
 * The cells a guy may cover in any frame of any move, from his still: an arm
 * out at either side and a step sideways (two columns), down two rows where a
 * squash lowers him, and turned round in his sixteen columns. A buddy stays
 * on the floor (./animate), so this is all it has to keep clear of.
 */
export function roomFor(still: boolean[][]): boolean[][] {
  const H = still.length, W = still[0].length;
  const out = still.map(row => row.map(() => false));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!still[y][x] && !(x < GRID_SIZE && still[y][GRID_SIZE - 1 - x])) continue;
    for (let dy = 0; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const yy = y + dy, xx = x + dx;
      if (yy < H && xx >= 0 && xx < W) out[yy][xx] = true;
    }
  }
  return out;
}

/**
 * Composes every part into one 16x16 grid of colour tokens.
 *
 * The order matters and is the same for every guy: the lit body and its
 * markings, then whatever sits on top of the head, then anything worn over
 * the eyes, then the face itself (cheeks, eyes, mouth), then whatever is worn
 * on the body. Feet and arms are added before the outline, and the outline is
 * drawn around the finished shape so hats, ears and arms all get one too.
 */
export function compose(config: AvatarConfig): PixelGrid {
  return build(config);
}

/** What composing a guy found out on the way, for the checks and for ./animate. */
interface Report {
  hatCut: number;
  buddy?: BuddySpot & { face: Set<number> };
}

/**
 * How many of a hat's pixels the guy it is on cuts off: painted where the
 * face's room begins (and taken back), or off the grid's edge. Zero for every
 * hat on every head and skin: a hat too tall or wide for the room is fitted
 * to it (`fitRoom` in ./item-art), never chopped.
 */
export function hatCut(config: AvatarConfig): number {
  const report: Report = { hatCut: 0 };
  build(config, report);
  return report.hatCut;
}

/**
 * The buddy a guy wears, where it stands in his still (`cells`, art in its
 * own `1`–`9` colours), and his eyes and mouth (`face`, as `y * 16 + x`), so
 * ./animate can stand it on the floor while he moves.
 */
export function buddyOf(config: AvatarConfig): (BuddySpot & { face: Set<number> }) | undefined {
  const report: Report = { hatCut: 0 };
  build(config, report);
  return report.buddy;
}

function build(config: AvatarConfig, report?: Report): PixelGrid {
  const skin = skinOf(config);
  const hat = itemById(config.hat);
  const frame = itemById(config.frame);
  const c = startCanvas(config);
  // The face goes where it always does; everything else, markings included, is fitted around it.
  // A config made without resolve can still name retired eyes; they draw as beans.
  const eye = eyes[RETIRED_EYES.includes(config.eyes) ? 0 : config.eyes].art, mouth = mouths[config.mouth].art;
  c.setFace(eye, mouth);

  // A skin is drawn already shaded, in its own material, and carries no
  // markings. Its arms and feet, if it has any, take one of its colours.
  if (skin) {
    if (skin.limb) {
      const limb = LAYER.skin + skin.limb - 1;
      feet(c, config.feet, limb);
      arms(c, config.arms, limb);
    }
  } else {
    light(c);
    if (heads[config.head].feet) feet(c, config.feet, T.BODY);
    arms(c, config.arms, T.BODY);
  }
  // The skin as it is before any pattern: what the face's surround goes back to.
  const bare = c.grid.map(row => [...row]);
  const extras = extrasOf(config, c);
  if (!skin && extras.pattern) bodies[config.body].draw(c);


  // On a skin the player's face is what carries over; their ears, bow tie or
  // scarf would only clutter the object. Glasses stay — they are part of a face.
  // Whatever goes on top never reaches the face: anything it paints on the
  // head below the floor is taken back.
  const before = c.grid.map(row => [...row]);
  // A head with almost no forehead gets a dome to wear its cap on: a hat that
  // paints the dome keeps what it painted, and one that only sits on top (a
  // gem, a flag) is drawn on the real head instead.
  const onTop = (draw: (c: Canvas) => void) => {
    // Tries the head as it is and, where the forehead is short, the domed
    // head, and keeps whichever shows more of the hat: a cap wraps the dome, a
    // gem or a flag stays on the real head.
    const tryOn = (domed: boolean) => {
      const { canvas, dome } = domed ? c.domed(3 - (c.floor - c.tip + 1)) : { canvas: c.clone(), dome: [] as [number, number][] };
      const view = canvas.forHats();
      view.refused = 0;
      draw(view);
      let cut = view.refused;
      const wrapped = dome.filter(([x, y]) => canvas.grid[y][x] !== 1).length;
      for (const [x, y] of dome) if (canvas.grid[y][x] === 1) canvas.grid[y][x] = 0;
      for (let y = c.floor + 1; y < GRID_SIZE; y++) for (let x = 0; x < GRID_SIZE; x++) {
        if (canvas.grid[y][x] !== before[y][x] && c.isBody(x, y)) { canvas.grid[y][x] = before[y][x]; cut++; }
      }
      let shown = 0;
      canvas.grid.forEach((row, y) => row.forEach((v, x) => { if (v !== before[y][x]) shown++; }));
      // A cap is one that covers most of the dome; anything else would float where the dome was.
      return { grid: canvas.grid, shown, cut, cap: dome.length > 0 && wrapped * 2 >= dome.length };
    };
    let best = tryOn(false);
    // Only a short forehead gets one: where the top of the head's middle is
    // under the floor, there is a gap there (a Perfect split), not a forehead,
    // and a dome built up from it would climb through the face.
    if (c.tip <= c.floor && c.floor - c.tip + 1 < 3) { const d = tryOn(true); if (d.cap && d.shown > best.shown) best = d; }
    best.grid.forEach((row, y) => row.forEach((v, x) => { c.grid[y][x] = v; }));
    return best.cut;
  };
  if (hat?.slot === 'hat') {
    const cut = onTop(cv => hat.draw!(cv));
    if (report) report.hatCut = cut;
    // A finished hat drawn partly in his own colours takes those pixels into its layer, so the finish reaches them.
    const own: [number, number][] = [];
    if (ownFinishTokens(config)) c.grid.forEach((row, y) => row.forEach((v, x) => { if (v !== before[y][x] && OWN_TOKENS.includes(v)) own.push([x, y]); }));
    claim(c.grid, LAYER.hat);
    // The hat casts a shadow on the head just under it, so it stands off a
    // body of the same colour (a gold trophy on a yellow guy).
    for (let y = GRID_SIZE - 2; y >= 0; y--) for (let x = 0; x < GRID_SIZE; x++) {
      const t = c.grid[y][x], below = c.grid[y + 1][x];
      if (t >= LAYER.hat && t < LAYER.frame && (below === T.BODY || below === T.LIGHT || below === T.BELLY)) c.grid[y + 1][x] = T.SHADE;
    }
    for (const [x, y] of own) {
      const n = hat.colors.length + OWN_TOKENS.indexOf(c.grid[y][x]);
      if (OWN_TOKENS.includes(c.grid[y][x]) && n <= 9) c.grid[y][x] = LAYER.hat + n;
    }
  } else if (!skin && !EARED.has(heads[config.head].name)) {
    onTop(cv => hair[config.hair].draw(cv));
  }

  const accessory = accessories[config.accessory];
  const preFace = c.grid.map(row => [...row]);
  if (accessory.layer === 'face') accessory.draw(c);
  const onFace = c.grid.map((row, y) => row.map((v, x) => v !== preFace[y][x]));

  const line = c.face!.line;
  const cheek = skin || extras.cheeks ? cheeks[config.cheeks].art : [];
  const face = faceCells(c, eye, mouth);
  clearFace(c, face, bare, onFace);
  if (cheek.length) placeCheeks(c, cheek, face);
  c.draw(eye, c.centred(eye), line - eye.length + 1, true);
  c.draw(c.face!.mouth, c.centred(mouth), c.face!.mouthTop, true);

  if (accessory.layer === 'over') accessory.draw(c);
  if (accessory.layer === 'body' && !skin) accessory.draw(c);

  // What the worn copies have collected: tally marks and pins on their own pixels.
  const worn = (slot: 'skin' | 'hat' | 'frame') => (itemById(config[slot])?.slot === slot ? config.owned?.[slot] : undefined);
  for (const slot of ['skin', 'hat'] as const) { const o = worn(slot); if (o) markItem(c.grid, slot, o); }

  outline(c.grid);
  for (const slot of ['skin', 'hat'] as const) if ((worn(slot)?.tally ?? 0) >= GOLD_RIM_DAYS) goldRim(c.grid, slot);

  // Mirror once the guy is finished, so every layer lands where it was
  // authored. The sparkle and the frame go on after, so they never flip.
  if (config.flip) for (const row of c.grid) row.reverse();

  // Where his buddy stands is worked out on him alone, before anything goes round him.
  const buddy = itemById(config.buddy);
  const shown = new Set([...face].map(k => (config.flip ? k - (k % GRID_SIZE) + GRID_SIZE - 1 - (k % GRID_SIZE) : k)));
  const spot = buddy?.slot === 'buddy'
    ? buddySpot(buddy.art!, roomFor(c.grid.map(row => row.map(Boolean))), (x, y) => touches(shown, x, y))
    : undefined;

  if (Object.values(config.owned ?? {}).some(o => o?.finish === 'gold')) sparkle(c.grid);

  // An aura goes round the finished guy, in front of any frame, as it stands
  // at its still moment (animate moves it).
  const aura = auraById(itemById(config.aura)?.slot === 'aura' ? config.aura : undefined);
  if (aura) {
    const mask = c.grid.map(row => row.map(Boolean));
    for (const [x, y, k] of auraCells(aura.id, mask, aura.still, config.owned?.aura)) c.grid[y][x] = LAYER.aura + k;
  }

  if (frame?.slot === 'frame') {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (!c.grid[y][x]) c.grid[y][x] = LAYER.frame + frame.fill!(x, y) - 1;
      }
    }
    const o = worn('frame');
    if (o) {
      markItem(c.grid, 'frame', o);
      if ((o.tally ?? 0) >= GOLD_RIM_DAYS) goldRim(c.grid, 'frame');
    }
  }

  // The buddy stands on the floor (`buddySpot`), in front of everything, with its own outline.
  if (spot) {
    for (const [x, y, t] of spot.cells) c.grid[y][x] = t >= LOCAL ? t - LOCAL + LAYER.buddy : t;
    if (report) report.buddy = { ...spot, face: shown };
  }
  return c.grid;
}


const showsCache = new Map<string, boolean>();
/**
 * Whether a guy's markings (`body`) or cheeks are drawn at all: on a crowded or
 * small guy one may give way, and then it is the same guy as without it.
 */
export function shows(config: AvatarConfig, slot: 'body' | 'cheeks'): boolean {
  if (!config[slot]) return true;
  const key = slot + JSON.stringify(config);
  let v = showsCache.get(key);
  if (v === undefined) {
    v = JSON.stringify(compose(config)) !== JSON.stringify(compose({ ...config, [slot]: 0 }));
    if (showsCache.size > 5000) showsCache.clear();
    showsCache.set(key, v);
  }
  return v;
}
