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
export const ART_VERSION = 1;

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
}

export const PART_KEYS = ['head', 'eyes', 'mouth', 'cheeks', 'hair', 'body', 'accessory', 'arms', 'feet', 'shade', 'flip', 'lucky', 'rotation'] as const;

/** A spec as a short, address-safe code. Anything that draws the same guy gives the same code. */
export function guyCode(spec: CardSpec): string {
  const parts = spec.parts && Object.keys(spec.parts).length
    ? PART_KEYS.map(k => { const v = (spec.parts as Record<string, unknown>)[k]; return v === undefined ? '' : typeof v === 'boolean' ? (v ? 't' : 'f') : String(v); }).join('.')
    : undefined;
  const short = { s: spec.seed, p: parts, c: spec.palette, e: spec.equip?.length ? spec.equip : undefined, g: spec.grade, t: spec.tint };
  const json = JSON.stringify(short);
  const bytes = new TextEncoder().encode(json);
  let bin = ''; for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** A baked guy's size, and a card's. */
export const BAKED_SIZE = { guy: { width: 22, height: 20 }, card: { width: 26, height: 42 } } as const;

/** What a baked picture shows: a move looping, his still, or his card. */
export type View = string;
