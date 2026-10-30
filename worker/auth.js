import { createRemoteJWKSet, jwtVerify } from 'jose';
import { NAME_KEY } from '../src/index-headless.ts';
import { linkStamps } from './stamps.js';

export const GOOGLE_CLIENT_ID = '539145075316-qttn20ra5iu5gq2gjs05bil3cpfcf1jk.apps.googleusercontent.com';
const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const SESSION = '__Host-lilguys-session', NONCE = '__Host-lilguys-nonce';
const MONTH = 30 * 86400;
export const digest = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b => b.toString(16).padStart(2, '0')).join('');
const random = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
const cookie = (name, value, age) => `${name}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${age}`;
const readCookie = (request, name) => request.headers.get('Cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith(name + '='))?.slice(name.length + 1);
const reply = (body, status = 200, cookies = []) => {
  const headers = new Headers({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  for (const c of cookies) headers.append('Set-Cookie', c);
  return Response.json(body, { status, headers });
};

export async function googleAccount(credential, clientId, nonce, keys = googleKeys) {
  const { payload } = await jwtVerify(credential, keys, {
    algorithms: ['RS256'], audience: clientId,
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    requiredClaims: ['sub', 'exp', 'iat', 'nonce'], maxTokenAge: '10m', clockTolerance: 30,
  });
  if (typeof payload.sub !== 'string' || !payload.sub || payload.nonce !== nonce) throw new Error('Invalid Google sign-in');
  return digest('google:' + payload.sub);
}

// DLE Club's sign-in (dle-club docs/accounts.md, Lil guys): on lilguys.dleclub.com a frame of
// dleclub.com hands over a note naming the club player's Google sign-in as sha256("google:<sub>"),
// the same hash googleAccount gives. It is signed with CLUB_SSO_SECRET, expires within minutes and
// carries the nonce this browser's own sign-in started with.
const fromBase64url = text => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - text.length % 4) % 4)), c => c.charCodeAt(0));
export async function clubAccount(note, secret, nonce, now = Math.floor(Date.now() / 1000)) {
  const parts = typeof note === 'string' && note.length < 1000 ? note.split('.') : [];
  if (parts.length !== 2 || !/^[\w-]+$/.test(parts[0]) || !/^[\w-]{43}$/.test(parts[1])) throw new Error('Invalid club note');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  if (!await crypto.subtle.verify('HMAC', key, fromBase64url(parts[1]), new TextEncoder().encode(parts[0]))) throw new Error('Invalid club note');
  const claims = JSON.parse(new TextDecoder().decode(fromBase64url(parts[0])));
  if (claims.v !== 1 || claims.aud !== 'lilguys' || claims.n !== nonce || !/^[a-f0-9]{64}$/.test(claims.a || '')) throw new Error('Invalid club note');
  if (!(claims.exp > now && claims.exp <= now + 300)) throw new Error('Expired club note');
  return claims.a;
}

export async function sessionAccount(request, env) {
  const value = readCookie(request, SESSION);
  if (!/^[a-f0-9]{64}$/.test(value || '')) return null;
  return env.DB.prepare('SELECT account FROM auth_sessions WHERE hash = ? AND expires > ?')
    .bind(await digest(value), Math.floor(Date.now() / 1000)).first();
}
export async function ownedName(request, env, key) {
  const session = await sessionAccount(request, env);
  if (session) {
    const name = await env.DB.prepare('SELECT key, seed FROM names WHERE key = ? AND account = ?').bind(key, session.account).first();
    if (name) return name;
  }
  const token = request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!token) return null;
  // Once linked, the old browser token is no longer an authentication credential.
  return env.DB.prepare('SELECT key, seed FROM names WHERE key = ? AND owner = ? AND account IS NULL').bind(key, await digest(token)).first();
}

const clubReady = env => typeof env.CLUB_SSO_SECRET === 'string' && env.CLUB_SSO_SECRET.length >= 32;

