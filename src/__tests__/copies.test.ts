import { describe, expect, test } from 'bun:test';
import { decode, encode, FINISHES, GRAPHIC_FINISHES, gradeOf, nameOf, paintCell, roll, unusual, toneOf, boxOf, type Finish, type Owned } from '../owned';
import { copyOneIn, visibleOneIn, traitOdds, guyRank } from '../rarity';
import { EFFECTS, FX_IDS, FX_BADGES, BADGE_INKS, fxColor, layered } from '../effects';
import { AURAS, auraCells, auraColor, auraHue } from '../auras';
import { cardStill, hasGlyph, CARD_WIDTH, CARD_HEIGHT } from '../card';
import { dress, items, itemById, withItems } from '../items';
import { PAINTS } from '../paints';
import { PINS } from '../pins';
import { animate, AURA_PAD } from '../animate';
import { resolve } from '../resolve';
import { hair } from '../parts';
import { surfaceOf, voxelItem } from '../voxel';
import { editionOf } from '../finish-shader';
import { compose } from '../compose';
import { contrast, paletteOf } from '../palette';
import { paint } from '../paint';
import { LAYER, T } from '../parts/art';

const rgb = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const hueOf = (h: string) => { const [r, g, b] = rgb(h).map(v => v / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min; if (d < 0.08) return -1; const x = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4; return (x * 60 + 360) % 360; };
const lum = (h: string) => { const [r, g, b] = rgb(h); return (0.3 * r + 0.59 * g + 0.11 * b) / 255; };

/** A copy's colours over a box, as paint lays them: the item's own three tones on each cell. */
function paintBox(o: Owned, box = { left: 0, top: 0, right: 7, bottom: 4 }, colors = ['#6A8FD8', '#3E5FA8', '#B9CCF2']) {
  const tones = toneOf(colors), out: string[] = [], state = { glint: true };
  for (let y = box.top; y <= box.bottom; y++) for (let x = box.left; x <= box.right; x++) {
    // Mostly the main colour, as items are: a shade every third cell, a highlight every seventh.
    const c = (x + 2 * y) % 7 === 0 ? colors[2] : (x + y) % 3 === 0 ? colors[1] : colors[0];
    out.push(paintCell(c, x, y, o, state, tones.get(c.toUpperCase()), box));
  }
  return out;
}

describe('graphic finishes', () => {
  test('are appended Grails, and capsules roll them at 0.06, 0.05 and 0.05', () => {
    expect(Object.keys(FINISHES).slice(-3)).toEqual(['op', 'impossible', 'grid']);
    const total = Object.values(FINISHES).reduce((a, f) => a + f.odds, 0);
    expect(Math.round(total * 100) / 100).toBe(100);
    expect(GRAPHIC_FINISHES.map(f => FINISHES[f].odds)).toEqual([0.06, 0.05, 0.05]);
    expect(FINISHES.sunset.odds).toBe(15.97);
    expect(FINISHES.gold.odds).toBe(0.1);
    // Every Grail finish is rarer than every Mythic one.
    const of = (g: number) => Object.values(FINISHES).filter(x => x.grade === g && x.odds > 0).map(x => x.odds);
    expect(Math.max(...of(4))).toBeLessThan(Math.min(...of(3)));
    for (const f of GRAPHIC_FINISHES) {
      const o: Owned = { item: 'puttsies.ball', finish: f, scuff: 0.01, print: 3 };
      expect(decode(encode(o))).toEqual(o);
      expect(gradeOf(o).name).toBe('★ Grail');
      expect(nameOf(o)).toBe(`Golf ball | ${FINISHES[f].name}`);
    }
    const n: Partial<Record<Finish, number>> = {};
    for (let i = 0; i < 60000; i++) { const f = roll(`graphic-${i}`, 'puttsies').finish; if (GRAPHIC_FINISHES.includes(f)) n[f] = (n[f] ?? 0) + 1; }
    // 36, 30 and 30 expected in 60,000.
    for (const f of GRAPHIC_FINISHES) expect(n[f]).toBeGreaterThan(12);
    const all = GRAPHIC_FINISHES.reduce((a, f) => a + (n[f] ?? 0), 0);
    expect(all).toBeGreaterThan(60);
    expect(all).toBeLessThan(140);
  });

  test('every finish a capsule can roll has a surface in 3D', () => {
    // The Worker deals from roll(), and Amountle draws worn copies in 3D (./voxel): a finish it has no surface for would throw there.
    for (const [f, x] of Object.entries(FINISHES)) if (x.odds > 0 || x.aura) {
      expect(() => surfaceOf(f as Finish)).not.toThrow();
      if (x.odds > 0) expect(voxelItem({ item: 'puttsies.top-hat', finish: f as Finish, scuff: 0.02, print: 40 }).every(c => c.surface.kind === f)).toBe(true);
    }
    // Printed flat: matte, with no glow or metal.
    for (const f of GRAPHIC_FINISHES) expect(surfaceOf(f)).toMatchObject({ metalness: 0, glow: 0, iridescence: 0 });
  });

  test('keep the card\'s plain stock, their pattern its window', () => {
    for (const f of GRAPHIC_FINISHES) expect(editionOf(f)).toBe(0);
    expect([undefined, 'plain', 'sunset', 'tempered', 'nebula', 'prism', 'negative', 'gold', 'classic', 'pearl'].map(editionOf)).toEqual([0, 0, 1, 2, 2, 3, 4, 5, 6, 6]);
  });

  test('paint in ink, ivory and coral, in a pattern of their own on any item', () => {
    for (const f of GRAPHIC_FINISHES) {
      const cells = paintBox({ item: 'puttsies.ball', finish: f, scuff: 0, print: 4 });
      expect(new Set(cells).size).toBeGreaterThanOrEqual(2);
      expect(cells).toContain('#17131F');
      expect(cells).toContain('#F4EFE4');
    }
    // Grid fills three panes with primaries on a box big enough to hold them (a hat: a skin's face keeps its middle pale).
    const grid = paintBox({ item: 'puttsies.top-hat', finish: 'grid', scuff: 0, print: 0 }, { left: 0, top: 0, right: 13, bottom: 11 });
    expect(['#D9402E', '#2C55C8', '#F2C230'].filter(c => grid.includes(c)).length).toBe(3);
  });

  test('older codes still decode, and an unknown finish still fails', () => {
    expect(decode('puttsies.ball~prism~0.0100000~3')?.finish).toBe('prism');
    expect(decode('puttsies.ball~mosaic~0.0100000~3')).toBeNull();
  });
});

describe('finishes run across the item', () => {
  test('a small hat in Prism shows the whole rainbow, and in Sunset all three colours', () => {
    const prism = new Set(paintBox({ item: 'puttsies.ball', finish: 'prism', scuff: 0, print: 0 }).map(hueOf).filter(h => h >= 0).map(h => Math.floor(h / 60)));
    expect(prism.size).toBeGreaterThanOrEqual(5);
    const sunset = paintBox({ item: 'puttsies.ball', finish: 'sunset', scuff: 0, print: 50 }).map(hueOf);
    expect(sunset.some(h => h >= 30 && h < 70)).toBe(true);
    expect(sunset.some(h => h >= 300 && h < 345)).toBe(true);
    expect(sunset.some(h => h >= 245 && h < 290)).toBe(true);
  });

  test('Negative splits hard into ink and ivory with a cyan and a magenta edge, even six cells wide', () => {
    const cells = paintBox({ item: 'puttsies.ball', finish: 'negative', scuff: 0, print: 0 }, { left: 0, top: 0, right: 5, bottom: 3 });
    expect(cells.filter(c => lum(c) < 0.15).length).toBeGreaterThanOrEqual(4);
    expect(cells.filter(c => lum(c) > 0.85).length).toBeGreaterThanOrEqual(4);
    expect(cells).toContain('#3BB8CF');
    expect(cells).toContain('#D9468F');
  });

  test('on a skin, the graphic finishes, Negative and a Black Hole keep the face readable', () => {
    // Every eye cell stands well off every cell of the skin touching it, as on Plain.
    const worst = (finish: Finish, print: number) => {
      let low = Infinity;
      for (const skin of ['weighsies.piano', 'puttsies.ball', 'stackdle.triangle', 'amountle.jar', 'halfsies.lemon']) for (const seed of ['pip', 'juno']) {
        const c = dress(resolve(seed), { equip: [encode({ item: skin, finish, scuff: 0.01, print })] }), g = compose(c), px = paint(g, c, withItems(paletteOf(c), c));
        g.forEach((row, y) => row.forEach((t, x) => {
          if (t !== T.EYE || !px[y][x]) return;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const n = g[y + dy]?.[x + dx] ?? 0;
            if (n >= LAYER.skin && n < LAYER.skin + 10 && px[y + dy][x + dx]) low = Math.min(low, contrast(px[y][x]!, px[y + dy][x + dx]!));
          }
        }));
      }
      return low;
    };
    for (const [finish, print] of [['op', 5], ['op', 1], ['impossible', 2], ['grid', 0], ['nebula', 2]] as const) expect(worst(finish, print)).toBeGreaterThan(4.5);
    expect(worst('negative', 2)).toBeGreaterThan(2.5);
  });

  test('every item has a box to sweep across, measured or its slot\'s', () => {
    for (const item of items) {
      const b = boxOf(item.id);
      expect(b.right).toBeGreaterThanOrEqual(b.left);
      expect(b.bottom).toBeGreaterThanOrEqual(b.top);
    }
  });
});

