import { grid16, on, pet, type MachineSet } from '../item-art';

/**
 * Puttsies's machine: the balls you earn (the golf ball, the eight ball) and
 * the household holes you putt through (the quilt, the windmill, the toy
 * train, the sleeping cat, the snail shell, the sprinkles).
 */
export const set: MachineSet = {
  add: [
    // ------------------------------------------------------------ skins
    {
      id: 'puttsies.eight-ball', game: 'puttsies', slot: 'skin', name: 'Eight ball', eyes: 11,
      colors: ['#2A2D36', '#15171C', '#4C5262', '#F7F4EA', '#D9D3C4', '#1E2028'],
      outline: '#0E0F13',
      // The white disc with its 8 up top, the face under it.
      art: grid16('eight ball', [
        '................',
        '.....111111.....',
        '....11444111....',
        '...1346664111...',
        '..131464641112..',
        '.11314666411122.',
        '.13114646411122.',
        '.11114666411112.',
        '.11111444111112.',
        '.11111111111122.',
        '.11111111111122.',
        '..221111111122..',
        '...2211111122...',
        '....22211222....',
        '.....222222.....',
        '................',
      ]),
    },
    {
      id: 'puttsies.train', game: 'puttsies', slot: 'skin', name: 'Toy train', eyes: 9, showpiece: true, signature: 'embers',
      about: 'The Sunday boss.',
      colors: ['#E5484D', '#B83236', '#FF8A8A', '#2B2F38', '#8A93A3', '#F2C230', '#FFF1C2'],
      outline: '#3A1418',
      // A red engine side on, running right: the cab and its window behind,
      // the boiler with its dome and chimney, black wheels underneath.
      art: grid16('toy train', [
        '................',
        '.........4444...',
        '.444444...44....',
        '..3112....44....',
        '..3772..6644....',
        '..377233333335..',
        '..311211111115..',
        '..311111111115..',
        '..311111111115..',
        '..3111111111154.',
        '..3111111111154.',
        '..311111111115..',
        '.44444444444444.',
        '..454..454.454..',
        '...4....4...4...',
        '................',
      ]),
    },

    // ------------------------------------------------------------ hats
    {
      id: 'puttsies.top-hat', game: 'puttsies', slot: 'hat', name: 'Magic top hat',
      colors: ['#2B2F38', '#1A1D24', '#4A5060', '#C9364A', '#FFFFFF'],
      // A black top hat with a red band, its wand leant on it, white tip up.
      draw: on([
        '....3112.5..',
        '....3112.5..',
        '....31121...',
        '....44441...',
        '.3111111112.',
      ]),
    },
    {
      id: 'puttsies.cat', game: 'puttsies', slot: 'hat', name: 'Sleeping cat',
      colors: ['#E08A3C', '#B5612A', '#F2B07A', '#9C4318', '#FFF0DC', '#3A2A22', '#E9838A'],
      // The ginger cat from the bedroom hole, curled up asleep: ears, shut
      // eyes, a striped back and her tail wrapped round the front.
      draw: on([
        '1...1.......',
        '11111333....',
        '161611414.2.',
        '11711141412.',
        '.5111111122.',
      ]),
    },
    {
      id: 'puttsies.snail', game: 'puttsies', slot: 'hat', name: 'Snail shell',
      colors: ['#FF8A6E', '#D9604A', '#FFC2B0', '#A8402F', '#C2B79C', '#948A70', '#2B2F38'],
      // A snail on the head: a coral shell with its spiral, out to its feelers.
      draw: on([
        '.3112...7.7.',
        '314412..5.5.',
        '141342..555.',
        '1444125555..',
        '655555555556',
      ]),
    },

    // ------------------------------------------------------------ frames
    {
      id: 'puttsies.picnic', game: 'puttsies', slot: 'frame', name: 'Picnic check',
      colors: ['#FFF6F2', '#F6D2CE', '#EBADA7'],
      fill: (x, y) => (Math.floor(x / 2) % 2) + (Math.floor(y / 2) % 2) + 1,
    },
    {
      id: 'puttsies.dimples', game: 'puttsies', slot: 'frame', name: 'Dimples',
      colors: ['#F6F1E6', '#D8CFBD', '#FFFFFF'],
      // A golf ball up close: a dimple every few cells, each row of them set over by half.
      fill: (x, y) => {
        const dimple = (dx: number, dy: number) => (y - dy) % 4 === 1 && (x - dx + ((y - dy) % 8 === 1 ? 0 : 2)) % 4 === 1;
        return dimple(0, 0) ? 2 : dimple(1, 1) ? 3 : 1;
      },
    },

    // ------------------------------------------------------------ buddies
    {
      id: 'puttsies.cup-flag', game: 'puttsies', slot: 'buddy', name: 'Flag in the cup',
      colors: ['#FF6B5E', '#D9483C', '#FFF3DC', '#22252C', '#6E7685', '#7CC46A'],
      art: pet('flag in the cup', [
        '..3111',
        '..312.',
        '..3...',
        '6.3.66',
        '654445',
      ]),
    },
    {
      id: 'puttsies.donut', game: 'puttsies', slot: 'buddy', name: 'Sprinkles donut',
      colors: ['#FF9EC4', '#E06A98', '#FFE066', '#6FC3FF', '#FFFFFF', '#E3A35E', '#B87634'],
      art: pet('sprinkles donut', [
        '..113.',
        '.14115',
        '311.12',
        '613112',
        '.6677.',
      ]),
    },
    {
      id: 'puttsies.windup', game: 'puttsies', slot: 'buddy', name: 'Wind-up mouse',
      colors: ['#B9C0CE', '#7E879A', '#E3E7EE', '#FF9EBB', '#E0B040', '#9A7420'],
      // Facing left: a big round ear, a pink nose and the brass key in its back.
      art: pet('wind-up mouse', [
        '..33..',
        '.3443.',
        '.31115',
        '1o1116',
        '41.2..',
      ]),
    },
    {
      id: 'puttsies.blocks', game: 'puttsies', slot: 'buddy', name: 'Toy blocks',
      colors: ['#E5484D', '#B83236', '#4C8DF6', '#2F64C8', '#FFD447', '#D9A21E'],
      // Red and blue side by side, yellow on top.
      art: pet('toy blocks', [
        '..556.',
        '..556.',
        '112334',
        '112334',
        '222444',
      ]),
    },
  ],

  retire: [
    'puttsies.bag', 'puttsies.ufo',
    'puttsies.flag', 'puttsies.tam', 'puttsies.argyle',
    'puttsies.fairway', 'puttsies.green',
    'puttsies.tee', 'puttsies.gopher', 'puttsies.frog', 'puttsies.turtle',
  ],

  redraw: {
    'puttsies.pillow': {
      colors: ['#F7B7B0', '#B9E3A8', '#B3D4F5', '#FBE3A1', '#E59A92', '#94C985', '#8DB8E6', '#E9C979'],
      outline: '#6E3E3A',
      // Four patches sewn together, plump in the middle, a tuft at each corner.
      art: grid16('quilt pillow', [
        '................',
        '................',
        '..5.11112222.6..',
        '...1111122226...',
        '..111111222226..',
        '..111111222226..',
        '..111111222226..',
        '..111111222226..',
        '..333333444448..',
        '..333333444448..',
        '..333333444448..',
        '..333333444448..',
        '...7333344448...',
        '..7.77778888.8..',
        '................',
        '................',
      ]),
    },
  },
};
