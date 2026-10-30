import { test, expect } from 'bun:test';
import { encode } from '../src/index-headless.ts';
import { HOWS, howOf } from './owners.js';
import { PINS, PIN_CHANGES } from './index.js';
import { callWith, claim, makeEnv, signIn, stamps } from './test-env.ts';

// A spare hat put straight in a player's locker, as a capsule would have given it.
const put = (env: any, key: string, at = new Date().toISOString()) => Number(env.db.prepare(`INSERT INTO copies(key, code, item, game, slot, finish, grade, one_in, scuff, source, worn, at)
  VALUES (?, ?, 'amountle.crown', 'amountle', 'hat', 'plain', 0, 100, 0.5, 'capsule', 0, ?)`).run(key, encode({ item: 'amountle.crown', finish: 'plain', scuff: 0.5, print: 1 }), at).lastInsertRowid);
const history = async (env: any, id: number) => (await (await callWith(env)(`/copies/${id}`)).json()) as any;
const owners = async (env: any, id: number) => (await history(env, id)).owners.map((o: any) => [o.key, o.how]);

test('a copy keeps its owners in turn: pulled, mystery, crafted, then swapped and given', async () => {
  const env = makeEnv(), call = callWith(env);
  await claim(env, 'mia'); await claim(env, 'bo');
  const mia = signIn(env, 'mia'), bo = signIn(env, 'bo');
  stamps(env, 'mia', 30);
  const pulled: any = await (await call('/me/mia/open', 'POST', { game: 'puttsies' }, mia)).json();
  const mystery: any = await (await call('/me/mia/open', 'POST', { mystery: true }, mia)).json();
  env.db.exec("UPDATE players SET metal = 40 WHERE key = 'mia'");
  const crafted: any = await (await call('/me/mia/craft', 'POST', { item: 'puttsies.flag' }, mia)).json();
  expect(await owners(env, pulled.copy.id)).toEqual([['mia', 'pulled']]);
  expect(await owners(env, mystery.copy.id)).toEqual([['mia', 'mystery']]);
  expect(await owners(env, crafted.copy.id)).toEqual([['mia', 'crafted']]);
  const h = await history(env, pulled.copy.id);
  expect(h.copy).toMatchObject({ id: pulled.copy.id, key: 'mia', code: pulled.copy.code });
  expect(h.owners[0].at).toBe(pulled.copy.at);
  // A swap: each copy goes to the other, and each keeps who had it first.
  const theirs = put(env, 'bo');
  const offer: any = await (await call('/me/mia/swap', 'POST', { to: 'bo', give: pulled.copy.id, want: theirs }, mia)).json();
  expect((await call('/me/bo/swap-accept', 'POST', { id: offer.id }, bo)).status).toBe(200);
  expect(await owners(env, pulled.copy.id)).toEqual([['mia', 'pulled'], ['bo', 'swapped']]);
  expect(await owners(env, theirs)).toEqual([['bo', 'pulled'], ['mia', 'swapped']]);
  // Given back, as a gift.
  const gift: any = await (await call('/me/bo/swap', 'POST', { to: 'mia', give: pulled.copy.id }, bo)).json();
  expect((await call('/me/mia/swap-accept', 'POST', { id: gift.id }, mia)).status).toBe(200);
  expect(await owners(env, pulled.copy.id)).toEqual([['mia', 'pulled'], ['bo', 'swapped'], ['mia', 'gift']]);
  // A lapsed offer moves nothing and keeps nothing.
  const stale: any = await (await call('/me/mia/swap', 'POST', { to: 'bo', give: crafted.copy.id }, mia)).json();
  await call('/me/mia/wear', 'POST', { slot: 'hat', id: crafted.copy.id }, mia);
  expect((await call('/me/bo/swap-accept', 'POST', { id: stale.id }, bo)).status).toBe(409);
  expect(await owners(env, crafted.copy.id)).toEqual([['mia', 'crafted']]);
  // Only names and moments: no account, no token.
  const all = JSON.stringify(await history(env, pulled.copy.id));
  for (const secret of env.db.query('SELECT account FROM names').all().map((n: any) => n.account)) expect(all).not.toContain(secret);
  expect((await call('/copies/999999')).status).toBe(404);
  expect((await call('/copies/nope')).status).toBe(404);
  for (const row of env.db.query('SELECT how FROM copy_owners').all()) expect(HOWS).toContain(row.how);
});

