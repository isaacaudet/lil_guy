// Every modifier (topper, accessory, cheeks, markings, hat, buddy) on every head: lists what floats free,
// is cut at the grid's edge, splits into pieces or barely shows, for a person to look at. Not a test:
// small things (an antenna, a medal) show few pixels on purpose, and outline-coloured parts read as gaps.
//   bun scripts/fit-check.ts
import { compose } from '../src/compose';
import { heads, eyes, mouths, hair, accessories, cheeks, bodies } from '../src/parts';
import { items } from '../src/items';
import { T } from '../src/parts/art';
const base: any = { head: 0, eyes: 0, mouth: 0, cheeks: 0, hair: 0, body: 0, accessory: 0, arms: 0, feet: 0, shade: 1, flip: false, lucky: false, palette: 0 };
const N = 16;
type Case = { kind: string; name: string; change: any };
const cases: Case[] = [
  ...hair.map((h: any, i: number) => ({ kind: 'topper', name: h.name, change: { hair: i } })).slice(1),
  ...accessories.map((a: any, i: number) => ({ kind: 'accessory', name: a.name, change: { accessory: i } })).slice(1),
  ...cheeks.map((a: any, i: number) => ({ kind: 'cheeks', name: a.name, change: { cheeks: i } })).slice(1),
  ...bodies.map((a: any, i: number) => ({ kind: 'markings', name: a.name, change: { body: i } })).slice(1),
  ...items.filter((i: any) => ['hat', 'buddy', 'frame'].includes(i.slot) && !i.season).map((it: any) => ({ kind: it.slot, name: it.name, change: { [it.slot]: it.id } })),
];
const issues: Record<string, string[]> = {};
const flag = (k: string, s: string) => (issues[k] ??= []).push(s);
for (const c of cases) for (let h = 0; h < heads.length; h++) {
  const cfg = { ...base, head: h };
  const bare = compose(cfg), g = compose({ ...cfg, ...c.change });
  const diff: [number, number][] = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g[y][x] !== bare[y][x] && g[y][x] !== 0 && g[y][x] !== T.OUTLINE) diff.push([x, y]);
  const tag = `${c.kind}: ${c.name} on ${heads[h].name}`;
  if (c.kind === 'frame') continue;
  if (c.kind !== 'markings' && c.kind !== 'cheeks' && diff.length < 5) { flag('barely shows', `${tag} (${diff.length})`); continue; }
  if (diff.some(([x, y]) => x === 0 || x === N - 1 || y === 0)) flag('cut at the edge', tag);
  // Islands of the new pixels (8-connected), and whether each touches what was already there.
  const set = new Set(diff.map(([x, y]) => y * N + x)), seen = new Set<number>();
  let islands = 0, floating = 0;
  for (const [x0, y0] of diff) {
    const k0 = y0 * N + x0; if (seen.has(k0)) continue;
    islands++; let touches = false; const stack = [[x0, y0]]; seen.add(k0);
    while (stack.length) {
      const [x, y] = stack.pop()!;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
        const k = ny * N + nx;
        if (set.has(k)) { if (!seen.has(k)) { seen.add(k); stack.push([nx, ny]); } }
        else if (g[ny][nx] && g[ny][nx] !== T.OUTLINE) touches = true;
      }
    }
    if (!touches) floating++;
  }
  if (floating) flag('floats', tag);
  if (islands > (c.kind === 'markings' || c.kind === 'cheeks' || c.kind === 'accessory' ? 99 : 2)) flag('splits', `${tag} (${islands})`);
}
for (const [k, v] of Object.entries(issues)) { console.log(`\n## ${k}: ${v.length}`); const by: Record<string, number> = {}; v.forEach(s => { const m = s.split(' on ')[0]; by[m] = (by[m] || 0) + 1; }); console.log(Object.entries(by).sort((a, b) => b[1] - a[1]).map(([m, n]) => `${m} ×${n}`).join('\n')); }

