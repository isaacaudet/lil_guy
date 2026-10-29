import { authApi, ownedName, sessionAccount } from './auth.js';
import { baked } from './baked.js';
import { clubGuys, namedGuys } from './club-guys.js';
import { BANK_DAYS, putOn, readClub, statsReady, takeOff, withStats, TODAY_EVERY } from './card-stats.js';
import { heldKey, skeletonTaken } from './name-lookup.js';
import { giveStarter, playedOn, shortOf, spendStamps, stampState, stampsReady, STAMP_COST, STARTER_STAMPS } from './stamps.js';
import {
  roll, rollSeason, mysteryMachine, starter, encode, decode, gradeOf, copyOneIn, itemById, slotOf, GRADES, GAMES, inSeason,
  decodeLook, resolve, makeSeed, guyOneIn, FOUNDER_SEED, FOUNDER_COPIES, isFounder,
  cleanTag, tradeFloat, rollPart, partCode, readPart, partCost, unlocksOf, pickable,
  smeltValue, craftable, craftCopy, CRAFT_COST, PAINT_COST, PAINT_IDS, PAINTABLE, NAME_KEY, nameKey, nameSkeleton,
} from '../src/index-headless.ts';

const json = (body, status = 200, extra = {}) => Response.json(body, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra },
});
const digest = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b => b.toString(16).padStart(2, '0')).join('');
const equal = async (a, b) => (await digest(a)) === (await digest(b));

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/g/')) {
      try { return await baked(request, env, url, ctx, guyOf); }
      catch { return Response.json({ error: 'Pictures are temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
    }
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try { return await api(request, env, url); }
    catch { return json({ error: 'Names are temporarily unavailable. Please try again.' }, 503); }
  },
};

// ------------------------------------------------------------ the guys and their copies
// The rules the page plays by, kept here so the server decides them: the stamps a player starts with, what
// each capsule costs in stamps (stamps.js), how many copies a trade up takes and how many swap offers can be
// out, and which machine's capsule is free today.
export const RULES = { stamps: STARTER_STAMPS, mystery: STAMP_COST.mystery, capsule: STAMP_COST.machine, seasonal: STAMP_COST.seasonal, trade: 5, swaps: 10 };
// The founder never pays.
const free = key => key === 'isaac';
// Capsule luck: a player's first few capsules are each the best of a few rolls (weighted toward good, never
// promised), and after a long dry run below Prized the next capsule is Prized or better.
export const LUCK = { beginner: 3, rolls: 3, pity: 30, tries: 5000 };
const today = () => new Date().toISOString().slice(0, 10);
// A trade up is a gamble, like CS's: usually the next grade, sometimes a dud back at the same grade, now and then
// two grades up. Never past Grail.
export const TRADE_ODDS = { dud: 0.2, jump: 0.05 };
export function tradeGrade(grade, u, top) {
  if (u < TRADE_ODDS.dud) return { grade, outcome: 'dud' };
  if (u >= 1 - TRADE_ODDS.jump && grade + 2 <= top) return { grade: grade + 2, outcome: 'jump' };
  return { grade: Math.min(top, grade + 1), outcome: 'up' };
}
export const todayGame = () => GAMES[Math.floor(Date.now() / 864e5) % GAMES.length];

// "isaac" is the founder's: the library deals his seed the crowned guy he was picked as (FOUNDER_LOOK, with
// `founder: true`, so `guyRank` says Founder · One of one), and he has two copies no capsule gives, the Gold
// flag and the Origin aura (FOUNDER_COPIES).
const dealt = seed => resolve(seed);
// A stored look was checked against the player's own and earned parts when it was saved, so reading one only checks it draws.
const guyOf = (seed, look) => { const base = dealt(seed); const picked = look ? decodeLook(look) : null; return picked ? { ...base, ...picked } : base; };

/** The rare parts a player has unlocked, as part codes. Empty until migration 0007 has made the table. */
async function partsOf(env, key) {
  try { return (await env.DB.prepare('SELECT code FROM parts WHERE key = ? ORDER BY at').bind(key).all()).results.map(r => r.code); }
  catch { return []; }
}

/** Gives a capsule's part: a new one is kept; one already theirs (dealt or earned) gives nothing more. */
async function grantPart(env, name, drop) {
  const code = partCode(drop);
  const have = pickable(dealt(name.seed), drop.slot, unlocksOf(await partsOf(env, name.key))).includes(drop.index);
  if (have) return { code, new: false };
  try { await env.DB.prepare('INSERT OR IGNORE INTO parts(key, code, at) VALUES (?, ?, ?)').bind(name.key, code, new Date().toISOString()).run(); }
  catch { return null; }
  return { code, new: true };
}
const ONE_OF_ONE = 1e18;
const gradeIndex = o => GRADES.findIndex(g => g.id === gradeOf(o).id);
const PRIZED = GRADES.findIndex(g => g.id === 'prized');

/**
 * Rolls a capsule from a machine with the player's luck: `opened` capsules before this one and `dry` in a
 * row below Prized (auras count as Prized or better). Pity first, then beginner's luck (the best of a few
 * rolls by grade, the lower float on a tie), else one plain roll. Every roll is the server's own.
 */
export function luckyRoll(game, opened, dry) {
  const one = () => roll(crypto.randomUUID(), game);
  if (dry >= LUCK.pity) {
    let o = one();
    for (let i = 1; i < LUCK.tries && gradeIndex(o) < PRIZED; i++) o = one();
    return { o, luck: 'pity' };
  }
  if (opened < LUCK.beginner) {
    let best = one();
    for (let i = 1; i < LUCK.rolls; i++) {
      const o = one(), g = gradeIndex(o), b = gradeIndex(best);
      if (g > b || (g === b && o.scuff < best.scuff)) best = o;
    }
    return { o: best, luck: 'beginner' };
  }
  return { o: one(), luck: null };
}

