import { test, expect, beforeEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { api, RULES, todayGame } from './index.js';
import { readFileSync } from 'node:fs';
import { decode, encode } from '../src/index-headless.ts';

let env: any;
beforeEach(() => {
  const db = new Database(':memory:');
  for (const m of ['0001_names.sql', '0002_collections.sql', '0003_google_accounts.sql', '0004_float_rank.sql', '0005_luck.sql']) db.exec(readFileSync(new URL(`../migrations/${m}`, import.meta.url), 'utf8'));
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

test('a claim makes a player with tickets and nine starters, one worn', async () => {
  const c = await claim('mia');
  const s: any = await (await call('/me/mia/state', 'GET', undefined, auth(c.owner))).json();
  expect(s.tickets).toBe(RULES.start);
  expect(s.copies).toHaveLength(9);
  expect(s.copies.filter((x: any) => x.worn)).toHaveLength(1);
  expect(s.copies.every((x: any) => x.source === 'starter')).toBe(true);
  expect((await call('/me/mia/state')).status).toBe(401);
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
  expect(got.copy.grade).toBe(1);
  expect(got.copy.source).toBe('trade');
  const left: any = await (await call('/me/mia/state', 'GET', undefined, auth(c.owner))).json();
  expect(left.copies.some((x: any) => five.includes(x.id))).toBe(false);
  // Traded copies are gone: the same five cannot trade again.
  expect((await call('/me/mia/trade', 'POST', { ids: five }, auth(c.owner))).status).toBe(404);
  expect((await call('/me/mia/trade', 'POST', { ids: five })).status).toBe(401);
  expect(b.owner).toBeTruthy();
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
  expect(prof.copies).toHaveLength(10);
  const market: any = await (await call('/market?sort=rarest')).json();
  expect(market).toHaveLength(1);
  expect(market[0].key).toBe('mia');
  expect((await (await call('/market?key=bo')).json() as any)).toHaveLength(0);
  const s: any = await (await call('/stats')).json();
  expect(s.players).toBe(2);
  expect(s.copies).toBe(1);
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
