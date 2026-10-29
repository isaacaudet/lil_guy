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
  // The workshop's paints of the month (Isaac, October 29: something for metal to go on): each on sale
  // only in its month, for LIMITED_PAINT_COST. A copy painted then keeps it. Append only, as ids are kept.
  'frostbite':     { name: 'Frostbite', hex: '#9FD6F0', month: '2026-11' },
  'last-ember':    { name: 'Last Ember', hex: '#C4502A', month: '2026-11' },
  'evergreen':     { name: 'Evergreen', hex: '#2F6B45', month: '2026-12' },
  'candy-cane':    { name: 'Candy Cane', hex: '#E04A5A', month: '2026-12' },
  'midnight':      { name: 'Midnight Blue', hex: '#232F5C', month: '2027-01' },
  'champagne':     { name: 'Champagne', hex: '#E9D9A6', month: '2027-01' },
  'sweetheart':    { name: 'Sweetheart', hex: '#E36A8E', month: '2027-02' },
  'sugar-plum':    { name: 'Sugar Plum', hex: '#6B3B6E', month: '2027-02' },
  'lucky-clover':  { name: 'Lucky Clover', hex: '#3FA35B', month: '2027-03' },
  'puddle':        { name: 'Puddle Grey', hex: '#8A93A0', month: '2027-03' },
  'blossom':       { name: 'Cherry Blossom', hex: '#F3B8C8', month: '2027-04' },
  'robins-egg':    { name: 'Robin’s Egg', hex: '#8FD3D0', month: '2027-04' },
} as const;
export type PaintId = keyof typeof PAINTS;
export const PAINT_IDS = Object.keys(PAINTS) as PaintId[];
/** Metal for a paint of the month: two refined, six times an ordinary tin. */
export const LIMITED_PAINT_COST = 18;
/** The month a paint of the month is on sale (`YYYY-MM`), or undefined for one always on the shelf. */
export const paintMonth = (id: PaintId): string | undefined => (PAINTS[id] as { month?: string }).month;
/** Whether a paint can be bought on `day` (`YYYY-MM-DD`): always, or in its month. */
export const paintOnSale = (id: PaintId, day: string): boolean => { const m = paintMonth(id); return !m || day.startsWith(m); };
/** The paints for sale on `day`: the shelf, then that month's. */
export const paintsOnSale = (day: string): PaintId[] => PAINT_IDS.filter(id => paintOnSale(id, day));
/** What a tin of `id` costs, in scrap. */
export const paintCost = (id: PaintId, base: number): number => (paintMonth(id) ? LIMITED_PAINT_COST : base);
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
