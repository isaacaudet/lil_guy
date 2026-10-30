import { describe, expect, test } from 'bun:test';
import { cardFrames, cardStill, toCardGif, toCardPng, toGuyGif, CARD_WIDTH, CARD_HEIGHT, textWidth, rankFit, rankRoom } from '../card';
import { guyRank } from '../rarity';
import { resolve } from '../resolve';
import { encodeGif, encodePng } from '../gif';
import { roll } from '../owned';
import { editionColor, editionField } from '../finish-shader';

const copy = roll('card-test', 'puttsies');

describe('cards', () => {
  test('a card is the card size, moves from frame to frame, and has round transparent corners', () => {
    const f = cardFrames({ seed: 'maya', copies: [copy], title: 'Putting green', corner: '#12', lines: ['Everyday', '1 in 20'] });
    expect(f.width).toBe(CARD_WIDTH);
    expect(f.frames.length).toBeGreaterThan(20);
    expect(f.frames[0].length).toBe(CARD_WIDTH * CARD_HEIGHT * 4);
    expect(f.frames[0][3]).toBe(0);
    expect(f.frames[0][((CARD_HEIGHT >> 1) * CARD_WIDTH + (CARD_WIDTH >> 1)) * 4 + 3]).toBe(255);
    expect(new Set(f.frames.map(px => px.join(','))).size).toBeGreaterThan(2);
  });
  test('the same card draws the same every time', () => {
    const a = cardStill({ seed: 'maya', copies: [copy], title: 'A' }), b = cardStill({ seed: 'maya', copies: [copy], title: 'A' });
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });
  test('a long title stays on one line, cut short with an ellipsis', () => {
    const long = 'A very long name for a card indeed';
    expect(textWidth(long)).toBeGreaterThan(CARD_WIDTH);
    const card = (title: string, name = '@maya') => cardStill({ seed: 'maya', title, lines: ['Mythic', name] });
    // Its end is cut off, its start is on the card.
    expect(card(long)).toEqual(card(long.slice(0, -1) + 'X'));
    expect(card(long)).not.toEqual(card('B' + long.slice(1)));
    expect(card(long)).not.toEqual(card(long, '@mayb'));
  });
});

describe('editions', () => {
  test('worked out ahead, every edition gives the colours editionColor does', () => {
    const n = 400, x = new Float32Array(n), y = new Float32Array(n), region = new Uint8Array(n), h = new Float32Array(n), rgb = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) {
      x[k] = (k * 7.3) % 28; y[k] = (k * 3.1) % 40; region[k] = 1 + (k % 2); h[k] = ((k * 0.6180339) % 1);
      for (let j = 0; j < 3; j++) rgb[k * 3 + j] = ((k * (j + 3) * 0.137) % 1);
    }
    const out = new Float32Array(n * 3);
    for (let ed = 0; ed <= 6; ed++) for (const v of [0, 3]) {
      const field = editionField(ed, v, [13, 19], 0.2, { x, y, region, h, rgb });
      for (const time of [0, 0.7, 2.333, 5.95]) {
        field(time, out);
        for (let k = 0; k < n; k++) {
          const want = editionColor([rgb[k * 3], rgb[k * 3 + 1], rgb[k * 3 + 2]], ed, v, [x[k], y[k]], [13, 19], region[k], h[k], 0.2, time);
          for (let j = 0; j < 3; j++) expect(Math.abs(out[k * 3 + j] - want[j])).toBeLessThan(1e-4);
        }
      }
    }
  });
});

describe('saving', () => {
  test('a GIF is a looping GIF89a with a frame per card frame', () => {
    const gif = toCardGif({ seed: 'maya', copies: [copy], title: 'Green' }, 1);
    expect(new TextDecoder().decode(gif.slice(0, 6))).toBe('GIF89a');
    expect(gif[gif.length - 1]).toBe(0x3b);
    expect(new TextDecoder().decode(gif)).toContain('NETSCAPE2.0');
  });
  test('a GIF with more than 255 colours still encodes', () => {
    const W = 32, frames = [new Uint8ClampedArray(W * W * 4).map((_, i) => (i % 4 === 3 ? 255 : (i * 37) % 256))];
    const gif = encodeGif({ width: W, height: W, frames, delays: [100] }, 2);
    expect(gif.length).toBeGreaterThan(100);
  });
  test('a guy GIF and a card PNG come out', async () => {
    expect(toGuyGif('maya', 'hop', {}, 4).length).toBeGreaterThan(100);
    const png = await toCardPng({ seed: 'maya', copies: [copy], title: 'Green' }, 2);
    expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const tiny = await encodePng(new Uint8ClampedArray(4).fill(255), 1, 1);
    expect(tiny.length).toBeGreaterThan(50);
  });
});

test('a rank beside its badge is never cut: "Top 48%" whole, "Top" dropped before a digit', () => {
  const ranks = [...Array.from({ length: 3000 }, (_, i) => guyRank(resolve(`rank ${i}`))),
    { name: 'Uncommon', label: 'Top 50%' }, { name: 'Legendary', label: 'Top 0.055%' }, { name: 'Mythic', label: 'Top 0.0000055%' }];
  for (const r of ranks) {
    const fit = rankFit(r.label, rankRoom(r.name));
    expect(fit.text).not.toContain('…');
    expect(fit.text.replace(/\D/g, '')).toBe(r.label.replace(/\D/g, ''));
    if (r.name === 'Uncommon' && r.label !== 'Common') expect(fit.text).toBe(r.label);
  }
});
