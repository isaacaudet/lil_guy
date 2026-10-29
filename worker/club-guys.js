// The guys DLE Club draws (dle-club docs/accounts.md, Lil guys): dleclub.com asks for its signed-in
// players' guys by their Google sign-in, sha256("google:<sub>") as names.account keeps it, and draws
// each one as he is here, his parts and what he has on, on its boards, parties and games. The ask is
// signed with CLUB_SSO_SECRET, as the club's stats are (card-stats.js), and is at most five minutes old.
import { ART_VERSION, NAME_KEY, guyCode, isFounder, itemById, decode, nameSkeleton } from '../src/index-headless.ts';

export const MAX_ASKED = 100;
const FRESH = 300;

const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = text => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - text.length % 4) % 4)), c => c.charCodeAt(0));
const signed = (accounts, t) => new TextEncoder().encode(`guys.${t}.${accounts.join(',')}`);
const hmac = (secret, use) => crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [use]);
/** The club's signature on an ask for these accounts at `t` (unix seconds). */
export async function guysSignature(secret, accounts, t) {
  return b64url(await crypto.subtle.sign('HMAC', await hmac(secret, 'sign'), signed(accounts, t)));
}

/**
 * POST /api/club/guys {a: [account hashes], t} with X-Club-Signature: each linked account's name, his
 * parts as drawn (`guyOf`, the deal with the look laid over it) and the codes of the copies he has on.
 * Accounts with no name here are left out.
 */
export async function clubGuys(request, env, guyOf) {
  const secret = env.CLUB_SSO_SECRET;
  if (typeof secret !== 'string' || secret.length < 32) return Response.json({ error: 'Club sign-in is not configured' }, { status: 503 });
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'POST' } });
  let body;
  try { body = await request.json(); } catch { body = null; }
  const accounts = Array.isArray(body?.a) ? body.a : null;
  const t = body?.t, now = Math.floor(Date.now() / 1000);
  if (!accounts || !accounts.length || accounts.length > MAX_ASKED || !accounts.every(a => typeof a === 'string' && /^[a-f0-9]{64}$/.test(a))
    || !Number.isInteger(t) || Math.abs(now - t) > FRESH) return Response.json({ error: 'Bad ask' }, { status: 400 });
  const sig = request.headers.get('X-Club-Signature') || '';
  if (!/^[\w-]{43}$/.test(sig) || !await crypto.subtle.verify('HMAC', await hmac(secret, 'verify'), fromB64url(sig), signed(accounts, t))) {
    return Response.json({ error: 'Bad signature' }, { status: 403 });
  }
  const marks = accounts.map(() => '?').join(',');
  const { results: names } = await env.DB.prepare(`SELECT n.key, n.seed, n.account, COALESCE(p.look, '') AS look FROM names n LEFT JOIN players p ON p.key = n.key
    WHERE n.account IN (${marks})`).bind(...accounts).all();
  const keys = names.map(n => n.key);
  const { results: worn } = keys.length
    ? await env.DB.prepare(`SELECT key, code FROM copies WHERE worn = 1 AND key IN (${keys.map(() => '?').join(',')}) ORDER BY id`).bind(...keys).all()
    : { results: [] };
  const guys = {};
  for (const n of names) guys[n.account] = { key: n.key, parts: guyOf(n.seed, n.look), worn: worn.filter(c => c.key === n.key).map(c => c.code) };
  return Response.json({ guys }, { headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

/**
 * The claimed guys behind these name keys, both read at once: a Map of each asked key that is held to
 * { key (the name that holds it), seed, parts (as drawn, `guyOf`), worn (the codes he has on) }. A name
 * with underscores nobody holds is the grandfathered one without them (./name-lookup.js).
 */
export async function claimedGuys(env, asked, guyOf) {
  const keys = asked.filter(n => NAME_KEY.test(n));
  const found = new Map();
  if (!keys.length) return found;
  const lookFor = [...new Set(keys.flatMap(n => [n, nameSkeleton(n)]))], marks = lookFor.map(() => '?').join(',');
  const [{ results: names }, { results: worn }] = await Promise.all([
    env.DB.prepare(`SELECT n.key, n.seed, COALESCE(p.look, '') AS look FROM names n LEFT JOIN players p ON p.key = n.key WHERE n.key IN (${marks})`).bind(...lookFor).all(),
    env.DB.prepare(`SELECT key, code FROM copies WHERE worn = 1 AND key IN (${marks}) ORDER BY id`).bind(...lookFor).all(),
  ]);
  const held = new Map(names.map(n => [n.key, n]));
  for (const a of keys) {
    const n = held.get(a) || held.get(nameSkeleton(a));
    if (n) found.set(a, { key: n.key, seed: n.seed, parts: guyOf(n.seed, n.look), worn: worn.filter(c => c.key === n.key).map(c => c.code) });
  }
  return found;
}

/** A claimed guy's code (`guyCode`), as he is worn; `title` names his big card. */
export function claimedCode(guy, title) {
  const { palette, ...parts } = guy.parts;
  return guyCode({ seed: guy.seed, parts, palette, equip: guy.worn, title });
}

/**
 * GET /api/club/named?n=a,b: the guys Twitch chat and the club's games draw by name, for names that are
 * claimed here: each one's parts as drawn and the codes of the copies he has on. Public and cached for a
 * minute, readable from any page, since a name's guy is on show here already. Names not claimed are left out.
 */
export async function namedGuys(request, env, guyOf, url = new URL(request.url)) {
  const headers = { 'Cache-Control': 'public, max-age=60', 'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff' };
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...headers, 'Access-Control-Allow-Methods': 'GET' } });
  if (request.method !== 'GET') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'GET' } });
  const asked = [...new Set((url.searchParams.get('n') || '').toLowerCase().split(',').filter(n => NAME_KEY.test(n)))];
  if (!asked.length || asked.length > MAX_ASKED) return Response.json({ error: 'Bad ask' }, { status: 400, headers });
  const found = await claimedGuys(env, asked, guyOf);
  const guys = {};
  for (const a of asked) { const g = found.get(a); if (g) guys[a] = { parts: g.parts, worn: g.worn }; }
  return Response.json({ guys }, { headers });
}

