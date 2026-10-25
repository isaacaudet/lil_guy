import { test, expect, beforeEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { api, RULES, todayGame } from './index.js';
import { readFileSync } from 'node:fs';

let env: any;
beforeEach(() => {
  const db = new Database(':memory:');
  for (const m of ['0001_names.sql', '0002_collections.sql']) db.exec(readFileSync(new URL(`../migrations/${m}`, import.meta.url), 'utf8'));
  env = { CLAIM_SALT: 'test-only-salt', FOUNDER_SECRET: 'test-only-founder', db, DB: { prepare(sql: string) {
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
  expect(body.tickets).toBe(RULES.start);
  expect((await call('/me/mia/open', 'POST', { game: todayGame(), free: true }, auth(c.owner))).status).toBe(409);
  const paid: any = await (await call('/me/mia/open', 'POST', { game: 'puttsies' }, auth(c.owner))).json();
  expect(paid.tickets).toBe(RULES.start - RULES.capsule);
  env.db.exec("UPDATE players SET tickets = 10 WHERE key = 'mia'");
  expect((await call('/me/mia/open', 'POST', { game: 'puttsies' }, auth(c.owner))).status).toBe(402);
  expect((await call('/me/mia/open', 'POST', { game: 'nope' }, auth(c.owner))).status).toBe(400);
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
  expect(f.seed).toBe('founder:isaac');
});
