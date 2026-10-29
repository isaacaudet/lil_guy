import { RETIRED_EYES } from '../parts/weights';
import { describe, expect, it } from 'bun:test';
import { compose, buddySpot, movesRoom, ARM_STYLES, BUDDY_ROOM, FOOT_STYLES } from '../compose';
import { BUDDY_BOX } from '../item-art';
import { heads, eyes, mouths, hair, accessories } from '../parts';
import { T } from '../parts/art';
import { items, itemById, gameItems, freeItem, dress, withItems, GAMES } from '../items';
import { palettes, shadePalette, SHADE_COUNT } from '../palette';
import { resolve } from '../resolve';
import { toSvgString } from '../render-string';
import type { AvatarConfig, PixelGrid } from '../types';
import { GRID_SIZE } from '../types';

const BASE: AvatarConfig = {
  head: 0, eyes: 0, mouth: 0, cheeks: 0, hair: 0, body: 0, accessory: 0,
  arms: 0, feet: 0, palette: 0, shade: 1, flip: false, rotation: 0,
};
const guy = (parts: Partial<AvatarConfig>) => compose({ ...BASE, ...parts });

const skins = items.filter(i => i.slot === 'skin');
const hats = items.filter(i => i.slot === 'hat');
const frames = items.filter(i => i.slot === 'frame');

function pieces(grid: PixelGrid): number {
  const seen = grid.map(row => row.map(() => false));
  let count = 0;
  for (let y = 0; y < GRID_SIZE; y++) for (let x = 0; x < GRID_SIZE; x++) {
    if (!grid[y][x] || seen[y][x]) continue;
    count++;
    const stack = [[x, y]];
    seen[y][x] = true;
    while (stack.length) {
      const [cx, cy] = stack.pop()!;
      for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
        if (nx < 0 || ny < 0 || nx >= GRID_SIZE || ny >= GRID_SIZE || !grid[ny][nx] || seen[ny][nx]) continue;
        seen[ny][nx] = true;
        stack.push([nx, ny]);
      }
    }
  }
  return count;
}

const touchesEdge = (grid: PixelGrid) => grid.some((row, y) => row.some((v, x) =>
  v && v !== T.OUTLINE && (x === 0 || y === 0 || x === GRID_SIZE - 1 || y === GRID_SIZE - 1)));

