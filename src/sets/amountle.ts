import { grid16, on, pet, type MachineSet } from '../item-art';

/**
 * Amountle's machine: the jars, the jellybeans in today's jar and the
 * winners club's crown. Every item is something in the game.
 */
export const set: MachineSet = {
  add: [
    {
      id: 'amountle.bean', game: 'amountle', slot: 'skin', name: 'Jellybean', eyes: 8,
      colors: ['#FF6F9C', '#D9466F', '#FFB3CB', '#FFFFFF', '#B02E55'],
      outline: '#6E1634',
      art: grid16('jellybean', [
        '................',
        '................',
        '................',
        '..3344..........',
        '.334411.........',
        '.3311111........',
        '.31111111111....',
        '.1111111111112..',
        '.21111111111112.',
        '.22111111111112.',
        '..2211111111132.',
        '....22111111122.',
        '.......2222222..',
        '................',
        '................',
        '................',
      ]),
    },
    {
      id: 'amountle.todays-jar', game: 'amountle', slot: 'skin', name: 'Today’s jar', eyes: 7,
      showpiece: true, signature: 'holo',
      about: 'One guess a day.',
      colors: ['#EAF7F8', '#BFE1E7', '#FFFFFF', '#FF5C8A', '#FFD447', '#3FD1C1', '#8C7CF0', '#FF8A3D', '#7DD87A'],
      outline: '#2F6870',
      art: grid16('todays jar', [
        '................',
        '................',
        '....22222222....',
        '....31111112....',
        '...3111111112...',
        '..311111111112..',
        '.34411111111882.',
        '.31511111111192.',
        '.36511111111792.',
        '.36177188155712.',
        '.39914416619982.',
        '.31551771441662.',
        '..881991551772..',
        '...2441661882...',
        '....22222222....',
        '................',
      ]),
    },
    {
      id: 'amountle.lid', game: 'amountle', slot: 'hat', name: 'Jar lid',
      colors: ['#FFD25A', '#C98A1A', '#FFF1B0', '#8A5A10'],
      draw: on([
        '..33333333..',
        '.3111111112.',
        '141414141412',
        '242424242424',
      ], 0, 2),
    },
    {
      id: 'amountle.gem-pile', game: 'amountle', slot: 'hat', name: 'Gem pile',
      colors: ['#3FD1C1', '#1F9C90', '#A6F4EA', '#FFFFFF', '#DCE2EA', '#FFB3CB', '#FF6F9C', '#A9B3C2', '#C94B76'],
      draw: on([
        '....666....',
        '.45o779o31.',
        '.58o779o12.',
        '31o45o31o45',
        '12o58o12o58',
      ], 0, 2),
    },
    {
      id: 'amountle.coin', game: 'amountle', slot: 'hat', name: 'Gold coin',
      colors: ['#FFD25A', '#C98A1A', '#FFF1B0', '#7A4A08', '#A86E12'],
      draw: on([
        '.3314.',
        '311125',
        '311214',
        '312215',
        '112224',
        '.1224.',
      ], 1, 2),
    },
    {
      id: 'amountle.play-coin', game: 'amountle', slot: 'buddy', name: 'Play coin',
      colors: ['#FFFFFF', '#C9D1DC', '#EEF2F7', '#2F7BF5', '#8A95A8'],
      art: pet('play coin', [
        '.3311.',
        '314112',
        '314412',
        '314122',
        '.1225.',
      ]),
    },
    {
      id: 'amountle.candy-corn', game: 'amountle', slot: 'buddy', name: 'Candy corn',
      colors: ['#FFF6E0', '#E6D6B8', '#FF7A2E', '#D9561A', '#FFC23A', '#E09A12'],
      art: pet('candy corn', [
        '...1..',
        '..112.',
        '.3334.',
        '.55556',
        '555566',
      ]),
    },
    {
      id: 'amountle.jar-glass', game: 'amountle', slot: 'frame', name: 'Jar glass',
      colors: ['#D9F1EF', '#F4FCFB', '#C8E8E5'],
      fill: (x, y) => {
        const d = (x + y) % 16;
        return d === 4 || d === 5 ? 2 : d === 7 ? 3 : 1;
      },
    },
    {
      id: 'amountle.shelf', game: 'amountle', slot: 'frame', name: 'Shelf',
      colors: ['#FFF6E6', '#D9A877', '#B98552', '#FFD25A', '#3FD1C1'],
      fill: (x, y) => {
        const r = y % 8;
        if (r === 7) return 3;
        if (r === 6) return x % 4 === 1 ? ((x + y) % 8 === 1 || (x + y) % 8 === 7 ? 4 : 5) : 2;
        return 1;
      },
    },
  ],
  retire: [
    'amountle.piggy', 'amountle.dragon', 'amountle.cluster', 'amountle.coin-stack', 'amountle.gumball-dome',
    'amountle.sparkle', 'amountle.coins', 'amountle.piglet', 'amountle.mimic',
  ],
  redraw: {
    'amountle.gem': {
      draw: on([
        '....wwaA....',
        '...waaaaA...',
        '....aaAA....',
        '.....aA.....',
        '312121212123',
      ], 0, 2),
    },
    'amountle.jar': {
      art: grid16('jar', [
        '................',
        '................',
        '....44444444....',
        '....45454545....',
        '...3111111112...',
        '...3111111112...',
        '...3111111112...',
        '...6111111117...',
        '...7111111118...',
        '...6861186168...',
        '...7686768676...',
        '...6878687868...',
        '...5767576757...',
        '....55555555....',
        '................',
        '................',
      ]),
    },
    'amountle.crown': {
      name: 'Winners crown',
      colors: ['#FFD25A', '#D99A1E', '#FFF1B0', '#A8700E'],
      draw: on([
        '3....3....3',
        '13..313..12',
        '11131113112',
        '11111111112',
        '22222222224',
      ], 0, 2),
    },
    'amountle.beans': {
      colors: ['#FFF6E6', '#FF5C8A', '#FFD447', '#3FD1C1', '#8C7CF0', '#C9416A', '#D9A21E', '#1F9C90', '#5E4EC0'],
      fill: (x, y) => {
        // Four beans a tile, each a tilted pair of rows in its own flavour, lit on top.
        const beans = [[1, 1, 2], [12, 2, 3], [0, 10, 4], [13, 12, 5]];
        const tx = x % 16, ty = y % 16;
        for (const [bx, by, c] of beans) {
          if (ty === by && (tx === bx + 1 || tx === bx + 2)) return c;
          if (ty === by + 1 && (tx === bx || tx === bx + 1)) return c + 4;
        }
        return 1;
      },
    },
  },
};
