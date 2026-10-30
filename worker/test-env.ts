// A Worker's env for tests: D1 as an in-memory SQLite database with the migrations up to `upTo` applied, the
// site's page as a small stand-in, and helpers to claim names and sign them in to DLE Club.
import { Database } from 'bun:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import worker, { api } from './index.js';

/** Every migration, in order. */
export const MIGRATIONS = readdirSync(new URL('../migrations', import.meta.url)).filter(f => f.endsWith('.sql')).sort();
/** The site's page as the tests serve it: a head to put tags in, and a body the router reads. */
export const PAGE = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n</head>\n<body>\n<title>Lil Guys</title>\n<main id="router">the page</main>\n</body>\n</html>\n';

export function makeEnv(upTo = MIGRATIONS[MIGRATIONS.length - 1]) {
  const db = new Database(':memory:');
  const env: any = { CLAIM_SALT: 'test-only-salt', FOUNDER_SECRET: 'test-only-founder', db };
  env.migrate = (to: string) => { for (const m of MIGRATIONS.filter(m => m > (env.migrated || '') && m <= to)) { db.exec(readFileSync(new URL(`../migrations/${m}`, import.meta.url), 'utf8')); env.migrated = m; } };
  env.migrate(upTo);
  env.DB = {
    async batch(statements: any[]) { db.exec('BEGIN'); try { const results = []; for (const statement of statements) results.push(await statement.run()); db.exec('COMMIT'); return results; } catch (e) { db.exec('ROLLBACK'); throw e; } },
    prepare(sql: string) {
      let args: any[] = [];
      const statement = { bind(...values: any[]) { args = values; return statement; },
        async first() { return db.prepare(sql).get(...args); }, async all() { return { results: db.prepare(sql).all(...args) }; },
        async run() { const r = db.prepare(sql).run(...args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; } };
      return statement;
    },
  };
  env.ASSETS = { fetch: async (r: Request) => new URL(r.url).pathname === '/' ? new Response(PAGE, { headers: { 'Content-Type': 'text/html', ETag: '"page"' } }) : new Response('not found', { status: 404 }) };
  return env;
}

/** Calls the API as a browser at one address would. */
export const callWith = (env: any) => (path: string, method = 'GET', body?: any, headers: any = {}) => api(new Request('https://lilguys.test/api' + path, {
  method, headers: { 'CF-Connecting-IP': '192.0.2.1', 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined,
}), env);
/** Asks the Worker itself, as any page or link preview would. */
export const fetchWith = (env: any) => (path: string, init: RequestInit = {}) => worker.fetch(new Request('https://lilguys.test' + path, { ...init, headers: { 'CF-Connecting-IP': '192.0.2.9', ...(init.headers || {}) } }), env, { waitUntil() {} });

/** Claims a name and answers its owner headers. The founder's needs his secret. */
export async function claim(env: any, key: string) {
  const r: any = await (await callWith(env)('/names/' + key, 'POST', undefined, key === 'isaac' ? { 'X-Founder-Secret': 'test-only-founder' } : {})).json();
  return { Authorization: 'Bearer ' + r.owner };
}

let sessions = 0;
/** Signs a name in to DLE Club as if it had finished a game today, so it can give copies; answers its session's headers. */
export function signIn(env: any, key: string) {
  const account = createHash('sha256').update('google:' + key).digest('hex'), session = (++sessions).toString(16).padStart(64, '0');
  env.db.prepare('UPDATE names SET account = ? WHERE key = ?').run(account, key);
  env.db.prepare('INSERT INTO auth_sessions(hash, account, expires, created) VALUES (?, ?, ?, 0)').run(createHash('sha256').update(session).digest('hex'), account, Math.floor(Date.now() / 1000) + 3600);
  env.db.prepare("INSERT INTO club_days(holder, day, played, n, cleared) VALUES (?, ?, 'amountle', 1, 0) ON CONFLICT(holder, day) DO NOTHING").run(account, new Date().toISOString().slice(0, 10));
  return { Cookie: '__Host-lilguys-session=' + session };
}

/** Gives a name stamps from a club day, for tests that open capsules. */
export const stamps = (env: any, key: string, n: number) => env.db.prepare("INSERT INTO club_days(holder, day, played, n, cleared) VALUES ((SELECT COALESCE(account, key) FROM names WHERE key = ?), '2030-01-01', NULL, ?, 0) ON CONFLICT(holder, day) DO UPDATE SET n = n + excluded.n").run(key, n);
