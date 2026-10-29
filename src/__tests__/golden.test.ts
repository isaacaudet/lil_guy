import { describe, expect, it } from 'bun:test';
import { compose } from '../compose';
import { resolve } from '../resolve';
import { toSvgString } from '../render-string';

/**
 * A fixed set of inputs, rendered as text. The art in this library changed
 * several times before anything pinned it down, and an unintended change to a
 * part looked identical to an intended one in review. These blocks make any
 * change to the composed output show up as a diff.
 *
 * Updating them is expected whenever the art genuinely changes — read the diff
 * and confirm it is what you meant, then paste the new block in.
 */
// The same characters the parts are drawn in, so a snapshot reads like the art.
const GLYPH = '.#shoewcmtaAxbgGyYr';

function render(input: string): string {
  return compose(resolve(input))
    .map(row => row.map(v => GLYPH[v]).join(''))
    .join('\n');
}

const SAMPLES = ['alice', 'bob@example.com', 'charlie_123', '', '🎉', 'a'.repeat(64)];

describe('golden art', () => {
  it('composes the same grid for a fixed set of inputs', () => {
    const rendered = Object.fromEntries(SAMPLES.map(s => [s, render(s)]));
    expect(rendered).toMatchSnapshot();
  });

  it('emits the same SVG for a fixed input', () => {
    expect(toSvgString('alice', { size: 16, square: true, small: false })).toMatchSnapshot();
  });

  it('covers every head wearing every topper', () => {
    const { heads, hair } = require('../parts');
    const grids: Record<string, string> = {};
    heads.forEach((head: { name: string }, h: number) => {
      hair.forEach((topper: { name: string }, t: number) => {
        grids[`${head.name} + ${topper.name}`] = compose({
          head: h, eyes: 1, mouth: 0, cheeks: 1, hair: t, body: 0, accessory: 0,
          arms: 0, feet: 0, palette: 0, shade: 1, flip: false, rotation: 0,
        }).map((row: number[]) => row.map(v => GLYPH[v]).join('')).join('\n');
      });
    });
    expect(grids).toMatchSnapshot();
  });
});
