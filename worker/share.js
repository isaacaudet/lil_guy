// Links that unfurl: /u/<name> and /p/<copy id> are the site's own page (its router reads the path), with
// og: and twitter: tags so a link in Discord, X or iMessage shows that guy's card, or the copy on its holder's
// card. Everything else in the page is as the site built it.
import { ART_VERSION, NAME_KEY, decode, gradeOf, guyRank, nameOf, resolve, slotOf, traitOdds } from '../src/index-headless.ts';
import { claimedCode, claimedGuys } from './club-guys.js';
import { ownersOf } from './owners.js';

const SHARE = /^\/([up])\/([^/]+)\/?$/;
/** Whether a path is a share page's. */
export const isSharePath = path => SHARE.test(path);

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
/** "900", "12K", "1.2M": as the site writes odds. */
export const fmt = n => n >= 1e12 ? (n / 1e12).toFixed(1) + 'T' : n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? Math.round(n / 1e3) + 'K' : Math.round(n).toLocaleString('en-US');
const cap = s => s[0].toUpperCase() + s.slice(1);
// The big card, still, at four times: 560 × 816, crisp in any preview.
const CARD = { view: 'card-full-still@4.png', width: 560, height: 816 };

/** A guy's rarest trait that shows in the drawing, as the site's chip says it ("Galaxy eyes · 1 in 900"), when it is rare. */
export function standout(config) {
  const t = traitOdds(config).filter(x => !['tone', 'arms', 'feet'].includes(x.slot) && (x.slot !== 'lucky' || x.name === 'Lucky')).sort((a, b) => a.chance - b.chance)[0];
  if (!t || (t.chance >= 1 / 30 && t.slot !== 'lucky')) return '';
  return `${t.slot === 'lucky' ? 'Lucky' : `${cap(t.name)} ${t.slot}`} · 1 in ${fmt(1 / t.chance)}`;
}

const picture = (url, guy, equip) => `${url.origin}/g/${ART_VERSION}/${claimedCode({ ...guy, worn: equip ?? guy.worn }, '@' + guy.key)}/${CARD.view}`;

/** A claimed guy's page: its rank, its standout trait, its big card as it is worn. Null for a name nobody holds. */
async function guyMeta(env, url, who, guyOf) {
  const key = who.replace(/^@/, '').toLowerCase();
  if (!NAME_KEY.test(key)) return null;
  const guy = (await claimedGuys(env, [key], guyOf)).get(key);
  if (!guy) return null;
  const dealt = resolve(guy.seed), rank = guyRank(dealt);
  return {
    title: `@${guy.key} · ${rank.name}${rank.label === rank.name ? '' : ` · ${rank.label}`}`,
    description: standout(dealt) || 'Lil guys on DLE Club',
    url: `${url.origin}/u/${guy.key}`,
    image: picture(url, guy),
  };
}

/** A copy's page: its name, grade and number, who pulled it and who holds it, on its holder's card wearing it. */
async function copyMeta(env, url, id, guyOf) {
  if (!/^\d{1,12}$/.test(id)) return null;
  const c = await env.DB.prepare('SELECT * FROM copies WHERE id = ?').bind(Number(id)).first();
  const o = c && decode(c.code);
  if (!o) return null;
  const guy = (await claimedGuys(env, [c.key], guyOf)).get(c.key);
  if (!guy) return null;
  const first = (await ownersOf(env, c))[0];
  const by = first.how === 'crafted' ? 'Crafted' : 'Pulled';
  const held = c.source === 'starter' ? `In @${c.key}’s locker` : first.key === c.key ? `${by} by @${c.key}` : `${by} by @${first.key} · in @${c.key}’s locker`;
  return {
    title: `${nameOf(o).replace(' | ', ', ')} · ${gradeOf(o).name}${c.pull ? ` · No. ${c.pull}` : ''}`,
    description: held,
    url: `${url.origin}/p/${c.id}`,
    // On the holder's card in its place: whatever is worn in that slot comes off for it.
    image: picture(url, guy, [...guy.worn.filter(w => slotOf(decode(w)) !== slotOf(o)), c.code]),
  };
}

/** The tags for a page, to go in its head. */
export function shareTags(m) {
  const tags = [
    ['property', 'og:type', 'website'], ['property', 'og:site_name', 'Lil Guys'],
    ['property', 'og:title', m.title], ['property', 'og:description', m.description], ['property', 'og:url', m.url],
    ['property', 'og:image', m.image], ['property', 'og:image:width', CARD.width], ['property', 'og:image:height', CARD.height],
    ['name', 'twitter:card', 'summary_large_image'], ['name', 'twitter:title', m.title],
    ['name', 'twitter:description', m.description], ['name', 'twitter:image', m.image],
  ];
  return tags.map(([attr, name, content]) => `<meta ${attr}="${name}" content="${esc(content)}">`).join('\n');
}

/**
 * GET /u/<name> and /p/<copy id>: the site's page with that guy's or copy's tags in its head. A name nobody
 * holds or a copy that's gone gets the page as it is, with a 404, and the page says so itself.
 */
export async function sharePage(request, env, url, guyOf) {
  const page = await env.ASSETS.fetch(new Request(new URL('/', url)));
  if (!page.ok) return page;
  const [, kind, who] = SHARE.exec(url.pathname);
  let name;
  try { name = decodeURIComponent(who); } catch { name = ''; }
  const meta = kind === 'u' ? await guyMeta(env, url, name, guyOf) : await copyMeta(env, url, name, guyOf);
  let html = await page.text();
  if (meta) {
    const tags = shareTags(meta);
    html = html.includes('</head>') ? html.replace('</head>', `${tags}\n</head>`) : `${tags}\n${html}`;
  }
  return new Response(request.method === 'HEAD' ? null : html, {
    status: meta ? 200 : 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60', 'X-Content-Type-Options': 'nosniff' },
  });
}
