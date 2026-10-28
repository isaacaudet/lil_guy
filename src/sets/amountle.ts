import { grid16, on, pet, type MachineSet } from '../item-art';

/**
 * Amountle's machine: the jars, the jellybeans in today's jar and the
 * winners club's crown. Every item is something in the game.
 */
export const set: MachineSet = {
  add: [
    {
      id: 'amountle.bean', game: 'amountle', slot: 'skin', name: 'Jellybean', eyes: 9, limb: 2,
      // A jellybean onesie: the bean's glossy kidney shape for a hood, its shine down one side, his own
      // face looking out of it.
      colors: ['#FF6F9C', '#D9466F', '#FFB3CB', '#FFFFFF', '#B02E55'],
      outline: '#6E1634',
      art: grid16('jellybean', [
        '................',
        '......331112....',
        '....3344111112..',
        '...344111111112.',
        '..3441111111112.',
        '..341h####s1112.',
        '..31h######s12..',
        '..1h########s2..',
        '..1##########2..',
        '..1##########2..',
        '..1#########s2..',
        '.31s########s2..',
        '.321s######s12..',
        '..2215ssss512...',
        '...22222222.....',
        '................',
      ]),
    },
    {
      id: 'amountle.todays-jar', game: 'amountle', slot: 'skin', name: 'Today’s jar', eyes: 8,
      showpiece: true, signature: 'holo',
      about: 'One guess a day.',
      // The guy's whole round head in today's candy jar, its gold knob lid on, the jellybeans heaped up
      // round his chin. glass, glass shade, shine, lid, lid shade, then pink, yellow, teal and violet beans
      colors: ['#EAF7F8', '#BFE1E7', '#FFFFFF', '#FFD25A', '#C98A1A', '#FF5C8A', '#FFD447', '#3FD1C1', '#8C7CF0'],
      outline: '#2F6870',
      art: grid16('todays jar', [
        '................',
        '.......45.......',
        '....44444445....',
        '...3111111112...',
        '..311oooooo112..',
        '.311ohh####o112.',
        '.31oh#######o12.',
        '.3oh#########o2.',
        '.3o##########o2.',
        '.6o##########o7.',
        '.6o#########so7.',
        '.78os######so67.',
        '.88996677889966.',
        '.67788996677889.',
        '..222222222222..',
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
      id: 'amountle.gem-pile', game: 'amountle', slot: 'hat', name: 'Gumball globe',
      // The top of a gumball machine, full, with its red cap.
      colors: ['#E8F7FB', '#B8DCE6', '#FF5C6A', '#FFD447', '#5FB4FF', '#7DD87A', '#FFFFFF', '#E5363D', '#A8202A'],
      draw: on([
        '..7111..',
        '.735461.',
        '13645362',
        '.988889.',
      ], 0, 2),
    },
    {
      id: 'amountle.coin', game: 'amountle', slot: 'hat', name: 'Wrapped sweet',
      // A peppermint from today's jar, still in its twist of cellophane, worn like a bow.
      colors: ['#FFC2DA', '#F07AA8', '#FFE3EE', '#E5363D', '#FFFFFF', '#B8202A'],
      draw: on([
        '1..454..1',
        '12.545.21',
        '1224542 21'.replace(' ',''),
        '...646...',
      ], 0, 2),
    },
    {
      id: 'amountle.play-coin', game: 'amountle', slot: 'buddy', name: 'Lil jar',
      // A tiny jar of jellybeans that follows you about.
      colors: ['#DDF2F6', '#A8D8E0', '#FF6F9C', '#FFD25A', '#FFD447', '#3FD1C1', '#8C7CF0', '#C98A1A'],
      art: pet('lil jar', [
        '.4448.',
        '311112',
        '1o11o2',
        '357632',
        '.7536.',
      ]),
    },
    {
      id: 'amountle.candy-corn', game: 'amountle', slot: 'buddy', name: 'Candy corn',
      colors: ['#FFF6E0', '#E6D6B8', '#FF7A2E', '#D9561A', '#FFC23A', '#E09A12'],
      art: pet('candy corn', [
        '..12..',
        '.1112.',
        '3o33o4',
        '333344',
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
    'amountle.crystal': {
      eyes: 8,
      // The guy's whole round head inside a cut gem: its table and crown facets catching the light
      // over him, the pavilion narrowing to its point under his chin.
      colors: ['#8CEBDF', '#3FBFB0', '#D2FFF8', '#FFFFFF', '#23897D'],
      outline: '#14524C',
      art: grid16('crystal', [
        '................',
        '......4331......',
        '.....433112.....',
        '....43331112....',
        '...433oooo112...',
        '..43ohh####o12..',
        '.43oh#######o12.',
        '.31o########o12.',
        '.31o########o22.',
        '.11o#######so22.',
        '..11os####so22..',
        '...511oooo225...',
        '....51112225....',
        '.....521225.....',
        '......5522......',
        '................',
      ]),
    },
    'amountle.gemling': {
      art: pet('gemling', [
        '.5311.',
        '331112',
        '1o11o2',
        '.1124.',
        '..24..',
      ]),
    },
    'amountle.gem': {
      draw: on([
        '....wwaA....',
        '...waaaaA...',
        '....aaAA....',
        '.....aA.....',
        '312121212123',
      ], 0, 2),
    },
    'amountle.gumball': {
      eyes: 7, limb: 5,
      // glass, glass shade, shine, red, red shade, then yellow, teal and pink gumballs, and the coin dial
      colors: ['#EAF6FA', '#C5DDE6', '#FFFFFF', '#E5484D', '#B83236', '#FFD447', '#3FD1C1', '#FF7AA8', '#D9DEE6'],
      outline: '#5A1A22',
      // The guy's whole round head in the globe, gumballs packed into its corners round him, the red
      // stand with its coin dial and chute for a body.
      art: grid16('gumball machine', [
        '................',
        '.......45.......',
        '.....311112.....',
        '....6oooooo8....',
        '...7ohh####o8...',
        '.36oh#######o71.',
        '.1oh#########o2.',
        '.1o##########o2.',
        '.7o#########so8.',
        '.68os######so76.',
        '..86os####so67..',
        '..444444444445..',
        '..449944455445..',
        '..449944455445..',
        '...5555555555...',
        '................',
      ]),
    },
    'amountle.jar': {
      eyes: 8, limb: 5,
      // glass, glass shade, shine, lid, lid shade, then teal, pink, yellow and violet gems
      colors: ['#E3F5F7', '#9CCFD8', '#FFFFFF', '#2E9C94', '#217A73', '#3FD1C1', '#FF5C8A', '#FFD447', '#8C7CF0'],
      outline: '#2F6870',
      // The guy's whole round head shut in a jar, its lid screwed on and the gems piled up to his chin.
      art: grid16('jar', [
        '................',
        '...4545454545...',
        '...4444444444...',
        '..311111111112..',
        '.3111oooooo1112.',
        '.311ohh####o112.',
        '.31oh#######o12.',
        '.3oh#########o2.',
        '.3o##########o2.',
        '.1o##########o2.',
        '.1o#########so2.',
        '.67os######so76.',
        '.89678967896789.',
        '.76897689768976.',
        '..222222222222..',
        '................',
      ]),
    },
    'amountle.crown': {
      name: 'Winners crown',
      // The winners club's crown: pearls on its points, red velvet inside, a jewel in front.
      colors: ['#FFD25A', '#D99A1E', '#FFF1B0', '#A8700E', '#E5484D', '#3FD1C1', '#FFFFFF', '#B8203A'],
      draw: on([
        '7....7....7',
        '18883138812',
        '13161516132',
        '22222222224',
      ]),
    },
    'amountle.beans': {
      colors: ['#FFF6E6', '#FF5C8A', '#FFD447', '#3FD1C1', '#8C7CF0', '#FF8A3D', '#7DD87A', '#FFFFFF'],
      fill: (x, y) => {
        // Fat beans on the jar's cream, staggered like a pile, each a tilted pair of rows with a shine.
        const row = Math.floor(y / 5), ty = y % 5;
        const shift = row % 2 ? 4 : 0, col = Math.floor((x + shift) / 8), tx = (x + shift) % 8;
        const flavour = 2 + ((col * 3 + row * 5) % 6 + 6) % 6;
        if (ty === 1 && tx >= 2 && tx <= 4) return tx === 2 ? 8 : flavour;
        if (ty === 2 && tx >= 1 && tx <= 3) return flavour;
        return 1;
      },
    },
  },
};
