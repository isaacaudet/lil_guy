import { LAYER, LOCAL, stamp, T, width, type Stamp } from './parts/art';
import type { Canvas } from './parts/canvas';
import { capRows, mirror, seat } from './parts/hair';
import type { AvatarConfig, GameId, Palette, RenderOptions } from './types';
import { GRID_SIZE } from './types';

/**
 * Items: things a player earns or buys in a DLE Club game and wears
 * everywhere. Each game has
 *
 * - a skin, which turns the guy into the game's own object (a jar, a golf
 *   ball, a toy block) while keeping his face
 * - two hats: a free one, worn by default in that game, and a rare one
 * - a frame, the backdrop behind him
 *
 * and every skin, rare hat and frame also comes in a gold edition, which adds
 * a sparkle. Items are drawn in their own colours (the `1`–`9` characters),
 * listed with the item, so a golf ball is white whatever the guy's palette.
 * The free hats use the guy's own accent colour, so they still vary by name.
 *
 * This file only draws them. Who owns what, and what it costs, belongs to the
 * game or the club.
 */

export type Slot = 'skin' | 'hat' | 'frame';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Item {
  /** `game.name`, with `.gold` on the end for a gold edition. */
  id: string;
  game: GameId;
  slot: Slot;
  name: string;
  rarity: Rarity;
  /** Colours for the art's `1`–`9`. */
  colors: string[];
  /** A skin's outline colour, replacing the one worked out from the palette. */
  outline?: string;
  /** Gold editions sparkle. */
  shine?: boolean;
  /** Skins: the body, drawn on the full 16x16 grid. */
  art?: Stamp;
  /** Skins: the row the bottom of the eyes sits on. */
  eyes?: number;
  /** Skins: which of the item's colours arms and feet are drawn in, or none. */
  limb?: number;
  /** Hats: draws onto the head. */
  draw?: (c: Canvas) => void;
  /** Frames: which of the item's colours fills a background cell. */
  fill?: (x: number, y: number) => number;
}

// ---------------------------------------------------------------- helpers

const grid16 = (name: string, rows: string[]): Stamp => {
  if (rows.length !== GRID_SIZE || rows.some(r => r.length !== GRID_SIZE)) {
    throw new Error(`Skin "${name}" must be drawn on a 16x16 grid`);
  }
  return stamp(rows);
};

const on = (rows: string[], dx = 0, sink = 1) => {
  const s = stamp(rows);
  return (c: Canvas) => seat(c, s, c.centred(s) + dx, sink);
};

const onPair = (rows: string[], inset = 0) => {
  const left = stamp(rows);
  const right = mirror(left);
  return (c: Canvas) => {
    const r = c.rows[c.shoulder()]!;
    seat(c, left, r.left + inset);
    seat(c, right, r.right - inset - width(right) + 1);
  };
};

const L = (n: number) => LOCAL + n - 1;

// ---------------------------------------------------------------- skins

