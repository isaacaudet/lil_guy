import { describe, expect, it } from 'bun:test';
import lock from '../ids.lock.json';
import { PART_DEFS, SLOTS, catalog, indexOfPart, partById, partId } from '../parts';
import { getPaletteV2, paletteIndex, palettesV2 } from '../palettes';
import { GRID_SIZE_V2 as N, type Slot } from '../types';

/**
 * Saves store indices and commerce stores ids, so neither may ever move.
 * ids.lock.json is the record: every locked id must still sit at its index,
 * and every new id must be locked (`bun run ids:lock`) before it ships.
 */
describe('append-only', () => {
  const locked = lock.parts as Record<string, string[]>;

  for (const slot of SLOTS) {
    it(`${slot}: locked ids never move`, () => {
      const current = PART_DEFS[slot].map(p => p.id);
      expect(current.slice(0, locked[slot]?.length ?? 0)).toEqual(locked[slot] ?? []);
    });

    it(`${slot}: every id is locked`, () => {
      const unlocked = PART_DEFS[slot].map(p => p.id).slice(locked[slot]?.length ?? 0);
      expect(unlocked, 'new parts: run `bun run ids:lock` and commit the lock').toEqual([]);
    });
  }

  it('palettes: locked ids never move, and every id is locked', () => {
    expect(palettesV2.map(p => p.id)).toEqual(lock.palettes);
  });
});

describe('catalog', () => {
  it('has unique ids of the form slot.kebab-name', () => {
    const ids = catalog.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const meta of catalog) expect(meta.id).toMatch(new RegExp(`^${meta.slot}\\.[a-z0-9]+(-[a-z0-9]+)*$`));
  });

  it('maps ids to indices and back', () => {
    for (const meta of catalog) {
      expect(indexOfPart(meta.id)).toBe(meta.index);
      expect(partId(meta.slot, meta.index)).toBe(meta.id);
      expect(partById(meta.id)).toBe(meta);
    }
    expect(indexOfPart('top.does-not-exist')).toBe(-1);
  });

  it('starts every slot with its v1 parts at their v1 indices', () => {
    expect(partId('top', 25)).toBe('top.chef-hat');
    expect(partById('top.chef-hat')?.name).toBe('chef hat');
    expect(partId('accessory', 0)).toBe('accessory.none');
    expect(partId('eyes', 21)).toBe('eyes.content');
  });

  it('starts every new slot with an empty part at 0', () => {
    for (const slot of ['outfit', 'held', 'backdrop'] as Slot[]) {
      expect(partId(slot, 0)).toBe(`${slot}.none`);
      expect(PART_DEFS[slot][0].grid.flat().every(t => t === 0)).toBe(true);
    }
  });

  it('holds every part as 32 rows of 32 tokens in 0-9', () => {
    const wrong: string[] = [];
    for (const slot of SLOTS) {
      for (const part of PART_DEFS[slot]) {
        const grids = part.blink ? [part.grid, part.blink] : [part.grid];
        for (const grid of grids) {
          if (grid.length !== N || grid.some(row => row.length !== N)) wrong.push(`${part.id} is not ${N}x${N}`);
          if (grid.flat().some(t => !Number.isInteger(t) || t < 0 || t > 9)) wrong.push(`${part.id} has a bad token`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  it('gives every source a known kind', () => {
    for (const meta of catalog) expect(meta.source).toMatch(/^(free|earned|plus|pack:[a-z0-9-]+)$/);
  });
});

describe('palettes by id', () => {
  it('owns the app palettes at the indices the app already saves', () => {
    expect(paletteIndex('monochrome')).toBe(32);
    expect(paletteIndex('forge')).toBe(39);
    expect(getPaletteV2('rose-gold').colors[1]).toBe('#E8A888');
    expect(getPaletteV2(35).id).toBe('rose-gold');
  });

  it('has unique ids', () => {
    expect(new Set(palettesV2.map(p => p.id)).size).toBe(palettesV2.length);
  });
});
