import { ART_VERSION, BAKED_SIZE, viewSize } from './guy-code';

/**
 * The lil guys kit for a game: a player's guy anywhere from one address or one line, with nothing of
 * the library on the page. Every picture comes from the lil guys Worker (`/g/`), finished and cached
 * for good, and plays in a plain `<img>`, so a board of a hundred animates with no script per frame.
 * GAMES.md has where each view goes.
 *
 *   lilGuyUrl('Sneaky Gumdrop', 'face')                → https://lilguys.dleclub.com/g/14/~Sneaky%20Gumdrop/face.png
 *   row.prepend(lilGuyImg('mia', 'row'))               → an <img> sized for a board's row
 *   const guys = await lilGuysFor(['mia', 'theo'])     → each name's code, claimed or not, in one read
 *
 * The served copy (`/lilguys.js` as a classic script, `/lilguys.mjs` as a module) knows its own host;
 * a copy bundled from the library talks to `LILGUYS_HOST` unless told otherwise (`setLilGuysHost`).
 */

/** The lil guys Worker. */
export const LILGUYS_HOST = 'https://lilguys.dleclub.com';

let defaultHost = LILGUYS_HOST;
/** Where the helpers send for pictures when a call doesn't say: a local Worker while developing, say. */
export function setLilGuysHost(host: string): void { defaultHost = host.replace(/\/+$/, ''); }
/** The host the helpers use. */
export const lilGuysHost = () => defaultHost;

/** One player's guy as the batch read gives him (`lilGuysFor`). */
export interface LilGuyInfo {
  /** Whether the name is claimed on the lil guys site. */
  claimed: boolean;
  /** The name to show: `@name` for a claimed one, else the name as asked (lowercased). */
  name: string;
  /** His guy code as he is worn now, for `/g/<version>/<code>/<view>`. */
  code: string;
  /** Whether he is the founder, the one of one. */
  founder: boolean;
  /** Whether his moves are drawn wide (`BAKED_SIZE.buddy`): he has a buddy beside him. */
  wide: boolean;
  /** Ready-made addresses for the views boards use most, at 1×. */
  urls: { icon: string; face: string; idle: string; still: string; pfp: string; card: string; cardFull: string };
}

/**
 * A player, as the helpers take one: a name as typed (any player, claimed or not: `~name`), `@name`
 * for a claimed name only, `{ code }` for an exact guy (`guyCode`), or what `lilGuysFor` gave.
 */
export type Who = string | { code: string } | LilGuyInfo;

/** A place in a game a guy goes, and the view and size that suit it. */
export interface LilGuyPreset {
  /** The view (GAMES.md's table). */
  view: string;
  /** Screen pixels per art pixel. */
  scale: number;
}

/** Where games put a guy, each with its view and size (GAMES.md, Where it goes). */
export const LIL_GUY_PRESETS = {
  /** A menu or a nav bar: his icon, 32 px. */
  menu: { view: 'icon', scale: 2 },
  /** A chat line: his face, 28 px. */
  chat: { view: 'face', scale: 2 },
  /** A leaderboard row: his face, 42 px. */
  row: { view: 'face', scale: 3 },
  /** A results screen: him idling, 80 px tall. */
  results: { view: 'idle', scale: 4 },
  /** A profile: his profile picture in a 96 px square. */
  profile: { view: 'pfp', scale: 3 },
  /** A card in a list: the small card face, 78 × 126. */
  card: { view: 'card', scale: 3 },
  /** A player's page: the big card, 280 × 408. */
  'card-full': { view: 'card-full', scale: 2 },
} as const satisfies Record<string, LilGuyPreset>;

/** A preset's name. */
export type LilGuyPresetName = keyof typeof LIL_GUY_PRESETS;

/** What a picture is saved as: `png` (animated when it moves), `gif`, or a game's `sheet` and its `json`. */
export type LilGuyFormat = 'png' | 'gif' | 'sheet' | 'json';