const skins: Omit<Item, 'slot' | 'rarity'>[] = [
  {
    id: 'amountle.jar', game: 'amountle', name: 'Jar of gems', eyes: 7,
    colors: ['#E3F5F7', '#BFE1E7', '#FFFFFF', '#2E9C94', '#217A73', '#3FD1C1', '#1F9C90', '#A6F4EA'],
    outline: '#2F6870',
    art: grid16('jar', [
      '................',
      '................',
      '................',
      '....44444444....',
      '....45555554....',
      '...3111111112...',
      '...3111111112...',
      '...3111111112...',
      '...1111111112...',
      '...1111111112...',
      '...1111111112...',
      '...6876786872...',
      '...7686867862...',
      '....77777777....',
      '................',
      '................',
    ]),
  },
  {
    id: 'halfsies.pot', game: 'halfsies', name: 'Clay pot', eyes: 7, limb: 1,
    colors: ['#E07B4C', '#B85A34', '#F4A77C', '#5E2A1C', '#F6DCBB'],
    outline: '#5A2618',
    art: grid16('pot', [
      '................',
      '................',
      '................',
      '...3111111112...',
      '....22222222....',
      '....31111111....',
      '...3111111112...',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..111111111112..',
      '..454545454542..',
      '..545454545452..',
      '...2222222222...',
      '................',
      '................',
    ]),
  },
  {
    id: 'stackdle.block', game: 'stackdle', name: 'Toy block', eyes: 8, limb: 1,
    colors: ['#4C8DF6', '#3467C9', '#7FB0FF', '#C4DBFF'],
    outline: '#1F3F86',
    art: grid16('block', [
      '................',
      '................',
      '................',
      '..344444444443..',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..222222222222..',
      '................',
      '................',
    ]),
  },
  {
    id: 'flipsies.bottle', game: 'flipsies', name: 'Water bottle', eyes: 8,
    colors: ['#3E7BE0', '#2B5BB5', '#C4E8FB', '#93CDEE', '#FFFFFF', '#F3F6FA', '#3E7BE0'],
    outline: '#2A5A8C',
    art: grid16('bottle', [
      '................',
      '................',
      '......1111......',
      '......2222......',
      '.....333333.....',
      '....53333334....',
      '...5333333334...',
      '...5333333334...',
      '...5333333334...',
      '...3333333334...',
      '...3333333334...',
      '...6666666666...',
      '...7777777777...',
      '....44444444....',
      '................',
      '................',
    ]),
  },
  {
    id: 'puttsies.ball', game: 'puttsies', name: 'Golf ball', eyes: 8,
    colors: ['#F7F8FA', '#D3D8E2', '#B9C0CE', '#E1E5EC', '#FFFFFF', '#E5484D'],
    outline: '#6B7385',
    art: grid16('golf ball', [
      '................',
      '................',
      '................',
      '................',
      '.....141411.....',
      '....14141411....',
      '...5111111141...',
      '..511111111114..',
      '..411111111111..',
      '..111111111114..',
      '..411111111112..',
      '..141111111122..',
      '...4141412222...',
      '....22222222....',
      '.......66.......',
      '................',
    ]),
  },
  {
    id: 'weighsies.cheese', game: 'weighsies', name: 'Cheese wheel', eyes: 9, limb: 1,
    colors: ['#FFC94A', '#E3A52E', '#FFE38F', '#D98F22'],
    outline: '#8A5A12',
    art: grid16('cheese', [
      '................',
      '................',
      '................',
      '................',
      '....33333333....',
      '..333333333333..',
      '..233333333332..',
      '..111111111112..',
      '..111111111112..',
      '..111111111112..',
      '..111111111112..',
      '..111111111112..',
      '..141111114112..',
      '...2242222422...',
      '................',
      '................',
    ]),
  },
  {
    id: 'cutsies.kiwi', game: 'cutsies', name: 'Kiwi', eyes: 10, limb: 1,
    colors: ['#C08F5E', '#9C6E43', '#D9AE7E', '#86CF55', '#7A5432', '#2A1B10', '#F1F7D4'],
    outline: '#4E3420',
    art: grid16('kiwi', [
      '................',
      '................',
      '................',
      '.....555555.....',
      '....54466445....',
      '...5446776445...',
      '...5444664445...',
      '...3555555552...',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..111111111112..',
      '...1111111122...',
      '....22222222....',
      '................',
      '................',
    ]),
  },
  {
    id: 'tiltsies.ball', game: 'tiltsies', name: 'Hamster ball', eyes: 9,
    colors: ['#DFF2FB', '#B7DCEE', '#FFFFFF', '#EDB57D', '#CC8E55', '#FFE7CB'],
    outline: '#4E7A92',
    art: grid16('hamster ball', [
      '................',
      '................',
      '.....111111.....',
      '....13111111....',
      '...1311111111...',
      '..131441144111..',
      '..114444444411..',
      '..144444444442..',
      '..144444444442..',
      '..144444444442..',
      '..144444444442..',
      '..144466664442..',
      '...1556666551...',
      '....22222222....',
      '................',
      '................',
    ]),
  },
  {
    id: 'trackdle.racer', game: 'trackdle', name: 'Racer', eyes: 8, limb: 1,
    colors: ['#FF7A2F', '#D65A1C', '#FFAE73', '#FFFFFF', '#23262D'],
    outline: '#6A2A0C',
    art: grid16('racer', [
      '................',
      '................',
      '................',
      '................',
      '.....114411.....',
      '....31144111....',
      '...3111441111...',
      '..311111111111..',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..111111111122..',
      '...5454545454...',
      '....22222222....',
      '................',
      '................',
    ]),
  },
];

// ---------------------------------------------------------------- hats

