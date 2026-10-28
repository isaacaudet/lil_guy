import { grid16, on, pet, sit, type MachineSet } from '../item-art';
import { stamp } from '../parts/art';
import type { Canvas } from '../parts/canvas';

/** A hat that lies on top of the head as drawn, rather than pulled down round it like a cap. */
const perch = (rows: string[], sink = 1) => {
  const s = stamp(rows);
  return (c: Canvas) => sit(c, s, 0, sink);
};

/**
 * Puttsies's machine: the golfer and the balls you earn (the golf ball, the
 * eight ball), and the household holes you putt through (the quilt, the toy
 * train, the magic trick, the sleeping cat, the snail shell, the sprinkles).
 */
export const set: MachineSet = {
  add: [
    // ------------------------------------------------------------ skins
    {
      id: 'puttsies.eight-ball', game: 'puttsies', slot: 'skin', name: 'Eight ball hoodie', eyes: 9, limb: 3,
      colors: ['#F7F4EA', '#D9D3C4', '#2A2D36', '#15171C', '#4C5262', '#9AA2B8'],
      outline: '#0E0F13',
      // The guy in a black hoodie with the eight ball's white spot on the hood, its lining round his face.
      art: grid16('eight ball hoodie', [
        '................',
        '.....533334.....',
        '....53333114....',
        '...5333314114...',
        '..533333141234..',
        '..533666666334..',
        '..536hh####634..',
        '.536h######s634.',
        '.56h########s64.',
        '.56##########64.',
        '.56#########s64.',
        '.536s######s634.',
        '..536ssssss634..',
        '..533666666334..',
        '...4444444444...',
        '................',
      ]),
    },
    {
      id: 'puttsies.train', game: 'puttsies', slot: 'skin', name: 'Engine driver', eyes: 8, limb: 5, showpiece: true, signature: 'embers',
      about: 'Drives the Sunday boss.',
      colors: ['#E8EEF8', '#3C5FA8', '#28407A', '#E5484D', '#4C7BD0', '#2F5AA6'],
      outline: '#2A1A30',
      // The guy who drives the toy train: a striped engineer's cap, a red neckerchief, denim overalls.
      art: grid16('engine driver', [
        '................',
        '.....212121.....',
        '....21212121....',
        '...2121212121...',
        '..333333333333..',
        '..h##########s..',
        '..h##########s..',
        '..###########s..',
        '..###########s..',
        '..###########s..',
        '..##########ss..',
        '..554444444455..',
        '...5515555155...',
        '....66666666....',
        '................',
        '................',
      ]),
    },

    // ------------------------------------------------------------ hats
    {
      id: 'puttsies.top-hat', game: 'puttsies', slot: 'hat', name: 'Magic top hat',
      colors: ['#2B2F38', '#1A1D24', '#4A5060', '#C9364A', '#FFFFFF', '#FFB3C7'],
      // The magician's black top hat, a white rabbit's ears poking out of it.
      draw: perch([
        '..56..56..',
        '..311112..',
        '..311112..',
        '..444444..',
        '3111111112',
      ], 2),
    },
    {
      id: 'puttsies.cat', game: 'puttsies', slot: 'hat', name: 'Sleeping cat',
      colors: ['#E08A3C', '#B5612A', '#F2B07A', '#9C4318', '#FFF0DC', '#3A2A22', '#E9838A'],
      // The ginger cat from the bedroom hole, curled up asleep on top of his head: ears up, eyes shut, a striped back.
      draw: perch([
        '.1..1..3331.',
        '11111.314412',
        '161611331412',
        '557511111112',
      ], 1),
    },
    {
      id: 'puttsies.snail', game: 'puttsies', slot: 'hat', name: 'Snail',
      colors: ['#FF8A6E', '#D9604A', '#FFC2B0', '#A8402F', '#E8D2B0', '#C2A882', '#2B2F38'],
      // A snail out for a slow walk across his head: a coral spiral shell, its eyes up on their stalks.
      draw: perch([
        '..3311...7.7',
        '.314412..5.5',
        '.143142.555.',
        '655555555556',
      ], 1),
    },

    // ------------------------------------------------------------ frames
    {
      id: 'puttsies.picnic', game: 'puttsies', slot: 'frame', name: 'Picnic check',
      colors: ['#FFF7F2', '#F5BDB7', '#E58E86'],
      // A red gingham picnic blanket.
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
      id: 'puttsies.cup-flag', game: 'puttsies', slot: 'buddy', name: 'Gopher',
      colors: ['#B07A4A', '#7A4E2A', '#F2D4A8', '#FFFFFF', '#2A2420', '#7ED957', '#4CAF50', '#E9838A'],
      // The gopher who lives in the cup, popping out of the hole to see who's putting.
      art: pet('gopher', [
        '.2....2.',
        '.211112.',
        '.1o11o2.',
        '.833382.',
        '.135312.',
        '.134412.',
        '67666676',
        '.767767.',
      ]),
    },
    {
      id: 'puttsies.donut', game: 'puttsies', slot: 'buddy', name: 'Sprinkles',
      colors: ['#FF9EC4', '#E06A98', '#FFE066', '#6FC3FF', '#FFFFFF', '#E3A35E', '#B87634'],
      // A pink-iced donut with sprinkles, peeking over its icing.
      art: pet('sprinkles', [
        '..5311..',
        '.141135.',
        '11311412',
        '11o11o12',
        '66111166',
        '66666667',
        '.667777.',
      ]),
    },
    {
      id: 'puttsies.windup', game: 'puttsies', slot: 'buddy', name: 'Wind-up mouse',
      // grey, shade, light, pink, brass, brass shade
      colors: ['#AEB6C6', '#77819A', '#E6EAF1', '#FF8FB0', '#E0B040', '#9A7420'],
      // A grey toy mouse: round pink-lined ears, a pink nose, and the brass key sticking out of its side.
      art: pet('wind-up mouse', [
        '33..33..',
        '34..43..',
        '311112..',
        '1o11o2.5',
        '11441265',
        '311122.5',
        '.2..2...',
      ]),
    },
    {
      id: 'puttsies.blocks', game: 'puttsies', slot: 'buddy', name: 'Toy blocks',
      // red, red shade, blue, blue shade, yellow, yellow shade, red light, blue light, yellow light
      colors: ['#E5484D', '#B83236', '#4C8DF6', '#2F64C8', '#FFD447', '#D9A21E', '#FF8A8E', '#8FB8FF', '#FFF0A0'],
      // Red and blue side by side, yellow on top.
      art: pet('toy blocks', [
        '..99955.',
        '..9o5o6.',
        '..95556.',
        '..56666.',
        '77718883',
        '71128334',
        '71128334',
        '12224444',
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
    'puttsies.ball': {
      eyes: 9, limb: 2,
      colors: ['#FAFAF6', '#D3D6DE', '#FFFFFF', '#D6DAE2', '#B8BDC9'],
      outline: '#4A4E5A',
      // A round, dimpled golf ball, glossy on top.
      art: grid16('golf ball', [
        '................',
        '................',
        '.....331112.....',
        '....33141412....',
        '...3314114142...',
        '..314141414142..',
        '..341111111142..',
        '..311111111112..',
        '..341111111142..',
        '..311111111112..',
        '..341111111142..',
        '..314111111422..',
        '...2414141422...',
        '....22222222....',
        '................',
        '................',
      ]),
    },
    'puttsies.windmill': {
      name: 'Golfer', eyes: 8, limb: 5,
      colors: ['#F2E6C8', '#9C8A6E', '#6E5E48', '#C2B092', '#3F8F5A'],
      outline: '#2E2438',
      // The guy dressed for the links: a tweed flat cap, an argyle sweater.
      art: grid16('golfer', [
        '................',
        '................',
        '....44222223....',
        '...4242424233...',
        '..3333333333333.',
        '..h##########s..',
        '..h##########s..',
        '..###########s..',
        '..###########s..',
        '..###########s..',
        '..##########ss..',
        '..515151515151..',
        '...5151515151...',
        '....51515151....',
        '................',
        '................',
      ]),
    },
    'puttsies.visor': {
      // A golf cap in his own colours, a white badge on the front, the bill out to one side.
      draw: on([
        '....xaaA......',
        '..xaaawaaA....',
        '.xaaaaaaaaA...',
        'xaaaaaaaaaAAAA',
      ], 0, 2),
    },
    'puttsies.crown': {
      colors: ['#FFD25A', '#D99A1E', '#FFF1A8', '#FFFFFF', '#C9CFDA', '#E5484D', '#3FB56A'],
      // A gold crown for an ace, the golf ball set on its middle point, rubies round the band.
      draw: on([
        '.3...44...3.',
        '.13.3455.12.',
        '311111111112',
        '216161716162',
      ], 0, 2),
    },
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
