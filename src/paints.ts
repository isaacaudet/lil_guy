/**
 * Paint, as in TF2: a tin of one colour brushed over a hat or a buddy. It
 * tints every colour of the item to the paint, keeping each one's light and
 * shade, so the drawing reads as before, only in the new colour. Paint never
 * changes a copy's finish, float or rarity, and it scrapes off.
 */
export const PAINTS = {
  'lack-of-hue':   { name: 'A Lack of Hue', hex: '#2D2B36' },
  'abundance':     { name: 'An Abundance of White', hex: '#EEEDE6' },
  'pure-gold':     { name: 'Pure Gold', hex: '#E7B53B' },
  'pink-as-heck':  { name: 'Pink as Heck', hex: '#FF6EB4' },
  'noble-violet':  { name: 'Noble Violet', hex: '#7D4FA6' },
  'zesty-lime':    { name: 'Zesty Lime', hex: '#8FD43A' },
  'deep-sea':      { name: 'Deep Sea Teal', hex: '#2E8C8A' },
  'club-orange':   { name: 'Club Orange', hex: '#E8792F' },
  'team-red':      { name: 'Team Red', hex: '#C2403F' },
  'team-blue':     { name: 'Team Blue', hex: '#4E7FB3' },
  'mint':          { name: 'Mint Condition', hex: '#A8DDB5' },
  'clear-skies':   { name: 'Clear Skies', hex: '#8CC4F2' },
} as const;
export type PaintId = keyof typeof PAINTS;
export const PAINT_IDS = Object.keys(PAINTS) as PaintId[];
/** What can be painted. */
export const PAINTABLE = ['hat', 'buddy'] as const;

const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const toHex = (c: number[]) => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const light = (c: number[]) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);

/**
 * An item's colours under a paint: the first colour (an item's main one)
 * becomes the paint, and every other colour sits as much lighter or darker
 * than the paint as it did than the main one.
 */
export function painted(colors: string[], paint: PaintId | undefined): string[] {
  const p = paint && PAINTS[paint];
  if (!p || !colors.length) return colors;
  const base = rgb(p.hex), main = light(rgb(colors[0]));
  return colors.map(hex => {
    const d = light(rgb(hex)) - main;
    return toHex(d >= 0 ? mix(base, [255, 255, 255], Math.min(1, d * 1.5)) : mix(base, [0, 0, 0], Math.min(1, -d * 1.5)));
  });
}
