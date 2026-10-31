import { test, expect, setSystemTime } from 'bun:test';
import { AURAS, DEAL_PREFIX, EFFECTS, FINISHES, FX_IDS, GAMES, copyOneIn, encode, gradeOf, GRADES, guyRank, guyScore, items, resolve, roll, slotOf, special, traitOdds, visibleOneIn, itemById, type Owned } from '../src/index-headless.ts';
import { GUY_RANK } from '../src/guy-rank.ts';
import { eyeWeights, hairWeights } from '../src/parts/weights.ts';
import { copyFigures, copyProbes, copyRules, guyFigures, guyProbes, guyRules, ruleOf, BACKLOG, FILL, TOP } from './top.js';
import { api } from './index.js';
import { callWith, claim, makeEnv } from './test-env.ts';

const DAY = 864e5;
const seedOf = (i: number) => DEAL_PREFIX + (i * 7919 + 13).toString(36).padStart(12, '0');
// A claimed guy put straight in the database, claimed `i` minutes into the day.
const guy = (env: any, key: string, seed: string, i: number) => {
  const at = new Date(Date.UTC(2026, 9, 30, 0, i)).toISOString();
  env.db.prepare('INSERT INTO names(key, seed, owner, at) VALUES (?, ?, ?, ?)').run(key, seed, 'x', at);
  env.db.prepare('INSERT INTO players(key, guy_one_in, at) VALUES (?, 0, ?)').run(key, at);
  return at;
};
// A copy put straight in the database.
const copy = (env: any, key: string, o: Owned, { source = 'capsule', at = new Date().toISOString(), pull = 0 } = {}) => {
  const item = itemById(o.item)!;
  return Number(env.db.prepare(`INSERT INTO copies(key, code, item, game, slot, finish, grade, one_in, scuff, source, worn, at, pull) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 0, ?, ?)`)
    .run(key, encode(o), o.item, item.game, slotOf(o), o.finish, GRADES.findIndex(g => g.id === gradeOf(o).id), o.scuff, source, at, pull).lastInsertRowid);
};
const rolls = (n: number) => Array.from({ length: n }, (_, i) => roll(`top-test-${i}`, GAMES[i % GAMES.length]));
const rarer = (a: any, b: any) => visibleOneIn(b.o) - visibleOneIn(a.o) || a.o.scuff - b.o.scuff || a.id - b.id;

test('the Top 100 guys: rarest by rank, the founder first, a tie to the earlier claim, and since when each holds its place', async () => {
  const env = makeEnv(), call = callWith(env);
  await claim(env, 'isaac');
  const ats = new Map<string, string>([['isaac', env.db.query("SELECT at FROM names WHERE key = 'isaac'").get().at]]);
  for (let i = 0; i < 30; i++) ats.set(`g${i}`, guy(env, `g${i}`, seedOf(i), i));
  env.db.exec("UPDATE players SET look = '2:p0' WHERE key = 'g3'");
  const r = await call('/top?kind=guys');
  expect(r.status).toBe(200);
  expect(r.headers.get('cache-control')).toBe('public, max-age=60');
  const { guys }: any = await r.json();
  expect(guys).toHaveLength(31);
  expect(Object.keys(guys[0]).sort()).toEqual(['key', 'look', 'place', 'seed', 'since', 'top']);
  expect(guys[0]).toMatchObject({ place: 1, key: 'isaac', top: 0 });
  // Everyone else in rank order, the earlier claim first on a tie.
  const want = [...ats.keys()].filter(k => k !== 'isaac').map(k => ({ k, top: guyRank(resolve(seedOf(Number(k.slice(1))))).top, at: ats.get(k)! }))
    .sort((a, b) => a.top - b.top || a.at.localeCompare(b.at));
  expect(guys.slice(1).map((g: any) => g.key)).toEqual(want.map(w => w.k));
  expect(guys.map((g: any) => g.place)).toEqual(guys.map((_: any, i: number) => i + 1));
  expect(guys.find((g: any) => g.key === 'g3').look).toBe('2:p0');
  // Each has held its place since the latest claim among it and everyone above it.
  let since = '';
  for (const g of guys) { if (ats.get(g.key)! > since) since = ats.get(g.key)!; expect(g.since).toBe(since); }
  // The ranks are kept, so the next read sorts in the database and says the same.
  expect(env.db.query('SELECT COUNT(*) AS n FROM players WHERE top_rule = ?').get(guyRules()).n).toBe(31);
  expect(((await (await call('/top?kind=guys')).json()) as any).guys).toEqual(guys);
});