describe('the famous prints', () => {
  const look = (finish: Finish, print: number) => paintBox({ item: 'puttsies.ball', finish, scuff: 0, print }, { left: 0, top: 0, right: 11, bottom: 9 });
  test('Black Hole is a void with a lit rim and a hot band; on a skin the void stays above the face', () => {
    const cells = paintBox({ item: 'puttsies.top-hat', finish: 'nebula', scuff: 0, print: 2 }, { left: 0, top: 0, right: 11, bottom: 9 });
    expect(cells.filter(c => lum(c) < 0.12).length / cells.length).toBeGreaterThan(0.3);
    expect(cells.some(c => lum(c) > 0.85)).toBe(true);
    expect(cells.some(c => { const h = hueOf(c); return h >= 10 && h < 40 && lum(c) > 0.4; })).toBe(true);
    // The golf ball's eyes sit on row 9: the void is over the rows above, the face's rows are lit.
    const ball = paintBox({ item: 'puttsies.ball', finish: 'nebula', scuff: 0, print: 2 }, { left: 1, top: 1, right: 14, bottom: 14 });
    const row = (y: number) => ball.slice((y - 1) * 14, y * 14);
    expect(row(3).filter(c => lum(c) < 0.12).length).toBeGreaterThan(3);
    for (const y of [8, 9, 10]) expect(row(y).slice(3, 11).every(c => lum(c) > 0.3)).toBe(true);
  });
  test('Deep Blue is a saturated sapphire with one white line, not Steel', () => {
    const deep = look('tempered', 661), steel = look('tempered', 4);
    expect(deep.filter(c => { const h = hueOf(c); return h >= 210 && h < 240; }).length / deep.length).toBeGreaterThan(0.7);
    expect(deep.some(c => lum(c) > 0.9)).toBe(true);
    expect(deep).not.toEqual(steel);
  });
  test('Red Giant and Blue Moon have their own looks', () => {
    const red = look('nebula', 0), moon = look('nebula', 1), plain = look('nebula', 5);
    expect(red.filter(c => { const h = hueOf(c); return h >= 0 && h < 45 || h > 345; }).length / red.length).toBeGreaterThan(0.8);
    expect(moon.filter(c => lum(c) > 0.55).length / moon.length).toBeGreaterThan(0.4);
    expect(red).not.toEqual(plain);
  });
});

