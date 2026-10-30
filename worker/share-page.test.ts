import { test, expect } from 'bun:test';
import worker from './index.js';
import { ART_VERSION, OG_HEIGHT, OG_WIDTH, bakedImage, bakeView, guyCode, AURAS } from '../src/index-headless.ts';

const env: any = {};
const get = (path: string) => worker.fetch(new Request('https://lilguys.test' + path), env, { waitUntil() {} });
const aura = `${AURAS[0].id}~gold~0.0123456~20`;

test('the link preview is one still 1200 × 630 picture, his name in its code like the big card', async () => {
  const spec = { seed: 'Maya0', equip: [aura], title: '@maya' }, code = guyCode(spec);
  const frames = bakeView(spec, 'og')!;
  expect([frames.width, frames.height, frames.frames.length]).toEqual([OG_WIDTH, OG_HEIGHT, 1]);
  const res = await get(`/g/${ART_VERSION}/${code}/og.png`);
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toBe('image/png');
  expect(new Uint8Array(await res.arrayBuffer())).toEqual(await bakedImage(frames, 'still'));
  for (const other of ['og@2.png', 'og.gif', 'og.sheet.png']) expect((await get(`/g/${ART_VERSION}/${code}/${other}`)).status).toBe(404);
});

test('/s/ is a page previews read: his picture, his name, then on to his locker', async () => {
  const code = guyCode({ seed: 'Maya0', equip: [aura], title: '@maya' });
  const res = await get(`/s/${code}`);
  expect(res.status).toBe(200);
  const html = await res.text();
  expect(html).toContain(`<meta property="og:image" content="https://lilguys.dleclub.com/g/${ART_VERSION}/${code}/og.png">`);
  expect(html).toContain('twitter:card" content="summary_large_image');
  expect(html).toContain('@maya’s lil guy');
  expect(html).toContain('url=/#/u/maya');
  const named = await (await get('/s/@maya')).text();
  expect(named).toContain('/g/latest/@maya/og.png');
  expect(named).toContain('url=/#/u/maya');
});

test('an address that names nobody goes to the site, and nothing in it reaches the page unescaped', async () => {
  for (const path of ['/s/', '/s/not-a-code!', '/s/a/b']) {
    const res = await get(path);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/');
  }
  const html = await (await get('/s/~' + encodeURIComponent('"><script>'))).text();
  expect(html).not.toContain('"><script>');
});