test('only the 100 rarest guys; a kept rank is trusted under the same rules and worked out again under others', async () => {
  const env = makeEnv(), call = callWith(env);
  for (let i = 0; i < TOP + 20; i++) guy(env, `g${i}`, seedOf(i), i);
  const first: any = await (await call('/top?kind=guys')).json();
  expect(first.guys).toHaveLength(TOP);
  const last = first.guys[TOP - 1].key, out = (await (await call('/top?kind=guys')).json() as any).guys;
  expect(out).toEqual(first.guys);
  // A rank kept under today's rules is what the board sorts by.
  env.db.prepare('UPDATE players SET guy_top = 0.0000001 WHERE key = ?').run(last);
  expect(((await (await call('/top?kind=guys')).json()) as any).guys[0].key).toBe(last);
  // One kept under other rules (the library changed) is worked out again and written back.
  env.db.prepare('UPDATE players SET top_rule = 7 WHERE key = ?').run(last);
  expect(((await (await call('/top?kind=guys')).json()) as any).guys).toEqual(first.guys);
  expect(env.db.query('SELECT top_rule FROM players WHERE key = ?').get(last).top_rule).toBe(guyRules());
});

test('a pick puts the picked guy on the board at its own rank, though the board had kept the dealt one', async () => {
  const env = makeEnv(), call = callWith(env), h = await claim(env, 'mia');
  const { pick }: any = await (await call('/me/mia/state', 'GET', undefined, h)).json();
  const dealt = env.db.query("SELECT seed FROM names WHERE key = 'mia'").get().seed;
  const mia = async () => ((await (await call('/top?kind=guys')).json()) as any).guys.find((g: any) => g.key === 'mia');
  // The board reads the new name inside its pick hour and keeps the dealt guy's rank.
  expect(await mia()).toMatchObject({ seed: dealt, top: guyRank(resolve(dealt)).top });
  expect(env.db.query("SELECT top_seed FROM players WHERE key = 'mia'").get().top_seed).toBe(dealt);
  const other = pick.choices.find((c: string) => guyRank(resolve(c)).top !== guyRank(resolve(dealt)).top);
  expect((await call('/me/mia/pick', 'POST', { seed: other }, h)).status).toBe(200);
  expect(await mia()).toMatchObject({ seed: other, top: guyRank(resolve(other)).top });
  expect(env.db.query("SELECT guy_top, top_rule, top_seed FROM players WHERE key = 'mia'").get())
    .toEqual({ guy_top: guyRank(resolve(other)).top, top_rule: guyRules(), top_seed: other });
});

// A database whose reads matching `part` fail, as D1 does now and then.
const flaky = (env: any, part: string) => {
  const prepare = env.DB.prepare;
  env.DB.prepare = (sql: string) => { const statement = prepare(sql); if (sql.includes(part)) statement.all = async () => { throw new Error('D1 went away'); }; return statement; };
};

test('a board read that fails partway is worked out in full, each guy and copy once', async () => {
  const env = makeEnv(), call = callWith(env);
  for (let i = 0; i < 12; i++) guy(env, `g${i}`, seedOf(i), i);
  rolls(20).forEach(o => copy(env, 'g1', o));
  const guys: any = await (await call('/top?kind=guys')).json(), copies: any = await (await call('/top?kind=copies')).json();
  // Everything is kept now, so the first query answers every row; the second fails.
  flaky(env, 'top_seed IS NOT');
  flaky(env, 'seen_rule < ?');
  expect(await (await call('/top?kind=guys')).json()).toEqual(guys);
  expect(await (await call('/top?kind=copies')).json()).toEqual(copies);
  expect(guys.guys).toHaveLength(12);
  expect(copies.copies).toHaveLength(20);
});

test('a backlog of guys is written back a few hundred at a time, and the board is right while it clears', async () => {
  const env = makeEnv(), call = callWith(env);
  for (let i = 0; i < FILL.guys + 30; i++) guy(env, `g${i}`, seedOf(i), i);
  const one: any = await (await call('/top?kind=guys')).json();
  expect(env.db.query('SELECT COUNT(*) AS n FROM players WHERE top_rule = ?').get(guyRules()).n).toBe(FILL.guys);
  const two: any = await (await call('/top?kind=guys')).json();
  expect(env.db.query('SELECT COUNT(*) AS n FROM players WHERE top_rule = ?').get(guyRules()).n).toBe(FILL.guys + 30);
  expect(two.guys).toEqual(one.guys);
});

test('before migration 0013 the guys board is worked out in full and works the same', async () => {
  const before = makeEnv('0012_pins.sql'), after = makeEnv();
  for (const env of [before, after]) for (let i = 0; i < 12; i++) guy(env, `g${i}`, seedOf(i), i);
  const a: any = await (await callWith(before)('/top?kind=guys')).json();
  const b: any = await (await callWith(after)('/top?kind=guys')).json();
  expect(a.guys).toEqual(b.guys);
  expect(a.guys).toHaveLength(12);
});

