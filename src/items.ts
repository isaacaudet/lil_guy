import { LAYER, LOCAL, stamp, T, width, type Stamp } from './parts/art';
import type { Canvas } from './parts/canvas';
import { capRows, mirror, seat } from './parts/hair';
import { decode, starter } from './owned';
import type { AvatarConfig, GameId, Palette, RenderOptions } from './types';
import { GRID_SIZE } from './types';

/**
 * Items: things a player earns or buys in a DLE Club game and wears
 * everywhere. Each game has
 *
 * - two skins, which turn the guy into one of the game's own objects (a jar,
 *   a golf ball, a traffic cone) while keeping his face
 * - three hats, one of them free: every player has it from the start
 * - two frames, the backdrop behind him
 *
 * An item is the design. A copy someone owns adds a finish, a scuff and a
 * print number (see ./owned), which is what makes one copy worth more than
 * another. Items are drawn in their own colours (the `1`–`9` characters),
 * listed with the item, and a finish repaints them. The free hats use the
 * guy's own accent colour, so they still vary by name.
 *
 * This file only draws them. Who owns what, and what it costs, belongs to the
 * game or the club.
 */

export type Slot = 'skin' | 'hat' | 'frame';

export interface Item {
  /** `game.name`. */
  id: string;
  game: GameId;
  slot: Slot;
  name: string;
  /** The hat every player has in this game from the start. */
  free?: boolean;
  /** Colours for the art's `1`–`9`. */
  colors: string[];
  /** A skin's outline colour, replacing the one worked out from the palette. */
  outline?: string;
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

const skins: Omit<Item, 'slot'>[] = [
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
  {
    id: 'amountle.crystal', game: 'amountle', name: 'Crystal', eyes: 8,
    colors: ['#3FD1C1', '#1F9C90', '#A6F4EA', '#FFFFFF'],
    outline: '#14524C',
    art: grid16('gem', [
      '................',
      '................',
      '................',
      '......3311......',
      '.....333111.....',
      '....43331111....',
      '...3333311111...',
      '..333331111112..',
      '..333311111112..',
      '..111111111122..',
      '...1111111122...',
      '....11111222....',
      '.....111222.....',
      '......1222......',
      '.......22.......',
      '................',
    ]),
  },
  {
    id: 'halfsies.kitchen-scale', game: 'halfsies', name: 'Kitchen scale', eyes: 8, limb: 1,
    colors: ['#F4F4F2', '#CFD3D8', '#FFFFFF', '#2B2F38', '#E5484D', '#9AA0A8'],
    outline: '#3C4048',
    art: grid16('kitchen scale', [
      '................',
      '................',
      '...6666666666...',
      '....66666666....',
      '......2222......',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..311114411112..',
      '..222245542222..',
      '................',
      '................',
    ]),
  },
  {
    id: 'stackdle.triangle', game: 'stackdle', name: 'Triangle', eyes: 10, limb: 1,
    colors: ['#FFB03B', '#E58A1F', '#FFD27A'],
    outline: '#7A3E0A',
    art: grid16('triangle', [
      '................',
      '................',
      '.......33.......',
      '......3311......',
      '......3311......',
      '.....331111.....',
      '.....331111.....',
      '....33111111....',
      '....31111111....',
      '...3111111112...',
      '...3111111112...',
      '..311111111112..',
      '..311111111112..',
      '.22222222222222.',
      '................',
      '................',
    ]),
  },
  {
    id: 'flipsies.bullseye', game: 'flipsies', name: 'Bullseye', eyes: 8,
    colors: ['#FFFFFF', '#8EC5F0', '#3E7BE0', '#D9E3EE'],
    outline: '#1E3F78',
    art: grid16('bullseye', [
      '................',
      '................',
      '................',
      '.....333333.....',
      '....33111133....',
      '...3311111133...',
      '..331122221133..',
      '..311222222113..',
      '..312211112213..',
      '..312211112213..',
      '..311222222113..',
      '..331122221133..',
      '...3311111133...',
      '....33333333....',
      '................',
      '................',
    ]),
  },
  {
    id: 'puttsies.pillow', game: 'puttsies', name: 'Quilt pillow', eyes: 8,
    colors: ['#F7B7B0', '#B9E3A8', '#B3D4F5', '#FBE3A1', '#C98A84'],
    outline: '#6E3E3A',
    art: grid16('quilt pillow', [
      '................',
      '................',
      '..5..........5..',
      '..555555555555..',
      '..511111222225..',
      '..511111222225..',
      '..511111222225..',
      '..511111222225..',
      '..533333444445..',
      '..533333444445..',
      '..533333444445..',
      '..533333444445..',
      '..555555555555..',
      '..5..........5..',
      '................',
      '................',
    ]),
  },
  {
    id: 'weighsies.kettlebell', game: 'weighsies', name: 'Kettlebell', eyes: 8, limb: 1,
    colors: ['#4A4E5E', '#2E3140', '#6C7286', '#F2C230'],
    outline: '#14161C',
    art: grid16('kettlebell', [
      '................',
      '................',
      '.....111111.....',
      '....1......1....',
      '....1......1....',
      '....31111112....',
      '...3111111112...',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '...3114444112...',
      '....22222222....',
      '................',
      '................',
    ]),
  },
  {
    id: 'cutsies.melon', game: 'cutsies', name: 'Melon slice', eyes: 8,
    colors: ['#F25C6B', '#2EB872', '#2A1B10', '#E8F5D0'],
    outline: '#5A1A22',
    art: grid16('melon slice', [
      '................',
      '................',
      '................',
      '................',
      '.11111111111111.',
      '.13111111111131.',
      '..311111111113..',
      '..111111111111..',
      '..111111111111..',
      '..111111111111..',
      '...1111111111...',
      '...4111111114...',
      '....44444444....',
      '.....222222.....',
      '................',
      '................',
    ]),
  },
  {
    id: 'tiltsies.hamster', game: 'tiltsies', name: 'Hamster', eyes: 8, limb: 2,
    colors: ['#EDB57D', '#CC8E55', '#FFE7CB', '#FFB3A7'],
    outline: '#5A3418',
    art: grid16('hamster', [
      '................',
      '................',
      '...22......22...',
      '...2421111242...',
      '...1111111111...',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..311133331112..',
      '..311333333112..',
      '..113333333311..',
      '...2333333332...',
      '....22222222....',
      '................',
      '................',
    ]),
  },
  {
    id: 'trackdle.cone', game: 'trackdle', name: 'Traffic cone', eyes: 10,
    colors: ['#FF7A2F', '#D65A1C', '#FFFFFF', '#FFAE73', '#2B2F38'],
    outline: '#6A2A0C',
    art: grid16('traffic cone', [
      '................',
      '.......11.......',
      '.......11.......',
      '......4112......',
      '......3333......',
      '.....411112.....',
      '.....411112.....',
      '....33333333....',
      '....41111112....',
      '...4111111112...',
      '...4111111112...',
      '...3333333333...',
      '..411111111112..',
      '.55555555555555.',
      '................',
      '................',
    ]),
  },
];

// ---------------------------------------------------------------- hats

const hats: Omit<Item, 'slot'>[] = [
  // Amountle
  {
    id: 'amountle.gem', game: 'amountle', name: 'Gem', free: true, colors: [],
    draw: on([
      '.xa.',
      'aaaA',
      '.aA.',
    ]),
  },
  {
    id: 'amountle.crown', game: 'amountle', name: 'Gem crown', 
    colors: ['#FFD25A', '#E0A62E', '#3FD1C1', '#A6F4EA'],
    draw: on([
      '1.1.1',
      '14341',
      '22222',
    ]),
  },
  // Halfsies
  {
    id: 'halfsies.bowl', game: 'halfsies', name: 'Half pot', free: true, colors: [],
    draw: on([
      '.aaaa.',
      'axxxxA',
      'AAAAAA',
    ]),
  },
  {
    id: 'halfsies.scale', game: 'halfsies', name: 'Scale dish', 
    colors: ['#FFFFFF', '#D9DEE6', '#2B2F38'],
    draw: on([
      '11111111',
      '.222222.',
      '...33...',
    ]),
  },
  // Stackdle
  {
    id: 'stackdle.cube', game: 'stackdle', name: 'Little block', free: true, colors: [],
    draw: on([
      'xxxA',
      'aaaA',
      'aaaA',
    ]),
  },
  {
    id: 'stackdle.tower', game: 'stackdle', name: 'Tower', 
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
    id: 'flipsies.cap', game: 'flipsies', name: 'Bottle cap', free: true, colors: [],
    draw: on([
      'xaxa',
      'aAaA',
    ]),
  },
  {
    id: 'flipsies.landed', game: 'flipsies', name: 'Landed bottle', 
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
    id: 'puttsies.visor', game: 'puttsies', name: 'Golf visor', free: true, colors: [],
    draw: c => {
      const y = c.crown + 1;
      c.paintRow(y, T.ACCENT);
      const r = c.rows[y]!;
      c.set(r.right, y, T.ACCENT_SHADE);
      for (let x = r.right + 1; x <= Math.min(r.right + 2, 14); x++) c.set(x, y, T.ACCENT_SHADE);
    },
  },
  {
    id: 'puttsies.flag', game: 'puttsies', name: 'Pin flag', 
    colors: ['#8A8F99', '#E5484D', '#B8313A'],
    draw: on([
      '1222',
      '1223',
      '1...',
    ], 1),
  },
  // Weighsies
  {
    id: 'weighsies.wedge', game: 'weighsies', name: 'Cheese wedge', free: true,
    colors: ['#FFC94A', '#E3A52E', '#D98F22'],
    draw: on([
      '...11',
      '.1131',
      '11122',
    ]),
  },
  {
    id: 'weighsies.scale', game: 'weighsies', name: 'Balance', 
    colors: ['#2B2F38', '#FFFFFF', '#D9DEE6'],
    draw: on([
      '22.1.22',
      '3111113',
      '...1...',
    ]),
  },
  // Cutsies
  {
    id: 'cutsies.slice', game: 'cutsies', name: 'Kiwi slice', free: true,
    colors: ['#86CF55', '#C9F08F', '#2A1B10', '#F1F7D4', '#9C6E43'],
    draw: on([
      '.1111.',
      '134431',
      '.5555.',
    ]),
  },
  {
    id: 'cutsies.chef', game: 'cutsies', name: 'Chef hat', 
    colors: ['#FFFFFF', '#DCE3EC'],
    draw: on([
      '.1111.',
      '111112',
      '.2222.',
    ]),
  },
  // Tiltsies
  {
    id: 'tiltsies.ears', game: 'tiltsies', name: 'Hamster ears', free: true,
    colors: ['#EDB57D', '#FFB3A7'],
    draw: onPair([
      '11',
      '12',
    ], 1),
  },
  {
    id: 'tiltsies.buddy', game: 'tiltsies', name: 'Hamster buddy', 
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
    id: 'trackdle.cap', game: 'trackdle', name: 'Pit cap', free: true,
    colors: ['#23262D', '#FFFFFF'],
    draw: c => {
      capRows(c, 2, T.ACCENT, T.ACCENT_SHADE);
      const r = c.rows[c.crown + 1]!;
      for (let x = r.left; x <= r.right; x++) c.set(x, c.crown + 1, (x - r.left) % 2 ? L(1) : L(2));
      for (let x = r.right + 1; x <= Math.min(r.right + 2, 14); x++) c.set(x, c.crown + 1, T.ACCENT_SHADE);
    },
  },
  {
    id: 'trackdle.helmet', game: 'trackdle', name: 'Race helmet',
    colors: ['#FF7A2F', '#D65A1C', '#FFFFFF', '#1C2733', '#6FA8D8'],
    draw: c => {
      capRows(c, 3, L(1), L(2));
      const x = Math.floor(c.centre);
      for (let y = c.crown; y < c.crown + 3; y++) { c.set(x - 1, y, L(3)); c.set(x, y, L(3)); }
      const y = c.crown + 3;
      const r = c.rows[y]!;
      // The visor juts out a column where there is room for it.
      for (let vx = r.left; vx <= Math.min(r.right + 1, 14); vx++) c.set(vx, y, L(4));
      c.set(r.right - 1, y, L(5));
      c.set(r.right, y, L(5));
      if (r.left > 1) c.set(r.left - 1, y, L(1));
    },
  },
  // Bigger third hats, one per game
  {
    id: 'amountle.cluster', game: 'amountle', name: 'Big gem',
    colors: ['#3FD1C1', '#1F9C90', '#A6F4EA'],
    draw: on([
      '.331.',
      '33111',
      '31112',
      '.112.',
    ]),
  },
  {
    id: 'halfsies.helmet', game: 'halfsies', name: 'Pot helmet',
    colors: ['#E07B4C', '#B85A34', '#F4A77C', '#5E2A1C', '#F6DCBB'],
    draw: c => {
      capRows(c, 2, L(1), L(2));
      const r = c.rows[c.crown + 2]!;
      for (let x = r.left - 1; x <= r.right + 1; x++) c.set(x, c.crown + 2, (x - r.left) % 2 ? L(5) : L(4));
      const x = Math.floor(c.centre);
      if (c.crown > 1) {
        c.set(x - 1, c.crown - 1, L(3));
        c.set(x, c.crown - 1, L(1));
      }
    },
  },
  {
    id: 'stackdle.ring', game: 'stackdle', name: 'Ring',
    colors: ['#FF8FB1', '#E0628A'],
    draw: on([
      '.11.',
      '1..2',
      '1..2',
      '.22.',
    ]),
  },
  {
    id: 'flipsies.beret', game: 'flipsies', name: 'Bullseye beret',
    colors: ['#FFFFFF', '#8EC5F0', '#E5484D'],
    draw: on([
      '.1111.',
      '123321',
      '.2222.',
    ], 1),
  },
  {
    id: 'puttsies.tam', game: 'puttsies', name: 'Golf tam',
    colors: ['#2E7D4F', '#1F5C38', '#F2C230', '#E5484D'],
    draw: on([
      '..33..',
      '.1411.',
      '141141',
      '222222',
    ]),
  },
  {
    id: 'weighsies.dumbbell', game: 'weighsies', name: 'Dumbbell',
    colors: ['#4A4E5E', '#9AA0A8'],
    draw: on([
      '1.....1',
      '1222221',
      '1.....1',
    ]),
  },
  {
    id: 'cutsies.orange', game: 'cutsies', name: 'Orange half',
    colors: ['#FF9F2E', '#E07B14', '#FFD08A', '#FFF1D6'],
    draw: on([
      '.1111.',
      '111112',
      '343434',
    ]),
  },
  {
    id: 'tiltsies.seed', game: 'tiltsies', name: 'Sunflower seed',
    colors: ['#3A3A42', '#E8E4DA'],
    draw: on([
      '.1.',
      '121',
      '121',
      '121',
    ], 2),
  },
  {
    id: 'trackdle.trophy', game: 'trackdle', name: 'Trophy',
    colors: ['#F2C230', '#C8901E', '#FFE9A0'],
    draw: on([
      '1.313.1',
      '1111111',
      '.11111.',
      '..121..',
      '.22222.',
    ]),
  },
];

// ---------------------------------------------------------------- frames

const frames: Omit<Item, 'slot'>[] = [
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

  // A second frame for every game.
  {
    id: 'amountle.coins', game: 'amountle', name: 'Coin pile',
    colors: ['#FFF4D6', '#F2C230', '#C8901E'],
    fill: (x, y) => (y >= 12 ? ((x + y) % 3 === 0 ? 3 : 2) : (x * 7 + y * 3) % 23 === 0 ? 2 : 1),
  },
  {
    id: 'halfsies.gingham', game: 'halfsies', name: 'Gingham',
    colors: ['#FFFFFF', '#F7C2BA', '#EE968B'],
    fill: (x, y) => {
      const a = Math.floor(x / 2) % 2, b = Math.floor(y / 2) % 2;
      return a && b ? 3 : a || b ? 2 : 1;
    },
  },
  {
    id: 'stackdle.bricks', game: 'stackdle', name: 'Bricks',
    colors: ['#F08A5D', '#D9704A', '#FCE1D2'],
    fill: (x, y) => (y % 4 === 3 || (x + (Math.floor(y / 4) % 2) * 2) % 4 === 3 ? 3 : (x + y) % 5 === 0 ? 2 : 1),
  },
  {
    id: 'flipsies.waves', game: 'flipsies', name: 'Waves',
    colors: ['#BFE6FF', '#7CC4F2', '#FFFFFF'],
    fill: (x, y) => {
      const v = (y + [0, 1, 1, 0][x % 4]) % 4;
      return v === 0 ? 2 : v === 1 && x % 4 === 1 ? 3 : 1;
    },
  },
  {
    id: 'puttsies.fairway', game: 'puttsies', name: 'Fairway',
    colors: ['#A6DB86', '#8CCB6C'],
    fill: x => (Math.floor(x / 3) % 2 ? 2 : 1),
  },
  {
    id: 'weighsies.ruler', game: 'weighsies', name: 'Ruler',
    colors: ['#FFE9A8', '#B98420'],
    fill: (x, y) => ((y <= 1 && x % 2 === 0) || (y === 2 && x % 4 === 0) || (y >= 14 && x % 2 === 1) ? 2 : 1),
  },
  {
    id: 'cutsies.seeds', game: 'cutsies', name: 'Melon seeds',
    colors: ['#FF8FA3', '#2A1B10', '#FFC2CC'],
    fill: (x, y) => ((x * 3 + y * 5) % 11 === 0 ? 2 : (x + y) % 2 === 0 && y % 3 === 0 ? 3 : 1),
  },
  {
    id: 'tiltsies.spiral', game: 'tiltsies', name: 'Spiral',
    colors: ['#E6D8FF', '#B9A3F0'],
    fill: (x, y) => (Math.floor(Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5))) % 2 ? 2 : 1),
  },
  {
    id: 'trackdle.tarmac', game: 'trackdle', name: 'Tarmac',
    colors: ['#5A5F6B', '#4A4E58', '#F2C230'],
    fill: (x, y) => ((x === 7 || x === 8) ? (y % 4 < 2 ? 3 : 1) : (x * 5 + y * 3) % 7 === 0 ? 2 : 1),
  },
];

