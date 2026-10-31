import { describe, expect, test } from 'bun:test';
import { resolve } from '../resolve';
import { compose, faceOf } from '../compose';
import { paint, underEyes } from '../paint';
import { dress, withItems } from '../items';
import { encode } from '../owned';
import { fxColor } from '../effects';
import { LAYER } from '../parts/art';
import { paletteOf, palettes, contrast, deltaE } from '../palette';
import { eyes, hair, heads, accessories, bodies as markings, mouths } from '../parts';
import { animate, poseStill } from '../animate';
import { T } from '../parts/art';
import { toSvgString } from '../render-string';

describe('eyes', () => {
  // A white catchlight on the edge of a dark eye, against a light face, melted
  // into the skin and left the eye an L. There it is a pale tint of the eye.
  test('a dark eye never has pure white between it and a light face', () => {
    let checked = 0;
    for (let n = 0; n < 300; n++) {
      const config = resolve(`guy${n}`), palette = paletteOf(config), grid = compose(config), colors = paint(grid, config, palette);
      if (contrast('#FFFFFF', palette.colors[T.EYE]!) < 3) continue;
      grid.forEach((row, y) => row.forEach((token, x) => {
        if (token !== T.WHITE) return;
        const near = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].map(([a, b]) => grid[b]?.[a] ?? 0);
        if (!near.includes(T.EYE)) return;
        const pale = near.some(t => t > 0 && t !== T.EYE && t !== T.WHITE && contrast('#FFFFFF', palette.colors[t] ?? '#000000') < 1.6);
        if (!pale) return;
        checked++;
        expect(colors[y][x]).not.toBe('#FFFFFF');
      }));
    }
    expect(checked).toBeGreaterThan(20);
  });
});

describe('small', () => {
  const fills = (svg: string) => [...svg.matchAll(/fill="(#[0-9A-F]+)"/gi)].map(m => m[1].toUpperCase());
  test('a guy drawn small has solid, darker eyes and keeps his body', () => {
    for (const name of ['alice', 'maya', 'okapi', 'bluejay', 'hazel']) {
      const big = fills(toSvgString(name, { size: 128, square: true })), small = fills(toSvgString(name, { size: 24, square: true }));
      expect(toSvgString(name, { size: 24, square: true, small: false })).not.toBe(toSvgString(name, { size: 24, square: true }));
      // The body colour is untouched, and nothing new but a darker ink appears.
      const config = resolve(name), palette = paletteOf(config);
      expect(small).toContain(palette.colors[T.BODY]!.toUpperCase());
      expect(new Set(small.filter(c => !big.includes(c))).size).toBeLessThanOrEqual(1);
    }
    // At 37px and up the full drawing stays.
    expect(toSvgString('alice', { size: 40 })).toBe(toSvgString('alice', { size: 40, small: false }));
  });
});

