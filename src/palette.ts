import type { Palette, ColorToken } from './types';

const sunrise: Palette = {
  name: 'Sunrise',
  colors: {
    1: '#FFB347', // warm orange blob
    2: '#FF6B6B', // coral feature
    3: '#FFE066', // sunny yellow pattern
    4: '#FF8A5C', // peach accent
    5: '#D4A070', // warm brown outline
    6: '#FFFFFF',
    7: '#2A1A10',
    8: '#E06060',
  },
};

const ocean: Palette = {
  name: 'Ocean',
  colors: {
    1: '#7EC8E3', // sky blue blob
    2: '#4A90D9', // deeper blue feature
    3: '#B8E6FF', // light blue pattern
    4: '#5CBDD9', // teal accent
    5: '#7098B0', // steel blue outline
    6: '#FFFFFF',
    7: '#1A2030',
    8: '#E07088',
  },
};

const forest: Palette = {
  name: 'Forest',
  colors: {
    1: '#8BC990', // leaf green blob
    2: '#5BA865', // darker green feature
    3: '#C4E8A2', // lime pattern
    4: '#A8D86E', // bright green accent
    5: '#6A9A68', // forest outline
    6: '#F0F8E8',
    7: '#1A2A10',
    8: '#D0A080',
  },
};

const berry: Palette = {
  name: 'Berry',
  colors: {
    1: '#D88ADB', // lavender blob
    2: '#B45CB8', // purple feature
    3: '#F0B0D0', // pink pattern
    4: '#E870A0', // hot pink accent
    5: '#9868A0', // deep purple outline
    6: '#FFFFFF',
    7: '#2A1030',
    8: '#E06888',
  },
};

const desert: Palette = {
  name: 'Desert',
  colors: {
    1: '#E8C088', // sandy blob
    2: '#D4946A', // terra cotta feature
    3: '#F0D8A8', // cream pattern
    4: '#C8A060', // gold accent
    5: '#A88858', // warm brown outline
    6: '#FFF8F0',
    7: '#2A1A0A',
    8: '#D08060',
  },
};

const arctic: Palette = {
  name: 'Arctic',
  colors: {
    1: '#B8D8F0', // ice blue blob
    2: '#90B8D8', // steel blue feature
    3: '#D8E8F8', // snow pattern
    4: '#A0D0E8', // frost accent
    5: '#88A8C0', // slate outline
    6: '#FFFFFF',
    7: '#1A2A3A',
    8: '#D098A8',
  },
};

const autumn: Palette = {
  name: 'Autumn',
  colors: {
    1: '#E8A060', // amber blob
    2: '#D07840', // rust feature
    3: '#F0C878', // golden pattern
    4: '#C89030', // mustard accent
    5: '#A87838', // brown outline
    6: '#FFF8F0',
    7: '#2A1808',
    8: '#D07850',
  },
};

const twilight: Palette = {
  name: 'Twilight',
  colors: {
    1: '#9A80C8', // violet blob
    2: '#7060B0', // deep purple feature
    3: '#C0A8E0', // lilac pattern
    4: '#B090D8', // light purple accent
    5: '#785898', // dark purple outline
    6: '#F0E8FF',
    7: '#100820',
    8: '#C07898',
  },
};

const meadow: Palette = {
  name: 'Meadow',
  colors: {
    1: '#A8D870', // bright green blob
    2: '#E8C040', // golden feature
    3: '#D0F0A0', // light lime pattern
    4: '#C8E050', // yellow-green accent
    5: '#80A050', // olive outline
    6: '#FFFFFF',
    7: '#1A2A08',
    8: '#E0A078',
  },
};

const candy: Palette = {
  name: 'Candy',
  colors: {
    1: '#FFB0C8', // pink blob
    2: '#B088D0', // purple feature
    3: '#B8E8D0', // mint pattern
    4: '#90D8B8', // teal accent
    5: '#B07898', // mauve outline
    6: '#FFFFFF',
    7: '#3A1830',
    8: '#F088A8',
  },
};

