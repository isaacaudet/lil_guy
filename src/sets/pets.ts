import { backdrop, fitRoom, grid16, on, pet, sit, type MachineSet } from '../item-art';
import { stamp, width } from '../parts/art';
import type { Canvas } from '../parts/canvas';
import { mirror, seat } from '../parts/hair';
import { GRID_SIZE } from '../types';

/** A hat stood on the crown as drawn, rather than pulled down round the head like a cap. */
const perch = (rows: string[], sink = 1) => {
  const s = stamp(rows);
  return (c: Canvas) => sit(c, s, 0, sink);
};

/**
 * A pair of ears set `out` columns past the sides of the head, where there is
 * room, so they stand at its corners the way a cat's or a fox's do, rather
 * than meeting in the middle on a narrow head. Drawn for the left side; the
 * right is its mirror.
 */
const earsOut = (rows: string[], out: number) => {
  const left = stamp(rows), right = mirror(left);
  return (c: Canvas) => {
    const r = c.rows[c.shoulder()]!, l = fitRoom(c, left), rr = fitRoom(c, right);
    seat(c, l, Math.max(1, r.left - out));
    seat(c, rr, Math.min(GRID_SIZE - 1 - width(rr), r.right + out - width(rr) + 1));
  };
};

/** Headphones: a pair of ears at the head's corners (`earsOut`), and a band and its cups over them, worn like a cap. */
const headset = (band: string[], ear: string[], out: number) => {
  const wearBand = on(band), wearEars = earsOut(ear, out);
  return (c: Canvas) => { wearEars(c); wearBand(c); };
};

/**
 * The Pet shop: no game's machine, the club's own. Cats, dogs, foxes and
 * bunnies: animal onesies with the guy's own face looking out, animal ears to
 * wear, a pet bed and cherry blossom to sit in, and a little pet at his feet.
 */
