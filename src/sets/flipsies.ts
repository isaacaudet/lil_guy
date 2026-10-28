import { grid16, on, pet, sit, type MachineSet } from '../item-art';
import { stamp } from '../parts/art';
import type { Canvas } from '../parts/canvas';

/** A hat stood on the crown as drawn, however wide, rather than pulled down round the head like a cap. */
const perch = (rows: string[], sink = 1) => {
  const s = stamp(rows);
  return (c: Canvas) => sit(c, s, 0, sink);
};

/**
 * Flipsies's machine: the things you flip (a water bottle, a pencil, buttered
 * toast, a rubber duck, the moai) and the kitchen and living room they land in.
 */
export const set: MachineSet = {
  add: [
    // ------------------------------------------------------------ skins
    {
      id: 'flipsies.rubber-duck', game: 'flipsies', slot: 'skin', name: 'Duck onesie', eyes: 9, limb: 4,
      colors: ['#FFD84A', '#E0A820', '#FFF1A8', '#FF8A1A', '#C9520C', '#2B2F38'],
      outline: '#7A4A06',
      // The guy in a rubber duck suit: a tuft on the hood, its little eyes and its bill over his face.
      art: grid16('duck onesie', [
        '................',
        '.......31.......',
        '.....331112.....',
        '....31111112....',
        '...3161111612...',
        '..311144441112..',
        '..311455554112..',
        '..31h#######12..',
        '..31########12..',
        '..31########12..',
        '..31#######s12..',
        '..311ssssss112..',
        '...3111111112...',
        '....22222222....',
        '................',
        '................',
      ]),
    },
    {
      id: 'flipsies.die', game: 'flipsies', slot: 'skin', name: 'Buttered toast', eyes: 9, limb: 4,
      colors: ['#F6D9A0', '#E3B97A', '#FFF0CC', '#B9732F', '#8E5420', '#D99A4A', '#FFE36A', '#F2C430'],
      outline: '#5A3210',
      // The guy in a slice of toast costume, crust all round, a pat of butter melting on top. It always lands butter side up.
      art: grid16('buttered toast', [
        '................',
        '....66444444....',
        '...6433311114...',
        '..643777111145..',
        '..641788111145..',
        '..641h#####145..',
        '..64h#######45..',
        '..64########45..',
        '..64########45..',
        '..64########45..',
        '..64#######s45..',
        '..641ssssss245..',
        '..642222222245..',
        '...5555555555...',
        '................',
        '................',
      ]),
    },
    {
      id: 'flipsies.moai', game: 'flipsies', slot: 'skin', name: 'Moai', eyes: 9, limb: 2, showpiece: true, signature: 'lava',
      colors: ['#ADA195', '#857A6E', '#CDC3B6', '#5E544B', '#C0503A', '#8E3424', '#E07A5A', '#7FA35A'],
      outline: '#3A322B',
      // A round little stone head with long ears and a heavy brow, his red topknot stone on top, moss at his feet.
      art: grid16('moai', [
        '................',
        '.....775556.....',
        '.....755556.....',
        '....31111112....',
        '...3111111112...',
        '...3444444442...',
        '..231111111122..',
        '..231111111122..',
        '..231111111122..',
        '..231111111122..',
        '...3111111112...',
        '...3111111112...',
        '...8111111128...',
        '....88222288....',
        '................',
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
      id: 'flipsies.toast', game: 'flipsies', slot: 'hat', name: 'Fried egg',
      colors: ['#FFFFFF', '#E3E3EA', '#FFD23A', '#F2A20E', '#FFF3A0', '#E0B070'],
      // Flipped over easy and landed on his head: a wobbly white, the yolk up top.
      draw: on([
        '.....533.....',
        '..1115334111.',
        '1111114441112',
        '6222222222226',
      ], 0, 1),
    },
    {
      id: 'flipsies.popcorn', game: 'flipsies', slot: 'hat', name: 'Popcorn bucket',
      colors: ['#E5484D', '#B83236', '#FFF8EE', '#E3D9C8', '#FFFFFF', '#F3DE96', '#EADFC0'],
      // A striped tub heaped with buttery puffs.
      draw: on([
        '...5565565...',
        '.55655655655.',
        '3131313131312',
        '.13131313132.',
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
      colors: ['#FF8A2B', '#D45F10', '#FFC27A', '#FFFFFF'],
      // Out of the fishbowl for the day: a round orange goldfish, its fan tail flicking.
      art: pet('goldfish', [
        '.33..3',
        '3111.3',
        '1o1123',
        '311123',
        '..2...',
      ]),
    },
    {
      id: 'flipsies.ketchup', game: 'flipsies', slot: 'buddy', name: 'Ketchup',
      colors: ['#E5383D', '#A8202A', '#FF8A8A', '#FFFFFF', '#C9D1DC', '#FFE36A'],
      // A plump squeezy ketchup bottle with a white cap, looking up at you.
      art: pet('ketchup', [
        '..45..',
        '.3112.',
        '3o11o2',
        '315512',
        '.2222.',
      ]),
    },
    {
      id: 'flipsies.mug', game: 'flipsies', slot: 'buddy', name: 'Rubber duckling',
      colors: ['#FFD84A', '#E0A820', '#FFF1A8', '#FF8A1A'],
      // A little rubber duck facing away from him: orange beak, a wing, its tail up behind.
      art: pet('rubber duckling', [
        '...31.',
        '..11o4',
        '1..111',
        '111321',
        '.2222.',
      ]),
    },
    {
      id: 'flipsies.toaster', game: 'flipsies', slot: 'buddy', name: 'Toaster',
      colors: ['#D3DAE4', '#8A95A6', '#F4F7FA', '#F5C77E', '#2B2F38', '#C98A40'],
      // A chrome toaster with two slices popping up, pleased with itself.
      art: pet('toaster', [
        '.44.44',
        '.46.46',
        '311112',
        '3o11o2',
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
    'flipsies.cap': {
      name: 'Bucket hat',
      // A soft bucket hat in his own colours, its brim turned down.
      draw: on([
        '...xaaaaaA...',
        '..xaaaaaaaA..',
        '..AAAAAAAAA..',
        'xaaaaaaaaaaaA',
      ], 0, 2),
    },
    'flipsies.bottle': {
      limb: 4,
      colors: ['#D6EEFB', '#A3D0EC', '#FFFFFF', '#2F6FD6', '#1D4E9E', '#5FB2EA', '#3C8DD0', '#8FD0F5', '#6FA0E8'],
      outline: '#2A5A8C',
      // A chubby water bottle, his sports cap screwed on top and the water sloshing round his feet.
      art: grid16('water bottle', [
        '................',
        '.......45.......',
        '.....944445.....',
        '.....454545.....',
        '.....311112.....',
        '...3311111122...',
        '..331111111122..',
        '..311111111112..',
        '..311111111112..',
        '..311111111112..',
        '..311111111112..',
        '..888888888887..',
        '...6666666677...',
        '....66666677....',
        '................',
        '................',
      ]),
    },
    'flipsies.can': {
      name: 'Pencil', eyes: 8, limb: 1,
      colors: ['#FFD23F', '#E0A620', '#FFEC8A', '#F2C99A', '#C99A66', '#3A3A44', '#E6EAF0', '#B9C2CF', '#FF8FA8'],
      outline: '#5A3A10',
      // The guy in a pencil costume: sharpened to a point on top, a yellow body round his face, the metal band
      // and pink eraser at his feet.
      art: grid16('pencil', [
        '................',
        '.......66.......',
        '......4665......',
        '.....444455.....',
        '....44444455....',
        '..314141414112..',
        '..33h#######22..',
        '..33########22..',
        '..33########22..',
        '..33#######s22..',
        '..331ssssss122..',
        '..787878787878..',
        '...9999999999...',
        '....99999999....',
        '................',
        '................',
      ]),
    },
  },
};
