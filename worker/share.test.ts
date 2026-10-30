import { test, expect } from 'bun:test';
import { ART_VERSION, decode, gradeOf, guyRank, nameOf, readGuyCode, resolve, slotOf } from '../src/index-headless.ts';
import { routeOf } from './index.js';
import { fmt, shareTags, standout } from './share.js';
import { PAGE, callWith, claim, fetchWith, makeEnv, signIn, stamps } from './test-env.ts';

const meta = (html: string, name: string) => new RegExp(`<meta (?:property|name)="${name}" content="([^"]*)">`).exec(html)?.[1];
const unescape = (s: string) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const pngSize = (b: Uint8Array) => { const v = new DataView(b.buffer, b.byteOffset); return [v.getUint32(16), v.getUint32(20)]; };

test('/u/<name> is the site’s page with that guy’s card, rank and standout trait in its head', async () => {
  const env = makeEnv(), get = fetchWith(env);
  await claim(env, 'mia');
  const { seed } = env.db.query("SELECT seed FROM names WHERE key = 'mia'").get();
  const r = await get('/u/mia');
  expect(r.status).toBe(200);
  expect(r.headers.get('content-type')).toBe('text/html; charset=utf-8');
  const html = await r.text();
  // Only the tags are new: the rest of the page is the site's, for its router to read the path.
  expect(html.replace(/<meta (property|name)="(og|twitter):[^>]*>\n/g, '')).toBe(PAGE);
  expect(html.indexOf('og:title')).toBeLessThan(html.indexOf('</head>'));
  const rank = guyRank(resolve(seed));
  expect(meta(html, 'og:title')).toBe(`@mia · ${rank.name}${rank.label === rank.name ? '' : ` · ${rank.label}`}`);
  expect(meta(html, 'twitter:title')).toBe(meta(html, 'og:title'));
  expect(unescape(meta(html, 'og:description')!)).toBe(standout(resolve(seed)) || 'Lil guys on DLE Club');
  expect(meta(html, 'og:url')).toBe('https://lilguys.test/u/mia');
  expect(meta(html, 'twitter:card')).toBe('summary_large_image');
  // The image is the big card as the guy is worn, still and crisp, and the Worker draws it.
  const image = meta(html, 'og:image')!;
  expect(image).toMatch(new RegExp(`^https://lilguys\\.test/g/${ART_VERSION}/[^/]+/card-full-still@4\\.png$`));
  expect(meta(html, 'twitter:image')).toBe(image);
  const spec = readGuyCode(image.split('/')[5])!;
  expect(spec.seed).toBe(seed);
  expect(spec.title).toBe('@mia');
  expect(spec.equip).toEqual(env.db.query("SELECT code FROM copies WHERE key = 'mia' AND worn = 1").all().map((c: any) => c.code));
  const png = await get(new URL(image).pathname);
  expect([png.status, png.headers.get('content-type')]).toEqual([200, 'image/png']);
  expect(pngSize(new Uint8Array(await png.arrayBuffer()))).toEqual([Number(meta(html, 'og:image:width')), Number(meta(html, 'og:image:height'))]);
  // Any case, an @, a trailing slash.
  expect(meta(await (await get('/u/@MIA/')).text(), 'og:url')).toBe('https://lilguys.test/u/mia');
});

test('the founder’s page says so; a name nobody holds is the plain page, with a 404', async () => {
  const env = makeEnv(), get = fetchWith(env);
  await claim(env, 'isaac');
  expect(meta(await (await get('/u/isaac')).text(), 'og:title')).toBe('@isaac · Founder · One of one');
  for (const path of ['/u/nobody', '/u/no!', '/u/%E0%A4%A']) {
    const r = await get(path);
    expect(r.status).toBe(404);
    expect(await r.text()).toBe(PAGE);
  }
  // A HEAD has the headers and no page; other methods are the site's own.
  const head = await get('/u/isaac', { method: 'HEAD' });
  expect([head.status, await head.text()]).toEqual([200, '']);
  expect((await get('/u/isaac', { method: 'POST' })).status).toBe(404);
  expect(routeOf('/u/mia')).toBe('/u/:key');
  expect(routeOf('/p/12')).toBe('/p/12');
});

test('/p/<copy id> shows the copy on its holder’s card in its place, its grade and number, and who pulled it', async () => {
  const env = makeEnv(), get = fetchWith(env), call = callWith(env);
  await claim(env, 'mia'); await claim(env, 'bo');
  const mia = signIn(env, 'mia'), bo = signIn(env, 'bo');
  stamps(env, 'mia', 8);
  const { copy }: any = await (await call('/me/mia/open', 'POST', { game: 'puttsies' }, mia)).json();
  const o = decode(copy.code)!;
  const html = await (await get(`/p/${copy.id}`)).text();
  expect(meta(html, 'og:title')).toBe(`${nameOf(o).replace(' | ', ', ')} · ${gradeOf(o).name}${copy.pull ? ` · No. ${copy.pull}` : ''}`);
  expect(copy.pull).toBe(1);
  expect(unescape(meta(html, 'og:description')!)).toBe('Pulled by @mia');
  expect(meta(html, 'og:url')).toBe(`https://lilguys.test/p/${copy.id}`);
  // On her card wearing it: what she has on in its slot comes off for it.
  const worn = env.db.query("SELECT code FROM copies WHERE key = 'mia' AND worn = 1").all().map((c: any) => c.code);
  const spec = readGuyCode(meta(html, 'og:image')!.split('/')[5])!;
  expect(spec.equip).toContain(copy.code);
  expect(spec.equip!.filter(c => slotOf(decode(c)!) === slotOf(o))).toEqual([copy.code]);
  expect(spec.equip!.length).toBe(worn.filter((c: string) => slotOf(decode(c)!) !== slotOf(o)).length + 1);
  expect(spec.title).toBe('@mia');
  // Given away, it says who pulled it and whose locker it's in, on the new holder's card.
  const gift: any = await (await call('/me/mia/swap', 'POST', { to: 'bo', give: copy.id }, mia)).json();
  await call('/me/bo/swap-accept', 'POST', { id: gift.id }, bo);
  const moved = await (await get(`/p/${copy.id}`)).text();
  expect(unescape(meta(moved, 'og:description')!)).toBe('Pulled by @mia · in @bo’s locker');
  expect(readGuyCode(meta(moved, 'og:image')!.split('/')[5])!.title).toBe('@bo');
  // A starter is in its owner's locker; a copy that's gone is the plain page.
  const starter = env.db.query("SELECT id FROM copies WHERE key = 'mia' AND source = 'starter'").get().id;
  expect(unescape(meta(await (await get(`/p/${starter}`)).text(), 'og:description')!)).toBe('In @mia’s locker');
  for (const path of ['/p/999999', '/p/abc', '/p/1.5']) expect((await get(path)).status).toBe(404);
});

test('a share page that can’t be worked out is the site’s page as it is', async () => {
  const env = makeEnv(), get = fetchWith(env);
  await claim(env, 'mia');
  env.DB = { prepare() { throw new Error('D1 is down'); }, batch() { throw new Error('D1 is down'); } };
  const errors: string[] = [], log = console.error;
  console.error = (...a: any[]) => errors.push(a.join(' '));
  try {
    const r = await get('/u/mia');
    expect(r.status).toBe(200);
    expect(await r.text()).toBe(PAGE);
  } finally { console.error = log; }
  // The log names the route, never the player.
  expect(errors).toEqual(['/u/:key failed: D1 is down']);
});

test('tags are escaped, and odds read as the site writes them', () => {
  const tags = shareTags({ title: 'a "b" <c> & d', description: 'x', url: 'https://lilguys.test/u/a', image: 'https://lilguys.test/g/1/x/card-full-still@4.png' });
  expect(tags).toContain('content="a &quot;b&quot; &lt;c&gt; &amp; d"');
  expect(tags).not.toContain('<c>');
  expect([fmt(900), fmt(12345), fmt(1.25e6), fmt(3e9)]).toEqual(['900', '12K', '1.3M', '3.0B']);
});