describe('effects over finishes', () => {
  test('a recolouring effect is a layer over a rare finish, and still a repaint over Plain', () => {
    const near = (a: string, b: string) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i])) < 60;
    for (const fx of ['chroma', 'holo', 'lava', 'starlight', 'rime', 'static', 'electric'] as const) {
      expect(layered('tempered')).toBe(true);
      let kept = 0, plainKept = 0, n = 0;
      for (let t = 0; t < 6000; t += 500) for (let x = 0; x < 8; x++) for (let y = 0; y < 5; y++) {
        const c = '#1A50E6';
        if (near(fxColor(c, fx, x, y, t, 3, 'tempered'), c)) kept++;
        if (near(fxColor(c, fx, x, y, t, 3, 'plain'), c)) plainKept++;
        n++;
      }
      expect(kept / n).toBeGreaterThan(0.6);
      if (fx !== 'static' && fx !== 'electric') expect(plainKept / n).toBeLessThan(kept / n);
    }
    expect(layered('plain')).toBe(false);
    expect(layered('sunset')).toBe(false);
    expect(layered('pearl')).toBe(false);
    expect(layered(undefined)).toBe(false);
  });

  test('every effect has a five by five badge in colours it names', () => {
    for (const fx of FX_IDS) {
      expect(FX_BADGES[fx].length).toBe(5);
      for (const row of FX_BADGES[fx]) { expect(row.length).toBe(5); for (const ch of row) if (ch !== '.') expect(BADGE_INKS[ch]).toBeDefined(); }
    }
  });
});

