import { resolve } from './resolve';
import { dress, itemById, withItems } from './items';
import { compose } from './compose';
import { paint } from './paint';
import { paletteOf } from './palette';
import { encode, gradeOf, nameOf, wearOf, type Owned } from './owned';
import { copyOneIn } from './rarity';
import { GRID_SIZE, type AvatarConfig } from './types';

/**
 * A card to share a copy: the guy wearing it, big, and what makes it rare.
 * 1200×630, the size link previews use, as one SVG string with no fonts or
 * images to fetch, so a server can turn it into a PNG for an og:image.
 */
export interface ShareOptions {
  /** The player's name, shown as a label. The guy is drawn from `input`. */
  name?: string;
  /** Small line at the bottom, like the site's address. */
  footer?: string;
  /** The guy as the player has him: a picked look laid over `input` (see `lookOf`). */
  config?: AvatarConfig;
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

function count(n: number): string {
  return n >= 1e12 ? `${(n / 1e12).toFixed(1)} trillion` : n >= 1e9 ? `${(n / 1e9).toFixed(1)} billion`
    : n >= 1e6 ? `${(n / 1e6).toFixed(1)} million` : Math.round(n).toLocaleString('en-US');
}

export function toShareSvg(input: string, copy: Owned, options: ShareOptions = {}): string {
  const config = dress(options.config ?? resolve(input), { equip: [encode(copy)] });
  const colors = paint(compose(config), config, withItems(paletteOf(config), config));
  const grade = gradeOf(copy);
  const item = itemById(copy.item);
  const [title, finish] = nameOf(copy).split(' | ');
  const px = 26, gx = 96, gy = (630 - GRID_SIZE * px) / 2;

  const rects: string[] = [];
  colors.forEach((row, y) => {
    let x = 0;
    while (x < GRID_SIZE) {
      const c = row[x];
      let w = 1;
      while (x + w < GRID_SIZE && row[x + w] === c) w++;
      if (c) rects.push(`<rect x="${gx + x * px}" y="${gy + y * px}" width="${w * px}" height="${px}" fill="${c}"/>`);
      x += w;
    }
  });

  const odds = copyOneIn(copy);
  const lines = [
    `${wearOf(copy.scuff).name} · scuff ${copy.scuff.toFixed(4)} · print #${copy.print}`,
    copy.tally !== undefined ? `${copy.tally} days on its tally` : '',
    copy.item === 'aura.beta' ? 'Awarded to DLE Club beta testers' : item?.free ? 'Everyone has one; no two are alike' : `1 in ${count(odds)} capsules`,
  ].filter(Boolean);
  const font = 'font-family="system-ui, -apple-system, Segoe UI, sans-serif"';

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img">`,
    `<title>${esc(nameOf(copy))}</title>`,
    `<defs><radialGradient id="glow" cx="0.27" cy="0.5" r="0.5"><stop offset="0" stop-color="${grade.color}" stop-opacity="0.55"/><stop offset="1" stop-color="${grade.color}" stop-opacity="0"/></radialGradient></defs>`,
    `<rect width="1200" height="630" fill="#14182a"/>`,
    `<rect width="1200" height="630" fill="url(#glow)"/>`,
    `<g shape-rendering="crispEdges">${rects.join('')}</g>`,
    `<text x="600" y="150" ${font} font-size="24" font-weight="700" letter-spacing="4" fill="#a8b0cf">${esc((options.name ? `${options.name.toUpperCase()}'S COPY` : 'A ONE-OF-A-KIND COPY'))}</text>`,
    `<text x="600" y="232" ${font} font-size="60" font-weight="800" fill="#ffffff">${esc(title)}</text>`,
    finish ? `<text x="600" y="296" ${font} font-size="40" font-weight="700" fill="${grade.color}">${esc(finish)}</text>` : '',
    `<rect x="600" y="${finish ? 324 : 264}" width="${grade.name.length * 18 + 40}" height="48" rx="10" fill="${grade.color}"/>`,
    `<text x="620" y="${finish ? 357 : 297}" ${font} font-size="26" font-weight="800" fill="#ffffff">${esc(grade.name)}</text>`,
    ...lines.map((l, i) => `<text x="600" y="${(finish ? 420 : 360) + i * 44} " ${font} font-size="28" fill="#dfe3f2">${esc(l)}</text>`),
    `<text x="600" y="570" ${font} font-size="24" font-weight="700" fill="#ffcf5c">${esc(options.footer ?? 'dleclub.com')}</text>`,
    `</svg>`,
  ].join('');
}
