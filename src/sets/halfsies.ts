import { grid16, on, pet, type MachineSet } from '../item-art';

/**
 * Halfsies's machine: the knife, things cut down the middle, the stamp a
 * perfect cut gets, the weekend's thirds and the Sunday kebab.
 */
export const set: MachineSet = {
  add: [
    {
      id: 'halfsies.burger', game: 'halfsies', slot: 'skin', name: 'Burger half', eyes: 7,
      // Cut down the middle: the bun's dome peaks at the cut, the cut face on the right.
      colors: ['#EFA352', '#C47A30', '#FFC98A', '#FFF6DC', '#7DC24A', '#FFC93A', '#8A4A26', '#5A2E16', '#FBE3B8'],
      outline: '#4A2410',
      art: grid16('burger half', [
        '................',
        '................',
        '......33333339..',
        '...33411411119..',
        '..311114111119..',
        '.3111111111119..',
        '.1111111111119..',
        '.2111111111119..',
        '.2222222222229..',
        '.5555555555555..',
        '.6666666666666..',
        '.7777777777777..',
        '.8888888888888..',
        '..111111111119..',
        '...22222222222..',
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
      id: 'halfsies.perfect-split', game: 'halfsies', slot: 'skin', name: 'Perfect split', eyes: 8,
      showpiece: true, signature: 'shimmer',
      about: 'Fifty-fifty, to the gram.',
      colors: ['#FFC93A', '#D9901A', '#FFF1B0', '#FFFFFF'],
      art: grid16('perfect split', [
        '................',
        '.....h1.........',
        '...hh#1.........',
        '..h###1..3h.....',
        '.h####1..1hh#...',
        '.#####1..1####..',
        '.#####1441####s.',
        '.#####1441####s.',
        '.#####1441####s.',
        '.s####1441####s.',
        '..s###1441####s.',
        '...ss#1441####s.',
        '.....s2..1###s..',
        '.........2sss...',
        '.........2s.....',
        '................',
      ]),
    },
    {
      id: 'halfsies.knife', game: 'halfsies', slot: 'hat', name: 'Knife', free: true,
      colors: ['#DDE3EA', '#9AA3B2', '#FFFFFF', '#3A2A22', '#C9CFDA', '#5A4436'],
      draw: on([
        '.....33333333.',
        '65656211111111',
        '44444222222...',
      ], 0, 2),
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
      id: 'halfsies.stamp', game: 'halfsies', slot: 'hat', name: 'Perfect stamp',
      colors: ['#E5484D', '#A82238', '#FF8A8E', '#C98A50', '#E8B47A', '#8A5A2A'],
      draw: on([
        '..554..',
        '...46..',
        '5444446',
        '3111112',
        '1222222',
      ], 0, 2),
    },
    {
      id: 'halfsies.thirds', game: 'halfsies', slot: 'hat', name: 'Thirds cake',
      colors: ['#F2B95A', '#C98A34', '#FFF4DC', '#F0DDB8', '#E5484D'],
      draw: on([
        '...3o55o3...',
        '.3333oo3334.',
        '33533o333534',
        '11111o111112',
        '22222o222222',
      ], 0, 2),
    },
    {
      id: 'halfsies.kebab', game: 'halfsies', slot: 'hat', name: 'Kebab skewer',
      colors: ['#B0643A', '#7A3E1E', '#D88A5A', '#5CB85C', '#2E7D3A', '#F0433A', '#A82020', '#FF9A8A', '#C9CFDA'],
      draw: on([
        '..3111.45.866..',
        '993111945966699',
        '..1222.55.677..',
      ], 0, 2),
    },
    {
      id: 'halfsies.balance', game: 'halfsies', slot: 'buddy', name: 'Mini balance',
      colors: ['#F7F4EE', '#CFC6B6', '#FFFFFF', '#A9B3C2', '#6A7385', '#E8392B', '#FDFCF8', '#2B2B30'],
      art: pet('mini balance', [
        '144144',
        '.8..8.',
        '117712',
        '116712',
        '.8888.',
      ]),
    },
    {
      id: 'halfsies.cake', game: 'halfsies', slot: 'buddy', name: 'Cake slice',
      colors: ['#F5C86A', '#C9953A', '#FFFFFF', '#E8D6C4', '#E5484D', '#D9283A'],
      art: pet('cake slice', [
        '....36',
        '..3334',
        '.11112',
        '555555',
        '111112',
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
  redraw: {},
};