test('the Top 100 copies: by what the eye can see, no starters, nothing the founder still holds, each with its number', async () => {
  const env = makeEnv(), call = callWith(env);
  for (const k of ['isaac', 'mia', 'bo']) guy(env, k, seedOf(k.length), 0);
  const made = rolls(40).map((o, i) => ({ o, id: copy(env, i % 2 ? 'mia' : 'bo', o, { pull: i % 5 ? i + 1 : 0 }) }));
  // Rarer than anything rolled: an aura, held back by the founder, then given away.
  const aura: Owned = { item: 'aura.flames', finish: 'pearl', scuff: 0.2, print: 7 };
  const held = copy(env, 'isaac', aura);
  const starter = copy(env, 'mia', { ...aura, scuff: 0.1 }, { source: 'starter' });
  const r = await call('/top?kind=copies');
  expect(r.status).toBe(200);
  const { copies }: any = await r.json();
  expect(Object.keys(copies[0]).sort()).toEqual(['at', 'code', 'id', 'key', 'no', 'place']);
  expect(copies.map((c: any) => c.id)).toEqual(made.sort(rarer).map(m => m.id));
  expect(copies.some((c: any) => c.id === held || c.id === starter)).toBe(false);
  // Its number in its item's run, or null for one that has none.
  const pulls = new Map(env.db.query('SELECT id, pull FROM copies').all().map((c: any) => [c.id, c.pull || null]));
  expect(copies.every((c: any) => c.no === pulls.get(c.id))).toBe(true);
  expect(copies.some((c: any) => c.no === null) && copies.some((c: any) => c.no > 0)).toBe(true);
  // Every copy is worked out and kept, starters and the founder's too, so none waits to be counted again.
  expect(env.db.query('SELECT COUNT(*) AS n FROM copies WHERE seen_rule = ?').get(copyRules()).n).toBe(42);
  expect(((await (await call('/top?kind=copies')).json()) as any).copies).toEqual(copies);
  // Given away, the founder's aura joins the board.
  env.db.prepare("UPDATE copies SET key = 'bo' WHERE id = ?").run(held);
  const after: any = await (await call('/top?kind=copies')).json();
  expect(after.copies.map((c: any) => c.id)).toEqual([...made, { o: aura, id: held }].sort(rarer).map(m => m.id));
  expect(after.copies.find((c: any) => c.id === held)).toMatchObject({ key: 'bo', code: encode(aura), no: null });
  // Kept odds are trusted under the same rules and worked out again under others.
  const lastId = after.copies.at(-1).id;
  env.db.prepare('UPDATE copies SET seen_in = 1e30 WHERE id = ?').run(lastId);
  expect(((await (await call('/top?kind=copies')).json()) as any).copies[0].id).toBe(lastId);
  env.db.prepare('UPDATE copies SET seen_rule = 7 WHERE id = ?').run(lastId);
  expect(((await (await call('/top?kind=copies')).json()) as any).copies).toEqual(after.copies);
});

test('only the 100 rarest copies; before migration 0013 they are worked out in full and work the same', async () => {
  const before = makeEnv('0012_pins.sql'), after = makeEnv();
  for (const env of [before, after]) { guy(env, 'mia', seedOf(1), 0); rolls(TOP + 15).forEach(o => copy(env, 'mia', o, { at: '2026-10-30T12:00:00.000Z' })); }
  const a: any = await (await callWith(before)('/top?kind=copies')).json();
  const b: any = await (await callWith(after)('/top?kind=copies')).json();
  expect(a.copies).toHaveLength(TOP);
  expect(a.copies).toEqual(b.copies);
});

test('the boards ask for a kind', async () => {
  const call = callWith(makeEnv());
  expect((await call('/top')).status).toBe(400);
  expect((await call('/top?kind=names')).status).toBe(400);
  expect((await call('/top?kind=guys', 'POST')).status).toBe(404);
});

test('the rules a figure was worked out under are a number that changes with the figures, never 0', () => {
  expect(ruleOf([1, 2, 3])).toBe(ruleOf([1, 2, 3]));
  expect(ruleOf([1, 2, 3])).not.toBe(ruleOf([1, 2, 4]));
  expect(guyRules()).toBeGreaterThan(0);
  expect(copyRules()).toBeGreaterThan(0);
  expect(guyRules()).toBe(ruleOf(guyFigures()));
  expect(copyRules()).toBe(ruleOf(copyFigures()));
});

