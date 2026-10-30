import { LAYER, T } from './parts/art';
import { eyes as eyeParts, hair as hairParts, bodies as bodyParts, accessories as accessoryParts, heads, mouths, cheeks } from './parts';
import { Canvas } from './parts/canvas';
import { compose, composeBase, faceOf } from './compose';
import { itemById } from './items';
import { resolveColor, mix, contrast, deltaE } from './palette';
import { boxesIn, paintCell, toneOf, type Tone } from './owned';
import { auraById, auraColor } from './auras';
import { fxColor } from './effects';
import type { AvatarConfig, Palette, PixelGrid } from './types';

/**
 * Turns a composed grid into colours. Most cells take their token's palette
 * colour; a cell belonging to an owned item is repainted with that copy's
 * finish and wear. Before that, three things paint over the palette: a chase
 * part's own fixed colours (`PART_COLORS`), a Lucky guy's rim (`luckyRim`)
 * and a chase colourway's material (`chaseSkin`).
 */
export function paint(grid: PixelGrid, config: AvatarConfig, palette: Palette, small = false, still = true): (string | null)[][] {
  const state = { glint: false };
  const slotOf = (t: number) => (t >= LAYER.aura ? 'aura' : t >= LAYER.buddy ? 'buddy' : t >= LAYER.frame ? 'frame' : t >= LAYER.hat ? 'hat' : t >= LAYER.skin ? 'skin' : null);
  const aura = auraById(config.aura);
  // A chase eye's white is drawn (a star, a bead on a corona), not a catchlight, so small keeps it.
  if (small) ({ grid, palette } = forSmall(grid, palette, (eyeParts[config.eyes]?.name ?? '') in EYE_COLORS));
  const fixed = partColors(grid, config, palette);
  const rim = config.lucky && hasGuy(grid) ? rimCells(grid) : null;
  const skin = chaseSkin(grid, config, palette.name);
  // Where each worn item sits, so its finish sweeps across the item itself (a small hat shows a whole Prism).
  const boxes = boxesIn(grid);
  // Each worn item's own colours, ranked, so a finish keeps its parts apart (`toneOf`).
  const tones = new Map<string, Map<string, Tone>>();
  const tonesOf = (slot: 'skin' | 'hat' | 'frame' | 'buddy') => {
    let m = tones.get(slot);
    if (!m) tones.set(slot, m = toneOf(Array.from({ length: 10 }, (_, i) => palette.colors[LAYER[slot] + i]).filter((c): c is string => !!c)));
    return m;
  };
  return grid.map((row, y) => row.map((token, x) => {
    const color = fixed?.[y][x] ?? (rim?.[y][x] ? luckyRim(x, y) : undefined) ?? skin?.[y][x]
      ?? (token === T.WHITE ? catchlight(grid, x, y, palette) : resolveColor(palette, token));
    if (!color) return null;
    const slot = slotOf(token);
    const copy = slot ? config.owned?.[slot] : undefined;
    const painted = slot === 'aura' ? (aura && copy ? auraColor(aura.id, token - LAYER.aura, copy.finish, x, y, aura.still, copy.print) : color)
      : copy ? paintCell(color, x, y, copy, state, tonesOf(slot as 'skin' | 'hat' | 'frame' | 'buddy').get(color.toUpperCase()), boxes[slot as 'skin' | 'hat' | 'frame' | 'buddy']) : color;
    // An effect, as it stands at the start, laid over its finish; animate moves it instead.
    return still && copy?.fx ? fxColor(painted, copy.fx, x, y, 0, copy.print, copy.finish) : painted;
  }));
}

// ---------------------------------------------------------------- chase parts

type Colors = Partial<Record<number, string>>;
/** A part's own colours: fixed, or picked against the body it is painted on (`body`, its colour). */
type PartColors = Colors | ((body: string) => Colors);

const GOLD = '#FFD45C';
/**
 * A corona in gold; on a body gold melts into (Butter, Honey, Tangerine), whichever of a pale gold
 * and an amber stands off it best, both in hue and in lightness.
 */
const goldOn = (body: string) => {
  if (deltaE(GOLD, body) >= 30) return GOLD;
  const stands = (c: string) => Math.min(contrast(c, body) / 1.5, deltaE(c, body) / 30);
  return stands('#FFF4CC') >= stands('#E8901A') ? '#FFF4CC' : '#E8901A';
};

