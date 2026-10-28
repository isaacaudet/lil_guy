import { grid16, on, pet, type MachineSet } from '../item-art';

/**
 * Halfsies's machine: the knife, things cut down the middle, the stamp a
 * perfect cut gets, the weekend's thirds and the Sunday kebab.
 */
export const set: MachineSet = {
  add: [
    {
      id: 'halfsies.burger', game: 'halfsies', slot: 'skin', name: 'Burger suit', eyes: 9, limb: 2,
      // bun, bun shade, bun light, seed, lettuce, cheese, patty, patty shade
      colors: ['#EFA352', '#C47A30', '#FFC98A', '#FFF6DC', '#7DC24A', '#FFC93A', '#8A4A26', '#5A2E16'],
      outline: '#4A2410',
      // The guy in a burger: the top bun for a hood, lettuce, patty and cheese round his face, the bottom
      // bun at his feet.
      art: grid16('burger suit', [
        '................',
        '................',
        '....33331112....',
        '..331141114122..',
        '.31411111141112.',
        '.31111411111142.',
        '.5555h####s5555.',
        '.778########877.',
        '.778########877.',
        '.778########877.',
        '.678s######s876.',
        '.6666s####s6666.',
        '.31631111613612.',
        '.21111111111112.',
        '..222222222222..',
        '................',
      ]),
    },
    {
      id: 'halfsies.trophy', game: 'halfsies', slot: 'skin', name: 'Trophy half', eyes: 7,
      // The gold cup cut down the middle, its right half slid down a row.
      colors: ['#F5C33B', '#C8901E', '#FFE58A', '#8A5A10', '#F4F4F2', '#C9CFDA', '#FFFFFF', '#E3E7EE', '#FFF0B8'],
      outline: '#6A4208',
      art: grid16('trophy half', [
        '................',
        '................',
        '...33339........',
        '.111311993333...',
        '.14131199111111.',
        '.14131199111141.',
        '.22131199111141.',
        '...231199111222.',
        '...2211991112...',
        '....221991122...',
        '.....2299122....',
        '......29922.....',
        '....555892......',
        '...666688555....',
        '........86666...',
        '................',
      ]),
    },
    {
      id: 'halfsies.perfect-split', game: 'halfsies', slot: 'skin', name: 'Banana split', eyes: 9, limb: 6,
      showpiece: true, signature: 'shimmer',
      about: 'A banana cut in half, to the gram.',
      // scoop, scoop shade, scoop light, chocolate, cherry, banana, banana shade, dish, dish shade
      colors: ['#FFA3C0', '#E07098', '#FFD2E0', '#6A321A', '#E5363D', '#FFE066', '#E0B030', '#DDEBF5', '#9FB6CC'],
      outline: '#5A2030',
      art: grid16('banana split', [
        '................',
        '........4.......',
        '.......55.......',
        '.....445544.....',
        '....44444444....',
        '...4444444444...',
        '..344134411442..',
        '..341111111112..',
        '..311111111112..',
        '..311111111112..',
        '.66311111111266.',
        '.67631111112676.',
        '..7768888886677.',
        '...8888888889...',
        '....99999999....',
        '................',
      ]),
    },
    {
      id: 'halfsies.knife', game: 'halfsies', slot: 'hat', name: 'Chef’s hat', free: true,
      // The kitchen's own hat, puffed up, over a pleated band.
      colors: ['#FFFFFF', '#D6DDE8', '#F4F7FB', '#E9EEF5', '#B9C3D3'],
      draw: on([
        '.112.1112.12',
        '111111111112',
        '.1111111112.',
        '.4545454545.',
      ]),
    },
    {
      id: 'halfsies.star', game: 'halfsies', slot: 'hat', name: 'Gold star',
      colors: ['#FFD25A', '#D99A1E', '#FFF1B0'],
      draw: on([
        '...3...',
        '..331..',
        '3331112',
        '.33112.',
        '.31.12.',
        '.1...2.',
      ], 0, 2),
    },
    {
      id: 'halfsies.stamp', game: 'halfsies', slot: 'hat', name: 'Split beanie',
      // Knitted in two halves that weigh the same: tomato on one side, mint on the other.
      colors: ['#F0574E', '#B83232', '#FF8E80', '#3FBFAE', '#22867A', '#8EE6DA', '#FFFFFF', '#D6DDE8'],
      draw: on([
        '.....78.....',
        '...331445...',
        '.3311144445.',
        '121212454545',
      ]),
    },
    {
      id: 'halfsies.thirds', game: 'halfsies', slot: 'hat', name: 'Thirds cake',
      // The weekend's thirds round as a cake: three candles, one for each piece.
      colors: ['#F2B95A', '#C98A34', '#FFF4DC', '#F0DDB8', '#E5484D', '#5FB4FF', '#FFD447', '#FF8A3D', '#FF8FB1'],
      draw: on([
        '..7...7...7..',
        '..6...9...6..',
        '.33533353335.',
        '.11411141114.',
      ]),
    },
    {
      id: 'halfsies.kebab', game: 'halfsies', slot: 'hat', name: 'Pancake stack',
      // Sunday's short stack, a pat of butter melting into the syrup.
      colors: ['#E8A04E', '#B87028', '#FBD08A', '#FFF1A0', '#F2D25A', '#8A3E10', '#C8702A'],
      draw: on([
        '....4455....',
        '.3667666763.',
        '.2262222622.',
        '.1111111111.',
      ]),
    },
    {
      id: 'halfsies.balance', game: 'halfsies', slot: 'buddy', name: 'Lil acorn',
      // An acorn in its little cap, one of the things Halfsies cuts.
      colors: ['#E0A060', '#A86A30', '#F4C890', '#7A4A26', '#9A6A3A', '#5A3418'],
      art: pet('lil acorn', [
        '...4..',
        '.5555.',
        '555556',
        '3o11o2',
        '.1122.',
      ]),
    },
    {
      id: 'halfsies.cake', game: 'halfsies', slot: 'buddy', name: 'Cake slice',
      // A slice of strawberry cake, jam through the middle.
      colors: ['#F5C86A', '#C9953A', '#FFFFFF', '#E8D6C4', '#E5484D', '#D9283A', '#5CB85C'],
      art: pet('cake slice', [
        '....76',
        '..3334',
        '.1o1o2',
        '555556',
        '111122',
      ]),
    },
    {
      id: 'halfsies.cut-line', game: 'halfsies', slot: 'frame', name: 'Dashed cut line',
      colors: ['#F5D76E', '#E2BE4E'],
      fill: (x, y) => ((x - y + 32) % 8 === 0 && x % 4 < 2 ? 2 : 1),
    },
  ],
  retire: [
    'halfsies.pot', 'halfsies.kitchen-scale', 'halfsies.cyborg',
    'halfsies.bowl', 'halfsies.scale', 'halfsies.helmet', 'halfsies.sandwich', 'halfsies.half-moon',
    'halfsies.gingham', 'halfsies.pea', 'halfsies.berry',
  ],
  redraw: {
    'halfsies.split': {
      // Cut straight down the middle: polka dots on one side, stripes on the other, the knife's line between.
      colors: ['#FFC9B0', '#A9E3DC', '#FFFFFF', '#FFE2D4', '#C9F0EB'],
      fill: (x, y) => {
        const tx = x % 16, ty = y % 16;
        if (tx === 8) return ty % 4 < 2 ? 3 : 2;
        if (tx < 8) return (tx % 4 === 1 && ty % 4 === 1) || (tx % 4 === 3 && ty % 4 === 3) ? 4 : 1;
        return ty % 4 === 0 ? 5 : 2;
      },
    },
    'halfsies.lemon': {
      name: 'Peach', eyes: 9, limb: 2,
      // A whole peach: the crease down its front, a leaf on its stalk.
      colors: ['#FFB07A', '#F07A5A', '#FFD6B0', '#FF8A8A', '#6CC24A', '#3E8E2E', '#7A4A26', '#E8906A'],
      outline: '#7A2E1C',
      art: grid16('peach', [
        '................',
        '........755.....',
        '.......75566....',
        '...3331.11112...',
        '..3333381111112.',
        '.33333811111112.',
        '.33331111111112.',
        '.31111111111112.',
        '.11111111111112.',
        '.11111111111122.',
        '.11111111111122.',
        '..111111111122..',
        '..211111111222..',
        '...2211111222...',
        '.....222222.....',
        '................',
      ]),
    },
    'halfsies.yolk': {
      name: 'Half-shell chick',
      // Just hatched, still sitting in the bottom half of its shell.
      colors: ['#FFD84A', '#E0A820', '#FFF0A0', '#FF8A2E', '#FFFFFF', '#C9D1DC'],
      art: pet('half-shell chick', [
        '.3311.',
        '1o4o12',
        '565656',
        '555556',
        '.5566.',
      ]),
    },
  },
};