function copyRow(o, key, source) {
  const item = itemById(o.item);
  return {
    key, code: encode(o), item: o.item, game: item.game, slot: slotOf(o), finish: o.finish,
    grade: GRADES.findIndex(g => g.id === gradeOf(o).id),
    one_in: source === 'founder' ? ONE_OF_ONE : item.free ? 0 : copyOneIn(o), scuff: o.scuff, source,
  };
}
/**
 * Where a copy's float stands: how many copies of the same item in the same finish there are, how many
 * are cleaner, and how many of the item there are in any finish. Only counts, never whose they are.
 */
async function rank(env, url) {
  const o = decode(url.searchParams.get('code') || '');
  if (!o) return json({ error: 'Not a copy' }, 400);
  const same = await env.DB.prepare('SELECT COUNT(*) AS pop, SUM(scuff < ?) AS cleaner FROM copies WHERE item = ? AND finish = ?').bind(o.scuff, o.item, o.finish).first();
  const all = await env.DB.prepare('SELECT COUNT(*) AS pop FROM copies WHERE item = ?').bind(o.item).first();
  return json({ pop: same.pop, rank: (same.cleaner || 0) + 1, itemPop: all.pop }, 200, { 'Cache-Control': 'public, max-age=60' });
}

async function insertCopy(env, row, worn = 0) {
  const at = new Date().toISOString();
  const r = await env.DB.prepare('INSERT INTO copies(key, code, item, game, slot, finish, grade, one_in, scuff, source, worn, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(row.key, row.code, row.item, row.game, row.slot, row.finish, row.grade, row.one_in, row.scuff, row.source, worn, at).run();
  const id = r.meta.last_row_id;
  return { ...row, id, worn, at, pull: await numberCopy(env, row, id) };
}
/**
 * A new copy's place in its item's run (migrations/0009): the first 100 of an item are its 1st
 * edition. Starters and the founder's copies aren't counted. Before 0009, none.
 */
async function numberCopy(env, row, id) {
  if (row.source === 'starter' || row.source === 'founder' || !(row.one_in > 0)) return 0;
  try {
    // Only count once the column is there, so the run never skips numbers while 0009 waits.
    await env.DB.prepare('SELECT pull FROM copies WHERE id = ?').bind(id).first();
    const c = await env.DB.prepare('INSERT INTO counters(name, n) VALUES (?, 1) ON CONFLICT(name) DO UPDATE SET n = n + 1 RETURNING n').bind(`pull:${row.item}`).first();
    await env.DB.prepare('UPDATE copies SET pull = ? WHERE id = ?').bind(c.n, id).run();
    return c.n;
  } catch { return 0; }
}
const publicCopy = c => ({ id: c.id, key: c.key, code: c.code, slot: c.slot, grade: c.grade, oneIn: c.one_in >= ONE_OF_ONE ? null : c.one_in, one: c.one_in >= ONE_OF_ONE, worn: !!c.worn, source: c.source, at: c.at, tag: c.tag || '', ...(c.pull ? { pull: c.pull } : {}), ...(c.stats ? { stats: c.stats } : {}) });
// Copies that can change hands: not a starter, not the founder's.
const MOVABLE = "source NOT IN ('starter', 'founder')";

/** A claimed name's player record, made on first use: a starter from every machine (the founder's flag too). */
async function ensurePlayer(env, name) {
  const found = await env.DB.prepare('SELECT * FROM players WHERE key = ?').bind(name.key).first();
  if (found) {
    // A machine added since the player was made (the Pet shop) gives them its starter once.
    const { results: had } = await env.DB.prepare("SELECT DISTINCT game FROM copies WHERE key = ? AND source = 'starter'").bind(name.key).all();
    if (had.length < GAMES.length) {
      const has = new Set(had.map(r => r.game));
      for (const g of GAMES) {
        if (has.has(g)) continue;
        // Guarded, so two requests at once never give it twice.
        const row = copyRow(starter(name.seed, g), name.key, 'starter');
        await env.DB.prepare(`INSERT INTO copies(key, code, item, game, slot, finish, grade, one_in, scuff, source, worn, at)
          SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, 'starter', 0, ? WHERE NOT EXISTS (SELECT 1 FROM copies WHERE key = ? AND game = ? AND source = 'starter')`)
          .bind(row.key, row.code, row.item, row.game, row.slot, row.finish, row.grade, row.one_in, row.scuff, new Date().toISOString(), row.key, row.game).run();
      }
    }
    // A player from before stamps is given the ten to start once, as a new one is (their tickets are gone).
    await giveStarter(env, name.key);
    // A founder made before Origin existed is given it once.
    if (isFounder(name.seed) && !(await env.DB.prepare("SELECT 1 FROM copies WHERE key = ? AND item = 'aura.origin'").bind(name.key).first())) {
      await insertCopy(env, copyRow(FOUNDER_COPIES.aura, name.key, 'founder'), 1);
    }
    // A guy's rarity is recounted when the traits it counts change (tone, arms and feet joined them).
    // Rarity is the deal's: a picked look, earned parts and all, never changes it.
    const oneIn = guyOneIn(dealt(name.seed));
    if (Math.abs(oneIn - found.guy_one_in) > oneIn * 1e-9) {
      await env.DB.prepare('UPDATE players SET guy_one_in = ? WHERE key = ?').bind(oneIn, name.key).run();
      return { ...found, guy_one_in: oneIn };
    }
    return found;
  }
  const at = new Date().toISOString();
  const made = await env.DB.prepare('INSERT INTO players(key, guy_one_in, at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING')
    .bind(name.key, guyOneIn(dealt(name.seed)), at).run();
  if (made.meta.changes) {
    const founder = isFounder(name.seed);
    for (const [i, g] of GAMES.entries()) await insertCopy(env, copyRow(starter(name.seed, g), name.key, 'starter'), !founder && i === 0 ? 1 : 0);
    if (founder) {
      // He wears Origin on a clean background; the Gold flag is his to put on.
      await insertCopy(env, copyRow(FOUNDER_COPIES.flag, name.key, 'founder'), 0);
      await insertCopy(env, copyRow(FOUNDER_COPIES.aura, name.key, 'founder'), 1);
    }
  }
  await giveStarter(env, name.key);
  return env.DB.prepare('SELECT * FROM players WHERE key = ?').bind(name.key).first();
}

const owner = ownedName;

/**
 * Takes a capsule's stamps, or answers why not: none to take before 0010, or how many more the player
 * needs and where they come from. The club is read first, so a game just finished counts. Null once paid.
 */
async function pay(env, key, cost, what) {
  if (free(key)) return null;
  await readClub(env, key);
  const paid = await spendStamps(env, key, cost, what);
  if (paid === null) return json({ error: 'Stamps aren’t open yet' }, 503);
  if (paid) return null;
  const s = await stampsOf(env, key);
  const need = Math.max(1, cost - s.balance);
  return json({ error: shortOf(need, s.linked), need, stamps: s }, 402);
}

/**
 * Whether today's free capsule is open to a player: the founder's always is; anyone else's once they have
 * finished a DLE Club game today (UTC), as the club's days say. Only a name with a Google sign-in can be read
 * from the club. A player who hasn't played yet is read again, at most a minute apart, so a game just finished
 * counts. `{ open, why }`, `why` saying what to do while it's shut.
 */
async function freeCapsule(env, key) {
  if (free(key)) return { open: true, why: '' };
  const name = await env.DB.prepare('SELECT account FROM names WHERE key = ?').bind(key).first();
  if (!name?.account) return { open: false, why: FREE_SHUT.signin };
  // Until the club's days can be kept and read (0010, the shared secret, dle-club's lilguys-stats), and
  // whenever the club didn't answer the last time it was asked, the rule can't be checked: it stays open
  // rather than shutting everyone out.
  if (!(await stampsReady(env)) || typeof env.CLUB_SSO_SECRET !== 'string' || env.CLUB_SSO_SECRET.length < 32) return { open: true, why: '' };
  const day = today();
  if (await playedOn(env, key, day)) return { open: true, why: '' };
  await readClub(env, key, undefined, undefined, TODAY_EVERY);
  if (await playedOn(env, key, day)) return { open: true, why: '' };
  const read = await env.DB.prepare('SELECT club_read, stamps_read FROM players WHERE key = ?').bind(key).first();
  if (read && read.stamps_read < read.club_read) return { open: true, why: '' };
  return { open: false, why: FREE_SHUT.play };
}
const FREE_SHUT = { signin: 'Sign in to DLE Club and finish a game today to open it.', play: 'Finish a DLE Club game today to open it.' };

/** A player's stamps, with whether their name has a Google sign-in for the club to read and when it was claimed. */
async function stampsOf(env, key) {
  const name = await env.DB.prepare('SELECT account, at FROM names WHERE key = ?').bind(key).first();
  return stampState(env, key, { founder: free(key), linked: !!name?.account, claimed: name?.at || '' });
}

async function meState(env, name) {
  const p = await ensurePlayer(env, name);
  // The card stats: count whatever is on, and credit the owner's club days to it.
  await putOn(env, name.key, today());
  await readClub(env, name.key);
  const results = await withStats(env, (await env.DB.prepare('SELECT * FROM copies WHERE key = ? ORDER BY id').bind(name.key).all()).results, today());
  const { results: swaps } = await env.DB.prepare(`SELECT s.id, s.from_key, s.to_key, s.give, s.want, s.at, g.code AS give_code, g.tag AS give_tag, w.code AS want_code, w.tag AS want_tag
    FROM swaps s LEFT JOIN copies g ON g.id = s.give LEFT JOIN copies w ON w.id = s.want WHERE s.state = 'open' AND (s.from_key = ? OR s.to_key = ?) ORDER BY s.id DESC`).bind(name.key, name.key).all();
  return { key: name.key, seed: name.seed, look: p.look, parts: await partsOf(env, name.key), metal: p.metal ?? 0, stamps: await stampsOf(env, name.key), freeDay: p.free_day, freeCapsule: await freeCapsule(env, name.key), todayGame: todayGame(), rules: RULES, copies: results.map(publicCopy),
    swaps: swaps.map(x => ({ id: x.id, from: x.from_key, to: x.to_key, give: { id: x.give, code: x.give_code, tag: x.give_tag || '' }, want: x.want ? { id: x.want, code: x.want_code, tag: x.want_tag || '' } : null, at: x.at })) };
}

/** Everything a signed-in owner does: read their state, open a capsule, wear, change their look, trade, craft and swap. */
async function me(request, env, key, action) {
  const name = await owner(request, env, key);
  if (!name) return json({ error: 'Owner token required' }, 401);
  if (action === 'state' && request.method === 'GET') return json(await meState(env, name));
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, { Allow: 'POST' });
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'Cross-origin writes are not allowed' }, 403);
  const body = await request.json().catch(() => ({}));
  await ensurePlayer(env, name);
  const day = today();

  if (action === 'open') {
    // A mystery capsule (5 stamps) comes from any machine at random, drawn here; a picked machine costs 8.
    // Today's machine is also free once a day, for a player who has finished a DLE Club game today.
    const mystery = !!body.mystery && !body.free;
    const game = mystery ? mysteryMachine(crypto.randomUUID()) : body.game;
    if (!GAMES.includes(game)) return json({ error: 'Unknown machine' }, 400);
    if (body.free) {
      if (game !== todayGame()) return json({ error: 'Only today’s machine is free' }, 409);
      const shut = await freeCapsule(env, key);
      if (!shut.open) return json({ error: shut.why, freeCapsule: shut }, 403);
      const r = await env.DB.prepare('UPDATE players SET free_day = ? WHERE key = ? AND free_day <> ?').bind(day, key, day).run();
      if (!r.meta.changes) return json({ error: 'Today’s free capsule is already open' }, 409);
    } else {
      const short = await pay(env, key, mystery ? RULES.mystery : RULES.capsule, mystery ? 'mystery' : `machine:${game}`);
      if (short) return short;
    }
    // Count the capsule before rolling it, so two opened at once never share a beginner's roll.
    const count = await env.DB.prepare('UPDATE players SET opened = opened + 1 WHERE key = ? RETURNING opened, dry').bind(key).first();
    const { o, luck } = luckyRoll(game, count.opened - 1, count.dry);
    await env.DB.prepare('UPDATE players SET dry = CASE WHEN ? THEN 0 ELSE dry + 1 END WHERE key = ?').bind(gradeIndex(o) >= PRIZED ? 1 : 0, key).run();
    // The day's free capsule is a souvenir of that day: no other capsule can be one.
    const copy = await insertCopy(env, copyRow(body.free ? { ...o, souvenir: day } : o, key, body.free ? 'daily' : 'capsule'));
    // Now and then a capsule also unlocks a rare face part.
    // Every capsule unlocks a part the player hasn't got yet, until there are none left.
    const mine = unlocksOf(await partsOf(env, key)), own = dealt(name.seed);
    const drop = rollPart(crypto.randomUUID(), p => pickable(own, p.slot, mine).includes(p.index));
    const part = drop ? await grantPart(env, name, drop) : null;
    const p = await env.DB.prepare('SELECT free_day FROM players WHERE key = ?').bind(key).first();
    return json({ copy: publicCopy(copy), game, part, stamps: await stampsOf(env, key), freeDay: p.free_day, luck }, 201);
  }
  if (action === 'season') {
    if (!inSeason(day).length) return json({ error: 'Nothing is in season' }, 409);
    const short = await pay(env, key, RULES.seasonal, 'seasonal');
    if (short) return short;
    const copy = await insertCopy(env, copyRow(rollSeason(crypto.randomUUID(), day), key, 'seasonal'));
    return json({ copy: publicCopy(copy), stamps: await stampsOf(env, key) }, 201);
  }
  if (action === 'trade') {
    // Trade up: five copies of one grade, none worn, starters and the founder's aside, for one copy of the next
    // grade from one of their games. The five go in one guarded delete, so a copy can never be traded twice.
    const asked = Array.isArray(body.ids) ? body.ids : [];
    const ids = [...new Set(asked.map(Number))];
    // An id the page didn't have (a copy it hadn't heard about from the server) comes as null.
    if (ids.some(id => !Number.isInteger(id) || id <= 0)) return json({ error: 'Your locker changed. Reload and try again.' }, 409);
    if (ids.length !== RULES.trade) return json({ error: `Pick ${RULES.trade} copies to trade` }, 400);
    const marks = ids.map(() => '?').join(',');
    const { results: give } = await env.DB.prepare(`SELECT * FROM copies WHERE key = ? AND id IN (${marks})`).bind(key, ...ids).all();
    if (give.length !== ids.length) return json({ error: 'Not your copies' }, 404);
    // A copy's grade is its code's, as the page reads it: the stored column is only an index for the Pulls page.
    const grades = give.map(c => { const o = decode(c.code); return o ? gradeIndex(o) : -1; });
    const grade = grades[0];
    if (grades.some(g => g !== grade || g < 0)) return json({ error: 'Trade five copies of one grade' }, 400);
    if (give.some(c => c.source === 'starter' || c.source === 'founder')) return json({ error: 'Starters and the founder’s copies can’t be traded' }, 400);
    if (give.some(c => c.worn)) return json({ error: 'Take it off first: worn copies can’t be traded' }, 400);
    // A trade never makes an aura: they only come out of capsules.
    if (grade >= GRADES.findIndex(g => g.id === 'grail')) return json({ error: 'A Grail is as high as a trade goes' }, 400);
    // The result comes from one of the inputs' machines, each as likely as its share of the five, and its float
    // is the inputs' average place in their finishes (CS's rule), so clean inputs make a clean result.
    const game = give[Math.floor(Math.random() * give.length)].game;
    const out = tradeGrade(grade, Math.random(), GRADES.findIndex(g => g.id === 'grail'));
    let o = null;
    for (let i = 0; i < 50000; i++) { const r = roll(crypto.randomUUID(), game); if (gradeIndex(r) === out.grade) { o = r; break; } }
    if (!o) return json({ error: 'Could not trade just now' }, 503);
    o = { ...o, scuff: tradeFloat(give.map(c => ({ finish: c.finish, scuff: c.scuff })), o.finish) };
    const fits = `key = ? AND worn = 0 AND source NOT IN ('starter', 'founder') AND id IN (${marks})`;
    const [gone] = await env.DB.batch([
      env.DB.prepare(`DELETE FROM copies WHERE ${fits} AND (SELECT COUNT(*) FROM copies WHERE ${fits}) = ?`).bind(key, ...ids, key, ...ids, ids.length),
      // Offers of the traded copies can no longer happen.
      env.DB.prepare(`UPDATE swaps SET state = 'void' WHERE state = 'open' AND (give IN (${marks}) OR want IN (${marks})) AND NOT EXISTS (SELECT 1 FROM copies WHERE id IN (${marks}))`).bind(...ids, ...ids, ...ids),
    ]);
    if (gone.meta.changes !== ids.length) return json({ error: 'Those copies changed. Reload and try again.' }, 409);
    const copy = await insertCopy(env, copyRow(o, key, 'trade'));
    return json({ copy: publicCopy(copy), traded: ids, outcome: out.outcome }, 201);
  }
  if (action === 'tag') {
    // A name tag on one of your copies; it stays with the copy wherever it goes. An empty tag takes it off.
    const tag = cleanTag(typeof body.tag === 'string' ? body.tag : '');
    if (tag === null) return json({ error: 'That tag can’t be used. Letters, numbers and simple punctuation, up to 20.' }, 400);
    const r = await env.DB.prepare('UPDATE copies SET tag = ? WHERE id = ? AND key = ?').bind(tag, Number(body.id), key).run();
    if (!r.meta.changes) return json({ error: 'Not your copy' }, 404);
    return json({ id: Number(body.id), tag });
  }
  if (action === 'swap') {
    // Offer one of your copies to another player, for one of theirs or as a gift. Nothing moves until they accept.
    const to = await heldKey(env, nameKey(String(body.to || '')));
    if (to === key) return json({ error: 'Pick another player' }, 400);
    if (!to) return json({ error: 'No one has claimed that name' }, 404);
    const give = await env.DB.prepare(`SELECT id FROM copies WHERE id = ? AND key = ? AND worn = 0 AND ${MOVABLE}`).bind(Number(body.give), key).first();
    if (!give) return json({ error: 'Offer one of your copies that isn’t worn or a starter' }, 400);
    let want = null;
    if (body.want != null) {
      want = await env.DB.prepare(`SELECT id FROM copies WHERE id = ? AND key = ? AND ${MOVABLE}`).bind(Number(body.want), to).first();
      if (!want) return json({ error: 'That copy isn’t theirs to swap' }, 400);
    }
    const open = await env.DB.prepare("SELECT COUNT(*) AS n FROM swaps WHERE from_key = ? AND state = 'open'").bind(key).first();
    if (open.n >= RULES.swaps) return json({ error: `You have ${RULES.swaps} offers out. Wait for an answer or take one back.` }, 429);
    const at = new Date().toISOString();
    const r = await env.DB.prepare("INSERT INTO swaps(from_key, to_key, give, want, state, at) VALUES (?, ?, ?, ?, 'open', ?)").bind(key, to, give.id, want ? want.id : null, at).run();
    return json({ id: r.meta.last_row_id, from: key, to, give: give.id, want: want ? want.id : null, at }, 201);
  }
  if (action === 'swap-accept') {
    // Both copies move in one transaction, and only if both are still where the offer found them. The one offered
    // must still be unworn; the one asked for is the accepter's own, so if they have it on it comes off them (with
    // its days worn banked), since an offer is most often for the copy a player shows on their guy.
    const id = Number(body.id), nonce = crypto.randomUUID();
    const s = await env.DB.prepare("SELECT * FROM swaps WHERE id = ? AND to_key = ? AND state = 'open'").bind(id, key).first();
    if (!s) return json({ error: 'That offer is gone' }, 404);
    const ok = `EXISTS (SELECT 1 FROM copies WHERE id = swaps.give AND key = swaps.from_key AND worn = 0) AND (swaps.want IS NULL OR EXISTS (SELECT 1 FROM copies WHERE id = swaps.want AND key = swaps.to_key))`;
    const won = 'EXISTS (SELECT 1 FROM swaps WHERE id = ? AND nonce = ?)';
    const moved = s.want ? [s.give, s.want] : [s.give];
    const bank = s.want && await statsReady(env)
      ? [env.DB.prepare(`UPDATE copies SET ${BANK_DAYS} WHERE id = ? AND key = ? AND worn = 1 AND worn_since <> '' AND ${won}`).bind(day, day, s.want, key, id, nonce)] : [];
    const r = await env.DB.batch([
      env.DB.prepare(`UPDATE swaps SET state = 'done', nonce = ? WHERE id = ? AND to_key = ? AND state = 'open' AND ${ok}`).bind(nonce, id, key),
      ...bank,
      env.DB.prepare(`UPDATE copies SET key = ?, worn = 0 WHERE id = ? AND ${won}`).bind(s.to_key, s.give, id, nonce),
      env.DB.prepare(`UPDATE copies SET key = ?, worn = 0 WHERE id = ? AND ${won}`).bind(s.from_key, s.want ?? -1, id, nonce),
      // Other open offers for either copy can no longer happen.
      env.DB.prepare(`UPDATE swaps SET state = 'void' WHERE state = 'open' AND id <> ? AND (give IN (${moved.map(() => '?').join(',')}) OR want IN (${moved.map(() => '?').join(',')})) AND ${won}`).bind(id, ...moved, ...moved, id, nonce),
    ]);
    if (!r[0].meta.changes) {
      await env.DB.prepare("UPDATE swaps SET state = 'void' WHERE id = ? AND state = 'open'").bind(id).run();
      return json({ error: 'One of those copies has moved or is being worn, so the offer has lapsed.' }, 409);
    }
    return json({ id, done: true, got: s.give, gave: s.want });
  }
  if (action === 'swap-cancel') {
    // The one who made an offer takes it back; the one it was made to turns it down.
    const r = await env.DB.prepare("UPDATE swaps SET state = CASE WHEN from_key = ? THEN 'withdrawn' ELSE 'declined' END WHERE id = ? AND state = 'open' AND (from_key = ? OR to_key = ?)")
      .bind(key, Number(body.id), key, key).run();
    if (!r.meta.changes) return json({ error: 'That offer is gone' }, 404);
    return json({ id: Number(body.id), done: false });
  }
  if (action === 'wear') {
    const slot = body.slot;
    if (!['skin', 'hat', 'frame', 'buddy', 'aura'].includes(slot)) return json({ error: 'Unknown slot' }, 400);
    if (body.id != null) {
      const c = await env.DB.prepare('SELECT id FROM copies WHERE id = ? AND key = ? AND slot = ?').bind(Number(body.id), key, slot).first();
      if (!c) return json({ error: 'Not your copy' }, 404);
    }
    // What comes off takes its club days and its days worn with it; what goes on starts counting today.
    await readClub(env, key);
    await takeOff(env, key, day, slot);
    await env.DB.prepare('UPDATE copies SET worn = 0 WHERE key = ? AND slot = ?').bind(key, slot).run();
    if (body.id != null) await env.DB.prepare('UPDATE copies SET worn = 1 WHERE id = ? AND key = ?').bind(Number(body.id), key).run();
    await putOn(env, key, day);
    return json({ ok: true });
  }
  // Crafting, as in TF2: smelt copies into metal, craft the item you want, paint a hat or a buddy.
  if (action === 'smelt' || action === 'craft' || action === 'paint' || action === 'craft-part') {
    try { await env.DB.prepare('SELECT metal FROM players WHERE key = ?').bind(key).first(); }
    catch { return json({ error: 'Crafting isn’t open yet' }, 503); }
  }
  if (action === 'smelt') {
    const ids = Array.isArray(body.ids) ? [...new Set(body.ids.map(Number).filter(Number.isInteger))].slice(0, 50) : [];
    if (!ids.length) return json({ error: 'Pick copies to smelt' }, 400);
    let metal = 0;
    for (const id of ids) {
      const c = await env.DB.prepare(`SELECT * FROM copies WHERE id = ? AND key = ? AND worn = 0 AND ${MOVABLE}`).bind(id, key).first();
      if (!c) continue;
      if (await env.DB.prepare("SELECT 1 FROM swaps WHERE state = 'open' AND (give = ? OR want = ?)").bind(id, id).first()) continue;
      const value = smeltValue(decode(c.code));
      if (!value) continue;
      const r = await env.DB.prepare('DELETE FROM copies WHERE id = ? AND key = ? AND worn = 0').bind(id, key).run();
      if (r.meta.changes) metal += value;
    }
    if (!metal) return json({ error: 'None of those can be smelted' }, 409);
    await env.DB.prepare('UPDATE players SET metal = metal + ? WHERE key = ?').bind(metal, key).run();
    const p = await env.DB.prepare('SELECT metal FROM players WHERE key = ?').bind(key).first();
    return json({ smelted: metal, metal: p.metal });
  }
  if (action === 'craft') {
    const item = itemById(body.item);
    if (!craftable(item)) return json({ error: 'That can’t be crafted' }, 400);
    const r = await env.DB.prepare('UPDATE players SET metal = metal - ? WHERE key = ? AND metal >= ?').bind(CRAFT_COST, key, CRAFT_COST).run();
    if (!r.meta.changes) return json({ error: 'Not enough metal' }, 402);
    const count = await env.DB.prepare("INSERT INTO counters(name, n) VALUES ('craft', 1) ON CONFLICT(name) DO UPDATE SET n = n + 1 RETURNING n").first();
    const copy = await insertCopy(env, copyRow(craftCopy(item.id, crypto.randomUUID(), count.n), key, 'craft'));
    const p = await env.DB.prepare('SELECT metal FROM players WHERE key = ?').bind(key).first();
    return json({ copy: publicCopy(copy), metal: p.metal }, 201);
  }
  // A part crafted from metal: the exact eyes, mouth, shape or colour a player wants.
  if (action === 'craft-part') {
    const drop = readPart(String(body.part || ''));
    if (!drop) return json({ error: 'That isn’t a part you can craft' }, 400);
    if (pickable(dealt(name.seed), drop.slot, unlocksOf(await partsOf(env, key))).includes(drop.index)) return json({ error: 'You already have that one' }, 409);
    const cost = partCost(drop);
    const r = await env.DB.prepare('UPDATE players SET metal = metal - ? WHERE key = ? AND metal >= ?').bind(cost, key, cost).run();
    if (!r.meta.changes) return json({ error: 'Not enough metal' }, 402);
    const part = await grantPart(env, name, drop);
    const p = await env.DB.prepare('SELECT metal FROM players WHERE key = ?').bind(key).first();
    return json({ part, metal: p.metal }, 201);
  }
  if (action === 'paint') {
    const paint = body.paint == null ? null : String(body.paint);
    if (paint && !PAINT_IDS.includes(paint)) return json({ error: 'Unknown paint' }, 400);
    const c = await env.DB.prepare('SELECT * FROM copies WHERE id = ? AND key = ?').bind(Number(body.id), key).first();
    if (!c || !PAINTABLE.includes(c.slot)) return json({ error: 'Only your hats and buddies take paint' }, 404);
    const o = decode(c.code);
    if ((o.paint ?? null) === paint) return json({ copy: publicCopy(c) });
    // Painting costs metal; scraping it off is free.
    if (paint) {
      const r = await env.DB.prepare('UPDATE players SET metal = metal - ? WHERE key = ? AND metal >= ?').bind(PAINT_COST, key, PAINT_COST).run();
      if (!r.meta.changes) return json({ error: 'Not enough metal' }, 402);
      o.paint = paint;
    } else delete o.paint;
    await env.DB.prepare('UPDATE copies SET code = ? WHERE id = ? AND key = ?').bind(encode(o), c.id, key).run();
    const p = await env.DB.prepare('SELECT metal FROM players WHERE key = ?').bind(key).first();
    return json({ copy: publicCopy({ ...c, code: encode(o) }), metal: p.metal });
  }
  if (action === 'look') {
    const look = typeof body.look === 'string' ? body.look : '';
    if (look && !decodeLook(look, dealt(name.seed), unlocksOf(await partsOf(env, key)))) return json({ error: 'That look isn’t yours to pick' }, 400);
    await env.DB.prepare('UPDATE players SET look = ?, guy_one_in = ? WHERE key = ?').bind(look, guyOneIn(dealt(name.seed)), key).run();
    return json({ look });
  }
  return json({ error: 'Unknown action' }, 404);
}

