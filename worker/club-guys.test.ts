import { test, expect, beforeEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { api } from './index.js';
import { guysSignature } from './club-guys.js';
import { readFileSync } from 'node:fs';
import { decode } from '../src/index-headless.ts';

let env: any;
beforeEach(() => {
  const db = new Database(':memory:');
  for (const m of ['0001_names.sql', '0002_collections.sql', '0003_google_accounts.sql', '0004_float_rank.sql', '0005_luck.sql', '0006_tags_swaps.sql', '0007_parts.sql', '0008_craft.sql', '0009_card_stats.sql']) db.exec(readFileSync(new URL(`../migrations/${m}`, import.meta.url), 'utf8'));
  env = { CLUB_SSO_SECRET: 'x'.repeat(40), CLAIM_SALT: 'test-only-salt', FOUNDER_SECRET: 'test-only-founder', db, DB: { async batch(statements: any[]) { db.exec('BEGIN'); try { const results = []; for (const statement of statements) results.push(await statement.run()); db.exec('COMMIT'); return results; } catch (e) { db.exec('ROLLBACK'); throw e; } }, prepare(sql: string) {
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

const A = 'a'.repeat(64), B = 'b'.repeat(64);
const ask = async (accounts: string[], { t = Math.floor(Date.now() / 1000), secret = env.CLUB_SSO_SECRET } = {}) =>
  call('/club/guys', 'POST', { a: accounts, t }, { 'X-Club-Signature': await guysSignature(secret, accounts, t) });

test('the club reads a linked player’s guy and what he has on, by his sign-in', async () => {
  await claim('mia');
  env.db.exec(`UPDATE names SET account = '${A}' WHERE key = 'mia'`);
  const r = await ask([A, B]);
  expect(r.status).toBe(200);
  const { guys } = (await r.json()) as any;
  expect(Object.keys(guys)).toEqual([A]);
  expect(guys[A].key).toBe('mia');
  expect(typeof guys[A].parts.head).toBe('number');
  const worn = env.db.prepare("SELECT code FROM copies WHERE key = 'mia' AND worn = 1 ORDER BY id").all().map((c: any) => c.code);
  expect(guys[A].worn).toEqual(worn);
  for (const code of guys[A].worn) expect(decode(code)).toBeTruthy();
});

test('an ask needs the club’s signature and must be fresh', async () => {
  expect((await ask([A], { secret: 'y'.repeat(40) })).status).toBe(403);
  expect((await ask([A], { t: Math.floor(Date.now() / 1000) - 600 })).status).toBe(400);
  expect((await call('/club/guys', 'POST', { a: [A], t: Math.floor(Date.now() / 1000) })).status).toBe(403);
  expect((await ask(['nope'])).status).toBe(400);
  env.CLUB_SSO_SECRET = '';
  expect((await ask([A], { secret: 'z'.repeat(40) })).status).toBe(503);
});

test('Twitch chat and the games read claimed names’ guys, publicly', async () => {
  await claim('mia');
  const r = await call('/club/named?n=Mia,nobody,x');
  expect(r.status).toBe(200);
  expect(r.headers.get('Access-Control-Allow-Origin')).toBe('*');
  const { guys } = (await r.json()) as any;
  expect(Object.keys(guys)).toEqual(['mia']);
  expect(typeof guys.mia.parts.head).toBe('number');
  const worn = env.db.prepare("SELECT code FROM copies WHERE key = 'mia' AND worn = 1 ORDER BY id").all().map((c: any) => c.code);
  expect(guys.mia.worn).toEqual(worn);
  expect((await call('/club/named?n=')).status).toBe(400);
  expect((await call('/club/named?n=mia', 'POST')).status).toBe(405);
});
