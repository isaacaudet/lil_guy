import { anyName, claimedCode, claimedGuys } from './club-guys.js';
import { mayShow } from './emotes.js';
import { ART_VERSION, bakeView, bakedImage, guyCode, readGuyCode, sheetColumns } from '../src/index-headless.ts';

/**
 * Finished lil guys as images, for any page, board or game: `/g/<art version>/<guy>/<view>`
 * (GAMES.md has every view, its size and where it goes).
 *
 *   <art version>  `ART_VERSION`, or `latest`, which redirects to it for five minutes at a time
 *   <guy>   a guy code (`guyCode`: seed, parts, palette, worn copies), `@name` for a claimed name, or
 *           `~name` for any player's name: a claimed one as `@name`, anyone else the guy their name
 *           deals (seeded on it lowercased, as Amountle's chat deals a chatter)
 *   <view>  a view (`idle`, `hop`… `still`, `icon`, `face`, `pfp`, `card`, `art`, `card-full`, and
 *           every one but a move as `-still`), then
 *           `.png`: an animated PNG when it moves, a PNG when it doesn't
 *           `.gif`: the same as a looping GIF (Discord, engines without APNG)
 *           `.sheet.png` + `.sheet.json`: the frames in a sprite sheet and their times, for a game
 *           `@4` before the extension scales every pixel up (1 to 16): `idle@4.png`
 *
 * A code's images never change for an art version, so they are cached for good at the edge and
 * in the browser; a new art version is a new address. `@name` and `~name` follow what he wears, so
 * they redirect to his code's address for a minute at a time. Everything is drawn by the library's
 * plain-code renderer, the same one `<lil-guy>` and the lil guys site use.
 *
 * An emote kept for what a player holds (Galaxybrain, ./emotes.js) is drawn only for a claimed guy who has
 * earned it, by name or by code (the code's seed is the claimed guy's): anyone else's is a 404, never kept.
 */

const IMMUTABLE = 'public, max-age=31536000, immutable';
const NAME_TTL = 60, LATEST_TTL = 300;
const VIEW = /^([a-z]+(?:-[a-z]+)*)(\.sheet)?(?:@(\d{1,2}))?\.(png|gif|json)$/;
const head = (type, cache) => ({ 'Content-Type': type, 'Cache-Control': cache, 'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff' });
const fail = (status, error) => Response.json({ error }, { status, headers: head('application/json', 'no-store') });
const redirect = (status, location, cache) => new Response(null, { status, headers: { Location: location, 'Cache-Control': cache, 'Access-Control-Allow-Origin': '*' } });

/** The big card carries his name; every other view draws the same for any title, so its address has none. */
const isCardFull = view => view === 'card-full' || view === 'card-full-still';

