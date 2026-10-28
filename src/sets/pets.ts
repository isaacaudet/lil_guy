import { fitRoom, grid16, on, pet, sit, type MachineSet } from '../item-art';
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
 * than meeting in the middle on a narrow head.
 */
const earsOut = (rows: string[], out: number) => {
  const left = stamp(rows), right = mirror(left);
  return (c: Canvas) => {
    const r = c.rows[c.shoulder()]!, l = fitRoom(c, left), rr = fitRoom(c, right);
    seat(c, l, Math.max(1, r.left - out));
    seat(c, rr, Math.min(GRID_SIZE - 1 - width(rr), r.right + out - width(rr) + 1));
  };
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
      id: 'pets.cat', game: 'pets', slot: 'skin', name: 'Cat onesie', eyes: 9, limb: 1,
      // white socks, fur, fur shade, fur light, pink, collar, bell, bell shade
      colors: ['#F7F4FF', '#3B3652', '#26223A', '#5E5880', '#FF9CC0', '#E8394F', '#FFD04A', '#C98A12'],
      outline: '#15121F',
      art: grid16('cat onesie', [
        '................',
        '...4........3...',
        '..452......253..',
        '..455222222553..',
        '..422222222223..',
        '..422221122223..',
        '..42h######s23..',
        '..2h########s3..',
        '..2##########3..',
        '..2##########31.',
        '..3#########s33.',
        '..33s######s333.',
        '..3666677666633.',
        '...3111881113...',
        '................',
        '................',
      ]),
    },
    {
      id: 'pets.shiba', game: 'pets', slot: 'skin', name: 'Shiba onesie', eyes: 9, limb: 1,
      // cream, orange, orange shade, orange light, -, bandana, bandana shade
      colors: ['#FFF3DF', '#E99447', '#C2692A', '#F7B877', '#FFD9C2', '#E5484D', '#B22F3A'],
      outline: '#5A2E10',
      art: grid16('shiba onesie', [
        '................',
        '...4........3...',
        '..421......123..',
        '..411222222113..',
        '..422222222223..',
        '..422122221223..',
        '..41h######s13..',
        '..1h########s1..',
        '..1##########1..',
        '..1##########1..',
        '..1#########s1..',
        '..21s######s12..',
        '..366666666663..',
        '...3116776113...',
        '................',
        '................',
      ]),
    },
    {
      id: 'pets.bunny', game: 'pets', slot: 'skin', name: 'Bunny hoodie', eyes: 10, limb: 1,
      // pink, pink shade, pink light, inner ear, white
      colors: ['#FFC2D8', '#E893B4', '#FFE3EE', '#FF7FAE', '#FFFFFF'],
      outline: '#7A2E4E',
      art: grid16('bunny hoodie', [
        '................',
        '....3......2....',
        '...341....142...',
        '...341....142...',
        '...341....142...',
        '..314111111412..',
        '..311111111112..',
        '..31h######s12..',
        '..1h########s2..',
        '..1##########2..',
        '..1##########2..',
        '..2#########s2..',
        '..21s######s12..',
        '...2151111512...',
        '....22522522....',
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
        '...3332..3332...',
        '..34442..34442..',
        '..345521134552..',
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
      // white, white shade, white light, red, tail gold, tail shade, tail tip
      colors: ['#FFFDF7', '#DCD3E8', '#FFFFFF', '#E5383B', '#FFB347', '#DD7F1C', '#FFF0C8'],
      outline: '#4A2232',
      art: grid16('kitsune', [
        '................',
        '...3........2...',
        '...34......42...',
        '..3441....1442..',
        '..341111111142..',
        '..311114411112..',
        '..31h######s12..',
        '.71h########s27.',
        '.74##########47.',
        '.54##########45.',
        '.52#########s25.',
        '.5521s####s1255.',
        '.56544455444565.',
        '..662111111266..',
        '................',
        '................',
      ]),
    },

    // ---------------------------------------------------------------- hats
    {
      id: 'pets.ears', game: 'pets', slot: 'hat', name: 'Cat ears', free: true,
      // In the guy's own colour, pink inside his blush: they read as his own ears.
      colors: [],
      draw: earsOut([
        'h....',
        '#h...',
        '#ch..',
        '#cc#s',
      ], 2),
    },
    {
      id: 'pets.puppy-ears', game: 'pets', slot: 'hat', name: 'Head puppy',
      // white, white shade, white light, ear, nose
      colors: ['#FFF8EE', '#E2D2BC', '#FFFFFF', '#9A6034', '#2B1D18'],
      draw: perch([
        '.433111124.',
        '443o111o244',
        '44311511244',
        '..3111112..',
      ]),
    },
    {
      id: 'pets.fox-ears', game: 'pets', slot: 'hat', name: 'Fox ears',
      // orange, orange shade, orange light, cream, dark tip
      colors: ['#F28A2E', '#C2601A', '#FFB066', '#FFF1DC', '#3A2418'],
      draw: earsOut([
        '5....',
        '35...',
        '3141.',
        '31442',
      ], 1),
    },
    {
      id: 'pets.bunny-ears', game: 'pets', slot: 'hat', name: 'Bunny ears',
      // white, pink, white shade
      colors: ['#FFFFFF', '#FFA8C8', '#E2D8EC'],
      draw: perch([
        '13......31',
        '123....321',
        '.123..321.',
        '..13..31..',
      ]),
    },
    {
      id: 'pets.headphones', game: 'pets', slot: 'hat', name: 'Cat-ear headphones',
      // band, band shade, light, light glow
      colors: ['#FF9EC8', '#E06A9E', '#7FF0FF', '#E8FFFF'],
      draw: on([
        '.3.......3.',
        '.43.....34.',
        '13311111331',
        '22.......22',
      ]),
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
      colors: ['#E3F1FF', '#FF8FB8', '#FFD0E1', '#6E4636', '#FFE36E', '#FFB3CF'],
      fill: (x, y) => {
        const X = ((x % 16) + 16) % 16, Y = ((y % 16) + 16) % 16;
        // A branch sloping in over the top left, blossoms along it, petals falling down the sides.
        for (const [bx, by] of [[1, 1], [7, 1], [12, 0], [14, 3]]) {
          if (X === bx && Y === by) return 5;
          const d = Math.abs(X - bx) + Math.abs(Y - by);
          if (d === 1) return Y < by || X < bx ? 3 : 2;
        }
        if ([[0, 3], [1, 3], [2, 2], [3, 2], [4, 1], [5, 1], [6, 0], [8, 0], [9, 0], [10, 1], [11, 1]].some(([bx, by]) => X === bx && Y === by)) return 4;
        for (const [px, py] of [[1, 7], [14, 7], [0, 11], [15, 12], [3, 15], [12, 15]]) {
          if (X === px && Y === py) return 6;
          if (X === px + 1 && Y === py + 1) return 3;
        }
        return 1;
      },
    },

    // ---------------------------------------------------------------- buddies
    {
      id: 'pets.kitten', game: 'pets', slot: 'buddy', name: 'Kitten',
      // orange, shade, light, pink, white
      colors: ['#F6A04D', '#D07228', '#FFC98A', '#FF9AAE', '#FFF4E6'],
      art: pet('kitten', [
        '3....2',
        '31..12',
        '1o22o2',
        '154452',
        '.1552.',
      ]),
    },
    {
      id: 'pets.puppy', game: 'pets', slot: 'buddy', name: 'Puppy',
      // golden, shade, light, ear, nose, tongue
      colors: ['#F2C27A', '#D29A50', '#FFE2B0', '#8A5530', '#2B1D18', '#FF8A9E'],
      art: pet('puppy', [
        '431124',
        '4o11o4',
        '413514',
        '.1662.',
        '.1..2.',
      ]),
    },
    {
      id: 'pets.axolotl', game: 'pets', slot: 'buddy', name: 'Axolotl',
      // pink, shade, light, gill, gill dark
      colors: ['#FFB3CF', '#E77FA8', '#FFE0EC', '#FF6F9F', '#D9417A'],
      art: pet('axolotl', [
        '4.33.4',
        '531125',
        '4o11o4',
        '.1221.',
        '.1..1.',
      ]),
    },
    {
      id: 'pets.bunny-buddy', game: 'pets', slot: 'buddy', name: 'Bunny',
      // white, shade, pink
      colors: ['#FFFFFF', '#DCD0E8', '#FFA8C8'],
      art: pet('bunny', [
        '.1..1.',
        '.3..3.',
        '111112',
        '1o11o2',
        '.1332.',
      ]),
    },
  ],
  retire: [],
  redraw: {},
};
