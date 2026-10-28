import { LAYER, LOCAL, stamp, T, width, type Stamp } from './parts/art';
import type { Canvas } from './parts/canvas';
import { capRows, mirror, seat } from './parts/hair';
import { elastic, grid16, L, on, onPair, pet, span, wear } from './item-art';
import { SETS } from './sets';
import { decode, starter } from './owned';
import { AURAS, ONE_OF_ONE_AURAS } from './auras';
import type { Fx } from './effects';
import { painted, PAINTABLE } from './paints';
import type { AvatarConfig, GameId, Palette, RenderOptions } from './types';
import { GRID_SIZE } from './types';

/**
 * Items: things a player earns or buys in a DLE Club game and wears
 * everywhere. Each game has
 *
 * - four skins, which turn the guy into one of the game's own objects (a jar,
 *   a golf ball, a traffic cone) while keeping his face
 * - four hats, one of them free: every player has it from the start
 * - three frames, the backdrop behind him
 * - three buddies, a tiny pet at his feet
 *
 * So each game's capsule machine holds thirteen. Lists are append-only: a
 * saved copy stores its item's id, so an item is never renamed or removed.
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

export type Slot = 'skin' | 'hat' | 'frame' | 'buddy' | 'aura';

/** Which game an item belongs to; `club` items are seasonal and belong to no one game. */
export type ItemGame = GameId | 'club';

export interface Item {
  /** `game.name`. */
  id: string;
  game: ItemGame;
  slot: Slot;
  name: string;
  /** One line on what it is, for items that don't explain themselves. */
  about?: string;
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
  /** A machine's showpiece: its standout item, rarer than the rest. */
  showpiece?: boolean;
  /** A showpiece's own effect: every copy of it moves this way. */
  signature?: Fx;
  /** Seasonal items: the days of the year they drop, as `MM-DD`, inclusive. */
  season?: { from: string; to: string };
  /** Out of its machine (./sets): copies people own still read and draw, but no capsule gives one. */
  retired?: boolean;
}

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
    id: 'cutsies.kiwi', game: 'cutsies', name: 'Kiwi',
    about: 'Turns your guy into a fuzzy brown kiwi, cut open on top.', eyes: 10, limb: 1,
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

  // A third skin for every game.
  {
    id: 'amountle.piggy', game: 'amountle', name: 'Piggy bank', eyes: 8, limb: 2,
    colors: ['#FFA3C0', '#E5799C', '#FFC9DA', '#2B2F38', '#F2C230'],
    outline: '#8C3556',
    art: grid16('piggy bank', [
      '................',
      '................',
      '.......55.......',
      '...22..44..22...',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '...3111111112...',
      '...2222222222...',
      '................',
      '................',
      '................',
    ]),
  },
  {
    id: 'halfsies.avocado', game: 'halfsies', name: 'Avocado half', eyes: 7,
    colors: ['#DCF0A6', '#BBDB7C', '#3F6B22', '#7A4A2A', '#B07444'],
    outline: '#2C4A16',
    art: grid16('avocado', [
      '................',
      '................',
      '......3333......',
      '.....311113.....',
      '....31111113....',
      '...3111111113...',
      '..311111111113..',
      '..311111111113..',
      '..311111111113..',
      '..311111111223..',
      '..311111111223..',
      '..311114451223..',
      '...3115544223...',
      '....33333333....',
      '................',
      '................',
    ]),
  },
  {
    id: 'stackdle.brick', game: 'stackdle', name: 'Building brick', eyes: 8, limb: 2,
    colors: ['#F05A4E', '#C23B31', '#FF8A80', '#D9463C'],
    outline: '#6E1A14',
    art: grid16('building brick', [
      '................',
      '................',
      '...34..34..34...',
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
      '................',
    ]),
  },
  {
    id: 'flipsies.pancakes', game: 'flipsies', name: 'Pancake stack', eyes: 9,
    colors: ['#F4C987', '#CF9450', '#FFE7B0', '#FFF6C9', '#9A4E1C'],
    outline: '#6B3810',
    art: grid16('pancakes', [
      '................',
      '................',
      '.......44.......',
      '......4444......',
      '...5555555555...',
      '..355555555552..',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..222222222222..',
      '..311111111112..',
      '..222222222222..',
      '................',
      '................',
    ]),
  },
  {
    id: 'puttsies.bag', game: 'puttsies', name: 'Golf bag', eyes: 8, limb: 2,
    colors: ['#3A9466', '#256B47', '#5CB585', '#D7DCE4', '#8A93A3', '#FFFFFF'],
    outline: '#163F2A',
    art: grid16('golf bag', [
      '................',
      '....44.44.44....',
      '.....5..5..5....',
      '.....5..5..5....',
      '...3111111112...',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..366666666662..',
      '..311111111112..',
      '...2222222222...',
      '................',
      '................',
    ]),
  },
  {
    id: 'weighsies.anvil', game: 'weighsies', name: 'Anvil', eyes: 6,
    colors: ['#9AA2B2', '#6E7688', '#C4CAD6'],
    outline: '#30343E',
    art: grid16('anvil', [
      '................',
      '................',
      '................',
      '....3111111112..',
      '.3311111111112..',
      '..311111111112..',
      '...3111111112...',
      '...3111111112...',
      '.....311112.....',
      '.....311112.....',
      '....31111112....',
      '...3111111112...',
      '...2222222222...',
      '................',
      '................',
      '................',
    ]),
  },
  {
    id: 'cutsies.toast', game: 'cutsies', name: 'Toast', eyes: 8,
    colors: ['#F7E0AA', '#E3C07C', '#FFF1CF', '#B77634'],
    outline: '#5E3410',
    art: grid16('toast', [
      '................',
      '................',
      '....44444444....',
      '...4111111114...',
      '..411111111114..',
      '..431111111124..',
      '..431111111124..',
      '..431111111124..',
      '..431111111124..',
      '..431111111124..',
      '..431111111124..',
      '..431111111124..',
      '..422222222224..',
      '..444444444444..',
      '................',
      '................',
    ]),
  },
  {
    id: 'tiltsies.marble', game: 'tiltsies', name: 'Marble', eyes: 8,
    colors: ['#9ED8F2', '#68B2DA', '#E9F8FF', '#FF7AA8', '#FFFFFF'],
    outline: '#245A7A',
    art: grid16('marble', [
      '................',
      '................',
      '................',
      '.....444111.....',
      '....35441111....',
      '...3511111112...',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..311111111142..',
      '...3111111442...',
      '....21114422....',
      '.....222222.....',
      '................',
      '................',
    ]),
  },
  {
    id: 'trackdle.stopwatch', game: 'trackdle', name: 'Stopwatch', eyes: 9,
    colors: ['#FFFFFF', '#E3E7EE', '#E5484D', '#2B2F38', '#C9CED8'],
    outline: '#7A1E22',
    art: grid16('stopwatch', [
      '................',
      '.......44.......',
      '......5555......',
      '.....333333.....',
      '...3311111133...',
      '..311111111113..',
      '..311114411113..',
      '..311111111113..',
      '..311111111113..',
      '..311111111113..',
      '..311111111123..',
      '..311111111223..',
      '...3311112233...',
      '.....333333.....',
      '................',
      '................',
    ]),
  },

  // A fourth skin for every game.
  {
    id: 'amountle.gumball', game: 'amountle', name: 'Gumball machine', eyes: 7,
    colors: ['#EAF6FA', '#C5DDE6', '#FFFFFF', '#E5484D', '#B83236', '#FFD447', '#3FD1C1', '#FF7AA8', '#5A1A22'],
    outline: '#5A1A22',
    art: grid16('gumball machine', [
      '................',
      '................',
      '.......44.......',
      '.....455554.....',
      '...3111111112...',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..111111111112..',
      '..167186171682..',
      '...6871687862...',
      '...4444444444...',
      '...4444994445...',
      '...5555555555...',
      '................',
      '................',
    ]),
  },
  {
    id: 'halfsies.lemon', game: 'halfsies', name: 'Lemon half', eyes: 8,
    colors: ['#FFE680', '#F2D35E', '#FFFFFF', '#FFD23A', '#E0A61E', '#FFFBE6'],
    outline: '#7A5A0A',
    art: grid16('lemon half', [
      '................',
      '................',
      '................',
      '.....444444.....',
      '...4466666655...',
      '..461311113165..',
      '..461131131165..',
      '..461111111165..',
      '..461111111165..',
      '..461111111165..',
      '..461111111165..',
      '..461131131165..',
      '...4631113165...',
      '....55555555....',
      '................',
      '................',
    ]),
  },
  {
    id: 'stackdle.stack', game: 'stackdle', name: 'Block stack', eyes: 8, limb: 2,
    colors: ['#FFB03B', '#E58A1F', '#FFD27A', '#FFE2A8', '#4C8DF6', '#3467C9', '#FF8FB1', '#E0628A', '#FFC2D6'],
    outline: '#6A3A0A',
    art: grid16('block stack', [
      '................',
      '................',
      '.....997778.....',
      '.....977778.....',
      '.....888888.....',
      '..344444444442..',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..222222222222..',
      '...5555555556...',
      '...5555555556...',
      '...6666666666...',
      '................',
      '................',
    ]),
  },
  {
    id: 'flipsies.can', game: 'flipsies', name: 'Soda can', eyes: 8,
    colors: ['#E5484D', '#B83236', '#FF7A7E', '#D7DCE4', '#9AA0A8', '#FFFFFF'],
    outline: '#5A1A22',
    art: grid16('soda can', [
      '................',
      '................',
      '................',
      '...5444444445...',
      '...4555555554...',
      '...3111111112...',
      '...3111111112...',
      '...3111111112...',
      '...3111111112...',
      '...3111111112...',
      '...6661111666...',
      '...3116666112...',
      '...4555555554...',
      '....44444444....',
      '................',
      '................',
    ]),
  },
  {
    id: 'puttsies.windmill', game: 'puttsies', name: 'Windmill', eyes: 10,
    colors: ['#F4EDE0', '#D9CDB4', '#FFFFFF', '#C2463A', '#8E2E26', '#FFFFFF', '#B07A4A', '#2B2F38', '#3A9466'],
    outline: '#4A2A1E',
    art: grid16('windmill', [
      '................',
      '..66........66..',
      '..766......667..',
      '...766....667...',
      '....76688667....',
      '.....644446.....',
      '...6444444456...',
      '..644444444456..',
      '.67311111111276.',
      '...3111111112...',
      '...3111111112...',
      '...3111111112...',
      '...3111111992...',
      '...2222222992...',
      '................',
      '................',
    ]),
  },
  {
    id: 'weighsies.flour', game: 'weighsies', name: 'Flour sack', eyes: 9, limb: 2,
    colors: ['#F2E6CC', '#D6C5A0', '#FFFBF0', '#B07444', '#7FA8D8', '#4E78B0'],
    outline: '#5E4A2A',
    art: grid16('flour sack', [
      '................',
      '................',
      '.....31...13....',
      '......3113......',
      '.......44.......',
      '.....311112.....',
      '....31111112....',
      '...3111111112...',
      '..311111111112..',
      '..311111111112..',
      '..311111111112..',
      '..315555555612..',
      '..316666666612..',
      '...2222222222...',
      '................',
      '................',
    ]),
  },
  {
    id: 'cutsies.strawberry', game: 'cutsies', name: 'Strawberry', eyes: 8,
    colors: ['#F0435A', '#B82A40', '#FF8A96', '#FFE07A', '#5CB85C', '#3E8E3E'],
    outline: '#5A1422',
    art: grid16('strawberry', [
      '................',
      '................',
      '......5..5......',
      '....55566555....',
      '...3166666612...',
      '..341111111142..',
      '..311111111112..',
      '..411111111114..',
      '..311111111112..',
      '..311111111112..',
      '...4111111142...',
      '...3114114112...',
      '....21111122....',
      '.....222222.....',
      '................',
      '................',
    ]),
  },
  {
    id: 'tiltsies.acorn', game: 'tiltsies', name: 'Acorn', eyes: 9,
    colors: ['#E0A868', '#B87F42', '#F6CF98', '#8A5A32', '#A87448', '#6A4224', '#5C3A1E'],
    outline: '#3E2410',
    art: grid16('acorn', [
      '................',
      '................',
      '.......77.......',
      '....55545554....',
      '...5454545454...',
      '..454545454546..',
      '..666666666666..',
      '...3111111112...',
      '...3111111112...',
      '...3111111112...',
      '...3111111112...',
      '....31111112....',
      '.....311112.....',
      '.......22.......',
      '................',
      '................',
    ]),
  },
  {
    id: 'trackdle.tyre', game: 'trackdle', name: 'Tyre', eyes: 8,
    colors: ['#C9CED8', '#9AA0A8', '#EEF1F5', '#2B2F38', '#4A4E58', '#FF7A2F'],
    outline: '#14161C',
    art: grid16('tyre', [
      '................',
      '................',
      '......5454......',
      '....44444445....',
      '...4446666445...',
      '..444633116445..',
      '..546331111644..',
      '..446311111644..',
      '..463111111264..',
      '..446111112644..',
      '..546111122644..',
      '..444611226445..',
      '...4446666445...',
      '....44444445....',
      '......5454......',
      '................',
    ]),
  },
];

