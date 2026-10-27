import { grid16, on, pet, type MachineSet } from '../item-art';

/**
 * Stackdle's machine: its real pieces in their own colours, and the climb
 * from the valley up past the clouds into space.
 */
export const set: MachineSet = {
  add: [
    {
      id: 'stackdle.wedge', game: 'stackdle', slot: 'skin', name: 'Wedge', eyes: 11,
      colors: ['#5FE0B4', '#34A985', '#A8F7DC', '#24785E'],
      outline: '#17533F',
      art: grid16('wedge', [
        '................',
        '................',
        '...3............',
        '..331...........',
        '.33111..........',
        '.311111.........',
        '.3111111........',
        '.31111111.......',
        '.311111111......',
        '.31111111112....',
        '.311111111112...',
        '.3111111111112..',
        '.31111111111124.',
        '.11111111111124.',
        '.22222222222244.',
        '................',
      ]),
    },
    {
      id: 'stackdle.keystone', game: 'stackdle', slot: 'skin', name: 'Keystone', eyes: 8,
      colors: ['#F88F7B', '#D9705C', '#FFBFAF', '#B85D4A'],
      outline: '#6E2A1C',
      art: grid16('keystone', [
        '................',
        '................',
        '................',
        '....33333333....',
        '....31111114....',
        '...3111111114...',
        '...3111111114...',
        '...3111111114...',
        '..311111111114..',
        '..311111111114..',
        '..311111111114..',
        '.31111111111114.',
        '.11111111111114.',
        '.22222222222224.',
        '................',
        '................',
      ]),
    },
    {
      id: 'stackdle.arch-piece', game: 'stackdle', slot: 'skin', name: 'Arch', eyes: 7,
      // The guy's own legs stand in the arch's gap.
      colors: ['#F6C768', '#DBAD4A', '#FFE3A0', '#9E7E2D'],
      outline: '#5E4A12',
      art: grid16('arch', [
        '................',
        '................',
        '.....333333.....',
        '...3311111122...',
        '..311111111112..',
        '.31111111111112.',
        '.31111111111112.',
        '.31111111111112.',
        '.31111111111112.',
        '.31111111111112.',
        '.31111111111112.',
        '.31111#..#11112.',
        '.3111.#..#.1112.',
        '.2224.s..s.4224.',
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
      id: 'stackdle.sky-tower', game: 'stackdle', slot: 'skin', name: 'Sky tower', eyes: 8,
      showpiece: true, signature: 'starlight',
      about: 'Stacked past the clouds.',
      colors: ['#FBD123', '#D9A80E', '#FFE98A', '#FA7158', '#C94E3A', '#1B2A5E', '#FFF6C8', '#2F7BFF', '#5EE4AC'],
      outline: '#0E1636',
      art: grid16('sky tower', [
        '................',
        '......67........',
        '.....6666.......',
        '....667666.9....',
        '...766666.999...',
        '..33333333333...',
        '..11111111112...',
        '..11111111112...',
        '..11111111112...',
        '..22222222222...',
        '.888444444445...',
        '.888555555555...',
        '.88888888888888.',
        '.88888888888888.',
        '................',
        '................',
      ]),
    },
    {
      id: 'stackdle.little-block', game: 'stackdle', slot: 'hat', name: 'Little block', free: true,
      colors: ['#8ED68A', '#5A9E5E', '#C4EDBF'],
      draw: on([
        '333332',
        '111112',
        '111112',
        '111112',
        '222222',
      ], 0, 2),
    },
    {
      id: 'stackdle.crescent', game: 'stackdle', slot: 'hat', name: 'Balanced diamond',
      colors: ['#668ACB', '#45649E', '#A9C2EE'],
      // The diamond piece stood on its point on the head, the way it has to be balanced in a tower.
      draw: on([
        '..331..',
        '.33112.',
        '3311122',
        '..312..',
        '...2...',
      ], 0, 1),
    },
    {
      id: 'stackdle.bolt', game: 'stackdle', slot: 'hat', name: 'Bolt piece',
      colors: ['#B890F8', '#7453B2', '#DCC6FF'],
      // Laid flat across the head: a foot down at one end, a step up at the other.
      draw: on([
        '.......331',
        '.......112',
        '3333333112',
        '1111111222',
        '122.......',
      ], 0, 1),
    },
    {
      id: 'stackdle.clouds', game: 'stackdle', slot: 'hat', name: 'Cloud ring',
      colors: ['#F4F8FD', '#BFD3EC', '#FFFFFF'],
      draw: on([
        '..33....33..',
        '.3113..3113.',
        '311113311112',
        '.2222222222.',
      ], 0, 2),
    },
    {
      id: 'stackdle.stairs', game: 'stackdle', slot: 'buddy', name: 'Stairs',
      colors: ['#F6C768', '#9E7E2D', '#FFE3A0'],
      art: pet('stairs', [
        '33....',
        '12....',
        '1233..',
        '1112..',
        '111133',
      ]),
    },
    {
      id: 'stackdle.penguin', game: 'stackdle', slot: 'buddy', name: 'Little penguin',
      colors: ['#2B2F3A', '#15181F', '#FFFFFF', '#D6DCE6', '#FF9A2E', '#D9701A'],
      art: pet('little penguin', [
        '.1111.',
        '13o3o1',
        '133531',
        '133341',
        '55..55',
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
      colors: ['#F3EFE6', '#DCD3C2'],
      fill: (x, y) => {
        const tx = x % 16, ty = y % 16;
        if (ty === 0 && tx <= 3) return 2;
        if (ty % 4 === 0 && tx <= 1) return 2;
        return 1;
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
    'stackdle.cubelet': { name: 'Block' },
    'stackdle.wobble': {
      name: 'Ball',
      colors: ['#F49AB4', '#C9607E', '#FFD6E2', '#FFF6E6', '#E8D3B4', '#9E3F5C'],
      art: pet('ball', [
        '..331.',
        '633112',
        '.44445',
        '61o1o2',
        '..122.',
      ]),
    },
  },
};
