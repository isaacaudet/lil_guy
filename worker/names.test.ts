import { test, expect, beforeEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { api } from './index.js';
import { readFileSync } from 'node:fs';
let env: any;
beforeEach(() => {
  const db = new Database(':memory:');
  for (const m of ['0001_names.sql', '0002_collections.sql', '0003_google_accounts.sql', '0004_float_rank.sql', '0005_luck.sql', '0006_tags_swaps.sql', '0007_parts.sql', '0008_craft.sql', '0009_card_stats.sql', '0010_stamps.sql']) db.exec(readFileSync(new URL(`../migrations/${m}`, import.meta.url), 'utf8'));
  env = { CLAIM_SALT: 'test-only-salt', FOUNDER_SECRET: 'test-only-founder', DB: { async batch(statements: any[]) { db.exec('BEGIN'); try { const results = []; for (const statement of statements) results.push(await statement.run()); db.exec('COMMIT'); return results; } catch (e) { db.exec('ROLLBACK'); throw e; } }, prepare(sql: string) {
    let args: any[] = [];
    const statement = { bind(...values: any[]) { args = values; return statement; },
      async first() { return db.prepare(sql).get(...args); }, async all() { return { results: db.prepare(sql).all(...args) }; },
      async run() { const r = db.prepare(sql).run(...args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; } };
    return statement;
  } }, db };
});
const call = (path: string, method='GET', headers={}) => api(new Request('https://example.test/api/names'+path, {method, headers:{'CF-Connecting-IP':'192.0.2.1', ...headers}}),env);
test('claims are atomic, public reads omit owner, and only owner can release', async () => {
  const first=await call('/tester','POST'); expect(first.status).toBe(201);
  const body=await first.json(); expect(body.owner).toHaveLength(64);
  expect((await call('/tester','POST')).status).toBe(409);
  const publicName=await (await call('/tester')).json(); expect(publicName.owner).toBeUndefined(); expect(publicName.seed).toBe(body.seed);
  expect((await (await call('?recent=12')).json())[0].owner).toBeUndefined();
  expect((await call('/tester','DELETE')).status).toBe(401);
  expect((await call('/tester','DELETE',{Authorization:'Bearer '+'a'.repeat(64)})).status).toBe(403);
  expect((await call('/tester','DELETE',{Authorization:'Bearer '+body.owner})).status).toBe(200);
  expect((await call('/tester')).status).toBe(404);
});
test('founder reservation requires server secret', async () => {
  expect((await call('/isaac','POST')).status).toBe(403);
  const r=await call('/isaac','POST',{'X-Founder-Secret':'test-only-founder'}); expect(r.status).toBe(201);
  expect((await r.json()).seed).toBe('founder:isaac');
});
test('daily IP cap counts failed attempts and stores only daily digests', async () => {
  for(let i=0;i<10;i++) await call('/same','POST');
  expect((await call('/another','POST')).status).toBe(429);
  const row=env.db.query('SELECT * FROM claim_limits').get(); expect(row.hash).toHaveLength(64); expect(JSON.stringify(row)).not.toContain('192.0.2.1');
});
test('rejects cross-origin writes and malformed keys', async () => {
  expect((await call('/tester','POST',{Origin:'https://other.test'})).status).toBe(403);
  expect((await call('/UPPER','POST')).status).toBe(404);
  expect((await call('/tester','PUT')).status).toBe(405);
});
test('underscores only between letters, one at a time, and grandfathered names keep theirs', async () => {
  for (const bad of ['/_cool', '/cool_', '/cool__guy']) expect((await call(bad, 'POST')).status).toBe(404);
  // Claimed before underscores: `cool_guy` was kept as `coolguy`.
  const old = await (await call('/coolguy', 'POST')).json();
  expect((await call('/cool_guy', 'POST')).status).toBe(409);
  expect((await call('/c_ool_guy', 'POST')).status).toBe(409);
  // A name with underscores nobody holds finds the grandfathered guy.
  const found = await (await call('/cool_guy')).json();
  expect(found.key).toBe('coolguy'); expect(found.seed).toBe(old.seed);
  // New underscore names, and their skeleton is then taken too.
  expect((await call('/snow_pea', 'POST')).status).toBe(201);
  expect((await call('/snowpea', 'POST')).status).toBe(409);
  expect((await call('/i_saac', 'POST')).status).toBe(403);
});
test('names that hold a blocked word whole or at a word’s start are refused; ones that merely contain one pass', async () => {
  let ip = 10;
  const claim = (key: string) => call('/' + key, 'POST', { 'CF-Connecting-IP': `198.51.100.${ip++}` });
  for (const bad of ['fuck', 'fuckface', 'big_fuck', 'sh1thead', 'n4zi', 'cool_dick', 'spic']) expect((await claim(bad)).status).toBe(403);
  for (const fine of ['grape', 'peacock', 'spicy', 'dickens', 'scrape', 'cocktail']) expect((await claim(fine)).status).toBe(201);
});
test('isaac and every name starting with it, dleclub, lilguys and founder are reserved', async () => {
  let ip = 40;
  const claim = (key: string) => call('/' + key, 'POST', { 'CF-Connecting-IP': `198.51.100.${ip++}` });
  for (const key of ['isaac1', 'isaacaudet', 'isaac_audet', '1saac', 'is4ac', 'dleclub', 'dle_club', 'lilguys', 'lil_guys', 'l1lguys', 'founder']) {
    const r = await claim(key);
    expect(r.status).toBe(403);
    expect((await r.json()).error).toBe('This name is reserved');
  }
  expect((await claim('isa')).status).toBe(201);
});
test('the founder can take any name down with the founder secret, as its owner would let it go', async () => {
  const body = await (await call('/tester', 'POST')).json();
  env.db.prepare("INSERT INTO parts(key, code, at) VALUES ('tester', 'e12', '2026-10-30')").run();
  expect((await call('/tester', 'DELETE', { 'X-Founder-Secret': 'wrong' })).status).toBe(403);
  expect((await call('/tester')).status).toBe(200);
  expect((await call('/tester', 'DELETE', { 'X-Founder-Secret': 'test-only-founder' })).status).toBe(200);
  expect((await call('/tester')).status).toBe(404);
  expect(env.db.query("SELECT (SELECT COUNT(*) FROM copies WHERE key = 'tester') + (SELECT COUNT(*) FROM players WHERE key = 'tester') + (SELECT COUNT(*) FROM parts WHERE key = 'tester') AS n").get().n).toBe(0);
  expect((await call('/tester', 'DELETE', { 'X-Founder-Secret': 'test-only-founder' })).status).toBe(404);
  // The old owner's token holds nothing now.
  expect((await call('/tester', 'DELETE', { Authorization: 'Bearer ' + body.owner })).status).toBe(403);
});
test('a failure is logged by its route, never a name', async () => {
  const { routeOf } = await import('./index.js');
  expect(routeOf('/api/me/snow_pea/open')).toBe('/api/me/:key/open');
  expect(routeOf('/api/names/mia')).toBe('/api/names/:key');
  expect(routeOf('/api/guys/mia')).toBe('/api/guys/:key');
  expect(routeOf('/g/7/@mia/card')).toBe('/g/');
  expect(routeOf('/api/club/named')).toBe('/api/club/named');
});
