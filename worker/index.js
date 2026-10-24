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

export async function api(request, env, url = new URL(request.url)) {
  if (request.method === 'GET' && url.pathname === '/api/names') {
    const limit = Math.min(12, Math.max(1, Number.parseInt(url.searchParams.get('recent') || '12') || 12));
    const { results } = await env.DB.prepare('SELECT key, seed, at FROM names ORDER BY at DESC LIMIT ?').bind(limit).all();
    return json(results);
  }
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
    const token = request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
    if (!token) return json({ error: 'Owner token required' }, 401);
    const result = await env.DB.prepare('DELETE FROM names WHERE key = ? AND owner = ?').bind(key, await digest(token)).run();
    return result.meta.changes ? json({ deleted: true }) : json({ error: 'Owner token does not match' }, 403);
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
  const seed = key === 'isaac' ? 'founder:isaac' : crypto.randomUUID();
  const owner = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
  const at = new Date().toISOString();
  const result = await env.DB.prepare('INSERT INTO names(key, seed, owner, at) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING').bind(key, seed, await digest(owner), at).run();
  return result.meta.changes ? json({ key, seed, owner, at }, 201) : json({ error: 'That name was just taken' }, 409);
}
