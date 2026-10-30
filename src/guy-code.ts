import type { AnimateOptions } from './animate';

/**
 * A guy as an address carries him, and the art version every address names.
 * Kept apart from the renderer so a page that only shows guys from the lil
 * guys Worker (`<lil-guy>` with a host) can build their addresses without
 * shipping the library.
 */

/**
 * Bumped whenever the art changes. It is part of every baked image's address,
 * so a redraw reaches every board at once and an old address keeps its picture.
 */
export const ART_VERSION = 15;

/** Everything that makes a guy look the way he does. */
export interface GuySpec {
  /** His seed, or the name or text he is drawn from. */
  seed: string;
  /** Parts laid over the dealt ones (a picked look, a founder's guy). */
  parts?: AnimateOptions['parts'];
  /** A palette index laid over the dealt one. */
  palette?: number;
  /** The copies he wears, as `encode` writes them. */
  equip?: string[];
}

/** What a card shows, as an address carries it. */
export interface CardSpec extends GuySpec {
  /** The grade the card is shown at; by default the best of his copies'. */
  grade?: number;
  /** The window's tint when there's no grade. */
  tint?: string;
  /** The name across the top of his big card (`card-full`), at most `TITLE_MAX` characters. */
  title?: string;
}

/** The longest name a big card's code carries. */
export const TITLE_MAX = 24;

export const PART_KEYS = ['head', 'eyes', 'mouth', 'cheeks', 'hair', 'body', 'accessory', 'arms', 'feet', 'shade', 'flip', 'lucky', 'rotation'] as const;

/** A spec as a short, address-safe code. Anything that draws the same guy gives the same code. */
export function guyCode(spec: CardSpec): string {
  const parts = spec.parts && Object.keys(spec.parts).length
    ? PART_KEYS.map(k => { const v = (spec.parts as Record<string, unknown>)[k]; return v === undefined ? '' : typeof v === 'boolean' ? (v ? 't' : 'f') : String(v); }).join('.')
    : undefined;
  const short = { s: spec.seed, p: parts, c: spec.palette, e: spec.equip?.length ? spec.equip : undefined, g: spec.grade, t: spec.tint, n: spec.title || undefined };
  const json = JSON.stringify(short);
  const bytes = new TextEncoder().encode(json);
  let bin = ''; for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Every baked picture's size at 1×: a guy playing a move (`GUY_WIDTH` by `GUY_HEIGHT` in ./bake), a
 * guy with a buddy beside him (`BUDDY_GUY_WIDTH`), an icon, a face, the small card, the big card's
 * art and the big card. Nothing tells a page from an address alone whether a guy has a buddy, so size
 * a move's box by its height and let the picture set its width (the batch read says, as `wide`). A
 * profile picture (`pfp`) is square but its side depends on the guy, 20 to 34: show it in a square
 * box.
 */
export const BAKED_SIZE = {
  guy: { width: 22, height: 20 }, buddy: { width: 34, height: 20 }, card: { width: 26, height: 42 },
  icon: { width: 16, height: 16 }, face: { width: 14, height: 14 }, art: { width: 128, height: 128 }, cardFull: { width: 140, height: 204 },
} as const;

/** What a baked picture shows: a move looping, his still, or his card. */
export type View = string;

/** The views that aren't moves, each with its `-still`. */
export const PICTURE_VIEWS = ['icon', 'face', 'still', 'pfp', 'card', 'art', 'card-full'] as const;

/** A view's size at 1× (`BAKED_SIZE`), or null for one that depends on the guy (a move, `pfp`). */
export function viewSize(view: string): { width: number; height: number } | null {
  const base = view.replace(/-still$/, '');
  return base === 'icon' ? BAKED_SIZE.icon : base === 'face' || base.startsWith('emote-') ? BAKED_SIZE.face : base === 'card' ? BAKED_SIZE.card
    : base === 'art' ? BAKED_SIZE.art : base === 'card-full' ? BAKED_SIZE.cardFull : null;
}
