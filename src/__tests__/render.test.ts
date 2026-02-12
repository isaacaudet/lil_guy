import { describe, expect, it } from 'bun:test';
import { toSvgString } from '../render-string';

describe('toSvgString', () => {
  it('returns a valid SVG string', () => {
    const svg = toSvgString('alice');
    expect(svg).toStartWith('<svg');
    expect(svg).toEndWith('</svg>');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('includes crispEdges rendering', () => {
    const svg = toSvgString('alice');
    expect(svg).toContain('shape-rendering="crispEdges"');
  });

  it('uses rect elements for pixels', () => {
    const svg = toSvgString('alice');
    expect(svg).toContain('<rect');
  });

  it('respects size option', () => {
    const svg = toSvgString('alice', { size: 64 });
    expect(svg).toContain('width="64"');
    expect(svg).toContain('height="64"');
  });

  it('adds circular clip path by default', () => {
    const svg = toSvgString('alice');
    expect(svg).toContain('<clipPath');
    expect(svg).toContain('<circle');
  });

  it('omits clip path when square=true', () => {
    const svg = toSvgString('alice', { square: true });
    expect(svg).not.toContain('<clipPath');
    expect(svg).not.toContain('<circle');
  });

  it('is deterministic', () => {
    const a = toSvgString('bob@example.com');
    const b = toSvgString('bob@example.com');
    expect(a).toBe(b);
  });

  it('produces different SVGs for different inputs', () => {
    const a = toSvgString('alice');
    const b = toSvgString('bob');
    expect(a).not.toBe(b);
  });
});
