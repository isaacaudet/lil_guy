import { heads, eyes, mouths, cheeks, hair, bodies, accessories } from './parts';
import { LAYER, LOCAL, T } from './parts/art';
import { Canvas } from './parts/canvas';
import { itemById, type Item } from './items';
import { auraById, auraCells } from './auras';
import { goldRim, GOLD_RIM_DAYS, markItem } from './pins';
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
 * The body and its markings, lit, with no face, hat or accessory on it.
 * The blink frame fills vacated eye cells from here.
 */
export function composeBase(config: AvatarConfig): PixelGrid {
  const c = startCanvas(config);
  if (!skinOf(config)) {
    light(c);
    bodies[config.body].draw(c);
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
  const skin = skinOf(config);
  const hat = itemById(config.hat);
  const frame = itemById(config.frame);
  const c = startCanvas(config);

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
    bodies[config.body].draw(c);
  }

  // On a skin the player's face is what carries over; their ears, bow tie or
  // scarf would only clutter the object. Glasses stay — they are part of a face.
  if (hat?.slot === 'hat') {
    hat.draw!(c);
    claim(c.grid, LAYER.hat);
    // The hat casts a shadow on the head just under it, so it stands off a
    // body of the same colour (a gold trophy on a yellow guy).
    for (let y = GRID_SIZE - 2; y >= 0; y--) for (let x = 0; x < GRID_SIZE; x++) {
      const t = c.grid[y][x], below = c.grid[y + 1][x];
      if (t >= LAYER.hat && t < LAYER.frame && (below === T.BODY || below === T.LIGHT || below === T.BELLY)) c.grid[y + 1][x] = T.SHADE;
    }
  } else if (!skin) {
    hair[config.hair].draw(c);
  }

  const accessory = accessories[config.accessory];
  if (accessory.layer === 'face') accessory.draw(c);

  const line = c.eyeLine;
  const cheek = cheeks[config.cheeks].art;
  if (cheek.length) c.draw(cheek, c.centred(cheek), line + 1, true);
  const eye = eyes[config.eyes].art;
  c.draw(eye, c.centred(eye), line - eye.length + 1, true);
  const mouth = mouths[config.mouth].art;
  c.draw(mouth, c.centred(mouth), line + 1, true);

  if (accessory.layer === 'body' && !skin) accessory.draw(c);

  // What the worn copies have collected: tally marks and pins on their own pixels.
  const worn = (slot: 'skin' | 'hat' | 'frame') => (itemById(config[slot])?.slot === slot ? config.owned?.[slot] : undefined);
  for (const slot of ['skin', 'hat'] as const) { const o = worn(slot); if (o) markItem(c.grid, slot, o); }

  outline(c.grid);
  for (const slot of ['skin', 'hat'] as const) if ((worn(slot)?.tally ?? 0) >= GOLD_RIM_DAYS) goldRim(c.grid, slot);

  // Mirror once the guy is finished, so every layer lands where it was
  // authored. The sparkle and the frame go on after, so they never flip.
  if (config.flip) for (const row of c.grid) row.reverse();

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

  // The buddy sits at his feet, bottom right, in front of everything, with its own outline.
  const buddy = itemById(config.buddy);
  if (buddy?.slot === 'buddy') {
    const art = buddy.art!, h = art.length, w = art[0].length;
    const x0 = GRID_SIZE - 1 - w, y0 = GRID_SIZE - 1 - h;
    const on = (x: number, y: number) => (art[y - y0]?.[x - x0] ?? 0) !== 0;
    for (let y = y0 - 1; y <= y0 + h; y++) for (let x = x0 - 1; x <= x0 + w; x++) {
      if (y < 0 || x < 0 || y >= GRID_SIZE || x >= GRID_SIZE) continue;
      if (on(x, y)) { const t = art[y - y0][x - x0]; c.grid[y][x] = t >= LOCAL ? t - LOCAL + LAYER.buddy : t; }
      else if (on(x + 1, y) || on(x - 1, y) || on(x, y + 1) || on(x, y - 1)) c.grid[y][x] = T.OUTLINE;
    }
  }
  return c.grid;
}

