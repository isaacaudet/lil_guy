import type { TraitSlot } from './rarity';

/**
 * Pixel icons for the traits and the rarity tiers, as SVG strings.
 *
 * Each is drawn on a 12x12 grid in `currentColor`, so the page colours it
 * (a tier icon takes its tier's colour), with at most two fixed accents
 * where the colour is the point (blush pink, a sprout's green). They carry a
 * `viewBox` and no size: CSS sizes them, crisp at any multiple of 12px and
 * readable from 24px.
 */

/** A grid's letters: `#` is `currentColor`, the rest its accents, `.` empty. */
function icon(rows: string[], accents: Record<string, string> = {}): string {
  const fills: Record<string, string> = { '#': 'currentColor', ...accents };
  const rects: string[] = [];
  rows.forEach((row, y) => {
    // One rect per run of a colour along the row.
    for (let x = 0; x < row.length;) {
      const ch = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      if (fills[ch]) rects.push(`<rect x="${x}" y="${y}" width="${end - x}" height="1" fill="${fills[ch]}"/>`);
      x = end;
    }
  });
  const w = Math.max(...rows.map(r => r.length));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${rows.length}" shape-rendering="crispEdges" aria-hidden="true">${rects.join('')}</svg>`;
}

const PINK = '#FF6F9F';
const GREEN = '#4CC25A';

export const TRAIT_ICONS: Record<TraitSlot, string> = {
  // A guy's silhouette: the body every part goes on, standing on two nubs.
  shape: icon([
    '............',
    '....####....',
    '..########..',
    '.##########.',
    '.##########.',
    '############',
    '############',
    '############',
    '.##########.',
    '..########..',
    '..##....##..',
    '............',
  ]),
  // Two big eyes, each with a glint cut out.
  eyes: icon([
    '............',
    '............',
    '..##....##..',
    '.####..####.',
    '.#.##..#.##.',
    '.####..####.',
    '.####..####.',
    '.####..####.',
    '..##....##..',
    '............',
    '............',
    '............',
  ]),
  // A wide open smile with a tongue.
  mouth: icon([
    '............',
    '............',
    '............',
    '##........##',
    '##........##',
    '.##########.',
    '.##########.',
    '..###aa###..',
    '...##aa##...',
    '....####....',
    '............',
    '............',
  ], { a: PINK }),
  // Two eyes over two pink blush dots.
  cheeks: icon([
    '............',
    '............',
    '...##..##...',
    '...##..##...',
    '............',
    '............',
    '.aaa....aaa.',
    'aaaaa..aaaaa',
    'aaaaa..aaaaa',
    '.aaa....aaa.',
    '............',
    '............',
  ], { a: PINK }),
  // A sprout on top of a head.
  topper: icon([
    '..aa....aa..',
    '.aaaa..aaaa.',
    '.aaaaa#aaaa.',
    '..aaa##aaa..',
    '.....##.....',
    '.....##.....',
    '............',
    '...######...',
    '.##########.',
    '############',
    '############',
    '############',
  ], { a: GREEN }),
  // A round belly with spots on it.
  markings: icon([
    '....####....',
    '..########..',
    '.##..######.',
    '.##..###..#.',
    '#########..#',
    '####..######',
    '####..######',
    '#######..###',
    '.#.####..##.',
    '.#..######..',
    '..########..',
    '....####....',
  ]),
  // A bow tie.
  accessory: icon([
    '............',
    '............',
    '##........##',
    '####....####',
    '#####..#####',
    '############',
    '############',
    '#####..#####',
    '####....####',
    '##........##',
    '............',
    '............',
  ]),
  // A painter's palette with its thumb hole and two paints.
  colour: icon([
    '............',
    '...#####....',
    '..########..',
    '.##aa##bb##.',
    '.##aa##bb##.',
    '##########..',
    '#########...',
    '##cc####....',
    '##cc#####...',
    '.#########..',
    '..#######...',
    '............',
  ], { a: PINK, b: GREEN, c: PINK }),
  // A circle half lit and half dark.
  tone: icon([
    '............',
    '....####....',
    '..#####.##..',
    '.######...#.',
    '.######...#.',
    '#######....#',
    '#######....#',
    '.######...#.',
    '.######...#.',
    '..#####.##..',
    '....####....',
    '............',
  ]),
  // A guy with both arms in the air.
  arms: icon([
    '##........##',
    '##........##',
    '.##......##.',
    '..##.##.##..',
    '...######...',
    '..########..',
    '..########..',
    '..########..',
    '..########..',
    '...######...',
    '...##..##...',
    '............',
  ]),
  // Two little feet, toes and all.
  feet: icon([
    '............',
    '.#.#....#.#.',
    '............',
    '.###....###.',
    '####....####',
    '####....####',
    '####....####',
    '.###....###.',
    '.###....###.',
    '..#......#..',
    '............',
    '............',
  ]),
  // A four-leaf clover.
  lucky: icon([
    '............',
    '..aaa..aaa..',
    '.aaaaa.aaaa.',
    '.aaaaaaaaaa.',
    '..aaaaaaaa..',
    '....aaaa....',
    '..aaaaaaaa..',
    '.aaaaaaaaaa.',
    '.aaaaa#aaaa.',
    '..aaa.#aaa..',
    '.......#....',
    '........#...',
  ], { a: GREEN }),
};

/** The rarity tiers the site shows, rising: a pip, a diamond, a gem, a star, a crown. */
export type Tier = 'Common' | 'Uncommon' | 'Rare' | 'Legendary' | 'Chase';

export const TIER_ICONS: Record<Tier, string> = {
  Common: icon([
    '............',
    '............',
    '............',
    '............',
    '....####....',
    '...######...',
    '...######...',
    '....####....',
    '............',
    '............',
    '............',
    '............',
  ]),
  Uncommon: icon([
    '............',
    '.....##.....',
    '....####....',
    '...######...',
    '..########..',
    '.##########.',
    '.##########.',
    '..########..',
    '...######...',
    '....####....',
    '.....##.....',
    '............',
  ]),
  Rare: icon([
    '............',
    '............',
    '..########..',
    '.##.####.##.',
    '############',
    '............',
    '############',
    '.##########.',
    '..########..',
    '....####....',
    '.....##.....',
    '............',
  ]),
  Legendary: icon([
    '.....##.....',
    '.....##.....',
    '....####....',
    '....####....',
    '############',
    '.##########.',
    '..########..',
    '...######...',
    '..########..',
    '..###..###..',
    '.###....###.',
    '.##......##.',
  ]),
  Chase: icon([
    '............',
    '#....##....#',
    '##..####..##',
    '###.####.###',
    '############',
    '############',
    '############',
    '############',
    '............',
    '############',
    '############',
    '............',
  ]),
};