describe('honest numbers', () => {
  const o: Owned = { item: 'puttsies.ball', finish: 'prism', scuff: 0.0001, print: 9, tally: 4, fx: 'hearts' };
  test('visibleOneIn leaves out the float and the tally; copyOneIn keeps them', () => {
    expect(visibleOneIn(o)).toBeCloseTo(visibleOneIn({ ...o, scuff: 0.07, tally: undefined }), 5);
    expect(copyOneIn(o)).toBeGreaterThan(visibleOneIn(o) * 100);
    expect(visibleOneIn({ ...o, fx: undefined }) * EFFECTS.hearts.item).toBeCloseTo(visibleOneIn(o), 0);
    expect(visibleOneIn({ ...o, finish: 'tempered', print: 661 })).toBeGreaterThan(visibleOneIn({ ...o, finish: 'tempered', print: 4 }));
  });

  test('an Unusual is a showpiece or an effect rarer than about one in 250', () => {
    expect(unusual({ ...o, fx: 'shimmer' })).toBe(false);
    expect(unusual({ ...o, fx: 'neon' })).toBe(true);
    expect(unusual({ ...o, fx: 'electric' })).toBe(true);
    expect(unusual({ ...o, fx: undefined })).toBe(false);
    const show = items.find(i => i.showpiece)!;
    expect(unusual({ item: show.id, finish: 'plain', scuff: 0.5, print: 1, fx: show.signature })).toBe(true);
    // An aura's effect is rated on the aura ladder.
    expect(unusual({ item: 'aura.halo', finish: 'classic', scuff: 0, print: 1, fx: 'embers' })).toBe(false);
    expect(unusual({ item: 'aura.halo', finish: 'classic', scuff: 0, print: 1, fx: 'lava' })).toBe(true);
  });

  test('a guy wearing a capsule-only part gets a real rank, never none', () => {
    for (const name of ['idea', 'thought']) {
      const i = hair.findIndex(h => h.name === name);
      if (i < 0) continue;
      const config = { ...resolve('x'), hair: i };
      const t = traitOdds(config).find(t => t.slot === 'topper')!;
      expect(t.chance).toBeGreaterThan(0);
      expect(guyRank(config).top).toBeGreaterThan(0);
    }
  });
});