// ------------------------------------------------------------ any player's guy, for a board

/**
 * A player's name as the guys' addresses take it (`~name`): any text 1 to 40 characters long with no
 * control characters and no comma or slash, as typed. Its guy is seeded on it lowercased, as Amountle's
 * chat deals a chatter's face.
 */
export const anyName = name => typeof name === 'string' && name.length > 0 && [...name].length <= 40 && !/[\u0000-\u001f\u007f,/]/.test(name);

/** The views a board most often wants, as the batch read hands out addresses for them. */
export const BATCH_VIEWS = { icon: 'icon', face: 'face', idle: 'idle', still: 'still', pfp: 'pfp', card: 'card', cardFull: 'card-full' };

/** Whether a guy's moves are drawn wide: he has a buddy beside him. */
const wideOf = equip => (equip ?? []).some(code => itemById(decode(code)?.item)?.slot === 'buddy');

/**
 * GET /api/club/batch?names=a,b,c: every player on a board in one read, claimed or not, up to 100 names.
 * For each name as asked (lowercased): whether it is claimed here, his guy code (`code`, as worn, for
 * `/g/<version>/<code>/<view>`), whether he is the founder, whether his moves are drawn wide (a buddy
 * beside him) and ready-made addresses for the views boards use. A name nobody has claimed gets the guy
 * its lowercased text deals, as `/g/<version>/~name/` draws him. Names and guys only: no accounts or
 * keys. Public, cached for a minute at the edge and in the browser, readable from any page; reads that
 * miss the cache count against the address, as new pictures do.
 */
export async function batchGuys(request, env, ctx, guyOf, url = new URL(request.url), budget = async () => false) {
  const headers = { 'Cache-Control': 'public, max-age=60', 'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff' };
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...headers, 'Access-Control-Allow-Methods': 'GET' } });
  if (request.method !== 'GET' && request.method !== 'HEAD') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'GET' } });
  const raw = url.searchParams.get('names') ?? url.searchParams.get('n') ?? '';
  const asked = [...new Set(raw.split(',').map(n => n.toLowerCase()).filter(anyName))];
  if (!asked.length || asked.length > MAX_ASKED) return Response.json({ error: `Ask for 1 to ${MAX_ASKED} names, comma separated` }, { status: 400, headers });
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const cacheKey = new Request(`${url.origin}/api/club/batch?names=${asked.map(encodeURIComponent).join(',')}`);
  const hit = cache && await cache.match(cacheKey);
  if (hit) return hit;
  if (await budget()) return Response.json({ error: 'Too many reads from here today' }, { status: 429, headers: { ...headers, 'Cache-Control': 'no-store' } });
  const found = await claimedGuys(env, asked, guyOf);
  const base = `${url.origin}/g/${ART_VERSION}/`;
  const guys = {};
  for (const name of asked) {
    const g = found.get(name);
    const code = g ? claimedCode(g) : guyCode({ seed: name });
    const card = g ? claimedCode(g, '@' + g.key) : guyCode({ seed: name, title: name });
    const seed = g ? g.seed : name, equip = g ? g.worn : [];
    const urls = {};
    for (const [k, view] of Object.entries(BATCH_VIEWS)) urls[k] = `${base}${view === 'card-full' ? card : code}/${view}.png`;
    guys[name] = { claimed: !!g, name: g ? '@' + g.key : name, code, founder: isFounder(seed), wide: wideOf(equip), urls };
  }
  const response = Response.json({ version: ART_VERSION, base, guys }, { headers });
  if (cache) ctx?.waitUntil?.(cache.put(cacheKey, response.clone()));
  return response;
}
