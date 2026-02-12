import { describe, expect, it } from 'bun:test';
import { hash, hashNth } from '../hash';

describe('hash', () => {
  it('returns the same value for the same input', () => {
    expect(hash('alice')).toBe(hash('alice'));
    expect(hash('bob@example.com')).toBe(hash('bob@example.com'));
  });

  it('returns different values for different inputs', () => {
    expect(hash('alice')).not.toBe(hash('bob'));
    expect(hash('a')).not.toBe(hash('b'));
  });

  it('returns a positive 32-bit integer', () => {
    const h = hash('test');
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xFFFFFFFF);
    expect(Number.isInteger(h)).toBe(true);
  });

  it('handles empty string', () => {
    const h = hash('');
    expect(h).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(h)).toBe(true);
  });
});

describe('hashNth', () => {
  it('returns different values for different indices', () => {
    const results = new Set<number>();
    for (let i = 0; i < 10; i++) {
      results.add(hashNth('alice', i));
    }
    // At least 8 out of 10 should be unique (very likely all 10)
    expect(results.size).toBeGreaterThanOrEqual(8);
  });

  it('is deterministic per (input, index) pair', () => {
    expect(hashNth('alice', 0)).toBe(hashNth('alice', 0));
    expect(hashNth('alice', 3)).toBe(hashNth('alice', 3));
  });

  it('is independent — different inputs produce different results at same index', () => {
    expect(hashNth('alice', 0)).not.toBe(hashNth('bob', 0));
  });
});
