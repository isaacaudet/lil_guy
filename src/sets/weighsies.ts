import { grid16, on, pet, type MachineSet } from '../item-art';

/**
 * Weighsies's machine: the scale itself, and the things it weighs (a gold
 * bar, a basketball, a kettlebell, a grand piano, an apple, the Great
 * Pyramid, the Eiffel Tower, a cat, a whale, a T. rex, a pigeon).
 */
export const set: MachineSet = {
  add: [
    // ------------------------------------------------------------ skins
    {
      id: 'weighsies.gold-bar', game: 'weighsies', slot: 'skin', name: 'Gold bar', eyes: 9,
      colors: ['#F2C230', '#C8901E', '#FFE07A', '#FFFFFF', '#E0A92A', '#FFD54A'],
      outline: '#7A5212',
      // An ingot from the front and a little above: its light top face, the
      // front widening down to the bench.
      art: grid16('gold bar', [
        '................',
        '................',
        '................',
        '................',
        '....33333333....',
        '...3333433333...',
        '...6666666666...',
        '..311111111112..',
        '..311111111112..',
        '..311111111112..',
        '.31111111111112.',
        '.31111111111112.',
        '.22222222222222.',
        '................',
        '................',
        '................',
      ]),
    },
    {
      id: 'weighsies.basketball', game: 'weighsies', slot: 'skin', name: 'Basketball', eyes: 9,
      colors: ['#F07A2E', '#C85A1A', '#FFA466', '#2B2420'],
      outline: '#5A2A10',
      // The seams curve down either side and run top and bottom, clear of the face.
      art: grid16('basketball', [
        '................',
        '.....114111.....',
        '...1141411411...',
        '..114114111411..',
        '..141134111141..',
        '.11413141111422.',
        '.14111111111142.',
        '.14111111111142.',
        '.14111111111142.',
        '.14111111111142.',
        '.14111111111142.',
        '..141111111142..',
        '..142111111242..',
        '...2422412242...',
        '.....224222.....',
        '................',
      ]),
    },
    {
      id: 'weighsies.piano', game: 'weighsies', slot: 'skin', name: 'Grand piano', eyes: 7,
      colors: ['#23252C', '#121318', '#5A6070', '#F7F5EE', '#C9C5BA', '#D9A63A'],
      outline: '#08090C',
      // Its lid propped open behind, the gold inside showing, the keys along the front, three legs.
      art: grid16('grand piano', [
        '................',
        '............11..',
        '........11133...',
        '....11113333....',
        '.66666666666662.',
        '.11111111111112.',
        '.11111111111112.',
        '.11111111111112.',
        '.11111111111112.',
        '.11111111111112.',
        '.44244244244245.',
        '.44444444444445.',
        '..2.....2....2..',
        '..2.....2....2..',
        '................',
        '................',
      ]),
    },
    {
      id: 'weighsies.kitchen-scale', game: 'weighsies', slot: 'skin', name: 'Kitchen scale', eyes: 8, showpiece: true, signature: 'pulse',
      about: 'Weighs everything.',
      colors: ['#FFF8E8', '#E8DCC0', '#2F4FA8', '#C9D6F5', '#E5484D', '#F6EBD2', '#D8C8A6', '#1F3478'],
      outline: '#16224A',
      // The dial is the face, its red needle up top; a pan held out at each side; a cream base.
      art: grid16('kitchen scale', [
        '................',
        '................',
        '.....334433.....',
        '....43111134....',
        '...3111115113...',
        '..331111511133..',
        '..411111111114..',
        '..311111111113..',
        '..311111111113..',
        '..311111111113..',
        '.66661111116666.',
        '..771111111177..',
        '....33111133....',
        '.....888888.....',
        '....66666667....',
        '................',
      ]),
    },

    // ------------------------------------------------------------ hats
    {
      id: 'weighsies.scale-pan', game: 'weighsies', slot: 'hat', name: 'Scale pan', free: true,
      colors: ['#F6EBD2', '#D8C8A6', '#FFFFFF', '#E5484D', '#B83236', '#FF8A8A'],
      // The cream pan off the scale, a little red weight sat in it.
      draw: on([
        '....664....',
        '....445....',
        '....445....',
        '.311111112.',
        '..2222222..',
      ]),
    },
    {
      id: 'weighsies.apple', game: 'weighsies', slot: 'hat', name: 'Apple',
      colors: ['#E5383D', '#A8202A', '#FF8A8A', '#4FAE5C', '#2E7D3A', '#6A3A18'],
      // A red apple balanced on the head, its stalk and a leaf.
      draw: on([
        '...645',
        '.3161.',
        '311112',
        '311112',
        '.1122.',
      ], 0, 2),
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
      id: 'weighsies.pyramid', game: 'weighsies', slot: 'hat', name: 'Great Pyramid',
      colors: ['#F2D08A', '#B98A48', '#FFE6B0', '#D9B26E', '#96692E'],
      // Stood on the head, seen from a corner: a sunlit face and a shaded one, courses of stone across both.
      draw: on([
        '...3...',
        '..312..',
        '.44352.',
        '3113225',
      ], 0, 2),
    },
    {
      id: 'weighsies.eiffel', game: 'weighsies', slot: 'hat', name: 'Eiffel Tower',
      colors: ['#A8683A', '#6E4020', '#D99A5E'],
      // The tower stood on the head: its spire, two decks, the arch between its legs.
      draw: on([
        '..3..',
        '.313.',
        '.1.2.',
        '.333.',
        '31.12',
      ]),
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
      id: 'weighsies.blocks', game: 'weighsies', slot: 'frame', name: 'Weigh-in blocks',
      colors: ['#F3F0E8', '#F2A19B', '#DB7C76', '#A8DBA2', '#7FC078'],
      // The red and green weights off the scale, spaced out on cream.
      fill: (x, y) => {
        for (const [bx, by, red] of [[1, 1, 1], [12, 0, 0], [14, 5, 1], [0, 8, 0], [13, 11, 0], [2, 13, 1], [7, 14, 0]] as const) {
          if (x >= bx && x <= bx + 1 && y >= by && y <= by + 1) return red ? (y === by ? 2 : 3) : (y === by ? 4 : 5);
        }
        return 1;
      },
    },

    // ------------------------------------------------------------ buddies
    {
      id: 'weighsies.cat', game: 'weighsies', slot: 'buddy', name: 'House cat',
      colors: ['#F29A4A', '#C46A24', '#FFE0B8', '#FFC98A'],
      // Sat side on, looking right: ears up, a cream chest and paws, the tail curled round its feet.
      art: pet('house cat', [
        '...1.1',
        '...1o1',
        '..1113',
        '.12113',
        '222233',
      ]),
    },
    {
      id: 'weighsies.whale', game: 'weighsies', slot: 'buddy', name: 'Lil whale',
      colors: ['#5DBEFC', '#2F8FD0', '#A8DEFF', '#E6F6FF', '#BFEAFF'],
      art: pet('lil whale', [
        '...5.5',
        '....5.',
        '..3311',
        '3311o1',
        '.44442',
      ]),
    },
    {
      id: 'weighsies.trex', game: 'weighsies', slot: 'buddy', name: 'Baby T. rex',
      colors: ['#5CC46A', '#2F8A44', '#B5F0A8'],
      // A big head on a small body, two tiny arms, the tail out behind.
      art: pet('baby t. rex', [
        '...111',
        '...1o1',
        '..1113',
        '21111.',
        '2.2.2.',
      ]),
    },
    {
      id: 'weighsies.pigeon', game: 'weighsies', slot: 'buddy', name: 'Pigeon',
      colors: ['#A9B0BC', '#7A8292', '#D0D5DD', '#7A6EA8', '#3A3A40', '#E86A6A'],
      // Grey, its neck shot with purple, pink feet.
      art: pet('pigeon', [
        '...31.',
        '...1o5',
        '..4413',
        '211221',
        '..6.6.',
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
