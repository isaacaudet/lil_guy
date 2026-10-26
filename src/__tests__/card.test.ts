import { describe, expect, test } from 'bun:test';
import { cardFrames, cardStill, toCardGif, toCardPng, toGuyGif, CARD_WIDTH, CARD_HEIGHT, textWidth } from '../card';
import { encodeGif, encodePng } from '../gif';
import { roll } from '../owned';

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
  test('long titles are cut to fit', () => {
    expect(textWidth('Bubblegum mouth')).toBeGreaterThan(CARD_WIDTH - 16);
    expect(() => cardStill({ seed: 'maya', title: 'A very long name for a card indeed' })).not.toThrow();
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