export interface LilGuyUrlOptions {
  /** Whole pixels per art pixel, 1 to 16. Default 1: let CSS scale it (`image-rendering: pixelated`). */
  scale?: number;
  format?: LilGuyFormat;
  /** The Worker; `lilGuysHost()` by default. */
  host?: string;
  /** The art version, or `latest`. Default the version this script was built with, which the Worker it came from serves. */
  version?: number | 'latest';
}

const isInfo = (who: Who): who is LilGuyInfo => typeof who === 'object' && 'urls' in who;

/** The guy part of an address. A big card shows a name, so an info's card goes by the card's own address. */
function guyPart(who: Who): string {
  if (typeof who === 'string') return who[0] === '@' ? '@' + encodeURIComponent(who.slice(1).toLowerCase()) : '~' + encodeURIComponent(who.replace(/^~/, ''));
  return who.code;
}

/** A preset's view, or the view itself. */
const viewOf = (view: string) => (view in LIL_GUY_PRESETS ? LIL_GUY_PRESETS[view as LilGuyPresetName].view : view);

/**
 * A guy's picture's address: `lilGuyUrl('mia', 'face', { scale: 2, format: 'gif' })`. `view` is a view
 * or a preset's name.
 */
export function lilGuyUrl(who: Who, view = 'idle', { scale = 1, format = 'png', host = defaultHost, version = ART_VERSION }: LilGuyUrlOptions = {}): string {
  const v = viewOf(view), s = Math.max(1, Math.min(16, Math.round(scale)));
  const at = s > 1 ? `@${s}` : '';
  const file = format === 'gif' ? `${v}${at}.gif` : format === 'sheet' ? `${v}.sheet${at}.png` : format === 'json' ? `${v}.sheet${at}.json` : `${v}${at}.png`;
  if (isInfo(who) && (v === 'card-full' || v === 'card-full-still')) {
    // The batch read's big card carries the name it shows.
    const card = who.urls.cardFull.split('/').slice(-2)[0];
    return `${host.replace(/\/+$/, '')}/g/${version}/${card}/${file}`;
  }
  return `${host.replace(/\/+$/, '')}/g/${version}/${guyPart(who)}/${file}`;
}

/** A view's box at `scale`, in CSS pixels: null for the width of a move, which a buddy widens, when nothing says. */
export function lilGuySize(view: string, scale = 1, wide?: boolean): { width: number | null; height: number } {
  const v = viewOf(view), size = viewSize(v);
  if (size) return { width: size.width * scale, height: size.height * scale };
  if (v === 'pfp' || v === 'pfp-still') return { width: PFP_BOX * scale, height: PFP_BOX * scale };
  return { width: wide === undefined ? null : (wide ? BAKED_SIZE.buddy.width : BAKED_SIZE.guy.width) * scale, height: BAKED_SIZE.guy.height * scale };
}

/** The square a profile picture is fitted into, per screen pixel of scale: its own side is 20 to 34, depending on the guy. */
const PFP_BOX = 32;

/** A 16 × 16 stand-in for when a picture can't be had: a plain lil guy's shape in grey. */
export const LIL_GUY_PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><path fill="#9aa1ab" d="M5 3h6v1h2v1h1v2h1v5h-1v2h-2v1H4v-1H2v-2H1V7h1V5h1V4h2z"/><path fill="#5b616b" d="M5 8h1v2H5zm5 0h1v2h-1zM7 11h2v1H7z"/></svg>');

export interface LilGuyImgOptions {
  /** Screen pixels per art pixel, or a preset's name. Default: the preset's, else 3. */
  size?: number | LilGuyPresetName;
  /** What a screen reader says. Default the player's name; '' makes him decorative. */
  alt?: string;
  host?: string;
  /**
   * Offer 2× and 4× pictures for high-density screens (`srcset`). Off by default: a 1× picture
   * scaled up with `image-rendering: pixelated` is exactly as sharp at any whole-number size, is
   * a fraction of the bytes, and decodes a sixteenth of the pixels. Turn it on where the picture
   * may be shown without CSS (an email, a copy pasted elsewhere).
   */
  srcset?: boolean;
  /** Whether his moves are drawn wide; `lilGuysFor` says, as `wide`. */
  wide?: boolean;
  /** The picture's class. */
  className?: string;
}