describe('auras', () => {
  test('every aura lights at least eight cells all through the idle loop, round guys who fill their frame too', () => {
    // Dealt guys: the first four fill their frame, so a still piece finds no room in it; then a spread of others.
    const seeds = ['4-r174218', '4-r55433', '4-r237570', '4-r356355', '4-r269246', '4-r7919', 'maya', 'pip', ...Array.from({ length: 12 }, (_, i) => `4-r${(i * 104729 + 7) % 400000}`)];
    for (const seed of seeds) {
      const mask = animate(seed, 'idle', {}).frames[0].colors.map(row => row.map(Boolean));
      for (const a of AURAS) for (const print of [0, 7]) for (let t = 0; t < 6000; t += 90) {
        const n = auraCells(a.id, mask, t, { item: a.id, finish: 'classic', scuff: 0, print }, AURA_PAD).length;
        if (n < 8) throw new Error(`${a.id} on ${seed} at ${t}: ${n} cells`);
      }
    }
  }, 30000);

  test('Black pearl is lit nacre catching teal, violet and rose, dark only at its edge, and its card is dressed in its sheen', () => {
    // The aura's own cells stay light enough to read on the club's navy; only the outer step is the pearl's dark body.
    const at = (k: number, x: number) => auraColor('aura.hearts', k, 'pearl', x, 4, 0, 1);
    for (const x of [0, 3, 6, 9]) {
      expect(lum(at(0, x))).toBeGreaterThan(0.7);
      expect(lum(at(1, x))).toBeGreaterThan(0.5);
      expect(lum(at(2, x))).toBeLessThan(0.45);
    }
    expect(new Set([0, 3, 6, 9].map(x => Math.round(hueOf(at(1, x)) / 40))).size).toBeGreaterThanOrEqual(3);
    // Its card's pill and border: the pale sheen, never a dark grey on the dark plate.
    expect(lum(auraHue('aura.hearts', 'pearl'))).toBeGreaterThan(0.5);
  });
});

