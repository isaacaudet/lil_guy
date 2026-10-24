import { describe, expect, test } from 'bun:test';
import { compose } from '../compose';
import { resolve, LUCKY_ODDS } from '../resolve';
import { dress } from '../items';
import { decode, encode, type Owned } from '../owned';
import { PINS, MAX_PINS, tallyMarks } from '../pins';
import { luckyPalette, palettes, paletteOf, shadePalette, SHADE_COUNT } from '../palette';
import { guyOneIn, traitOdds } from '../rarity';
import { animate, EMOTE_UNLOCKS } from '../animate';
import { T } from '../parts/art';
import { hashNth } from '../hash';
import { inSeason, items, gameItems, GAMES } from '../items';
import { rollSeason, nameOf as nameCopy } from '../owned';
import { toShareSvg } from '../share';
import { lookOf } from '../look';

const ball: Owned = { item: 'puttsies.ball', finish: 'plain', scuff: 0.02, print: 40 };
const grid = (name: string, copy: Owned) => compose(dress(resolve(name), { equip: [encode(copy)] }));
const count = (g: number[][], token: number) => g.flat().filter(t => t === token).length;

describe('pins', () => {
  test('travel in the code, at most three, unknown ones dropped', () => {
    const o = { ...ball, tally: 40, pins: ['star', 'flame'] };
    expect(encode(o)).toBe('puttsies.ball~plain~0.0200000~40~t40~pstar+flame');
    expect(decode(encode(o))).toEqual(o);
    expect(decode('puttsies.ball~plain~0.02~40~pstar+nope+heart+bolt+leaf')!.pins).toEqual(['star', 'heart', 'bolt']);
    expect(decode('puttsies.ball~plain~0.02~40')!.pins).toBeUndefined();
    // Old codes still read the same.
    expect(decode('puttsies.ball~nebula~0.0123456~20~t412')).toEqual({ item: 'puttsies.ball', finish: 'nebula', scuff: 0.0123456, print: 20, tally: 412 });
  });

  test('are drawn on the item, only on its pixels', () => {
    for (const name of ['alice', 'bob', 'luna']) {
      const bare = grid(name, ball);
      const pinned = grid(name, { ...ball, pins: ['star', 'heart', 'leaf'] });
      let changed = 0;
      pinned.forEach((row, y) => row.forEach((t, x) => {
        if (t === bare[y][x]) return;
        changed++;
        expect(bare[y][x]).toBeGreaterThanOrEqual(20);
        expect(bare[y][x]).toBeLessThan(30);
      }));
      expect(changed).toBeGreaterThan(4);
    }
    expect(MAX_PINS).toBe(3);
    expect(new Set(PINS.map(p => p.id)).size).toBe(PINS.length);
  });

  test('frames take pins too', () => {
    const frame: Owned = { item: 'trackdle.flag', finish: 'plain', scuff: 0.02, print: 3 };
    expect(count(grid('alice', { ...frame, pins: ['star'] }), T.GOLD)).toBeGreaterThan(count(grid('alice', frame), T.GOLD));
  });
});

describe('tally marks', () => {
  test('two at 30 days, four at 100', () => {
    expect([tallyMarks(undefined), tallyMarks(29), tallyMarks(30), tallyMarks(99), tallyMarks(100), tallyMarks(900)]).toEqual([0, 0, 2, 2, 4, 4]);
    const white = (tally?: number) => count(grid('alice', { ...ball, tally }), T.WHITE);
    expect(white(30)).toBe(white(0) + 2);
    expect(white(100)).toBe(white(0) + 4);
  });

  test('a year of days turns the outline round the item gold', () => {
    const gold = (tally: number) => count(grid('bob', { ...ball, tally }), T.GOLD) + count(grid('bob', { ...ball, tally }), T.GOLD_SHADE);
    expect(gold(365)).toBeGreaterThan(gold(364) + 10);
  });
});

