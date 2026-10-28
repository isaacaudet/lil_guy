import { describe, expect, it } from 'bun:test';
import { heads, eyes, mouths, cheeks } from '../parts';
import { Canvas } from '../parts/canvas';
import { width, type Stamp } from '../parts/art';
import { RETIRED_EYES } from '../parts/weights';
import { items } from '../items';
import { compose } from '../compose';
import { GRID_SIZE, type AvatarConfig } from '../types';

/**
 * The owner's rule for faces: an eye and the mouth may meet at a corner, but
 * never side by side or one over the other, where they run into one shape.
 */
const skins = items.filter(i => i.slot === 'skin');
const shapes: { name: string; art: Stamp; eyes: number; skin?: string }[] = [
  ...heads.map(h => ({ name: h.name, art: h.art, eyes: h.eyes })),
  ...skins.map(s => ({ name: s.id, art: s.art!, eyes: s.eyes!, skin: s.id })),
];
const liveEyes = eyes.map((e, i) => ({ ...e, i })).filter(e => !RETIRED_EYES.includes(e.i));
const key = (x: number, y: number) => y * GRID_SIZE + x;
/**
 * How many eye-and-mouth pairings, of about 68,000 across every head and skin,
 * may lose a mouth corner: nearly all are a chase grin on a skin with no room
 * under its face (a car, a Big L). Raise it only after looking at the new ones.
 */
const TRIM_LIMIT = 520;
const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** The cells a stamp covers at (x0, y0), on the body only (that's how the face is drawn). */
function cells(c: Canvas, s: Stamp, x0: number, y0: number): Set<number> {
  const out = new Set<number>();
  s.forEach((row, dy) => row.forEach((t, dx) => { if (t && c.isBody(x0 + dx, y0 + dy)) out.add(key(x0 + dx, y0 + dy)); }));
  return out;
}

const sideBySide = (a: Set<number>, b: Set<number>) => [...a].some(k => SIDES.some(([dx, dy]) => b.has(k + dy * GRID_SIZE + dx)));

function face(shape: (typeof shapes)[number], eye: Stamp, mouth: Stamp) {
  const c = new Canvas(shape.art.map(r => [...r]), shape.eyes);
  c.setFace(eye, mouth);
  const f = c.face!;
  return {
    c,
    eye: cells(c, eye, c.centred(eye), f.line - eye.length + 1),
    mouth: cells(c, f.mouth, c.centred(mouth), f.mouthTop),
    drawn: f.mouth.flat().filter(Boolean).length,
  };
}

describe('faces', () => {
  it('never put an eye beside or over the mouth, on any head or skin', () => {
    const wrong: string[] = [];
    for (const shape of shapes) for (const e of liveEyes) for (const m of mouths) {
      const f = face(shape, e.art, m.art);
      if (sideBySide(f.eye, f.mouth)) wrong.push(`${shape.name}: ${e.name} + ${m.name}`);
    }
    expect(wrong).toEqual([]);
  });

  it('draw every mouth in full, on any head or skin', () => {
    const wrong: string[] = [];
    for (const shape of shapes) for (const e of liveEyes) for (const m of mouths) {
      const f = face(shape, e.art, m.art);
      if (f.mouth.size < f.drawn) wrong.push(`${shape.name}: ${e.name} + ${m.name}`);
    }
    expect(wrong).toEqual([]);
  });

  it('leave off at most the two corners of a mouth, and only where a head has no room for it', () => {
    const trimmed: string[] = [], wrong: string[] = [];
    for (const shape of shapes) for (const e of liveEyes) for (const m of mouths) {
      const f = face(shape, e.art, m.art).c.face!;
      const lost = m.art.flat().filter(Boolean).length - f.mouth.flat().filter(Boolean).length;
      if (lost > 2 || f.mouth.slice(1).some((row, dy) => row.join() !== m.art[dy + 1].join())) { wrong.push(`${shape.name}: ${e.name} + ${m.name} loses ${lost}`); continue; }
      if (lost) trimmed.push(`${shape.name}: ${e.name} + ${m.name}`);
    }
    expect(wrong).toEqual([]);
    expect(trimmed.length).toBeLessThan(TRIM_LIMIT);
  });

  it('keep cheeks off the side of an eye or the mouth', () => {
    const base: AvatarConfig = { head: 0, eyes: 0, mouth: 0, cheeks: 0, hair: 0, body: 0, accessory: 0, arms: 0, feet: 0, shade: 1, flip: false, lucky: false, palette: 0, rotation: 0 };
    // The widest and tallest of each, which leave cheeks the least room.
    const tall = liveEyes.filter(e => e.art.length >= 3 || width(e.art) >= 10).map(e => e.i);
    const wide = mouths.map((m, i) => ({ m, i })).filter(({ m }) => width(m.art) >= 6 || m.art.length >= 3).map(({ i }) => i);
    const wrong: string[] = [];
    for (const shape of shapes) for (let k = 1; k < cheeks.length; k++) for (const e of [1, ...tall]) for (const m of [0, ...wide]) {
      const config = { ...base, ...(shape.skin ? { skin: shape.skin } : { head: heads.findIndex(h => h.name === shape.name) }), eyes: e, mouth: m };
      const bare = compose(config), g = compose({ ...config, cheeks: k });
      const f = face(shape, eyes[e].art, mouths[m].art);
      const marks = new Set<number>();
      g.forEach((row, y) => row.forEach((t, x) => { if (t !== bare[y][x] && !f.eye.has(key(x, y)) && !f.mouth.has(key(x, y))) marks.add(key(x, y)); }));
      if (sideBySide(marks, f.eye) || sideBySide(marks, f.mouth)) wrong.push(`${shape.name}: ${cheeks[k].name} by ${eyes[e].name} + ${mouths[m].name}`);
    }
    expect(wrong).toEqual([]);
  }, 300_000);
});
