import { grid16, on, pet, type MachineSet } from '../item-art';

/**
 * Stackdle's machine: its real pieces in their own colours, and the climb
 * from the valley up past the clouds into space.
 */
export const set: MachineSet = {
  add: [
    {
      id: 'stackdle.wedge', game: 'stackdle', slot: 'skin', name: 'Wedge', eyes: 11, limb: 2,
      colors: ['#5FE0B4', '#34A985', '#A8F7DC', '#24785E', '#FFD447', '#FFF1A8'],
      outline: '#17533F',
      art: grid16('wedge', [
        '................',
        '................',
        '.33.............',
        '.3133...........',
        '.315133.........',
        '.356511333......',
        '.31511111133....',
        '.3111111111133..',
        '.311h######s132.',
        '.311########112.',
        '.311########112.',
        '.311########112.',
        '.311s######s112.',
        '.3111s####s1112.',
        '.22222222222224.',
        '................',
      ]),
    },
    {
      id: 'stackdle.keystone', game: 'stackdle', slot: 'skin', name: 'Keystone', eyes: 9, limb: 2,
      colors: ['#F88F7B', '#D9705C', '#FFBFAF', '#B85D4A', '#FFD447', '#FFF1A8'],
      outline: '#6E2A1C',
      art: grid16('keystone', [
        '................',
        '................',
        '.33333333333332.',
        '.31111155111112.',
        '.31111566511112.',
        '.31111155111112.',
        '..31h######s12..',
        '..31########12..',
        '..31########12..',
        '...3########2...',
        '...3s######s2...',
        '...31s####s12...',
        '....31111112....',
        '....22222224....',
        '................',
        '................',
      ]),
    },
    {
      id: 'stackdle.arch-piece', game: 'stackdle', slot: 'skin', name: 'Arch', eyes: 8,
      // The guy's own legs stand in the arch's gap.
      colors: ['#F6C768', '#DBAD4A', '#FFE3A0', '#9E7E2D', '#F88F7B', '#D9705C'],
      outline: '#5E4A12',
      art: grid16('arch', [
        '................',
        '................',
        '.....335533.....',
        '...3311561122...',
        '..311444444112..',
        '.3114######4112.',
        '.314h######s412.',
        '.314########412.',
        '.314########412.',
        '.314########412.',
        '.314########412.',
        '.314########412.',
        '.314s######s412.',
        '.224.ss..ss.422.',
        '................',
        '................',
      ]),
    },
    {
      id: 'stackdle.big-l', game: 'stackdle', slot: 'skin', name: 'Big L', eyes: 10,
      colors: ['#3A82FF', '#1F5FD6', '#8DB8FF', '#123F9C'],
      outline: '#0B2A6E',
      art: grid16('big l', [
        '................',
        '................',
        '.3333332........',
        '.3111112........',
        '.3111112........',
        '.3111112........',
        '.3111112........',
        '.3111112........',
        '.31111113333332.',
        '.31111111111112.',
        '.31111111111112.',
        '.31111111111112.',
        '.31111111111112.',
        '.22222222222224.',
        '................',
        '................',
      ]),
    },
    {
      id: 'stackdle.sky-tower', game: 'stackdle', slot: 'skin', name: 'Astronaut', eyes: 7, limb: 1,
      showpiece: true, signature: 'starlight',
      about: 'Stacked past the clouds.',
      // suit, suit shade, suit light, collar, patch, button, button, glass glint, gold
      colors: ['#F4F6FA', '#B9C3D6', '#FFFFFF', '#7E8AA3', '#FF8A3D', '#2F7BFF', '#E5484D', '#DDF2FF', '#F5C33B'],
      outline: '#27304A',
      art: grid16('astronaut', [
        '................',
        '....33111122....',
        '...318#####12...',
        '..318#######12..',
        '.318#########12.',
        '.31###########2.',
        '.31###########2.',
        '.31###########2.',
        '.31s#########s2.',
        '..31ss#####ss2..',
        '..444444444444..',
        '..315116711122..',
        '..311111111122..',
        '..311111111122..',
        '...2222..2222...',
        '................',
      ]),
    },
    {
      id: 'stackdle.little-block', game: 'stackdle', slot: 'hat', name: 'Little block', free: true,
      // A toy block, lit on top, with a star on its face.
      colors: ['#5E83EF', '#3F5FC0', '#9DB6FF', '#FFD447', '#D9A21E', '#2E4796'],
      draw: on([
        '.333332',
        '1114126',
        '1444526',
        '1154126',
        '2222226',
      ], 0, 2),
    },
    {
      id: 'stackdle.crescent', game: 'stackdle', slot: 'hat', name: 'Battlement',
      // The battlement piece worn as a castle crown, in its own gold.
      colors: ['#E8B448', '#B07A1E', '#FFDB8A', '#7A5212'],
      draw: on([
        '33.33.33.33',
        '13.13.13.12',
        '11311111312',
        '22222222222',
      ]),
    },
    {
      id: 'stackdle.bolt', game: 'stackdle', slot: 'hat', name: 'Hard hat',
      // A builder's helmet, for a tower going up.
      colors: ['#FFC93A', '#D9961A', '#FFE58A', '#E8AE20', '#A86A0A'],
      draw: on([
        '....3443....',
        '..33114111..',
        '.3111141111.',
        '222222222222',
      ]),
    },
    {
      id: 'stackdle.clouds', game: 'stackdle', slot: 'hat', name: 'Cloud nine',
      // One fat cloud from the top of the climb, the sun coming up behind it.
      colors: ['#FFFFFF', '#C9DAF0', '#F2F7FD', '#FFD447', '#FFB03B', '#9DB6DA'],
      draw: on([
        '..33..454.',
        '.311331454',
        '3111111112',
        '..622226..',
      ]),
    },
    {
      id: 'stackdle.stairs', game: 'stackdle', slot: 'buddy', name: 'Lil yeti',
      // From the snowy top of the climb: white fur, a blue face, two horns and a tuft between them.
      colors: ['#E4EDF9', '#93A9CB', '#FFFFFF', '#7FB8EE', '#3F74B0', '#E8B86A'],
      art: pet('lil yeti', [
        '.6.3.6',
        '.13331',
        '.1o4o1',
        '314441',
        '.21.12',
      ]),
    },
    {
      id: 'stackdle.penguin', game: 'stackdle', slot: 'buddy', name: 'Lil star',
      // A star from past the clouds, come down to walk with you.
      colors: ['#FFD447', '#D9A21E', '#FFF1A8', '#FF9AAA', '#B07A10'],
      art: pet('lil star', [
        '..31..',
        '331112',
        '.o11o.',
        '.1112.',
        '12..12',
      ]),
    },
    {
      id: 'stackdle.valley', game: 'stackdle', slot: 'frame', name: 'Valley sky',
      colors: ['#DBE8F8', '#CDE1F7', '#BCD7F6', '#A9CDF5', '#FFFFFF', '#EEF4FC'],
      fill: (x, y) => {
        const tx = x % 16, ty = y % 16;
        if (ty === 2 && tx >= 2 && tx <= 3) return 5;
        if (ty === 3 && tx >= 1 && tx <= 5) return tx === 5 ? 6 : 5;
        return Math.floor(ty / 4) + 1;
      },
    },
    {
      id: 'stackdle.ruler', game: 'stackdle', slot: 'frame', name: 'Height ruler',
      // A yellow tape measure up the side of the wall, a long tick every metre.
      colors: ['#EEF3FA', '#FFD447', '#E0A81E', '#2B2F3A', '#DDE6F2'],
      fill: (x, y) => {
        const tx = x % 16, ty = y % 16;
        if (tx <= 2) {
          if (ty % 8 === 0 && tx <= 2) return 4;
          if (ty % 2 === 0 && tx === 0) return 4;
          return tx === 2 ? 3 : 2;
        }
        return ty % 8 === 0 ? 5 : 1;
      },
    },
    {
      id: 'stackdle.space', game: 'stackdle', slot: 'frame', name: 'Space',
      colors: ['#0A1531', '#FFF6C8', '#8FA3D9'],
      fill: (x, y) => {
        const tx = x % 16, ty = y % 16;
        if (tx === 2 && ty === 2) return 2;
        if (tx === 14 && ty === 13) return 3;
        return 1;
      },
    },
  ],
  retire: [
    'stackdle.block', 'stackdle.triangle', 'stackdle.brick', 'stackdle.stack', 'stackdle.robot',
    'stackdle.cube', 'stackdle.ring', 'stackdle.arch', 'stackdle.hardhat',
    'stackdle.toybox', 'stackdle.bricks', 'stackdle.blueprint',
    'stackdle.pyramid', 'stackdle.brickling',
  ],
  redraw: {
    'stackdle.tower': {
      draw: on([
        '.9556.',
        '.5566.',
        '711834',
        '122344',
      ], 0, 2),
    },
    'stackdle.cubelet': {
      name: 'Cubelet',
      colors: ['#FFB03B', '#D97A12', '#FFE0A0', '#A85A0A', '#FFF4D6'],
      // A little cube on its toes: lit top, shaded side.
      art: pet('cubelet', [
        '.33334',
        '311124',
        '1o1o24',
        '111124',
        '.4..4.',
      ]),
    },
    'stackdle.wobble': {
      name: 'Wobble',
      // A pudding that wobbles like a tall tower, caramel running down.
      colors: ['#FFE7A8', '#E8C070', '#FFF6D6', '#B8652A', '#E8954A', '#E6ECF2', '#B8C2CE'],
      art: pet('wobble', [
        '.5445.',
        '354442',
        '1o11o2',
        '311112',
        '676676',
      ]),
    },
  },
};