test('the guy probes reach every step of the rank table, past its end, and both sides of the chase line', () => {
  const guys = guyProbes(), dealt = guys.filter(g => !g.founder), scores = dealt.map(guyScore);
  expect(guys.some(g => g.founder)).toBe(true);
  // The table's first point is the commonest guy's own score, so every step above it.
  for (let i = 1; i < GUY_RANK.length; i++) expect(scores.some(v => v > GUY_RANK[i - 1][0] && v <= GUY_RANK[i][0])).toBe(true);
  expect(scores.some(v => v > GUY_RANK[GUY_RANK.length - 1][0])).toBe(true);
  // A chase part (rarer than 1 in 200) decides many of them; others sit just above the line.
  const rarest = (g: any) => Math.min(...traitOdds(g).map(t => t.chance));
  expect(dealt.filter(g => rarest(g) < 0.005 && guyRank(g).top === rarest(g) * 3).length).toBeGreaterThan(50);
  expect(dealt.some(g => rarest(g) >= 0.005 && rarest(g) < 0.01)).toBe(true);
  expect(dealt.some(g => g.lucky)).toBe(true);
});

test('the copy probes take in every item, finish, effect and famous print, on items and on auras', () => {
  const copies = copyProbes();
  expect(new Set(copies.map(o => o.item))).toEqual(new Set(items.map(i => i.id)));
  for (const finish of Object.keys(FINISHES)) expect(copies.filter(o => o.finish === finish && itemById(o.item)!.slot !== 'aura').length).toBeGreaterThan(0);
  for (const finish of Object.keys(FINISHES)) expect(copies.filter(o => o.finish === finish && itemById(o.item)!.slot === 'aura').length).toBeGreaterThan(0);
  for (const fx of FX_IDS) expect(copies.filter(o => o.fx === fx && itemById(o.item)!.slot === 'aura').length).toBeGreaterThan(0);
  for (const fx of FX_IDS) expect(copies.filter(o => o.fx === fx && itemById(o.item)!.slot !== 'aura' && itemById(o.item)!.signature !== fx).length).toBeGreaterThan(0);
  expect(new Set(copies.map(special).filter(Boolean))).toEqual(new Set(['Deep Blue', 'Red Giant', 'Blue Moon', 'Black Hole']));
});

test('the rules change when the rare end of the library does', () => {
  const guys = ruleOf(guyFigures()), copies = ruleOf(copyFigures());
  // Makes a change, says whether the rules moved, and puts it back.
  const moves = (rules: () => number, was: number, change: () => () => void) => { const undo = change(); try { return rules() !== was; } finally { undo(); } };
  const copyMoves = (change: () => () => void) => moves(() => ruleOf(copyFigures()), copies, change);
  const guyMoves = (change: () => () => void) => moves(() => ruleOf(guyFigures()), guys, change);
  const set = (o: any, k: string, v: any) => () => { const was = o[k]; o[k] = v; return () => { o[k] = was; }; };
  expect(copyMoves(set(FINISHES.gold, 'odds', 0.15))).toBe(true);
  expect(copyMoves(set(FINISHES.pearl, 'aura', 0.1))).toBe(true);
  expect(copyMoves(set(FINISHES.op, 'odds', 0.07))).toBe(true);
  expect(copyMoves(set(EFFECTS.electric, 'item', 5000))).toBe(true);
  expect(copyMoves(set(EFFECTS.electric, 'aura', 700))).toBe(true);
  expect(copyMoves(() => { AURAS.push({ ...AURAS[0], id: 'aura.probe' }); return () => { AURAS.pop(); }; })).toBe(true);
  const rarestOf = (w: number[]) => w.indexOf(Math.min(...w.filter(x => x > 0)));
  expect(guyMoves(set(hairWeights, String(rarestOf(hairWeights)), hairWeights[rarestOf(hairWeights)] * 2))).toBe(true);
  expect(guyMoves(set(eyeWeights, String(rarestOf(eyeWeights)), eyeWeights[rarestOf(eyeWeights)] * 2))).toBe(true);
  // Put back, they are as they were.
  expect(ruleOf(copyFigures())).toBe(copies);
  expect(ruleOf(guyFigures())).toBe(guys);
});

