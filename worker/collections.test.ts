import { test, expect, beforeEach, setSystemTime } from 'bun:test';
import { Database } from 'bun:sqlite';
import { api, RULES, todayGame, founderRoll } from './index.js';
import { GAMES, LIMITED_PAINT_COST } from '../src/index-headless.ts';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { decode, encode, gradeOf, GRADES, guyRank, resolve } from '../src/index-headless.ts';

let env: any;
beforeEach(() => {
  const db = new Database(':memory:');
  for (const m of ['0001_names.sql', '0002_collections.sql', '0003_google_accounts.sql', '0004_float_rank.sql', '0005_luck.sql', '0006_tags_swaps.sql', '0007_parts.sql', '0008_craft.sql', '0009_card_stats.sql', '0010_stamps.sql']) db.exec(readFileSync(new URL(`../migrations/${m}`, import.meta.url), 'utf8'));
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
// Stamps for a test that opens many capsules: a club day well after stamps began, as if read from the club.
const give = (key: string, n: number) => env.db.prepare("INSERT INTO club_days(key, day, played, n, cleared) VALUES (?, '2030-01-01', NULL, ?, 0) ON CONFLICT(key, day) DO UPDATE SET n = n + excluded.n").run(key, n);
const utcToday = () => new Date().toISOString().slice(0, 10);
// A name signed in to DLE Club (a Google sign-in) that has finished one club game today, as if read from the
// club. Linked, its browser token no longer works: it is signed in with a session, whose headers this returns.
let sessions = 0;
const playToday = (key: string) => {
  const account = createHash('sha256').update('google:' + key).digest('hex'), session = (++sessions).toString(16).padStart(64, '0');
  env.db.prepare('UPDATE names SET account = ? WHERE key = ?').run(account, key);
  env.db.prepare('INSERT INTO auth_sessions(hash, account, expires, created) VALUES (?, ?, ?, 0)').run(createHash('sha256').update(session).digest('hex'), account, Math.floor(Date.now() / 1000) + 3600);
  env.db.prepare("INSERT INTO club_days(key, day, played, n, cleared) VALUES (?, ?, 'amountle', 1, 0) ON CONFLICT(key, day) DO NOTHING").run(key, utcToday());
  return { Cookie: '__Host-lilguys-session=' + session };
};

test('a claim makes a player with ten stamps and one starter, worn, from the game they came from', async () => {
  const c: any = await (await call('/names/mia', 'POST', { game: 'puttsies' })).json();
  const s: any = await (await call('/me/mia/state', 'GET', undefined, auth(c.owner))).json();
  expect(s.stamps).toMatchObject({ ready: true, balance: RULES.stamps, unlimited: false, linked: false, gold: 0 });
  expect(RULES.stamps).toBe(10);
  expect(s.tickets).toBeUndefined();
  expect(s.copies).toHaveLength(1);
  expect(decode(s.copies[0].code)!.item.split('.')[0]).toBe('puttsies');
  expect(s.copies[0]).toMatchObject({ worn: true, source: 'starter' });
  expect((await call('/me/mia/state')).status).toBe(401);
  // Without a game it's today's machine.
  const b: any = await (await call('/names/bo', 'POST')).json();
  const t: any = await (await call('/me/bo/state', 'GET', undefined, auth(b.owner))).json();
  expect(decode(t.copies[0].code)!.item.split('.')[0]).toBe(todayGame());
});

test('a machine gives its free item with the first capsule from it, once; players from before keep theirs', async () => {
  const c = await claim('mia');
  give('mia', 8);
  const games = async () => ((await (await call('/me/mia/state', 'GET', undefined, auth(c.owner))).json()) as any).copies.filter((x: any) => x.source === 'starter').map((x: any) => decode(x.code)!.item.split('.')[0]);
  const other = GAMES.find(g => g !== todayGame() && g !== 'pets')!;
  const first: any = await (await call('/me/mia/open', 'POST', { game: other }, auth(c.owner))).json();
  expect(first.starter).toBeTruthy();
  const second: any = await (await call('/me/mia/open', 'POST', { game: other }, auth(c.owner))).json();
  expect(second.starter).toBeNull();
  expect((await games()).filter((g: string) => g === other)).toHaveLength(1);
  // A player who already had every starter keeps them all; nothing is taken away.
  for (const g of GAMES) env.db.prepare("INSERT INTO copies(key, code, item, game, slot, finish, grade, one_in, scuff, source, worn, at) SELECT 'mia', code, item, ?, slot, finish, grade, one_in, scuff, 'starter', 0, at FROM copies WHERE key = 'mia' AND source = 'starter' LIMIT 1").run(g);
  const n = (await games()).length;
  await call('/me/mia/state', 'GET', undefined, auth(c.owner));
  expect((await games()).length).toBe(n);
});

test('capsules are rolled and stored on the server, paid in stamps, and the free one is today’s machine once', async () => {
  const c = await claim('mia');
  // Today's game gives its stamp, and opens the free capsule.
  const me = playToday('mia');
  const free = await call('/me/mia/open', 'POST', { game: todayGame(), free: true }, me);
  expect(free.status).toBe(201);
  const body: any = await free.json();
  expect(body.copy.code).toContain('~');
  // The free one is a souvenir of today; no other capsule is.
  expect(body.copy.code).toMatch(/~s\d{4}-\d{2}-\d{2}/);
  // The free one costs nothing.
  expect(body.stamps.balance).toBe(RULES.stamps + 1);
  expect((await call('/me/mia/open', 'POST', { game: todayGame(), free: true }, me)).status).toBe(409);
  // A picked machine costs eight stamps; the copy comes from it.
  const paid: any = await (await call('/me/mia/open', 'POST', { game: 'puttsies' }, me)).json();
  expect(paid.game).toBe('puttsies');
  expect(paid.stamps.balance).toBe(RULES.stamps + 1 - RULES.capsule);
  // Short: nothing is taken, and the answer says how many more and where they come from.
  const short = await call('/me/mia/open', 'POST', { game: 'puttsies' }, me);
  expect(short.status).toBe(402);
  expect(((await short.json()) as any)).toMatchObject({ error: '5 more stamps: play a game on DLE Club.', need: 5, stamps: { balance: 3 } });
  expect((await call('/me/mia/open', 'POST', { game: 'nope' }, me)).status).toBe(400);
  expect(env.db.query("SELECT COUNT(*) AS n FROM copies WHERE key = 'mia' AND source <> 'starter'").get().n).toBe(2);
});

test('a mystery capsule costs five stamps and comes from any machine, rolled as that machine’s', async () => {
  const c = await claim('mia');
  const seen = new Set<string>();
  give('mia', 5 * 40 - RULES.stamps);
  for (let i = 0; i < 40; i++) {
    const r = await call('/me/mia/open', 'POST', { mystery: true, game: 'puttsies' }, auth(c.owner));
    expect(r.status).toBe(201);
    const body: any = await r.json();
    expect(GAMES).toContain(body.game);
    expect(body.copy.code.startsWith(body.game + '.') || body.copy.code.startsWith('aura.')).toBe(true);
    seen.add(body.game);
  }
  // Not the machine asked for: the server draws it.
  expect(seen.size).toBeGreaterThan(3);
  const s: any = await (await call('/me/mia/state', 'GET', undefined, auth(c.owner))).json();
  expect(s.stamps).toMatchObject({ balance: 0, spent: 200 });
  const short: any = await (await call('/me/mia/open', 'POST', { mystery: true }, auth(c.owner))).json();
  expect(short.error).toBe('5 more stamps. Sign in to DLE Club and play to earn stamps.');
});

test('there are no tickets to collect: stamps only come from playing', async () => {
  const c = await claim('mia');
  expect((await call('/me/mia/checkin', 'POST', {}, auth(c.owner))).status).toBe(404);
  const s: any = await (await call('/me/mia/state', 'GET', undefined, auth(c.owner))).json();
  expect(s.checkinDay).toBeUndefined();
  expect(s.infinite).toBeUndefined();
});

test('wearing takes only your own copy for its slot; looks only take parts you may pick', async () => {
  const a = await claim('mia'), b = await claim('bo');
  const bo: any = await (await call('/me/bo/state', 'GET', undefined, auth(b.owner))).json();
  const boHat = bo.copies.find((x: any) => x.slot === 'hat');
  // A second hat to change to: a hat-giving machine's free item with a capsule from it.
  give('mia', 8);
  await call('/me/mia/open', 'POST', { game: GAMES.find(g => g !== todayGame() && ['amountle', 'stackdle', 'flipsies', 'puttsies', 'trackdle', 'pets', 'tiltsies'].includes(g)) }, auth(a.owner));
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
  expect(prof.copies).toHaveLength(3);
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
  give('flo', 48);
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

test('the founder has unlimited stamps, and his state says so', async () => {
  const f: any = await (await call('/names/isaac', 'POST', undefined, { 'X-Founder-Secret': 'test-only-founder' })).json();
  for (let i = 0; i < 4; i++) {
    expect((await call('/me/isaac/open', 'POST', { game: 'puttsies' }, auth(f.owner))).status).toBe(201);
    expect((await call('/me/isaac/open', 'POST', { mystery: true }, auth(f.owner))).status).toBe(201);
  }
  const s: any = await (await call('/me/isaac/state', 'GET', undefined, auth(f.owner))).json();
  expect(s.stamps).toMatchObject({ unlimited: true, spent: 0 });
  // Anyone else pays, and their state says so.
  const c = await claim('mia');
  const m: any = await (await call('/me/mia/state', 'GET', undefined, auth(c.owner))).json();
  expect(m.stamps.unlimited).toBe(false);
  await call('/me/mia/open', 'POST', { game: 'puttsies' }, auth(c.owner));
  expect((await call('/me/mia/open', 'POST', { game: 'puttsies' }, auth(c.owner))).status).toBe(402);
});

test('beginner’s luck: a player’s first three capsules are the best of three, the fourth a plain roll', async () => {
  let good = 0, n = 0;
  for (let i = 0; i < 150; i++) {
    const key = 'p' + i;
    // A fresh address for each, past the daily claim limit.
    const c: any = await (await call('/names/' + key, 'POST', undefined, { 'CF-Connecting-IP': `198.51.100.${i}` })).json();
    const me = playToday(key);
    for (let k = 0; k < 3; k++) {
      // The first is the day's free one, then the two mystery capsules a claim's ten stamps pay for: both count.
      const body: any = await (await call(`/me/${key}/open`, 'POST', k ? { mystery: true } : { game: todayGame(), free: true }, me)).json();
      expect(body.luck).toBe('beginner');
      n++;
      if (body.copy.grade >= 1) good++;
    }
    if (i === 0) {
      give(key, 8);
      const fourth: any = await (await call(`/me/${key}/open`, 'POST', { game: 'puttsies' }, me)).json();
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
  give('mia', 8 * 25);
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
  give('mia', 8 * 60);
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
  give('mia', 8 * 10);
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
  give('mia', 8 * 12);
  for (let i = 0; i < 12; i++) expect((await call('/me/mia/open', 'POST', { game: 'puttsies' }, auth(c.owner))).status).toBe(201);
  const s: any = await (await call('/me/mia/state', 'GET', undefined, auth(c.owner))).json();
  expect(s.parts).toEqual([]);
});

test('TF2 crafting: smelt spare copies into metal, craft the item you want with its number, paint it', async () => {
  const c = await claim('mia');
  give('mia', 8 * 12);
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

test('paints of the month: on sale only in their month, at two refined; a copy painted then keeps it', async () => {
  const c = await claim('mia');
  env.db.exec("UPDATE players SET metal = 40 WHERE key = 'mia'");
  const made: any = await (await call('/me/mia/craft', 'POST', { item: 'puttsies.flag' }, auth(c.owner))).json();
  setSystemTime(new Date('2026-10-20T12:00:00Z'));
  try {
    expect((await call('/me/mia/paint', 'POST', { id: made.copy.id, paint: 'frostbite' }, auth(c.owner))).status).toBe(409);
    setSystemTime(new Date('2026-11-05T12:00:00Z'));
    const p: any = await (await call('/me/mia/paint', 'POST', { id: made.copy.id, paint: 'frostbite' }, auth(c.owner))).json();
    expect(decode(p.copy.code)!.paint).toBe('frostbite');
    expect(p.metal).toBe(40 - 9 - LIMITED_PAINT_COST);
    setSystemTime(new Date('2026-12-05T12:00:00Z'));
    const s: any = await (await call('/me/mia/state', 'GET', undefined, auth(c.owner))).json();
    expect(decode(s.copies.find((x: any) => x.id === made.copy.id).code)!.paint).toBe('frostbite');
  } finally { setSystemTime(); }
});

test('before migration 0008, crafting says it isn’t open and nothing else changes', async () => {
  env.db.exec('ALTER TABLE players DROP COLUMN metal');
  const c = await claim('mia');
  expect((await call('/me/mia/craft', 'POST', { item: 'puttsies.flag' }, auth(c.owner))).status).toBe(503);
  expect((await call('/me/mia/open', 'POST', { game: 'puttsies' }, auth(c.owner))).status).toBe(201);
  const s: any = await (await call('/me/mia/state', 'GET', undefined, auth(c.owner))).json();
  expect(s.metal).toBe(0);
});

// ------------------------------------------------------------ trade-ups, gone
test('trade-ups are gone; a copy one made stays, and still smelts and swaps', async () => {
  const c = await claim('mia'), b = await claim('bo');
  const five = [0, 1, 2, 3, 4].map(() => put('mia'));
  const r = await call('/me/mia/trade', 'POST', { ids: five }, auth(c.owner));
  expect(r.status).toBe(410);
  expect(((await r.json()) as any).error).toBe('Trade-ups are gone. Smelt copies into metal and craft what you want.');
  expect((await stateOf('mia', c.owner)).copies.filter((x: any) => five.includes(x.id))).toHaveLength(5);
  // A copy a trade-up made before they went is like any other.
  const [traded, smelted] = [put('mia', 1, 0.2, 'trade'), put('mia', 1, 0.3, 'trade')];
  const offer: any = await (await call('/me/mia/swap', 'POST', { to: 'bo', give: traded }, auth(c.owner))).json();
  expect((await call('/me/bo/swap-accept', 'POST', { id: offer.id }, auth(b.owner))).status).toBe(200);
  expect((await stateOf('bo', b.owner)).copies.some((x: any) => x.id === traded)).toBe(true);
  const sm: any = await (await call('/me/mia/smelt', 'POST', { ids: [smelted] }, auth(c.owner))).json();
  expect(sm.metal).toBeGreaterThan(0);
});

test('a swap for the copy a player has on goes through when they accept: it comes off them, its days banked', async () => {
  const c = await claim('mia'), b = await claim('bo');
  const theirs = put('bo'), mine = put('mia');
  await call('/me/bo/wear', 'POST', { slot: 'hat', id: theirs }, auth(b.owner));
  // Worn a day already.
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  env.db.prepare('UPDATE copies SET worn_since = ? WHERE id = ?').run(yesterday, theirs);
  const offer: any = await (await call('/me/mia/swap', 'POST', { to: 'bo', give: mine, want: theirs }, auth(c.owner))).json();
  expect(offer.id).toBeTruthy();
  const r = await call('/me/bo/swap-accept', 'POST', { id: offer.id }, auth(b.owner));
  expect(r.status).toBe(200);
  const moved = env.db.query('SELECT key, worn, worn_since, worn_days FROM copies WHERE id = ?').get(theirs);
  expect(moved).toMatchObject({ key: 'mia', worn: 0, worn_since: '', worn_days: 2 });
  expect((await stateOf('bo', b.owner)).copies.find((x: any) => x.id === mine)).toMatchObject({ worn: false });
  // The one offering still has to leave theirs off: theirs is the offer.
  const again = put('mia');
  const o2: any = await (await call('/me/mia/swap', 'POST', { to: 'bo', give: again, want: mine }, auth(c.owner))).json();
  await call('/me/mia/wear', 'POST', { slot: 'hat', id: again }, auth(c.owner));
  expect((await call('/me/bo/swap-accept', 'POST', { id: o2.id }, auth(b.owner))).status).toBe(409);
});

// ------------------------------------------------------------ the founder
test('the founder is the library’s: rarest first lists him at the top, and the club reads him as the founder', async () => {
  for (const k of ['mia', 'bo', 'di']) await claim(k);
  await call('/names/isaac', 'POST', undefined, { 'X-Founder-Secret': 'test-only-founder' });
  // Whatever his traits' odds, rarest first starts with him, even past the first page's limit.
  env.db.exec("UPDATE players SET guy_one_in = 1e30 WHERE key <> 'isaac'");
  const list: any = await (await call('/guys?sort=rarest&limit=2')).json();
  expect(list[0].key).toBe('isaac');
  expect(guyRank(resolve(list[0].seed))).toMatchObject({ name: 'Founder', label: 'One of one' });
  // The club's named guys carry the flag, so a party chip or a game ranks him as the site does.
  const named: any = await (await call('/club/named?n=isaac,mia')).json();
  expect(named.guys.isaac.parts.founder).toBe(true);
  expect(guyRank(named.guys.isaac.parts)).toMatchObject({ tier: 5, name: 'Founder' });
  expect(named.guys.mia.parts.founder).toBeUndefined();
  // A look he picks lays over his parts; he stays the founder.
  const f: any = env.db.query("SELECT owner FROM names WHERE key = 'isaac'").get();
  expect(f.owner).toBeTruthy();
  env.db.exec("UPDATE players SET look = '2:p0' WHERE key = 'isaac'");
  const picked: any = await (await call('/club/named?n=isaac')).json();
  expect(picked.guys.isaac.parts.founder).toBe(true);
  expect(guyRank(picked.guys.isaac.parts).name).toBe('Founder');
});

test('the founder’s capsules are always Mythic or better, from any machine, and not always the top', async () => {
  const f: any = await (await call('/names/isaac', 'POST', undefined, { 'X-Founder-Secret': 'test-only-founder' })).json();
  const grades: string[] = [];
  for (let i = 0; i < 24; i++) {
    const r: any = await (await call('/me/isaac/open', 'POST', { game: GAMES[i % GAMES.length] }, auth(f.owner))).json();
    expect(r.luck).toBe('founder');
    grades.push(gradeOf(decode(r.copy.code)!).id);
  }
  for (const g of grades) expect(['mythic', 'grail', 'aura']).toContain(g);
  expect(new Set(grades).size).toBeGreaterThan(1);
});

test('founderRoll keeps to the tier it drew and the best float in it', () => {
  let n = 0;
  const one = () => ({ item: 'puttsies.flag', finish: ['plain', 'prism', 'gold', 'prism'][n % 4], scuff: 0.5 - (n++ % 7) * 0.05, print: 1 });
  const o = founderRoll(one, GRADES.length - 1, 0.9);
  expect(gradeOf(o).id).toBe('mythic');
  expect(founderRoll(one, GRADES.findIndex(g => g.id === 'grail'), 0.01).finish).toBe('gold');
});

test('what the founder holds stays off the Pulls page and its counts until he gives it to someone', async () => {
  const f: any = await (await call('/names/isaac', 'POST', undefined, { 'X-Founder-Secret': 'test-only-founder' })).json();
  const b = await claim('bo');
  await call('/me/isaac/state', 'GET', undefined, auth(f.owner));
  const pulled: any = await (await call('/me/isaac/open', 'POST', { game: 'puttsies' }, auth(f.owner))).json();
  expect(pulled.copy.pull ?? 0).toBe(0);
  expect(await (await call('/market')).json()).toHaveLength(0);
  expect(((await (await call('/stats')).json()) as any).copies).toBe(0);
  expect(((await (await call('/rank?code=' + encodeURIComponent(pulled.copy.code))).json()) as any).pop).toBe(0);
  // His own page still lists them, the Gold flag and Origin aura too.
  expect(((await (await call('/market?key=isaac')).json()) as any[]).some(c => c.id === pulled.copy.id)).toBe(true);
  const offer: any = await (await call('/me/isaac/swap', 'POST', { to: 'bo', give: pulled.copy.id }, auth(f.owner))).json();
  expect((await call('/me/bo/swap-accept', 'POST', { id: offer.id }, auth(b.owner))).status).toBe(200);
  const market: any = await (await call('/market')).json();
  expect(market.map((c: any) => [c.id, c.key])).toEqual([[pulled.copy.id, 'bo']]);
  expect(((await (await call('/stats')).json()) as any).copies).toBe(1);
});

test('the founder can roll at fair odds, and open any season’s capsule out of season', async () => {
  const f: any = await (await call('/names/isaac', 'POST', undefined, { 'X-Founder-Secret': 'test-only-founder' })).json();
  await call('/me/isaac/state', 'GET', undefined, auth(f.owner));
  const fair: string[] = [];
  for (let i = 0; i < 40; i++) {
    const r: any = await (await call('/me/isaac/open', 'POST', { game: 'puttsies', fair: true }, auth(f.owner))).json();
    expect(r.luck).not.toBe('founder');
    fair.push(gradeOf(decode(r.copy.code)!).id);
  }
  // At fair odds most capsules are Everyday, which founder odds never give.
  expect(fair.filter(g => g === 'everyday').length).toBeGreaterThan(10);
  setSystemTime(new Date('2026-06-05T12:00:00Z'));
  try {
    const r = await call('/me/isaac/season', 'POST', { item: 'club.snowcap' }, auth(f.owner));
    expect(r.status).toBe(201);
    expect(decode(((await r.json()) as any).copy.code)!.item).toBe('club.snowcap');
    // Anyone else still gets nothing out of season.
    const b = await claim('bo');
    give('bo', 8);
    expect((await call('/me/bo/season', 'POST', { item: 'club.snowcap' }, auth(b.owner))).status).toBe(409);
  } finally { setSystemTime(); }
});