/**
 * Chase eyes keep their own colours on every guy, so galaxy eyes are always a
 * galaxy: drawn in the accent they came out a different speck on each body.
 * Each is a token-to-colour map, painted only inside the eyes' box.
 */
const EYE_COLORS: Record<string, PartColors> = {
  // A ring, pale lilac over deep violet so it holds on a light body and a dark one, round a void with a white star in it.
  galaxy: { [T.EYE]: '#0E0824', [T.WHITE]: '#FFFFFF', [T.ACCENT]: '#D9C2FF', [T.ACCENT_SHADE]: '#6E3FE6' },
  diamond: { [T.EYE]: '#0B2F4D', [T.WHITE]: '#FFFFFF', [T.ACCENT]: '#9EF0FF', [T.ACCENT_SHADE]: '#2BA8E0' },
  dragon: { [T.EYE]: '#240800', [T.GOLD]: '#FFD23A', [T.GOLD_SHADE]: '#FF5A14' },
  // White-hot cores in a red ring.
  laser: { [T.WHITE]: '#FFFFFF', [T.GOLD]: '#FFE7A0', [T.RED]: '#E8262C', [T.GOLD_SHADE]: '#A3101E' },
  // A black disc in a gold corona (pale gold where the body is near gold), a white bead on the ring.
  eclipse: body => ({ [T.EYE]: '#07070C', [T.WHITE]: '#FFFFFF', [T.GOLD]: goldOn(body) }),
  // Black pits, one pinprick star. On a dark body the skin round them takes its own light tone (`VOID_RIM`).
  void: { [T.EYE]: '#05040A', [T.WHITE]: '#FFFFFF' },
};

/** Eyes whose pits a dark body would swallow: there the skin touching them is lit in the body's own light tone. */
const VOID_RIM = new Set(['void']);

/**
 * The masquerade's violet and its highlight: deep, or pale on a body deep violet sinks into
 * (Midnight, Grape Soda), or near black on a violet body both melt into.
 */
const MASK_VIOLETS = [['#5A2D9C', '#8657D6'], ['#A47CF2', '#CBB2FF'], ['#2A1250', '#4A2A86']];
const maskViolet = (body: string) =>
  MASK_VIOLETS.slice(0, 2).find(([v]) => deltaE(v, body) >= 30 && contrast(v, body) >= 1.5)
  ?? MASK_VIOLETS.reduce((a, b) => (deltaE(b[0], body) > deltaE(a[0], body) ? b : a));

/**
 * Toppers, accessories and markings with colours of their own, as the chase
 * eyes have, so each reads the same on every body: on fire in flame colours,
 * not the shared red that came out salmon pink, a violet mask with a gold rim,
 * gold seams with a dark edge that holds on a pale body. Painted only on the
 * part's own cells (`partMask`).
 */
const PART_COLORS: Record<'hair' | 'accessory' | 'body', Record<string, PartColors>> = {
  hair: {
    'on fire': { [T.RED]: '#C8281E', [T.GOLD_SHADE]: '#F0661C', [T.GOLD]: '#FFA62B', [T.WHITE]: '#FFF0B0' },
    idea: { [T.GOLD]: '#FFE27A', [T.GOLD_SHADE]: '#F2B33D', [T.WHITE]: '#FFFFFF', [T.TRIM]: '#B9C0CE', [T.LEAF_SHADE]: '#6E7689', [T.ACCENT]: '#FFD45C' },
    thought: { [T.WHITE]: '#FFFFFF', [T.TRIM]: '#C5D2E8' },
  },
  accessory: {
    masquerade: body => {
      const [violet, light] = maskViolet(body);
      return { [T.LEAF_SHADE]: violet, [T.LEAF]: light, [T.TRIM]: GOLD, [T.GOLD]: GOLD, [T.RED]: '#E0245E', [T.ACCENT]: '#FF6FA8' };
    },
  },
  body: {
    kintsugi: { [T.LEAF_SHADE]: '#3A2410' },
    'op art': { [T.LEAF_SHADE]: '#17131F', [T.TRIM]: '#FFF1D6' },
  },
};

const LISTS = { hair: hairParts, accessory: accessoryParts, body: bodyParts } as const;
const colorsOn = (colors: PartColors | undefined, palette: Palette) => (typeof colors === 'function' ? colors(palette.colors[T.BODY] ?? '#FFFFFF') : colors);

