import { describe, expect, test } from 'bun:test';
import { compose, hatCut } from '../compose';
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
  }, 30_000);
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

describe('hats are never chopped', () => {
  test('every hat on every head and skin keeps every pixel it draws: too tall or wide for the room, it is fitted', () => {
    const cut: string[] = [];
    for (const b of bodies) for (const f of faces) for (const flip of [false, true]) for (const h of hats) {
      const n = hatCut({ ...b, ...f, flip, hat: h.id });
      if (n) cut.push(`${h.id} on ${label(b)} (${n})`);
    }
    expect([...new Set(cut)]).toEqual([]);
  }, 60_000);
  test('a hat fitted to a short room keeps its brim and its top', () => {
    const { squeeze } = require('../item-art');
    const { stamp } = require('../parts/art');
    const top = stamp(['.33.', '.33.', '.33.', '4444', '1111']);
    const fitted = squeeze(top, 2);
    expect(fitted.length).toBe(3);
    expect(fitted[fitted.length - 1]).toEqual(top[4]);
    expect(fitted[fitted.length - 2]).toEqual(top[3]);
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
  test('glasses rims sit round both eyes on every head, in a colour the eyes stand out from', () => {
    const g = find(accessories, 'glasses');
    for (const head of heads.keys()) {
      const grid = compose({ ...base, head, accessory: g, ...faces[0] });
      const rimmed = grid.flat().filter(v => v === T.ACCENT_SHADE).length - compose({ ...base, head, ...faces[0] }).flat().filter(v => v === T.ACCENT_SHADE).length;
      expect(rimmed).toBeGreaterThan(10);
      // Each eye cell is still an eye: the frame goes round it, never on it.
      expect(grid.flat().filter(v => v === T.EYE).length).toBe(compose({ ...base, head, ...faces[0] }).flat().filter(v => v === T.EYE).length);
    }
  });
});

describe('retired eyes', () => {
  test('no seed, look or override shows a cyclops', () => {
    const { resolve } = require('../resolve');
    const { decodeLook, pickable } = require('../look');
    const { compose } = require('../compose');
    const { RETIRED_EYES } = require('../parts/weights');
    for (let i = 0; i < 4000; i++) for (const seed of [`name${i}`, `3-seed${i}`]) expect(RETIRED_EYES).not.toContain(resolve(seed).eyes);
    const own = resolve('maya');
    expect(pickable(own, 'eyes')).not.toContain(16);
    expect(decodeLook('2:e16.m1', own)).toEqual({ mouth: 1 });
    const cyc = compose({ ...own, eyes: 16 }), beans = compose({ ...own, eyes: 0 });
    expect(cyc).toEqual(beans);
  });
});