test('the week’s rarest pulls: what capsules gave in the days asked for, rarest first, never a crafted copy or the founder’s', async () => {
  const env = makeEnv(), call = callWith(env), now = Date.now();
  for (const k of ['isaac', 'mia', 'bo']) guy(env, k, seedOf(k.length), 0);
  env.db.exec("UPDATE players SET look = '2:p0' WHERE key = 'mia'");
  const recent = rolls(9).map((o, i) => ({ o, id: copy(env, 'mia', o, { source: ['capsule', 'daily', 'seasonal'][i % 3], at: new Date(now - (i + 1) * 3600e3).toISOString(), pull: i + 1 }) }));
  const old = rolls(12).slice(9).map(o => ({ o, id: copy(env, 'bo', o, { at: new Date(now - 10 * DAY).toISOString() }) }));
  const crafted = copy(env, 'bo', { item: 'aura.flames', finish: 'pearl', scuff: 0.2, print: 7 }, { source: 'craft' });
  const held = copy(env, 'isaac', { item: 'aura.flames', finish: 'pearl', scuff: 0.3, print: 8 });
  const starter = copy(env, 'mia', { item: 'aura.flames', finish: 'pearl', scuff: 0.4, print: 9 }, { source: 'starter' });
  const r = await call('/pulls/rarest?days=7');
  expect(r.headers.get('cache-control')).toBe('public, max-age=60');
  const { pulls }: any = await r.json();
  expect(Object.keys(pulls[0]).sort()).toEqual(['at', 'code', 'id', 'key', 'look', 'no', 'seed']);
  expect(pulls.map((p: any) => p.id)).toEqual(recent.sort(rarer).map(m => m.id));
  // Each with its holder's guy, as the hand draws it: their seed and picked look.
  expect(pulls.every((p: any) => p.key === 'mia' && p.seed === seedOf(3) && p.look === '2:p0')).toBe(true);
  expect(pulls.every((p: any) => p.no > 0)).toBe(true);
  for (const id of [crafted, held, starter]) expect(pulls.some((p: any) => p.id === id)).toBe(false);
  // Thirty days reaches the older ones; a limit keeps the rarest.
  const month: any = await (await call('/pulls/rarest?days=30&limit=5')).json();
  expect(month.pulls.map((p: any) => p.id)).toEqual([...recent, ...old].sort(rarer).slice(0, 5).map(m => m.id));
  for (const p of month.pulls) expect([p.seed, p.look]).toEqual(p.key === 'bo' ? [seedOf(2), ''] : [seedOf(3), '2:p0']);
  // Days and the limit stay within bounds; anything else is the week's twelve at most.
  expect(((await (await call('/pulls/rarest?days=900')).json()) as any).pulls).toHaveLength(12);
  expect(((await (await call('/pulls/rarest?days=nope&limit=0')).json()) as any).pulls).toEqual(pulls);
});

// Rows each `.all()` read handed back, so a test can see what a read loaded.
const counting = (env: any) => {
  const prepare = env.DB.prepare, loaded = { rows: 0 };
  env.DB.prepare = (sql: string) => { const statement = prepare(sql), all = statement.all; statement.all = async () => { const r = await all(); loaded.rows += r.results.length; return r; }; return statement; };
  return loaded;
};
const placeOf = async (call: any, key: string) => (await call(`/top?kind=place&key=${key}`)).json();

test('a guy’s place: the guys board’s order over every claimed guy, out of how many are claimed', async () => {
  const env = makeEnv(), call = callWith(env);
  await claim(env, 'isaac');
  for (let i = 0; i < 30; i++) guy(env, `g${i}`, seedOf(i), i);
  // Two guys dealt alike tie on rank: the earlier claim is ahead.
  guy(env, 'twin', seedOf(4), 40);
  // Before any board read nothing is kept, so each place is worked out here; after one, it's counted.
  const fresh = await Promise.all(['isaac', 'g0', 'g4', 'twin', 'g29'].map(k => placeOf(call, k)));
  const { guys }: any = await (await call('/top?kind=guys')).json();
  expect(guys).toHaveLength(32);
  expect(guys[0].key).toBe('isaac');
  expect(guys.findIndex((g: any) => g.key === 'g4')).toBeLessThan(guys.findIndex((g: any) => g.key === 'twin'));
  const want = (k: string) => ({ place: guys.find((g: any) => g.key === k).place, of: 32 });
  expect(fresh).toEqual(['isaac', 'g0', 'g4', 'twin', 'g29'].map(want));
  for (const g of guys) expect(await placeOf(call, g.key)).toEqual(want(g.key));
  // Counted from the kept ranks: a place read loads no names at all, and writes nothing.
  const loaded = counting(env);
  for (const g of guys) expect(await placeOf(call, g.key)).toEqual(want(g.key));
  expect(loaded.rows).toBe(0);
  // A new claim is worked out alone until a board keeps it.
  guy(env, 'late', seedOf(50), 50);
  const late = await placeOf(call, 'late');
  expect(loaded.rows).toBe(1);
  expect(await placeOf(call, 'late')).toEqual(late);
  expect(env.db.query("SELECT top_rule FROM players WHERE key = 'late'").get().top_rule).toBe(0);
  const board: any = await (await call('/top?kind=guys')).json();
  expect(late).toEqual({ place: board.guys.find((g: any) => g.key === 'late').place, of: 33 });
  expect(await placeOf(call, 'g4')).toEqual({ place: board.guys.find((g: any) => g.key === 'g4').place, of: 33 });
});

