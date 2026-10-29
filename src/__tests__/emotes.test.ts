import { test, expect } from 'bun:test';
import { emoteFrames, EMOTE_SET, EMOTE_SIZE } from '../emotes';
import { bakeView } from '../bake';

const lit = (f: Uint8ClampedArray) => { let n = 0; for (let i = 3; i < f.length; i += 4) if (f[i]) n++; return n; };

test('every emote, still and moving, for any guy: 14 square, him filling most of it, under 60 frames', () => {
  for (const seed of ['xqc', 'founder:isaac', 'emote-test-3', 'emote-test-4']) for (const e of EMOTE_SET) {
    const still = emoteFrames({ seed }, e.id, false)!, moving = emoteFrames({ seed }, e.id)!;
    expect([still.width, still.height, still.frames.length]).toEqual([EMOTE_SIZE, EMOTE_SIZE, 1]);
    expect(moving.frames.length).toBeGreaterThan(1);
    expect(moving.frames.length).toBeLessThanOrEqual(60);
    expect(lit(still.frames[0])).toBeGreaterThan(EMOTE_SIZE * EMOTE_SIZE * 0.45);
    expect(emoteFrames({ seed }, e.id)!.frames).toEqual(moving.frames);
  }
});

test('emotes are views: emote-<id> moves, emote-<id>-still holds, an unknown one is nothing', () => {
  expect(bakeView({ seed: 'xqc' }, 'emote-love')!.frames.length).toBeGreaterThan(1);
  expect(bakeView({ seed: 'xqc' }, 'emote-love-still')!.frames.length).toBe(1);
  expect(bakeView({ seed: 'xqc' }, 'emote-nope')).toBeNull();
  expect(new Set(EMOTE_SET.map(e => e.id)).size).toBe(EMOTE_SET.length);
});