/** Every cell a chase part paints in its own colours, or null for a guy with none. */
function partColors(grid: PixelGrid, config: AvatarConfig, palette: Palette): (string | undefined)[][] | null {
  let out: (string | undefined)[][] | null = null;
  const put = (x: number, y: number, c: string | undefined) => {
    if (!c) return;
    out ??= grid.map(row => row.map(() => undefined));
    if (out[y]?.[x] === undefined && out[y]) out[y][x] = c;
  };
  const eyeName = eyeParts[config.eyes]?.name ?? '', eyeMap = colorsOn(EYE_COLORS[eyeName], palette);
  if (eyeMap) {
    const f = faceOf(config);
    const left = f.eyes[0].left - 1, right = f.eyes[f.eyes.length - 1].right + 1;
    const inBox = (x: number, y: number, below = 0) => y >= f.top - 1 && y <= f.line + below && x >= left && x <= right;
    grid.forEach((row, y) => row.forEach((t, x) => { if (inBox(x, y)) put(x, y, eyeMap[t]); }));
    const ink = palette.colors[T.EYE];
    if (VOID_RIM.has(eyeName) && ink && contrast(ink, '#000000') > 10) {
      const pit = (x: number, y: number) => grid[y]?.[x] === T.EYE;
      grid.forEach((row, y) => row.forEach((t, x) => {
        if (inBox(x, y, 1) && SKIN_TOKENS.has(t) && (pit(x - 1, y) || pit(x + 1, y) || pit(x, y - 1) || pit(x, y + 1))) put(x, y, palette.colors[T.LIGHT]);
      }));
    }
  }
  for (const slot of ['hair', 'accessory', 'body'] as const) {
    const map = colorsOn(PART_COLORS[slot][LISTS[slot][config[slot]]?.name ?? ''], palette);
    if (!map) continue;
    const mask = partMask(config, slot);
    // A face accessory also owns what it paints under the eyes, where a glance uncovers it (`underEyes`).
    const under = slot === 'accessory' ? underEyes(config) : null;
    // The colour in an eye that a glance moves onto it stays the eye's: a big eye's iris on a mask is not its feather.
    const f = under && faceOf(config);
    const iris = (t: number, x: number, y: number) => !!f && IRIS_TOKENS.has(t) && y >= f.top - 1 && y <= f.line && under?.[y]?.[x] !== t;
    grid.forEach((row, y) => row.forEach((t, x) => {
      if ((mask[y]?.[x] && !iris(t, x, y)) || (under?.[y]?.[x] && under[y][x] === t)) put(x, y, map[t]);
    }));
  }
  return out;
}

const unders = new Map<string, PixelGrid | null>();
/**
 * What a face accessory (a masquerade, a monocle, glasses) paints round the
 * eyes, as it lies under them: compose draws it before the eyes, so they
 * cover it, and a glance that moves them (./animate) shows it again. A glint
 * it puts in the eye rows moves with the eyes too, so where it paints one
 * over its own colour, that colour is what lies under. A token for each cell
 * it paints, 0 elsewhere, laid out as the finished guy is (mirrored with the
 * guy); null for a guy with no face accessory.
 */
export function underEyes(config: AvatarConfig): PixelGrid | null {
  const accessory = accessoryParts[config.accessory];
  if (accessory?.layer !== 'face') return null;
  const key = JSON.stringify([config.head, config.skin, config.eyes, config.mouth, config.accessory, config.body, config.cheeks, config.palette, config.shade, config.flip]);
  if (unders.has(key)) return unders.get(key)!;
  // The canvas compose draws it on: the bare body (or skin) with the face set, measured from its silhouette.
  const skin = itemById(config.skin), base = composeBase(config);
  const c = new Canvas(base.map(row => [...row]), skin?.slot === 'skin' ? skin.eyes! : heads[config.head].eyes);
  c.face = faceOf(config);
  const lies = base.map(row => row.map(() => 0)), set = c.set.bind(c);
  c.set = (x, y, t) => {
    set(x, y, t);
    if (c.get(x, y) === t && t && t !== T.EYE && t !== T.WHITE) lies[y][x] = t;
  };
  accessory.draw(c);
  const any = lies.some(row => row.some(Boolean));
  if (config.flip) for (const row of lies) row.reverse();
  if (unders.size > 2000) unders.clear();
  unders.set(key, any ? lies : null);
  return any ? lies : null;
}

const BIG_BLUSH = cheeks.findIndex(c => c.name === 'big blush');
const LAUGH = mouths.findIndex(m => m.name === 'laugh');