describe('Lucky', () => {
  test('about one name in 400, from its own slot of the hash', () => {
    let lucky = 0;
    for (let i = 0; i < 40000; i++) if (resolve('n' + i).lucky) lucky++;
    expect(lucky).toBeGreaterThan(60);
    expect(lucky).toBeLessThan(150);
    expect(resolve('x').lucky).toBe(hashNth('x', 13) % LUCKY_ODDS === 0);
  });

  test('changes the colours, keeps the face legible, and counts in rarity', () => {
    let name = '';
    for (let i = 0; !name; i++) if (resolve('n' + i).lucky) name = 'n' + i;
    const c = resolve(name);
    expect(paletteOf(c).colors[1]).not.toBe(paletteOf({ ...c, lucky: false }).colors[1]);
    expect(traitOdds(c).find(t => t.slot === 'variant')!.name).toBe('Lucky');
    expect(guyOneIn(c)).toBeGreaterThan(guyOneIn({ ...c, lucky: false }) * 300);
    const lum = (hex: string) => {
      const ch = (i: number) => { const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * ch(0) + 0.7152 * ch(1) + 0.0722 * ch(2);
    };
    const ratio = (a: string, b: string) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
    for (const p of palettes) for (let s = 0; s < SHADE_COUNT; s++) {
      const l = luckyPalette(shadePalette(p, s));
      expect(ratio(l.colors[5], l.colors[1])).toBeGreaterThan(3.8);
    }
  });
});

describe('emotes and the trail', () => {
  test('every unlockable emote shows over a move, even on the tallest guys', () => {
    for (const { id } of EMOTE_UNLOCKS) for (const head of [0, 16, 24]) {
      const plain = animate('alice', 'idle', { parts: { head, hair: 11 } }), withIt = animate('alice', 'idle', { parts: { head, hair: 11 }, emote: id });
      for (let i = 0; i < plain.frames.length; i++) expect(JSON.stringify(withIt.frames[i])).not.toBe(JSON.stringify(plain.frames[i]));
    }
  });

  test('sleep snoozes', () => {
    expect(animate('bob', 'sleep').frames.some(f => f.colors.flat().includes('#BFD8FF'))).toBe(true);
  });

  test('Mythic and Grail guys leave a trail on a hop; others do not', () => {
    const trail = (finish: Owned['finish']) => {
      const a = animate('luna', 'hop', { equip: [encode({ ...ball, finish, scuff: 0.01 })] });
      const rest = animate('luna', 'hop', { equip: [encode({ ...ball, finish, scuff: 0.01 })], rarity: false });
      return a.frames.length > 0 && rest.frames.length > 0 && a.frames.some(f => f.colors.flat().includes('#C7A43A') || f.colors.flat().includes('#B68B2E'));
    };
    // Gold's grail colour, darkened for the trail.
    expect(trail('gold')).toBe(true);
    expect(trail('sunset')).toBe(false);
  });
});


describe('buddies', () => {
  test('one per game, drawn at his feet in front of him with an outline', () => {
    for (const game of GAMES) expect(gameItems(game).filter(i => i.slot === 'buddy').length).toBe(1);
    const bare = compose(dress(resolve('alice'), {}));
    const withBuddy = compose(dress(resolve('alice'), { equip: ['puttsies.tee'] }));
    const changed = withBuddy.flat().filter((t, i) => t !== bare.flat()[i]).length;
    expect(changed).toBeGreaterThan(8);
    expect(withBuddy.flat().some(t => t >= 50 && t < 60)).toBe(true);
    // Only the bottom-right corner changes.
    withBuddy.forEach((row, y) => row.forEach((t, x) => { if (t !== bare[y][x]) expect(x >= 9 && y >= 9).toBe(true); }));
  });
});

describe('seasonal items', () => {
  test('drop only in their days, across the new year too', () => {
    expect(inSeason('2026-10-31').map(i => i.id)).toEqual(['club.pumpkin']);
    expect(inSeason('2026-12-31').map(i => i.id)).toEqual(['club.snowcap']);
    expect(inSeason('2027-01-03').map(i => i.id)).toEqual(['club.snowcap']);
    expect(inSeason('2026-07-01')).toEqual([]);
    expect(items.filter(i => i.game === 'club').every(i => i.season)).toBe(true);
  });

  test('copies keep their day, in the code and the name', () => {
    const o = rollSeason('s1', '2026-10-31')!;
    expect(o.item).toBe('club.pumpkin');
    expect(o.date).toBe('2026-10-31');
    expect(decode(encode(o))).toEqual(o);
    expect(nameCopy(o).startsWith('2026 Pumpkin') || nameCopy(o).startsWith('Tallied 2026 Pumpkin')).toBe(true);
    expect(rollSeason('s1', '2026-07-01')).toBeNull();
  });
});

describe('the share card', () => {
  test('is a 1200x630 SVG with the copy, its grade and its odds, and nothing to fetch', () => {
    const svg = toShareSvg('alice', { item: 'trackdle.helmet', finish: 'gold', scuff: 0.004, print: 9, tally: 212 }, { name: 'Alice <3' });
    expect(svg).toContain('width="1200" height="630"');
    expect(svg).toContain('Race helmet');
    expect(svg).toContain('★ Grail');
    expect(svg).toContain('212 days');
    expect(svg).toContain('ALICE &lt;3');
    expect(svg).not.toMatch(/<image|href=|@import/);
  });

  test('draws the guy as the player has him when given a picked look', () => {
    const copy = { item: 'trackdle.helmet', finish: 'plain' as const, scuff: 0.2, print: 9 };
    const picked = lookOf('alice', '2:p0.h0');
    expect(toShareSvg('alice', copy, { config: picked })).not.toBe(toShareSvg('alice', copy));
    expect(toShareSvg('alice', copy, { config: resolve('alice') })).toBe(toShareSvg('alice', copy));
  });
});