describe('chase parts', () => {
  const plain = { head: 0, eyes: 1, mouth: 0, cheeks: 0, hair: 0, body: 0, accessory: 0, arms: 0, feet: 0, shade: 1, flip: false, rotation: 0, lucky: false };
  const find = (list: { name: string }[], name: string) => list.findIndex(p => p.name === name);
  const bodies = ['Snow', 'Peach', 'Butter', 'Midnight', 'Oxblood'].map(n => palettes.findIndex(p => p.name === n));
  /** The colours a part paints its own token in, on each body. */
  const coloursOf = (over: Partial<typeof plain>, token: number, region: (x: number, y: number) => boolean) => bodies.map(palette => {
    const config = { ...plain, ...over, palette }, grid = compose(config), colors = paint(grid, config, paletteOf(config));
    return [...new Set(grid.flatMap((row, y) => row.flatMap((t, x) => (t === token && region(x, y) ? [colors[y][x]] : []))))].sort().join();
  });

  test('keep their own colours on every body', () => {
    const top = (_: number, y: number) => y < 6;
    for (const [over, token, region] of [
      [{ hair: find(hair, 'on fire') }, T.RED, top],
      [{ hair: find(hair, 'idea') }, T.TRIM, top],
      // The mask's gold rim.
      [{ accessory: find(accessories, 'masquerade') }, T.TRIM, (_: number, y: number) => y >= 5 && y <= 8],
      [{ eyes: find(eyes, 'laser') }, T.RED, (_: number, y: number) => y >= 6 && y <= 8],
      [{ eyes: find(eyes, 'eclipse') }, T.EYE, (_: number, y: number) => y >= 6 && y <= 8],
    ] as const) {
      const seen = coloursOf(over, token, region);
      expect(seen[0]).not.toBe('');
      expect(new Set(seen).size).toBe(1);
    }
  });

  test('the mask, the corona and the seams hold apart from every body', () => {
    for (const [over, token] of [
      [{ accessory: find(accessories, 'masquerade') }, T.LEAF_SHADE],
      [{ eyes: find(eyes, 'eclipse') }, T.GOLD],
    ] as const) for (let palette = 0; palette < palettes.length; palette++) for (const shade of [0, 1, 2]) {
      const config = { ...plain, ...over, palette, shade }, grid = compose(config), pal = paletteOf(config), colors = paint(grid, config, pal);
      const cells = grid.flatMap((row, y) => row.flatMap((t, x) => (t === token ? [colors[y][x]!] : [])));
      expect(cells.length).toBeGreaterThan(0);
      for (const c of cells) expect(deltaE(c, pal.colors[T.BODY]!)).toBeGreaterThan(20);
    }
  });

  test('a marking or mask keeps its own colours in every pose, on every mouth', () => {
    const leaf = new Set(['#7DD87A', '#4FAE5C']);
    const poses = ['base', 'shut', 'left', 'right', 'wave', 'sides', 'laugh', 'laughWave', 'frown', 'ooh', 'smile', 'content', 'blep', 'blush', 'huff', 'oops'] as const;
    for (const over of [{ body: find(markings, 'kintsugi') }, { body: find(markings, 'op art') }, { accessory: find(accessories, 'masquerade') }]) {
      for (let mouth = 0; mouth < mouths.length; mouth += 3) for (const pose of poses) {
        const cells = poseStill('k', pose, { parts: { ...plain, ...over, mouth, palette: palettes.findIndex(p => p.name === 'Snow') } });
        expect(cells.flat().filter(c => c && leaf.has(c.toUpperCase()))).toEqual([]);
      }
    }
  });

  test('a blink never punches through the mask', () => {
    const mask = new Set(['#5A2D9C', '#8657D6', '#FFD45C']);
    for (const name of ['shiny', 'star', 'happy', 'laser', 'galaxy', 'eclipse']) {
      const opts = { parts: { ...plain, eyes: find(eyes, name), accessory: find(accessories, 'masquerade'), palette: palettes.findIndex(p => p.name === 'Peach') } };
      const count = (pose: 'base' | 'shut') => poseStill('m', pose, opts).flat().filter(c => c && mask.has(c.toUpperCase())).length;
      expect(count('shut')).toBeGreaterThanOrEqual(count('base'));
    }
  });

  test('a glance or a blink leaves no hole in a mask, a monocle or glasses', () => {
    const skin = [T.BODY, T.SHADE, T.LIGHT, T.DEEP, T.BELLY];
    for (const acc of ['masquerade', 'monocle', 'glasses']) for (const name of ['beans', 'shiny', 'star', 'big eyes', 'laser', 'galaxy']) for (const body of ['Peach', 'Snow', 'Midnight']) {
      const parts = { ...plain, eyes: find(eyes, name), accessory: find(accessories, acc), palette: palettes.findIndex(p => p.name === body) };
      const config = { ...resolve('m', parts) }, under = underEyes(config)!, pal = paletteOf(config);
      const bare = new Set(skin.map(t => pal.colors[t]?.toUpperCase()));
      const base = poseStill('m', 'base', { parts });
      // A glance moves the eyes; a blink, Sleep, Sad, Mad, Gg, Oops and Daydream shut them.
      for (const pose of ['left', 'right', 'blushLeft', 'blushRight', 'shut', 'frown', 'content', 'huff', 'oops'] as const) {
        const cells = poseStill('m', pose, { parts });
        under.forEach((row, y) => row.forEach((t, x) => {
          // Where the accessory lies under an eye in its own colour, a cell the eye leaves never shows bare skin.
          const c = cells[y + 4][x]?.toUpperCase();
          if (t && !skin.includes(t) && c !== base[y + 4][x]?.toUpperCase()) expect(bare.has(c)).toBe(false);
        }));
      }
    }
    // Only a face accessory lies under the eyes: none, an eye patch drawn over them, a scarf.
    for (const acc of ['none', 'eye patch', 'scarf', 'heart shades']) expect(underEyes(resolve('m', { ...plain, accessory: find(accessories, acc) }))).toBeNull();
    // A frame behind the guy is painted on a taller grid than the guy's own.
    expect(() => animate('m', 'idle', { parts: { ...plain, accessory: find(accessories, 'masquerade') }, equip: ['flipsies.target'] })).not.toThrow();
  });

  test('a glance that uncovers a monocle\'s ring keeps the shine as white as the still has it', () => {
    const parts = { ...plain, head: find(heads, 'round'), eyes: find(eyes, 'beans'), accessory: find(accessories, 'monocle') };
    const opts = { parts, palette: paletteOf({ ...resolve('g', parts), palette: palettes.findIndex(p => p.name === 'Midnight') }), equip: ['stackdle.block~plain~0.5000000~1'] };
    const still = new Set(poseStill('g', 'base', opts).flat());
    for (const pose of ['left', 'right'] as const) expect(poseStill('g', pose, opts).flat().filter(c => !still.has(c))).toEqual([]);
  });

  test('an eye\'s colour a glance moves onto the mask stays the eye\'s, never the feather\'s pink', () => {
    for (const body of ['Peach', 'Snow', 'Midnight']) for (const head of [0, 2, 5]) {
      const parts = { ...plain, head, eyes: find(eyes, 'big eyes'), accessory: find(accessories, 'masquerade'), palette: palettes.findIndex(p => p.name === body) };
      const f = faceOf(resolve('m', parts));
      for (const pose of ['left', 'right'] as const) {
        // The feather is over the mask's corner, well above the eyes' rows.
        const rows = poseStill('m', pose, { parts }).slice(4 + f.top, 4 + f.line + 1);
        expect(rows.flat().filter(c => c?.toUpperCase() === '#FF6FA8')).toEqual([]);
      }
    }
  });

  test('chase eyes keep their star or bead when drawn small', () => {
    for (const name of ['galaxy', 'void', 'eclipse']) {
      const config = { ...plain, eyes: find(eyes, name), palette: palettes.findIndex(p => p.name === 'Midnight') }, grid = compose(config);
      const small = paint(grid, config, paletteOf(config), true);
      expect(small.flat().filter(c => c === '#FFFFFF').length).toBeGreaterThan(0);
    }
  });

  test('void eyes get a rim of the body\'s own light tone on a dark body, and none on a light one', () => {
    const rimmed = (name: string) => {
      const config = { ...plain, eyes: find(eyes, 'void'), palette: palettes.findIndex(p => p.name === name) };
      const grid = compose(config), palette = paletteOf(config), colors = paint(grid, config, palette);
      return grid.some((row, y) => row.some((t, x) => t === T.BODY && colors[y][x] === palette.colors[T.LIGHT]));
    };
    expect(rimmed('Midnight')).toBe(true);
    expect(rimmed('Oxblood')).toBe(true);
    expect(rimmed('Peach')).toBe(false);
  });
});

describe('stills', () => {
  test('lay an effect over its finish, as a moving frame does', () => {
    // A Deep Blue piano with Chroma: the still keeps the blue and runs the rainbow band over it.
    for (const [finish, print] of [['tempered', 661], ['gold', 5], ['prism', 5]] as const) {
      const copy = { item: 'weighsies.piano', finish, scuff: 0.01, print };
      const at = (fx?: 'chroma' | 'holo') => {
        const config = dress(resolve('pip'), { equip: [encode({ ...copy, ...(fx ? { fx } : {}) })] }, 'pip');
        const grid = compose(config);
        return { grid, colors: paint(grid, config, withItems(paletteOf(config), config)) };
      };
      const bare = at();
      for (const fx of ['chroma', 'holo'] as const) {
        const { grid, colors } = at(fx);
        let n = 0;
        grid.forEach((row, y) => row.forEach((t, x) => {
          if (t < LAYER.skin || t >= LAYER.hat) return;
          n++;
          expect(colors[y][x]).toBe(fxColor(bare.colors[y][x]!, fx, x, y, 0, print, finish));
        }));
        expect(n).toBeGreaterThan(40);
      }
    }
  });
});
