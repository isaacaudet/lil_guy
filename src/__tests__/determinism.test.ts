import { describe, expect, it } from 'bun:test';
import { toSvgString } from '../render-string';
import { palettes } from '../palette';

describe('determinism', () => {
  const testInputs = [
    'alice@example.com',
    'bob',
    'charlie_123',
    'user@domain.co',
    '',
    '🎉',
    'a very long string that goes on and on and on',
  ];

  it('same input always produces identical SVG', () => {
    for (const input of testInputs) {
      const first = toSvgString(input);
      const second = toSvgString(input);
      const third = toSvgString(input);
      expect(first).toBe(second);
      expect(second).toBe(third);
    }
  });

  it('same input with same options produces identical SVG', () => {
    for (const input of testInputs) {
      const a = toSvgString(input, { size: 64, square: true });
      const b = toSvgString(input, { size: 64, square: true });
      expect(a).toBe(b);
    }
  });

  it('same input with custom palette produces identical SVG', () => {
    const palette = palettes[3]; // Berry
    for (const input of testInputs) {
      const a = toSvgString(input, { palette });
      const b = toSvgString(input, { palette });
      expect(a).toBe(b);
    }
  });

  it('same input with part overrides produces identical SVG', () => {
    for (const input of testInputs) {
      const a = toSvgString(input, { parts: { head: 0, eyes: 1 } });
      const b = toSvgString(input, { parts: { head: 0, eyes: 1 } });
      expect(a).toBe(b);
    }
  });

  it('different inputs generally produce different SVGs', () => {
    const distinctInputs = ['alice@example.com', 'bob', 'charlie_123', 'user@domain.co', 'john.doe'];
    const svgs = distinctInputs.map(input => toSvgString(input));
    const unique = new Set(svgs);
    // At least most should be unique (collision chance is very low for distinct strings)
    expect(unique.size).toBeGreaterThanOrEqual(distinctInputs.length - 1);
  });
});
