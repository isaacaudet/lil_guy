import { RETIRED_EYES } from '../parts/weights';
import { describe, expect, it } from 'bun:test';
import { compose, ARM_STYLES, FOOT_STYLES } from '../compose';
import { heads, eyes, mouths, cheeks, hair, bodies, accessories } from '../parts';
import { T } from '../parts/art';
import type { AvatarConfig, PixelGrid } from '../types';
import { GRID_SIZE } from '../types';

const BASE: AvatarConfig = {
  head: 0, eyes: 0, mouth: 0, cheeks: 0, hair: 0, body: 0, accessory: 0,
  arms: 0, feet: 0, palette: 0, shade: 1, flip: false, rotation: 0,
};

const guy = (parts: Partial<AvatarConfig>) => compose({ ...BASE, ...parts });
const ROOMY = ['round', 'mochi', 'egg', 'gumdrop', 'onigiri', 'ghost', 'slime', 'loaf', 'cloud', 'pill', 'chonk', 'block', 'tower'];

/** Number of 4-connected pieces the drawing falls into. */
function pieces(grid: PixelGrid): number {
  const seen = grid.map(row => row.map(() => false));
  let count = 0;
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (!grid[y][x] || seen[y][x]) continue;
      count++;
      const stack = [[x, y]];
      seen[y][x] = true;
      while (stack.length) {
        const [cx, cy] = stack.pop()!;
        for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
          if (nx < 0 || ny < 0 || nx >= GRID_SIZE || ny >= GRID_SIZE) continue;
          if (!grid[ny][nx] || seen[ny][nx]) continue;
          seen[ny][nx] = true;
          stack.push([nx, ny]);
        }
      }
    }
  }
  return count;
}

/** Cells that are filled but sit on the grid edge, so their outline was cut off. */
function clipped(grid: PixelGrid): string[] {
  const out: string[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const v = grid[y][x];
      if (!v || v === T.OUTLINE) continue;
      if (x === 0 || y === 0 || x === GRID_SIZE - 1 || y === GRID_SIZE - 1) out.push(`(${x},${y})`);
    }
  }
  return out;
}

/** Every combination of the parts that change a guy's outline. */
function* silhouettes() {
  for (let head = 0; head < heads.length; head++)
    for (let h = 0; h < hair.length; h++)
      for (let accessory = 0; accessory < accessories.length; accessory++)
        for (let arms = 0; arms < ARM_STYLES.length; arms++)
          for (let feet = 0; feet < FOOT_STYLES.length; feet++)
            yield { head, hair: h, accessory, arms, feet };
}

