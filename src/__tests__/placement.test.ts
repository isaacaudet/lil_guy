import { describe, expect, it } from 'bun:test';
import { compose } from '../compose';
import { heads, eyes, mouths, hair, bodies, accessories, headMetrics } from '../parts';
import type { AvatarConfig, PixelGrid } from '../types';
import { GRID_SIZE } from '../types';

const NEIGHBOURS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]] as const;

/**
 * Number of 8-connected islands of non-transparent pixels. Diagonal touching
 * counts — that is how pixel art reads.
 */
function islandCount(grid: PixelGrid): number {
  const seen = grid.map(row => row.map(() => false));
  let islands = 0;

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (grid[y][x] === 0 || seen[y][x]) continue;
      islands++;
      const stack: [number, number][] = [[y, x]];
      seen[y][x] = true;
      while (stack.length > 0) {
        const [cy, cx] = stack.pop()!;
        for (const [dy, dx] of NEIGHBOURS) {
          const ny = cy + dy;
          const nx = cx + dx;
          if (ny < 0 || ny >= GRID_SIZE || nx < 0 || nx >= GRID_SIZE) continue;
          if (grid[ny][nx] === 0 || seen[ny][nx]) continue;
          seen[ny][nx] = true;
          stack.push([ny, nx]);
        }
      }
    }
  }

  return islands;
}

const base: AvatarConfig = {
  head: 0, eyes: 0, mouth: 0, hair: 0, body: 0, accessory: 0,
  palette: 0, rotation: 0, flip: false,
};

/**
 * Walks every combination of the given slots and returns the ones that fail.
 *
 * Collecting first and asserting once matters: an `expect` per combination is
 * millions of assertions over a library this size, which took the sweep from
 * well under a second to over nine.
 */
function sweep(
  slots: Partial<Record<keyof AvatarConfig, number>>,
  check: (grid: PixelGrid, config: AvatarConfig) => string | null
): string[] {
  const keys = Object.keys(slots) as (keyof AvatarConfig)[];
  const failures: string[] = [];
  const config = { ...base };

  const walk = (i: number) => {
    if (i === keys.length) {
      const problem = check(compose(config), config);
      if (problem) failures.push(`${keys.map(k => `${k}${config[k]}`).join(' ')}: ${problem}`);
      return;
    }
    for (let v = 0; v < slots[keys[i]]!; v++) {
      (config as Record<string, unknown>)[keys[i]] = v;
      walk(i + 1);
    }
    (config as Record<string, unknown>)[keys[i]] = 0;
  };

  walk(0);
  return failures;
}

describe('head metrics', () => {
  it('measures a crown at or below the top, and a bottom below that', () => {
    const wrong = headMetrics
      .map((m, i) =>
        m.top >= 0 && m.crown >= m.top && m.bottom > m.crown ? null : `heads[${i}] ${JSON.stringify(m)}`
      )
      .filter(Boolean);
    expect(wrong).toEqual([]);
  });

  it('puts the crown and bottom on unbroken rows', () => {
    const wrong: string[] = [];
    headMetrics.forEach((m, i) => {
      for (const y of [m.crown, m.bottom]) {
        const row = heads[i][y];
        const left = row.findIndex(v => v !== 0);
        const right = row.length - 1 - [...row].reverse().findIndex(v => v !== 0);
        for (let x = left; x <= right; x++) {
          if (row[x] === 0) wrong.push(`heads[${i}] row ${y} is broken at col ${x}`);
        }
      }
    });
    expect(wrong).toEqual([]);
  });
});