test('a place is cached with only its name, found by its key or the grandfathered one, and 404 for a name nobody holds', async () => {
  const env = makeEnv(), call = callWith(env);
  guy(env, 'coolguy', seedOf(1), 0);
  guy(env, 'mia', seedOf(2), 1);
  const r = await call('/top?kind=place&key=cool_guy&x=1');
  expect(r.status).toBe(200);
  expect(r.headers.get('cache-control')).toBe('public, max-age=60');
  expect(await r.json()).toEqual(await placeOf(call, 'coolguy'));
  expect((await placeOf(call, 'mia')).of).toBe(2);
  for (const key of ['nobody', '', 'x', '%20']) {
    const no = await call(`/top?kind=place&key=${key}`);
    expect(no.status).toBe(404);
    expect(no.headers.get('cache-control')).toBe('no-store');
  }
});

test('a place after a pick is the picked guy’s, though the board had kept the dealt one', async () => {
  const env = makeEnv(), call = callWith(env), h = await claim(env, 'mia');
  for (let i = 0; i < 20; i++) guy(env, `g${i}`, seedOf(i), i);
  const { pick }: any = await (await call('/me/mia/state', 'GET', undefined, h)).json();
  const dealt = env.db.query("SELECT seed FROM names WHERE key = 'mia'").get().seed;
  await call('/top?kind=guys');
  // The choice furthest along the ladder from the dealt one.
  const other = pick.choices.filter((c: string) => c !== dealt).sort((a: string, b: string) => Math.abs(guyRank(resolve(b)).top - guyRank(resolve(dealt)).top) - Math.abs(guyRank(resolve(a)).top - guyRank(resolve(dealt)).top))[0];
  expect((await call('/me/mia/pick', 'POST', { seed: other }, h)).status).toBe(200);
  const place = await placeOf(call, 'mia'), board: any = await (await call('/top?kind=guys')).json();
  expect(place).toEqual({ place: board.guys.find((g: any) => g.key === 'mia').place, of: 21 });
  expect(board.guys.find((g: any) => g.key === 'mia').seed).toBe(other);
});

test('before migration 0013, or when a read fails partway, a place is worked out in full and says the same', async () => {
  const before = makeEnv('0012_pins.sql'), after = makeEnv(), flakyEnv = makeEnv();
  for (const env of [before, after, flakyEnv]) { for (let i = 0; i < 15; i++) guy(env, `g${i}`, seedOf(i), i); guy(env, 'twin', seedOf(3), 20); }
  await callWith(flakyEnv)('/top?kind=guys');
  flaky(flakyEnv, 'top_seed IS NOT');
  const loaded = counting(before);
  for (const k of ['g0', 'g3', 'twin', 'g14']) {
    const a = await placeOf(callWith(before), k);
    expect(a).toEqual(await placeOf(callWith(after), k));
    expect(a).toEqual(await placeOf(callWith(flakyEnv), k));
    expect(a.of).toBe(16);
  }
  // With nowhere to keep a rank, each read loads every name.
  expect(loaded.rows).toBe(4 * 16);
});

// A copy put straight in the database with the odds a capsule would have kept (`copyOneIn`, float and all).
const pulled = (env: any, key: string, o: Owned, source = 'capsule') => {
  const id = copy(env, key, o, { source });
  env.db.prepare('UPDATE copies SET one_in = ? WHERE id = ?').run(copyOneIn(o), id);
  return id;
};