const coral: Palette = {
  name: 'Coral',
  colors: {
    1: '#D77757', // Clawd's original warm orange
    2: '#C05A3A', // darker coral feature
    3: '#F0A888', // lighter peach pattern
    4: '#E89070', // salmon accent
    5: '#B07058', // warm outline
    6: '#FFFFFF',
    7: '#2A1008',
    8: '#C05848',
  },
};

const cloud: Palette = {
  name: 'Cloud',
  colors: {
    1: '#7BA7D9', // Clawd's current blue
    2: '#5A88C0', // deeper blue feature
    3: '#A8C8F0', // lighter blue pattern
    4: '#90B8E0', // sky accent
    5: '#7890B0', // blue-gray outline
    6: '#FFFFFF',
    7: '#101828',
    8: '#D08898',
  },
};

const ember: Palette = {
  name: 'Ember',
  colors: {
    1: '#E06B4A', // hot coral blob
    2: '#B03A2E', // deep red feature
    3: '#F8A870', // ember glow pattern
    4: '#FFD070', // spark accent
    5: '#9A4030', // charred outline
    6: '#FFF0E0',
    7: '#2A0C08',
    8: '#C04838',
  },
};

const moss: Palette = {
  name: 'Moss',
  colors: {
    1: '#7FA86B', // damp green blob
    2: '#4F7A48', // deep moss feature
    3: '#B8CE90', // lichen pattern
    4: '#D8C070', // dry grass accent
    5: '#5A7850', // shaded outline
    6: '#F4F8E8',
    7: '#18240E',
    8: '#C08868',
  },
};

const orchid: Palette = {
  name: 'Orchid',
  colors: {
    1: '#C878B8', // orchid blob
    2: '#8E4A88', // wine feature
    3: '#EEB8DE', // petal pattern
    4: '#F0D060', // pollen accent
    5: '#8A5880', // shaded outline
    6: '#FFF4FC',
    7: '#2A0E28',
    8: '#D06890',
  },
};

const slate: Palette = {
  name: 'Slate',
  colors: {
    1: '#8C97A8', // cool grey blob
    2: '#5F6B7C', // charcoal feature
    3: '#C0C8D4', // pale grey pattern
    4: '#7FB0C8', // cold blue accent
    5: '#6A7484', // shaded outline
    6: '#FFFFFF',
    7: '#161C26',
    8: '#B08088',
  },
};

const mango: Palette = {
  name: 'Mango',
  colors: {
    1: '#F0A83C', // ripe mango blob
    2: '#D8642C', // rind feature
    3: '#FFD98C', // flesh pattern
    4: '#A8C850', // leaf accent
    5: '#B87828', // shaded outline
    6: '#FFF8E8',
    7: '#2E1A06',
    8: '#D8664C',
  },
};

const lagoon: Palette = {
  name: 'Lagoon',
  colors: {
    1: '#4FBFAE', // teal blob
    2: '#2E8478', // deep lagoon feature
    3: '#A8E8DC', // shallows pattern
    4: '#F0D888', // sand accent
    5: '#38867C', // shaded outline
    6: '#F0FFFC',
    7: '#0A2622',
    8: '#D07C7C',
  },
};

const plum: Palette = {
  name: 'Plum',
  colors: {
    1: '#7A5C8E', // plum blob
    2: '#4E3660', // dark plum feature
    3: '#B79ACC', // bloom pattern
    4: '#E0A0C0', // blossom accent
    5: '#5C4470', // shaded outline
    6: '#F6EEFF',
    7: '#180E22',
    8: '#B06A8A',
  },
};

const bone: Palette = {
  name: 'Bone',
  colors: {
    1: '#E4D8C0', // bone blob
    2: '#B09878', // taupe feature
    3: '#F6EEDC', // chalk pattern
    4: '#C8A860', // brass accent
    5: '#A89474', // shaded outline
    6: '#FFFFFF',
    7: '#2A2418',
    8: '#C08C7C',
  },
};

const inkwell: Palette = {
  name: 'Inkwell',
  colors: {
    1: '#5A6B8C',
    2: '#39465F',
    3: '#93A6C4',
    4: '#C8A85A',
    5: '#3D4A63',
    6: '#F0F4FF',
    7: '#0C1220',
    8: '#8A6E8E',
  },
};