// ---------------------------------------------------------------- hats

const hats: Omit<Item, 'slot'>[] = [
  // Amountle
  {
    id: 'amountle.gem', game: 'amountle', name: 'Gem band', free: true, colors: ['#E3E7EE', '#9AA3B2', '#FFFFFF'],
    draw: on([
      '...wwaA...',
      '..wwaaaA..',
      '.waaaaaaA.',
      '...aaAA...',
      '3121aA1212',
    ], 0, 2),
  },
  {
    id: 'amountle.crown', game: 'amountle', name: 'Jewelled crown',
    colors: ['#FFD25A', '#D99A1E', '#3FD1C1', '#A6F4EA', '#E5484D', '#FFF1B0', '#FF9EA1'],
    draw: on([
      '6....7....6',
      '1...656...2',
      '16.61112.12',
      '64311511432',
      '22222222222',
    ], 0, 2),
  },
  // Halfsies
  {
    id: 'halfsies.bowl', game: 'halfsies', name: 'Bandana', free: true, colors: [],
    draw: on([
      '...waaaA....',
      '..waawaaA.aA',
      '.waaaaawaAA.',
      'waawaaaawaAA',
    ], 0, 2),
  },
  {
    id: 'halfsies.scale', game: 'halfsies', name: 'Hatchling',
    colors: ['#FFF6E6', '#DCC8A6', '#FFFFFF', '#B08A5A', '#FFF1A0', '#FFD23A', '#2A1B10', '#FF8A2B', '#E0A010'],
    draw: on([
      '...5669...',
      '...67698..',
      '3.319191.2',
      '3141111412',
      '.21122112.',
    ], 0, 2),
  },
  // Stackdle
  {
    id: 'stackdle.cube', game: 'stackdle', name: 'Brick cap', free: true, colors: [],
    draw: on([
      '.wA..wA..wA.',
      'waaaaaaaaaaA',
      'aaaaaaaaaaaA',
      'aaaaaaaaaaAA',
      'AAAAAAAAAAAA',
    ], 0, 2),
  },
  {
    id: 'stackdle.tower', game: 'stackdle', name: 'Block tower',
    colors: ['#FF8FB1', '#D9557F', '#FFB03B', '#D97A12', '#6FA8FF', '#3F6FD0', '#FFD6E2', '#FFE0A0', '#C8DEFF'],
    draw: on([
      '..9556..',
      '..5556..',
      '71128334',
      '11123334',
      '22224444',
    ], 0, 2),
  },
  // Flipsies
  {
    id: 'flipsies.cap', game: 'flipsies', name: 'Bottle cap', free: true, colors: [],
    draw: on([
      '.x.a.a.a.a.A.',
      'xaaaaaaaaaaaA',
      'xaAaAaAaAaAaA',
      'AAAAAAAAAAAAA',
    ], 0, 2),
  },
  {
    id: 'flipsies.landed', game: 'flipsies', name: 'Landed bottle',
    colors: ['#D6F0FD', '#8CCBEF', '#FFFFFF', '#E5484D', '#4A9BD8', '#1E4FA8', '#B8313A'],
    draw: on([
      '....66....',
      '....36....',
      '..311112..',
      '..344447..',
      '..355552..',
    ], 0, 2),
  },
  // Puttsies
  {
    id: 'puttsies.visor', game: 'puttsies', name: 'Golf cap', free: true, colors: [],
    draw: on([
      '....xaaA.....',
      '..xaaaaaaA...',
      '.xaaawaaaaA..',
      'xaaaaaaaaaAAA',
    ], 0, 2),
  },
  {
    id: 'puttsies.flag', game: 'puttsies', name: 'Pin flag',
    colors: ['#E8ECF2', '#E5484D', '#A82A33', '#9BE36B', '#4CAF50', '#2E7D32', '#1C2A1E', '#FF8A8E'],
    draw: on([
      '......18882...',
      '......122223..',
      '..44441444445.',
      '.4555575555556',
    ], 0, 2),
  },
  // Weighsies
  {
    id: 'weighsies.wedge', game: 'weighsies', name: 'Cheese wedge', free: true,
    colors: ['#FFBE3A', '#D9931F', '#B8761A', '#FFE08A'],
    draw: on([
      '.........411',
      '......411111',
      '...411311131',
      '411111111112',
      '222222222222',
    ], 0, 2),
  },
  {
    id: 'weighsies.scale', game: 'weighsies', name: 'Heavyweight belt',
    colors: ['#F2C230', '#B9852A', '#FFF1B0', '#D8343C', '#8A1F26', '#3FA0FF', '#C8ECFF'],
    draw: on([
      '....311112....',
      '44443176124444',
      '55553166125555',
      '....222222....',
    ], 0, 2),
  },
  // Cutsies
  {
    id: 'cutsies.slice', game: 'cutsies', name: 'Kiwi slice', free: true,
    about: 'A round of kiwi worn like a beret. Cutsies is the slicing game.',
    colors: ['#86CF55', '#C9F08F', '#2A1B10', '#F1F7D4', '#B98A5A', '#5FA83A', '#7A5432'],
    draw: on([
      '..555577..',
      '.52311317.',
      '5231441367',
      '.51311367.',
      '..777777..',
    ]),
  },
  {
    id: 'cutsies.chef', game: 'cutsies', name: "Chef's toque",
    about: "A chef's tall white toque, for the one who does the cutting in Cutsies.",
    colors: ['#FFFFFF', '#DCE3EC', '#B9C4D2', '#E5484D', '#A8202F'],
    draw: on([
      '.11.11.12.',
      '1111111122',
      '1111111223',
      '.12121223.',
      '.44444445.',
    ]),
  },
  // Tiltsies
  {
    id: 'tiltsies.ears', game: 'tiltsies', name: 'Hamster ears', free: true,
    colors: ['#EDB57D', '#FFB3A7', '#FFD8A8', '#C98A45'],
    draw: onPair([
      '33.',
      '321',
      '114',
    ], 0),
  },
  {
    id: 'tiltsies.buddy', game: 'tiltsies', name: 'Head hamster',
    about: 'A hamster that naps on your head between runs.',
    colors: ['#EDB57D', '#C98A45', '#FFE7CB', '#FF9AA4', '#2A1B10'],
    draw: on([
      '.11....12.',
      '.14111142.',
      '1151111512',
      '1433443342',
      '1133333322',
    ]),
  },
  // Trackdle
  {
    id: 'trackdle.cap', game: 'trackdle', name: 'Pit cap', free: true,
    colors: ['#23262D', '#FFFFFF'],
    draw: on([
      '....xaaA....',
      '..xaaaaaaA..',
      '..12121212..',
      '..aaaaaaaAAA',
    ]),
  },
  {
    id: 'trackdle.helmet', game: 'trackdle', name: 'Race helmet',
    colors: ['#FF7A2F', '#D65A1C', '#FFFFFF', '#1C2733', '#6FA8D8', '#FFB27A'],
    // A full-face racing helmet pushed up on the head: a shell with a racing
    // stripe, and the visor along its rim with a glint.
    draw: on([
      '...661111...',
      '.6611331112.',
      '.1111331122.',
      '444444455544',
    ]),
  },
  // Bigger third hats, one per game
  {
    id: 'amountle.cluster', game: 'amountle', name: 'Crystal crest',
    colors: ['#B98AF5', '#7A4FD0', '#EBDDFF', '#3FD1C1', '#1F9C90', '#C8FFF7', '#FFD25A', '#D99A1E', '#FFF1B0'],
    draw: on([
      '.....3.....',
      '..6..31..6.',
      '.645.312.45',
      '64453112645',
      '99777777778',
    ], 0, 2),
  },
  {
    id: 'halfsies.helmet', game: 'halfsies', name: 'Saucepan',
    colors: ['#E07B4C', '#A9532E', '#FFB088', '#2B2B33', '#4E4E5A'],
    draw: on([
      '.3331112....',
      '.3111112....',
      '.3111112....',
      '.3111112....',
      '333333332554',
    ], 1, 2),
  },
  {
    id: 'stackdle.ring', game: 'stackdle', name: 'Ring stacker',
    colors: ['#FF5C6A', '#C22E3E', '#FFB03B', '#D97A12', '#7DD87A', '#3E9A4C', '#5C9BFF', '#2F64C8', '#FFE066'],
    draw: on([
      '....99....',
      '...1112...',
      '..333334..',
      '.55555556.',
      '7777777778',
    ]),
  },
  {
    id: 'flipsies.beret', game: 'flipsies', name: 'Diving helmet',
    colors: ['#E8B04A', '#B07A1E', '#FFE08A', '#9FE0FF', '#3E8FD6', '#6B4512'],
    draw: on([
      '....3666....',
      '..33111112..',
      '.3114444112.',
      '611445544116',
      '6.62626262.6',
    ], 0, 2),
  },
  {
    id: 'puttsies.tam', game: 'puttsies', name: 'Tartan tam',
    colors: ['#2E7D4F', '#1F5C38', '#F2C230', '#E5484D', '#5FB07A', '#FF8A8E', '#B8313A'],
    draw: on([
      '.....64.....',
      '...5513552..',
      '.55113111312',
      '333333333332',
      '.1131113112.',
    ], 0, 2),
  },
  {
    id: 'weighsies.dumbbell', game: 'weighsies', name: 'Barbell',
    colors: ['#E5484D', '#A82A33', '#FF8A8E', '#E3E7EE', '#8A93A3'],
    draw: on([
      '31..........12',
      '31..........12',
      '31444444444412',
      '31555555555512',
    ], 0, 2),
  },
  {
    id: 'cutsies.orange', game: 'cutsies', name: 'Orange helmet',
    about: 'Half an orange, scooped out and worn. It still smells great.',
    colors: ['#FF9F2E', '#E07B14', '#FFD08A', '#5CB85C', '#2E7D3A', '#6A4A1E', '#FFF1D6'],
    draw: on([
      '....6445..',
      '..331115..',
      '.33131112.',
      '3131111122',
      '7777777777',
    ]),
  },
  {
    id: 'tiltsies.seed', game: 'tiltsies', name: 'Maze miner',
    about: 'A hard hat with a lamp, for finding the way through the maze in the dark.',
    colors: ['#FFD23A', '#D9A01E', '#FFF1A8', '#8A93A3', '#FFFFFF'],
    draw: on([
      '...31111...',
      '..3144412..',
      '.311454122.',
      '.311444122.',
      '22222222222',
    ]),
  },
  {
    id: 'trackdle.trophy', game: 'trackdle', name: 'Trophy',
    about: "The winner's cup, in a laurel wreath.",
    colors: ['#FFD25A', '#C8901E', '#FFF1B0', '#5CB85C', '#2E7D3A'],
    draw: on([
      '4.33111112.5',
      '43.311112.25',
      '443.3112.255',
      '.44..32..55.',
      '..4422222.5.',
    ]),
  },
  // A fourth hat for every game
  {
    id: 'amountle.coin-stack', game: 'amountle', name: 'Pirate hat',
    colors: ['#3E3852', '#221E30', '#625A80', '#FFD25A', '#C98A1A', '#FFFFFF'],
    draw: on([
      '..3111112..',
      '.316666612.',
      '43162626124',
      '.431666124.',
      '..4444445..',
    ], 0, 2),
  },
  {
    id: 'amountle.gumball-dome', game: 'amountle', name: 'Gumball dome',
    colors: ['#E5484D', '#A8283A', '#FF8A8E', '#FFD25A', '#3FD1C1', '#5C9BFF', '#FFFFFF', '#BFE6F5', '#FF6FC8'],
    draw: on([
      '...7888...',
      '..849568..',
      '.86594548.',
      '3111111112',
      '.21144112.',
    ], 0, 2),
  },
  {
    id: 'halfsies.sandwich', game: 'halfsies', name: 'Melon helmet',
    colors: ['#4FAE5C', '#2E7D3A', '#9EE08A', '#F0435A', '#FFF4E0', '#2A1B10', '#C22E40'],
    draw: on([
      '..3212121..',
      '.321212122.',
      '55555555555',
      '44644464447',
      '74447444677',
    ], 0, 2),
  },
  {
    id: 'halfsies.half-moon', game: 'halfsies', name: 'Half moon helm',
    colors: ['#3A4A6B', '#222C44', '#5E7096', '#FFD25A', '#D99A1E', '#FFF1B0', '#E5484D'],
    draw: on([
      '6....31....4',
      '46..3112..45',
      '.4664774445.',
      '331111111122',
      '222222222222',
    ], 0, 2),
  },
  {
    id: 'stackdle.arch', game: 'stackdle', name: 'Castle keep',
    colors: ['#B5BCC8', '#7E8696', '#E3E7EE', '#E5484D', '#B02A35', '#3A3F4A'],
    draw: on([
      '31.31.31.12',
      '31111411112',
      '31611511612',
      '22222422222',
      '22222222222',
    ], 0, 2),
  },
  {
    id: 'stackdle.hardhat', game: 'stackdle', name: 'Hard hat',
    colors: ['#FFC93A', '#D9921A', '#FFE9A0', '#4A4E5E', '#FFFFFF'],
    draw: on([
      '....3311....',
      '..33111112..',
      '.3114551112.',
      '.3111111112.',
      '322222222222',
    ], 0, 2),
  },
  {
    id: 'flipsies.cup', game: 'flipsies', name: 'Party cup',
    colors: ['#E5484D', '#B83236', '#FFFFFF', '#FF8A8E', '#FF9A3C', '#DDE3EA'],
    draw: on([
      '.....55...',
      '.33333336.',
      '.41111122.',
      '..411122..',
      '..411122..',
    ], 0, 2),
  },
  {
    id: 'flipsies.fin', game: 'flipsies', name: 'Shark fin',
    colors: ['#8FA6BC', '#56708A', '#D4E2EE', '#5CB8F2', '#FFFFFF', '#2F7CC8'],
    draw: on([
      '.......31.....',
      '......3112....',
      '....331112....',
      '54543111112454',
    ], 0, 2),
  },
  {
    id: 'puttsies.argyle', game: 'puttsies', name: 'Argyle bucket',
    colors: ['#F4EDE0', '#C9BFA8', '#3A9466', '#E5484D', '#2E7D4F'],
    draw: on([
      '...113311...',
      '..13441431..',
      '..31331331..',
      '555555555555',
    ], 0, 2),
  },
  {
    id: 'puttsies.crown', game: 'puttsies', name: 'Hole-in-one crown',
    colors: ['#FFD25A', '#D99A1E', '#FFF1A8', '#FFFFFF', '#C9CFDA', '#E5484D', '#3FB56A'],
    draw: on([
      '3....45....1',
      '31..4455..12',
      '311111111112',
      '317161716172',
    ], 0, 2),
  },
  {
    id: 'weighsies.feather', game: 'weighsies', name: 'Viking helm',
    colors: ['#F4E6C8', '#C9A878', '#FFFFFF', '#C9CFDA', '#7E879A', '#F2C230', '#B9852A'],
    draw: on([
      '3............2',
      '31...3444...12',
      '.3113444445122',
      '..6766676667..',
    ], 0, 2),
  },
  {
    id: 'weighsies.laurel', game: 'weighsies', name: 'Gold laurels',
    colors: ['#F2C230', '#B9852A', '#FFF1B0', '#E5484D'],
    draw: on([
      '13.3......3.31',
      '.3131....1312.',
      '..2131..1312..',
      '...22144122...',
    ], 0, 2),
  },
  {
    id: 'cutsies.banana', game: 'cutsies', name: 'Banana split',
    about: 'Three scoops on a split banana, with a cherry on top.',
    colors: ['#FFE066', '#E0B020', '#FFF4E0', '#E8D2B0', '#8A5A3A', '#5E3A1C', '#FF9EBB', '#E06A90', '#E5384D'],
    draw: on([
      '.....99.....',
      '.33.5556.77.',
      '133455566782',
      '111111111122',
    ]),
  },
  {
    id: 'cutsies.kabuto', game: 'cutsies', name: 'Samurai kabuto',
    about: 'A lacquered samurai helmet with golden horns, for the sharpest blade in Cutsies.',
    colors: ['#D8343F', '#8E1B26', '#FFD25A', '#C8901E', '#2B2F38', '#FF7A80'],
    draw: on([
      '3..........4',
      '33..6111..44',
      '.3361111124.',
      '..61133112..',
      '.5252525252.',
    ]),
  },
  {
    id: 'tiltsies.wheel', game: 'tiltsies', name: 'Marble crown',
    about: 'A gold crown set with the three rarest marbles in the maze.',
    colors: ['#FFD25A', '#C8901E', '#FFF1B0', '#5CB8F2', '#2F7CC8', '#FF7AA8', '#C9407A', '#7DD87A', '#3E9A4C'],
    draw: on([
      '.44..66..88.',
      '.45..67..89.',
      '.31..31..12.',
      '331111111122',
      '322222222222',
    ]),
  },
  {
    id: 'tiltsies.ufo', game: 'tiltsies', name: 'Hamster UFO',
    about: 'A hamster at the wheel of its own flying saucer.',
    colors: ['#C9CED8', '#8A93A3', '#F4F7FA', '#BFE8FF', '#EDB57D', '#FFD23A', '#6FA8D8', '#2A1B10'],
    draw: on([
      '...445547...',
      '..44855877..',
      '331111111122',
      '.2626262622.',
    ]),
  },
  {
    id: 'trackdle.goggles', game: 'trackdle', name: 'Vintage racer',
    about: 'A leather racing cap with the goggles pushed up, from when cars had no roofs.',
    colors: ['#8A5A2E', '#5E3A1C', '#B98250', '#C9CED8', '#6FA8D8', '#C4E8FB', '#8A93A3'],
    draw: on([
      '...331111...',
      '..31111112..',
      '.4657114657.',
      '.4557114557.',
      '311777777112',
    ], 0, 2),
  },
  {
    id: 'trackdle.f1', game: 'trackdle', name: 'Formula car',
    about: 'A whole race car, parked on top.',
    colors: ['#E5484D', '#A8202F', '#FF8A8E', '#2B2F38', '#FFFFFF', '#FFD447', '#8A93A3'],
    draw: on([
      '222..66.....',
      '.2311551111.',
      '444111114441',
      '474.....474.',
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
    about: 'A wooden chopping board with a kiwi sliced at each corner.',
    colors: ['#D9A066', '#86CF55', '#2A1B10', '#7A5432', '#F1F7D4', '#BE8650'],
    fill: (x, y) => {
      for (const [kx, ky] of [[2, 2], [13, 13], [13, 2], [2, 13]]) {
        const d2 = (x - kx) ** 2 + (y - ky) ** 2;
        if (d2 === 0) return 5;
        if (d2 === 2) return 3;
        if (d2 <= 4) return 2;
        if (d2 <= 6) return 4;
      }
      // the board's grain
      return (y + (x >> 2)) % 5 === 0 ? 6 : 1;
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

  // A third frame for every game.
  {
    id: 'amountle.beans', game: 'amountle', name: 'Jelly beans',
    colors: ['#FFF4E4', '#FF5C8A', '#FFD447', '#3FD1C1', '#8C7CF0', '#7DD87A'],
    fill: (x, y) => {
      // Each bean is two cells across, in its own flavour.
      const beans = [[1, 1, 2], [12, 1, 4], [6, 0, 6], [0, 5, 5], [14, 6, 3], [1, 10, 4], [13, 11, 2], [3, 14, 3], [9, 14, 5], [12, 14, 6], [0, 13, 6]];
      for (const [bx, by, c] of beans) if (y === by && (x === bx || x === bx + 1)) return c;
      return 1;
    },
  },
  {
    id: 'halfsies.split', game: 'halfsies', name: 'Half and half',
    colors: ['#F6C7AE', '#A9E3DC', '#FFFFFF'],
    fill: (x, y) => (x + y === 15 && x % 2 === 0 ? 3 : x + y < 15 ? 1 : 2),
  },
  {
    id: 'stackdle.blueprint', game: 'stackdle', name: 'Blueprint',
    colors: ['#3A78D8', '#5A92E6', '#CFE2FF'],
    fill: (x, y) => {
      // A block drawn in the top left corner, on the plan's grid.
      if (((x === 1 || x === 4) && y >= 1 && y <= 4) || ((y === 1 || y === 4) && x >= 1 && x <= 4)) return 3;
      return x % 4 === 3 || y % 4 === 3 ? 2 : 1;
    },
  },
  {
    id: 'flipsies.tiles', game: 'flipsies', name: 'Pool tiles',
    colors: ['#9ED8F2', '#86CBEC', '#E9F8FF'],
    fill: (x, y) => (x % 3 === 2 || y % 3 === 2 ? 3 : (Math.floor(x / 3) + Math.floor(y / 3)) % 2 ? 2 : 1),
  },
  {
    id: 'puttsies.green', game: 'puttsies', name: 'Putting green',
    colors: ['#8ED46E', '#7CC45C', '#2B2F38', '#FFFFFF', '#E5484D'],
    fill: (x, y) => {
      // A flag in its hole, top left.
      if (x === 1 && y >= 0 && y <= 3) return 4;
      if ((x === 2 || x === 3) && y === 0) return 5;
      if (x === 2 && y === 1) return 5;
      if ((x === 0 || x === 2) && y === 4) return 3;
      if (x === 1 && y === 4) return 3;
      return Math.floor((x + y) / 3) % 2 ? 2 : 1;
    },
  },
  {
    id: 'weighsies.dial', game: 'weighsies', name: 'Scale dial',
    colors: ['#FFF8E8', '#2B2F38', '#E5484D', '#E8DCC0'],
    fill: (x, y) => {
      const dx = x - 7.5, dy = y - 7.5, d = Math.hypot(dx, dy);
      if (d > 7.6) return 4;
      // The needle points up and right, past the guy's shoulder.
      if (dx > 1 && dy < -1 && Math.abs(dx + dy) < 0.6) return 3;
      // Ticks round the rim, a long one every so often.
      const a = Math.round((Math.atan2(dy, dx) / (2 * Math.PI)) * 24);
      if (d > 6.2 && a % 2 === 0) return 2;
      return 1;
    },
  },
  {
    id: 'cutsies.board', game: 'cutsies', name: 'Cutting board',
    colors: ['#E8C690', '#D9B077', '#B98B52'],
    fill: (x, y) => {
      if ((x === 2 && y === 2) || (x === 13 && y === 12)) return 3;
      return (y + Math.floor(x / 5)) % 4 === 0 ? 2 : 1;
    },
  },
  {
    id: 'tiltsies.bedding', game: 'tiltsies', name: 'Wood shavings',
    colors: ['#F6EBD2', '#E3C997', '#CFAE74'],
    fill: (x, y) => ((x * 5 + y * 7) % 9 === 0 ? 2 : (x * 3 + y * 11) % 13 === 0 || (y >= 13 && (x + y) % 3 === 0) ? 3 : 1),
  },
  {
    id: 'trackdle.kerb', game: 'trackdle', name: 'Kerb',
    colors: ['#5A5F6B', '#E5484D', '#FFFFFF', '#4A4E58'],
    fill: (x, y) => (y <= 1 || y >= 14 ? (Math.floor((x + y) / 2) % 2 ? 2 : 3) : (x * 5 + y * 3) % 7 === 0 ? 4 : 1),
  },
];

// ---------------------------------------------------------------- buddies

/**
 * A pet that sits at the guy's feet, bottom right, in front of everything but
 * the face. Each is a bold shape of its own with a lit side, a shaded side and
 * a face, filling as much of its 6x5 as it can, so it reads at a glance on any
 * guy and any frame.
 */
const buddies: Omit<Item, 'slot'>[] = [
  {
    id: 'amountle.gemling', game: 'amountle', name: 'Gemling', colors: ['#3FD1C1', '#1F9C90', '#C8FFF7', '#137068', '#FFFFFF'],
    art: pet('gemling', [
      '..531.',
      '.33112',
      '.31112',
      '.1o1o2',
      '..124.',
    ]),
  },
  {
    id: 'halfsies.pea', game: 'halfsies', name: 'Toaster', colors: ['#C9D1DC', '#7E8898', '#F2F5F9', '#E8B060', '#B07A30', '#2B2F38'],
    art: pet('toaster', [
      '.4545.',
      '.33332',
      '611112',
      '.1o1o2',
      '.62226',
    ]),
  },
  {
    id: 'stackdle.cubelet', game: 'stackdle', name: 'Cubelet', colors: ['#FFB03B', '#D97A12', '#FFE0A0', '#A85A0A'],
    art: pet('cubelet', [
      '..333.',
      '.33334',
      '.11112',
      '.1o1o2',
      '.22224',
    ]),
  },
  {
    id: 'flipsies.droplet', game: 'flipsies', name: 'Droplet', colors: ['#5CB8F2', '#2F7CC8', '#FFFFFF', '#1E5A9E'],
    art: pet('droplet', [
      '....3.',
      '...312',
      '..3112',
      '.3o1o2',
      '.11224',
    ]),
  },
  {
    id: 'puttsies.tee', game: 'puttsies', name: 'Tee buddy', colors: ['#FFFFFF', '#C9CFDA', '#E8B060', '#B98232'],
    art: pet('tee buddy', [
      '....1.',
      '...112',
      '..1212',
      '.1o1o2',
      '..334.',
    ]),
  },
  {
    id: 'weighsies.mouse', game: 'weighsies', name: 'Mouse', colors: ['#B9C0CE', '#7E879A', '#FF9EBB', '#E3E7EE'],
    art: pet('mouse', [
      '....44',
      '...434',
      '..11o1',
      '.11113',
      '32222.',
    ]),
  },
  {
    id: 'cutsies.seedling', game: 'cutsies', name: 'Seedling',
    about: 'A sprout in a clay pot that follows you around. It came from a kiwi seed.',
    colors: ['#7DD87A', '#3E9A4C', '#E07B4C', '#B05A30', '#F4A77C'],
    art: pet('seedling', [
      '...112',
      '.55554',
      '.3o3o4',
      '.33344',
      '..344.',
    ]),
  },
  {
    id: 'tiltsies.hamlet', game: 'tiltsies', name: 'Hamlet',
    colors: ['#F2B66D', '#C98A45', '#FFF1DE', '#FF9EBB'],
    art: pet('hamlet', [
      '..1.2.',
      '.11112',
      '.1o1o2',
      '.43342',
      '.3322.',
    ]),
  },
  {
    id: 'trackdle.snail', game: 'trackdle', name: 'Turbo snail',
    colors: ['#E5484D', '#A8202F', '#FFD08A', '#9FD18A', '#5FA04A', '#FFFFFF'],
    art: pet('turbo snail', [
      '..1.o4',
      '13314.',
      '162144',
      '.22244',
      '444455',
    ]),
  },

  // More buddies for every game.
  {
    id: 'amountle.jellybean', game: 'amountle', name: 'Gummy bear', colors: ['#FF5C6A', '#B8283A', '#FFB0B6'],
    art: pet('gummy bear', [
      '.3..3.',
      '.31112',
      '311112',
      '.1o1o2',
      '.13332',
    ]),
  },
  {
    id: 'amountle.piglet', game: 'amountle', name: 'Piggy bank', colors: ['#FFA3C0', '#D9658C', '#FFD2E0', '#FFE066', '#D9A21E', '#B8406E'],
    art: pet('piggy bank', [
      '.2.45.',
      '.31112',
      '311112',
      '.1o1o2',
      '.16662',
    ]),
  },
  {
    id: 'amountle.mimic', game: 'amountle', name: 'Mimic chest', colors: ['#B86B32', '#6E3A18', '#E59A55', '#FFD25A', '#C98A1A', '#3A1020', '#FFFFFF'],
    art: pet('mimic chest', [
      '.3112.',
      '.31112',
      '344542',
      '.1o1o2',
      '.76767',
    ]),
  },
  {
    id: 'halfsies.yolk', game: 'halfsies', name: 'Sunny egg', colors: ['#FFFFFF', '#C9D1DC', '#FFC93A', '#E58A12', '#FFF2B8'],
    art: pet('sunny egg', [
      '..111.',
      '.11111',
      '115331',
      '.3o3o4',
      '.13342',
    ]),
  },
  {
    id: 'halfsies.berry', game: 'halfsies', name: 'Strawberry', colors: ['#F0435A', '#A82238', '#FF9AAA', '#5CB85C', '#2E7D3A', '#FFE7A0'],
    art: pet('strawberry', [
      '.4545.',
      '.31112',
      '316162',
      '.1o1o2',
      '..162.',
    ]),
  },
  {
    id: 'halfsies.avo', game: 'halfsies', name: 'Avo', colors: ['#D8EE8A', '#9CCB4A', '#2E5A1E', '#A0602E', '#6A3A18', '#D99060'],
    art: pet('avo', [
      '..233.',
      '.21113',
      '211113',
      '.2o1o3',
      '.26443',
    ]),
  },
  {
    id: 'stackdle.pyramid', game: 'stackdle', name: 'Ziggurat', colors: ['#FF8FB1', '#D9557F', '#FFC9DA', '#FFD25A', '#A83A60'],
    art: pet('ziggurat', [
      '...4..',
      '..312.',
      '.33332',
      '.1o1o2',
      '.25552',
    ]),
  },
  {
    id: 'stackdle.brickling', game: 'stackdle', name: 'Brickling', colors: ['#5C9BFF', '#2F64C8', '#B5D3FF', '#1E3F8A'],
    art: pet('brickling', [
      '.3..3.',
      '.33332',
      '.11112',
      '.1o1o2',
      '.22224',
    ]),
  },
  {
    id: 'stackdle.wobble', game: 'stackdle', name: 'Wobble', colors: ['#7DD87A', '#3E9A4C', '#C6F5B0', '#FFD84A', '#D9A21E', '#FF6F91', '#C93A66'],
    art: pet('wobble', [
      '..67..',
      '.4445.',
      '311112',
      '.1o1o2',
      '.2222.',
    ]),
  },
  {
    id: 'flipsies.shortstack', game: 'flipsies', name: 'Short stack', colors: ['#E8A04E', '#9A5A20', '#FBD79A', '#FFE45C', '#6A300C'],
    art: pet('short stack', [
      '....33',
      '...422',
      '..3333',
      '.1o1o5',
      '222252',
    ]),
  },
  {
    id: 'flipsies.duck', game: 'flipsies', name: 'Rubber duck', colors: ['#FFD84A', '#E0A820', '#FFF1A8', '#FF7A1A'],
    art: pet('rubber duck', [
      '....31',
      '...3o4',
      '...112',
      '311112',
      '.22222',
    ]),
  },
  {
    id: 'flipsies.whale', game: 'flipsies', name: 'Lil whale', colors: ['#5C8FE0', '#2F5FB0', '#9CC2F5', '#E6F3FF', '#7FD8FF'],
    art: pet('lil whale', [
      '...5.5',
      '....5.',
      '..3111',
      '3311o1',
      '.44442',
    ]),
  },
  {
    id: 'puttsies.gopher', game: 'puttsies', name: 'Gopher', colors: ['#B07A4A', '#7A4E2A', '#F2D4A8', '#7ED957', '#3A9466', '#FFFFFF'],
    art: pet('gopher', [
      '....2.',
      '...311',
      '..31o3',
      '.41136',
      '445554',
    ]),
  },
  {
    id: 'puttsies.frog', game: 'puttsies', name: 'Hazard frog', colors: ['#6CC24A', '#3E8E2E', '#C8F59A', '#256B20'],
    art: pet('hazard frog', [
      '...33.',
      '..1o12',
      '.11144',
      '322122',
    ]),
  },
  {
    id: 'puttsies.turtle', game: 'puttsies', name: 'Golf turtle', colors: ['#FFFFFF', '#C9CFDA', '#8A93A3', '#6CC24A', '#3E8E2E'],
    art: pet('golf turtle', [
      '....44',
      '...4o4',
      '..1214',
      '.12124',
      '555555',
    ]),
  },
  {
    id: 'weighsies.cheddar', game: 'weighsies', name: 'Cheddar', colors: ['#FFC94A', '#D98F22', '#FFE38F', '#E3A52E', '#B8761A'],
    art: pet('cheddar', [
      '....31',
      '...311',
      '..3141',
      '.3o1o1',
      '222222',
    ]),
  },
  {
    id: 'weighsies.chick', game: 'weighsies', name: 'Chick', colors: ['#FFE066', '#E8B320', '#FFF6C2', '#FF8A2B', '#C9851A'],
    art: pet('chick', [
      '....3.',
      '...311',
      '..31o4',
      '.31112',
      '..4.4.',
    ]),
  },
  {
    id: 'weighsies.elephant', game: 'weighsies', name: 'Baby elephant', colors: ['#B9C0CE', '#7E879A', '#E3E7EE', '#FFB3C7', '#5E6677'],
    art: pet('baby elephant', [
      '....31',
      '...4o1',
      '..3415',
      '.31115',
      '.2.2.5',
    ]),
  },
  {
    id: 'cutsies.cherries', game: 'cutsies', name: 'Cherries',
    colors: ['#E5384D', '#A8202F', '#FF9AA4', '#4FAE5C', '#2E7D3A'],
    art: pet('cherries', [
      '...45.',
      '..312.',
      '.3o1o2',
      '.11112',
      '31222.',
    ]),
  },
  {
    id: 'cutsies.pineapple', game: 'cutsies', name: 'Pineapple',
    colors: ['#FFC93A', '#D9961E', '#FFE7A0', '#5CB85C', '#2E7D3A'],
    art: pet('pineapple', [
      '...454',
      '..3122',
      '.3o2o2',
      '.12122',
      '..222.',
    ]),
  },
  {
    id: 'cutsies.shadow', game: 'cutsies', name: 'Lil ninja',
    about: 'A tiny ninja who cuts whatever you leave on the board.',
    colors: ['#4A5068', '#262A38', '#7A8098', '#FFE4C2', '#E5484D', '#A8202F'],
    art: pet('lil ninja', [
      '..3116',
      '.55552',
      '14o4o2',
      '.11112',
      '.12.12',
    ]),
  },
  {
    id: 'tiltsies.rolly', game: 'tiltsies', name: 'Rolly',
    colors: ['#A8DDF5', '#4F94C4', '#FFFFFF', '#EDB57D', '#B97A45', '#FF9EBB'],
    art: pet('rolly', [
      '..3112',
      '.34142',
      '31o4o2',
      '.14652',
      '..222.',
    ]),
  },
  {
    id: 'tiltsies.sunflower', game: 'tiltsies', name: 'Sunflower',
    colors: ['#FFD23A', '#E0A61E', '#A86A3A', '#4FAE5C', '#FFF1A8', '#6E4220'],
    art: pet('sunflower', [
      '..5112',
      '.53332',
      '13o3o2',
      '.13662',
      '44122.',
    ]),
  },
  {
    id: 'tiltsies.hedgehog', game: 'tiltsies', name: 'Rollhog',
    about: 'A hedgehog that curls into a ball and rolls the maze with you.',
    colors: ['#A8794E', '#5E3A1C', '#D9AE7E', '#FFE4C2', '#2A1B10'],
    art: pet('rollhog', [
      '..3131',
      '.31312',
      '34o4o2',
      '.44542',
      '.4..4.',
    ]),
  },
  {
    id: 'trackdle.conelet', game: 'trackdle', name: 'Conelet',
    colors: ['#FF7A2F', '#C8501A', '#FFFFFF', '#FFAE73', '#2B2F38'],
    art: pet('conelet', [
      '...41.',
      '..3332',
      '.4o1o2',
      '.33332',
      '555555',
    ]),
  },
  {
    id: 'trackdle.kart', game: 'trackdle', name: 'Go-kart',
    colors: ['#E5484D', '#A8202F', '#E8F4FF', '#2B2F38', '#FF8A8E', '#FFD447'],
    art: pet('go-kart', [
      '..5112',
      '.13332',
      '13o3o2',
      '.61162',
      '44..44',
    ]),
  },
  {
    id: 'trackdle.hare', game: 'trackdle', name: 'Pace hare',
    about: 'The hare the whole field chases, in its racing scarf.',
    colors: ['#C9A27A', '#8E6A44', '#FFB3C1', '#E5484D', '#A8202F', '#F4E6D2'],
    art: pet('pace hare', [
      '...1.2',
      '..1112',
      '.1o1o2',
      '.66612',
      '.4445.',
    ]),
  },
];

// ---------------------------------------------------------------- seasonal

/**
 * Hats that only drop on certain days of the year. A copy keeps the date it
 * dropped, so a 2026 Pumpkin is a different thing from a 2027 one.
 */
const seasonal: Omit<Item, 'slot'>[] = [
  { id: 'club.birthday', game: 'club', name: 'Club birthday', season: { from: '10-12', to: '10-16' }, colors: ['#5FB4FF', '#FFD447', '#FF6FA0'], draw: on([
      '...3...',
      '..121..',
      '..212..',
      '.12121.',
      '2121212',
    ], 0, 2) },
  { id: 'club.pumpkin', game: 'club', name: 'Pumpkin', season: { from: '10-20', to: '11-02' }, colors: ['#FF8A2B', '#D9661A', '#4FAE5C', '#FFB866'], draw: on([
      '...33...',
      '.412214.',
      '41121121',
      '11121121',
      '.222222.',
    ], 0, 2) },
  { id: 'club.snowcap', game: 'club', name: 'Snow cap', season: { from: '12-15', to: '01-06' }, colors: ['#E5484D', '#B83236', '#FFFFFF', '#DCE3EC', '#FF8A8E'], draw: on([
      '....511122.33',
      '..51111111234',
      '.51111111112.',
      '3433343334333',
    ]) },
  { id: 'club.sweetheart', game: 'club', name: 'Sweetheart', season: { from: '02-10', to: '02-16' }, colors: ['#FF5C8A', '#D93A6A', '#FFC2D4'], draw: on([
      '.11..11.',
      '13111112',
      '11111112',
      '.111112.',
      '..1122..',
    ]) },

  // The rest of the year, so every month drops something, and two around the
  // big holidays. A range that runs past New Year wraps (see inSeason).
  { id: 'club.newyear', game: 'club', name: 'New Year top hat', season: { from: '12-29', to: '01-02' }, colors: ['#2B2F38', '#4A4E5E', '#F2C230', '#FF6FA0', '#5FB4FF'], draw: on([
      '...2111111...',
      '...2111111...',
      '...3334333...',
      '.21111111111.',
    ]) },
  { id: 'club.lantern', game: 'club', name: 'Red lantern', season: { from: '01-20', to: '02-12' }, colors: ['#E5363D', '#B02028', '#FFD447', '#FF8A80'], draw: on([
      '...3...',
      '.33333.',
      '4111112',
      '4111112',
      '.33333.',
    ], 0, 2) },
  { id: 'club.shamrock', game: 'club', name: 'Leprechaun hat', season: { from: '03-10', to: '03-18' }, colors: ['#4FBF5C', '#2E8E3E', '#F2C230', '#2B2F38', '#A8EBA8', '#B98A1A'], draw: on([
      '...5111112.55',
      '...5111112.15',
      '...4436344..2',
      '.51111111112.',
    ]) },
  { id: 'club.blossom', game: 'club', name: 'Cherry blossom', season: { from: '03-19', to: '04-14' }, colors: ['#FFB3D1', '#F07AA8', '#FFF4A0', '#FFFFFF', '#5FBF6A'], draw: on([
      '.1.....1.....',
      '434.1.434.1..',
      '.1.434.1.434.',
      '552515525155.',
    ]) },
  { id: 'club.egg', game: 'club', name: 'Painted egg', season: { from: '03-22', to: '04-25' }, colors: ['#B9A3F0', '#8C7CF0', '#FFE066', '#7FD1AE', '#E6DCFF'], draw: on([
      '..51..',
      '.5112.',
      '511112',
      '343434',
      '111112',
    ], 0, 2) },
  { id: 'club.daisy', game: 'club', name: 'Daisy chain', season: { from: '05-01', to: '05-31' }, colors: ['#FFFFFF', '#FFD23A', '#4FAE5C', '#DCE3EC'], draw: on([
      '.1...1...1..',
      '121.121.121.',
      '.1...1...1..',
      '334333433343',
    ]) },
  { id: 'club.sunhat', game: 'club', name: 'Sun hat', season: { from: '06-14', to: '07-20' }, colors: ['#F2D58A', '#D9B060', '#E5484D', '#FFF1C2'], draw: on([
      '....414141....',
      '....333333....',
      '41111111111111',
      '22222222222222',
    ]) },
  { id: 'club.sparkler', game: 'club', name: 'Fireworks', season: { from: '07-01', to: '07-07' }, colors: ['#FFE066', '#FF6B78', '#7FB0FF', '#FFFFFF', '#8A93A3'], draw: on([
      '2..1..3',
      '.2.1.3.',
      '..444..',
      '1444442',
      '..555..',
    ], 0, 2) },
  { id: 'club.icecream', game: 'club', name: 'Ice cream', season: { from: '08-01', to: '08-25' }, colors: ['#FFB3D1', '#F07AA8', '#E8B060', '#B98232', '#FFE3EE'], draw: on([
      '...3...',
      '..343..',
      '.34343.',
      '1111112',
      '5111112',
    ], 0, 2) },
  { id: 'club.maple', game: 'club', name: 'Maple leaf', season: { from: '09-20', to: '11-30' }, colors: ['#E8572E', '#B83A1A', '#FFA05A', '#8A5A32'], draw: on([
      '....1....',
      '1.11311.1',
      '111131111',
      '.1131311.',
      '..2.4.2..',
    ]) },
  { id: 'club.turkey', game: 'club', name: 'Turkey feathers', season: { from: '11-18', to: '11-30' }, colors: ['#E5484D', '#FF9F2E', '#FFD447', '#8A5A32', '#B07444'], draw: on([
      '1.2.3.2.1',
      '121323121',
      '.2133312.',
      '..44544..',
    ]) },
  { id: 'club.antlers', game: 'club', name: 'Reindeer antlers', season: { from: '12-01', to: '12-24' }, colors: ['#A8743F', '#7A5228', '#E5484D', '#4FAE5C', '#C9935A'], draw: on([
      '5.5......5.5',
      '1.1.1..1.1.1',
      '.112....211.',
      '..22434422..',
    ]) },
];

/** The seasonal items that drop on a day (`YYYY-MM-DD` or a Date, read in UTC). */
export function inSeason(day: string | Date): Item[] {
  const md = (typeof day === 'string' ? day : day.toISOString()).slice(5, 10);
  return items.filter(i => i.season && (i.season.from <= i.season.to
    ? md >= i.season.from && md <= i.season.to
    : md >= i.season.from || md <= i.season.to));
}

// ---------------------------------------------------------------- showpieces

/**
 * One per machine: a whole new character, drawn bigger and bolder than the
 * rest, rarer than any other item in its machine (`SHOWPIECE_WEIGHT`), and
 * every copy moves with its own effect (`signature`).
 */
const showpieces: Omit<Item, 'slot'>[] = [
  {
    id: 'amountle.dragon', game: 'amountle', name: 'Dragon', eyes: 8, limb: 2, showpiece: true, signature: 'embers',
    about: 'Guards the jar.',
    colors: ['#3BB273', '#25814F', '#86E3AE', '#FFE29A', '#FFF6DC', '#9B6BE0', '#6A44B0', '#E8C25A', '#FF8A3D'],
    outline: '#123F27',
    art: grid16('dragon', [
      '................',
      '....5......5....',
      '....55....55....',
      '.....311112.....',
      '.66.31111112.66.',
      '.67311111111276.',
      '.66311111111266.',
      '...3111111112...',
      '...3111111112...',
      '...3111111112...',
      '...3114444112...',
      '...3144444412.2.',
      '....24444442.22.',
      '.....222222.....',
      '................',
      '................',
    ]),
  },
  {
    id: 'stackdle.robot', game: 'stackdle', name: 'Robot', eyes: 8, limb: 2, showpiece: true, signature: 'electric',
    about: 'Built one block at a time.',
    colors: ['#B8C4D6', '#7C8AA3', '#E6EEF8', '#FF4D5E', '#4FD1FF', '#FFD447', '#3A4258', '#FFFFFF'],
    outline: '#2A3044',
    art: grid16('robot', [
      '................',
      '.......4........',
      '.......7........',
      '...3333333332...',
      '..731111111127..',
      '..731111111127..',
      '..731111111127..',
      '...3111111112...',
      '...3111111112...',
      '...3111111112...',
      '...2222222222...',
      '...2575645752...',
      '...2222222222...',
      '....77....77....',
      '................',
      '................',
    ]),
  },
  {
    id: 'flipsies.shark', game: 'flipsies', name: 'Shark', eyes: 8, limb: 2, showpiece: true, signature: 'bubbles',
    about: 'Lands every flip.',
    colors: ['#5B8DB8', '#3E6A91', '#9CC4E4', '#F2F7FB', '#2E5272', '#D7E6F2'],
    outline: '#1B3550',
    art: grid16('shark', [
      '................',
      '.......5........',
      '......55........',
      '.....355........',
      '....31111112....',
      '...3111111112...',
      '...3111111112...',
      '..53111111112...',
      '..53111111112...',
      '...3144444412...',
      '.2231444444125..',
      '.22.24444442.55.',
      '.....244442.....',
      '......2222......',
      '................',
      '................',
    ]),
  },
  {
    id: 'weighsies.knight', game: 'weighsies', name: 'Knight', eyes: 8, limb: 2, showpiece: true, signature: 'shimmer',
    about: 'Armour weighs a ton.',
    colors: ['#C9D3E0', '#8A97AB', '#F2F6FB', '#E5484D', '#A82E33', '#FFE6CC', '#FFC93C', '#3A4258'],
    outline: '#272D3D',
    art: grid16('knight', [
      '................',
      '.......44.......',
      '......4554......',
      '....33171112....',
      '...3111711112...',
      '..311117111112..',
      '..316666666612..',
      '..316666666612..',
      '..316666666612..',
      '..316666666612..',
      '..311666666112..',
      '..311666666112..',
      '...2777777772...',
      '....22222222....',
      '................',
      '................',
    ]),
  },
  {
    id: 'tiltsies.astronaut', game: 'tiltsies', name: 'Astronaut', eyes: 8, limb: 1, showpiece: true, signature: 'starlight',
    about: 'Rolls in zero gravity.',
    colors: ['#F4F6FA', '#C3CAD6', '#FFFFFF', '#CFEAFF', '#7FB8E8', '#FF8A3D', '#3A4258', '#E5484D', '#3A6FE0'],
    outline: '#2B3346',
    art: grid16('astronaut', [
      '................',
      '.......8........',
      '.......7........',
      '....33111112....',
      '...3155555512...',
      '..315444444512..',
      '..354344444451..',
      '..354444444451..',
      '..354444444451..',
      '..354444444451..',
      '..315444444512..',
      '..611544445116..',
      '..611191111116..',
      '....22222222....',
      '................',
      '................',
    ]),
  },
  {
    id: 'trackdle.rocket', game: 'trackdle', name: 'Rocket', eyes: 9, showpiece: true, signature: 'embers',
    about: 'Fastest lap ever.',
    colors: ['#F4F6FA', '#C3CAD6', '#FFFFFF', '#E5484D', '#A82E33', '#FF8A3D', '#FFD447', '#3A6FE0', '#FFF3B0'],
    outline: '#3A1418',
    art: grid16('rocket', [
      '................',
      '.......44.......',
      '......4445......',
      '.....444445.....',
      '....31111112....',
      '...3111111112...',
      '...3111111112...',
      '...3111111112...',
      '...3111111112...',
      '...3111111112...',
      '.4.3111111112.5.',
      '.443111111112.5.',
      '.44.31111112..5.',
      '.....676676.....',
      '......6766......',
      '................',
    ]),
  },
  {
    id: 'puttsies.ufo', game: 'puttsies', name: 'UFO', eyes: 7, showpiece: true, signature: 'neon',
    about: 'Hole in one, from orbit.',
    colors: ['#C9F7EA', '#8ED9C6', '#FFFFFF', '#A9B4C8', '#6E7A93', '#E6ECF5', '#FFD447', '#FF7AA8', '#6BE07B'],
    outline: '#283147',
    art: grid16('ufo', [
      '................',
      '................',
      '.....311112.....',
      '....31111112....',
      '...3111111112...',
      '...3111111112...',
      '...3111111112...',
      '...3111111112...',
      '..611111111116..',
      '.66666666666665.',
      '.47448449447445.',
      '.55555555555555.',
      '...5........5...',
      '................',
      '................',
      '................',
    ]),
  },
  {
    id: 'cutsies.ninja', game: 'cutsies', name: 'Ninja', eyes: 9, limb: 4, showpiece: true, signature: 'pulse',
    about: 'Slices before you see it.',
    colors: ['#FFE0C2', '#1A1B2C', '#4A4E6E', '#2B2D42', '#E5484D', '#A82E33', '#C9D3E0'],
    outline: '#0E0F1A',
    art: grid16('ninja', [
      '................',
      '................',
      '.....344442.....',
      '....34444442....',
      '...5555555555...',
      '...666666666656.',
      '...344444444265.',
      '...3111111112.6.',
      '...3111111112...',
      '...3111111112...',
      '...3111111112...',
      '...3411111142...',
      '...3474444442...',
      '....22222222....',
      '................',
      '................',
    ]),
  },
  {
    id: 'halfsies.cyborg', game: 'halfsies', name: 'Cyborg', eyes: 8, limb: 2, showpiece: true, signature: 'holo',
    about: 'Half of you, upgraded.',
    colors: ['#B8C4D6', '#7C8AA3', '#E6EEF8', '#4FD1FF', '#FF4D5E', '#FF4D5E'],
    outline: '#2A3044',
    art: grid16('cyborg', [
      '................',
      '................',
      '................',
      '.....hh#3311....',
      '....h###31111...',
      '...h####3116122.',
      '...#####31111...',
      '...#####31111...',
      '...#####31111...',
      '...#####31111...',
      '...s####31111...',
      '...s####311612..',
      '....ss##31112...',
      '.....sss2222....',
      '................',
      '................',
    ]),
  },
];

/** Every item: each game's skins, then hats, then frames, then buddies, then the seasonal hats. */
const base: Item[] = [
  ...skins.map(i => ({ ...i, slot: 'skin' as const })),
  ...showpieces.map(i => ({ ...i, slot: 'skin' as const })),
  ...hats.map(i => ({ ...i, slot: 'hat' as const })),
  ...frames.map(i => ({ ...i, slot: 'frame' as const })),
  ...buddies.map(i => ({ ...i, slot: 'buddy' as const })),
  ...seasonal.map(i => ({ ...i, slot: 'hat' as const })),
  // Auras belong to no machine: any capsule can be one (see ./auras).
  ...[...AURAS, ...ONE_OF_ONE_AURAS].map(({ id, name, colors }) => ({ id, name, colors, game: 'club' as const, slot: 'aura' as const })),
];

/** Every item: the first lists, each machine's set laid over them (redraws, retirements), then its new items. */
export const items: Item[] = (() => {
  const sets = Object.values(SETS);
  const out = base.map(i => {
    const set = sets.find(st => st.redraw[i.id] || st.retire.includes(i.id));
    return set ? { ...i, ...set.redraw[i.id], ...(set.retire.includes(i.id) ? { retired: true } : {}) } : i;
  });
  return [...out, ...sets.flatMap(st => st.add)];
})();

const byId = new Map(items.map(i => [i.id, i]));

export function itemById(id: string | undefined): Item | undefined {
  return id ? byId.get(id) : undefined;
}

/** Each machine's own colour: its set symbol on a card, as the site's machines are painted. */
export const SET_COLORS: Record<GameId, string> = { amountle: '#ff7eb6', halfsies: '#f2b066', stackdle: '#ffd447', flipsies: '#5fb4ff', puttsies: '#74d97c', weighsies: '#a98bff', cutsies: '#ff6b6b', tiltsies: '#4fd6c4', trackdle: '#ff8a3d', pets: '#e48cf2' };

/** Every machine, in the order they joined: a new one goes on the end, so nothing else moves. */
export const GAMES: GameId[] = [
  'amountle', 'halfsies', 'stackdle', 'flipsies', 'puttsies',
  'weighsies', 'cutsies', 'tiltsies', 'trackdle', 'pets',
];

/** What a machine is called: its game's name, or the Pet shop. */
export const machineName = (game: GameId): string => (game === 'pets' ? 'Pet shop' : game[0].toUpperCase() + game.slice(1));

/** How often a showpiece comes out of its machine, against 1 for every other item. */
export const SHOWPIECE_WEIGHT = 0.5;

/** An item's weight in its machine's draw: none once it's retired. */
export const itemWeight = (item: Item): number => (item.retired ? 0 : item.showpiece ? SHOWPIECE_WEIGHT : 1);

/** A game's items: what its machine holds now. Retired ones are left out; `itemById` still finds them. */
export function gameItems(game: ItemGame): Item[] {
  return items.filter(i => i.game === game && !i.retired);
}

/** The hat every player wears in a game until they put something else on. */
export function freeItem(game: GameId): Item {
  return items.find(i => i.game === game && i.free && !i.retired) ?? items.find(i => i.game === game && i.free)!;
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
  for (const slot of ['skin', 'hat', 'frame', 'buddy', 'aura'] as const) {
    const item = itemById(config[slot]);
    if (!item) continue;
    // A painted hat or buddy wears its paint (./paints).
    const paint = (PAINTABLE as readonly string[]).includes(slot) ? config.owned?.[slot as 'hat' | 'buddy']?.paint : undefined;
    painted(item.colors, paint).forEach((hex, i) => { colors[LAYER[slot] + i] = hex; });
    if (slot === 'skin') {
      if (item.outline) colors[T.OUTLINE] = item.outline;
      // The face is drawn on the skin now, so its ink follows what it sits on. A costume that opens
      // round the guy's own face (nothing but his own colours where his eyes go) keeps his own ink: a
      // dark guy's eyes stay light in a white hood. A face on the skin's material takes ink for that.
      const e = item.eyes ?? 0;
      const own = !!item.art && item.art.slice(e - 2, e + 2).every(row => row.slice(4, 12).every(t => t > 0 && t < LOCAL));
      if (!own) {
        const dark = '#15111C', light = '#FFF1D6';
        colors[T.EYE] = colors[T.MOUTH] = contrast(dark, item.colors[0]) >= contrast(light, item.colors[0]) ? dark : light;
      }
    }
  }
  return { name: palette.name, colors };
}