test('the Pulls page’s rarest are what the eye can see, as the copies board ranks them, page by page, as before 0013', async () => {
  const before = makeEnv('0012_pins.sql'), after = makeEnv();
  const made: any[] = [];
  for (const env of [before, after]) {
    for (const k of ['mia', 'bo']) guy(env, k, seedOf(k.length), 0);
    made.length = 0;
    rolls(40).forEach((o, i) => made.push({ o, id: pulled(env, i % 2 ? 'mia' : 'bo', o) }));
    // A Strange copy's tally makes it ten times rarer by the old odds, but it looks the same.
    const strange = { ...made[0].o, tally: 3 };
    made.push({ o: strange, id: pulled(env, 'mia', strange) });
    const aura: Owned = { item: 'aura.flames', finish: 'fade', scuff: 0.5, print: 3 };
    made.push({ o: aura, id: pulled(env, 'bo', aura) });
    pulled(env, 'mia', rolls(41)[40], 'starter');
  }
  const byOld = [...made].sort((a, b) => copyOneIn(b.o) - copyOneIn(a.o) || a.o.scuff - b.o.scuff).map(m => m.id);
  const want = [...made].sort(rarer).map(m => m.id);
  expect(want).not.toEqual(byOld);
  for (const env of [before, after]) {
    const call = callWith(env), all: any = await (await call('/market')).json();
    expect(all.map((c: any) => c.id)).toEqual(want);
    // The same shape as ever: each copy as the profile lists it, with its holder's guy.
    const float: any = await (await call('/market?sort=float')).json();
    expect(Object.keys(all[0]).sort()).toEqual(Object.keys(float.find((c: any) => c.id === all[0].id)).sort());
    expect(all.find((c: any) => c.id === made[0].id)).toMatchObject({ key: 'bo', seed: seedOf(2), look: '', oneIn: copyOneIn(made[0].o) });
    // Page by page, the same order.
    const pages = [];
    for (let offset = 0; offset < 49; offset += 7) pages.push(...await (await call(`/market?limit=7&offset=${offset}`)).json() as any[]);
    expect(pages.map((c: any) => c.id)).toEqual(want);
    // A filter keeps the order.
    const mia: any = await (await call('/market?key=mia&sort=rarest')).json();
    expect(mia.map((c: any) => c.id)).toEqual(want.filter(id => all.find((c: any) => c.id === id).key === 'mia'));
    expect(mia.length).toBeGreaterThan(10);
    // Each grade on its own, auras' too.
    for (let grade = 0; grade < GRADES.length; grade++) {
      const graded: any = await (await call(`/market?grade=${grade}`)).json();
      expect(graded.map((c: any) => c.id)).toEqual(want.filter(id => GRADES.findIndex(g => g.id === gradeOf(made.find(m => m.id === id).o).id) === grade));
    }
    expect(((await (await call('/market?grade=5')).json()) as any).map((c: any) => c.id)).toEqual([made.at(-1).id]);
  }
  // A Pulls page read only reads (with nothing to ask it after, it doesn't ask the board): the copies board keeps the odds.
  const call = callWith(after), last = want.at(-1);
  expect(after.db.query('SELECT COUNT(*) AS n FROM copies WHERE seen_rule <> 0').get().n).toBe(0);
  await call('/top?kind=copies');
  expect(after.db.query('SELECT COUNT(*) AS n FROM copies WHERE seen_rule = ?').get(copyRules()).n).toBe(43);
  expect(((await (await call('/market')).json()) as any).map((c: any) => c.id)).toEqual(want);
  // Kept odds are trusted under the same rules and worked out again under others.
  const loaded = counting(after);
  await call('/market');
  expect(loaded.rows).toBe(42);
  after.db.prepare('UPDATE copies SET seen_in = 1e30 WHERE id = ?').run(last);
  expect(((await (await call('/market')).json()) as any)[0].id).toBe(last);
  after.db.prepare('UPDATE copies SET seen_rule = 7 WHERE id = ?').run(last);
  expect(((await (await call('/market')).json()) as any).map((c: any) => c.id)).toEqual(want);
});

test('on the founder’s own Pulls page his one-of-ones come first, then the rarest', async () => {
  const env = makeEnv(), call = callWith(env);
  await claim(env, 'isaac');
  const made = rolls(12).map(o => ({ o, id: pulled(env, 'isaac', o) }));
  const page: any = await (await call('/market?key=isaac')).json();
  const own = env.db.query("SELECT id FROM copies WHERE key = 'isaac' AND source = 'founder'").all().map((r: any) => r.id);
  expect(own).toHaveLength(2);
  expect(page.slice(0, 2).map((c: any) => c.id).sort()).toEqual(own.sort());
  expect(page.slice(0, 2).every((c: any) => c.one)).toBe(true);
  expect(page.slice(2).map((c: any) => c.id)).toEqual(made.sort(rarer).map(m => m.id));
  // The same once the board keeps every copy's odds and the page is the database's.
  await call('/top?kind=copies');
  expect(await (await call('/market?key=isaac')).json()).toEqual(page);
  expect(await (await call('/market?key=isaac&limit=5&offset=1')).json()).toEqual(page.slice(1, 6));
  // Nobody else's Pulls page lists what he holds.
  expect(await (await call('/market')).json()).toEqual([]);
});

// Asks the API as the Worker does, with a request context whose after-the-answer work is kept in `pending`.
const withContext = (env: any) => {
  const pending: Promise<unknown>[] = [];
  const ask = (path: string) => api(new Request('https://lilguys.test/api' + path), env, undefined, { waitUntil: (p: Promise<unknown>) => pending.push(p) });
  return { ask, pending };
};
const keptCopies = (env: any) => env.db.query('SELECT COUNT(*) AS n FROM copies WHERE seen_rule = ?').get(copyRules()).n;
const keptGuys = (env: any) => env.db.query('SELECT COUNT(*) AS n FROM players WHERE top_rule = ?').get(guyRules()).n;