const peach: Palette = {
  name: 'Peach',
  colors: {
    1: '#F8B48C',
    2: '#DE7F5C',
    3: '#FFD9BE',
    4: '#7FC49A',
    5: '#C4805E',
    6: '#FFF6EE',
    7: '#3A1E10',
    8: '#D97878',
  },
};

const mint: Palette = {
  name: 'Mint',
  colors: {
    1: '#8ADCB4',
    2: '#4FA87E',
    3: '#CDF2DE',
    4: '#F0C060',
    5: '#5F9C7C',
    6: '#F2FFF8',
    7: '#0E2A1E',
    8: '#D08A96',
  },
};

const rose: Palette = {
  name: 'Rose',
  colors: {
    1: '#E88CA0',
    2: '#B4506A',
    3: '#FFC4D2',
    4: '#F0D890',
    5: '#B06478',
    6: '#FFF2F6',
    7: '#2E0C18',
    8: '#C4566E',
  },
};

const storm: Palette = {
  name: 'Storm',
  colors: {
    1: '#6E7C99',
    2: '#454F68',
    3: '#A5B2CC',
    4: '#8CC0D8',
    5: '#4E5872',
    6: '#EEF2FA',
    7: '#101622',
    8: '#96707E',
  },
};

const marigold: Palette = {
  name: 'Marigold',
  colors: {
    1: '#F2C044',
    2: '#C4882A',
    3: '#FFE694',
    4: '#7FA860',
    5: '#B08428',
    6: '#FFFBEA',
    7: '#2E2206',
    8: '#C4744C',
  },
};

const violet: Palette = {
  name: 'Violet',
  colors: {
    1: '#A88CE0',
    2: '#6E52A8',
    3: '#D4C2F4',
    4: '#F0A8C8',
    5: '#7A5FB4',
    6: '#F8F2FF',
    7: '#1A1030',
    8: '#B06898',
  },
};

const clay: Palette = {
  name: 'Clay',
  colors: {
    1: '#C08A6E',
    2: '#8E5C46',
    3: '#E4BFA4',
    4: '#7E9C7A',
    5: '#8A6250',
    6: '#FBF2EA',
    7: '#2A180E',
    8: '#B06A5C',
  },
};

const sea: Palette = {
  name: 'Sea',
  colors: {
    1: '#5FA8C4',
    2: '#316C8C',
    3: '#A8DCEC',
    4: '#F0CE7A',
    5: '#3E7C9C',
    6: '#F0FAFE',
    7: '#08202E',
    8: '#C4787E',
  },
};

const fern: Palette = {
  name: 'Fern',
  colors: {
    1: '#78B45A',
    2: '#4A7C3A',
    3: '#B6DC9A',
    4: '#E0C060',
    5: '#578A44',
    6: '#F4FCEC',
    7: '#12240A',
    8: '#C08A6A',
  },
};

const cocoa: Palette = {
  name: 'Cocoa',
  colors: {
    1: '#8E6E5C',
    2: '#5C463A',
    3: '#C0A490',
    4: '#D4A860',
    5: '#6E5648',
    6: '#F6EFE8',
    7: '#1E120C',
    8: '#A86C64',
  },
};

const neon: Palette = {
  name: 'Neon',
  colors: {
    1: '#7CE0C8',
    2: '#2EA890',
    3: '#C0FFEE',
    4: '#F080B8',
    5: '#3E9C88',
    6: '#F0FFFC',
    7: '#062420',
    8: '#D06898',
  },
};

export const palettes: Palette[] = [
  sunrise,
  ocean,
  forest,
  berry,
  desert,
  arctic,
  autumn,
  twilight,
  meadow,
  candy,
  coral,
  cloud,
  ember,
  moss,
  orchid,
  slate,
  mango,
  lagoon,
  plum,
  bone,
  inkwell,
  peach,
  mint,
  rose,
  storm,
  marigold,
  violet,
  clay,
  sea,
  fern,
  cocoa,
  neon,
];

export function getPalette(index: number): Palette {
  return palettes[index % palettes.length];
}

