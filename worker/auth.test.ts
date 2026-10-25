import { test, expect, beforeEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readFileSync } from 'node:fs';
import { generateKeyPair, SignJWT } from 'jose';
import worker, { api } from './index.js';
import { authApi, googleAccount, GOOGLE_CLIENT_ID, digest } from './auth.js';

const pair = await generateKeyPair('RS256');
let env: any;
beforeEach(() => {
  const db = new Database(':memory:');
  for (const file of ['0001_names.sql', '0002_collections.sql', '0003_google_accounts.sql', '0004_float_rank.sql']) db.exec(readFileSync(new URL('../migrations/' + file, import.meta.url), 'utf8'));
  env = { CLAIM_SALT: 'test-salt', FOUNDER_SECRET: 'founder-test', db, DB: { async batch(statements: any[]) { db.exec('BEGIN'); try { const results = []; for (const statement of statements) results.push(await statement.run()); db.exec('COMMIT'); return results; } catch (e) { db.exec('ROLLBACK'); throw e; } }, prepare(sql: string) {
    let args: any[] = [];
    const stmt = { bind(...v: any[]) { args = v; return stmt; },
      async first() { return db.prepare(sql).get(...args); }, async all() { return { results: db.prepare(sql).all(...args) }; },
      async run() { const r = db.prepare(sql).run(...args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; } };
    return stmt;
  } } };
});
const cookieFrom = (r: Response, name: string) => r.headers.getSetCookie().find(c => c.startsWith(name + '='))?.split(';')[0] || '';
const sessionCookie = (r: Response) => cookieFrom(r, '__Host-lilguys-session');
const nonceCookie = (r: Response) => cookieFrom(r, '__Host-lilguys-nonce');
const request = (path: string, method = 'GET', body?: any, cookie = '', headers = {}) => new Request('https://example.test/api' + path, {
  method, headers: { Origin: 'https://example.test', 'CF-Connecting-IP': '192.0.2.1', Cookie: cookie, 'Content-Type': 'application/json', ...headers },
  body: body === undefined ? undefined : JSON.stringify(body),
});
const call = (path: string, method = 'GET', body?: any, cookie = '', headers = {}) => api(request(path, method, body, cookie, headers), env);
const token = (nonce: string, sub = 'account-a', extra = {}) => new SignJWT({ nonce, ...extra }).setProtectedHeader({ alg: 'RS256', kid: 'test' })
  .setIssuer('https://accounts.google.com').setAudience(GOOGLE_CLIENT_ID).setSubject(sub).setIssuedAt().setExpirationTime('5m').sign(pair.privateKey);
const verify = (credential: string, client: string, nonce: string) => googleAccount(credential, client, nonce, async () => pair.publicKey);
async function start() {
  const response = await call('/auth/start', 'POST');
  return { nonce: (await response.json()).nonce, cookie: nonceCookie(response) };
}
async function login(sub = 'account-a', guest = {}, oldCookie = '') {
  const s = await start();
  const req = request('/auth/google', 'POST', { credential: await token(s.nonce, sub), ...guest }, [s.cookie, oldCookie].filter(Boolean).join('; '));
  return authApi(req, env, new URL(req.url), verify);
}
const claim = async (key = 'mia', cookie = '') => (await (await call('/names/' + key, 'POST', undefined, cookie)).json()) as any;

test('links an existing name without changing its guy, tickets, copies or worn look; restores on another device', async () => {
  const guest = await claim();
  await call('/me/mia/open', 'POST', { game: 'puttsies' }, '', { Authorization: 'Bearer ' + guest.owner });
  const before = await (await call('/me/mia/state', 'GET', undefined, '', { Authorization: 'Bearer ' + guest.owner })).json();
  const linked = await login('account-a', { key: 'mia', ownerToken: guest.owner });
  expect(linked.status).toBe(200);
  expect(linked.headers.getSetCookie().every(c => c.includes('Secure; HttpOnly; SameSite=Lax'))).toBe(true);
  const again = await login();
  const restored = await (await call('/me/mia/state', 'GET', undefined, sessionCookie(again))).json();
  expect(restored).toEqual(before);
  expect((await call('/me/mia/state', 'GET', undefined, '', { Authorization: 'Bearer ' + guest.owner })).status).toBe(401);
  const raw = env.db.query('SELECT account FROM names').get();
  expect(raw.account).toBe(await digest('google:account-a'));
  expect(JSON.stringify(await (await call('/guys')).json())).not.toContain(raw.account);
  expect((await call('/me/mia/state', 'GET', undefined, sessionCookie(await login('account-b')))).status).toBe(401);
});

test('signing in before claiming binds the new name and only permits one name per Google account', async () => {
  const response = await login(); const cookie = sessionCookie(response);
  expect((await response.json()).name).toBeNull();
  const c = await claim('mia', cookie);
  expect(c.linked).toBe(true); expect(c.owner).toBeNull();
  expect((await call('/names/bo', 'POST', undefined, cookie)).status).toBe(409);
  expect((await call('/names/bo')).status).toBe(404);
  expect((await call('/me/mia/state', 'GET', undefined, sessionCookie(await login()))).status).toBe(200);
  expect((await call('/names/isaac', 'POST', undefined, sessionCookie(await login('founder')))).status).toBe(403);
});

test('rejects guessed ownership, an already-linked name, and conflicting names without moving collections', async () => {
  const a = await claim('mia'), b = await claim('bo');
  expect((await login('account-a', { key: 'mia', ownerToken: 'a'.repeat(64) })).status).toBe(403);
  expect((await login('account-a', { key: 'mia', ownerToken: a.owner })).status).toBe(200);
  expect((await login('account-b', { key: 'mia', ownerToken: a.owner })).status).toBe(403);
  const conflict = await login('account-a', { key: 'bo', ownerToken: b.owner });
  expect(conflict.status).toBe(409); expect((await conflict.json()).savedKey).toBe('mia');
  expect(env.db.query("SELECT account FROM names WHERE key='bo'").get().account).toBeNull();
  expect((await call('/me/bo/state', 'GET', undefined, '', { Authorization: 'Bearer ' + b.owner })).status).toBe(200);
});

test('one-use nonce is bound to the browser cookie and rejects replay, wrong nonce and expired challenge', async () => {
  const s = await start(), credential = await token(s.nonce);
  const run = (cookie: string) => { const req = request('/auth/google', 'POST', { credential }, cookie); return authApi(req, env, new URL(req.url), verify); };
  expect((await run('')).status).toBe(401);
  expect((await run((await start()).cookie)).status).toBe(401);
  expect((await run(s.cookie)).status).toBe(200);
  expect((await run(s.cookie)).status).toBe(401);
  const old = await start(); env.db.exec('UPDATE auth_nonces SET expires=0');
  const req = request('/auth/google', 'POST', { credential: await token(old.nonce) }, old.cookie);
  expect((await authApi(req, env, new URL(req.url), verify)).status).toBe(401);
});

test('real signature verification rejects foreign audience, issuer, future/expired tokens, wrong nonce and forged signature', async () => {
  const nonce = 'n';
  expect(await googleAccount(await token(nonce), GOOGLE_CLIENT_ID, nonce, async () => pair.publicKey)).toBe(await digest('google:account-a'));
  const make = (claims: any) => new SignJWT({ sub: 'a', aud: GOOGLE_CLIENT_ID, iss: 'https://accounts.google.com', exp: Math.floor(Date.now()/1000)+300, iat: Math.floor(Date.now()/1000), nonce, ...claims }).setProtectedHeader({ alg: 'RS256' }).sign(pair.privateKey);
  for (const claims of [{ aud: 'foreign' }, { iss: 'foreign' }, { exp: 1 }, { iat: Math.floor(Date.now()/1000)+600 }, { nonce: 'other' }, { sub: '' }]) {
    await expect(googleAccount(await make(claims), GOOGLE_CLIENT_ID, nonce, async () => pair.publicKey)).rejects.toThrow();
  }
  const other = await generateKeyPair('RS256');
  await expect(googleAccount(await token(nonce), GOOGLE_CLIENT_ID, nonce, async () => other.publicKey)).rejects.toThrow();
});

test('logout revokes only this device; expiration denies access; Google account switching requires logout', async () => {
  const a = sessionCookie(await login()); const b = sessionCookie(await login());
  await claim('mia', a);
  expect((await login('account-b', {}, a)).status).toBe(409);
  expect((await call('/auth/logout', 'POST', {}, a)).status).toBe(200);
  expect((await call('/me/mia/state', 'GET', undefined, a)).status).toBe(401);
  expect((await call('/me/mia/state', 'GET', undefined, b)).status).toBe(200);
  env.db.exec('UPDATE auth_sessions SET expires=0');
  expect((await call('/me/mia/state', 'GET', undefined, b)).status).toBe(401);
});

test('cross-origin sign-in, logout, owner writes and claims are rejected; no-Origin auth writes are rejected', async () => {
  for (const path of ['/auth/start', '/auth/google', '/auth/logout']) {
    expect((await call(path, 'POST', {}, '', { Origin: 'https://evil.test' })).status).toBe(403);
    const req = request(path, 'POST', {}); req.headers.delete('Origin');
    expect((await api(req, env)).status).toBe(403);
  }
  const cookie = sessionCookie(await login()); await claim('mia', cookie);
  expect((await call('/me/mia/open', 'POST', { game: 'puttsies' }, cookie, { Origin: 'https://evil.test' })).status).toBe(403);
  expect((await call('/names/mia', 'DELETE', undefined, cookie, { Origin: 'https://evil.test' })).status).toBe(403);
});

test('released name cannot be accessed with the previous Google session after someone else claims it', async () => {
  const cookie = sessionCookie(await login()); await claim('mia', cookie);
  expect((await call('/names/mia', 'DELETE', undefined, cookie)).status).toBe(200);
  const next = await claim('mia');
  expect((await call('/me/mia/state', 'GET', undefined, cookie)).status).toBe(401);
  expect((await call('/me/mia/state', 'GET', undefined, '', { Authorization: 'Bearer ' + next.owner })).status).toBe(200);
});

test('auth attempts are limited separately from name claims; session cookie is never a stored credential', async () => {
  const response = await login(); const cookie = sessionCookie(response);
  const raw = cookie.split('=')[1];
  expect(env.db.query('SELECT hash FROM auth_sessions').get().hash).toBe(await digest(raw));
  const s = await start();
  env.db.exec('UPDATE claim_limits SET attempts=120');
  expect((await call('/auth/start', 'POST')).status).toBe(429);
  expect((await call('/names/mia', 'POST')).status).toBe(201);
  expect(JSON.stringify(env.db.query('SELECT * FROM claim_limits').all())).not.toContain('192.0.2.1');
});
