import { test, expect } from 'bun:test';
import { emoteFrames, EMOTE_SET, EMOTE_SIZE } from '../emotes';
import { bakeView } from '../bake';
import { EMOTE_UNLOCKS, GOLD_SPARKLE, glanceRing } from '../animate';
import { encode } from '../owned';
import { items } from '../items';

const lit = (f: Uint8ClampedArray) => { let n = 0; for (let i = 3; i < f.length; i += 4) if (f[i]) n++; return n; };
const hex = (f: Uint8ClampedArray, i: number) => '#' + [f[i], f[i + 1], f[i + 2]].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
const colours = (f: Uint8ClampedArray) => { const s = new Set<string>(); for (let i = 0; i < f.length; i += 4) if (f[i + 3]) s.add(hex(f, i)); return s; };
const hat = items.find(i => i.slot === 'hat' && !i.free)!.id;

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

test('the thoughts come after the first twelve, which keep their order; galaxy brain is a rare unlock', () => {
  expect(EMOTE_SET.map(e => e.id)).toEqual(['hi', 'lol', 'pog', 'love', 'mad', 'sad', 'sleep', 'hmm', 'hype', 'gg', 'blep', 'oops', 'idea', 'mindblown', 'daydream', 'galaxybrain']);
  for (const e of EMOTE_SET) expect(e.id).toMatch(/^[a-z]+$/);
  const how = (id: string) => EMOTE_UNLOCKS.find(u => u.id === id)!.how;
  for (const e of EMOTE_SET.slice(12)) expect(how(e.symbol ?? e.unlock!)).toBeTruthy();
  expect(EMOTE_SET.find(e => e.id === 'galaxybrain')!.unlock).toBe('galaxy');
  expect(how('galaxy')).not.toBe('Everyone has it');
  for (const id of ['bulb', 'burst', 'cloud']) expect(how(id)).toBe('Everyone has it');
  // It names what counts, in the words players see.
  for (const word of ['Mythic', 'Grail', 'aura', 'eclipse', 'void', 'idea', 'thought', 'op art']) expect(how('galaxy')).toContain(word);
});

test('an idea\'s bulb switches on, and the thoughts move', () => {
  const idea = emoteFrames({ seed: 'xqc' }, 'idea')!;
  expect(colours(idea.frames[0]).has('#FFE27A')).toBe(false);
  expect(colours(idea.frames[3]).has('#FFE27A')).toBe(true);
  expect(colours(emoteFrames({ seed: 'xqc' }, 'idea', false)!.frames[0]).has('#FFE27A')).toBe(true);
  for (const id of ['mindblown', 'daydream', 'galaxybrain']) {
    const f = emoteFrames({ seed: 'xqc' }, id)!.frames;
    expect(new Set(f.map(px => px.join())).size).toBeGreaterThan(2);
  }
});

test('mind blown and galaxy brain open every head, costumes included', () => {
  const skins = items.filter(i => i.slot === 'skin');
  const missing: string[] = [];
  for (const seed of ['xqc', 'mia']) for (const equip of [undefined, ...skins.map(i => [encode({ item: i.id, finish: 'plain', scuff: 0.3, print: 1 })])]) {
    const name = equip ? items.find(i => equip[0].startsWith(i.id + '~'))!.name : 'no costume';
    if (!colours(emoteFrames({ seed, equip }, 'mindblown', false)!.frames[0]).has('#FF8A2B')) missing.push(`${seed} ${name} burst`);
    if (!colours(emoteFrames({ seed, equip }, 'galaxybrain', false)!.frames[0]).has('#4B2BA8')) missing.push(`${seed} ${name} starfield`);
  }
  expect(missing).toEqual([]);
});

test('what marks a guy rare shows in every emote: a ring for a rare copy or an aura, a plain one has none', () => {
  const grail = encode({ item: hat, finish: 'gold', scuff: 0.01, print: 12 });
  const aura = encode({ item: 'aura.aurora', finish: 'frost', scuff: 0.1, print: 9 });
  const plain = encode({ item: hat, finish: 'plain', scuff: 0.3, print: 12 });
  for (const e of EMOTE_SET) {
    const has = (equip: string[], c: string) => colours(emoteFrames({ seed: 'night', equip }, e.id, false)!.frames[0]).has(c);
    expect(has([grail], '#FFE27A') || has([grail], '#E4AE39')).toBe(true);
    expect(has([aura], glanceRing('night', { equip: [aura] })![0])).toBe(true);
    expect(has([plain], '#E4AE39')).toBe(false);
  }
});

test('a moving emote runs a copy\'s effect over its steps', () => {
  const still = (equip: string[]) => new Set(emoteFrames({ seed: 'xqc', equip }, 'blep')!.frames.map(px => px.join())).size;
  expect(still([encode({ item: hat, finish: 'plain', scuff: 0.3, print: 12 })])).toBe(1);
  expect(still([encode({ item: hat, finish: 'plain', scuff: 0.3, print: 12, fx: 'hearts' })])).toBeGreaterThan(1);
});

test('a Lucky guy keeps the star in an emote', () => {
  const seed = 'lucky-emote';
  const star = (lucky: boolean) => [...colours(emoteFrames({ seed, parts: { lucky } }, 'blep', false)!.frames[0])].filter(c => GOLD_SPARKLE.includes(c)).length;
  expect(star(true)).toBeGreaterThan(star(false));
});