test('today’s free capsule and the founder’s season say how they came; the founder’s capsules all say founder', async () => {
  const env = makeEnv(), call = callWith(env);
  await claim(env, 'mia');
  const mia = signIn(env, 'mia');
  const day: any = await (await call('/me/mia/open', 'POST', { game: (await (await call('/stats')).json() as any).todayGame, free: true }, mia)).json();
  expect(await owners(env, day.copy.id)).toEqual([['mia', 'daily']]);
  const f = await claim(env, 'isaac');
  const open: any = await (await call('/me/isaac/open', 'POST', { game: 'puttsies' }, f)).json();
  expect(open.luck).toBe('founder');
  const season: any = await (await call('/me/isaac/season', 'POST', { item: 'club.snowcap' }, f)).json();
  expect(season.luck).toBe('founder');
  expect(await owners(env, season.copy.id)).toEqual([['isaac', 'season']]);
  const fair: any = await (await call('/me/isaac/season', 'POST', { item: 'club.snowcap', fair: true }, f)).json();
  expect(fair.luck).toBeNull();
});

test('before migration 0011 a copy has one owner, its holder since it was made, and swaps go through as ever', async () => {
  const env = makeEnv('0010_stamps.sql'), call = callWith(env);
  await claim(env, 'mia'); await claim(env, 'bo');
  const mia = signIn(env, 'mia'), bo = signIn(env, 'bo');
  stamps(env, 'mia', 8);
  const pulled: any = await (await call('/me/mia/open', 'POST', { game: 'puttsies' }, mia)).json();
  expect(pulled.copy).toBeTruthy();
  const h = await history(env, pulled.copy.id);
  expect(h.owners).toEqual([{ key: 'mia', at: pulled.copy.at, how: 'pulled' }]);
  const gift: any = await (await call('/me/mia/swap', 'POST', { to: 'bo', give: pulled.copy.id }, mia)).json();
  expect((await call('/me/bo/swap-accept', 'POST', { id: gift.id }, bo)).status).toBe(200);
  expect((await history(env, pulled.copy.id)).owners).toEqual([{ key: 'bo', at: pulled.copy.at, how: 'pulled' }]);
  // Then 0011 is applied: what it finds is kept, the first owner from the swaps there are.
  env.migrate('0011_copy_owners.sql');
  expect(await owners(env, pulled.copy.id)).toEqual([['mia', 'pulled'], ['bo', 'gift']]);
  // Every copy has its first owner; starters say pulled.
  const starter = env.db.query("SELECT id FROM copies WHERE key = 'mia' AND source = 'starter'").get().id;
  expect(await owners(env, starter)).toEqual([['mia', 'pulled']]);
  expect(howOf('seasonal')).toBe('season');
  // A copy made after 0011 by a Worker that didn't keep owners gets its first owner as it changes hands.
  const late = put(env, 'mia');
  expect(env.db.query('SELECT COUNT(*) AS n FROM copy_owners WHERE copy_id = ?').get(late).n).toBe(0);
  const swap: any = await (await call('/me/mia/swap', 'POST', { to: 'bo', give: late }, mia)).json();
  await call('/me/bo/swap-accept', 'POST', { id: swap.id }, bo);
  expect(await owners(env, late)).toEqual([['mia', 'pulled'], ['bo', 'gift']]);
});