export const set: MachineSet = {
  add: [
    // ---------------------------------------------------------------- skins
    {
      id: 'pets.cat', game: 'pets', slot: 'skin', name: 'Cat onesie', eyes: 9, limb: 4,
      // suit, suit shade, suit light, white, pink, collar, bell, bell shade, white shade
      colors: ['#5D5880', '#45405F', '#7F79A8', '#F7F4FF', '#FF9CC0', '#E8394F', '#FFD04A', '#C98A12', '#D6D0EA'],
      outline: '#1F1B2E',
      art: grid16('cat onesie', [
        '................',
        '..31........12..',
        '..351......152..',
        '..355111111552..',
        '..311114411112..',
        '..311144441112..',
        '..31h######s12..',
        '.41h########s24.',
        '..1##########2..',
        '.41##########24.',
        '..1#########s2..',
        '..21s######s124.',
        '..2666677666621.',
        '...2454884542...',
        '................',
        '................',
      ]),
    },
    {
      id: 'pets.shiba', game: 'pets', slot: 'skin', name: 'Shiba onesie', eyes: 9, limb: 1,
      // orange, orange shade, orange light, cream, cream shade, bandana, bandana shade
      colors: ['#E9944A', '#C2692A', '#F7B877', '#FFF3DF', '#EBD3B4', '#E5484D', '#B22F3A'],
      outline: '#5A2E10',
      // A shiba hood: pointed ears with cream insides, the two cream "maro" brows, cream cheek
      // fur round his face, and a red bandana.
      art: grid16('shiba onesie', [
        '................',
        '...1........1...',
        '..141......141..',
        '..1441....1441..',
        '..311111111112..',
        '..314411114412..',
        '..311######112..',
        '..31########12..',
        '..1##########2..',
        '..4##########4..',
        '..4##########4..',
        '..44########44..',
        '...44######44...',
        '...2666776662...',
        '................',
        '................',
      ]),
    },
    {
      id: 'pets.bunny', game: 'pets', slot: 'skin', name: 'Bunny hoodie', eyes: 10, limb: 1,
      // pink, pink shade, pink light, inner ear, white, white shade
      colors: ['#FFC2D8', '#E893B4', '#FFE3EE', '#FF7FAE', '#FFFFFF', '#EADFF0'],
      outline: '#7A2E4E',
      art: grid16('bunny hoodie', [
        '................',
        '...33......3311.',
        '..3143....3141..',
        '..3143....3142..',
        '..3143....3142..',
        '..311111111112..',
        '..311111111112..',
        '..31h######s12..',
        '..1h########s2..',
        '..1##########2..',
        '..1##########25.',
        '..2#########s26.',
        '..21s######s12..',
        '...2554224552...',
        '................',
        '................',
      ]),
    },
    {
      id: 'pets.frog', game: 'pets', slot: 'skin', name: 'Frog hoodie', eyes: 9, limb: 1,
      // green, green shade, green light, white, pupil, blush, belly
      colors: ['#86D45E', '#4F9E3A', '#BDEB91', '#FFFFFF', '#1F2A1A', '#FF9AAE', '#EAF7C8'],
      outline: '#24451A',
      art: grid16('frog hoodie', [
        '................',
        '..34442..34442..',
        '.345542..345542.',
        '.31444111144412.',
        '..311111111112..',
        '..311111111112..',
        '..31h######s12..',
        '..1h########s2..',
        '..1##########2..',
        '..6##########6..',
        '..2#########s2..',
        '..21s######s12..',
        '...2177777712...',
        '....22222222....',
        '................',
        '................',
      ]),
    },
    {
      id: 'pets.kitsune', game: 'pets', slot: 'skin', name: 'Kitsune', eyes: 9, limb: 1, showpiece: true, signature: 'neon',
      about: 'A fox spirit, a tail for every hundred years.',
      // A white fox hood with tall red-lined ears and a red flame on the brow, its tails fanned out
      // behind him, white at the tips, and a red cord. white, white shade, white light, red, red shade, tail, tail shade
      colors: ['#FFFDF7', '#DCD3E8', '#FFFFFF', '#E5383B', '#A82430', '#F28A2E', '#C2601A'],
      outline: '#4A2232',
      art: grid16('kitsune', [
        '................',
        '..3..........2..',
        '..34........42..',
        '..344......442..',
        '..341111111142..',
        '..311114411112..',
        '..311h####s112..',
        '.331h######s123.',
        '.61h########s16.',
        '.61##########16.',
        '.71#########s17.',
        '.672s######s276.',
        '.36624444442663.',
        '................',
        '................',
        '................',
      ]),
    },

    // ---------------------------------------------------------------- hats
    {
      id: 'pets.ears', game: 'pets', slot: 'hat', name: 'Cat ears', free: true,
      // In the guy's own colour, pink inside his blush with a white tuft: they read as his own ears.
      colors: [],
      draw: earsOut([
        'h.....',
        '#ho...',
        '#cwo..',
        's#cw#o',
      ], 2),
    },
    {
      id: 'pets.puppy-ears', game: 'pets', slot: 'hat', name: 'Head puppy',
      // tan, tan shade, white, ear, ear shade, eye, nose
      colors: ['#E3A05A', '#B9773A', '#FFFFFF', '#8A5028', '#5E3418', '#2B1D18', '#3A2A26'],
      // A beagle puppy's head on his own: floppy brown ears down either side, a white blaze and muzzle.
      draw: perch([
        '..41133114..',
        '.5411331145.',
        '.5416336145.',
        '.5433773345.',
      ]),
    },
    {
      id: 'pets.fox-ears', game: 'pets', slot: 'hat', name: 'Fox ears',
      // orange, orange shade, orange light, cream, dark tip
      colors: ['#F28A2E', '#C2601A', '#FFB066', '#FFF1DC', '#3A2418'],
      draw: earsOut([
        '5o...',
        '55o..',
        '343o.',
        '1442o',
      ], 2),
    },
    {
      id: 'pets.bunny-ears', game: 'pets', slot: 'hat', name: 'Bunny ears',
      // white, pink, white shade
      colors: ['#FFFFFF', '#FFA8C8', '#E2D8EC'],
      draw: perch([
        '.13.....1111',
        '.123...1223.',
        '.123...123..',
        '.123...123..',
      ]),
    },
    {
      id: 'pets.headphones', game: 'pets', slot: 'hat', name: 'Cat-ear headphones',
      // band, band shade, band light, glow, glow light, ear cup, cup shade
      colors: ['#FF6FAE', '#D23A7E', '#FFC2DD', '#5FEFFF', '#E8FFFF', '#7A2858', '#4E1638'],
      // Hot pink with glowing cat ears, the band over his head and a plum cup at each side.
      draw: headset([
        '..31111112..',
        '.61......16.',
        '6556....6556',
      ], [
        '1...',
        '12..',
        '142.',
        '1442',
      ], 1),
    },

    // ---------------------------------------------------------------- frames
    {
      id: 'pets.paws', game: 'pets', slot: 'frame', name: 'Paw prints',
      // ground, paw, paw light
      colors: ['#FFE6DA', '#E58A74', '#F0A994'],
      fill: (x, y) => {
        const X = ((x % 16) + 16) % 16, Y = ((y % 16) + 16) % 16;
        // A trail of little paws across the corners: four toes over a pad.
        const PAW = ['.x.x.', 'x...x', '.xxx.', '.xxx.'];
        for (const [px, py] of [[0, 0], [11, 1], [0, 11], [11, 12]]) {
          const r = PAW[Y - py], ch = r?.[X - px];
          if (ch === 'x') return (px + py) % 2 ? 3 : 2;
        }
        return 1;
      },
    },
    {
      id: 'pets.cushion', game: 'pets', slot: 'frame', name: 'Cozy cushion',
      // wall, wall stripe, cushion, cushion shade, cushion light, bed
      colors: ['#FFF3E4', '#FFE3CC', '#B98AE0', '#8A5CB8', '#DDC2F5', '#FFD6E6'],
      fill: (x, y) => {
        // The bed's round rim, seen from the front: its top lit, its foot in shade, the cushion inside.
        const X = ((x % 16) + 16) % 16, Y = ((y % 16) + 16) % 16;
        const d = ((X - 7.5) / 9.2) ** 2 + ((Y - 17) / 9) ** 2;
        const inner = ((X - 7.5) / 5.6) ** 2 + ((Y - 17) / 5.4) ** 2;
        if (inner <= 1) return 6;
        if (d <= 1) { const dIn = ((X - 7.5) / 8.4) ** 2 + ((Y - 17) / 8) ** 2; return dIn > 1 ? 5 : Y >= 14 || X <= 1 || X >= 14 ? 4 : 3; }
        return X % 4 < 2 ? 1 : 2;
      },
    },
    {
      id: 'pets.sakura', game: 'pets', slot: 'frame', name: 'Sakura',
      // sky, blossom, blossom light, branch, blossom heart, petal
      colors: ['#E6F2FF', '#FF8FB8', '#FFD0E1', '#7A4E3A', '#FFE36E', '#FFB3CF'],
      // A branch in over the top corners, five-petalled blossoms on it, and a few petals falling
      // down the sides, the guy's own corner left clear for a buddy.
      fill: backdrop('sakura', [
        '.3....4.3.......',
        '352.44.352.....4',
        '.2.43...2.....34',
        '.44352.......352',
        '4...2.........2.',
        '................',
        '................',
        '................',
        '..............6.',
        '................',
        '.6..............',
        '................',
        '................',
        '6...............',
        '................',
        '................',
      ]),
    },

    // ---------------------------------------------------------------- buddies
    {
      id: 'pets.kitten', game: 'pets', slot: 'buddy', name: 'Kitten',
      // coat, shade, light, pink, white
      colors: ['#FFA95C', '#E07A34', '#FFD3A1', '#FF7F9E', '#FFFFFF'],
      // An apricot kitten sat up: a big head, a white muzzle and pink nose, white socks, its tail up.
      art: pet('kitten', [
        '.1....1.',
        '.141141.',
        '3wo11wo2',
        '1oo11oo2',
        '.155452.',
        '..1111.2',
        '..15512.',
        '..5..5..',
      ]),
    },
    {
      id: 'pets.puppy', game: 'pets', slot: 'buddy', name: 'Puppy',
      // golden, shade, light, ear, nose, tongue, muzzle
      colors: ['#F2C27A', '#D29A50', '#FFE2B0', '#8A5530', '#2B1D18', '#FF8A9E', '#FFF6E8'],
      art: pet('puppy', [
        '..3112..',
        '43111124',
        '4wo11wo4',
        '4oo11oo4',
        '.175571.',
        '.176671.',
        '.311112.',
        '.22..22.',
      ]),
    },
    {
      id: 'pets.axolotl', game: 'pets', slot: 'buddy', name: 'Axolotl',
      // pink, shade, light, gill, gill dark, smile
      colors: ['#FFB3CF', '#E77FA8', '#FFE0EC', '#FF6F9F', '#D9417A', '#8A2E52'],
      art: pet('axolotl', [
        '4.3113.4',
        '.431134.',
        '54111145',
        '1wo11wo1',
        '4oo11oo4',
        '.116611.',
        '.111122.',
        '.12..12.',
      ]),
    },
    {
      id: 'pets.bunny-buddy', game: 'pets', slot: 'buddy', name: 'Bunny',
      // white, shade, pink
      colors: ['#FFFFFF', '#DCD0E8', '#FFA8C8'],
      art: pet('bunny', [
        '.13..13.',
        '.13..13.',
        '.13..12.',
        '1wo11wo2',
        '1oo11oo2',
        '11133112',
        '.111112.',
        '.12..12.',
      ]),
    },
  ],
  retire: [],
  redraw: {},
};
