// A card's stats, as on a sports card (migrations/0009): how many days a copy has been worn, and, while it
// was worn, how many DLE Club games its owner finished and their best club score that day. The stats stay
// with the copy when it changes hands, as a Strange counter does; a Strange copy's tally counts the days
// its owner finished club games wearing it.
//
// Days worn are counted from when a copy goes on (`worn_since`) to when it comes off, so a day counts
// whether or not anyone looked. Club days come from dleclub.com (its docs/accounts.md, Lil guys): the
// Worker asks for the owner's Google sign-in's days, signed with CLUB_SSO_SECRET, at most every ten
// minutes, and gives each day to the copies worn then. Before 0009 is applied, none of it runs. The same
// read keeps the days as stamps (stamps.js), from 0010 on.
import { decode, encode } from '../src/index-headless.ts';
import { keepDays, stampsReady, STAMPS_FROM } from './stamps.js';

export const CLUB_STATS = 'https://dleclub.com/api/club/lilguys-stats';
export const READ_EVERY = 10 * 60 * 1000;
const DAY = 86400000;
const dayOf = ms => new Date(ms).toISOString().slice(0, 10);
const dayNum = d => Math.round(Date.parse(`${d}T00:00:00Z`) / DAY);
const next = d => (d ? dayOf(Date.parse(`${d}T00:00:00Z`) + DAY) : '');

/** Days a copy has been worn, today included if it's on. */
export function daysWorn(c, today) {
  if (c.worn_days === undefined) return 0;
  const from = [c.worn_since, next(c.worn_last)].sort().pop();
  return c.worn_days + (c.worn && c.worn_since ? Math.max(0, dayNum(today) - dayNum(from) + 1) : 0);
}

/** Banks the days of the owner's worn copies (in one slot, or all) as they come off. */
export async function takeOff(env, key, day, slot) {
  try {
    await env.DB.prepare(`UPDATE copies SET worn_days = worn_days + MAX(0, CAST(julianday(?) - julianday(MAX(worn_since, COALESCE(date(worn_last, '+1 day'), worn_since))) AS INTEGER) + 1),
      worn_last = ?, worn_since = '' WHERE key = ? AND worn = 1 AND worn_since <> ''${slot ? ' AND slot = ?' : ''}`).bind(day, day, key, ...(slot ? [slot] : [])).run();
  } catch { /* before 0009 */ }
}

/** Starts the count for whatever the owner has on and isn't counted yet (a copy just put on, or worn before 0009). */
export async function putOn(env, key, day) {
  try { await env.DB.prepare("UPDATE copies SET worn_since = ? WHERE key = ? AND worn = 1 AND worn_since = ''").bind(day, key).run(); }
  catch { /* before 0009 */ }
}

const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export async function statsSignature(secret, a, since, t) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`stats.${a}.${since}.${t}`)));
}

/**
 * Reads the owner's club days, gives each to the copies worn then and keeps it as stamps. Quiet on any
 * failure: the club being down, sign-in off, a name with no Google sign-in, no 0009 (nothing is read) or
 * no 0010 (no stamps are kept) all leave things as they were.
 */
export async function readClub(env, key, now = Date.now(), fetcher = fetch) {
  const secret = env.CLUB_SSO_SECRET;
  if (typeof secret !== 'string' || secret.length < 32) return;
  try {
    const p = await env.DB.prepare('SELECT club_read FROM players WHERE key = ?').bind(key).first();
    if (!p || now - p.club_read < READ_EVERY) return;
    const name = await env.DB.prepare('SELECT account FROM names WHERE key = ?').bind(key).first();
    if (!name?.account) return;
    const { results: worn } = await env.DB.prepare("SELECT id, code, worn_since FROM copies WHERE key = ? AND worn = 1 AND worn_since <> ''").bind(key).all();
    const stamps = await stampsReady(env);
    const read = stamps ? (await env.DB.prepare('SELECT stamps_read FROM players WHERE key = ?').bind(key).first()).stamps_read : 0;
    await env.DB.prepare('UPDATE players SET club_read = ? WHERE key = ?').bind(now, key).run();
    // Each from where it last stopped, two days back for late scores: the copies from the earliest one
    // on, stamps from their first day. One read covers both, from whichever starts first.
    const settled = at => dayOf(at - 2 * DAY);
    const froms = [];
    if (worn.length) froms.push([worn.map(c => c.worn_since).sort()[0], p.club_read ? settled(p.club_read) : ''].sort().pop());
    if (stamps) froms.push([STAMPS_FROM, read ? settled(read) : ''].sort().pop());
    if (!froms.length) return;
    const since = froms.sort()[0];
    const t = Math.floor(now / 1000);
    const url = `${env.CLUB_STATS || CLUB_STATS}?a=${name.account}&since=${since}&t=${t}&sig=${await statsSignature(secret, name.account, since, t)}`;
    const r = await fetcher(url, { signal: AbortSignal.timeout(3000) });
    if (!r.ok) return;
    const { days } = await r.json();
    if (!Array.isArray(days)) return;
    const put = stamps ? keepDays(env, key, days) : [];
    for (const d of days) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d?.day) || !Number.isInteger(d.games) || !Number.isInteger(d.score)) continue;
      for (const c of worn) if (c.worn_since <= d.day) put.push(env.DB.prepare(`INSERT INTO copy_days(copy_id, day, games, score) VALUES (?, ?, ?, ?)
        ON CONFLICT(copy_id, day) DO UPDATE SET games = MAX(games, excluded.games), score = MAX(score, excluded.score)`).bind(c.id, d.day, d.games, d.score));
    }
    if (put.length) await env.DB.batch(put);
    // Stamps only move on once the club has answered, so a day it was down for is read again.
    if (stamps) await env.DB.prepare('UPDATE players SET stamps_read = ? WHERE key = ?').bind(now, key).run();
    // A Strange copy's tally: the days its owner finished club games wearing it.
    for (const c of worn) {
      const o = decode(c.code);
      if (o?.tally === undefined) continue;
      const n = (await env.DB.prepare('SELECT COUNT(*) AS n FROM copy_days WHERE copy_id = ? AND games > 0').bind(c.id).first()).n;
      if (n > o.tally) await env.DB.prepare('UPDATE copies SET code = ? WHERE id = ?').bind(encode({ ...o, tally: n }), c.id).run();
    }
  } catch { /* before 0009, or the club didn't answer */ }
}

/** Each copy with its stats: `{ worn, games, best }`, or none before 0009. */
export async function withStats(env, rows, today) {
  if (!rows.length || rows[0].worn_days === undefined) return rows;
  const ids = rows.map(c => c.id);
  const by = new Map();
  try {
    const { results } = await env.DB.prepare(`SELECT copy_id, SUM(games) AS games, MAX(score) AS best FROM copy_days WHERE copy_id IN (${ids.map(() => '?').join(',')}) GROUP BY copy_id`).bind(...ids).all();
    for (const r of results) by.set(r.copy_id, r);
  } catch { /* before 0009 */ }
  return rows.map(c => ({ ...c, stats: { worn: daysWorn(c, today), games: by.get(c.id)?.games ?? 0, best: by.get(c.id)?.best ?? 0 } }));
}
