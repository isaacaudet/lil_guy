/**
 * Every part is drawn as text, one character per pixel, so the art can be
 * read and edited as a picture rather than a wall of numbers.
 *
 *   .  nothing          #  body            s  body shade      h  highlight
 *   o  outline          e  eye             w  white           c  blush
 *   m  mouth            t  tongue          a  accent          A  accent shade
 *   x  trim             b  belly           g  leaf            G  leaf shade
 *   y  gold             Y  gold shade      r  red             d  deep shade
 *   1-9  an item's own colours (a jar's glass, a golf flag's red), listed
 *        with the item rather than taken from the guy's palette
 */
export const KEY: Record<string, number> = {
  '.': 0,
  '#': 1, s: 2, h: 3, o: 4,
  e: 5, w: 6, c: 7, m: 8, t: 9,
  a: 10, A: 11, x: 12, b: 13,
  g: 14, G: 15, y: 16, Y: 17, r: 18, d: 19,
  1: 101, 2: 102, 3: 103, 4: 104, 5: 105, 6: 106, 7: 107, 8: 108, 9: 109,
};

export const T = {
  EMPTY: 0, BODY: 1, SHADE: 2, LIGHT: 3, OUTLINE: 4,
  EYE: 5, WHITE: 6, BLUSH: 7, MOUTH: 8, TONGUE: 9,
  ACCENT: 10, ACCENT_SHADE: 11, TRIM: 12, BELLY: 13,
  LEAF: 14, LEAF_SHADE: 15, GOLD: 16, GOLD_SHADE: 17, RED: 18, DEEP: 19,
} as const;

/**
 * Item colours are drawn as 101–109 and moved into their layer's range once
 * the layer is down: a skin's to 20–28, a hat's to 30–38, a frame's to 40–48.
 * Each layer keeps its own colours, so a gold hat on a glass jar works.
 */
export const LOCAL = 101;
export const LAYER = { skin: 20, hat: 30, frame: 40 } as const;

/** A small drawing: rows of tokens, not necessarily 16 wide. */
export type Stamp = number[][];

export function stamp(rows: string[]): Stamp {
  return rows.map(row => [...row].map(ch => {
    const token = KEY[ch];
    if (token === undefined) throw new Error(`Unknown art character "${ch}" in "${row}"`);
    return token;
  }));
}

export function width(s: Stamp): number {
  return s.reduce((w, row) => Math.max(w, row.length), 0);
}
