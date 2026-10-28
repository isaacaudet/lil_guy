import { grid16, on, pet, type MachineSet } from '../item-art';

/**
 * Halfsies's machine: the knife, things cut down the middle, the stamp a
 * perfect cut gets, the weekend's thirds and the Sunday kebab.
 */
export const set: MachineSet = {
  add: [
    {
      id: 'halfsies.burger', game: 'halfsies', slot: 'skin', name: 'Burger suit', eyes: 9, limb: 'own',
      // bun, bun shade, bun light, seed, lettuce, cheese, patty, patty shade
      colors: ['#EFA352', '#C47A30', '#FFC98A', '#FFF6DC', '#7DC24A', '#FFC93A', '#8A4A26', '#5A2E16'],
      outline: '#4A2410',
      // The guy as the filling: the top bun on his head, lettuce tucked round it, cheese melting under
      // him and the bottom bun at his feet.
      art: grid16('burger suit', [
        '................',
        '................',
        '....33331112....',
        '...3114111412...',
        '..311141114112..',
        '..221111111122..',
        '.555h######s555.',
        '.5h##########s5.',
        '.h############s.',
        '.##############.',
        '.#############s.',
        '..s##########s..',
        '.666ss####ss666.',
        '.31111111111112.',
        '..222222222222..',
        '................',
      ]),
    },
    {
      id: 'halfsies.trophy', game: 'halfsies', slot: 'skin', name: 'Trophy cup', eyes: 6,
      // gold, gold shade, gold light, plinth shade, plinth, plate
      colors: ['#F5C33B', '#C8901E', '#FFE58A', '#4A2E18', '#6E4628', '#FFF3C4'],
      outline: '#6A4208',
      // The winner sat in the gold cup, his own head over its rim, its handles either side.
      art: grid16('trophy half', [
        '................',
        '................',
        '.....h#####.....',
        '....h#######....',
        '...h#########...',
        '...##########...',
        '...##########...',
        '...##########...',
        '...##########...',
        '.11333333333311.',
        '.1.3311111111.2.',
        '.22131111111122.',
        '....22111122....',
        '.......22.......',
        '....45566554....',
        '................',
      ]),
    },
    {
      id: 'halfsies.perfect-split', game: 'halfsies', slot: 'skin', name: 'Banana split', eyes: 10,
      showpiece: true, signature: 'shimmer',
      about: 'A banana cut in half, to the gram.',
      // The guy as the scoop: whipped cream and a cherry on his head, a banana half either side of him,
      // the glass boat under. cream, cream shade, cream light, stalk, cherry, banana, banana shade, boat, boat shade
      colors: ['#FFFDF6', '#E6DCCB', '#FFFFFF', '#6A321A', '#E5363D', '#FFE066', '#E0B030', '#DDEBF5', '#9FB6CC'],
      outline: '#5A2030',
      art: grid16('banana split', [
        '................',
        '........4.......',
        '.......55.......',
        '.....311112.....',
        '....31111112....',
        '...h22222222s...',
        '..h##########s..',
        '..###########s..',
        '.h############s.',
        '.#############s.',
        '.66###########6.',
        '.676ss####ss676.',
        '.86677777777668.',
        '..888888888889..',
        '...9999999999...',
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
    'halfsies.avocado': {
      eyes: 9,
      // The guy as the pit: his whole round head sat in the hollow of an avocado half, the pale flesh
      // ripening to yellow round him, the dark skin all round.
      colors: ['#E2EE9A', '#A9CF5C', '#3F6B22', '#6E9A34', '#F7F0A8'],
      outline: '#22380F',
      art: grid16('avocado', [
        '................',
        '......4333......',
        '.....421123.....',
        '....42155123....',
        '...4215555123...',
        '...421oooo123...',
        '..42oh####so23..',
        '.42oh#######o23.',
        '.42o########o23.',
        '.42o########o23.',
        '.42o#######so23.',
        '.425os####so523.',
        '..4255oooo5523..',
        '...4222222223...',
        '....33333333....',
        '................',
      ]),
    },
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
      name: 'Peach', eyes: 10, limb: 'own',
      // A peach worn as a hood: its crease down the top, a leaf on its stalk, a rosy blush on one
      // side, the guy's own body under it.
      colors: ['#FFB27E', '#E8805E', '#FFD6B4', '#FF8A80', '#6CC24A', '#3E8E2E', '#7A4A26', '#E07A62'],
      outline: '#7A2E1C',
      art: grid16('peach', [
        '................',
        '.......7556.....',
        '....33381112....',
        '...3338111142...',
        '..333381114442..',
        '.33333811144442.',
        '.3331h####s1442.',
        '.331h######s142.',
        '.31h########s42.',
        '.31##########42.',
        '.22##########22.',
        '..###########s..',
        '...#########s...',
        '....ssssssss....',
        '................',
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