/** Renders on a cache miss count against the address, so made-up codes can't run up the bill. */
export async function overBudget(request, env, what = 'render', limit = 3000) {
  const ip = request.headers.get('CF-Connecting-IP');
  if (!env.CLAIM_SALT || !ip) return false;
  const day = new Date().toISOString().slice(0, 10);
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${env.CLAIM_SALT}:${what}:${day}:${ip}`))), b => b.toString(16).padStart(2, '0')).join('');
  const row = await env.DB.prepare(`INSERT INTO claim_limits(hash, day, attempts) VALUES (?, ?, 1)
    ON CONFLICT(hash) DO UPDATE SET attempts = attempts + 1 RETURNING attempts`).bind(hash, day).first();
  return row.attempts > limit;
}

// Names this Worker has looked up lately, so a board's worth of `~name` redirects asks the database once a minute.
const lately = new WeakMap();
const RECENT_MAX = 2000;

/**
 * The code a name's address goes to: `@name` a claimed name's guy as he is worn (null for a name nobody
 * holds), `~name` that or, for a name nobody holds, the guy the name deals. For a big card the code
 * carries the name it shows.
 */
async function codeOfName(env, who, view, guyOf) {
  const claimed = who[0] === '@';
  let name;
  try { name = decodeURIComponent(who.slice(1)); } catch { return null; }
  if (!anyName(name)) return null;
  const key = name.toLowerCase(), full = isCardFull(view), memo = `${who[0]}${full ? '!' : ''}${key}`;
  let recent = lately.get(env);
  if (!recent) lately.set(env, recent = new Map());
  const kept = recent.get(memo);
  if (kept && kept.until > Date.now()) return kept.code;
  const guy = (await claimedGuys(env, [key], guyOf)).get(key);
  const code = guy ? claimedCode(guy, full ? '@' + guy.key : undefined) : claimed ? null : guyCode({ seed: key, title: full ? name : undefined });
  if (recent.size >= RECENT_MAX) recent.clear();
  recent.set(memo, { code, until: Date.now() + NAME_TTL * 1000 });
  return code;
}

async function render(spec, name, sheet, ext, scale) {
  const frames = bakeView(spec, name);
  if (!frames) return null;
  const columns = sheetColumns(name, frames);
  if (ext === 'json') {
    const image = `${name}.sheet${scale > 1 ? '@' + scale : ''}.png`;
    return new Response(JSON.stringify({ image, frameWidth: frames.width * scale, frameHeight: frames.height * scale, frames: frames.frames.length, columns, rows: Math.ceil(frames.frames.length / columns), delays: frames.delays }), { headers: head('application/json', IMMUTABLE) });
  }
  const kind = sheet ? 'sheet' : ext === 'gif' ? 'gif' : name.endsWith('still') ? 'still' : 'loop';
  return new Response(await bakedImage(frames, kind, scale, columns), { headers: head(ext === 'gif' ? 'image/gif' : 'image/png', IMMUTABLE) });
}

export async function baked(request, env, url, ctx, guyOf) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return fail(405, 'Method not allowed');
  const [, , version, who, view] = url.pathname.split('/');
  if (!version || !who || !view || url.pathname.split('/').length !== 5) return fail(404, 'Not found');
  const m = VIEW.exec(view);
  if (version === 'latest' && m && (who[0] === '@' || who[0] === '~')) {
    // One hop from a stable address to the picture: the name straight to its code at today's version.
    const code = await codeOfName(env, who, m[1], guyOf);
    if (!code) return fail(404, 'No such name');
    if (!(await mayShow(env, readGuyCode(code), m[1]))) return fail(404, 'Not earned');
    return redirect(302, `/g/${ART_VERSION}/${code}/${view}`, `public, max-age=${NAME_TTL}`);
  }
  if (version === 'latest') return redirect(302, `/g/${ART_VERSION}/${who}/${view}`, `public, max-age=${LATEST_TTL}`);
  // An old art version's address shows today's art.
  if (version !== String(ART_VERSION)) return redirect(301, `/g/${ART_VERSION}/${who}/${view}`, 'public, max-age=86400');
  if (!m) return fail(404, 'Not found');
  const [, name, sheet, digits, ext] = m;
  if ((ext === 'json' && !sheet) || (ext === 'gif' && sheet)) return fail(404, 'Not found');
  if (who[0] === '@' || who[0] === '~') {
    const code = await codeOfName(env, who, name, guyOf);
    if (!code) return fail(404, 'No such name');
    if (!(await mayShow(env, readGuyCode(code), name))) return fail(404, 'Not earned');
    return redirect(302, `/g/${ART_VERSION}/${code}/${view}`, `public, max-age=${NAME_TTL}`);
  }
  const spec = readGuyCode(who);
  if (!spec) return fail(404, 'Not found');
  // One address per picture: a code written another way goes to the canonical one, and a name only
  // stays in the code of a big card, the one view that shows it.
  const canonical = guyCode(isCardFull(name) ? spec : { ...spec, title: undefined });
  if (canonical !== who) return redirect(301, `/g/${ART_VERSION}/${canonical}/${view}`, IMMUTABLE);
  const scale = digits ? Number(digits) : 1;
  if (scale < 1 || scale > 16 || (digits && digits.startsWith('0'))) return fail(404, 'Scale is 1 to 16');
  // Asked before the cache, so an emote whose earner has let it go stops being served.
  if (!(await mayShow(env, spec, name))) return fail(404, 'Not earned');

  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const cacheKey = new Request(url.origin + url.pathname);
  const hit = cache && await cache.match(cacheKey);
  if (hit) return hit;
  if (await overBudget(request, env)) return fail(429, 'Too many new pictures from here today');

  const response = await render(spec, name, !!sheet, ext, scale);
  if (!response) return fail(404, 'No such view');
  if (cache) ctx?.waitUntil?.(cache.put(cacheKey, response.clone()));
  return response;
}
