import { test, expect, beforeEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { api } from './index.js';
import { readClub, statsSignature, READ_EVERY } from './card-stats.js';
import { createHmac } from 'node:crypto';
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


const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const state = async (c: any) => (await (await call('/me/mia/state', 'GET', undefined, auth(c.owner))).json()) as any;
// Once a name is linked to a sign-in its browser token no longer works, so the public page is read.
const pub = async () => (await (await call('/guys/mia')).json()) as any;
const wornOne = (s: any) => s.copies.find((x: any) => x.worn);

test('a copy counts the days it is worn, banks them as it comes off and never counts a day twice', async () => {
  const c = await claim('mia');
  let s = await state(c);
  const first = wornOne(s);
  expect(first.stats).toEqual({ worn: 1, games: 0, best: 0 });
  env.db.exec(`UPDATE copies SET worn_since = '${day(-3)}' WHERE id = ${first.id}`);
  expect(wornOne(await state(c)).stats.worn).toBe(4);
  // Another copy for the same slot: the first banks its four days.
  const other = s.copies.find((x: any) => !x.worn && x.slot === first.slot) ?? (await (await call('/me/mia/open', 'POST', { game: 'puttsies' }, auth(c.owner))).json() as any).copy;
  await call('/me/mia/wear', 'POST', { slot: other.slot, id: other.id }, auth(c.owner));
  if (other.slot !== first.slot) await call('/me/mia/wear', 'POST', { slot: first.slot, id: null }, auth(c.owner));
  s = await state(c);
  expect(s.copies.find((x: any) => x.id === first.id).stats.worn).toBe(4);
  expect(s.copies.find((x: any) => x.id === other.id).stats.worn).toBe(1);
  // Back on the same day: today is already counted.
  await call('/me/mia/wear', 'POST', { slot: first.slot, id: first.id }, auth(c.owner));
  expect((await state(c)).copies.find((x: any) => x.id === first.id).stats.worn).toBe(4);
  // Stats show on the public page too.
  const pub: any = await (await call('/guys/mia')).json();
  expect(pub.copies.find((x: any) => x.id === first.id).stats.worn).toBe(4);
});

test("club days go to the copies worn then: games finished, best score, and a Strange copy's tally", async () => {
  const c = await claim('mia');
  const s = await state(c);
  const worn = wornOne(s);
  const a = 'ab'.repeat(32), secret = 'x'.repeat(40);
  env.CLUB_SSO_SECRET = secret;
  env.db.exec(`UPDATE names SET account = '${a}' WHERE key = 'mia'`);
  env.db.exec(`UPDATE copies SET worn_since = '${day(-2)}', code = code || '~t0' WHERE id = ${worn.id}`);
  const asked: string[] = [];
  const fetcher = async (url: string) => { asked.push(url); return new Response(JSON.stringify({ days: [
    { day: day(-5), games: 5, score: 480 }, { day: day(-2), games: 3, score: 260 }, { day: day(-1), games: 6, score: 512 }] })); };
  const now = Date.now();
  await readClub(env, 'mia', now, fetcher as any);
  // Asked from the day it went on, signed as the club checks it (dle-club api/_lib/lilguys-sso.js).
  const u = new URL(asked[0]);
  expect(u.searchParams.get('a')).toBe(a);
  expect(u.searchParams.get('since')).toBe(day(-2));
  const t = u.searchParams.get('t');
  expect(u.searchParams.get('sig')).toBe(createHmac('sha256', secret).update(`stats.${a}.${day(-2)}.${t}`).digest('base64url'));
  const after = wornOne(await pub());
  expect(after.stats.games).toBe(9);
  expect(after.stats.best).toBe(512);
  expect(after.code).toMatch(/~t2(~|$)/);
  // Read again within ten minutes: the club isn't asked.
  await readClub(env, 'mia', now + 1000, fetcher as any);
  expect(asked).toHaveLength(1);
  // A copy that wasn't on gets none of it.
  const off = (await pub()).copies.find((x: any) => !x.worn);
  expect(off.stats.games).toBe(0);
  // Later: settled days aren't asked for again; the club failing changes nothing.
  await readClub(env, 'mia', now + READ_EVERY + 1, (async () => new Response('no', { status: 500 })) as any);
  expect(wornOne(await pub()).stats.best).toBe(512);
});

test('no club sign-in or no secret: nothing is asked', async () => {
  const c = await claim('mia');
  await state(c);
  let asked = 0;
  const fetcher = (async () => { asked++; return new Response('{"days":[]}'); }) as any;
  await readClub(env, 'mia', Date.now(), fetcher);
  env.CLUB_SSO_SECRET = 'y'.repeat(40);
  await readClub(env, 'mia', Date.now(), fetcher);
  expect(asked).toBe(0);
});

test('signatures match the club’s', async () => {
  const sig = await statsSignature('k'.repeat(40), 'cd'.repeat(32), '2026-10-01', 123);
  expect(sig).toBe(createHmac('sha256', 'k'.repeat(40)).update(`stats.${'cd'.repeat(32)}.2026-10-01.123`).digest('base64url'));
});