export function resolveColor(palette: Palette, token: ColorToken): string | null {
  if (token === 0) return null;
  return palette.colors[token];
}

/** How many tones `shadePalette` offers. */
export const SHADE_COUNT = 3;

function mix(hex: string, towards: number, amount: number): string {
  const channel = (i: number) => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
    return Math.round(v + (towards - v) * amount).toString(16).padStart(2, '0');
  };
  return `#${channel(0)}${channel(1)}${channel(2)}`.toUpperCase();
}

/**
 * Returns a lighter or deeper version of a palette.
 *
 * A third axis of colour variety for free — twenty palettes behave like sixty
 * without anyone hand-picking sixty sets of hexes. Tokens 6 and 7 (eye white
 * and pupil) are deliberately untouched: shading them would close the gap that
 * makes a face readable at 16px.
 */
/**
 * Relative luminance, per WCAG. Used only to compare two palette colours with
 * each other, never against a page background.
 */
function luminance(hex: string): number {
  const channel = (i: number) => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * How far each token has to stand off the body colour it is drawn on.
 *
 * The palettes were picked by eye, and several of them put a token within a
 * hair of the body: Twilight's mouth was 1.01:1 against its blob, which is to
 * say invisible, and twenty of the thirty-two were under 1.5:1. A hat drawn in
 * the pattern colour vanished the same way, leaving just its brim — the reason
 * so many of them read as a stripe across the forehead rather than a hat.
 *
 * Rather than repaint thirty-two palettes by hand, each token is pushed away
 * from the body's lightness until it clears the floor for the job it does.
 * Only lightness moves, so a rosy mouth stays rosy. The floors are deliberately
 * uneven: a body pattern wants to stay quiet, a mouth carries the expression.
 */
const CONTRAST_FLOOR: Record<number, number> = {
  2: 1.7, // features — ears, antennae, sprouts
  3: 1.7, // body patterns, and the crown of a hat
  4: 1.7, // accents — brims, props, trim
  5: 2.4, // outlines — glasses, whiskers, moustaches
  8: 2.6, // the mouth carries the whole expression
};

/**
 * Pushes a colour away from the body colour until it clears its floor.
 *
 * It keeps whichever side of the body the colour was already on, so a dark
 * mouth gets darker rather than flipping to light. Steps are small and capped:
 * a colour that cannot reach its floor without going fully black or white
 * stops at the edge rather than blowing out the palette.
 */
function separate(color: string, body: string, floor: number): string {
  if (contrast(color, body) >= floor) return color;
  const bodyLum = luminance(body);
  const towards = luminance(color) === bodyLum ? (bodyLum > 0.4 ? 0 : 255)
    : luminance(color) < bodyLum ? 0 : 255;

  const reach = (target: number) => {
    let result = color;
    for (let amount = 0.04; amount <= 1; amount += 0.04) {
      result = mix(color, target, amount);
      if (contrast(result, body) >= floor) break;
    }
    return result;
  };

  // Prefer the side the colour is already on, but a light body under the soft
  // shade can leave no room upwards; take the other direction rather than fall
  // short of the floor.
  const preferred = reach(towards);
  if (contrast(preferred, body) >= floor) return preferred;
  const other = reach(towards === 0 ? 255 : 0);
  return contrast(other, body) > contrast(preferred, body) ? other : preferred;
}

/** Applies every contrast floor against the palette's own body colour. */
function legible(palette: Palette): Palette {
  const colors = { ...palette.colors };
  for (const token of [2, 3, 4, 5, 8] as const) {
    colors[token] = separate(colors[token], colors[1], CONTRAST_FLOOR[token]);
  }
  return { name: palette.name, colors };
}

export function shadePalette(palette: Palette, shade: number): Palette {
  if (shade === 1) return legible(palette);
  const [towards, amount] = shade === 0 ? [255, 0.28] : [0, 0.22];

  const colors = { ...palette.colors };
  for (const token of [1, 2, 3, 4, 5, 8] as const) {
    colors[token] = mix(colors[token], towards, amount);
  }
  return legible({ name: palette.name, colors });
}
