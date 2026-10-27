import { ART_VERSION, bakeGuy, bakedImage, bakeView, guyCode, isMove, readGuyCode, sheetOf } from '../src/index-headless.ts';

/**
 * Finished lil guys as images, for any page, board or game: `/g/<art version>/<guy>/<view>`.
 *
 *   <guy>   a guy code (`guyCode`: seed, parts, palette, worn copies), or `@name` for a claimed name
 *   <view>  `idle.png` (or any move): the move looping, as an animated PNG
 *           `still.png`: his first frame          `card.png` / `card-still.png`: his card
 *           `idle.sheet.png` + `idle.sheet.json`: the frames in a strip and their times, for a game
 *           `@4` before the extension scales every pixel up (1 to 16): `idle@4.png`
 *
 * A code's images never change for an art version, so they are cached for good at the edge and
 * in the browser; a new art version is a new address. `@name` follows what he wears, so it
 * redirects to his code's address for a minute at a time. Everything is drawn by the library's
 * plain-code renderer, the same one `<lil-guy>` and the lil guys site use.
 */

const IMMUTABLE = 'public, max-age=31536000, immutable';
const VIEW = /^(still|card|card-still|[a-z]+(?:\.sheet)?)(?:@(\d{1,2}))?\.(png|json)$/;
const head = (type, cache) => ({ 'Content-Type': type, 'Cache-Control': cache, 'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff' });
const fail = (status, error) => Response.json({ error }, { status, headers: head('application/json', 'no-store') });

/** The worn and picked guy behind a claimed name, as a code: what the site draws for him. */
async function codeOfName(env, key, guyOf) {
  const name = await env.DB.prepare(`SELECT n.seed, COALESCE(p.look, '') AS look FROM names n LEFT JOIN players p ON p.key = n.key WHERE n.key = ?`).bind(key).first();
  if (!name) return null;
  const { results } = await env.DB.prepare('SELECT code FROM copies WHERE key = ? AND worn = 1 ORDER BY id').bind(key).all();
  const { palette, ...parts } = guyOf(name.seed, name.look);
  return guyCode({ seed: name.seed, parts, palette, equip: results.map(r => r.code) });
}

/** Renders on a cache miss count against the address, so made-up codes can't run up the bill. */
async function overBudget(request, env) {
  const ip = request.headers.get('CF-Connecting-IP');
  if (!env.CLAIM_SALT || !ip) return false;
  const day = new Date().toISOString().slice(0, 10);
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${env.CLAIM_SALT}:render:${day}:${ip}`))), b => b.toString(16).padStart(2, '0')).join('');
  const row = await env.DB.prepare(`INSERT INTO claim_limits(hash, day, attempts) VALUES (?, ?, 1)
    ON CONFLICT(hash) DO UPDATE SET attempts = attempts + 1 RETURNING attempts`).bind(hash, day).first();
  return row.attempts > 3000;
}

async function render(spec, view, scale) {
  const [name, sheet] = view.split('.');
  const frames = bakeView(spec, name);
  if (!frames || (sheet && !isMove(name))) return null;
  return new Response(await bakedImage(frames, sheet ? 'sheet' : name.endsWith('still') ? 'still' : 'loop', scale), { headers: head('image/png', IMMUTABLE) });
}

export async function baked(request, env, url, ctx, guyOf) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return fail(405, 'Method not allowed');
  const [, , version, who, view] = url.pathname.split('/');
  if (!version || !who || !view || url.pathname.split('/').length !== 5) return fail(404, 'Not found');
  // An old art version's address shows today's art.
  if (version !== String(ART_VERSION)) {
    return new Response(null, { status: 301, headers: { Location: `/g/${ART_VERSION}/${who}/${view}`, 'Cache-Control': 'public, max-age=86400' } });
  }
  if (who.startsWith('@')) {
    const key = who.slice(1).toLowerCase();
    if (!/^[a-z0-9]{2,16}$/.test(key)) return fail(404, 'No such name');
    const code = await codeOfName(env, key, guyOf);
    if (!code) return fail(404, 'No such name');
    return new Response(null, { status: 302, headers: { Location: `/g/${ART_VERSION}/${code}/${view}`, 'Cache-Control': 'public, max-age=60', 'Access-Control-Allow-Origin': '*' } });
  }
  const m = VIEW.exec(view);
  const spec = readGuyCode(who);
  if (!m || !spec) return fail(404, 'Not found');
  // One address per guy: a code written another way goes to the canonical one.
  const canonical = guyCode(spec);
  if (canonical !== who) return new Response(null, { status: 301, headers: { Location: `/g/${ART_VERSION}/${canonical}/${view}`, 'Cache-Control': IMMUTABLE } });
  const [, name, digits, ext] = m;
  const scale = digits ? Number(digits) : 1;
  if (scale < 1 || scale > 16 || (digits && digits.startsWith('0'))) return fail(404, 'Scale is 1 to 16');

  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const cacheKey = new Request(url.origin + url.pathname);
  const hit = cache && await cache.match(cacheKey);
  if (hit) return hit;
  if (await overBudget(request, env)) return fail(429, 'Too many new pictures from here today');

  let response;
  if (ext === 'json') {
    const [move, sheet] = name.split('.');
    if (!sheet || !isMove(move)) return fail(404, 'Not found');
    const frames = bakeGuy(spec, move), s = sheetOf(frames);
    response = new Response(JSON.stringify({ image: `${move}.sheet${digits ? '@' + digits : ''}.png`, frameWidth: frames.width * scale, frameHeight: frames.height * scale, frames: frames.frames.length, delays: s.delays }), { headers: head('application/json', IMMUTABLE) });
  } else {
    response = await render(spec, name, scale);
    if (!response) return fail(404, 'No such view');
  }
  if (cache) ctx?.waitUntil?.(cache.put(cacheKey, response.clone()));
  return response;
}
