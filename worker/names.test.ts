import { test, expect, beforeEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { api } from './index.js';
import { readFileSync } from 'node:fs';
let env: any;
beforeEach(() => {
  const db = new Database(':memory:');
  db.exec(readFileSync(new URL('../migrations/0001_names.sql', import.meta.url), 'utf8'));
  env = { CLAIM_SALT: 'test-only-salt', FOUNDER_SECRET: 'test-only-founder', DB: { prepare(sql: string) {
    let args: any[] = [];
    const statement = { bind(...values: any[]) { args = values; return statement; },
      async first() { return db.prepare(sql).get(...args); }, async all() { return { results: db.prepare(sql).all(...args) }; },
      async run() { const r = db.prepare(sql).run(...args); return { meta: { changes: r.changes } }; } };
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
