import { grid16, on, pet, type MachineSet } from '../item-art';

/**
 * Cutsies' machine: the food it slices, the chef's knife hand and the
 * chopping board. Colours follow the game's own objects (public/objects).
 */
export const set: MachineSet = {
  add: [
    // ---------------------------------------------------------------- skins
    {
      id: 'cutsies.donut', game: 'cutsies', slot: 'skin', name: 'Frosted donut', eyes: 9,
      // icing, icing shade, icing light, dough, dough shade, dough light, hole, sprinkles
      colors: ['#FF8FB8', '#E0679A', '#FFC2DA', '#E3A866', '#B97A3E', '#F2C98E', '#8A5428', '#5CC8F0', '#FFE066'],
      outline: '#7A3A2A',
      art: grid16('donut', [
        '................',
        '................',
        '................',
        '....33333333....',
        '..339177771182..',
        '.31111166111112.',
        '.31111111111112.',
        '.39111111111182.',
        '.31111111111112.',
        '.31811111111912.',
        '.21111111111112.',
        '.54411441441145.',
        '..555455545555..',
        '...5555555555...',
        '................',
        '................',
      ]),
    },
    {
      id: 'cutsies.nigiri', game: 'cutsies', slot: 'skin', name: 'Salmon nigiri', eyes: 10,
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
      id: 'cutsies.watermelon', game: 'cutsies', slot: 'skin', name: 'Giant watermelon', eyes: 8, showpiece: true, signature: 'pulse',
      about: 'A whole watermelon, with the one cut that counts.',
      // rind, stripe, rind light, rind shade, -, flesh
      colors: ['#A8DB7A', '#4E9E3A', '#D2F0A8', '#2F6E2E', '#2F6E2E', '#F2454E'],
      outline: '#1F4A22',
      art: grid16('melon', [
        '................',
        '................',
        '................',
        '....12211221....',
        '..666666666666..',
        '.32112211221124.',
        '.32112211221124.',
        '.32112211221124.',
        '.32112211221124.',
        '.32112211221124.',
        '.32112211221124.',
        '.32112211221124.',
        '..442211221144..',
        '....44444444....',
        '................',
        '................',
      ]),
    },

    // ---------------------------------------------------------------- hats
    {
      id: 'cutsies.flag', game: 'cutsies', slot: 'hat', name: '“You” flag', free: true,
      about: 'The cocktail stick flag that marks your slice on the board.',
      // stick, paper, paper shade
      colors: ['#E8D2A8', '#FFFFFF', '#DDE3EA'],
      draw: on([
        '122222',
        '12aa23',
        '133333',
        '1.....',
        '1.....',
      ], 2),
    },
    {
      id: 'cutsies.toadstool', game: 'cutsies', slot: 'hat', name: 'Toadstool',
      colors: ['#E8483B', '#B8302A', '#FFFFFF', '#FFF1DC', '#FF7A6E'],
      draw: on([
        '....5111....',
        '..51133112..',
        '.5111111332.',
        '533111111122',
        '444444444444',
      ]),
    },
    {
      id: 'cutsies.peel', game: 'cutsies', slot: 'hat', name: 'Banana peel',
      // peel, peel shade, inside, tip
      colors: ['#FFD84A', '#E0A920', '#FFF3C4', '#7A5230'],
      draw: on([
        '.....44.....',
        '....1122....',
        '..11333222..',
        '.113.33.322.',
        '14...33...42',
      ]),
    },
    {
      id: 'cutsies.cupcake', game: 'cutsies', slot: 'hat', name: 'Cupcake top',
      // frosting, frosting shade, frosting light, cherry, cherry light, stem
      colors: ['#FF9EC4', '#E0679A', '#FFD0E2', '#E5243B', '#FF8A96', '#5C8A2E'],
      draw: on([
        '.....45.....',
        '....3442....',
        '...311112...',
        '..32222222..',
        '.3111111112.',
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
      colors: ['#C6E05A', '#93B33A', '#E8F59A', '#7A5230', '#5CA83A'],
      art: pet('pear', [
        '...45.',
        '..31..',
        '.3112.',
        '311112',
        '.3122.',
      ]),
    },
    {
      id: 'cutsies.tomato', game: 'cutsies', slot: 'buddy', name: 'Tomato',
      colors: ['#EE3B33', '#B8241F', '#FF8A80', '#4FA93A'],
      art: pet('tomato', [
        '..44..',
        '.34441',
        '311112',
        '311112',
        '.1122.',
      ]),
    },
    {
      id: 'cutsies.corn', game: 'cutsies', slot: 'buddy', name: 'Corn cob',
      colors: ['#FFD23F', '#E0A620', '#FFEC99', '#7CC24A', '#4E8A2E'],
      art: pet('corn cob', [
        '..3131',
        '.41212',
        '443131',
        '.51212',
        '..5...',
      ]),
    },
    {
      id: 'cutsies.eggplant', game: 'cutsies', slot: 'buddy', name: 'Eggplant',
      colors: ['#8A55C8', '#5A2E8C', '#C49BEF', '#5CA83A', '#3E7A26'],
      art: pet('eggplant', [
        '5.....',
        '44331.',
        '443111',
        '.31111',
        '..1122',
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
    'cutsies.board': { name: 'Chopping board' },
    'cutsies.seeds': {
      // An even grid of seeds, each row set half a step along from the last.
      colors: ['#FF9DAF', '#3A1E1A', '#FFC2CC'],
      fill: (x, y) => {
        const row = Math.floor(y / 4), sx = (x + (row % 2) * 2) % 4;
        if (sx === 1 && y % 4 === 1) return 2;
        if (sx === 1 && y % 4 === 2) return 3;
        return 1;
      },
    },
  },
};