/** Everyone's guys, rarest or newest first, with what each wears and their best copy. */
async function guys(env, url) {
  // Rarest first puts the founder at the top: he is ranked the one of one, whatever his traits' odds.
  const sort = url.searchParams.get('sort') === 'recent' ? 'n.at DESC' : `n.seed = '${FOUNDER_SEED}' DESC, COALESCE(p.guy_one_in, 0) DESC, n.at`;
  const limit = Math.min(200, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '48') || 48));
  const offset = Math.max(0, Number.parseInt(url.searchParams.get('offset') || '0') || 0);
  // Searched by skeleton, so `cool_guy` finds `coolguy` and the other way round.
  const q = nameSkeleton(nameKey(url.searchParams.get('q') || ''));
  const { results } = await env.DB.prepare(`SELECT n.key, n.seed, n.at, COALESCE(p.look, '') AS look, p.guy_one_in FROM names n LEFT JOIN players p ON p.key = n.key
    WHERE replace(n.key, '_', '') LIKE ? ORDER BY ${sort} LIMIT ? OFFSET ?`).bind(`%${q}%`, limit, offset).all();
  const keys = results.map(r => r.key);
  const owned = keys.length ? (await env.DB.prepare(`SELECT * FROM copies WHERE key IN (${keys.map(() => '?').join(',')}) AND (worn = 1 OR source <> 'starter')`).bind(...keys).all()).results : [];
  return json(results.map(r => {
    const mine = owned.filter(c => c.key === r.key);
    const best = mine.filter(c => c.source !== 'starter').sort((a, b) => b.one_in - a.one_in)[0];
    return { key: r.key, seed: r.seed, at: r.at, look: r.look, oneIn: r.guy_one_in || guyOneIn(dealt(r.seed)), worn: mine.filter(c => c.worn).map(c => c.code), best: best ? publicCopy(best) : null };
  }));
}

