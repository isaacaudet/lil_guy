import { authApi, ownedName, sessionAccount } from './auth.js';
import {
  roll, rollSeason, starter, encode, decode, gradeOf, copyOneIn, itemById, slotOf, GRADES, GAMES, inSeason,
  decodeLook, resolve, makeSeed, guyOneIn, heads, eyes, mouths, cheeks, hair, bodies, accessories, palettes,
} from '../src/index-headless.ts';

const json = (body, status = 200, extra = {}) => Response.json(body, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra },
});
const digest = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b => b.toString(16).padStart(2, '0')).join('');
const equal = async (a, b) => (await digest(a)) === (await digest(b));

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try { return await api(request, env, url); }
    catch { return json({ error: 'Names are temporarily unavailable. Please try again.' }, 503); }
  },
};

// ------------------------------------------------------------ the guys and their copies
// The rules the page plays by, kept here so the server decides them: what a capsule costs, what a claim
// starts with, what collecting the day's tickets gives, and which machine is free today. Tickets are
// endless for now (the owner): capsules and seasonals cost nothing until there is something to earn them with.
export const RULES = { start: 1200, capsule: 120, seasonal: 150, daily: 360, infinite: true, trade: 5 };
const today = () => new Date().toISOString().slice(0, 10);
export const todayGame = () => GAMES[Math.floor(Date.now() / 864e5) % GAMES.length];

// "isaac" is the founder's: a clean guy in a crown, and two copies no capsule gives, the Gold flag and the
// Origin aura (the page draws the same).
const byName = (list, name) => list.findIndex(x => x.name === name);
const FOUNDER = {
  parts: { head: byName(heads, 'round'), eyes: byName(eyes, 'glossy'), mouth: byName(mouths, 'smile'), cheeks: byName(cheeks, 'blush'), hair: byName(hair, 'crown'), body: 0, accessory: 0, arms: 2, feet: 0, shade: 1, flip: false, lucky: false },
  palette: byName(palettes, 'Ocean'),
  copy: { item: 'trackdle.flag', finish: 'gold', scuff: 0, print: 1, tally: 999, pins: ['crown', 'star', 'flame'] },
  aura: { item: 'aura.origin', finish: 'classic', scuff: 0, print: 1 },
};
const dealt = seed => seed === 'founder:isaac' ? { ...resolve(seed, FOUNDER.parts), palette: FOUNDER.palette } : resolve(seed);
const guyOf = (seed, look) => { const base = dealt(seed); const picked = look ? decodeLook(look, base) : null; return picked ? { ...base, ...picked } : base; };
const ONE_OF_ONE = 1e18;

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
  return { ...row, id: r.meta.last_row_id, worn, at };
}
const publicCopy = c => ({ id: c.id, key: c.key, code: c.code, slot: c.slot, grade: c.grade, oneIn: c.one_in >= ONE_OF_ONE ? null : c.one_in, one: c.one_in >= ONE_OF_ONE, worn: !!c.worn, source: c.source, at: c.at });

/** A claimed name's player record, made on first use: its tickets and its nine starters (the founder's flag too). */
async function ensurePlayer(env, name) {
  const found = await env.DB.prepare('SELECT * FROM players WHERE key = ?').bind(name.key).first();
  if (found) {
    // A founder made before Origin existed is given it once.
    if (name.seed === 'founder:isaac' && !(await env.DB.prepare("SELECT 1 FROM copies WHERE key = ? AND item = 'aura.origin'").bind(name.key).first())) {
      await insertCopy(env, copyRow(FOUNDER.aura, name.key, 'founder'), 1);
    }
    return found;
  }
  const at = new Date().toISOString();
  const made = await env.DB.prepare('INSERT INTO players(key, tickets, guy_one_in, at) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING')
    .bind(name.key, RULES.start, guyOneIn(dealt(name.seed)), at).run();
  if (made.meta.changes) {
    const founder = name.seed === 'founder:isaac';
    for (const [i, g] of GAMES.entries()) await insertCopy(env, copyRow(starter(name.seed, g), name.key, 'starter'), !founder && i === 0 ? 1 : 0);
    if (founder) {
      // He wears Origin on a clean background; the Gold flag is his to put on.
      await insertCopy(env, copyRow(FOUNDER.copy, name.key, 'founder'), 0);
      await insertCopy(env, copyRow(FOUNDER.aura, name.key, 'founder'), 1);
    }
  }
  return env.DB.prepare('SELECT * FROM players WHERE key = ?').bind(name.key).first();
}

