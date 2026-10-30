import { test, expect, beforeEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { api, RULES } from './index.js';
import { readClub } from './card-stats.js';
import { giveStarter, linkStamps, stampDay, STAMPS_FROM, STARTER_STAMPS } from './stamps.js';

const MIGRATIONS = ['0001_names.sql', '0002_collections.sql', '0003_google_accounts.sql', '0004_float_rank.sql', '0005_luck.sql', '0006_tags_swaps.sql', '0007_parts.sql', '0008_craft.sql', '0009_card_stats.sql', '0010_stamps.sql'];
let env: any;
function makeEnv(migrations = MIGRATIONS) {
  const db = new Database(':memory:');
  for (const m of migrations) db.exec(readFileSync(new URL(`../migrations/${m}`, import.meta.url), 'utf8'));
  return { CLAIM_SALT: 'test-only-salt', FOUNDER_SECRET: 'test-only-founder', db, DB: { async batch(statements: any[]) { db.exec('BEGIN'); try { const results = []; for (const statement of statements) results.push(await statement.run()); db.exec('COMMIT'); return results; } catch (e) { db.exec('ROLLBACK'); throw e; } }, prepare(sql: string) {
    let args: any[] = [];
    const statement = { bind(...values: any[]) { args = values; return statement; },
      async first() { return db.prepare(sql).get(...args); }, async all() { return { results: db.prepare(sql).all(...args) }; },
      async run() { const r = db.prepare(sql).run(...args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; } };
    return statement;
  } } };
}
beforeEach(() => { env = makeEnv(); });
const call = (path: string, method = 'GET', body?: any, headers: any = {}) => api(new Request('https://example.test/api' + path, {
  method, headers: { 'CF-Connecting-IP': '192.0.2.1', 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined,
}), env);
const claim = async (key: string) => (await (await call('/names/' + key, 'POST')).json()) as any;
// A linked name is signed in with a Google session; its browser token no longer works.
const auth = (t: string) => t.startsWith('session:') ? { Cookie: '__Host-lilguys-session=' + t.slice(8) } : { Authorization: 'Bearer ' + t };
const stamps = async (key: string, owner: string) => ((await (await call(`/me/${key}/state`, 'GET', undefined, auth(owner))).json()) as any).stamps;
const ACCOUNT = 'ab'.repeat(32);
// Links a name to a Google sign-in, signed in.
function link(key: string, account = ACCOUNT, session = 'cd'.repeat(32)) {
  env.CLUB_SSO_SECRET = 'x'.repeat(40);
  env.db.exec(`UPDATE names SET account = '${account}' WHERE key = '${key}'`);
  env.db.prepare('INSERT OR IGNORE INTO auth_sessions(hash, account, expires, created) VALUES (?, ?, ?, 0)').run(createHash('sha256').update(session).digest('hex'), account, Math.floor(Date.now() / 1000) + 3600);
  return { owner: 'session:' + session };
}
// A name with a Google sign-in, and the club's answer for it.
async function linked(key: string, days: any[]) {
  await claim(key);
  const c = link(key);
  const asked: string[] = [];
  const fetcher = async (url: string) => { asked.push(url); return new Response(JSON.stringify({ days })); };
  await readClub(env, key, Date.now(), fetcher as any);
  return { c, asked };
}
const CORE = ['amountle', 'puttsies', 'weighsies', 'stackdle', 'halfsies'];

test('every player starts with ten stamps: two mystery capsules', () => {
  expect(STARTER_STAMPS).toBe(10);
  expect(RULES).toMatchObject({ stamps: 10, mystery: 5, capsule: 8, seasonal: 8 });
  expect(STARTER_STAMPS / RULES.mystery).toBe(2);
});

test('a stamp for each club game finished from the first day on, typed by game, and two gold for a cleared gauntlet', async () => {
  const { c, asked } = await linked('mia', [
    // Before stamps began: none.
    { day: '2026-10-28', games: 5, score: 400, played: CORE, cleared: true },
    { day: STAMPS_FROM, games: 8, score: 600, played: [...CORE, 'slicies', 'flipsies'], cleared: true },
    { day: '2026-10-30', games: 3, score: 210, played: ['amountle', 'tiltsies', 'puttsies'], cleared: false },
  ]);
  // Read from the first day of stamps.
  expect(new URL(asked[0]).searchParams.get('since')).toBe(STAMPS_FROM);
  const s = await stamps('mia', c.owner);
  expect(s).toMatchObject({ ready: true, linked: true, gold: 2, other: 0, earned: 10 + 7 + 2 + 3, balance: 22 });
  // Cutsies' club id is slicies; its stamps are Cutsies'.
  expect(s.games).toEqual({ amountle: 2, puttsies: 2, weighsies: 1, stackdle: 1, halfsies: 1, cutsies: 1, flipsies: 1, tiltsies: 1 });
});

test('a club endpoint without played or cleared gives a stamp per game counted, eight a day at most, and no gold', async () => {
  const { c } = await linked('mia', [{ day: STAMPS_FROM, games: 5, score: 400 }, { day: '2026-10-30', games: 11, score: 900 }]);
  expect(await stamps('mia', c.owner)).toMatchObject({ balance: 10 + 5 + 8, other: 13, gold: 0, games: {} });
  expect(stampDay({ day: 'nope', games: 2 })).toBeNull();
  expect(stampDay({ day: STAMPS_FROM, played: ['amountle', 'amountle', 7, 'BAD'], cleared: true })).toEqual({ played: ['amountle'], n: 1, cleared: 1 });
});

test('a day read again only ever gains, and a newer read sorts old stamps by game', async () => {
  const { c } = await linked('mia', [{ day: STAMPS_FROM, games: 2, score: 150 }]);
  expect((await stamps('mia', c.owner)).other).toBe(2);
  const later = Date.now() + 11 * 60 * 1000;
  await readClub(env, 'mia', later, (async () => new Response(JSON.stringify({ days: [{ day: STAMPS_FROM, games: 5, score: 400, played: CORE, cleared: true }] }))) as any);
  expect(await stamps('mia', c.owner)).toMatchObject({ balance: 10 + 5 + 2, other: 0, gold: 2 });
  // The club failing, or answering with less, takes nothing back.
  await readClub(env, 'mia', later + 11 * 60 * 1000, (async () => new Response(JSON.stringify({ days: [{ day: STAMPS_FROM, games: 1, score: 50, played: ['amountle'], cleared: false }] }))) as any);
  await readClub(env, 'mia', later + 22 * 60 * 1000, (async () => new Response('no', { status: 500 })) as any);
  expect(await stamps('mia', c.owner)).toMatchObject({ balance: 17, gold: 2 });
});

test('spending: a mystery capsule takes five, a picked machine eight, and short says how many more', async () => {
  const { c } = await linked('mia', [{ day: STAMPS_FROM, games: 5, score: 400, played: CORE, cleared: true }]);
  // 17 stamps: a mystery capsule and a picked machine leave four.
  expect((await call('/me/mia/open', 'POST', { mystery: true }, auth(c.owner))).status).toBe(201);
  const picked: any = await (await call('/me/mia/open', 'POST', { game: 'stackdle' }, auth(c.owner))).json();
  expect(picked.stamps.balance).toBe(4);
  // Per-game counts stay what was earned: spending ignores type.
  expect(picked.stamps.games.amountle).toBe(1);
  const short = await call('/me/mia/open', 'POST', { mystery: true }, auth(c.owner));
  expect(short.status).toBe(402);
  expect(await short.json()).toMatchObject({ error: '1 more stamp: play a game on DLE Club.', need: 1 });
  expect(env.db.query(`SELECT what, stamps FROM stamp_ledger WHERE holder = '${ACCOUNT}' ORDER BY id`).all()).toEqual([{ what: 'starter', stamps: 10 }, { what: 'mystery', stamps: -5 }, { what: 'machine:stackdle', stamps: -8 }]);
});

test('two spends at once never take the same stamps', async () => {
  const c = await claim('mia');
  // Ten stamps: two mystery capsules, however many are asked for at once.
  const all = await Promise.all([0, 1, 2, 3].map(() => call('/me/mia/open', 'POST', { mystery: true }, auth(c.owner))));
  expect(all.map(r => r.status).sort()).toEqual([201, 201, 402, 402]);
  expect(await stamps('mia', c.owner)).toMatchObject({ balance: 0, spent: 10 });
  expect(env.db.query("SELECT COUNT(*) AS n FROM copies WHERE key = 'mia' AND source = 'capsule'").get().n).toBe(2);
});

test('with no club sign-in the club is never asked, and short says how to earn them', async () => {
  const c = await claim('mia');
  env.CLUB_SSO_SECRET = 'x'.repeat(40);
  let asked = 0;
  await readClub(env, 'mia', Date.now(), (async () => { asked++; return new Response('{"days":[]}'); }) as any);
  expect(asked).toBe(0);
  const s = await stamps('mia', c.owner);
  expect(s).toMatchObject({ linked: false, balance: 10 });
  await call('/me/mia/open', 'POST', { game: 'puttsies' }, auth(c.owner));
  const short: any = await (await call('/me/mia/open', 'POST', { game: 'puttsies' }, auth(c.owner))).json();
  expect(short.error).toBe('6 more stamps. Sign in to DLE Club and play to earn stamps.');
});

test('the founder has unlimited stamps and never spends any', async () => {
  const f: any = await (await call('/names/isaac', 'POST', undefined, { 'X-Founder-Secret': 'test-only-founder' })).json();
  for (let i = 0; i < 6; i++) expect((await call('/me/isaac/open', 'POST', i % 2 ? { mystery: true } : { game: 'pets' }, auth(f.owner))).status).toBe(201);
  expect(await stamps('isaac', f.owner)).toMatchObject({ unlimited: true, spent: 0, balance: 10 });
});

test('letting a name go takes its stamps with it', async () => {
  const c = await claim('mia');
  await call('/me/mia/open', 'POST', { mystery: true }, auth(c.owner));
  env.db.exec(`INSERT INTO club_days(holder, day, played, n, cleared) VALUES ('mia', '${STAMPS_FROM}', 'amountle', 1, 0)`);
  expect((await call('/names/mia', 'DELETE', undefined, auth(c.owner))).status).toBe(200);
  expect(env.db.query("SELECT (SELECT COUNT(*) FROM club_days) + (SELECT COUNT(*) FROM stamp_ledger WHERE holder = 'mia') AS n").get().n).toBe(0);
  const again = await claim('mia');
  expect((await stamps('mia', again.owner)).balance).toBe(10);
});

test('before 0010, nothing breaks: no stamps to show, paid capsules wait, crafting and card stats carry on', async () => {
  env = makeEnv(MIGRATIONS.slice(0, -1));
  await claim('mia');
  const c = link('mia');
  let s: any = await (await call('/me/mia/state', 'GET', undefined, auth(c.owner))).json();
  expect(s.stamps).toMatchObject({ ready: false, balance: 0, linked: true });
  // The card stats still read the club, from the day the worn copy went on.
  const today = new Date().toISOString().slice(0, 10), asked: string[] = [];
  await readClub(env, 'mia', Date.now() + 11 * 60 * 1000, (async (url: string) => { asked.push(url); return new Response(JSON.stringify({ days: [{ day: today, games: 3, score: 200, played: CORE.slice(0, 3), cleared: false }] })); }) as any);
  expect(new URL(asked[0]).searchParams.get('since')).toBe(today);
  s = await (await call('/me/mia/state', 'GET', undefined, auth(c.owner))).json();
  expect(s.copies.find((x: any) => x.worn).stats.games).toBe(3);
  const paid = await call('/me/mia/open', 'POST', { mystery: true }, auth(c.owner));
  expect(paid.status).toBe(503);
  expect(((await paid.json()) as any).error).toBe('Stamps aren’t open yet');
  // With no club days kept the rule can't be checked, so today's free capsule stays open.
  expect((await call('/me/mia/open', 'POST', { game: s.todayGame, free: true }, auth(c.owner))).status).toBe(201);
  expect((await call('/me/mia/craft', 'POST', { item: 'puttsies.flag' }, auth(c.owner))).status).toBe(402);
  expect((await call('/names/mia', 'DELETE', undefined, auth(c.owner))).status).toBe(200);
  const f: any = await (await call('/names/isaac', 'POST', undefined, { 'X-Founder-Secret': 'test-only-founder' })).json();
  expect((await call('/me/isaac/open', 'POST', { mystery: true }, auth(f.owner))).status).toBe(201);
});

test('players from before stamps keep everything and are given the same ten once; no ticket carries over', async () => {
  const c = await claim('old');
  const at = new Date().toISOString();
  // As they were before stamps: claimed in October, tickets, metal, luck counters, a copy, and no starter yet.
  env.db.exec("UPDATE names SET at = '2026-10-20T10:00:00.000Z' WHERE key = 'old'");
  env.db.exec("UPDATE players SET tickets = 4321, metal = 7, opened = 12, dry = 9 WHERE key = 'old'");
  env.db.exec("DELETE FROM stamp_ledger WHERE holder = 'old'");
  env.db.prepare("INSERT INTO copies(key, code, item, game, slot, finish, grade, one_in, scuff, source, worn, at) VALUES ('old', 'amountle.crown~plain~0.5000000~1', 'amountle.crown', 'amountle', 'hat', 'plain', 0, 100, 0.5, 'capsule', 0, ?)").run(at);
  const before = env.db.query("SELECT COUNT(*) AS n FROM copies WHERE key = 'old'").get().n;
  // Club games before stamps began are not backdated.
  env.db.exec("INSERT INTO club_days(holder, day, played, n, cleared) VALUES ('old', '2026-10-27', 'amountle,puttsies,weighsies,stackdle,halfsies', 5, 1)");
  const s = await stamps('old', c.owner);
  expect(s).toMatchObject({ balance: 10, carried: true, gold: 0 });
  // Loading again, or many loads at once, never gives it twice.
  await Promise.all([0, 1, 2].map(() => call('/me/old/state', 'GET', undefined, auth(c.owner))));
  await giveStarter(env, 'old');
  expect((await stamps('old', c.owner)).balance).toBe(10);
  expect(env.db.query("SELECT COUNT(*) AS n FROM stamp_ledger WHERE holder = 'old' AND what = 'starter'").get().n).toBe(1);
  const state: any = await (await call('/me/old/state', 'GET', undefined, auth(c.owner))).json();
  expect(state.copies).toHaveLength(before);
  expect(state.metal).toBe(7);
  expect(env.db.query("SELECT opened, dry FROM players WHERE key = 'old'").get()).toEqual({ opened: 12, dry: 9 });
  // A player claimed after stamps began gets the same ten, once, and isn't told about tickets.
  const n = await claim('newbie');
  env.db.exec("UPDATE names SET at = '2026-11-02T10:00:00.000Z' WHERE key = 'newbie'");
  await call('/me/newbie/state', 'GET', undefined, auth(n.owner));
  expect(await stamps('newbie', n.owner)).toMatchObject({ balance: 10, carried: false });
  expect(env.db.query("SELECT COUNT(*) AS n FROM stamp_ledger WHERE holder = 'newbie' AND what = 'starter'").get().n).toBe(1);
});

test('a player who loaded before 0010 is given the ten once it is applied', async () => {
  env = makeEnv(MIGRATIONS.slice(0, -1));
  const c = await claim('mia');
  expect((await stamps('mia', c.owner)).ready).toBe(false);
  env.db.exec(readFileSync(new URL('../migrations/0010_stamps.sql', import.meta.url), 'utf8'));
  expect((await stamps('mia', c.owner)).balance).toBe(10);
  expect((await stamps('mia', c.owner)).balance).toBe(10);
});

// ------------------------------------------------------------ today's free capsule
const utcToday = () => new Date().toISOString().slice(0, 10);
const openFree = async (key: string, owner: string) => {
  const s: any = await (await call(`/me/${key}/state`, 'GET', undefined, auth(owner))).json();
  return call(`/me/${key}/open`, 'POST', { game: s.todayGame, free: true }, auth(owner));
};

test('today’s gauntlet cleared opens one free capsule, and its extras a second', async () => {
  const { c } = await linked('mia', [{ day: utcToday(), games: 5, score: 400, played: CORE, cleared: true, extras: false }]);
  const s: any = await (await call('/me/mia/state', 'GET', undefined, auth(c.owner))).json();
  expect(s.freeCapsule).toEqual({ open: true, why: '', earned: 1, used: 0 });
  const r = await openFree('mia', c.owner);
  expect(r.status).toBe(201);
  const body: any = await r.json();
  expect(body.freeDay).toBe(utcToday());
  expect(body.freeCapsule).toEqual({ open: false, why: 'Finish today’s extras on DLE Club for a second.', earned: 1, used: 1 });
  expect((await openFree('mia', c.owner)).status).toBe(403);
  // The extras finished: the club says so, and the second opens; never a third.
  await readClub(env, 'mia', Date.now() + 11 * 60 * 1000, (async () => new Response(JSON.stringify({ days: [{ day: utcToday(), games: 8, score: 600, played: [...CORE, 'slicies', 'flipsies', 'tiltsies'], cleared: true, extras: true }] }))) as any);
  const second = await openFree('mia', c.owner);
  expect(second.status).toBe(201);
  expect(((await second.json()) as any).freeCapsule).toEqual({ open: false, why: '', earned: 2, used: 2 });
  expect((await openFree('mia', c.owner)).status).toBe(403);
  // Gold is still two for the day, extras or not.
  expect((await stamps('mia', c.owner)).gold).toBe(2);
});

test('four taps at once on two earned capsules open two, and a reload says both are open', async () => {
  const { c } = await linked('mia', [{ day: utcToday(), games: 8, score: 600, played: [...CORE, 'slicies', 'flipsies', 'tiltsies'], cleared: true, extras: true }]);
  const s: any = await (await call('/me/mia/state', 'GET', undefined, auth(c.owner))).json();
  const taps = await Promise.all([0, 1, 2, 3].map(() => call('/me/mia/open', 'POST', { game: s.todayGame, free: true }, auth(c.owner))));
  expect(taps.filter(r => r.status === 201)).toHaveLength(2);
  expect(env.db.query("SELECT COUNT(*) AS n FROM copies WHERE key = 'mia' AND source = 'daily'").get().n).toBe(2);
  const again: any = await (await call('/me/mia/state', 'GET', undefined, auth(c.owner))).json();
  expect(again.freeCapsule).toEqual({ open: false, why: '', earned: 2, used: 2 });
});

test('a club game today without the gauntlet cleared opens nothing', async () => {
  const { c } = await linked('mia', [{ day: utcToday(), games: 1, score: 80, played: ['puttsies'], cleared: false }]);
  const s: any = await (await call('/me/mia/state', 'GET', undefined, auth(c.owner))).json();
  expect(s.freeCapsule).toEqual({ open: false, why: 'Finish today’s gauntlet on DLE Club to open it.', earned: 0, used: 0 });
});

test('without today’s gauntlet it stays shut, and one cleared since opens it', async () => {
  // Yesterday's doesn't count.
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const { c } = await linked('mia', []);
  env.db.prepare("INSERT INTO club_days(holder, day, played, n, cleared) VALUES (?, ?, 'puttsies', 5, 1)").run(ACCOUNT, yesterday);
  const s: any = await (await call('/me/mia/state', 'GET', undefined, auth(c.owner))).json();
  expect(s.freeCapsule).toEqual({ open: false, why: 'Finish today’s gauntlet on DLE Club to open it.', earned: 0, used: 0 });
  const shut = await openFree('mia', c.owner);
  expect(shut.status).toBe(403);
  expect(((await shut.json()) as any).error).toBe('Finish today’s gauntlet on DLE Club to open it.');
  // Nothing was taken: no copy, and today's free capsule is still to come.
  expect(env.db.query("SELECT COUNT(*) AS n FROM copies WHERE key = 'mia' AND source <> 'starter'").get().n).toBe(0);
  expect(env.db.query("SELECT free_day FROM players WHERE key = 'mia'").get().free_day).toBe('');
  // A minute on, the club is asked again before deciding, so a game just finished counts.
  const asked: string[] = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (url: string) => { asked.push(url); return new Response(JSON.stringify({ days: [{ day: utcToday(), games: 5, score: 400, played: CORE, cleared: true }] })); }) as any;
  try {
    env.db.prepare("UPDATE players SET club_read = ? WHERE key = 'mia'").run(Date.now() - 61 * 1000);
    expect((await openFree('mia', c.owner)).status).toBe(201);
  } finally { globalThis.fetch = real; }
  expect(asked).toHaveLength(1);
});

test('when the club doesn’t answer, today’s free capsule stays open', async () => {
  const { c } = await linked('mia', []);
  const real = globalThis.fetch;
  globalThis.fetch = (async () => new Response('Not found', { status: 404 })) as any;
  try {
    env.db.prepare("UPDATE players SET club_read = ? WHERE key = 'mia'").run(Date.now() - 61 * 1000);
    const s: any = await (await call('/me/mia/state', 'GET', undefined, auth(c.owner))).json();
    expect(s.freeCapsule).toEqual({ open: true, why: '', earned: 1, used: 0 });
    expect((await openFree('mia', c.owner)).status).toBe(201);
  } finally { globalThis.fetch = real; }
});

test('a name with no DLE Club sign-in can’t open it, and is told to sign in', async () => {
  const c = await claim('mia');
  // Without the shared secret the rule can't be checked, so it stays open even to a name with no sign-in.
  expect(((await (await call('/me/mia/state', 'GET', undefined, auth(c.owner))).json()) as any).freeCapsule).toEqual({ open: true, why: '', earned: 1, used: 0 });
  env.CLUB_SSO_SECRET = 'x'.repeat(40);
  // Even with a day on the books, the club can't be asked about a name it can't read.
  env.db.prepare("INSERT INTO club_days(holder, day, played, n, cleared) VALUES ('mia', ?, 'puttsies', 1, 0)").run(utcToday());
  const s: any = await (await call('/me/mia/state', 'GET', undefined, auth(c.owner))).json();
  expect(s.freeCapsule).toEqual({ open: false, why: 'Sign in to DLE Club and finish today’s gauntlet to open it.', earned: 0, used: 0 });
  const r = await openFree('mia', c.owner);
  expect(r.status).toBe(403);
  expect(((await r.json()) as any).error).toBe('Sign in to DLE Club and finish today’s gauntlet to open it.');
});

test('the founder always has both free capsules', async () => {
  const f: any = await (await call('/names/isaac', 'POST', undefined, { 'X-Founder-Secret': 'test-only-founder' })).json();
  const s: any = await (await call('/me/isaac/state', 'GET', undefined, auth(f.owner))).json();
  expect(s.freeCapsule.open).toBe(true);
  expect((await openFree('isaac', f.owner)).status).toBe(201);
  expect((await openFree('isaac', f.owner)).status).toBe(201);
  expect((await openFree('isaac', f.owner)).status).toBe(403);
});

// ------------------------------------------------------------ one Google account, one set of stamps
test('letting a name go and claiming another with the same Google account pays nothing out twice', async () => {
  const days = [{ day: STAMPS_FROM, games: 5, score: 400, played: CORE, cleared: true }, { day: utcToday(), games: 5, score: 400, played: CORE, cleared: true }];
  const { c } = await linked('mia', days);
  const me = auth(c.owner);
  // 10 to start and 14 earned: the free capsule, then three mystery capsules, leave nine.
  expect((await openFree('mia', c.owner)).status).toBe(201);
  for (let i = 0; i < 3; i++) expect((await call('/me/mia/open', 'POST', { mystery: true }, me)).status).toBe(201);
  expect(await stamps('mia', c.owner)).toMatchObject({ balance: 9, spent: 15 });
  expect((await call('/names/mia', 'DELETE', undefined, me)).status).toBe(200);
  // Signed in, the account claims a new name, and the club is read again from the first day.
  const z: any = await (await call('/names/zed', 'POST', undefined, me)).json();
  expect(z.linked).toBe(true);
  await readClub(env, 'zed', Date.now(), (async () => new Response(JSON.stringify({ days }))) as any);
  expect(await stamps('zed', c.owner)).toMatchObject({ balance: 9, spent: 15, earned: 24 });
  expect(env.db.query("SELECT COUNT(*) AS n FROM stamp_ledger WHERE what = 'starter'").get().n).toBe(1);
  // Today's free capsule was the account's, and so was beginner's luck.
  expect((await openFree('zed', c.owner)).status).toBe(403);
  env.db.prepare("INSERT INTO club_days(holder, day, played, n, cleared) VALUES (?, '2030-01-01', NULL, 8, 0)").run(ACCOUNT);
  const next: any = await (await call('/me/zed/open', 'POST', { mystery: true }, me)).json();
  expect(next.luck).toBeNull();
  // And it all carries on the same way the next time round.
  expect((await call('/names/zed', 'DELETE', undefined, me)).status).toBe(200);
  const third: any = await (await call('/names/kit', 'POST', undefined, me)).json();
  expect(third.linked).toBe(true);
  expect(await stamps('kit', c.owner)).toMatchObject({ balance: 12, spent: 20 });
  // The capsule count is the account's, kept apart from the new name's own.
  expect(env.db.query('SELECT opened FROM account_luck WHERE account = ?').get(ACCOUNT).opened).toBe(5);
  expect(env.db.query('SELECT opened FROM players WHERE key = ?').get('kit').opened).toBe(0);
});

test('a name claimed again by the same Google account can still keep one of its three', async () => {
  const { c } = await linked('mia', []);
  const me = auth(c.owner);
  expect((await call('/me/mia/open', 'POST', { mystery: true }, me)).status).toBe(201);
  expect((await call('/names/mia', 'DELETE', undefined, me)).status).toBe(200);
  const z: any = await (await call('/names/zed', 'POST', undefined, me)).json();
  const s: any = await (await call('/me/zed/state', 'GET', undefined, me)).json();
  expect(s.pick.choices).toEqual(z.choices);
  expect((await call('/me/zed/pick', 'POST', { seed: z.choices[1] }, me)).status).toBe(200);
  // Its first capsule settles it; the account has two of its three lucky capsules left.
  const o: any = await (await call('/me/zed/open', 'POST', { mystery: true }, me)).json();
  expect(o.luck).toBe('beginner');
  expect((await call('/me/zed/pick', 'POST', { seed: z.choices[2] }, me)).status).toBe(409);
});

test('a name with no Google sign-in keeps its stamps to itself: letting it go takes them', async () => {
  const c = await claim('mia');
  await call('/me/mia/open', 'POST', { mystery: true }, auth(c.owner));
  expect((await call('/names/mia', 'DELETE', undefined, auth(c.owner))).status).toBe(200);
  const again = await claim('mia');
  expect(await stamps('mia', again.owner)).toMatchObject({ balance: 10, spent: 0 });
  expect(env.db.query("SELECT opened FROM players WHERE key = 'mia'").get().opened).toBe(0);
});

// ------------------------------------------------------------ who can give
test('a name with no Google sign-in can’t give or swap copies away: claim, open, gift, release, reclaim', async () => {
  const main = await claim('main');
  const alt = await claim('alt');
  const o: any = await (await call('/me/alt/open', 'POST', { mystery: true }, auth(alt.owner))).json();
  const gift = await call('/me/alt/swap', 'POST', { to: 'main', give: o.copy.id }, auth(alt.owner));
  expect(gift.status).toBe(403);
  expect(((await gift.json()) as any).error).toBe('Sign in to DLE Club to give or swap copies.');
  // Let go and claimed again, it's no better off.
  expect((await call('/names/alt', 'DELETE', undefined, auth(alt.owner))).status).toBe(200);
  const again = await claim('alt');
  const o2: any = await (await call('/me/alt/open', 'POST', { mystery: true }, auth(again.owner))).json();
  expect((await call('/me/alt/swap', 'POST', { to: 'main', give: o2.copy.id }, auth(again.owner))).status).toBe(403);
  expect(env.db.query("SELECT COUNT(*) AS n FROM copies WHERE key = 'main' AND source <> 'starter'").get().n).toBe(0);
  // Nor can it give one away by taking an offer that asks for it.
  const m = link('main', 'ef'.repeat(32), '12'.repeat(32));
  const mainCopy: any = await (await call('/me/main/open', 'POST', { mystery: true }, auth(m.owner))).json();
  const ask: any = await (await call('/me/main/swap', 'POST', { to: 'alt', give: mainCopy.copy.id, want: o2.copy.id }, auth(m.owner))).json();
  expect((await call('/me/alt/swap-accept', 'POST', { id: ask.id }, auth(again.owner))).status).toBe(403);
  // Signed in, a name gives as it likes.
  const { c } = await linked('mia', []);
  const mc: any = await (await call('/me/mia/open', 'POST', { mystery: true }, auth(c.owner))).json();
  expect((await call('/me/mia/swap', 'POST', { to: 'main', give: mc.copy.id }, auth(c.owner))).status).toBe(201);
});

test('a name that spent its own starter and then linked can’t give until its account has earned the stamps back', async () => {
  const real = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ days: [] }))) as any;
  try { await laundered(); } finally { globalThis.fetch = real; }
});
async function laundered() {
  await claim('main');
  // The account has already spent its own starter, on a name it let go.
  const { c } = await linked('mia', []);
  const me = auth(c.owner);
  for (let i = 0; i < 2; i++) expect((await call('/me/mia/open', 'POST', { mystery: true }, me)).status).toBe(201);
  expect((await call('/names/mia', 'DELETE', undefined, me)).status).toBe(200);
  // A new name with no sign-in gets its own ten, spends them, and is linked to the same account.
  const alt = await claim('alt');
  const opened: any[] = [];
  for (let i = 0; i < 2; i++) opened.push(await (await call('/me/alt/open', 'POST', { mystery: true }, auth(alt.owner))).json());
  link('alt');
  await linkStamps(env, 'alt', ACCOUNT);
  expect(await stamps('alt', c.owner)).toMatchObject({ balance: -10 });
  const gift = await call('/me/alt/swap', 'POST', { to: 'main', give: opened[0].copy.id }, me);
  expect(gift.status).toBe(403);
  expect(((await gift.json()) as any).error).toBe('You owe stamps. Earn them back on DLE Club to give or swap copies.');
  expect(env.db.query("SELECT COUNT(*) AS n FROM copies WHERE key = 'main' AND source <> 'starter'").get().n).toBe(0);
  // Earned back, it gives again.
  env.db.prepare(`INSERT INTO club_days(holder, day, played, n, cleared) VALUES (?, ?, NULL, 8, 1)`).run(ACCOUNT, STAMPS_FROM);
  expect((await call('/me/alt/swap', 'POST', { to: 'main', give: opened[0].copy.id }, me)).status).toBe(201);
}

