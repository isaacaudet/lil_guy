import { grid16, on, pet, type MachineSet } from '../item-art';

/**
 * Trackdle's machine: its die-cast cars and what stands round the track.
 * The livery is the game's own: Tangerine #ED6137 with cream #FFF4DC stripes,
 * toy-black tyres, orange ramps with a cream chevron, a cream band on a cone.
 */

export const set: MachineSet = {
  add: [
    // ---------------------------------------------------------------- skins
    {
      id: 'trackdle.coupe', game: 'trackdle', slot: 'skin', name: 'Coupe', eyes: 7,
      about: 'The starter car, No. 07, in Tangerine with cream stripes.',
      // body, shade, light, cream stripe, glass, tail light, tyre, hub, headlight
      colors: ['#ED6137', '#B8441F', '#F7905F', '#FFF4DC', '#CFE6EE', '#D93A2B', '#23262D', '#6B7380', '#FFE7A0'],
      outline: '#5A1E0C',
      art: grid16('coupe', [
        '................',
        '................',
        '................',
        '.....4444444....',
        '...3155555551...',
        '.7315555555551..',
        '.3115555555551..',
        '.31155555555144.',
        '.61111111114419.',
        '.31111111117412.',
        '.22772222227722.',
        '..7887....7887..',
        '..7887....7887..',
        '...77......77...',
        '................',
        '................',
      ]),
    },
    {
      id: 'trackdle.van', game: 'trackdle', slot: 'skin', name: 'Surf van', eyes: 8,
      // body, shade, light, cream roof, cream shade, glass, tyre, hub, glint
      colors: ['#E8692F', '#B34A1C', '#F79461', '#FFF4DC', '#E3D3B0', '#2E3E4E', '#23262D', '#6B7380', '#8FB3C9'],
      outline: '#5A1E0C',
      art: grid16('surf van', [
        '................',
        '................',
        '..444444444444..',
        '.44444444444445.',
        '.31661666616662.',
        '.31691666619662.',
        '.31111111111112.',
        '.31111111111114.',
        '.31111111111112.',
        '.31111111111112.',
        '.22222222222222.',
        '.27777222277772.',
        '..7887....7887..',
        '...77......77...',
        '................',
        '................',
      ]),
    },
    {
      id: 'trackdle.buggy', game: 'trackdle', slot: 'skin', name: 'Dune buggy', eyes: 8,
      // body, shade, light, headlight, -, -, tyre, hub, roll cage
      colors: ['#E8692F', '#B34A1C', '#F79461', '#FFF4DC', '#E3D3B0', '#2E3E4E', '#23262D', '#8A929E', '#C9CFD8'],
      outline: '#4A1A0A',
      art: grid16('dune buggy', [
        '................',
        '................',
        '....9999999.....',
        '....9.9...9.....',
        '....9..9...9....',
        '...9....9...9...',
        '..311111111112..',
        '.31111111111112.',
        '.31111111111114.',
        '.31111111111112.',
        '.27772222227772.',
        '.77877222277877.',
        '.78787....78787.',
        '.77877....77877.',
        '..777......777..',
        '................',
      ]),
    },
    {
      id: 'trackdle.formula', game: 'trackdle', slot: 'skin', name: 'Formula 07', eyes: 9, showpiece: true, signature: 'embers',
      about: 'Open wheels, a wing at each end, No. 07.',
      // body, shade, light, cream, wing ends, tyre, tyre shine
      colors: ['#ED6137', '#B8441F', '#F7905F', '#FFF4DC', '#2B2F38', '#23262D', '#4A505B'],
      outline: '#3A1408',
      art: grid16('formula 07', [
        '................',
        '..544444444445..',
        '......3112......',
        '.666..3442..666.',
        '.67655317255676.',
        '.676.311112.676.',
        '.66631111112666.',
        '...3111111112...',
        '...5311111115...',
        '.66631111111666.',
        '.67631111111676.',
        '.67622111122676.',
        '.66622222222666.',
        '....54444445....',
        '................',
        '................',
      ]),
    },

    // ---------------------------------------------------------------- hats
    {
      id: 'trackdle.lights', game: 'trackdle', slot: 'hat', name: 'Start lights',
      // housing, housing light, lamp, lamp glint, lamp shade, post
      colors: ['#2A2D33', '#4A505B', '#FF3B30', '#FFB3A8', '#B3141C', '#8A929E'],
      draw: on([
        '2222222222',
        '1431431431',
        '1351351351',
        '1111111111',
        '....66....',
      ]),
    },
    {
      id: 'trackdle.spoiler', game: 'trackdle', slot: 'hat', name: 'Rear spoiler',
      colors: ['#ED6137', '#B8441F', '#F7905F', '#2B2F38', '#FFF4DC'],
      draw: on([
        '4..........4',
        '433333333334',
        '422222222224',
        '4..4....4..4',
        '...4....4...',
      ]),
    },
    {
      id: 'trackdle.surfboard', game: 'trackdle', slot: 'hat', name: 'Surfboard',
      colors: ['#FFF4DC', '#E3CFA6', '#ED6137', '#B8441F'],
      // Stood on its tail behind the head, the way it's carried down to the water.
      draw: on([
        '..1..',
        '.131.',
        '11311',
        '11311',
        '11311',
        '11311',
        '.232.',
      ], 3),
    },
    {
      id: 'trackdle.finish', game: 'trackdle', slot: 'hat', name: 'Finish flag',
      // black, white, pole, knob
      colors: ['#23262D', '#F4F4F4', '#9AA3AE', '#F2C230'],
      draw: on([
        '4........',
        '311221122',
        '311221122',
        '322112211',
        '322112211',
        '3........',
        '3........',
      ], 3),
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
      // rubber, rubber shine, tread, hub
      colors: ['#3A3F48', '#5C6370', '#23262D', '#C9CFD8'],
      art: pet('tyre stack', [
        '.1111.',
        '134431',
        '211112',
        '134431',
        '.1111.',
      ]),
    },
    {
      id: 'trackdle.ramp', game: 'trackdle', slot: 'buddy', name: 'Jump ramp',
      colors: ['#F2683F', '#B8441F', '#FF9A6E', '#FFF4DC'],
      art: pet('jump ramp', [
        '....12',
        '...112',
        '..1412',
        '.11142',
        '111412',
      ]),
    },
    {
      id: 'trackdle.cactus', game: 'trackdle', slot: 'buddy', name: 'Saguaro',
      colors: ['#4F9B62', '#2F6B40', '#8ED07A', '#E8C98F', '#C9A26A'],
      art: pet('saguaro', [
        '..31.1',
        '3.31.1',
        '333111',
        '..31..',
        '.4445.',
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
      colors: ['#FF8A3D', '#D9621E', '#FFF4DC', '#FFB27A', '#A8461A'],
      art: pet('conelet', [
        '..41..',
        '.4112.',
        '.3333.',
        '4o11o2',
        '555555',
      ]),
    },
    // The face moves onto a wide cream band, so the eyes aren't black on orange.
    'trackdle.cone': {
      eyes: 10,
      colors: ['#FF8A3D', '#D9621E', '#FFF4DC', '#FFB27A', '#2B2F38', '#E6D5B3'],
      art: grid16('traffic cone', [
        '................',
        '.......41.......',
        '......4112......',
        '......4112......',
        '.....333336.....',
        '.....411112.....',
        '....41111112....',
        '....41111112....',
        '....33333336....',
        '...3333333336...',
        '...3333333336...',
        '..411111111112..',
        '..411111111112..',
        '.22222222222222.',
        '................',
        '................',
      ]),
    },
  },
};
