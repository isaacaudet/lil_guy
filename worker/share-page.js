import { anyName } from './club-guys.js';
import { ART_VERSION, guyCode, readGuyCode } from '../src/index-headless.ts';

/**
 * A guy to share: `/s/<guy>`, where <guy> is a guy code (as `/g/` takes it, his name in it), `@name`
 * for a claimed name or `~name` for any player's. A link preview (Discord, iMessage, X…) reads the page
 * and shows his picture, `/g/<art version>/<guy>/og.png`: him big beside his whole card. Anyone else
 * is sent on to his locker, or the site.
 */

const SITE = 'https://lilguys.dleclub.com';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Who an address names and how to say it, or null for an address that isn't one. */
export function shareTarget(who) {
  if (typeof who !== 'string' || !who) return null;
  if (who[0] === '@' || who[0] === '~') {
    let name;
    try { name = decodeURIComponent(who.slice(1)); } catch { return null; }
    if (!anyName(name)) return null;
    return { image: `/g/latest/${who[0]}${encodeURIComponent(name)}/og.png`, title: `${who[0] === '@' ? '@' : ''}${name}’s lil guy`, go: who[0] === '@' ? `/#/u/${encodeURIComponent(name)}` : '/' };
  }
  const spec = readGuyCode(who);
  if (!spec) return null;
  const title = spec.title ? `${spec.title}’s lil guy` : 'A lil guy';
  // a code's own name, `@key`, is his locker's
  const key = /^@([\w-]{1,40})$/.exec(spec.title || '');
  return { image: `/g/${ART_VERSION}/${guyCode(spec)}/og.png`, title, go: key ? `/#/u/${key[1]}` : '/' };
}

/** The page for `/s/<guy>`. */
export function sharePage(url) {
  const parts = url.pathname.split('/');
  const target = parts.length === 3 ? shareTarget(parts[2]) : null;
  if (!target) return new Response(null, { status: 302, headers: { Location: '/', 'Cache-Control': 'public, max-age=300' } });
  const image = SITE + target.image, page = SITE + url.pathname;
  const description = 'Get your own guy. A free capsule a day, with things to wear from every DLE Club game.';
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(target.title)} · Lil Guys</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Lil Guys">
<meta property="og:title" content="${esc(target.title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(page)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(target.title)}, beside his card">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${esc(image)}">
<meta http-equiv="refresh" content="0; url=${esc(target.go)}">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#131726;color:#fff;font:16px system-ui,sans-serif}a{color:#f5b143}</style>
</head>
<body><a href="${esc(target.go)}">Lil Guys →</a></body>
</html>
`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
