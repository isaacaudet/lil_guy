import { describe, expect, test } from 'bun:test';
import { compose } from '../compose';
import { heads, eyes, mouths, hair, accessories } from '../parts';
import { items } from '../items';
import { T } from '../parts/art';
import type { AvatarConfig } from '../types';

/**
 * Everything worn has to sit where it belongs on every guy: nothing on top of
 * the head ever covers an eye or the mouth, every hat shows, and glasses are
 * built round the eyes they're on. Checked on every head and skin, with the
 * tallest and widest eyes and mouths, since those leave the least room.
 */
const find = <T extends { name: string }>(list: T[], name: string) => list.findIndex(x => x.name === name);
const base: AvatarConfig = { head: 0, eyes: 0, mouth: 0, cheeks: 0, hair: 0, body: 0, accessory: 0, arms: 0, feet: 0, shade: 1, flip: false, lucky: false, palette: 0 };
const faces = [['shiny', 'smile'], ['glossy', 'laugh'], ['anime', 'grillz'], ['beans', 'tiny']].map(([e, m]) => ({ eyes: find(eyes, e), mouth: find(mouths, m) }));
const hats = items.filter(i => i.slot === 'hat');
const skins = items.filter(i => i.slot === 'skin');
// The eyes and mouth by their own colours (white alone is also the gleam on the head, which a hat may cover).
const FACE = new Set<number>([T.EYE, T.MOUTH, T.TONGUE]);
const faceCells = (g: number[][]) => g.flatMap((row, y) => row.map((v, x) => (FACE.has(v) ? `${x},${y},${v}` : ''))).filter(Boolean).sort().join(' ');
const bodies: AvatarConfig[] = [...heads.map((_, head) => ({ ...base, head })), ...skins.map(s => ({ ...base, skin: s.id }))];
const label = (c: AvatarConfig) => c.skin ?? heads[c.head].name;

describe('nothing on top of the head covers the face', () => {
  test('hats, on every head and skin, with every kind of face', () => {
    const bad: string[] = [];
    for (const b of bodies) for (const f of faces) {
      const bare = faceCells(compose({ ...b, ...f }));
      for (const h of hats) if (faceCells(compose({ ...b, ...f, hat: h.id })) !== bare) bad.push(`${h.id} on ${label(b)}`);
    }
    expect(bad).toEqual([]);
  });
  test('toppers, on every head, with every kind of face', () => {
    const bad: string[] = [];
    for (const head of heads.keys()) for (const f of faces) {
      const bare = faceCells(compose({ ...base, head, ...f }));
      for (const k of hair.keys()) if (faceCells(compose({ ...base, head, ...f, hair: k })) !== bare) bad.push(`${hair[k].name} on ${heads[head].name}`);
    }
    expect(bad).toEqual([]);
  });
});

describe('every hat shows', () => {
  test('on every head and skin, at least a handful of its own pixels', () => {
    const thin: string[] = [];
    for (const b of bodies) for (const f of faces.slice(0, 2)) {
      const bare = compose({ ...b, ...f }).flat();
      for (const h of hats) {
      const shown = compose({ ...b, ...f, hat: h.id }).flat().filter((v, i) => v !== bare[i]).length;
      if (shown < 6) thin.push(`${h.id} on ${label(b)} (${shown})`);
      }
    }
    expect(thin).toEqual([]);
  });
});

describe('what is worn on the face fits it', () => {
  const worn = ['glasses', 'monocle', 'masquerade'].map(n => find(accessories, n));
  test('face pieces leave the eyes and mouth where they were', () => {
    const bad: string[] = [];
    for (const b of bodies) for (const f of faces) {
      const bare = faceCells(compose({ ...b, ...f }));
      for (const a of worn) if (faceCells(compose({ ...b, ...f, accessory: a })) !== bare) bad.push(`${accessories[a].name} on ${label(b)}`);
    }
    expect(bad).toEqual([]);
  });
  test('glasses rims sit round both eyes on every head', () => {
    const g = find(accessories, 'glasses');
    for (const head of heads.keys()) {
      const grid = compose({ ...base, head, accessory: g, ...faces[0] });
      const rimmed = grid.flat().filter(v => v === T.OUTLINE).length - compose({ ...base, head, ...faces[0] }).flat().filter(v => v === T.OUTLINE).length;
      expect(rimmed).toBeGreaterThan(10);
    }
  });
});