test('before 0010, a name with no Google sign-in can give once it is a week old', async () => {
  env = makeEnv(MIGRATIONS.slice(0, -1));
  await claim('main');
  const alt = await claim('alt');
  const s: any = await (await call('/me/alt/state', 'GET', undefined, auth(alt.owner))).json();
  const o: any = await (await call('/me/alt/open', 'POST', { game: s.todayGame, free: true }, auth(alt.owner))).json();
  expect((await call('/me/alt/swap', 'POST', { to: 'main', give: o.copy.id }, auth(alt.owner))).status).toBe(403);
  env.db.prepare("UPDATE names SET at = ? WHERE key = 'alt'").run(new Date(Date.now() - 8 * 864e5).toISOString());
  expect((await call('/me/alt/swap', 'POST', { to: 'main', give: o.copy.id }, auth(alt.owner))).status).toBe(201);
});

test('letting a name go works before the swaps, parts and card stats tables are made', async () => {
  env = makeEnv(MIGRATIONS.slice(0, 5));
  const c = await claim('mia');
  expect((await call('/names/mia', 'DELETE', undefined, auth(c.owner))).status).toBe(200);
  expect(env.db.query("SELECT (SELECT COUNT(*) FROM names) + (SELECT COUNT(*) FROM players) + (SELECT COUNT(*) FROM copies) AS n").get().n).toBe(0);
});