/**
 * A ready `<img>` of a guy: `lilGuyImg('mia', 'row')` or `lilGuyImg(info, 'face', { size: 2 })`. Sized
 * with `width` and `height` (no layout shift), pixelated, lazy, decoded off the main thread, with alt
 * text, and a grey stand-in if the picture can't be had. Animated views play in the `<img>` itself.
 */
export function lilGuyImg(who: Who, view: string = 'row', options: LilGuyImgOptions = {}): HTMLImageElement {
  const preset = view in LIL_GUY_PRESETS ? LIL_GUY_PRESETS[view as LilGuyPresetName] as LilGuyPreset : null;
  const v = viewOf(view);
  const scale = typeof options.size === 'string' ? LIL_GUY_PRESETS[options.size].scale : options.size ?? preset?.scale ?? 3;
  const wide = options.wide ?? (isInfo(who) ? who.wide : undefined);
  const box = lilGuySize(v, scale, wide);
  const host = options.host ?? defaultHost;
  const img = document.createElement('img');
  img.src = lilGuyUrl(who, v, { host });
  if (options.srcset) img.srcset = [1, 2, 4].map(d => `${lilGuyUrl(who, v, { host, scale: d })} ${d}x`).join(', ');
  if (box.width !== null) img.width = box.width;
  img.height = box.height;
  img.alt = options.alt ?? (typeof who === 'string' ? who.replace(/^[@~]/, '') : isInfo(who) ? who.name : '');
  img.loading = 'lazy';
  img.decoding = 'async';
  img.draggable = false;
  if (options.className) img.className = options.className;
  img.style.cssText = `image-rendering:pixelated;object-fit:contain;${box.width === null ? `width:auto;min-width:${BAKED_SIZE.guy.width * scale}px;` : ''}`;
  img.addEventListener('error', () => { img.removeAttribute('srcset'); img.src = LIL_GUY_PLACEHOLDER; }, { once: true });
  return img;
}

/** The most names one batch read takes. */
export const BATCH_MAX = 100;

const known = new Map<string, Promise<LilGuyInfo | null>>();
const KNOWN_MAX = 5000;

/**
 * Every player on a board in one read (`GET /api/club/batch`), up to a hundred names to a request and
 * as many requests as it takes: each name (lowercased) to its guy, claimed or not, or null when the
 * Worker couldn't be reached. Answers are kept for the page's life, so asking again costs nothing.
 */
export async function lilGuysFor(names: string[], { host = defaultHost }: { host?: string } = {}): Promise<Record<string, LilGuyInfo | null>> {
  const asked = [...new Set(names.map(n => String(n).toLowerCase()).filter(n => n && !/[,/]/.test(n)))];
  let missing = asked.filter(n => !known.has(`${host}|${n}`));
  if (known.size + missing.length > KNOWN_MAX) { known.clear(); missing = asked; }
  for (let i = 0; i < missing.length; i += BATCH_MAX) {
    const part = missing.slice(i, i + BATCH_MAX);
    const read = fetch(`${host.replace(/\/+$/, '')}/api/club/batch?names=${part.map(encodeURIComponent).join(',')}`)
      .then(r => (r.ok ? r.json() : null)).catch(() => null) as Promise<{ guys?: Record<string, LilGuyInfo> } | null>;
    for (const n of part) {
      const one = read.then(body => body?.guys?.[n] ?? null);
      known.set(`${host}|${n}`, one);
      // A read that failed is asked again next time.
      one.then(info => { if (!info) known.delete(`${host}|${n}`); });
    }
  }
  const out: Record<string, LilGuyInfo | null> = {};
  await Promise.all(asked.map(async n => { out[n] = (await known.get(`${host}|${n}`)) ?? null; }));
  return out;
}
