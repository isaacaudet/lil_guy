// The guys DLE Club draws (dle-club docs/accounts.md, Lil guys): dleclub.com asks for its signed-in
// players' guys by their Google sign-in, sha256("google:<sub>") as names.account keeps it, and draws
// each one as he is here, his parts and what he has on, on its boards, parties and games. The ask is
// signed with CLUB_SSO_SECRET, as the club's stats are (card-stats.js), and is at most five minutes old.
import { NAME_KEY, nameSkeleton } from '../src/index-headless.ts';

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
  // A name with underscores nobody holds is the grandfathered one without them (./name-lookup.js).
  const lookFor = [...new Set(asked.flatMap(n => [n, nameSkeleton(n)]))];
  const marks = lookFor.map(() => '?').join(',');
  const { results: names } = await env.DB.prepare(`SELECT n.key, n.seed, COALESCE(p.look, '') AS look FROM names n LEFT JOIN players p ON p.key = n.key
    WHERE n.key IN (${marks})`).bind(...lookFor).all();
  const keys = names.map(n => n.key);
  const { results: worn } = keys.length
    ? await env.DB.prepare(`SELECT key, code FROM copies WHERE worn = 1 AND key IN (${keys.map(() => '?').join(',')}) ORDER BY id`).bind(...keys).all()
    : { results: [] };
  const guys = {};
  const held = new Map(names.map(n => [n.key, n]));
  for (const a of asked) {
    const n = held.get(a) || held.get(nameSkeleton(a));
    if (n) guys[a] = { parts: guyOf(n.seed, n.look), worn: worn.filter(c => c.key === n.key).map(c => c.code) };
  }
  return Response.json({ guys }, { headers });
}