export async function authApi(request, env, url, verify = googleAccount) {
  const action = url.pathname.slice('/api/auth/'.length), now = Math.floor(Date.now() / 1000);
  const clientId = env.GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID;
  if (action === 'session' && request.method === 'GET') {
    const session = await sessionAccount(request, env);
    const name = session ? await env.DB.prepare('SELECT key, seed, at FROM names WHERE account = ?').bind(session.account).first() : null;
    return reply({ signedIn: !!session, name, clientId, club: clubReady(env) });
  }
  if (!['start', 'google', 'club', 'logout'].includes(action)) return reply({ error: 'Unknown endpoint' }, 404);
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  // These routes are only called by our own page. Require Origin even when a cookie is absent.
  if (request.headers.get('Origin') !== url.origin) return reply({ error: 'Same-origin request required' }, 403);
  if (action === 'logout') {
    const value = readCookie(request, SESSION);
    if (value) await env.DB.prepare('DELETE FROM auth_sessions WHERE hash = ?').bind(await digest(value)).run();
    return reply({ signedIn: false }, 200, [cookie(SESSION, '', 0), cookie(NONCE, '', 0)]);
  }
  if (action === 'club' && !clubReady(env)) return reply({ error: 'DLE Club sign-in is off' }, 503);
  const ip = request.headers.get('CF-Connecting-IP');
  if (!env.CLAIM_SALT || !ip) return reply({ error: 'Sign-in is temporarily unavailable' }, 503);
  const day = new Date().toISOString().slice(0, 10);
  const hash = await digest(`${env.CLAIM_SALT}:auth:${action}:${day}:${ip}`);
  const count = await env.DB.prepare(`INSERT INTO claim_limits(hash, day, attempts) VALUES (?, ?, 1)
    ON CONFLICT(hash) DO UPDATE SET attempts = attempts + 1 RETURNING attempts`).bind(hash, day).first();
  if (count.attempts > 120) return reply({ error: 'Too many sign-in attempts. Try tomorrow.' }, 429);
  await env.DB.prepare('DELETE FROM claim_limits WHERE day < ?').bind(day).run();
  await env.DB.prepare('DELETE FROM auth_nonces WHERE expires <= ?').bind(now).run();
  await env.DB.prepare('DELETE FROM auth_sessions WHERE expires <= ?').bind(now).run();
  if (action === 'start') {
    const nonce = random();
    await env.DB.prepare('INSERT INTO auth_nonces(hash, expires) VALUES (?, ?)').bind(await digest(nonce), now + 600).run();
    return reply({ nonce, clientId }, 200, [cookie(NONCE, nonce, 600)]);
  }
  if (Number(request.headers.get('Content-Length')) > 16000) return reply({ error: 'Sign-in is too large' }, 413);
  const text = await request.text();
  if (text.length > 16000) return reply({ error: 'Sign-in is too large' }, 413);
  let body;
  try { body = JSON.parse(text); } catch { return reply({ error: 'Invalid sign-in' }, 400); }
  const nonce = readCookie(request, NONCE);
  const proof = action === 'club' ? body?.note : body?.credential;
  if (!/^[a-f0-9]{64}$/.test(nonce || '') || typeof proof !== 'string') return reply({ error: 'Start sign-in again' }, 401);
  const pending = await env.DB.prepare('SELECT hash FROM auth_nonces WHERE hash = ? AND expires > ?').bind(await digest(nonce), now).first();
  if (!pending) return reply({ error: 'Start sign-in again' }, 401);
  let account;
  try { account = action === 'club' ? await clubAccount(proof, env.CLUB_SSO_SECRET, nonce, now) : await verify(proof, clientId, nonce); }
  catch { return reply({ error: action === 'club' ? 'DLE Club sign-in could not be verified.' : 'Google sign-in could not be verified. Try again.' }, 401); }
  const consumed = await env.DB.prepare('DELETE FROM auth_nonces WHERE hash = ? AND expires > ? RETURNING hash').bind(await digest(nonce), now).first();
  if (!consumed) return reply({ error: 'Start sign-in again' }, 401);
  const current = await sessionAccount(request, env);
  if (current && current.account !== account) return reply({ error: 'Sign out before using another Google account.' }, 409);
  let name = await env.DB.prepare('SELECT key, seed, at FROM names WHERE account = ?').bind(account).first();
  if (body.key && name && name.key !== body.key) return reply({ error: `This Google account already keeps @${name.key}. Your current name has not changed.`, savedKey: name.key }, 409);
  if (body.key && !name) {
    if (typeof body.key !== 'string' || !NAME_KEY.test(body.key) || !/^[a-f0-9]{64}$/.test(body.ownerToken || '')) return reply({ error: 'Use the browser that claimed this name to link it.' }, 403);
    // Unique account index and conditional UPDATE make concurrent links fail closed.
    try {
      name = await env.DB.prepare('UPDATE names SET account = ? WHERE key = ? AND owner = ? AND account IS NULL RETURNING key, seed, at')
        .bind(account, body.key, await digest(body.ownerToken)).first();
    } catch { return reply({ error: 'That Google account or name was just linked. Reload and try again.' }, 409); }
    if (!name) return reply({ error: 'This name cannot be linked from this browser.' }, 403);
    // What the name had as a name of its own (its starter, spends and luck) joins the account's.
    await linkStamps(env, name.key, account);
  }
  const token = random();
  await env.DB.prepare('INSERT INTO auth_sessions(hash, account, expires, created) VALUES (?, ?, ?, ?)').bind(await digest(token), account, now + MONTH, now).run();
  // Keep at most twelve device sessions. No Google tokens or profile information are stored.
  await env.DB.prepare('DELETE FROM auth_sessions WHERE account = ? AND hash IN (SELECT hash FROM auth_sessions WHERE account = ? ORDER BY created DESC, rowid DESC LIMIT -1 OFFSET 12)').bind(account, account).run();
  return reply({ signedIn: true, name }, 200, [cookie(SESSION, token, MONTH), cookie(NONCE, '', 0)]);
}