/**
 * The guy as ./animate composes the poses: another mouth, arms up or out, a
 * big blush. A marking keeps clear of the mouth and cheeks, so it lands on
 * other cells in each, and a mask taken from the still alone left the cells a
 * laugh uncovers in the palette's own leaf green.
 */
const posed = (figure: AvatarConfig): AvatarConfig[] => [
  figure,
  ...mouths.map((_, mouth) => ({ ...figure, mouth })),
  { ...figure, arms: 1 }, { ...figure, arms: 2 }, { ...figure, mouth: LAUGH, arms: 2 },
  { ...figure, cheeks: BIG_BLUSH },
];

const masks = new Map<string, boolean[][]>();
/**
 * The cells a guy's topper, accessory or marking takes, in any pose: where the
 * guy differs from the same guy without it, still or posed (`posed`). Only the
 * part's own colour tokens are repainted there, so a cheek mark or pattern
 * that a crowded guy drops (and shows bare body instead) is left alone. A
 * topper never reaches the face, so its mask stops above the eyes and its
 * still is enough.
 */
function partMask(config: AvatarConfig, slot: 'hair' | 'accessory' | 'body'): boolean[][] {
  const figure: AvatarConfig = { ...config, frame: undefined, aura: undefined, buddy: undefined };
  const key = slot + JSON.stringify(figure);
  let mask = masks.get(key);
  if (!mask) {
    const top = slot === 'hair' ? faceOf(figure).top - 1 : Infinity;
    const all: boolean[][] = Array.from({ length: GRID }, () => new Array<boolean>(GRID).fill(false));
    for (const pose of slot === 'hair' ? [figure] : posed(figure)) {
      const on = compose(pose), off = compose({ ...pose, [slot]: 0 });
      on.forEach((row, y) => row.forEach((t, x) => { if (y < top && t !== off[y][x]) all[y][x] = true; }));
    }
    mask = all;
    if (masks.size > 2000) masks.clear();
    masks.set(key, mask);
  }
  return mask;
}

const GRID = 16;

// ---------------------------------------------------------------- chase colourways

const SKIN_TOKENS = new Set<number>([T.BODY, T.SHADE, T.LIGHT, T.DEEP, T.BELLY]);
/** The colour low in an eye (shiny, sparkle, beans), as ./animate moves it with the eye. */
const IRIS_TOKENS = new Set<number>([T.ACCENT, T.ACCENT_SHADE]);
/** A material: its colour for each skin cell of a grid, given the face it is painted round. */
type Material = (grid: PixelGrid, face: { top: number; line: number; mouthBottom: number }) => (string | undefined)[][];

/** Opal's play of colour: pearl, pink, mint, lilac and sky in diagonal bands, each two cells wide, shaded to match. */
const OPAL: Partial<Record<number, string[]>> = {
  [T.BODY]: ['#FBF7FF', '#FFD9EE', '#CFF8EA', '#DDD2FF', '#D3EEFF'],
  [T.SHADE]: ['#CDBDF2', '#EBAACF', '#8ED9C5', '#A99BEA', '#93C6EE'],
  [T.DEEP]: ['#A994E0', '#C987B4', '#6CB8A6', '#8676D2', '#6FA6D8'],
  [T.LIGHT]: ['#FFFFFF'],
  [T.BELLY]: ['#FFFFFF', '#FFEEF7', '#EAFCF6', '#F1ECFF', '#ECF8FF'],
};

/** Aurora's curtains, left to right: green, teal, violet. */
const CURTAIN = ['#5CE6A4', '#3FD0D6', '#9C7CFF'];
/** Aurora's teal night: well off Midnight's navy, so an Aurora under a hat is still its own colour. */
const AURORA: Colors = { [T.BODY]: '#2E5878', [T.SHADE]: '#234763', [T.DEEP]: '#17324A', [T.LIGHT]: '#3E7493', [T.BELLY]: '#386886' };
const OBSIDIAN: Colors = { [T.BODY]: '#2A2440', [T.SHADE]: '#1C182C', [T.DEEP]: '#120F1C', [T.LIGHT]: '#3D3460', [T.BELLY]: '#3A3256' };

/** Each cell of a grid through `f`, skin only. */
const overSkin = (grid: PixelGrid, f: (t: number, x: number, y: number) => string | undefined) =>
  grid.map((row, y) => row.map((t, x) => (SKIN_TOKENS.has(t) ? f(t, x, y) : undefined)));

