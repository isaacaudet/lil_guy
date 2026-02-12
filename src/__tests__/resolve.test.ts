import { describe, expect, it } from 'bun:test';
import { resolve } from '../resolve';
import { heads, eyes, mouths, hair, bodies, accessories } from '../parts';
import { palettes } from '../palette';

describe('resolve', () => {
  it('returns valid indices for all parts', () => {
    const config = resolve('alice@example.com');
    expect(config.head).toBeGreaterThanOrEqual(0);
    expect(config.head).toBeLessThan(heads.length);
    expect(config.eyes).toBeGreaterThanOrEqual(0);
    expect(config.eyes).toBeLessThan(eyes.length);
    expect(config.mouth).toBeGreaterThanOrEqual(0);
    expect(config.mouth).toBeLessThan(mouths.length);
    expect(config.hair).toBeGreaterThanOrEqual(0);
    expect(config.hair).toBeLessThan(hair.length);
    expect(config.body).toBeGreaterThanOrEqual(0);
    expect(config.body).toBeLessThan(bodies.length);
    expect(config.accessory).toBeGreaterThanOrEqual(0);
    expect(config.accessory).toBeLessThan(accessories.length);
    expect(config.palette).toBeGreaterThanOrEqual(0);
    expect(config.palette).toBeLessThan(palettes.length);
  });

  it('is deterministic', () => {
    const a = resolve('test-user');
    const b = resolve('test-user');
    expect(a).toEqual(b);
  });

  it('produces different configs for different inputs', () => {
    const a = resolve('alice');
    const b = resolve('bob');
    // At least one field should differ
    const differs = (
      a.head !== b.head ||
      a.eyes !== b.eyes ||
      a.mouth !== b.mouth ||
      a.hair !== b.hair ||
      a.body !== b.body ||
      a.accessory !== b.accessory ||
      a.palette !== b.palette
    );
    expect(differs).toBe(true);
  });

  it('respects overrides', () => {
    const config = resolve('alice', { hair: 0, eyes: 2 });
    expect(config.hair).toBe(0);
    expect(config.eyes).toBe(2);
  });

  it('resolves rotation as a valid sphere position index', () => {
    const config = resolve('alice@example.com');
    expect(config.rotation).toBeGreaterThanOrEqual(0);
    expect(config.rotation).toBeLessThan(9); // 9 sphere positions
    expect(Number.isInteger(config.rotation)).toBe(true);
  });
});