/** Every copy anyone owns, starters aside: filtered by grade, game, slot or finish, and sorted by rarity, float or newest. */
async function market(env, url) {
  const where = ["source <> 'starter'"], args = [];
  const grade = url.searchParams.get('grade');
  if (grade !== null && /^[0-4]$/.test(grade)) { where.push('grade = ?'); args.push(Number(grade)); }
  for (const f of ['game', 'slot', 'finish']) {
    const v = url.searchParams.get(f);
    if (v && /^[a-z]{2,16}$/.test(v)) { where.push(`${f} = ?`); args.push(v); }
  }
  const holder = (url.searchParams.get('key') || '').toLowerCase();
  if (NAME_KEY.test(holder)) { where.push('key = ?'); args.push(holder); }
  const sort = { float: 'scuff ASC', newest: 'id DESC' }[url.searchParams.get('sort')] || 'one_in DESC, scuff ASC';
  const limit = Math.min(96, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '60') || 60));
  const offset = Math.max(0, Number.parseInt(url.searchParams.get('offset') || '0') || 0);
  const { results } = await env.DB.prepare(`SELECT c.*, n.seed, COALESCE(p.look, '') AS look FROM copies c JOIN names n ON n.key = c.key LEFT JOIN players p ON p.key = c.key
    WHERE ${where.map(w => 'c.' + w).join(' AND ')} ORDER BY ${sort.split(', ').map(s => 'c.' + s).join(', ')} LIMIT ? OFFSET ?`).bind(...args, limit, offset).all();
  return json(results.map(c => ({ ...publicCopy(c), seed: c.seed, look: c.look })));
}

