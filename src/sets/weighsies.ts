import { grid16, on, pet, sit, type MachineSet } from '../item-art';
import { stamp } from '../parts/art';
import type { Canvas } from '../parts/canvas';

/** A hat stood on the crown as drawn, rather than pulled down round the head like a cap. */
const perch = (rows: string[], sink = 1) => {
  const s = stamp(rows);
  return (c: Canvas) => sit(c, s, 0, sink);
};

/**
 * Weighsies's machine: the animals and the heavy things the scale weighs (a
 * panda, a penguin, a capybara, a T. rex, the pharaohs' pyramid, the Statue of
 * Liberty), and a kettlebell.
 */
export const set: MachineSet = {
  add: [
    // ------------------------------------------------------------ skins
    {
      id: 'weighsies.gold-bar', game: 'weighsies', slot: 'skin', name: 'Panda onesie', eyes: 9, limb: 4,
      colors: ['#F7F6F2', '#C8CAD2', '#FFFFFF', '#2B2D35', '#4B4F5C'],
      outline: '#1A1B22',
      // The guy zipped into a giant panda suit: black ears on the hood, black paws.
      art: grid16('panda onesie', [
        '................',
        '................',
        '..545......545..',
        '..444311112444..',
        '..311111111112..',
        '..311111111112..',
        '..311h#####112..',
        '..31h#######12..',
        '..31########12..',
        '..31########12..',
        '..31#######s12..',
        '..311ssssss112..',
        '...4111111114...',
        '....44222244....',
        '................',
        '................',
      ]),
    },
    {
      id: 'weighsies.basketball', game: 'weighsies', slot: 'skin', name: 'Penguin onesie', eyes: 9, limb: 3,
      colors: ['#F4F6FA', '#C9D0DE', '#2B3040', '#1A1E2A', '#4C556E', '#FF9A2E', '#FFD25A'],
      outline: '#141824',
      // The guy in an emperor penguin suit: the hood's own little eyes and beak up top, the yellow at
      // his cheeks, a white bib.
      art: grid16('penguin onesie', [
        '................',
        '................',
        '.....553333.....',
        '....53133134....',
        '...3333663334...',
        '..333333333334..',
        '..333h#####334..',
        '..33h#######34..',
        '..33########34..',
        '..37########74..',
        '..37#######s74..',
        '..331ssssss134..',
        '...3111111124...',
        '....31222214....',
        '................',
        '................',
      ]),
    },
    {
      id: 'weighsies.piano', game: 'weighsies', slot: 'skin', name: 'Capybara', eyes: 9, limb: 2,
      colors: ['#C48A57', '#94603A', '#DDAA78', '#6E4426', '#FFA62E', '#E07A12', '#5BAE4A', '#FFD08A'],
      outline: '#4A2C16',
      // A round capybara, an orange balanced on his head the way they wear them in the hot springs.
      art: grid16('capybara', [
        '................',
        '......85577.....',
        '.....855556.....',
        '...44.5566.44...',
        '...3311111112...',
        '..331111111112..',
        '..311111111112..',
        '..311111111122..',
        '..311111111112..',
        '..311111111112..',
        '..211111111122..',
        '..311111111122..',
        '...2111111122...',
        '....22222222....',
        '................',
        '................',
      ]),
    },
    {
      id: 'weighsies.kitchen-scale', game: 'weighsies', slot: 'skin', name: 'T. rex onesie', eyes: 8, limb: 1, showpiece: true, signature: 'pulse',
      about: 'Seven tonnes of costume.',
      colors: ['#6CC86A', '#3F9A4E', '#A6E890', '#FFFFFF', '#FFC93A', '#2B2F38', '#D7F5C2'],
      outline: '#1C3A22',
      // The guy in a dinosaur suit: a spike on the hood, its eyes up top, and his face looking out
      // of its jaws.
      art: grid16('t. rex onesie', [
        '................',
        '.......52.......',
        '....33152112....',
        '...3461111642...',
        '..311111111112..',
        '..341414141412..',
        '..31h#######12..',
        '..31########12..',
        '..31########12..',
        '..31#######s12..',
        '..31ssssssss12..',
        '..314141414142..',
        '...3777777772...',
        '....22222222....',
        '................',
        '................',
      ]),
    },

    // ------------------------------------------------------------ hats
    {
      id: 'weighsies.scale-pan', game: 'weighsies', slot: 'hat', name: 'Bear ears', free: true,
      colors: ['#9A6440', '#6E4426', '#C48A5E', '#F2A6B4'],
      // A headband with round brown bear ears, for a day out at the zoo.
      draw: on([
        '.31......31.',
        '3412....3412',
        '1122....1122',
        '222222222222',
      ], 0, 1),
    },
    {
      id: 'weighsies.apple', game: 'weighsies', slot: 'hat', name: 'Apple shot',
      colors: ['#E5383D', '#A8202A', '#FF8A8A', '#4FAE5C', '#C89A5E', '#6A3A18', '#B9C2CF', '#FFFFFF', '#E5484D'],
      // William Tell's apple on his head, the arrow clean through it.
      draw: perch([
        '......64.....',
        '.....3112..7.',
        '8955531125577',
        '98...1122..7.',
      ], 1),
    },
    {
      id: 'weighsies.topknot', game: 'weighsies', slot: 'hat', name: 'Sumo topknot',
      colors: ['#22242C', '#14151A', '#4A4E5E', '#F2E6D0'],
      // The black topknot on the crown, tied round with a white cord.
      draw: on([
        '.3312.',
        '311112',
        '.2112.',
        '..44..',
        '..12..',
      ], 0, 2),
    },
    {
      id: 'weighsies.pyramid', game: 'weighsies', slot: 'hat', name: 'Pharaoh',
      colors: ['#2F5FD0', '#1E3E96', '#5C8BF0', '#F2C230', '#C8901E', '#FFE07A', '#E5484D'],
      // The striped headcloth from the pyramids, a gold cobra rearing at the front.
      draw: on([
        '......6......',
        '..141454141..',
        '.41414641414.',
        '4444447444444',
      ], 0, 1),
    },
    {
      id: 'weighsies.eiffel', game: 'weighsies', slot: 'hat', name: 'Liberty crown',
      colors: ['#7FCDB4', '#4E9C86', '#B8F0DC', '#2F6E5E'],
      // The Statue of Liberty's crown in her green copper: its rays and the band of windows.
      draw: on([
        '3..3..3..3..3',
        '.1.1..1..1.1.',
        '..311111112..',
        '.31414141412.',
      ], 0, 1),
    },

    // ------------------------------------------------------------ frames
    {
      id: 'weighsies.pennies', game: 'weighsies', slot: 'frame', name: 'Pennies',
      colors: ['#FBF3E4', '#D9946A', '#EDB892', '#B87450'],
      // Copper coins in rows on cream, each lit at its top left.
      fill: (x, y) => {
        const row = Math.floor(y / 6), cx = x - (row % 2) * 3, dx = ((cx % 6) + 6) % 6, dy = y % 6;
        if (dx === 2 && dy === 2) return 3;
        if ((dx === 2 && dy === 1) || (dx === 1 && dy === 2)) return 3;
        if ((dx === 3 && dy === 2) || (dx === 2 && dy === 3)) return 2;
        if (dx === 3 && dy === 3) return 4;
        if ((dx === 3 && dy === 1) || (dx === 1 && dy === 3)) return 2;
        return 1;
      },
    },
    {
      id: 'weighsies.blocks', game: 'weighsies', slot: 'frame', name: 'Gold bars',
      colors: ['#FBF5E4', '#F6DD94', '#FCEFC2', '#E9C76B'],
      // A wall of gold bars stacked like bricks, each lit along its top.
      fill: (x, y) => {
        const band = Math.floor(y / 3), col = (x + (band % 2) * 3) % 6, ry = y % 3;
        if (col === 5) return 1;
        return ry === 0 ? 3 : ry === 1 ? 2 : 4;
      },
    },

    // ------------------------------------------------------------ buddies
    {
      id: 'weighsies.cat', game: 'weighsies', slot: 'buddy', name: 'House cat',
      colors: ['#F29A4A', '#C46A24', '#FFE0B8', '#FFC98A', '#E9838A'],
      // A ginger tabby's face, ears up, a pink nose.
      art: pet('house cat', [
        '1...1.',
        '11211.',
        '1o1o1.',
        '13531.',
        '22222.',
      ]),
    },
    {
      id: 'weighsies.whale', game: 'weighsies', slot: 'buddy', name: 'Lil whale',
      colors: ['#5DBEFC', '#2F8FD0', '#A8DEFF', '#E6F6FF', '#BFEAFF'],
      // Blowing a spout, its tail flicked up behind.
      art: pet('lil whale', [
        '.5.5..',
        '..5..1',
        '.31112',
        '31o112',
        '444422',
      ]),
    },
    {
      id: 'weighsies.trex', game: 'weighsies', slot: 'buddy', name: 'Hamster',
      colors: ['#F2B06A', '#C9813E', '#FFF1DC', '#F59AB0', '#FFFFFF'],
      // A golden hamster: pink ears, a cream face and a pink nose.
      art: pet('hamster', [
        '.4..4.',
        '.1111.',
        '1o11o1',
        '334433',
        '.3333.',
      ]),
    },
    {
      id: 'weighsies.pigeon', game: 'weighsies', slot: 'buddy', name: 'Pigeon',
      colors: ['#A9B0BC', '#7A8292', '#D0D5DD', '#7A6EA8', '#4FB59A', '#E86A6A', '#FF9A3A', '#2F3440', '#E8D8C8'],
      // Plump and grey, its neck shot with purple and green, pink feet.
      art: pet('pigeon', [
        '..33..',
        '.9o11.',
        '.34512',
        '311122',
        '..6.62',
      ]),
    },
  ],

  retire: [
    'weighsies.cheese', 'weighsies.anvil', 'weighsies.flour', 'weighsies.knight',
    'weighsies.wedge', 'weighsies.scale', 'weighsies.dumbbell', 'weighsies.feather', 'weighsies.laurel',
    'weighsies.ruler', 'weighsies.dial',
    'weighsies.mouse', 'weighsies.cheddar', 'weighsies.chick', 'weighsies.elephant',
  ],

  redraw: {
    'weighsies.kettlebell': {
      colors: ['#3D74E0', '#2752B0', '#7FA3F0', '#2B2F38', '#5A6070', '#343844', '#8A93A3'],
      outline: '#101A38',
      // A blue cast-iron ball under a thick, open handle.
      art: grid16('kettlebell', [
        '................',
        '.....775555.....',
        '....75....66....',
        '....55....66....',
        '....55....66....',
        '....55111166....',
        '....11111111....',
        '...3111111112...',
        '..331111111122..',
        '..311111111112..',
        '..111111111112..',
        '..111111111112..',
        '...1111111112...',
        '...1211111122...',
        '....22222222....',
        '................',
      ]),
      eyes: 9,
    },
  },
};