describe('compose', () => {
  it('returns a 16x16 grid of known tokens', () => {
    const grid = guy({ hair: 1, body: 1, accessory: 1, arms: 1 });
    expect(grid.length).toBe(GRID_SIZE);
    for (const row of grid) {
      expect(row.length).toBe(GRID_SIZE);
      for (const cell of row) expect(cell >= 0 && cell <= T.DEEP).toBe(true);
    }
  });

  it('outlines every guy completely, inside the frame', () => {
    // A part that runs to the edge of the grid loses its outline there, which
    // is exactly the half-finished look this version exists to get rid of.
    const wrong: string[] = [];
    for (const parts of silhouettes()) {
      const cells = clipped(guy(parts));
      if (cells.length) wrong.push(`${JSON.stringify(parts)} ${cells.join(' ')}`);
    }
    expect(wrong).toEqual([]);
  }, 60_000);

  it('keeps every guy in one piece', () => {
    const wrong: string[] = [];
    for (const parts of silhouettes()) {
      const n = pieces(guy(parts));
      if (n !== 1) wrong.push(`${JSON.stringify(parts)} has ${n} pieces`);
    }
    expect(wrong).toEqual([]);
  }, 300_000);

  it('draws every eye and mouth in full, on every head, under every hat', () => {
    // The face is the whole character. If a narrow head or a low hat clips a
    // single pixel of it, the expression changes.
    const wrong: string[] = [];
    for (let head = 0; head < heads.length; head++) {
      for (let h = 0; h < hair.length; h++) {
        for (let e = 0; e < eyes.length; e++) {
          if (RETIRED_EYES.includes(e)) continue;
          const used = new Set(eyes[e].art.flat().filter(Boolean));
          const inked = (g: PixelGrid) => g.flat().filter(v => used.has(v)).length;
          const drawn = inked(guy({ head, hair: h, eyes: e, mouth: 1 }));
          const art = eyes[e].art.flat().filter(Boolean).length;
          // Hats may add their own white or red pixels, never take the eye's.
          if (drawn < art) wrong.push(`${heads[head].name} + ${hair[h].name} clips ${eyes[e].name}`);
        }
        for (let m = 0; m < mouths.length; m++) {
          const g = guy({ head, hair: h, mouth: m });
          const usedM = new Set(mouths[m].art.flat().filter(Boolean));
          const drawn = g.flat().filter(v => usedM.has(v)).length;
          const art = mouths[m].art.flat().filter(Boolean).length;
          if (drawn < art) wrong.push(`${heads[head].name} + ${hair[h].name} clips ${mouths[m].name}`);
        }
      }
    }
    expect(wrong).toEqual([]);
  }, 60_000);

  it('keeps the mouth off the eyes wherever the head has room', () => {
    // A mouth pixel right under an eye pixel joins them into one shape (an H, a box).
    const wrong: string[] = [];
    for (let head = 0; head < heads.length; head++) for (let e = 0; e < eyes.length; e++) for (let m = 0; m < mouths.length; m++) {
      if (RETIRED_EYES.includes(e)) continue;
      const g = guy({ head, eyes: e, mouth: m });
      // Eye pixels are the ink and shine on or above the eye line (a mouth's teeth are white too).
      const eye = (t: number, y: number) => (t === T.EYE || t === T.WHITE) && y <= heads[head].eyes;
      const touching = g.some((row, y) => row.some((t, x) => eye(t, y) && g[y + 1]?.[x] === T.MOUTH));
      // The everyday heads all have the room; a heart's point or a bat's wings may not.
      if (touching && ROOMY.includes(heads[head].name)) wrong.push(`${heads[head].name}: ${eyes[e].name} + ${mouths[m].name}`);
    }
    expect(wrong).toEqual([]);
  }, 60_000);

  it('never lets something worn cover the mouth', () => {
    const wrong: string[] = [];
    for (let head = 0; head < heads.length; head++) {
      for (let m = 0; m < mouths.length; m++) {
        const bare = guy({ head, mouth: m });
        for (let a = 0; a < accessories.length; a++) {
          const worn = guy({ head, mouth: m, accessory: a });
          for (let y = 0; y < GRID_SIZE; y++) for (let x = 0; x < GRID_SIZE; x++) {
            const v = bare[y][x];
            if ((v === T.MOUTH || v === T.TONGUE) && worn[y][x] !== v) {
              wrong.push(`${accessories[a].name} covers ${mouths[m].name} on ${heads[head].name}`);
            }
          }
        }
      }
    }
    expect([...new Set(wrong)]).toEqual([]);
  });

  it('keeps markings on the body', () => {
    for (let head = 0; head < heads.length; head++) {
      const plain = guy({ head });
      for (let b = 0; b < bodies.length; b++) {
        const marked = guy({ head, body: b });
        for (let y = 0; y < GRID_SIZE; y++) for (let x = 0; x < GRID_SIZE; x++) {
          expect(Boolean(marked[y][x])).toBe(Boolean(plain[y][x]));
        }
      }
    }
  });

  it('draws cheeks only on the face', () => {
    for (let head = 0; head < heads.length; head++) {
      const bare = guy({ head });
      for (let c = 0; c < cheeks.length; c++) {
        const g = guy({ head, cheeks: c });
        for (let y = 0; y < GRID_SIZE; y++) for (let x = 0; x < GRID_SIZE; x++) {
          expect(Boolean(g[y][x])).toBe(Boolean(bare[y][x]));
        }
      }
    }
  });

  it('mirrors the finished guy when flipped', () => {
    const parts = { head: 6, hair: 10, eyes: 4, mouth: 7, arms: 2 };
    const plain = guy(parts);
    const flipped = guy({ ...parts, flip: true });
    expect(flipped).toEqual(plain.map(row => [...row].reverse()));
  });
});