const owner = ownedName;

async function meState(env, name) {
  const p = await ensurePlayer(env, name);
  const { results } = await env.DB.prepare('SELECT * FROM copies WHERE key = ? ORDER BY id').bind(name.key).all();
  return { key: name.key, seed: name.seed, look: p.look, tickets: p.tickets, freeDay: p.free_day, checkinDay: p.checkin_day, todayGame: todayGame(), rules: RULES, copies: results.map(publicCopy) };
}

/** Everything a signed-in owner does: read their state, open a capsule, collect the day's tickets, wear, change their look. */
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
    const game = body.game;
    if (!GAMES.includes(game)) return json({ error: 'Unknown machine' }, 400);
    if (body.free) {
      if (game !== todayGame()) return json({ error: 'Only today’s machine is free' }, 409);
      const r = await env.DB.prepare('UPDATE players SET free_day = ? WHERE key = ? AND free_day <> ?').bind(day, key, day).run();
      if (!r.meta.changes) return json({ error: 'Today’s free capsule is already open' }, 409);
    } else if (!RULES.infinite) {
      const r = await env.DB.prepare('UPDATE players SET tickets = tickets - ? WHERE key = ? AND tickets >= ?').bind(RULES.capsule, key, RULES.capsule).run();
      if (!r.meta.changes) return json({ error: 'Not enough tickets' }, 402);
    }
    // The day's free capsule is a souvenir of that day: no other capsule can be one.
    const o = roll(crypto.randomUUID(), game);
    const copy = await insertCopy(env, copyRow(body.free ? { ...o, souvenir: day } : o, key, body.free ? 'daily' : 'capsule'));
    const p = await env.DB.prepare('SELECT tickets, free_day FROM players WHERE key = ?').bind(key).first();
    return json({ copy: publicCopy(copy), tickets: p.tickets, freeDay: p.free_day }, 201);
  }
  if (action === 'season') {
    if (!inSeason(day).length) return json({ error: 'Nothing is in season' }, 409);
    if (!RULES.infinite) {
      const r = await env.DB.prepare('UPDATE players SET tickets = tickets - ? WHERE key = ? AND tickets >= ?').bind(RULES.seasonal, key, RULES.seasonal).run();
      if (!r.meta.changes) return json({ error: 'Not enough tickets' }, 402);
    }
    const copy = await insertCopy(env, copyRow(rollSeason(crypto.randomUUID(), day), key, 'seasonal'));
    const p = await env.DB.prepare('SELECT tickets FROM players WHERE key = ?').bind(key).first();
    return json({ copy: publicCopy(copy), tickets: p.tickets }, 201);
  }
  if (action === 'checkin') {
    const r = await env.DB.prepare('UPDATE players SET tickets = tickets + ?, checkin_day = ? WHERE key = ? AND checkin_day <> ?').bind(RULES.daily, day, key, day).run();
    if (!r.meta.changes) return json({ error: 'Today’s tickets are already collected' }, 409);
    const p = await env.DB.prepare('SELECT tickets, checkin_day FROM players WHERE key = ?').bind(key).first();
    return json({ tickets: p.tickets, checkinDay: p.checkin_day });
  }
  if (action === 'trade') {
    // Trade up: five copies of one grade, none worn, starters and the founder's aside, for one copy of the next
    // grade from one of their games. The five go in one guarded delete, so a copy can never be traded twice.
    const ids = Array.isArray(body.ids) ? [...new Set(body.ids.map(Number))].filter(Number.isInteger) : [];
    if (ids.length !== RULES.trade) return json({ error: `Pick ${RULES.trade} copies to trade` }, 400);
    const marks = ids.map(() => '?').join(',');
    const { results: give } = await env.DB.prepare(`SELECT * FROM copies WHERE key = ? AND id IN (${marks})`).bind(key, ...ids).all();
    if (give.length !== ids.length) return json({ error: 'Not your copies' }, 404);
    const grade = give[0].grade;
    if (give.some(c => c.grade !== grade || c.worn || c.source === 'starter' || c.source === 'founder')) return json({ error: 'Trade five copies of one grade, none worn' }, 400);
    // A trade never makes an aura: they only come out of capsules.
    if (grade >= GRADES.findIndex(g => g.id === 'grail')) return json({ error: 'A Grail is as high as a trade goes' }, 400);
    const game = give[Math.floor(Math.random() * give.length)].game;
    let o = null;
    for (let i = 0; i < 50000; i++) { const r = roll(crypto.randomUUID(), game); if (GRADES.findIndex(g => g.id === gradeOf(r).id) === grade + 1) { o = r; break; } }
    if (!o) return json({ error: 'Could not trade just now' }, 503);
    const fits = `key = ? AND worn = 0 AND grade = ? AND source NOT IN ('starter', 'founder') AND id IN (${marks})`;
    const gone = await env.DB.prepare(`DELETE FROM copies WHERE ${fits} AND (SELECT COUNT(*) FROM copies WHERE ${fits}) = ?`)
      .bind(key, grade, ...ids, key, grade, ...ids, ids.length).run();
    if (gone.meta.changes !== ids.length) return json({ error: 'Those copies changed. Reload and try again.' }, 409);
    const copy = await insertCopy(env, copyRow(o, key, 'trade'));
    return json({ copy: publicCopy(copy), traded: ids }, 201);
  }
  if (action === 'wear') {
    const slot = body.slot;
    if (!['skin', 'hat', 'frame', 'buddy', 'aura'].includes(slot)) return json({ error: 'Unknown slot' }, 400);
    if (body.id != null) {
      const c = await env.DB.prepare('SELECT id FROM copies WHERE id = ? AND key = ? AND slot = ?').bind(Number(body.id), key, slot).first();
      if (!c) return json({ error: 'Not your copy' }, 404);
    }
    await env.DB.prepare('UPDATE copies SET worn = 0 WHERE key = ? AND slot = ?').bind(key, slot).run();
    if (body.id != null) await env.DB.prepare('UPDATE copies SET worn = 1 WHERE id = ? AND key = ?').bind(Number(body.id), key).run();
    return json({ ok: true });
  }
  if (action === 'look') {
    const look = typeof body.look === 'string' ? body.look : '';
    if (look && !decodeLook(look, dealt(name.seed))) return json({ error: 'That look isn’t yours to pick' }, 400);
    await env.DB.prepare('UPDATE players SET look = ?, guy_one_in = ? WHERE key = ?').bind(look, guyOneIn(guyOf(name.seed, look)), key).run();
    return json({ look });
  }
  return json({ error: 'Unknown action' }, 404);
}