const hats: Omit<Item, 'slot'>[] = [
  // Amountle
  {
    id: 'amountle.gem', game: 'amountle', name: 'Gem', rarity: 'common', colors: [],
    draw: on([
      '.xa.',
      'aaaA',
      '.aA.',
    ]),
  },
  {
    id: 'amountle.crown', game: 'amountle', name: 'Gem crown', rarity: 'rare',
    colors: ['#FFD25A', '#E0A62E', '#3FD1C1', '#A6F4EA'],
    draw: on([
      '1.1.1',
      '14341',
      '22222',
    ]),
  },
  // Halfsies
  {
    id: 'halfsies.bowl', game: 'halfsies', name: 'Half pot', rarity: 'common', colors: [],
    draw: on([
      '.aaaa.',
      'axxxxA',
      'AAAAAA',
    ]),
  },
  {
    id: 'halfsies.scale', game: 'halfsies', name: 'Scale dish', rarity: 'rare',
    colors: ['#FFFFFF', '#D9DEE6', '#2B2F38'],
    draw: on([
      '11111111',
      '.222222.',
      '...33...',
    ]),
  },
  // Stackdle
  {
    id: 'stackdle.cube', game: 'stackdle', name: 'Little block', rarity: 'common', colors: [],
    draw: on([
      'xxxA',
      'aaaA',
      'aaaA',
    ]),
  },
  {
    id: 'stackdle.tower', game: 'stackdle', name: 'Tower', rarity: 'rare',
    colors: ['#FF8FB1', '#E0628A', '#FFB03B', '#E58A1F'],
    draw: on([
      '.11.',
      '1..2',
      '.12.',
      '.33.',
      '3334',
    ]),
  },
  // Flipsies
  {
    id: 'flipsies.cap', game: 'flipsies', name: 'Bottle cap', rarity: 'common', colors: [],
    draw: on([
      'xaxa',
      'aAaA',
    ]),
  },
  {
    id: 'flipsies.landed', game: 'flipsies', name: 'Landed bottle', rarity: 'rare',
    colors: ['#C4E8FB', '#93CDEE', '#3E7BE0', '#FFFFFF'],
    draw: on([
      '4112',
      '4112',
      '.12.',
      '.33.',
    ]),
  },
  // Puttsies
  {
    id: 'puttsies.visor', game: 'puttsies', name: 'Golf visor', rarity: 'common', colors: [],
    draw: c => {
      const y = c.crown + 1;
      c.paintRow(y, T.ACCENT);
      const r = c.rows[y]!;
      c.set(r.right, y, T.ACCENT_SHADE);
      for (let x = r.right + 1; x <= Math.min(r.right + 2, 14); x++) c.set(x, y, T.ACCENT_SHADE);
    },
  },
  {
    id: 'puttsies.flag', game: 'puttsies', name: 'Pin flag', rarity: 'rare',
    colors: ['#8A8F99', '#E5484D', '#B8313A'],
    draw: on([
      '1222',
      '1223',
      '1...',
    ], 1),
  },
  // Weighsies
  {
    id: 'weighsies.wedge', game: 'weighsies', name: 'Cheese wedge', rarity: 'common',
    colors: ['#FFC94A', '#E3A52E', '#D98F22'],
    draw: on([
      '...11',
      '.1131',
      '11122',
    ]),
  },
  {
    id: 'weighsies.scale', game: 'weighsies', name: 'Balance', rarity: 'rare',
    colors: ['#2B2F38', '#FFFFFF', '#D9DEE6'],
    draw: on([
      '22.1.22',
      '3111113',
      '...1...',
    ]),
  },
  // Cutsies
  {
    id: 'cutsies.slice', game: 'cutsies', name: 'Kiwi slice', rarity: 'common',
    colors: ['#86CF55', '#C9F08F', '#2A1B10', '#F1F7D4', '#9C6E43'],
    draw: on([
      '.1111.',
      '134431',
      '.5555.',
    ]),
  },
  {
    id: 'cutsies.chef', game: 'cutsies', name: 'Chef hat', rarity: 'rare',
    colors: ['#FFFFFF', '#DCE3EC'],
    draw: on([
      '.1111.',
      '111112',
      '.2222.',
    ]),
  },
  // Tiltsies
  {
    id: 'tiltsies.ears', game: 'tiltsies', name: 'Hamster ears', rarity: 'common',
    colors: ['#EDB57D', '#FFB3A7'],
    draw: onPair([
      '11',
      '12',
    ], 1),
  },
  {
    id: 'tiltsies.buddy', game: 'tiltsies', name: 'Hamster buddy', rarity: 'rare',
    colors: ['#EDB57D', '#FFE7CB', '#2A1B10'],
    draw: on([
      '1...1',
      '11111',
      '13131',
      '.222.',
    ]),
  },
  // Trackdle
  {
    id: 'trackdle.cap', game: 'trackdle', name: 'Pit cap', rarity: 'common',
    colors: ['#23262D', '#FFFFFF'],
    draw: c => {
      capRows(c, 2, T.ACCENT, T.ACCENT_SHADE);
      const r = c.rows[c.crown + 1]!;
      for (let x = r.left; x <= r.right; x++) c.set(x, c.crown + 1, (x - r.left) % 2 ? L(1) : L(2));
      for (let x = r.right + 1; x <= Math.min(r.right + 2, 14); x++) c.set(x, c.crown + 1, T.ACCENT_SHADE);
    },
  },
  {
    id: 'trackdle.helmet', game: 'trackdle', name: 'Race helmet', rarity: 'rare',
    colors: ['#FF7A2F', '#D65A1C', '#FFFFFF', '#23262D'],
    draw: c => {
      capRows(c, 2, L(1), L(2));
      const x = Math.floor(c.centre);
      c.set(x - 1, c.crown, L(3));
      c.set(x, c.crown, L(3));
      c.set(x - 1, c.crown + 1, L(3));
      c.set(x, c.crown + 1, L(3));
      c.paintRow(c.crown + 2, L(4));
      const r = c.rows[c.crown + 2]!;
      c.set(r.left - 1, c.crown + 2, L(4));
      c.set(r.right + 1, c.crown + 2, L(4));
    },
  },
];

