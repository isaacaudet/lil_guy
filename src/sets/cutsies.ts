import { backdrop, grid16, on, pet, type MachineSet } from '../item-art';

/**
 * Cutsies' machine: the food it slices, the chef's knife hand and the
 * chopping board. Colours follow the game's own objects (public/objects).
 */
export const set: MachineSet = {
  add: [
    // ---------------------------------------------------------------- skins
    {
      id: 'cutsies.donut', game: 'cutsies', slot: 'skin', name: 'Donut floatie', eyes: 8,
      // icing, icing shade, icing light, dough, dough shade, dough light, -, blue sprinkle, yellow sprinkle
      colors: ['#FF8FB8', '#E0679A', '#FFC2DA', '#E3A866', '#B97A3E', '#F2C98E', '#8A5428', '#5CC8F0', '#FFE066'],
      outline: '#7A3A2A',
      art: grid16('donut floatie', [
        '................',
        '................',
        '.....hh###......',
        '....h######s....',
        '...h########s...',
        '..h##########s..',
        '..h##########s..',
        '..############..',
        '..###########s..',
        '..###########s..',
        '.###########sss.',
        '.31181191181192.',
        '.21141144141142.',
        '..554555545554..',
        '................',
        '................',
      ]),
    },
    {
      id: 'cutsies.nigiri', game: 'cutsies', slot: 'skin', name: 'Salmon nigiri', eyes: 10, limb: 1,
      // rice, rice shade, rice light, salmon, salmon shade, fat stripe, salmon light
      colors: ['#FFFDF6', '#E6E0D2', '#F7F3EA', '#FF8A5B', '#E0663A', '#FFD6BF', '#FFAB82'],
      outline: '#7A3A24',
      art: grid16('nigiri', [
        '................',
        '................',
        '................',
        '....764446444...',
        '..776444644465..',
        '.74644464446445.',
        '.46444644464445.',
        '.55555555555555.',
        '.52222222222225.',
        '..311111111112..',
        '..311111111112..',
        '..311111111112..',
        '..311111111112..',
        '..322222222222..',
        '................',
        '................',
      ]),
    },
    {
      id: 'cutsies.watermelon', game: 'cutsies', slot: 'skin', name: 'Watermelon suit', eyes: 9, limb: 5, showpiece: true, signature: 'pulse',
      // rind, rind stripe, rind light, white rind, flesh, flesh shade, seed, flesh light
      colors: ['#8ED45C', '#2F6E2E', '#C9F08F', '#F4FBE8', '#F2454E', '#C42A36', '#2A1B10', '#FF7A80'],
      outline: '#1F4A22',
      art: grid16('watermelon suit', [
        '................',
        '................',
        '.....312211.....',
        '...3211221122...',
        '..322112211221..',
        '..322112211221..',
        '..444444444444..',
        '..58h######s65..',
        '..5##########5..',
        '..5##########6..',
        '..5#########s6..',
        '..65s######s56..',
        '...6758575856...',
        '....66555566....',
        '................',
        '................',
      ]),
    },

    // ---------------------------------------------------------------- hats
    {
      id: 'cutsies.flag', game: 'cutsies', slot: 'hat', name: 'Chef’s headband', free: true,
      about: 'Tied on before the first cut.',
      // band, band shade
      colors: ['#FFFFFF', '#D5DCE6'],
      draw: on([
        '..........1.1',
        '..........11.',
        '11111aa11111.',
        '22222AA22222.',
      ]),
    },
    {
      id: 'cutsies.toadstool', game: 'cutsies', slot: 'hat', name: 'Toadstool',
      // cap, cap shade, spot, underside, cap light
      colors: ['#E8483B', '#B8302A', '#FFFFFF', '#FFF1DC', '#FF7A6E'],
      draw: on([
        '...511331...',
        '.5133111112.',
        '511111133112',
        '444444444444',
      ]),
    },
    {
      id: 'cutsies.peel', game: 'cutsies', slot: 'hat', name: 'Banana peel',
      about: 'What’s left once the banana’s been cut.',
      // peel, peel shade, inside, stalk, peel light
      colors: ['#FFE04A', '#D9A11E', '#FFF6D2', '#5C3A1E', '#FFF19A'],
      draw: on([
        '.....44.....',
        '....5112....',
        '.5513333122.',
        '51..1332..12',
      ]),
    },
    {
      id: 'cutsies.cupcake', game: 'cutsies', slot: 'hat', name: 'Cupcake',
      // frosting, frosting shade, frosting light, cherry, cherry light, wrapper, wrapper shade
      colors: ['#FF9EC4', '#E0679A', '#FFD0E2', '#E5243B', '#FF8A96', '#7AC8F0', '#4A9ACC'],
      draw: on([
        '.....54.....',
        '...311112...',
        '.3112211222.',
        '..67676767..',
      ]),
    },

    // ---------------------------------------------------------------- frames
    {
      id: 'cutsies.lineup', game: 'cutsies', slot: 'frame', name: 'Slice line-up',
      colors: ['#FFE4DC', '#FFC7B5', '#FFB39C'],
      fill: (x, y) => {
        // Three slices, each smaller than the last, along the top and again along the bottom.
        const slices: [number, number, number][] = [[3, 2.5, 2.1], [8, 2.5, 1.6], [12, 2.5, 1.1], [3, 13, 2.1], [8, 13, 1.6], [12, 13, 1.1]];
        for (const [cx, cy, r] of slices) {
          const d = Math.hypot(x - cx, y - cy);
          if (d <= r - 0.6) return 2;
          if (d <= r + 0.4) return 3;
        }
        return 1;
      },
    },

    // ---------------------------------------------------------------- buddies
    {
      id: 'cutsies.pear', game: 'cutsies', slot: 'buddy', name: 'Pear',
      // pear, shade, light, stem, leaf
      colors: ['#C6E05A', '#93B33A', '#E8F59A', '#7A5230', '#5CA83A'],
      art: pet('pear', [
        '..45..',
        '.3112.',
        '311112',
        '3o11o2',
        '.1122.',
      ]),
    },
    {
      id: 'cutsies.tomato', game: 'cutsies', slot: 'buddy', name: 'Tomato',
      colors: ['#EE3B33', '#B8241F', '#FF8A80', '#4FA93A'],
      art: pet('tomato', [
        '..44..',
        '.34441',
        '3o11o2',
        '311112',
        '.1122.',
      ]),
    },
    {
      id: 'cutsies.corn', game: 'cutsies', slot: 'buddy', name: 'Corn cob',
      // kernel, kernel shade, kernel light, husk, husk shade
      colors: ['#FFD23F', '#E0A620', '#FFEC99', '#7CC24A', '#4E8A2E'],
      art: pet('corn cob', [
        '..32..',
        '.3132.',
        '4o11o5',
        '441255',
        '.4455.',
      ]),
    },
    {
      id: 'cutsies.eggplant', game: 'cutsies', slot: 'buddy', name: 'Eggplant',
      // purple, shade, light, cap, cap shade
      colors: ['#8A55C8', '#5A2E8C', '#C49BEF', '#5CA83A', '#3E7A26'],
      art: pet('eggplant', [
        '..44..',
        '.4554.',
        '.3112.',
        '3o11o2',
        '.1122.',
      ]),
    },
  ],
  retire: [
    'cutsies.melon', 'cutsies.toast', 'cutsies.ninja',
    'cutsies.slice', 'cutsies.orange', 'cutsies.banana', 'cutsies.kabuto',
    'cutsies.slices',
    'cutsies.seedling', 'cutsies.cherries', 'cutsies.pineapple', 'cutsies.shadow',
  ],
  redraw: {
    'cutsies.kiwi': {
      name: 'Kiwi hoodie', eyes: 9, limb: 1,
      about: 'Fuzzy outside, cut open round the face.',
      // fuzz, fuzz shade, fuzz light, flesh, flesh light, seed
      colors: ['#B88A5A', '#8E6438', '#D9AE7E', '#86CF55', '#C9F08F', '#2A1B10'],
      outline: '#4E3420',
      art: grid16('kiwi hoodie', [
        '................',
        '................',
        '................',
        '....33111112....',
        '...3311111112...',
        '..314464646412..',
        '..14h######s41..',
        '..14h######s41..',
        '..14########41..',
        '..14########41..',
        '..14#######s41..',
        '..214s####s412..',
        '...2144444412...',
        '....22111122....',
        '................',
        '................',
      ]),
    },
    'cutsies.strawberry': {
      name: 'Strawberry hoodie', eyes: 9, limb: 1,
      // red, red shade, red light, seed, leaf, leaf shade, leaf light
      colors: ['#E8343F', '#B01E2A', '#FF6E78', '#FFE07A', '#5CB83A', '#3E8A26', '#9AE070'],
      outline: '#5A0E16',
      art: grid16('strawberry hoodie', [
        '................',
        '.......56.......',
        '...57.7557.75...',
        '..556555555655..',
        '..314111411412..',
        '..311141111112..',
        '..31h######s12..',
        '..4h########s2..',
        '..1##########2..',
        '..1##########4..',
        '..2#########s2..',
        '..21s######s12..',
        '...2141141412...',
        '.....222222.....',
        '................',
        '................',
      ]),
    },
    'cutsies.seeds': {
      name: 'Melon slice',
      // flesh, seed, white rind, rind, rind shade, flesh light
      colors: ['#FF8FA3', '#3A1E1A', '#FFF4E0', '#A8DB7A', '#4E9E3A', '#FFB3C0'],
      fill: (x, y) => {
        const X = ((x % 16) + 16) % 16, Y = ((y % 16) + 16) % 16;
        // The guy stands on the slice: white, then the green rind, along the foot.
        if (Y === 13) return 3;
        if (Y === 14) return 4;
        if (Y === 15) return 5;
        // A few seeds down each side, clear of the guy: a dark drop with a glint of flesh above it.
        for (const [sx, sy] of [[1, 2], [13, 1], [2, 7], [14, 5], [1, 11], [13, 10]]) {
          if (X === sx && (Y === sy || Y === sy + 1)) return 2;
          if (X === sx && Y === sy - 1) return 6;
        }
        return 1;
      },
    },
    'cutsies.chef': {
      // Tall and pleated, the puff wider than the band.
      draw: on([
        '.33.333.33.',
        '33333333312',
        '.311111122.',
        '..1212121..',
        '..4444444..',
      ]),
      colors: ['#F7F9FC', '#D5DCE6', '#FFFFFF', '#B9C4D2'],
    },
    'cutsies.board': {
      name: 'Chopping board',
      // wood, grain, wood light, hole, blade, blade shade, handle, tomato, tomato flesh
      colors: ['#E6BE86', '#CC9C5E', '#F6DDB2', '#6B4528', '#F2F5F9', '#A7B1BF', '#3E3440', '#E5483D', '#FFB59A'],
      // The board he's chopping on: its grain, the hole to hang it by, the knife down one side and a
      // tomato slice in the other corner.
      fill: backdrop('chopping board', [
        '................',
        '.44...........5.',
        '.44..222222...56',
        '.33...........56',
        '.........2222.56',
        '..............56',
        '222222........56',
        '..............66',
        '..............77',
        '..............73',
        '..............77',
        '................',
        '.....88.........',
        '....8998..222222',
        '.....88.........',
        '22222...........',
      ]),
    },
  },
};

