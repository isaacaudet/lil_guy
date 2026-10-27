import { grid16, on, pet, type MachineSet } from '../item-art';

/**
 * Tiltsies' machine: its own hamsters (Biscuit, Mochi, Pebble, Custard) and
 * the balls they roll in, the pieces on the course and the seeds on it.
 * Colours follow the game's hamster.ts and its course.
 */
export const set: MachineSet = {
  add: [
    // ---------------------------------------------------------------- skins
    {
      id: 'tiltsies.biscuit', game: 'tiltsies', slot: 'skin', name: 'Biscuit', eyes: 8, limb: 2,
      about: 'The golden classic, the hamster everyone starts with.',
      // coat, coat shade, coat light, inner ear, cream, cream shade
      colors: ['#E9B88A', '#C98A55', '#F6D2AE', '#FF9AA4', '#FFF1DE', '#EBD3B4'],
      outline: '#5A3418',
      art: grid16('biscuit', [
        '................',
        '................',
        '...22......22...',
        '..2442....2442..',
        '..243111111342..',
        '..311111111112..',
        '.31111111111112.',
        '.31111111111112.',
        '.31111111111112.',
        '.31115555551112.',
        '.31155555555112.',
        '.21155555555112.',
        '..215555555512..',
        '...2266666622...',
        '................',
        '................',
      ]),
    },
    {
      id: 'tiltsies.candy', game: 'tiltsies', slot: 'skin', name: 'Candy ball', eyes: 8,
      // stripe, white, glint, rim shade
      colors: ['#FF9FB0', '#FFF1F3', '#FFFFFF', '#E06F86'],
      outline: '#9A3048',
      art: grid16('candy ball', [
        '................',
        '................',
        '.....312221.....',
        '....33222111....',
        '...3332211122...',
        '..333221112221..',
        '..122211122214..',
        '..222111222114..',
        '..221112221114..',
        '..211122211124..',
        '..111222111224..',
        '...1222111224...',
        '....22111224....',
        '.....144444.....',
        '................',
        '................',
      ]),
    },
    {
      id: 'tiltsies.starry', game: 'tiltsies', slot: 'skin', name: 'Starry ball', eyes: 8,
      // glass, glass shade, glint, -, seam, star
      colors: ['#BFE2FF', '#8CC7F5', '#F4FAFF', '#D4ECFF', '#2A5B86', '#FFC93A'],
      outline: '#2A5B86',
      art: grid16('starry ball', [
        '................',
        '................',
        '.....611111.....',
        '....66611116....',
        '...3361111666...',
        '..333111111611..',
        '..111111111112..',
        '..111111111112..',
        '..511111111112..',
        '..111111111162..',
        '..161111111666..',
        '...6611111116...',
        '....11111112....',
        '.....122222.....',
        '................',
        '................',
      ]),
    },
    {
      id: 'tiltsies.golden', game: 'tiltsies', slot: 'skin', name: 'Golden seed', eyes: 10, showpiece: true, signature: 'shimmer',
      about: 'The rare seed on a course, in gold.',
      // gold, gold shade, gold light, pale stripe
      colors: ['#F2B530', '#C98A12', '#FFE07A', '#FFF3C0'],
      outline: '#6A4508',
      art: grid16('golden seed', [
        '................',
        '.......34.......',
        '......3114......',
        '......3114......',
        '.....314114.....',
        '.....314114.....',
        '....31141142....',
        '....31141142....',
        '...3111111112...',
        '..311111111112..',
        '..311111111112..',
        '..311111111112..',
        '..311111111112..',
        '...2111111112...',
        '....22222222....',
        '................',
      ]),
    },

    // ---------------------------------------------------------------- hats
    {
      id: 'tiltsies.bow', game: 'tiltsies', slot: 'hat', name: 'Mochi’s bow',
      colors: ['#E8483B', '#B8302A', '#FF8A80', '#8A1E18'],
      draw: on([
        '11...11',
        '1311131',
        '1114111',
        '12.4.21',
        '..2.2..',
      ], -3),
    },
    {
      id: 'tiltsies.sprout', game: 'tiltsies', slot: 'hat', name: 'Pebble’s sprout',
      colors: ['#6CC24A', '#3E8A2E', '#B4EA8A', '#5A9A3A'],
      draw: on([
        '33...12',
        '3314122',
        '.11412.',
        '...4...',
        '...4...',
      ]),
    },
    {
      id: 'tiltsies.daisy', game: 'tiltsies', slot: 'hat', name: 'Custard’s daisy',
      colors: ['#FFFFFF', '#DCE3EA', '#FFC93A', '#E0A010'],
      draw: on([
        '.1.1.',
        '11311',
        '.343.',
        '11411',
        '.2.2.',
      ], 3),
    },

    // ---------------------------------------------------------------- frames
    {
      id: 'tiltsies.tiles', game: 'tiltsies', slot: 'frame', name: 'Course tiles',
      colors: ['#F4EBD6', '#DDEBCB'],
      fill: (x, y) => ((Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? 2 : 1),
    },
    {
      id: 'tiltsies.sky', game: 'tiltsies', slot: 'frame', name: 'Cloudy sky',
      colors: ['#BFE6FF', '#EAF7FF', '#D6EFFF'],
      fill: (x, y) => {
        // One soft cloud up on the left: three puffs on a flat foot, shaded underneath.
        const puffs: [number, number, number][] = [[1.5, 3.6, 1.6], [3.8, 2.6, 2.1], [6.2, 3.4, 1.5]];
        const inside = (cx: number, cy: number, r: number) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
        if (y <= 4 && puffs.some(([cx, cy, r]) => inside(cx, cy, r))) return y === 4 ? 3 : 2;
        return 1;
      },
    },
    {
      id: 'tiltsies.trail', game: 'tiltsies', slot: 'frame', name: 'Seed trail',
      colors: ['#F6EFDF', '#8A7A68', '#D9CDB8'],
      fill: (x, y) => {
        // Seeds lying at a slant, two cells each: a dark end and a pale tip up and to the right.
        const k = (x + 3 * y) % 10;
        return k === 0 ? 2 : k === 8 ? 3 : 1;
      },
    },

    // ---------------------------------------------------------------- buddies
    {
      id: 'tiltsies.sunseed', game: 'tiltsies', slot: 'buddy', name: 'Sunflower seed',
      colors: ['#3A3530', '#6B635A', '#E8DCC0'],
      art: pet('sunflower seed', [
        '.111..',
        '13331.',
        '111111',
        '13331.',
        '.111..',
      ]),
    },
    {
      id: 'tiltsies.bumper', game: 'tiltsies', slot: 'buddy', name: 'Bumper',
      colors: ['#E8392B', '#A8231A', '#FF7A6E', '#FFFFFF', '#DDE3EA'],
      art: pet('bumper', [
        '.3311.',
        '311112',
        '444445',
        '311112',
        '.2222.',
      ]),
    },
    {
      id: 'tiltsies.spring', game: 'tiltsies', slot: 'buddy', name: 'Spring',
      // coil, coil shade, plate, plate shade
      colors: ['#FF8A3D', '#B85A1C', '#F4EBD6', '#C9BC9C'],
      art: pet('spring', [
        '333333',
        '.4444.',
        '..11..',
        '.1..1.',
        '..11..',
      ]),
    },
    {
      id: 'tiltsies.ghost', game: 'tiltsies', slot: 'buddy', name: 'Ghost',
      about: 'Your best run, rolling along beside you.',
      // glass rim, glass, faint hamster, glint
      colors: ['#9DB8D6', '#EEF5FD', '#D8C0A8', '#FFFFFF'],
      art: pet('ghost', [
        '.1241.',
        '132231',
        '133331',
        '233332',
        '.1221.',
      ]),
    },
  ],
  retire: [
    'tiltsies.hamster', 'tiltsies.marble', 'tiltsies.acorn', 'tiltsies.astronaut',
    'tiltsies.seed', 'tiltsies.wheel', 'tiltsies.ufo',
    'tiltsies.maze', 'tiltsies.spiral', 'tiltsies.bedding',
    'tiltsies.hamlet', 'tiltsies.rolly', 'tiltsies.sunflower', 'tiltsies.hedgehog',
  ],
  redraw: {
    'tiltsies.buddy': {
      colors: ['#E9B88A', '#C98A55', '#FFF1DE', '#FF9AA4', '#2A1B10'],
      draw: on([
        '.24....42.',
        '.11111112.',
        '1151111512',
        '1113443122',
        '.33333332.',
      ]),
    },
  },
};
