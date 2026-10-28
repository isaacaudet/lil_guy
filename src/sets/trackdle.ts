import { grid16, on, pet, type MachineSet } from '../item-art';

/**
 * Trackdle's machine: its drivers and crew, its die-cast cars and what
 * stands round the track, on its snow and canyon tracks too.
 * The livery is the game's own: Tangerine #ED6137 with cream #FFF4DC stripes,
 * toy-black tyres, orange ramps with a cream chevron, a cream band on a cone.
 */

export const set: MachineSet = {
  add: [
    // ---------------------------------------------------------------- skins
    // Every skin is a guy in costume: his own face (and colour) looks out of
    // the suit, and his arms and feet come out of its sleeves.
    {
      id: 'trackdle.coupe', game: 'trackdle', slot: 'skin', name: 'Pit crew', eyes: 9, limb: 1,
      // overalls, shade, light, cream buttons, headset, ear cup, mic tip
      colors: ['#ED6137', '#B8441F', '#F7905F', '#FFF4DC', '#2B2F38', '#6B7380', '#E5323B'],
      outline: '#4A1A0A',
      art: grid16('pit crew', [
        '................',
        '................',
        '................',
        '.....555555.....',
        '...55h####s55...',
        '..5h########s5..',
        '..5##########5..',
        '.66##########66.',
        '.61##########16.',
        '.66##########66.',
        '..5##########s..',
        '..s57#######ss..',
        '..211411114112..',
        '...2111111112...',
        '................',
        '................',
      ]),
    },
    {
      id: 'trackdle.van', game: 'trackdle', slot: 'skin', name: 'Snow parka', eyes: 9, limb: 1,
      about: 'For the snow tracks.',
      // parka, shade, light, fur, fur shade, zip
      colors: ['#ED6137', '#B8441F', '#F7905F', '#FFF8EA', '#E3D3B0', '#5A1E0C'],
      outline: '#4A1A0A',
      art: grid16('snow parka', [
        '................',
        '................',
        '................',
        '....33111111....',
        '...3311111112...',
        '..311444444112..',
        '..144h####s441..',
        '..14h######s42..',
        '..4##########4..',
        '..4##########5..',
        '..4#########s5..',
        '..54s######s45..',
        '..215444444512..',
        '...2211611122...',
        '................',
        '................',
      ]),
    },
    {
      id: 'trackdle.buggy', game: 'trackdle', slot: 'skin', name: 'Dune rider', eyes: 9, limb: 1,
      about: 'For the canyon tracks.',
      // wrap, wrap shade, wrap light, goggle frame, lens, lens glint, scarf, scarf shade
      colors: ['#E8C98F', '#C9A26A', '#F6E3B8', '#3A3F48', '#3FA9C9', '#BFF0FF', '#D93A2B', '#A8231A'],
      outline: '#4A2A10',
      art: grid16('dune rider', [
        '................',
        '................',
        '.....333111.....',
        '...3311211112...',
        '..445654456544..',
        '..215551155512..',
        '..321112111122..',
        '..21h######s12..',
        '..1##########2..',
        '..1##########2..',
        '..2#########s2..',
        '..27s######s72..',
        '..877777777778..',
        '...2228782222...',
        '................',
        '................',
      ]),
    },
    {
      id: 'trackdle.formula', game: 'trackdle', slot: 'skin', name: 'Formula 07', eyes: 8, limb: 1, showpiece: true, signature: 'embers',
      about: 'No. 07’s driver, visor up.',
      // suit, shade, light, cream stripe, visor, visor glint, gold
      colors: ['#ED6137', '#B8441F', '#F7905F', '#FFF4DC', '#2B2F38', '#7FB6D8', '#F2C230'],
      outline: '#3A1408',
      art: grid16('formula 07', [
        '................',
        '......3441......',
        '....33144111....',
        '...3311441112...',
        '..356555555552..',
        '..31h######112..',
        '..3h########s2..',
        '..1h#########2..',
        '..1##########2..',
        '..1#########s2..',
        '..12########22..',
        '..244s####s442..',
        '..211714411112..',
        '...2211441122...',
        '................',
        '................',
      ]),
    },

    // ---------------------------------------------------------------- hats
    {
      id: 'trackdle.lights', game: 'trackdle', slot: 'hat', name: 'Cowboy hat',
      about: 'For the canyon tracks.',
      // felt, felt shade, felt light, band
      colors: ['#A8743F', '#7A5230', '#C99A63', '#ED6137'],
      draw: on([
        '....311.112...',
        '....3111112...',
        '3...4444444..2',
        '31111111111122',
      ]),
    },
    {
      id: 'trackdle.spoiler', game: 'trackdle', slot: 'hat', name: 'Boost flame',
      about: 'Hit a boost pad and it catches.',
      // flame, deep flame, yellow, white-hot core
      colors: ['#FF7A2F', '#E5323B', '#FFD23F', '#FFF4C2'],
      draw: on([
        '...2.....2..',
        '..21..2..12.',
        '.2131.21.312',
        '213431213431',
        '213444444312',
      ]),
    },
    {
      id: 'trackdle.surfboard', game: 'trackdle', slot: 'hat', name: 'Bobble hat',
      about: 'For the snow tracks.',
      // knit, knit shade, cream, cream shade, knit light
      colors: ['#ED6137', '#B8441F', '#FFF4DC', '#E3CFA6', '#F7905F'],
      draw: on([
        '....3334....',
        '...511112...',
        '..33333334..',
        '.5111111112.',
        '343434343434',
      ]),
    },
    {
      id: 'trackdle.finish', game: 'trackdle', slot: 'hat', name: 'Chequered bandana',
      // black, white, white shade
      colors: ['#23262D', '#F4F4F4', '#C9CFD8'],
      draw: on([
        '...2112211....',
        '..221122112...',
        '.21122112211..',
        '22112211221112',
      ]),
    },

    // ---------------------------------------------------------------- frames
    {
      id: 'trackdle.boost', game: 'trackdle', slot: 'frame', name: 'Boost pad',
      colors: ['#143049', '#9C8545'],
      fill: (x, y) => {
        // The pad's tiles run down each side, a small chevron on each, pointing the way the pad throws you.
        for (const cy of [2, 7, 12]) for (const cx of [2, 13]) {
          const dx = x - cx, dy = y - cy;
          if (Math.abs(dy) <= 1 && (dx === -Math.abs(dy) || dx === 1 - Math.abs(dy))) return 2;
        }
        return 1;
      },
    },

    // ---------------------------------------------------------------- buddies
    {
      id: 'trackdle.tyres', game: 'trackdle', slot: 'buddy', name: 'Tyre stack',
      // Three tyres off the barrier, the middle one painted red and white with a face on it.
      // rubber, rubber shine, hole, rim, white, red, red shade
      colors: ['#3E4450', '#6A7382', '#1A1D24', '#9AA2AE', '#F2F4F7', '#E5484D', '#A8202F'],
      art: pet('tyre stack', [
        '.244442.',
        '24333342',
        '21444412',
        '65555556',
        '65o55o57',
        '76555677',
        '21212121',
        '.111111.',
      ]),
    },
    {
      id: 'trackdle.ramp', game: 'trackdle', slot: 'buddy', name: 'Lil racer',
      about: 'A pocket-sized No. 07.',
      // body, shade, light, glass, tyre, headlight, glass light
      colors: ['#ED6137', '#B8441F', '#F7905F', '#CFE6EE', '#23262D', '#FFE7A0', '#FFFFFF'],
      art: pet('lil racer', [
        '..3311..',
        '.374442.',
        '.4o44o4.',
        '33111112',
        '61122116',
        '11111122',
        '55....55',
      ]),
    },
    {
      id: 'trackdle.cactus', game: 'trackdle', slot: 'buddy', name: 'Saguaro',
      // green, shade, light, flower, flower centre
      colors: ['#4F9B62', '#2F6B40', '#8ED07A', '#FF8FB8', '#FFE07A'],
      art: pet('saguaro', [
        '...454..',
        '..33112.',
        '..3o1o2.',
        '3.31112.',
        '33311122',
        '..311.22',
        '..31112.',
        '..31112.',
      ]),
    },
  ],
  retire: [
    'trackdle.racer', 'trackdle.stopwatch', 'trackdle.tyre', 'trackdle.rocket',
    'trackdle.helmet', 'trackdle.trophy', 'trackdle.goggles', 'trackdle.f1',
    'trackdle.flag',
    'trackdle.snail', 'trackdle.kart', 'trackdle.hare',
  ],
  redraw: {
    'trackdle.conelet': {
      // cone, shade, cream band, light, base, cream shade
      colors: ['#FF8A3D', '#D9621E', '#FFF4DC', '#FFB27A', '#3A3F48', '#E6D5B3'],
      art: pet('conelet', [
        '...41...',
        '..4112..',
        '..3336..',
        '.4o11o2.',
        '.411112.',
        '.333336.',
        '41111112',
        '55555555',
      ]),
    },
    'trackdle.cone': {
      name: 'Cone suit', eyes: 9, limb: 1,
      // cone, shade, cream band, light, base, cream shade
      colors: ['#FF8A3D', '#D9621E', '#FFF4DC', '#FFB27A', '#2B2F38', '#E6D5B3'],
      art: grid16('cone suit', [
        '................',
        '.......41.......',
        '......4112......',
        '......3336......',
        '.....411112.....',
        '.....411112.....',
        '....33333336....',
        '...41######12...',
        '..41h#######12..',
        '..41########12..',
        '..41########12..',
        '..41s######s12..',
        '..333333333336..',
        '.55555555555555.',
        '................',
        '................',
      ]),
    },
    'trackdle.cap': {
      // A team cap in the guy's own colour, a white panel on the front.
      colors: ['#23262D', '#FFFFFF'],
      draw: on([
        '....aaaA....',
        '..aa2222aA..',
        '.aaa2112aaA.',
        '.aaaaaaaaaAA',
        'AAAAAAAAAAAA',
      ]),
    },
    'trackdle.tarmac': {
      name: 'Canyon sunset',
      // sky, low sky, sun, mesa, mesa shade, glow
      colors: ['#FFC49A', '#FFA978', '#FFF4CC', '#C8613D', '#9E4630', '#FF8F62'],
      fill: (x, y) => {
        const X = ((x % 16) + 16) % 16, Y = ((y % 16) + 16) % 16;
        if (Math.hypot(X - 3.5, Y - 3.5) <= 2.2) return 3;
        // Flat-topped mesas along the foot, each lit on the left and shaded on the right.
        const top = [11, 11, 11, 11, 13, 13, 12, 12, 12, 14, 14, 10, 10, 10, 10, 13][X];
        if (Y >= top) return [3, 8, 14].includes(X) ? 5 : 4;
        return Y < 6 ? 1 : Y < 10 ? 2 : 6;
      },
    },
  },
};