describe('cards', () => {
  test('every name a card writes is in the card\'s type', () => {
    const names = [...items.map(i => i.name), ...Object.values(EFFECTS).map(e => e.name), ...Object.values(FINISHES).map(f => f.name),
      ...Object.values(PAINTS).map(p => p.name), ...PINS.map(p => p.name), ...AURAS.map(a => a.name)];
    const missing = names.flatMap(n => [...n].filter(ch => !hasGlyph(ch)).map(ch => `${n}: ${ch}`));
    expect(missing).toEqual([]);
    expect(hasGlyph('’') && hasGlyph('“') && hasGlyph('”')).toBe(true);
  });

  const amber = (px: Uint8ClampedArray) => { let n = 0; for (let i = 0; i < px.length; i += 4) if (px[i] === 255 && px[i + 1] === 178 && px[i + 2] === 62) n++; return n; };
  const count = (px: Uint8ClampedArray, c: number[]) => { let n = 0; for (let i = 0; i < px.length; i += 4) if (px[i] === c[0] && px[i + 1] === c[1] && px[i + 2] === c[2]) n++; return n; };
  const hat: Owned = { item: 'puttsies.top-hat', finish: 'plain', scuff: 0.2, print: 3 };

  test('a Strange copy shows its count on an amber counter', () => {
    expect(amber(cardStill({ seed: 'maya', copies: [hat], title: 'Top hat' }))).toBe(0);
    const lit = amber(cardStill({ seed: 'maya', copies: [{ ...hat, tally: 412 }], title: 'Strange Top hat' }));
    // 0412: four digits' lit segments (6 + 4 + 2 + 5 segments, of 3 cells each).
    expect(lit).toBe((6 + 4 + 2 + 5) * 3);
  });

  test('a plate in its grade\'s colour under the badge\'s line, and a seal for a 1st edition', () => {
    const base = { seed: 'maya', copies: [hat], title: 'Top hat', lines: ['Rare', 'Top 2.7%'] };
    const grail = [228, 174, 57];
    expect(count(cardStill(base), grail)).toBe(0);
    expect(count(cardStill({ ...base, plate: { text: '★ Grail · Gold Goldfish', grade: 4 } }), grail)).toBeGreaterThan(200);
    const coral = [232, 100, 78];
    expect(count(cardStill({ ...base, footer: '1st edition' }), coral)).toBeGreaterThan(40);
    expect(count(cardStill({ ...base, footer: 'Puttsies set' }), coral)).toBe(0);
  });

  test('an Unusual names its effect and wears its badge; a graphic finish is never an aura card', () => {
    const plain = cardStill({ seed: 'maya', copies: [hat], title: 'Top hat' });
    const electric = cardStill({ seed: 'maya', copies: [{ ...hat, fx: 'electric' }], title: 'Top hat' });
    expect(count(electric, rgb(BADGE_INKS.y))).toBeGreaterThan(count(plain, rgb(BADGE_INKS.y)) + 20);
    const op = cardStill({ seed: 'maya', copies: [{ ...hat, finish: 'op', scuff: 0.01 }], title: 'Top hat' });
    expect(count(op, [241, 235, 221])).toBeGreaterThan(1500);
    expect(op.length).toBe(CARD_WIDTH * CARD_HEIGHT * 4);
  });

  test('a title too long for its line drops Strange, then the effect\'s name, never the item\'s own', () => {
    // The plate under the window: the title row and below, which the window's effect never reaches.
    const plate = (px: Uint8ClampedArray) => px.slice((CARD_HEIGHT - 26) * CARD_WIDTH * 4);
    const magic: Owned = { item: 'puttsies.top-hat', finish: 'plain', scuff: 0.2, print: 3 };
    const long = cardStill({ seed: 'maya', copies: [{ ...magic, fx: 'starlight', tally: 41 }], title: 'Strange Unusual Magic top hat' });
    // Shimmer is too common to be named, so this card's title reads as written.
    const trimmed = cardStill({ seed: 'maya', copies: [{ ...magic, fx: 'shimmer', tally: 41 }], title: 'Unusual Magic top hat' });
    expect(plate(long)).toEqual(plate(trimmed));
    // A title with room keeps the effect's name: "Starlight Golf ball".
    const ball: Owned = { item: 'puttsies.ball', finish: 'plain', scuff: 0.2, print: 3 };
    const short = cardStill({ seed: 'maya', copies: [{ ...ball, fx: 'starlight' }], title: 'Golf ball' });
    expect(plate(short)).not.toEqual(plate(cardStill({ seed: 'maya', copies: [{ ...ball, fx: 'shimmer' }], title: 'Golf ball' })));
  });

  test('a famous print brings its own window', () => {
    const at = (print: number) => cardStill({ seed: 'maya', copies: [{ item: 'puttsies.ball', finish: 'nebula', scuff: 0.01, print }], title: 'Golf ball' });
    // Black Hole's window is mostly the void.
    expect(count(at(2), [5, 4, 9])).toBeGreaterThan(3000);
    expect(count(at(5), [5, 4, 9])).toBe(0);
  });
});

test('a graphic finish\'s window moves on the card', () => {
  const { cardFrames } = require('../card');
  const f = cardFrames({ seed: 'maya', copies: [{ item: 'puttsies.top-hat', finish: 'op', scuff: 0.01, print: 3 }], title: 'Top hat' });
  expect(new Set(f.frames.map((px: Uint8ClampedArray) => px.join(','))).size).toBeGreaterThan(4);
});