async function stats(env) {
  const players = await env.DB.prepare('SELECT COUNT(*) AS n FROM names').first();
  const { results } = await env.DB.prepare("SELECT grade, COUNT(*) AS n FROM copies WHERE source <> 'starter' GROUP BY grade").all();
  const grades = [0, 0, 0, 0, 0];
  for (const r of results) grades[r.grade] = r.n;
  // How many of each item in each finish have ever been pulled, for the Pulls page: [item, finish, n].
  const byItem = await env.DB.prepare("SELECT item, finish, COUNT(*) AS n FROM copies WHERE source <> 'starter' GROUP BY item, finish").all();
  const counts = byItem.results.map(r => [r.item, r.finish, r.n]);
  return json({ players: players.n, copies: grades.reduce((a, b) => a + b, 0), grades, counts, todayGame: todayGame(), rules: RULES });
}

export async function api(request, env, url = new URL(request.url)) {
  if (url.pathname.startsWith('/api/auth/')) return authApi(request, env, url);
  if (url.pathname === '/api/club/guys') return clubGuys(request, env, guyOf);
  if (url.pathname === '/api/club/named') return namedGuys(request, env, guyOf, url);
  if (request.method === 'GET' && url.pathname === '/api/names') {
    const limit = Math.min(12, Math.max(1, Number.parseInt(url.searchParams.get('recent') || '12') || 12));
    const { results } = await env.DB.prepare('SELECT key, seed, at FROM names ORDER BY at DESC LIMIT ?').bind(limit).all();
    return json(results);
  }
  if (request.method === 'GET' && url.pathname === '/api/guys') return guys(env, url);
  if (request.method === 'GET' && url.pathname === '/api/market') return market(env, url);
  if (request.method === 'GET' && url.pathname === '/api/stats') return stats(env);
  if (request.method === 'GET' && url.pathname === '/api/rank') return rank(env, url);
  const profile = /^\/api\/guys\/([a-z0-9_]{2,16})$/.exec(url.pathname);
  if (profile && request.method === 'GET') {
    const held = await heldKey(env, profile[1]);
    const name = held && await env.DB.prepare('SELECT key, seed, at FROM names WHERE key = ?').bind(held).first();
    if (!name) return json({ error: 'Not claimed' }, 404);
    const p = await ensurePlayer(env, name);
    const results = await withStats(env, (await env.DB.prepare('SELECT * FROM copies WHERE key = ? ORDER BY one_in DESC, id').bind(name.key).all()).results, today());
    return json({ key: name.key, seed: name.seed, at: name.at, look: p.look, oneIn: p.guy_one_in, copies: results.map(publicCopy) });
  }
  const mine = /^\/api\/me\/([a-z0-9_]{2,16})\/(state|open|season|wear|look|trade|tag|swap|swap-accept|swap-cancel|smelt|craft|craft-part|paint)$/.exec(url.pathname);
  if (mine) return me(request, env, mine[1], mine[2]);

  const match = /^\/api\/names\/([a-z0-9_]{2,16})$/.exec(url.pathname);
  if (!match || !NAME_KEY.test(match[1])) return json({ error: 'Invalid name or endpoint' }, 404);
  const key = match[1];
  if (request.method === 'GET') {
    const held = await heldKey(env, key);
    const name = held && await env.DB.prepare('SELECT key, seed, at FROM names WHERE key = ?').bind(held).first();
    return name ? json(name) : json({ error: 'Not claimed' }, 404);
  }
  if (!['POST', 'DELETE'].includes(request.method)) return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST, DELETE' });
  const origin = request.headers.get('Origin');
  if (origin && origin !== url.origin) return json({ error: 'Cross-origin writes are not allowed' }, 403);
  if (request.method === 'DELETE') {
    const name = await owner(request, env, key);
    if (!name) return json({ error: 'Owner authentication required' }, request.headers.has('Authorization') ? 403 : 401);
    // Recheck ownership in the write: a concurrent release/reclaim must not delete a new owner's name.
    const session = await sessionAccount(request, env);
    const token = request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
    const proof = session && (await env.DB.prepare('SELECT key FROM names WHERE key = ? AND account = ?').bind(key, session.account).first())
      ? { clause: 'account = ?', value: session.account }
      : { clause: 'owner = ? AND account IS NULL', value: token ? await digest(token) : '' };
    // Delete the collection and name in one transaction, guarded by the same current owner.
    const guard = `EXISTS (SELECT 1 FROM names WHERE key = ? AND ${proof.clause})`;
    // Its stamps go too (from 0010), so whoever claims the name next starts fresh.
    const stamps = await stampsReady(env) ? ['club_days', 'stamp_ledger'].map(t => env.DB.prepare(`DELETE FROM ${t} WHERE key = ? AND ${guard}`).bind(key, key, proof.value)) : [];
    const results = await env.DB.batch([
      env.DB.prepare(`DELETE FROM copies WHERE key = ? AND ${guard}`).bind(key, key, proof.value),
      env.DB.prepare(`DELETE FROM players WHERE key = ? AND ${guard}`).bind(key, key, proof.value),
      ...stamps,
      env.DB.prepare(`DELETE FROM names WHERE key = ? AND ${proof.clause}`).bind(key, proof.value),
    ]);
    if (!results.at(-1).meta.changes) return json({ error: 'Owner authentication changed. Reload and try again.' }, 403);
    return json({ deleted: true });
  }
  if (!env.CLAIM_SALT) return json({ error: 'Name claims are not configured' }, 503);
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip) return json({ error: 'Client address unavailable' }, 503);
  // Only a keyed, daily digest is persisted; raw addresses never leave this request.
  const day = new Date().toISOString().slice(0, 10);
  const hash = await digest(`${env.CLAIM_SALT}:${day}:${ip}`);
  const count = await env.DB.prepare(`INSERT INTO claim_limits(hash, day, attempts) VALUES (?, ?, 1)
    ON CONFLICT(hash) DO UPDATE SET attempts = attempts + 1 RETURNING attempts`).bind(hash, day).first();
  if (count.attempts > 10) return json({ error: 'Daily claim limit reached. Try tomorrow.' }, 429);
  await env.DB.prepare('DELETE FROM claim_limits WHERE day < ?').bind(day).run();
  if (nameSkeleton(key) === 'isaac' && key !== 'isaac') return json({ error: 'This name is reserved' }, 403);
  if (await skeletonTaken(env, key)) return json({ error: 'That name was just taken' }, 409);
  if (key === 'isaac' && (!env.FOUNDER_SECRET || !await equal(request.headers.get('X-Founder-Secret') || '', env.FOUNDER_SECRET))) {
    return json({ error: 'This name is reserved' }, 403);
  }
  const seed = key === 'isaac' ? FOUNDER_SEED : makeSeed();
  const ownerToken = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
  const at = new Date().toISOString();
  const session = await sessionAccount(request, env);
  const result = await env.DB.prepare('INSERT INTO names(key, seed, owner, at, account) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING')
    .bind(key, seed, await digest(ownerToken), at, session?.account || null).run();
  if (!result.meta.changes) return json({ error: 'That name was just taken' }, 409);
  await ensurePlayer(env, { key, seed });
  return json({ key, seed, owner: session ? null : ownerToken, linked: !!session, at }, 201);
}
