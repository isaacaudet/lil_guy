// The lil guys site shows what the Worker serves: loads the built site (site/, from
// scripts/build-site.sh) in a browser with a stand-in API, then checks every card and every
// <lil-guy> on the page against the library's baked frames for the same guy code, the frames
// the Worker encodes at /g/<version>/<code>/<view>.png (worker/baked.test.ts checks that half).
//   bun run showcase && bash scripts/build-site.sh && node scripts/verify-site.mjs
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extname, join } from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
const SITE = new URL('../site/', import.meta.url).pathname;
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
const recent = ['mia', 'theo', 'juno', 'pip', 'lux'].map((key, i) => ({ key, seed: `4-verifysite${i}0`, at: 1_700_000_000 + i }));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 2400 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.route('https://lilguys.test/**', route => {
  const url = new URL(route.request().url());
  if (url.pathname === '/api/stats') return route.fulfill({ json: { names: recent.length } });
  if (url.pathname === '/api/names' && url.searchParams.get('recent')) return route.fulfill({ json: recent });
  if (url.pathname === '/api/auth/session') return route.fulfill({ json: { signedIn: false, name: null, club: false } });
  if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { error: 'not here' } });
  const file = join(SITE, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!existsSync(file)) return route.fulfill({ status: 404, body: '' });
  return route.fulfill({ body: readFileSync(file), contentType: TYPES[extname(file)] ?? 'application/octet-stream' });
});
await page.goto('https://lilguys.test/');
await page.waitForTimeout(3000);

const result = await page.evaluate(() => {
  const LG = window.LilGuy;
  const pixels = canvas => canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  const matches = (shown, frames) => frames.some(f => f.length === shown.length && f.every((v, i) => v === shown[i]));
  const out = { cards: 0, guys: 0, wrong: [], codes: [] };
  for (const canvas of document.querySelectorAll('canvas.px[data-code]')) {
    const shown = pixels(canvas);
    if (!shown.some(v => v)) continue; // off screen, not drawn yet
    const code = canvas.dataset.code, frames = LG.bakeView(LG.readGuyCode(code), 'card').frames;
    out.cards++; out.codes.push(code);
    if (!matches(shown, frames)) out.wrong.push('card ' + code);
  }
  for (const el of document.querySelectorAll('lil-guy')) {
    const canvas = el.querySelector('canvas');
    if (!canvas) continue;
    const view = el.getAttribute('view') || 'idle', code = LG.guyCode(el.spec);
    const frames = LG.bakeView(el.spec, view).frames;
    // What the Worker draws for his code is what the page drew from his spec.
    const served = LG.bakeView(LG.readGuyCode(code), view).frames;
    out.guys++; out.codes.push(code);
    if (!matches(pixels(canvas), frames)) out.wrong.push('guy ' + code);
    if (served.length !== frames.length || !served.every((f, k) => f.every((v, i) => v === frames[k][i]))) out.wrong.push('code ' + code);
  }
  return out;
});
await browser.close();
console.log(`${result.cards} cards and ${result.guys} lil guys on the page, each a frame of the Worker's picture for its code`);
if (errors.length) console.error('Page errors:', errors);
if (result.wrong.length) console.error('Different from the Worker:', result.wrong);
if (errors.length || result.wrong.length || !result.cards || !result.guys) process.exit(1);