// ---------------------------------------------------------------- frames

const frames: Omit<Item, 'slot' | 'rarity'>[] = [
  {
    id: 'amountle.sparkle', game: 'amountle', name: 'Gem field',
    colors: ['#E4F6F4', '#3FD1C1', '#A6F4EA'],
    fill: (x, y) => {
      const gems = [[2, 2], [13, 3], [1, 9], [14, 12], [4, 14], [11, 14]];
      for (const [gx, gy] of gems) {
        if (x === gx && y === gy) return 2;
        if (Math.abs(x - gx) + Math.abs(y - gy) === 1) return 3;
      }
      return 1;
    },
  },
  {
    id: 'halfsies.stripes', game: 'halfsies', name: 'Kitchen teal',
    colors: ['#7DD8D0', '#6CC7BF'],
    fill: (x, y) => ((x + y) % 4 < 2 ? 1 : 2),
  },
  {
    id: 'stackdle.toybox', game: 'stackdle', name: 'Toy box',
    colors: ['#DCE8FF', '#FF8FB1', '#FFB03B', '#6FA8FF'],
    fill: (x, y) => {
      if ((x === 1 || x === 2) && (y === 1 || y === 2)) return 2;
      if (y === 13 && x >= 12 && x <= 14) return 3;
      if (y === 12 && x === 13) return 3;
      if ((x === 1 || x === 2) && (y === 13 || y === 14)) return 4;
      return 1;
    },
  },
  {
    id: 'flipsies.target', game: 'flipsies', name: 'Bullseye',
    colors: ['#CFE8FB', '#8EC5F0', '#FFFFFF'],
    fill: (x, y) => {
      const d = Math.floor(Math.hypot(x - 7.5, y - 7.5));
      return d % 3 === 0 ? 2 : d % 3 === 1 ? 3 : 1;
    },
  },
  {
    id: 'puttsies.quilt', game: 'puttsies', name: 'Patchwork',
    colors: ['#F7B7B0', '#B9E3A8', '#B3D4F5', '#FBE3A1', '#D7C6F2', '#FFFFFF'],
    fill: (x, y) => {
      if ((x % 4 === 0 || y % 4 === 0) && (x + y) % 2 === 0) return 6;
      return ((Math.floor(x / 4) + Math.floor(y / 4) * 2) % 5) + 1;
    },
  },
  {
    id: 'weighsies.lavender', game: 'weighsies', name: 'Lavender',
    colors: ['#C9B8F5', '#B39EEC'],
    fill: (x, y) => (x % 3 === 1 && y % 3 === 1 ? 2 : 1),
  },
  {
    id: 'cutsies.slices', game: 'cutsies', name: 'Kiwi slices',
    colors: ['#9CC8F0', '#86CF55', '#2A1B10', '#7A5432'],
    fill: (x, y) => {
      for (const [kx, ky] of [[2, 2], [13, 13], [13, 2], [2, 13]]) {
        const d = Math.abs(x - kx) + Math.abs(y - ky);
        if (d === 0) return 3;
        if (d === 1) return 2;
        if (d === 2 && x !== kx && y !== ky) return 4;
      }
      return 1;
    },
  },
  {
    id: 'tiltsies.maze', game: 'tiltsies', name: 'Toy maze',
    colors: ['#F4EBD6', '#CFE3B0'],
    fill: (x, y) => ((Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? 2 : 1),
  },
  {
    id: 'trackdle.flag', game: 'trackdle', name: 'Checkered flag',
    colors: ['#2A2D33', '#F4F4F4'],
    fill: (x, y) => ((Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? 1 : 2),
  },
];

// ---------------------------------------------------------------- gold

const GOLD_RAMP = ['#6E4510', '#A9741C', '#DDA533', '#F7C94F', '#FFE08A', '#FFF4C7'];

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * The same item cast in gold: each colour keeps its place in the light-to-dark
 * order, so the drawing still reads, but every one of them is gold.
 */
function gilded(item: Item): Item {
  const order = [...new Set(item.colors)].sort((a, b) => luminance(a) - luminance(b));
  const step = (hex: string) => {
    const rank = order.indexOf(hex);
    const at = order.length === 1 ? 3 : Math.round((rank / (order.length - 1)) * (GOLD_RAMP.length - 2)) + 1;
    return GOLD_RAMP[at];
  };
  // A gold backdrop behind a gold guy is one flat yellow square. A frame's
  // ground (its first colour) goes to near-black instead, with the pattern in
  // gold on top, which is what makes the rest of the set look precious.
  if (item.slot === 'frame') {
    return {
      ...item,
      id: `${item.id}.gold`,
      name: `Gold ${item.name.toLowerCase()}`,
      rarity: 'legendary',
      colors: item.colors.map((hex, i) => (i === 0 ? '#2A2235' : step(hex))),
      shine: true,
    };
  }
  return {
    ...item,
    id: `${item.id}.gold`,
    name: `Gold ${item.name.toLowerCase()}`,
    rarity: 'legendary',
    colors: item.colors.map(step),
    outline: item.outline ? '#5C3A0C' : undefined,
    shine: true,
  };
}

const base: Item[] = [
  ...skins.map(s => ({ ...s, slot: 'skin' as const, rarity: 'epic' as const })),
  ...hats.map(h => ({ ...h, slot: 'hat' as const })),
  ...frames.map(f => ({ ...f, slot: 'frame' as const, rarity: 'epic' as const })),
];

/** Every item, in game order: skins, hats and frames, then the gold editions. */
export const items: Item[] = [
  ...base,
  ...base.filter(i => i.rarity !== 'common').map(gilded),
];

const byId = new Map(items.map(i => [i.id, i]));

export function itemById(id: string | undefined): Item | undefined {
  return id ? byId.get(id) : undefined;
}

export const GAMES: GameId[] = [
  'amountle', 'halfsies', 'stackdle', 'flipsies', 'puttsies',
  'weighsies', 'cutsies', 'tiltsies', 'trackdle',
];

/** A game's items. */
export function gameItems(game: GameId): Item[] {
  return items.filter(i => i.game === game);
}

/** The hat every player wears in a game until they put something else on. */
export function freeItem(game: GameId): Item {
  return items.find(i => i.game === game && i.rarity === 'common')!;
}

/**
 * Puts items on a resolved guy: the game's free hat if a game is named, then
 * whatever `equip` lists, one per slot.
 */
export function dress(config: AvatarConfig, options: Pick<RenderOptions, 'game' | 'equip'> = {}): AvatarConfig {
  const out = { ...config };
  if (options.game) out.hat = freeItem(options.game).id;
  for (const id of options.equip ?? []) {
    const item = byId.get(id);
    if (item) out[item.slot] = item.id;
  }
  return out;
}

/** Adds the equipped items' own colours to a palette. */
export function withItems(palette: Palette, config: AvatarConfig): Palette {
  const colors = { ...palette.colors };
  for (const slot of ['skin', 'hat', 'frame'] as const) {
    const item = itemById(config[slot]);
    if (!item) continue;
    item.colors.forEach((hex, i) => { colors[LAYER[slot] + i] = hex; });
    if (slot === 'skin' && item.outline) colors[T.OUTLINE] = item.outline;
  }
  return { name: palette.name, colors };
}
