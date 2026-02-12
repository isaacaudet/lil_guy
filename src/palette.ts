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
];

export function getPalette(index: number): Palette {
  return palettes[index % palettes.length];
}

export function resolveColor(palette: Palette, token: ColorToken): string | null {
  if (token === 0) return null;
  return palette.colors[token];
}