/** Every item: each game's skins, then hats, then frames. */
export const items: Item[] = [
  ...skins.map(i => ({ ...i, slot: 'skin' as const })),
  ...hats.map(i => ({ ...i, slot: 'hat' as const })),
  ...frames.map(i => ({ ...i, slot: 'frame' as const })),
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
  return items.find(i => i.game === game && i.free)!;
}

/**
 * Puts items on a resolved guy. Naming a game puts on that game's free hat —
 * the player's own copy of it when their `name` is given. Then each `equip`
 * entry, an item id or an encoded owned copy, takes its slot.
 */
export function dress(config: AvatarConfig, options: Pick<RenderOptions, 'game' | 'equip'> = {}, name?: string): AvatarConfig {
  const out: AvatarConfig = { ...config, owned: { ...config.owned } };
  if (options.game) {
    out.hat = freeItem(options.game).id;
    if (name !== undefined) out.owned!.hat = starter(name, options.game);
  }
  for (const entry of options.equip ?? []) {
    const copy = entry.includes('~') ? decode(entry) : null;
    const item = byId.get(copy ? copy.item : entry);
    if (!item) continue;
    out[item.slot] = item.id;
    if (copy) out.owned![item.slot] = copy;
    else delete out.owned![item.slot];
  }
  return out;
}

function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const c = (i: number) => {
      const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * c(0) + 0.7152 * c(1) + 0.0722 * c(2);
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Adds the equipped items' own colours to a palette. */
export function withItems(palette: Palette, config: AvatarConfig): Palette {
  const colors = { ...palette.colors };
  for (const slot of ['skin', 'hat', 'frame'] as const) {
    const item = itemById(config[slot]);
    if (!item) continue;
    item.colors.forEach((hex, i) => { colors[LAYER[slot] + i] = hex; });
    if (slot === 'skin') {
      if (item.outline) colors[T.OUTLINE] = item.outline;
      // The face is drawn on the skin now, so its ink follows the skin.
      const dark = '#15111C', light = '#FFF1D6';
      colors[T.EYE] = colors[T.MOUTH] = contrast(dark, item.colors[0]) >= contrast(light, item.colors[0]) ? dark : light;
    }
  }
  return { name: palette.name, colors };
}