test('letting a name go or smelting a copy takes its owners with it', async () => {
  const env = makeEnv(), call = callWith(env);
  const m = await claim(env, 'mia');
  stamps(env, 'mia', 16);
  const a: any = await (await call('/me/mia/open', 'POST', { game: 'puttsies' }, m)).json();
  const b: any = await (await call('/me/mia/open', 'POST', { game: 'puttsies' }, m)).json();
  expect((await call('/me/mia/smelt', 'POST', { ids: [a.copy.id] }, m)).status).toBe(200);
  expect(env.db.query('SELECT COUNT(*) AS n FROM copy_owners WHERE copy_id = ?').get(a.copy.id).n).toBe(0);
  expect(env.db.query('SELECT COUNT(*) AS n FROM copy_owners WHERE copy_id = ?').get(b.copy.id).n).toBe(1);
  expect((await call('/names/mia', 'DELETE', undefined, m)).status).toBe(200);
  expect(env.db.query('SELECT COUNT(*) AS n FROM copy_owners').get().n).toBe(0);
});

test('a shelf: up to three of your own copies, pinned in order, on your page and in your state', async () => {
  const env = makeEnv(), call = callWith(env);
  const m = await claim(env, 'mia'), b = await claim(env, 'bo');
  const [one, two, three, four] = [put(env, 'mia'), put(env, 'mia'), put(env, 'mia'), put(env, 'mia')];
  const theirs = put(env, 'bo');
  expect(((await (await call('/guys/mia')).json()) as any).pins).toEqual([]);
  const r = await call('/me/mia/pin', 'POST', { ids: [two, one, two] }, m);
  expect(r.status).toBe(200);
  expect(await r.json()).toEqual({ pins: [two, one] });
  expect(((await (await call('/guys/mia')).json()) as any).pins).toEqual([two, one]);
  expect(((await (await call('/me/mia/state', 'GET', undefined, m)).json()) as any).pins).toEqual([two, one]);
  expect((await call('/me/mia/pin', 'POST', { ids: [one, two, three, four] }, m)).status).toBe(400);
  expect((await call('/me/mia/pin', 'POST', { ids: 'one' }, m)).status).toBe(400);
  expect((await call('/me/mia/pin', 'POST', { ids: [1.5] }, m)).status).toBe(400);
  expect((await call('/me/mia/pin', 'POST', { ids: [theirs] }, m)).status).toBe(404);
  expect((await call('/me/mia/pin', 'POST', { ids: [one] })).status).toBe(401);
  expect((await call('/me/mia/pin', 'POST', { ids: [one] }, b)).status).toBe(401);
  expect(PINS).toBe(3);
  await call('/me/mia/pin', 'POST', { ids: [three, two, one] }, m);
  // A pinned copy that leaves drops off the shelf.
  env.db.prepare("UPDATE copies SET key = 'bo' WHERE id = ?").run(two);
  expect(((await (await call('/guys/mia')).json()) as any).pins).toEqual([three, one]);
  expect(((await (await call('/guys/bo')).json()) as any).pins).toEqual([]);
  // An empty list takes them all down.
  expect(await (await call('/me/mia/pin', 'POST', { ids: [] }, m)).json()).toEqual({ pins: [] });
  expect(((await (await call('/guys/mia')).json()) as any).pins).toEqual([]);
});

test('pins are capped a day from one address, and before migration 0012 they aren’t open and nothing else changes', async () => {
  const env = makeEnv(), call = callWith(env);
  const m = await claim(env, 'mia');
  const one = put(env, 'mia');
  for (let i = 0; i < PIN_CHANGES; i++) expect((await call('/me/mia/pin', 'POST', { ids: [one] }, m)).status).toBe(200);
  expect((await call('/me/mia/pin', 'POST', { ids: [one] }, m)).status).toBe(429);
  const old = makeEnv('0011_copy_owners.sql'), oldCall = callWith(old);
  const o = await claim(old, 'mia');
  const id = put(old, 'mia');
  const r = await oldCall('/me/mia/pin', 'POST', { ids: [id] }, o);
  expect(r.status).toBe(503);
  expect(((await r.json()) as any).error).toBe('Pins aren’t open yet');
  expect(((await (await oldCall('/guys/mia')).json()) as any)).toMatchObject({ key: 'mia', pins: [] });
  expect(((await (await oldCall('/me/mia/state', 'GET', undefined, o)).json()) as any).pins).toEqual([]);
});