test('with nothing to work out, a Pulls page is the database’s own: a deep page loads only its own rows', async () => {
  const env = makeEnv(), call = callWith(env);
  for (const k of ['mia', 'bo']) guy(env, k, seedOf(k.length), 0);
  const made = rolls(40).map((o, i) => ({ o, id: pulled(env, i % 2 ? 'mia' : 'bo', o) }));
  const want = made.sort(rarer).map(m => m.id);
  await call('/top?kind=copies');
  const loaded = counting(env);
  expect(((await (await call('/market?limit=7&offset=28')).json()) as any).map((c: any) => c.id)).toEqual(want.slice(28, 35));
  expect(loaded.rows).toBe(7);
});

test('past BACKLOG copies to work out, the Pulls page keeps the order they were pulled with till the board catches up', async () => {
  const before = makeEnv('0012_pins.sql'), after = makeEnv(), many = rolls(BACKLOG + 40);
  const made: any[] = [];
  for (const env of [before, after]) {
    guy(env, 'mia', seedOf(1), 0);
    made.length = 0;
    many.forEach(o => made.push({ o, id: pulled(env, 'mia', o) }));
  }
  const byOld = [...made].sort((a, b) => copyOneIn(b.o) - copyOneIn(a.o) || a.o.scuff - b.o.scuff || a.id - b.id).map(m => m.id);
  const want = [...made].sort(rarer).map(m => m.id);
  expect(want.slice(0, 60)).not.toEqual(byOld.slice(0, 60));
  for (const env of [before, after]) {
    // One more than BACKLOG is read to know there are too many, then the page itself.
    const loaded = counting(env);
    expect(((await (await callWith(env)('/market?limit=20&offset=20')).json()) as any).map((c: any) => c.id)).toEqual(byOld.slice(20, 40));
    expect(loaded.rows).toBe(BACKLOG + 1 + 20);
  }
  // After the Worker answers, it asks for the copies board, which keeps a few hundred: few enough left to work out.
  const { ask, pending } = withContext(after);
  await ask('/market');
  expect(pending).toHaveLength(1);
  await Promise.all(pending);
  expect(keptCopies(after)).toBe(FILL.copies);
  expect(((await (await ask('/market')).json()) as any).map((c: any) => c.id)).toEqual(want.slice(0, 60));
  expect(((await (await ask('/market?limit=20&offset=20')).json()) as any).map((c: any) => c.id)).toEqual(want.slice(20, 40));
  // Before 0013 there's nowhere to keep odds, so it never asks.
  const old = withContext(before);
  await old.ask('/market');
  expect(old.pending).toHaveLength(0);
});

test('a place or a Pulls page that finds what the boards haven’t kept asks for that board after answering, at most once a minute', async () => {
  const env = makeEnv(), { ask, pending } = withContext(env);
  for (let i = 0; i < 12; i++) guy(env, `g${i}`, seedOf(i), i);
  rolls(10).forEach(o => pulled(env, 'g1', o));
  const place: any = await (await ask('/top?kind=place&key=g3')).json();
  expect(pending).toHaveLength(1);
  await Promise.all(pending);
  expect(keptGuys(env)).toBe(12);
  expect(await (await ask('/top?kind=place&key=g3')).json()).toEqual(place);
  await ask('/market');
  expect(pending).toHaveLength(2);
  await Promise.all(pending);
  expect(keptCopies(env)).toBe(10);
  // Once a minute: what's new in the meantime waits for the next.
  guy(env, 'late', seedOf(40), 50);
  pulled(env, 'late', rolls(11)[10]);
  await ask('/top?kind=place&key=late');
  await ask('/market');
  expect(pending).toHaveLength(2);
  setSystemTime(new Date(Date.now() + 61e3));
  try {
    await ask('/top?kind=place&key=late');
    await ask('/market');
  } finally { setSystemTime(); }
  expect(pending).toHaveLength(4);
  await Promise.all(pending);
  expect([keptGuys(env), keptCopies(env)]).toEqual([13, 11]);
  // With nothing left the boards could keep, nobody asks: a name with no record yet can't have its rank kept.
  env.db.prepare('INSERT INTO names(key, seed, owner, at) VALUES (?, ?, ?, ?)').run('new', seedOf(41), 'x', new Date().toISOString());
  setSystemTime(new Date(Date.now() + 122e3));
  try {
    await ask('/top?kind=place&key=new');
    await ask('/market');
  } finally { setSystemTime(); }
  expect(pending).toHaveLength(4);
  // Before 0013 neither asks.
  const before = makeEnv('0012_pins.sql'), old = withContext(before);
  for (let i = 0; i < 4; i++) guy(before, `g${i}`, seedOf(i), i);
  pulled(before, 'g1', rolls(1)[0]);
  await old.ask('/top?kind=place&key=g2');
  await old.ask('/market');
  expect(old.pending).toHaveLength(0);
});