describe('the catalog', () => {
  it('has unique ids', () => {
    expect(new Set(items.map(i => i.id)).size).toBe(items.length);
  });

  it('gives every game four skins and a showpiece, five hats (one free), three frames and four buddies', () => {
    for (const game of GAMES) {
      const own = gameItems(game);
      const count = (slot: string) => own.filter(i => i.slot === slot && !i.showpiece).length;
      expect([count('skin'), count('hat'), count('frame'), count('buddy')]).toEqual([4, 5, 3, 4]);
      expect(own.filter(i => i.showpiece).map(i => i.slot)).toEqual(['skin']);
      // A capsule machine holds everything but the free hat: 12 to 16 items.
      expect(own.filter(i => !i.free).length).toBeGreaterThanOrEqual(12);
      expect(own.filter(i => !i.free).length).toBeLessThanOrEqual(16);
      expect(own.filter(i => i.free).map(i => i.slot)).toEqual(['hat']);
      expect(freeItem(game).free).toBe(true);
    }
  });

  it('keeps every item id it has ever had, in order', () => {
    // Saved copies store item ids, and a capsule's roll reads each game's
    // list in order: items are only ever added, after the ones before.
    const first = [
      'amountle.jar', 'halfsies.pot', 'stackdle.block', 'flipsies.bottle', 'puttsies.ball', 'weighsies.cheese', 'cutsies.kiwi', 'tiltsies.ball', 'trackdle.racer',
    ];
    expect(skins.slice(0, first.length).map(i => i.id)).toEqual(first);
    for (const id of ['amountle.gemling', 'trackdle.snail', 'club.birthday', 'club.sweetheart', 'trackdle.tarmac', 'trackdle.trophy']) {
      expect(itemById(id)).toBeDefined();
    }
  });

  it('lists a colour for every item colour its art uses', () => {
    for (const item of items) {
      for (const hex of item.colors) expect(hex).toMatch(/^#[0-9A-F]{6}$/);
      const grid = guy({ [item.slot]: item.id });
      const palette = withItems(palettes[0], { ...BASE, [item.slot]: item.id });
      for (const v of grid.flat()) if (v) expect(palette.colors[v]).toBeDefined();
    }
  });
});

describe('skins', () => {
  it('leave the border free and keep a face-wide middle', () => {
    for (const skin of skins) {
      const art = skin.art!;
      art.forEach((row, y) => row.forEach((v, x) => {
        if (v) expect(x > 0 && x < 15 && y > 0 && y < 15).toBe(true);
      }));
      const e = skin.eyes!;
      for (let y = e - 2; y <= e + 3; y++) {
        const [from, to] = y === e - 2 ? [4, 11] : y > e + 1 ? [5, 10] : [3, 12];
        for (let x = from; x <= to; x++) if (!art[y][x]) throw new Error(`${skin.id} too narrow at row ${y}`);
      }
    }
  });

  it('show every eye and mouth in full, under every hat', () => {
    const wrong: string[] = [];
    for (const skin of skins) {
      for (const hat of [undefined, ...hats.map(h => h.id)]) {
        for (let e = 0; e < eyes.length; e++) {
          if (RETIRED_EYES.includes(e)) continue;
          const g = guy({ skin: skin.id, hat, eyes: e, mouth: 1 });
          const used = new Set(eyes[e].art.flat().filter(Boolean));
          const drawn = g.flat().filter(v => used.has(v)).length;
          if (drawn < eyes[e].art.flat().filter(Boolean).length) wrong.push(`${skin.id} + ${hat} clips ${eyes[e].name}`);
        }
        for (let m = 0; m < mouths.length; m++) {
          const g = guy({ skin: skin.id, hat, mouth: m });
          const usedM = new Set(mouths[m].art.flat().filter(Boolean));
          const drawn = g.flat().filter(v => usedM.has(v)).length;
          if (drawn < mouths[m].art.flat().filter(Boolean).length) wrong.push(`${skin.id} + ${hat} clips ${mouths[m].name}`);
        }
      }
    }
    expect(wrong).toEqual([]);
  }, 60_000);

  it('keep the eyes legible on the skin, in every colourway and tone', () => {
    // The eyes are drawn in the palette's ink, onto the skin's own colours.
    const luminance = (hex: string) => {
      const c = (i: number) => {
        const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * c(0) + 0.7152 * c(1) + 0.0722 * c(2);
    };
    const contrast = (a: string, b: string) => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    const wrong: string[] = [];
    for (const skin of skins) {
      const e = skin.eyes!;
      const under = new Set<number>();
      for (let y = e - 2; y <= e + 1; y++) for (let x = 4; x <= 11; x++) under.add(skin.art![y][x]);
      for (const p of palettes) for (let shade = 0; shade < SHADE_COUNT; shade++) {
        const ink = withItems(shadePalette(p, shade), { ...BASE, skin: skin.id }).colors[T.EYE];
        for (const token of under) {
          // The guy's own colours (a Cyborg's human half) are legible by the palette's own rules.
          if (token < 101) continue;
          const hex = skin.colors[token - 101];
          if (contrast(ink, hex) < 3.5) wrong.push(`${skin.id} colour ${token - 100} vs ${p.name}/${shade}`);
        }
      }
    }
    expect([...new Set(wrong)]).toEqual([]);
  });
});

describe('everything worn together', () => {
  it('stays outlined inside the frame and in one piece', () => {
    const wrong: string[] = [];
    const bodies = [...heads.map((_, head) => ({ head })), ...skins.map(s => ({ skin: s.id }))];
    for (const body of bodies) {
      for (const hat of [undefined, ...hats.map(h => h.id)]) {
        for (let arms = 0; arms < ARM_STYLES.length; arms++) {
          for (let feet = 0; feet < FOOT_STYLES.length; feet++) {
            const g = guy({ ...body, hat, arms, feet, accessory: 1 });
            const label = `${JSON.stringify(body)} + ${hat} arms ${arms} feet ${feet}`;
            if (touchesEdge(g)) wrong.push(`${label} touches the edge`);
            if (pieces(g) > 1) wrong.push(`${label} is in ${pieces(g)} pieces`);
          }
        }
      }
    }
    expect(wrong).toEqual([]);
  }, 60_000);

  it('fills every empty cell when a frame is worn', () => {
    for (const frame of frames) {
      const g = guy({ frame: frame.id });
      expect(g.flat().every(v => v !== 0)).toBe(true);
    }
  });

  it('keeps the guy the same under a skin: only the body changes', () => {
    const config = resolve('alice');
    const plain = compose(config);
    const skinned = compose({ ...config, skin: skins[0].id });
    const face = (g: PixelGrid) => g.flat().filter(v => v === T.EYE).length;
    expect(face(skinned)).toBe(face(plain));
  });
});

describe('buddies', () => {
  const buddies = items.filter(i => i.slot === 'buddy');

  it('fit their box: at most BUDDY_BOX, 8 across and 8 tall, and at least 4 of each', () => {
    for (const b of buddies) {
      const art = b.art!;
      expect(art.length).toBeLessThanOrEqual(BUDDY_BOX.height);
      expect(art.length).toBeGreaterThanOrEqual(4);
      expect(Math.max(...art.map(r => r.length))).toBeLessThanOrEqual(BUDDY_BOX.width);
      expect(Math.max(...art.map(r => r.length))).toBeGreaterThanOrEqual(4);
      // Solid enough to read as a shape, not a scatter of pixels.
      expect(art.flat().filter(Boolean).length).toBeGreaterThanOrEqual(12);
    }
  });

  // The rule: a buddy stands apart, a clear pixel (diagonals too) between its
  // outline and the guy in every frame of every move. The moving and baked
  // pictures are BUDDY_ROOM columns wider at most, and there every head and
  // skin has the room (`buddyBeside`). His 16x16 icon has none, so it leaves
  // the buddy out.
  const BOX = Array.from({ length: BUDDY_BOX.height }, () => new Array<number>(BUDDY_BOX.width).fill(1));
  const all = [...heads.map((_, head) => ({ head })), ...skins.map(s => ({ skin: s.id }))];

  it('are left off his 16x16 icon, flipped or not', () => {
    const wrong: string[] = [];
    for (const body of all) for (const flip of [false, true]) for (const b of buddies) {
      if (JSON.stringify(guy({ ...body, flip, buddy: b.id })) !== JSON.stringify(guy({ ...body, flip }))) wrong.push(`${b.id} on ${JSON.stringify(body)}`);
    }
    expect(wrong).toEqual([]);
  }, 60_000);

  it('stand apart from him, a clear pixel between, within BUDDY_ROOM more columns', () => {
    const wrong: string[] = [];
    for (const body of all) for (let feet = 0; feet < FOOT_STYLES.length; feet++) for (const arms of [0, 1, 2]) for (const flip of [false, true]) {
      const room = movesRoom({ ...BASE, ...body, feet, arms, flip }).map(row => [...row, ...new Array<boolean>(GRID_SIZE + BUDDY_ROOM - row.length).fill(false)]);
      const spot = buddySpot(BOX, room);
      if (!spot.apart) { wrong.push(`${JSON.stringify(body)} feet ${feet}`); continue; }
      // Checked again here, not by buddySpot's own rule: nothing he covers within a pixel of it.
      for (const [x, y] of spot.cells) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (room[y + dy]?.[x + dx]) wrong.push(`${JSON.stringify(body)} touches at ${x},${y}`);
      }
    }
    expect(wrong).toEqual([]);
  }, 60_000);

  it('use a light, a mid and a dark tone of their own, so they read on light and dark guys alike', () => {
    const lum = (hex: string) => {
      const c = (i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
      return 0.2126 * c(0) + 0.7152 * c(1) + 0.0722 * c(2);
    };
    for (const b of buddies) {
      const used = [...new Set(b.art!.flat().filter(t => t >= 101).map(t => b.colors[t - 101]))].map(lum);
      expect(Math.max(...used) - Math.min(...used)).toBeGreaterThan(0.2);
    }
  });

  it('are different drawings, one from another', () => {
    const seen = new Set(buddies.map(b => JSON.stringify(b.art)));
    expect(seen.size).toBe(buddies.length);
  });
});

describe('dress', () => {
  it('puts on the game\'s free hat', () => {
    expect(dress(resolve('alice'), { game: 'puttsies' }).hat).toBe(freeItem('puttsies').id);
  });

  it('lets equipped items win, one per slot, and ignores unknown ids', () => {
    const d = dress(resolve('alice'), { game: 'puttsies', equip: ['puttsies.flag', 'puttsies.ball', 'nope', 'trackdle.flag'] });
    expect([d.hat, d.skin, d.frame]).toEqual(['puttsies.flag', 'puttsies.ball', 'trackdle.flag']);
  });

  it('leaves an undressed guy exactly as he was', () => {
    expect(toSvgString('alice', {})).toBe(toSvgString('alice', { equip: [] }));
    expect(itemById(undefined)).toBeUndefined();
  });

  it('draws the same dressed guy every time', () => {
    const opts = { game: 'trackdle' as const, equip: ['trackdle.racer~gold~0.0100000~7', 'trackdle.flag'] };
    expect(toSvgString('kai', opts)).toBe(toSvgString('kai', opts));
  });
});
