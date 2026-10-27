import { grid16, on, pet, type MachineSet } from '../item-art';
import { stamp } from '../parts/art';
import type { Canvas } from '../parts/canvas';
import { seat } from '../parts/hair';

/** A hat stood on the crown as drawn, however wide, rather than pulled down round the head like a cap. */
const perch = (rows: string[], sink = 1) => {
  const s = stamp(rows);
  return (c: Canvas) => seat(c, s, c.centred(s), sink);
};

/**
 * Flipsies's machine: the things you flip (a water bottle, a soup can, a
 * rubber duck, a die, the moai) and the kitchen and living room they land in.
 */
export const set: MachineSet = {
  add: [
    // ------------------------------------------------------------ skins
    {
      id: 'flipsies.rubber-duck', game: 'flipsies', slot: 'skin', name: 'Rubber duck', eyes: 9,
      colors: ['#FFD84A', '#E0A820', '#FFF1A8', '#FF7A1A', '#C9520C'],
      outline: '#7A4A06',
      // Side on, looking right: a round head on a fat body, the beak out to
      // one side at the mouth and the tail cocked up behind.
      art: grid16('rubber duck', [
        '................',
        '................',
        '................',
        '......331111....',
        '.....31111112...',
        '.....311111112..',
        '.3..3111111112..',
        '.33.3111111112..',
        '.11311111111244.',
        '.31111111111255.',
        '.31111111111112.',
        '.31112222111112.',
        '..311111111112..',
        '...2222222222...',
        '................',
        '................',
      ]),
    },
    {
      id: 'flipsies.die', game: 'flipsies', slot: 'skin', name: 'Giant die', eyes: 8,
      colors: ['#FBFCFE', '#AEB8C8', '#E2E8F1', '#2B2F38', '#FFFFFF'],
      outline: '#3A4150',
      // A white die seen a little from above: the top shows one pip, the
      // front four round the face, the side two.
      art: grid16('giant die', [
        '................',
        '................',
        '....3333333333..',
        '...33333433332..',
        '..333333333322..',
        '..141111114122..',
        '..111111111122..',
        '..111111111242..',
        '..111111111122..',
        '..111111111122..',
        '..111111111122..',
        '..111111111242..',
        '..141111114122..',
        '..11111111112...',
        '................',
        '................',
      ]),
    },
    {
      id: 'flipsies.moai', game: 'flipsies', slot: 'skin', name: 'Moai', eyes: 8, showpiece: true, signature: 'lava',
      colors: ['#ADA195', '#857A6E', '#CDC3B6', '#5E544B', '#968A7D'],
      outline: '#3A322B',
      // A long stone head: a heavy brow in shadow, a long nose down between
      // the eyes, a jutting chin.
      art: grid16('moai', [
        '................',
        '.....311112.....',
        '....31151112....',
        '...3111111152...',
        '...3333333332...',
        '...2444444442...',
        '...3113511112...',
        '...3113511112...',
        '...3133551112...',
        '...3111111112...',
        '...3111111112...',
        '...3115555112...',
        '...3111111112...',
        '...3111111152...',
        '....22222222....',
        '................',
      ]),
    },

    // ------------------------------------------------------------ hats
    {
      id: 'flipsies.pancake-hat', game: 'flipsies', slot: 'hat', name: 'Short stack',
      colors: ['#F7C873', '#C98236', '#FDE3A7', '#9A4416', '#FFF27A'],
      // A stack of pancakes on the head, a pat of butter on top and syrup running over the edge.
      draw: perch([
        '...5555...',
        '.33444333.',
        '1114111412',
        '.22242222.',
        '1111111112',
      ]),
    },
    {
      id: 'flipsies.toast', game: 'flipsies', slot: 'hat', name: 'Buttered toast',
      colors: ['#F0CB8C', '#A8642A', '#E3B06A', '#FFEC8A', '#F2C94A'],
      // A slice standing up on the head: a domed crust, a pat of butter in the middle.
      draw: on([
        '..22222222..',
        '.2111111112.',
        '211114511112',
        '.2111551112.',
        '.2222222222.',
      ]),
    },
    {
      id: 'flipsies.popcorn', game: 'flipsies', slot: 'hat', name: 'Popcorn bucket',
      colors: ['#E5484D', '#B83236', '#FFF8EE', '#E3D9C8', '#FFFFFF', '#F3DE96'],
      // A striped tub, wider at the top, heaped with puffs.
      draw: on([
        '...5.55.5...',
        '..5565556...',
        '.5655565556.',
        '131313131312',
        '.1313131312.',
        '.1313131312.',
      ]),
    },
    {
      id: 'flipsies.lampshade', game: 'flipsies', slot: 'hat', name: 'Lampshade',
      colors: ['#F2703F', '#C24E26', '#FFA27A', '#6E6E78', '#FFF3B0'],
      // The lamp that hangs in the way of a throw: an orange dome on its cord, its bulb lit under it.
      draw: on([
        '....4....',
        '..33112..',
        '.3311112.',
        '311111122',
        '...555...',
      ], 0, 1),
    },

    // ------------------------------------------------------------ frames
    {
      id: 'flipsies.ring-mat', game: 'flipsies', slot: 'frame', name: 'Ring mat',
      colors: ['#E6F1FA', '#D3E5F4'],
      // The landing mat: soft rings round where the guy stands.
      fill: (x, y) => (Math.round(Math.hypot(x - 7.5, y - 9)) % 4 === 0 ? 2 : 1),
    },
    {
      id: 'flipsies.cork', game: 'flipsies', slot: 'frame', name: 'Cork coaster',
      colors: ['#DDB98E', '#C79C6C', '#ECD2AE'],
      fill: (x, y) => ((x * 7 + y * 13) % 11 === 0 ? 2 : (x * 5 + y * 3) % 13 === 0 ? 3 : 1),
    },
    {
      id: 'flipsies.books', game: 'flipsies', slot: 'frame', name: 'Book spines',
      colors: ['#B6C6DF', '#E0B8B1', '#BCD4B4', '#ECDFB4', '#A1B4D2', '#D3A49C', '#A6C59E', '#DECE9B'],
      // A shelf of books: spines two or three wide, each with a band near its top and foot.
      fill: (x, y) => {
        const spines = [3, 2, 3, 3, 2, 3];
        let left = 0, i = 0;
        while (left + spines[i % spines.length] <= x) left += spines[i++ % spines.length];
        const book = i % 4;
        return y === 2 || y === 13 ? book + 5 : book + 1;
      },
    },

    // ------------------------------------------------------------ buddies
    {
      id: 'flipsies.goldfish', game: 'flipsies', slot: 'buddy', name: 'Goldfish',
      colors: ['#FF8A2B', '#D45F10', '#FFC27A', '#3A1A0A'],
      art: pet('goldfish', [
        '...33.',
        '2.3113',
        '.21141',
        '2.1112',
        '...22.',
      ]),
    },
    {
      id: 'flipsies.ketchup', game: 'flipsies', slot: 'buddy', name: 'Ketchup',
      colors: ['#E5383D', '#A8202A', '#FF8A8A', '#FFFFFF', '#C9D1DC'],
      // The red bottle with its white cap.
      art: pet('ketchup', [
        '..45..',
        '..31..',
        '.3112.',
        '.3112.',
        '.3122.',
      ]),
    },
    {
      id: 'flipsies.mug', game: 'flipsies', slot: 'buddy', name: 'Coffee mug',
      colors: ['#FBF6EC', '#D8CDBB', '#7A4A2A', '#E5484D'],
      art: pet('coffee mug', [
        '..1332',
        '221112',
        '2.1412',
        '221112',
        '..2222',
      ]),
    },
    {
      id: 'flipsies.toaster', game: 'flipsies', slot: 'buddy', name: 'Toaster',
      colors: ['#D3DAE4', '#8A95A6', '#F4F7FA', '#F5C77E', '#2B2F38', '#C98A40'],
      // A chrome toaster with a slice of toast popped up and its lever down the side.
      art: pet('toaster', [
        '..66..',
        '.6446.',
        '311112',
        '311115',
        '222222',
      ]),
    },
  ],

  retire: [
    'flipsies.bullseye', 'flipsies.pancakes', 'flipsies.shark',
    'flipsies.landed', 'flipsies.beret', 'flipsies.cup', 'flipsies.fin',
    'flipsies.target', 'flipsies.waves', 'flipsies.tiles',
    'flipsies.droplet', 'flipsies.shortstack', 'flipsies.duck', 'flipsies.whale',
  ],

  redraw: {
    'flipsies.bottle': {
      colors: ['#DDF0FB', '#A9D4EE', '#FFFFFF', '#2F6FD6', '#1D4E9E', '#6CBCEB', '#3E8FD3', '#B5E2F8'],
      outline: '#2A5A8C',
      // A third full: the face sits in the clear plastic above the water line.
      art: grid16('water bottle', [
        '................',
        '.....444445.....',
        '.....454545.....',
        '......3112......',
        '......3112......',
        '....31111112....',
        '...3111111112...',
        '...3111111112...',
        '...3111111112...',
        '...3111111112...',
        '...3111111112...',
        '...8888888882...',
        '...6666666667...',
        '....66666677....',
        '................',
        '................',
      ]),
    },
    'flipsies.can': {
      name: 'Soup can', eyes: 7,
      colors: ['#E5484D', '#B83236', '#FF7A7E', '#D7DCE4', '#9AA0A8', '#F6EEDC', '#DCCFB0', '#F2B830'],
      outline: '#5A1A22',
      // Tomato soup: grey rims, a red label over a cream one, and the pull ring on its lid.
      art: grid16('soup can', [
        '................',
        '......454.......',
        '...4445.54445...',
        '...5555555555...',
        '...3111111112...',
        '...3111111112...',
        '...3111111112...',
        '...3111111112...',
        '...3111111112...',
        '...3111111112...',
        '...3111111112...',
        '...8888888888...',
        '...6666886667...',
        '...4444444445...',
        '....55555555....',
        '................',
      ]),
    },
  },
};
