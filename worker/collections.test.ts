import { test, expect, beforeEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { api, RULES, todayGame, tradeGrade } from './index.js';
import { GAMES } from '../src/index-headless.ts';
import { readFileSync } from 'node:fs';
import { decode, encode } from '../src/index-headless.ts';

let env: any;
beforeEach(() => {
  const db = new Database(':memory:');
  for (const m of ['0001_names.sql', '0002_collections.sql', '0003_google_accounts.sql', '0004_float_rank.sql', '0005_luck.sql', '0006_tags_swaps.sql', '0007_parts.sql', '0008_craft.sql', '0009_card_stats.sql']) db.exec(readFileSync(new URL(`../migrations/${m}`, import.meta.url), 'utf8'));
  env = { CLAIM_SALT: 'test-only-salt', FOUNDER_SECRET: 'test-only-founder', db, DB: { async batch(statements: any[]) { db.exec('BEGIN'); try { const results = []; for (const statement of statements) results.push(await statement.run()); db.exec('COMMIT'); return results; } catch (e) { db.exec('ROLLBACK'); throw e; } }, prepare(sql: string) {
    let args: any[] = [];
    const statement = { bind(...values: any[]) { args = values; return statement; },
      async first() { return db.prepare(sql).get(...args); }, async all() { return { results: db.prepare(sql).all(...args) }; },
      async run() { const r = db.prepare(sql).run(...args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; } };
    return statement;
  } } };
});
const call = (path: string, method = 'GET', body?: any, headers: any = {}) => api(new Request('https://example.test/api' + path, {
  method, headers: { 'CF-Connecting-IP': '192.0.2.1', 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined,
}), env);
const claim = async (key: string) => (await (await call('/names/' + key, 'POST')).json()) as any;
const auth = (t: string) => ({ Authorization: 'Bearer ' + t });

test('a claim makes a player with tickets and a starter from every machine, one worn', async () => {
  const c = await claim('mia');
  const s: any = await (await call('/me/mia/state', 'GET', undefined, auth(c.owner))).json();
  expect(s.tickets).toBe(RULES.start);
  expect(s.copies).toHaveLength(GAMES.length);
  expect(new Set(s.copies.map((x: any) => decode(x.code)!.item.split('.')[0]))).toEqual(new Set(GAMES));
  expect(s.copies.filter((x: any) => x.worn)).toHaveLength(1);
  expect(s.copies.every((x: any) => x.source === 'starter')).toBe(true);
  expect((await call('/me/mia/state')).status).toBe(401);
});

test('a player made before a machine joined gets its starter once', async () => {
  const c = await claim('mia');
  await call('/me/mia/state', 'GET', undefined, auth(c.owner));
  env.db.exec("DELETE FROM copies WHERE key = 'mia' AND game = 'pets'");
  const games = async () => ((await (await call('/me/mia/state', 'GET', undefined, auth(c.owner))).json()) as any).copies.map((x: any) => decode(x.code)!.item.split('.')[0]);
  expect((await games()).filter((g: string) => g === 'pets')).toHaveLength(1);
  expect(await games()).toHaveLength(GAMES.length);
});

test('capsules are rolled and stored on the server, paid in tickets, and the free one is today’s machine once', async () => {
  const c = await claim('mia');
  const free = await call('/me/mia/open', 'POST', { game: todayGame(), free: true }, auth(c.owner));
  expect(free.status).toBe(201);
  const body: any = await free.json();
  expect(body.copy.code).toContain('~');
  // The free one is a souvenir of today; no other capsule is.
  expect(body.copy.code).toMatch(/~s\d{4}-\d{2}-\d{2}/);
  expect(body.tickets).toBe(RULES.start);
  expect((await call('/me/mia/open', 'POST', { game: todayGame(), free: true }, auth(c.owner))).status).toBe(409);
  // Tickets are endless for now: a paid capsule leaves them where they were, even at none.
  const paid: any = await (await call('/me/mia/open', 'POST', { game: 'puttsies' }, auth(c.owner))).json();
  expect(paid.tickets).toBe(RULES.start);
  env.db.exec("UPDATE players SET tickets = 0 WHERE key = 'mia'");
  expect((await call('/me/mia/open', 'POST', { game: 'puttsies' }, auth(c.owner))).status).toBe(201);
  expect((await call('/me/mia/open', 'POST', { game: 'nope' }, auth(c.owner))).status).toBe(400);
});

test('with tickets switched back on, a capsule costs them and runs out', async () => {
  RULES.infinite = false;
  try {
    const c = await claim('mia');
    const paid: any = await (await call('/me/mia/open', 'POST', { game: 'puttsies' }, auth(c.owner))).json();
    expect(paid.tickets).toBe(RULES.start - RULES.capsule);
    env.db.exec("UPDATE players SET tickets = 10 WHERE key = 'mia'");
    expect((await call('/me/mia/open', 'POST', { game: 'puttsies' }, auth(c.owner))).status).toBe(402);
  } finally { RULES.infinite = true; }
});

test('trade up: five unworn copies of one grade for one of the next, each copy traded once', async () => {
  const c = await claim('mia'), b = await claim('bo');
  const at = new Date().toISOString();
  const put = (key: string, grade: number, extra = '') => env.db.prepare(`INSERT INTO copies(key, code, item, game, slot, finish, grade, one_in, scuff, source, worn, at) VALUES (?, 'amountle.crown~plain~0.5000000~1', 'amountle.crown', 'amountle', 'hat', 'plain', ?, 100, 0.5, ${extra || "'capsule'"}, 0, ?)`).run(key, grade, at).lastInsertRowid as number;
  const five = [0, 1, 2, 3, 4].map(() => Number(put('mia', 0)));
  // Four is not a trade, nor is another player's copy, a starter or a mixed grade.
  expect((await call('/me/mia/trade', 'POST', { ids: five.slice(0, 4) }, auth(c.owner))).status).toBe(400);
  const theirs = Number(put('bo', 0));
  expect((await call('/me/mia/trade', 'POST', { ids: [...five.slice(0, 4), theirs] }, auth(c.owner))).status).toBe(404);
  const higher = Number(put('mia', 1));
  expect((await call('/me/mia/trade', 'POST', { ids: [...five.slice(0, 4), higher] }, auth(c.owner))).status).toBe(400);
  const starter: any = (await (await call('/me/mia/state', 'GET', undefined, auth(c.owner))).json() as any).copies.find((x: any) => x.source === 'starter' && !x.worn);
  expect((await call('/me/mia/trade', 'POST', { ids: [...five.slice(0, 4), starter.id] }, auth(c.owner))).status).toBe(400);
  const r = await call('/me/mia/trade', 'POST', { ids: five }, auth(c.owner));
  expect(r.status).toBe(201);
  const got: any = await r.json();
  // Usually the next grade; a dud stays at the same grade and a jump goes two up.
  expect({ dud: 0, up: 1, jump: 2 }[got.outcome as string]).toBe(got.copy.grade);
  expect(got.copy.source).toBe('trade');
  const left: any = await (await call('/me/mia/state', 'GET', undefined, auth(c.owner))).json();
  expect(left.copies.some((x: any) => five.includes(x.id))).toBe(false);
  // Traded copies are gone: the same five cannot trade again.
  expect((await call('/me/mia/trade', 'POST', { ids: five }, auth(c.owner))).status).toBe(404);
  expect((await call('/me/mia/trade', 'POST', { ids: five })).status).toBe(401);
  expect(b.owner).toBeTruthy();
});

test('a trade up is usually the next grade, sometimes a dud, now and then two up, never past Grail', () => {
  const at = (u: number, g: number) => tradeGrade(g, u, 4);
  expect(at(0.1, 0)).toEqual({ grade: 0, outcome: 'dud' });
  expect(at(0.5, 0)).toEqual({ grade: 1, outcome: 'up' });
  expect(at(0.97, 0)).toEqual({ grade: 2, outcome: 'jump' });
  expect(at(0.97, 3)).toEqual({ grade: 4, outcome: 'up' });
  expect(at(0.5, 3)).toEqual({ grade: 4, outcome: 'up' });
});

test('the day’s tickets are collected once', async () => {
  const c = await claim('mia');
  const r: any = await (await call('/me/mia/checkin', 'POST', {}, auth(c.owner))).json();
  expect(r.tickets).toBe(RULES.start + RULES.daily);
  expect((await call('/me/mia/checkin', 'POST', {}, auth(c.owner))).status).toBe(409);
});

test('wearing takes only your own copy for its slot; looks only take parts you may pick', async () => {
  const a = await claim('mia'), b = await claim('bo');
  const bo: any = await (await call('/me/bo/state', 'GET', undefined, auth(b.owner))).json();
  const boHat = bo.copies.find((x: any) => x.slot === 'hat');
  expect((await call('/me/mia/wear', 'POST', { slot: 'hat', id: boHat.id }, auth(a.owner))).status).toBe(404);
  const mia: any = await (await call('/me/mia/state', 'GET', undefined, auth(a.owner))).json();
  const hats = mia.copies.filter((x: any) => x.slot === 'hat');
  expect((await call('/me/mia/wear', 'POST', { slot: 'hat', id: hats[1].id }, auth(a.owner))).status).toBe(200);
  const after: any = await (await call('/me/mia/state', 'GET', undefined, auth(a.owner))).json();
  expect(after.copies.filter((x: any) => x.slot === 'hat' && x.worn).map((x: any) => x.id)).toEqual([hats[1].id]);
  expect((await call('/me/mia/look', 'POST', { look: '2:p0' }, auth(a.owner))).status).toBe(200);
  expect((await call('/me/mia/look', 'POST', { look: '2:e999' }, auth(a.owner))).status).toBe(400);
});

test('everyone is public: guys, profiles, the market and stats, without owner tokens', async () => {
  const a = await claim('mia'); await claim('bo');
  await call('/me/mia/open', 'POST', { game: 'puttsies' }, auth(a.owner));
  const list: any = await (await call('/guys')).json();
  expect(list.map((g: any) => g.key).sort()).toEqual(['bo', 'mia']);
  expect(JSON.stringify(list)).not.toContain(a.owner);
  const prof: any = await (await call('/guys/mia')).json();
  expect(prof.copies).toHaveLength(GAMES.length + 1);
  const market: any = await (await call('/market?sort=rarest')).json();
  expect(market).toHaveLength(1);
  expect(market[0].key).toBe('mia');
  expect((await (await call('/market?key=bo')).json() as any)).toHaveLength(0);
  const s: any = await (await call('/stats')).json();
  expect(s.players).toBe(2);
  expect(s.copies).toBe(1);
  // Every pulled item in every finish is counted (starters aside), for the Pulls page.
  expect(s.counts).toHaveLength(1);
  expect(s.counts[0][2]).toBe(1);
});

test('letting a name go takes its collection with it; the founder holds the one of one', async () => {
  const a = await claim('mia');
  await call('/me/mia/open', 'POST', { game: 'puttsies' }, auth(a.owner));
  expect((await call('/names/mia', 'DELETE', undefined, auth(a.owner))).status).toBe(200);
  expect(env.db.query("SELECT COUNT(*) AS n FROM copies WHERE key = 'mia'").get().n).toBe(0);
  const f: any = await (await call('/names/isaac', 'POST', undefined, { 'X-Founder-Secret': 'test-only-founder' })).json();
  const prof: any = await (await call('/guys/isaac')).json();
  expect(prof.copies.find((c: any) => c.one)?.code).toContain('trackdle.flag~gold');
  // And the Origin aura, worn, which no capsule can give.
  expect(prof.copies.find((c: any) => c.code.startsWith('aura.origin'))?.worn).toBe(true);
  expect(f.seed).toBe('founder:isaac');
});

test('a float rank counts copies of the same item and finish, cleaner first, and names no one', async () => {
  const c = await claim('flo');
  const codes: string[] = [];
  for (let i = 0; i < 6; i++) codes.push(((await (await call('/me/flo/open', 'POST', { game: 'stackdle' }, auth(c.owner))).json()) as any).copy.code);
  const o = decode(codes[0])!;
  const r: any = await (await call('/rank?code=' + encodeURIComponent(codes[0]))).json();
  expect(r.pop).toBeGreaterThanOrEqual(1);
  expect(r.rank).toBeGreaterThanOrEqual(1);
  expect(r.rank).toBeLessThanOrEqual(r.pop);
  expect(r.itemPop).toBeGreaterThanOrEqual(r.pop);
  expect(JSON.stringify(r)).not.toContain('flo');
  // The cleanest possible copy of it would rank first.
  const best: any = await (await call('/rank?code=' + encodeURIComponent(encode({ ...o, scuff: 0 })))).json();
  expect(best.rank).toBe(1);
  expect((await call('/rank?code=nope')).status).toBe(400);
});

test('the founder never pays, even with tickets switched back on, and his state says so', async () => {
  RULES.infinite = false;
  try {
    const f: any = await (await call('/names/isaac', 'POST', undefined, { 'X-Founder-Secret': 'test-only-founder' })).json();
    env.db.exec("UPDATE players SET tickets = 0 WHERE key = 'isaac'");
    const r = await call('/me/isaac/open', 'POST', { game: 'puttsies' }, auth(f.owner));
    expect(r.status).toBe(201);
    expect(((await r.json()) as any).tickets).toBe(0);
    const s: any = await (await call('/me/isaac/state', 'GET', undefined, auth(f.owner))).json();
    expect(s.infinite).toBe(true);
    // Anyone else pays, and their state says so.
    const c = await claim('mia');
    const m: any = await (await call('/me/mia/state', 'GET', undefined, auth(c.owner))).json();
    expect(m.infinite).toBe(false);
    env.db.exec("UPDATE players SET tickets = 0 WHERE key = 'mia'");
    expect((await call('/me/mia/open', 'POST', { game: 'puttsies' }, auth(c.owner))).status).toBe(402);
  } finally { RULES.infinite = true; }
  const c = await claim('bo');
  expect(((await (await call('/me/bo/state', 'GET', undefined, auth(c.owner))).json()) as any).infinite).toBe(true);
});

test('beginner’s luck: a player’s first three capsules are the best of three, the fourth a plain roll', async () => {
  let good = 0, n = 0;
  for (let i = 0; i < 150; i++) {
    const key = 'p' + i;
    // A fresh address for each, past the daily claim limit.
    const c: any = await (await call('/names/' + key, 'POST', undefined, { 'CF-Connecting-IP': `198.51.100.${i}` })).json();
    for (let k = 0; k < 3; k++) {
      // The first is the day's free one, the rest paid: both count.
      const body: any = await (await call(`/me/${key}/open`, 'POST', k ? { game: 'puttsies' } : { game: todayGame(), free: true }, auth(c.owner))).json();
      expect(body.luck).toBe('beginner');
      n++;
      if (body.copy.grade >= 1) good++;
    }
    if (i === 0) {
      const fourth: any = await (await call(`/me/${key}/open`, 'POST', { game: 'puttsies' }, auth(c.owner))).json();
      expect(fourth.luck).toBeNull();
    }
  }
  // A plain capsule is Special or better about one time in five; the best of three about half the time.
  expect(good / n).toBeGreaterThan(0.35);
  expect(env.db.query("SELECT opened FROM players WHERE key = 'p1'").get().opened).toBe(3);
});

test('pity: after thirty capsules in a row below Prized the next is Prized or better, and the counters persist', async () => {
  const c = await claim('mia');
  const row = () => env.db.query("SELECT opened, dry FROM players WHERE key = 'mia'").get();
  let run = 0;
  for (let k = 0; k < 4; k++) {
    const body: any = await (await call('/me/mia/open', 'POST', { game: 'stackdle' }, auth(c.owner))).json();
    run = body.copy.grade >= 2 ? 0 : run + 1;
  }
  expect(row()).toEqual({ opened: 4, dry: run });
  for (let k = 0; k < 20; k++) {
    env.db.exec("UPDATE players SET dry = 30 WHERE key = 'mia'");
    const body: any = await (await call('/me/mia/open', 'POST', { game: 'stackdle' }, auth(c.owner))).json();
    expect(body.luck).toBe('pity');
    expect(body.copy.grade).toBeGreaterThanOrEqual(2);
    expect(row().dry).toBe(0);
  }
  expect(row().opened).toBe(24);
  // One short of thirty is no pity; the run grows by one unless the capsule ends it.
  env.db.exec("UPDATE players SET dry = 29 WHERE key = 'mia'");
  const body: any = await (await call('/me/mia/open', 'POST', { game: 'stackdle' }, auth(c.owner))).json();
  expect(body.luck).toBeNull();
  expect(row()).toEqual({ opened: 25, dry: body.copy.grade >= 2 ? 0 : 30 });
});

const put = (key: string, grade = 0, scuff = 0.5, source = 'capsule') => Number(env.db.prepare(`INSERT INTO copies(key, code, item, game, slot, finish, grade, one_in, scuff, source, worn, at) VALUES (?, ?, 'amountle.crown', 'amountle', 'hat', 'plain', ?, 100, ?, ?, 0, ?)`)
  .run(key, encode({ item: 'amountle.crown', finish: 'plain', scuff, print: 1 }), grade, scuff, source, new Date().toISOString()).lastInsertRowid);
const stateOf = async (key: string, owner: string) => (await (await call(`/me/${key}/state`, 'GET', undefined, auth(owner))).json()) as any;

test('a name tag stays on its copy, only its owner can set it, and bad tags are refused', async () => {
  const c = await claim('mia'), b = await claim('bo');
  const id = put('mia');
  expect((await call('/me/mia/tag', 'POST', { id, tag: '  Lucky   Visor ' }, auth(c.owner))).status).toBe(200);
  expect((await stateOf('mia', c.owner)).copies.find((x: any) => x.id === id).tag).toBe('Lucky Visor');
  expect((await call('/me/bo/tag', 'POST', { id, tag: 'Mine now' }, auth(b.owner))).status).toBe(404);
  expect((await call('/me/mia/tag', 'POST', { id, tag: '<script>' }, auth(c.owner))).status).toBe(400);
  expect((await call('/me/mia/tag', 'POST', { id, tag: 'x'.repeat(21) }, auth(c.owner))).status).toBe(400);
  // Public pages see it too.
  const pub: any = await (await call('/guys/mia')).json();
  expect(pub.copies.find((x: any) => x.id === id).tag).toBe('Lucky Visor');
});

test('a trade up’s float comes from its inputs: five half-worn copies make a half-way result', async () => {
  const c = await claim('mia');
  const five = [0, 1, 2, 3, 4].map(() => put('mia', 0, 0.5));
  const got: any = await (await call('/me/mia/trade', 'POST', { ids: five }, auth(c.owner))).json();
  const o = decode(got.copy.code)!;
  const [lo, hi] = ({ plain: [0, 1], tempered: [0, 1] } as any)[o.finish] || [0, 0.08];
  expect(o.scuff).toBeCloseTo(lo + 0.5 * (hi - lo), 6);
});

test('a swap moves both copies only when accepted, and a gift moves one', async () => {
  const c = await claim('mia'), b = await claim('bo');
  const mine = put('mia'), theirs = put('bo');
  const offer: any = await (await call('/me/mia/swap', 'POST', { to: 'bo', give: mine, want: theirs }, auth(c.owner))).json();
  expect(offer.id).toBeTruthy();
  // Nothing has moved yet, and both see the offer.
  expect((await stateOf('mia', c.owner)).copies.some((x: any) => x.id === mine)).toBe(true);
  expect((await stateOf('bo', b.owner)).swaps[0].give.id).toBe(mine);
  // Only the one it was made to can accept it.
  expect((await call('/me/mia/swap-accept', 'POST', { id: offer.id }, auth(c.owner))).status).toBe(404);
  expect((await call('/me/bo/swap-accept', 'POST', { id: offer.id }, auth(b.owner))).status).toBe(200);
  expect((await stateOf('bo', b.owner)).copies.some((x: any) => x.id === mine)).toBe(true);
  expect((await stateOf('mia', c.owner)).copies.some((x: any) => x.id === theirs)).toBe(true);
  // A gift asks for nothing back.
  const gift: any = await (await call('/me/bo/swap', 'POST', { to: 'mia', give: mine }, auth(b.owner))).json();
  await call('/me/mia/swap-accept', 'POST', { id: gift.id }, auth(c.owner));
  expect((await stateOf('mia', c.owner)).copies.some((x: any) => x.id === mine)).toBe(true);
});

test('swaps refuse starters, worn copies and stale offers, and either side can call one off', async () => {
  const c = await claim('mia'), b = await claim('bo');
  const starter = (await stateOf('mia', c.owner)).copies.find((x: any) => x.source === 'starter').id;
  expect((await call('/me/mia/swap', 'POST', { to: 'bo', give: starter }, auth(c.owner))).status).toBe(400);
  expect((await call('/me/mia/swap', 'POST', { to: 'mia', give: put('mia') }, auth(c.owner))).status).toBe(400);
  expect((await call('/me/mia/swap', 'POST', { to: 'nobody', give: put('mia') }, auth(c.owner))).status).toBe(404);
  // Two offers for one copy: once one goes through, the other lapses.
  const one = put('mia');
  const a: any = await (await call('/me/mia/swap', 'POST', { to: 'bo', give: one }, auth(c.owner))).json();
  const d = await claim('di');
  const z: any = await (await call('/me/mia/swap', 'POST', { to: 'di', give: one }, auth(c.owner))).json();
  await call('/me/bo/swap-accept', 'POST', { id: a.id }, auth(b.owner));
  expect((await call('/me/di/swap-accept', 'POST', { id: z.id }, auth(d.owner))).status).toBe(404);
  // A copy put on after the offer stops it.
  const worn = put('mia');
  const w: any = await (await call('/me/mia/swap', 'POST', { to: 'bo', give: worn }, auth(c.owner))).json();
  await call('/me/mia/wear', 'POST', { slot: 'hat', id: worn }, auth(c.owner));
  expect((await call('/me/bo/swap-accept', 'POST', { id: w.id }, auth(b.owner))).status).toBe(409);
  expect((await stateOf('mia', c.owner)).copies.some((x: any) => x.id === worn)).toBe(true);
  // Declined and withdrawn offers are gone for both.
  const x: any = await (await call('/me/mia/swap', 'POST', { to: 'bo', give: put('mia') }, auth(c.owner))).json();
  expect((await call('/me/bo/swap-cancel', 'POST', { id: x.id }, auth(b.owner))).status).toBe(200);
  expect((await stateOf('mia', c.owner)).swaps).toHaveLength(0);
});

test('a player can only have so many offers out', async () => {
  const c = await claim('mia'); await claim('bo');
  for (let i = 0; i < RULES.swaps; i++) expect((await call('/me/mia/swap', 'POST', { to: 'bo', give: put('mia') }, auth(c.owner))).status).toBe(201);
  expect((await call('/me/mia/swap', 'POST', { to: 'bo', give: put('mia') }, auth(c.owner))).status).toBe(429);
});

test('capsules now and then unlock a rare face part, which can then be picked; rarity stays the deal’s', async () => {
  const c = await claim('mia');
  let part: any = null;
  for (let i = 0; i < 60 && !part?.new; i++) part = ((await (await call('/me/mia/open', 'POST', { game: 'puttsies' }, auth(c.owner))).json()) as any).part;
  expect(part?.new).toBe(true);
  const s: any = await (await call('/me/mia/state', 'GET', undefined, auth(c.owner))).json();
  expect(s.parts).toContain(part.code);
  const before = env.db.prepare("SELECT guy_one_in FROM players WHERE key = 'mia'").get().guy_one_in;
  // The earned part goes into a look; a rare part nobody gave them doesn't.
  const ok = await call('/me/mia/look', 'POST', { look: '2:' + part.code }, auth(c.owner));
  expect(ok.status).toBe(200);
  expect(env.db.prepare("SELECT guy_one_in FROM players WHERE key = 'mia'").get().guy_one_in).toBe(before);
  const LG = await import('../src/index-headless.ts'), mine = LG.resolve(s.seed).eyes;
  const other = LG.rareParts('eyes').filter((i: number) => i !== mine).map((i: number) => 'e' + i).find((code: string) => !s.parts.includes(code) && code !== part.code);
  expect((await call('/me/mia/look', 'POST', { look: '2:' + other }, auth(c.owner))).status).toBe(400);
});

test('every capsule unlocks a part the player hasn’t got, and metal crafts the one they want', async () => {
  const c = await claim('mia');
  const got: string[] = [];
  for (let i = 0; i < 10; i++) {
    const part = ((await (await call('/me/mia/open', 'POST', { game: 'puttsies' }, auth(c.owner))).json()) as any).part;
    expect(part?.new).toBe(true);
    got.push(part.code);
  }
  expect(new Set(got).size).toBe(10);
  const LG = await import('../src/index-headless.ts');
  const s: any = await (await call('/me/mia/state', 'GET', undefined, auth(c.owner))).json();
  const own = LG.resolve(s.seed);
  const want = LG.rareParts('mouth').map((i: number) => 'm' + i).find((code: string) => !s.parts.includes(code) && LG.readPart(code)!.index !== own.mouth)!;
  const cost = LG.partCost(LG.readPart(want)!);
  expect((await call('/me/mia/craft-part', 'POST', { part: want }, auth(c.owner))).status).toBe(402);
  env.db.exec(`UPDATE players SET metal = ${cost} WHERE key = 'mia'`);
  const made: any = await (await call('/me/mia/craft-part', 'POST', { part: want }, auth(c.owner))).json();
  expect(made.part.new).toBe(true);
  expect(made.metal).toBe(0);
  expect((await call('/me/mia/craft-part', 'POST', { part: want }, auth(c.owner))).status).toBe(409);
  expect((await call('/me/mia/look', 'POST', { look: '2:' + want }, auth(c.owner))).status).toBe(200);
});

test('without the parts table (before migration 0007) capsules still open', async () => {
  env.db.exec('DROP TABLE parts');
  const c = await claim('mia');
  for (let i = 0; i < 12; i++) expect((await call('/me/mia/open', 'POST', { game: 'puttsies' }, auth(c.owner))).status).toBe(201);
  const s: any = await (await call('/me/mia/state', 'GET', undefined, auth(c.owner))).json();
  expect(s.parts).toEqual([]);
});

test('TF2 crafting: smelt spare copies into metal, craft the item you want with its number, paint it', async () => {
  const c = await claim('mia');
  const ids: number[] = [];
  for (let i = 0; i < 12; i++) ids.push(((await (await call('/me/mia/open', 'POST', { game: 'puttsies' }, auth(c.owner))).json()) as any).copy.id);
  const s0: any = await (await call('/me/mia/state', 'GET', undefined, auth(c.owner))).json();
  expect(s0.metal).toBe(0);
  // Starters never smelt; capsule copies do, by grade.
  const starter = s0.copies.find((x: any) => x.source === 'starter').id;
  const sm: any = await (await call('/me/mia/smelt', 'POST', { ids: [...ids, starter] }, auth(c.owner))).json();
  expect(sm.metal).toBeGreaterThanOrEqual(9);
  const s1: any = await (await call('/me/mia/state', 'GET', undefined, auth(c.owner))).json();
  expect(s1.copies.some((x: any) => x.id === starter)).toBe(true);
  // Craft exactly what you want; each crafted copy is numbered.
  const cr = await call('/me/mia/craft', 'POST', { item: 'puttsies.flag' }, auth(c.owner));
  expect(cr.status).toBe(201);
  const made: any = await cr.json();
  expect(decode(made.copy.code)!.item).toBe('puttsies.flag');
  expect(decode(made.copy.code)!.craft).toBe(1);
  expect((await call('/me/mia/craft', 'POST', { item: 'trackdle.rocket' }, auth(c.owner))).status).toBe(400);
  // Paint it, then scrape it off for free.
  env.db.exec("UPDATE players SET metal = 5 WHERE key = 'mia'");
  const p: any = await (await call('/me/mia/paint', 'POST', { id: made.copy.id, paint: 'pink-as-heck' }, auth(c.owner))).json();
  expect(decode(p.copy.code)!.paint).toBe('pink-as-heck');
  expect(p.metal).toBe(2);
  const off: any = await (await call('/me/mia/paint', 'POST', { id: made.copy.id, paint: null }, auth(c.owner))).json();
  expect(decode(off.copy.code)!.paint).toBeUndefined();
  expect(off.metal).toBe(2);
  expect((await call('/me/mia/craft', 'POST', { item: 'puttsies.flag' }, auth(c.owner))).status).toBe(402);
});

test('before migration 0008, crafting says it isn’t open and nothing else changes', async () => {
  env.db.exec('ALTER TABLE players DROP COLUMN metal');
  const c = await claim('mia');
  expect((await call('/me/mia/craft', 'POST', { item: 'puttsies.flag' }, auth(c.owner))).status).toBe(503);
  expect((await call('/me/mia/open', 'POST', { game: 'puttsies' }, auth(c.owner))).status).toBe(201);
  const s: any = await (await call('/me/mia/state', 'GET', undefined, auth(c.owner))).json();
  expect(s.metal).toBe(0);
});
