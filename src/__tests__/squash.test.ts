import { describe, expect, test } from 'bun:test';
import { animate, squashRows, HEADROOM, MOVES } from '../animate';
import { compose, faceOf } from '../compose';
import { dress, items } from '../items';
import { heads, mouths } from '../parts';
import { T } from '../parts/art';
import { resolve } from '../resolve';
import type { AvatarConfig } from '../types';

/**
 * A squash or stretch never cuts a face: the rows it loses or repeats never
 * hold eye ink, eye shine, a mouth or a tongue, in any pose he takes, and
 * never fall between his eyes and the foot of his mouth. Checked for every
 * head and every skin, against the face as compose draws it, and every move
 * is played for each of them.
 */
const FACE = new Set<number>([T.EYE, T.WHITE, T.MOUTH, T.TONGUE]);
const POSE_MOUTHS = ['laugh', 'wobble', 'ooh', 'blep', 'smile', 'grin'].map(n => mouths.findIndex(m => m.name === n));

const guys: { name: string; input: string; options: { parts?: { head: number }; equip?: string[] } }[] = [
  ...heads.map((h, head) => ({ name: `head ${h.name}`, input: `squash-head-${head}`, options: { parts: { head } } })),
  ...items.filter(i => i.slot === 'skin').map(i => ({ name: `skin ${i.id}`, input: `squash-${i.id}`, options: { equip: [i.id] } })),
];

/** The frame rows his face takes in any of his mouths, worked out from compose alone. */
function faceRows(config: AvatarConfig): { rows: Set<number>; last: number } {
  const rows = new Set<number>();
  let last = -1;
  for (const mouth of [config.mouth, ...POSE_MOUTHS]) {
    const worn = { ...config, mouth, frame: undefined, aura: undefined };
    const grid = compose(worn), f = faceOf(worn);
    grid.forEach((row, y) => { if (row.some(t => FACE.has(t))) rows.add(y + HEADROOM); if (row.some(Boolean)) last = Math.max(last, y + HEADROOM); });
    for (let y = f.top; y <= Math.max(f.line, f.mouthBottom); y++) rows.add(y + HEADROOM);
  }
  return { rows, last };
}

describe('squashes', () => {
  test.each(guys.map(g => [g.name, g] as const))('never cut the face: %s', (_, g) => {
    const config = dress(resolve(g.input, g.options.parts), g.options, g.input);
    const { rows: face, last } = faceRows(config);
    const plan = squashRows(g.input, g.options);
    for (const n of [-2, -1, 1, 2]) {
      const rows = plan.rows[n];
      if (!rows) continue;
      expect(rows.length).toBeLessThanOrEqual(Math.abs(n));
      for (const r of rows) {
        expect(face.has(r)).toBe(false);
        // The feet stay where they are.
        expect(r).toBeLessThan(last);
      }
    }
    // Every move plays, his feet never leaving the frame's floor except to jump.
    for (const move of MOVES) {
      const a = animate(g.input, move, { ...g.options, rarity: false });
      expect(a.frames.length).toBeGreaterThan(0);
      for (const f of a.frames) expect(f.colors.findLastIndex(row => row.some(Boolean))).toBeLessThanOrEqual(last);
    }
  });

  test('most guys squash at all, rather than bob', () => {
    const squashing = guys.filter(g => squashRows(g.input, g.options).rows[1]).length;
    expect(squashing / guys.length).toBeGreaterThan(0.6);
  });
});