const FACE_TOKENS = new Set<number>([T.EYE, T.WHITE, T.MOUTH, T.TONGUE]);
/** Whether a cell is touching an eye, its shine, the mouth or the tongue, on its sides or corners. */
const byFace = (grid: PixelGrid, x: number, y: number) => {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (FACE_TOKENS.has(grid[y + dy]?.[x + dx] ?? 0)) return true;
  return false;
};

const MATERIALS: Record<string, Material> = {
  Opal: grid => overSkin(grid, (t, x, y) => { const ramp = OPAL[t]; return ramp?.[Math.floor((x + y + 1) / 2) % ramp.length]; }),
  // Black glass with one violet glint, as a window shows in it: a short streak just inside the
  // outline at the upper left, above the eyes; under a hat, where that is covered, low on the
  // other side, under the mouth, or failing that beside it. Never across the face: a diagonal
  // over the whole body read as a slash.
  Obsidian: (grid, face) => {
    const out = overSkin(grid, t => OBSIDIAN[t]);
    const skin = (x: number, y: number) => SKIN_TOKENS.has(grid[y]?.[x] ?? 0);
    // One cell in from the edge (or on it, where that touches the face), a row at a time, clear of the face.
    const inside = (rows: number[], side: 1 | -1) => rows.flatMap(y => {
      const row = side > 0 ? grid[y] : [...grid[y]].reverse(), first = row.findIndex(t => SKIN_TOKENS.has(t));
      const edge = first < 0 || side > 0 ? first : row.length - 1 - first;
      const x = [edge + side, edge].find(x => edge >= 0 && skin(x, y) && !byFace(grid, x, y));
      return x === undefined ? [] : [[x, y] as [number, number]];
    }).slice(0, 3);
    const rows = (from: number, to: number) => Array.from({ length: Math.max(0, to - from) }, (_, k) => from + k);
    const glint = [inside(rows(0, face.top - 1), 1), inside(rows(face.mouthBottom + 1, GRID), -1), inside(rows(face.line + 1, GRID), -1)]
      .find(cells => cells.length >= 2) ?? [];
    glint.forEach(([x, y], i) => { out[y][x] = i === 1 || glint.length === 1 ? '#C9B2FF' : '#7E68C8'; });
    return out;
  },
  // Teal night hung with crisp curtains of green, teal and violet from the top of the head, stopping
  // above the eyes. Where a hat covers that, they hang from the first skin under it instead, beside
  // the face but never touching it; on a face that fills the body, from the first skin clear of it. So
  // every Aurora shows its curtains, but only as low as it has to.
  Aurora: (grid, face) => {
    const clear = (x: number, y: number) => SKIN_TOKENS.has(grid[y][x]) && !byFace(grid, x, y);
    const from = (clearOnly: boolean) => grid[0].map((_, x) => grid.findIndex((row, y) => (clearOnly ? clear(x, y) : SKIN_TOKENS.has(row[x]))));
    const curtains = (top: number[], low: boolean) => overSkin(grid, (t, x, y) => {
      const d = y - top[x], drop = [2, 3, 4, 3, 2, 3, 4, 4][x % 8];
      const hangs = top[x] >= 0 && d >= 0 && d < drop && t !== T.DEEP && (low ? !byFace(grid, x, y) : y < face.top - 1);
      return hangs ? CURTAIN[Math.floor(x / 2) % 3] : AURORA[t];
    });
    const lit = (cells: (string | undefined)[][]) => cells.flat().filter(c => c && CURTAIN.includes(c)).length;
    const high = curtains(from(false), false);
    if (lit(high) >= 4) return high;
    const under = curtains(from(false), true);
    return lit(under) >= 4 ? under : curtains(from(true), true);
  },
};

/**
 * A chase colourway (Opal, Obsidian, Aurora) as a material, cell by cell over
 * the skin: fixed colours, so a tone never washes one out and a 1-in-500
 * colour looks it in every still. Null for every other colourway.
 */
function chaseSkin(grid: PixelGrid, config: AvatarConfig, name: string): (string | undefined)[][] | null {
  const material = MATERIALS[name];
  return material ? material(grid, faceOf(config)) : null;
}

// ---------------------------------------------------------------- Lucky

/**
 * Lucky's rim: coral, amber, teal, blue and violet, each deep enough to keep
 * the guy's edge on a pale ground (ivory and pale gold steps left gaps in it
 * there) and none of them neon.
 */
export const LUCKY_RIM = ['#E8574F', '#F0A030', '#3DBFA8', '#5B8CE8', '#9466E0'] as const;

