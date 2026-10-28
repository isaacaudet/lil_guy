import { grid16, on, onPair, pet, type MachineSet } from '../item-art';

/**
 * Tiltsies' machine: its own hamsters (Biscuit, Mochi, Pebble, Custard) and
 * the balls they roll in, the pieces on the course and the seeds on it.
 * Colours follow the game's hamster.ts and its course.
 */
export const set: MachineSet = {
  add: [
    // ---------------------------------------------------------------- skins
    // Every skin is a guy in costume: his own face (and colour) looks out of
    // the suit, and his arms and feet come out of its sleeves.
    {
      id: 'tiltsies.biscuit', game: 'tiltsies', slot: 'skin', name: 'Biscuit hoodie', eyes: 9, limb: 1,
      about: 'The golden classic.',
      // coat, coat shade, coat light, inner ear, cream, cream shade
      colors: ['#E9B88A', '#C98A55', '#F6D2AE', '#FF9AA4', '#FFF1DE', '#EBD3B4'],
      outline: '#5A3418',
      art: grid16('biscuit hoodie', [
        '................',
        '................',
        '...33......32...',
        '..3443....3442..',
        '..344311113442..',
        '..311111111112..',
        '..31h######s12..',
        '..1h########s2..',
        '..1##########2..',
        '..1##########2..',
        '..2#########s2..',
        '..25s######s52..',
        '...2555555552...',
        '....22666622....',
        '................',
        '................',
      ]),
    },
    {
      id: 'tiltsies.candy', game: 'tiltsies', slot: 'skin', name: 'Mochi hoodie', eyes: 9, limb: 1,
      about: 'Snow white, with a bow.',
      // fur, fur shade, white, inner ear, bow, bow knot, bow light
      colors: ['#FBF6EF', '#E3D6C6', '#FFFFFF', '#F1C9C9', '#E8483B', '#B8302A', '#FF8A80'],
      outline: '#7A5A48',
      art: grid16('mochi hoodie', [
        '................',
        '................',
        '...33.....55.55.',
        '..3443....57675.',
        '..3443111155155.',
        '..311111111112..',
        '..31h######s12..',
        '..1h########s2..',
        '..1##########2..',
        '..1##########2..',
        '..2#########s2..',
        '..23s######s32..',
        '...2333333332...',
        '....22222222....',
        '................',
        '................',
      ]),
    },
    {
      id: 'tiltsies.starry', game: 'tiltsies', slot: 'skin', name: 'Starfall pyjamas', eyes: 9, limb: 1,
      // navy, navy shade, navy light, star, pompom, cuff
      colors: ['#3A4A8C', '#2A3466', '#5A6CB8', '#FFC93A', '#FFF4D6', '#DDE6FF'],
      outline: '#161C3A',
      art: grid16('starfall pyjamas', [
        '................',
        '......331112....',
        '.....3111112255.',
        '....31111111255.',
        '...3114111142...',
        '..311111111412..',
        '..31h######s12..',
        '..1h########s2..',
        '..1##########2..',
        '..1##########2..',
        '..2#########s2..',
        '..26s######s62..',
        '..216666666612..',
        '...2242224222...',
        '................',
        '................',
      ]),
    },
    {
      id: 'tiltsies.golden', game: 'tiltsies', slot: 'skin', name: 'Golden seed', eyes: 9, limb: 1, showpiece: true, signature: 'shimmer',
      about: 'The rare seed on a course, worn.',
      // gold, gold shade, gold light, pale stripe
      colors: ['#F2B530', '#C98A12', '#FFE07A', '#FFF3C0'],
      outline: '#6A4508',
      art: grid16('golden seed', [
        '................',
        '.......32.......',
        '......3312......',
        '.....313112.....',
        '....34131142....',
        '...3141311412...',
        '...3141111412...',
        '..311h#####112..',
        '..31h#######12..',
        '..31#######s12..',
        '..21#######s12..',
        '..211#####s112..',
        '..211411114112..',
        '...2222222222...',
        '................',
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
      // leaf, leaf shade, leaf light, stem
      colors: ['#6CC24A', '#3E8A2E', '#B4EA8A', '#5A9A3A'],
      draw: on([
        '.33...11.',
        '3333.1112',
        '.3334112.',
        '....4....',
        '....4....',
      ]),
    },
    {
      id: 'tiltsies.daisy', game: 'tiltsies', slot: 'hat', name: 'Daisy crown',
      // petal, petal shade, centre, centre shade, leaf, leaf shade
      colors: ['#FFFFFF', '#DCE3EA', '#FFC93A', '#E0A010', '#6CC24A', '#3E8A2E'],
      draw: on([
        '.1....1....1.',
        '131..131..131',
        '.1.55.1.55.1.',
        '6555555555556',
      ]),
    },

    // ---------------------------------------------------------------- frames
    {
      id: 'tiltsies.tiles', game: 'tiltsies', slot: 'frame', name: 'Course tiles',
      // cream tile, green tile, the gap between them, a tile's lit corner
      colors: ['#F4EBD6', '#C6E0AE', '#9DB487', '#FFFBF0'],
      // A course's floor: square tiles in a checker, a gap round each, lit at the top left.
      fill: (x, y) => {
        const tx = x % 4, ty = y % 4;
        if (tx === 3 || ty === 3) return 3;
        if (tx === 0 && ty === 0) return 4;
        return (Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? 2 : 1;
      },
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
      id: 'tiltsies.sunseed', game: 'tiltsies', slot: 'buddy', name: 'Pocket hamster',
      // coat, shade, light, cheek, cream, seed, seed stripe
      colors: ['#E9B88A', '#B97C48', '#F6D2AE', '#FF9AA4', '#FFF1DE', '#3A3530', '#A8A096'],
      // Round ears, rosy cheeks and a sunflower seed held up in both paws.
      art: pet('pocket hamster', [
        '.22.22',
        '.21112',
        '.1o1o1',
        '.45754',
        '..565.',
      ]),
    },
    {
      id: 'tiltsies.bumper', game: 'tiltsies', slot: 'buddy', name: 'Ladybug',
      // red, red shade, red light, black, white
      colors: ['#E8392B', '#A8231A', '#FF7A6E', '#2B2F38', '#FFFFFF'],
      art: pet('ladybug', [
        '.5445.',
        '311412',
        '141412',
        '311142',
        '.1122.',
      ]),
    },
    {
      id: 'tiltsies.spring', game: 'tiltsies', slot: 'buddy', name: 'Springy',
      about: 'Every trampoline’s best friend.',
      // green, shade, light, belly, cheek
      colors: ['#7CCB5A', '#4E9A3A', '#B4EA8A', '#E8F5C8', '#FF9AA4'],
      art: pet('springy', [
        '3o..o3',
        '311112',
        '511115',
        '144441',
        '22..22',
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
    'tiltsies.ball': {
      eyes: 9,
      // rim, glass, glint, rim shade
      colors: ['#BFE2F2', '#EAF6FD', '#FFFFFF', '#8CC7E5'],
      outline: '#4E7A92',
      art: grid16('hamster ball', [
        '................',
        '......1111......',
        '....11332211....',
        '...1322222221...',
        '..132222222224..',
        '..122hh####224..',
        '.122h#######224.',
        '.12h#########24.',
        '.12##########24.',
        '.12##########24.',
        '..1#########s4..',
        '..1########ss4..',
        '...1s######s4...',
        '....44ssss44....',
        '......4444......',
        '................',
      ]),
    },
    'tiltsies.ears': {
      draw: onPair([
        '33.',
        '321',
        '321',
        '114',
      ], 0),
    },
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