describe('nothing floats', () => {
  it('keeps every head + topper + accessory in one piece', () => {
    const failures = sweep(
      { head: heads.length, hair: hair.length, accessory: accessories.length },
      grid => {
        const n = islandCount(grid);
        return n === 1 ? null : `${n} islands`;
      }
    );
    expect(failures).toEqual([]);
  });

  it('keeps every head + pattern + eyes + mouth in one piece', () => {
    const failures = sweep(
      { head: heads.length, body: bodies.length, eyes: eyes.length, mouth: mouths.length },
      grid => {
        const n = islandCount(grid);
        return n === 1 ? null : `${n} islands`;
      }
    );
    expect(failures).toEqual([]);
  }, 30_000);

  it('never draws an eye or a mouth outside the head silhouette', () => {
    const faceTokens = new Set([6, 7, 8]);
    const failures = sweep(
      { head: heads.length, eyes: eyes.length, mouth: mouths.length },
      (grid, config) => {
        for (let y = 0; y < GRID_SIZE; y++) {
          for (let x = 0; x < GRID_SIZE; x++) {
            if (faceTokens.has(grid[y][x]) && heads[config.head][y][x] === 0) {
              return `face pixel at (${x},${y}) is off the body`;
            }
          }
        }
        return null;
      }
    );
    expect(failures).toEqual([]);
  });

  it('keeps every head + foot style in one piece', () => {
    const { FOOT_STYLES } = require('../compose');
    const failures = sweep(
      { head: heads.length, feet: FOOT_STYLES.length, body: bodies.length },
      grid => {
        const n = islandCount(grid);
        return n === 1 ? null : `${n} islands`;
      }
    );
    expect(failures).toEqual([]);
  });

  it('never lets a generated foot stick out past the body it hangs from', () => {
    // Drawn feet are exempt: a couple of the originals flare slightly wider
    // than the last body row on purpose. So the exemption has to be "these are
    // the feet the head was drawn with", not "style 0" — a style too wide for
    // the base falls back to the drawn feet, and so reaches this exemption
    // under a non-zero style.
    const { FOOT_STYLES } = require('../compose');
    const failures = sweep({ head: heads.length, feet: FOOT_STYLES.length }, (grid, config) => {
      if (config.feet === 0) return null;
      const m = headMetrics[config.head];
      const asDrawn = JSON.stringify(heads[config.head].slice(m.bottom + 1));
      if (JSON.stringify(grid.slice(m.bottom + 1)) === asDrawn) return null;
      const base = m.rows[m.bottom]!;
      for (let y = m.bottom + 1; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          if (grid[y][x] && (x < base.left || x > base.right)) {
            return `foot pixel at (${x},${y}) is wider than the body above it`;
          }
        }
      }
      return null;
    });
    expect(failures).toEqual([]);
  });

  it('leaves every guy standing on feet', () => {
    // applyFeet cleared the drawn feet before checking whether the requested
    // style fitted the base, so a style that did not fit left nothing behind
    // and the guy floated on a flat edge. Every head is drawn with feet, so
    // every combination has to end up with some.
    //
    // Swept over bodies, not accessories: the chin and chest pieces can still
    // land on the feet of the shortest heads, where there is no room between
    // the mouth and the floor for them to go. That one needs the art moved,
    // not the placement code, so it is out of scope for this guard.
    const { FOOT_STYLES } = require('../compose');
    const failures = sweep(
      { head: heads.length, feet: FOOT_STYLES.length, body: bodies.length },
      grid => {
        let bottom = -1;
        for (let y = 0; y < GRID_SIZE; y++) if (grid[y].some(v => v)) bottom = y;
        if (bottom < 0) return 'nothing drawn at all';
        // Feet read as separated runs on the last row — a single unbroken run
        // is a flat edge, which is the symptom this guards.
        let runs = 0;
        let inRun = false;
        for (let x = 0; x < GRID_SIZE; x++) {
          const on = grid[bottom][x] !== 0;
          if (on && !inRun) runs++;
          inRun = on;
        }
        return runs >= 2 ? null : 'stands on a flat edge, with no feet';
      }
    );
    expect(failures).toEqual([]);
  });

  it('draws every part on every head', () => {
    // A topper whose lowest row sits above the crown has no head under it to
    // measure. mergeTopper used to bail in that case, which silently dropped
    // the tuft on three quarters of the heads — visible only by eye.
    const bare = heads.map((_h, head) => JSON.stringify(compose({ ...base, head })));
    const failures: string[] = [];
    for (const [slot, parts] of [['hair', hair], ['accessory', accessories], ['body', bodies]] as const) {
      for (let i = 1; i < parts.length; i++) {
        for (let head = 0; head < heads.length; head++) {
          const grid = JSON.stringify(compose({ ...base, head, [slot]: i }));
          if (grid === bare[head]) failures.push(`${slot}[${i}] draws nothing on heads[${head}]`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it('never seats a topper on the eyes', () => {
    // A head that wears ears or horns above its main mass has a crown one row
    // lower, and the shift that followed from it dropped the brim of every hat
    // straight onto the eye row. `bow` and `heartPin` are exempt: they are
    // `edge` parts, authored to ride the side of the head beside the eye.
    const { hairPlacements } = require('../parts/hair');
    const failures: string[] = [];
    for (let head = 0; head < heads.length; head++) {
      for (let topper = 0; topper < hair.length; topper++) {
        if (hairPlacements[topper] === 'edge') continue;
        for (let eye = 0; eye < eyes.length; eye++) {
          const bare = compose({ ...base, head, eyes: eye });
          const worn = compose({ ...base, head, eyes: eye, hair: topper });
          for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
              if ((bare[y][x] === 6 || bare[y][x] === 7) && worn[y][x] !== bare[y][x]) {
                failures.push(`hair[${topper}] covers eyes[${eye}] on heads[${head}] at (${x},${y})`);
              }
            }
          }
        }
      }
    }
    expect(failures).toEqual([]);
  }, 30_000);

  it('never lets an accessory paint over the mouth', () => {
    // A scarf reached the mouth on a quarter of all head-and-mouth pairings and
    // simply erased it; four other chest pieces did the same on forty each.
    // The outfit is not allowed to take the expression with it.
    const mouthPixels = (grid: PixelGrid) => {
      let n = 0;
      for (let y = 0; y < GRID_SIZE; y++) for (let x = 0; x < GRID_SIZE; x++) if (grid[y][x] === 8) n++;
      return n;
    };
    const failures: string[] = [];
    for (let head = 0; head < heads.length; head++) {
      for (let mouth = 0; mouth < mouths.length; mouth++) {
        const bare = mouthPixels(compose({ ...base, head, mouth }));
        if (bare === 0) continue;
        for (let accessory = 0; accessory < accessories.length; accessory++) {
          const worn = mouthPixels(compose({ ...base, head, mouth, accessory }));
          if (worn < bare) {
            failures.push(`accessories[${accessory}] eats mouths[${mouth}] on heads[${head}] (${bare} -> ${worn})`);
          }
        }
      }
    }
    expect(failures).toEqual([]);
  }, 30_000);

  it('mirrors cleanly — a flipped guy is still one piece', () => {
    const failures = sweep(
      { head: heads.length, hair: hair.length, accessory: accessories.length },
      (_grid, config) => {
        const n = islandCount(compose({ ...config, flip: true }));
        return n === 1 ? null : `${n} islands when flipped`;
      }
    );
    expect(failures).toEqual([]);
  });
});