/**
 * The colour of a Lucky guy's rim at cell (`x`, `y`) of the sixteen-by-sixteen
 * grid, `beat` steps on: the outline stepped through `LUCKY_RIM` in diagonal
 * bands two cells wide, with no blending. A still is beat 0; ./animate moves
 * the bands one hue a beat. Grid coordinates, not a frame's: a frame's row
 * less its headroom.
 */
export function luckyRim(x: number, y: number, beat = 0): string {
  const n = LUCKY_RIM.length;
  return LUCKY_RIM[(((Math.floor((x + y) / 2) + beat) % n) + n) % n];
}

/**
 * Whether a cell is on the guy's outer edge: the outline, touching the outside (nothing, or a
 * frame, buddy or aura cell) and the guy's own drawing or what is worn on it, so a buddy's
 * outline beside them is left alone.
 */
export function onRim(grid: PixelGrid, x: number, y: number): boolean {
  if (grid[y]?.[x] !== T.OUTLINE) return false;
  const near = [grid[y - 1]?.[x], grid[y + 1]?.[x], grid[y][x - 1], grid[y][x + 1]];
  const outside = (t: number | undefined) => t === undefined || t === 0 || t >= LAYER.frame;
  const guy = (t: number | undefined) => t !== undefined && t > 0 && t !== T.OUTLINE && t < LAYER.frame;
  return near.some(outside) && near.some(guy);
}

/** Whether a grid holds the guy: their skin, or a costume. A buddy painted on its own has neither, and no rim. */
const hasGuy = (grid: PixelGrid) => grid.some(row => row.some(t => SKIN_TOKENS.has(t) || (t >= LAYER.skin && t < LAYER.hat)));

/** Every rim cell (`onRim`) of a grid. */
function rimCells(grid: PixelGrid): boolean[][] {
  return grid.map((row, y) => row.map((_, x) => onRim(grid, x, y)));
}

// ---------------------------------------------------------------- small and catchlights

/** At or under this many pixels across, a guy is drawn for a small size (`forSmall`). */
export const SMALL_SIZE = 36;

/**
 * A guy drawn small, in a board's row or beside a name, is a pixel or two a
 * cell, and his face is what goes first: a catchlight takes half an eye, the
 * soft highlight blots the forehead, and a dark ink that reads at 128 greys
 * out. Small, each eye is solid, the highlight goes back to the body colour,
 * and dark ink goes darker still. Nothing moves, so he is the same guy.
 */
function forSmall(grid: PixelGrid, palette: Palette, keepShine = false): { grid: PixelGrid; palette: Palette } {
  const eyeAt = (x: number, y: number) => grid[y]?.[x] === T.EYE;
  const out = grid.map((row, y) => row.map((t, x) => {
    if (t === T.WHITE && !keepShine && (eyeAt(x - 1, y) || eyeAt(x + 1, y) || eyeAt(x, y - 1) || eyeAt(x, y + 1))) return T.EYE;
    if (t === T.LIGHT) return T.BODY;
    return t;
  }));
  const ink = palette.colors[T.EYE];
  if (!ink || contrast('#FFFFFF', ink) < 3) return { grid: out, palette };
  const deep = mix(ink, '#000000', 0.45);
  return { grid: out, palette: { ...palette, colors: { ...palette.colors, [T.EYE]: deep, [T.MOUTH]: deep } } };
}

/**
 * An eye's white catchlight. On a light face a white pixel on the eye's edge
 * melts into the skin and leaves the eye a bitten-off L, so there it is a
 * pale tint of the eye instead: the eye keeps its whole shape and still shines.
 */
function catchlight(grid: PixelGrid, x: number, y: number, palette: Palette): string | null {
  const white = resolveColor(palette, T.WHITE);
  const near = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].map(([nx, ny]) => grid[ny]?.[nx] ?? 0);
  if (!white || !near.includes(T.EYE)) return white;
  const ink = resolveColor(palette, T.EYE);
  // On a dark skin the eye is light, and a white shine beside it only made a pale blob: there the
  // shine is a dark pupil, which is what tells you it's an eye.
  if (ink && contrast(ink, '#000000') > 10) return resolveColor(palette, T.OUTLINE) ?? '#000000';
  if (!ink || contrast(white, ink) < 3) return white;
  const pale = near.some(t => t !== T.EYE && t !== T.WHITE && t !== 0 && contrast(white, resolveColor(palette, t) ?? '#000000') < 1.6);
  return pale ? mix(ink, white, 0.6) : white;
}