/** Everyone's guys, rarest or newest first, with what each wears and their best copy. */
async function guys(env, url) {
  const sort = url.searchParams.get('sort') === 'recent' ? 'n.at DESC' : 'COALESCE(p.guy_one_in, 0) DESC, n.at';
  const limit = Math.min(200, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '48') || 48));
  const offset = Math.max(0, Number.parseInt(url.searchParams.get('offset') || '0') || 0);
  const q = (url.searchParams.get('q') || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16);
  const { results } = await env.DB.prepare(`SELECT n.key, n.seed, n.at, COALESCE(p.look, '') AS look, p.guy_one_in FROM names n LEFT JOIN players p ON p.key = n.key
    WHERE n.key LIKE ? ORDER BY ${sort} LIMIT ? OFFSET ?`).bind(`%${q}%`, limit, offset).all();
  const keys = results.map(r => r.key);
  const owned = keys.length ? (await env.DB.prepare(`SELECT * FROM copies WHERE key IN (${keys.map(() => '?').join(',')}) AND (worn = 1 OR source <> 'starter')`).bind(...keys).all()).results : [];
  return json(results.map(r => {
    const mine = owned.filter(c => c.key === r.key);
    const best = mine.filter(c => c.source !== 'starter').sort((a, b) => b.one_in - a.one_in)[0];
    return { key: r.key, seed: r.seed, at: r.at, look: r.look, oneIn: r.guy_one_in || guyOneIn(guyOf(r.seed, r.look)), worn: mine.filter(c => c.worn).map(c => c.code), best: best ? publicCopy(best) : null };
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
  if (/^[a-z0-9]{2,16}$/.test(holder)) { where.push('key = ?'); args.push(holder); }
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
  return json({ players: players.n, copies: grades.reduce((a, b) => a + b, 0), grades, todayGame: todayGame(), rules: RULES });
}

export async function api(request, env, url = new URL(request.url)) {
  if (url.pathname.startsWith('/api/auth/')) return authApi(request, env, url);
  if (request.method === 'GET' && url.pathname === '/api/names') {
    const limit = Math.min(12, Math.max(1, Number.parseInt(url.searchParams.get('recent') || '12') || 12));
    const { results } = await env.DB.prepare('SELECT key, seed, at FROM names ORDER BY at DESC LIMIT ?').bind(limit).all();
    return json(results);
  }
  if (request.method === 'GET' && url.pathname === '/api/guys') return guys(env, url);
  if (request.method === 'GET' && url.pathname === '/api/market') return market(env, url);
  if (request.method === 'GET' && url.pathname === '/api/stats') return stats(env);
  if (request.method === 'GET' && url.pathname === '/api/rank') return rank(env, url);
  const profile = /^\/api\/guys\/([a-z0-9]{2,16})$/.exec(url.pathname);
  if (profile && request.method === 'GET') {
    const name = await env.DB.prepare('SELECT key, seed, at FROM names WHERE key = ?').bind(profile[1]).first();
    if (!name) return json({ error: 'Not claimed' }, 404);
    const p = await ensurePlayer(env, name);
    const { results } = await env.DB.prepare('SELECT * FROM copies WHERE key = ? ORDER BY one_in DESC, id').bind(name.key).all();
    return json({ key: name.key, seed: name.seed, at: name.at, look: p.look, oneIn: p.guy_one_in, copies: results.map(publicCopy) });
  }
  const mine = /^\/api\/me\/([a-z0-9]{2,16})\/(state|open|season|checkin|wear|look|trade)$/.exec(url.pathname);
  if (mine) return me(request, env, mine[1], mine[2]);

  const match = /^\/api\/names\/([a-z0-9]{2,16})$/.exec(url.pathname);
  if (!match) return json({ error: 'Invalid name or endpoint' }, 404);
  const key = match[1];
  if (request.method === 'GET') {
    const name = await env.DB.prepare('SELECT key, seed, at FROM names WHERE key = ?').bind(key).first();
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
    const results = await env.DB.batch([
      env.DB.prepare(`DELETE FROM copies WHERE key = ? AND ${guard}`).bind(key, key, proof.value),
      env.DB.prepare(`DELETE FROM players WHERE key = ? AND ${guard}`).bind(key, key, proof.value),
      env.DB.prepare(`DELETE FROM names WHERE key = ? AND ${proof.clause}`).bind(key, proof.value),
    ]);
    if (!results[2].meta.changes) return json({ error: 'Owner authentication changed. Reload and try again.' }, 403);
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
  if (key === 'isaac' && (!env.FOUNDER_SECRET || !await equal(request.headers.get('X-Founder-Secret') || '', env.FOUNDER_SECRET))) {
    return json({ error: 'This name is reserved' }, 403);
  }
  const seed = key === 'isaac' ? 'founder:isaac' : makeSeed();
  const ownerToken = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
  const at = new Date().toISOString();
  const session = await sessionAccount(request, env);
  const result = await env.DB.prepare('INSERT INTO names(key, seed, owner, at, account) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING')
    .bind(key, seed, await digest(ownerToken), at, session?.account || null).run();
  if (!result.meta.changes) return json({ error: 'That name was just taken' }, 409);
  await ensurePlayer(env, { key, seed });
  return json({ key, seed, owner: session ? null : ownerToken, linked: !!session, at }, 201);
}
