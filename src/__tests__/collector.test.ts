import { describe, expect, test } from 'bun:test';
import { collectorNotes } from '../collector';
import { decode, encode, nameOf } from '../owned';

const copy = (more = {}) => ({ item: 'stackdle.block', finish: 'plain' as const, scuff: 0.3, print: 250, ...more });
const ids = (o: ReturnType<typeof copy>) => collectorNotes(o).map(n => n.id);

describe('collector notes', () => {
  test('name the floats people chase', () => {
    expect(ids(copy({ scuff: 0.0004 }))).toContain('triple-zero');
    expect(ids(copy({ scuff: 0.004 }))).toContain('double-zero');
    expect(ids(copy({ scuff: 0.995 }))).toContain('max-float');
    expect(ids(copy({ scuff: 0.0701 }))).toContain('top-of-tier');
    expect(ids(copy())).toEqual([]);
  });
  test('name famous and fancy prints', () => {
    expect(ids(copy({ finish: 'tempered', print: 661 }))).toContain('famous-print');
    expect(ids(copy({ print: 1 }))).toContain('print-1');
    expect(ids(copy({ print: 777 }))).toContain('lucky-print');
    expect(ids(copy({ print: 444 }))).toContain('triple-print');
    expect(ids(copy({ print: 456 }))).toContain('straight-print');
  });
  test('rank the rarest first', () => {
    const notes = collectorNotes(copy({ scuff: 0.0004, print: 1, tally: 3 }));
    expect(notes[0].oneIn).toBeGreaterThanOrEqual(notes[notes.length - 1].oneIn);
  });
  test('a souvenir keeps its day through a code and says so in its name', () => {
    const o = copy({ souvenir: '2026-10-25' });
    expect(decode(encode(o))).toEqual(o);
    expect(nameOf(o)).toStartWith('Souvenir ');
    expect(ids(o)).toContain('souvenir');
  });
});
