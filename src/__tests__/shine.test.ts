import { describe, expect, test } from 'bun:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { animate } from '../animate';
import { createShine, shineData } from '../shine';
import { LilGuyAnimated } from '../lil-guy-animated';
import { dress } from '../items';
import { resolve } from '../resolve';
import { encode } from '../owned';

const gold = { item: 'puttsies.ball', finish: 'gold' as const, scuff: 0.01, print: 9 };

describe('the shine', () => {
  test('frames say which item each pixel belongs to', () => {
    const f = animate('alice', 'idle', { equip: [encode(gold), 'trackdle.flag'] }).frames[0];
    const slots = new Set(f.slots.flat());
    expect(slots.has(1)).toBe(true);   // the golf ball skin
    expect(slots.has(3)).toBe(true);   // the frame behind
    f.colors.forEach((row, y) => row.forEach((c, x) => { if (!c) expect(f.slots[y][x]).toBe(0); }));
  });

  test('packs each copy\'s finish, scuff and print under its own pixels', () => {
    const config = dress(resolve('alice'), { equip: [encode(gold)] });
    const f = animate('alice', 'idle', { equip: [encode(gold)] }).frames[0];
    const { colors, info } = shineData(f, config.owned);
    let marked = 0;
    f.slots.forEach((row, y) => row.forEach((s, x) => {
      const i = (y * 16 + x) * 4;
      if (s === 1) { marked++; expect(info[i]).toBe(7 * 32); expect(info[i + 2]).toBe(2); }
      else expect(info[i + 3]).toBe(0);
      expect(colors[i + 3]).toBe(f.colors[y][x] ? 255 : 0);
    }));
    expect(marked).toBeGreaterThan(20);
  });

  test('is null where there is no WebGL', () => {
    expect(createShine()).toBeNull();
  });
});

describe('<LilGuyAnimated>', () => {
  test('renders the animated SVG, decorative unless titled', () => {
    const html = renderToStaticMarkup(React.createElement(LilGuyAnimated, { name: 'alice', move: 'hop', size: 48 }));
    expect(html).toContain('data-lil-guy-animated');
    expect(html).toContain('width="48" height="60"');
    expect(html).toContain('aria-hidden="true"');
    expect(renderToStaticMarkup(React.createElement(LilGuyAnimated, { name: 'alice', move: 'hop', title: 'Alice' }))).toContain('<title>Alice</title>');
  });
});
