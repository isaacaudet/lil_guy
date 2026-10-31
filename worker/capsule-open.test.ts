import { test, expect } from 'bun:test';
import { ART_VERSION, bakedImage, capsuleOpenFrames, capsuleOpenUrl, encode, encodeApng, sheetColumns, type Owned } from '../src/index-headless.ts';
import { fetchWith, makeEnv } from './test-env.ts';

const V = ART_VERSION;
const bytes = async (r: Response) => new Uint8Array(await r.arrayBuffer());
const size = (b: Uint8Array) => { const v = new DataView(b.buffer); return [v.getUint32(16), v.getUint32(20)]; };
// An APNG's frame count and how many times it plays (0 for ever), from its acTL chunk.
const plays = (b: Uint8Array) => { const at = new TextDecoder('latin1').decode(b).indexOf('acTL'), v = new DataView(b.buffer); return at < 0 ? null : [v.getUint32(at + 4), v.getUint32(at + 8)]; };
const gold: Owned = { item: 'puttsies.ball', finish: 'gold', scuff: 0.01, print: 120 };
const code = encode(gold);

test('an open is the picture the library draws: an animated PNG that plays once, cached for good', async () => {
  const get = fetchWith(makeEnv());
  const r = await get(`/g/${V}/capsule-open/puttsies-${code}.png`);
  expect(r.status).toBe(200);
  expect(r.headers.get('content-type')).toBe('image/png');
  expect(r.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
  expect(r.headers.get('access-control-allow-origin')).toBe('*');
  expect(r.headers.get('x-content-type-options')).toBe('nosniff');
  const png = await bytes(r), open = capsuleOpenFrames({ capsule: 'puttsies', copy: gold })!;
  expect(png).toEqual(await encodeApng(open, 1, 1));
  expect(size(png)).toEqual([96, 96]);
  expect(plays(png)).toEqual([open.frames.length, 1]);
  // Scaled by whole pixels, standing still rather than dropping in, and with nothing inside.
  expect(size(await bytes(await get(`/g/${V}/capsule-open/puttsies-${code}@3.png`)))).toEqual([288, 288]);
  const still = await bytes(await get(`/g/${V}/capsule-open/season.pumpkin-${code}-still@2.png`));
  expect(still).toEqual(await encodeApng(capsuleOpenFrames({ capsule: 'season.pumpkin', copy: gold, from: 'still' })!, 2, 1));
  const none = await get(`/g/${V}/capsule-open/free-none.png`);
  expect(none.status).toBe(200);
  expect(await bytes(none)).toEqual(await encodeApng(capsuleOpenFrames({ capsule: 'free' })!, 1, 1));
  // The library's address is the Worker's.
  expect((await get(capsuleOpenUrl('mystery', gold, { host: '', scale: 2, from: 'still' }))).status).toBe(200);
});

test('a sprite sheet and its times, with the beats to hang sounds on and where what came out stands', async () => {
  const get = fetchWith(makeEnv());
  const open = capsuleOpenFrames({ capsule: 'mystery', copy: gold })!, columns = sheetColumns('capsule-open', open);
  const json = await (await get(`/g/${V}/capsule-open/mystery-${code}.sheet@2.json`)).json() as any;
  expect(json).toEqual({
    image: `mystery-${code}.sheet@2.png`, frameWidth: 192, frameHeight: 192, frames: open.frames.length, columns, rows: Math.ceil(open.frames.length / columns),
    delays: open.delays, beats: open.beats, tier: 4, item: { x: open.item!.x * 2, y: open.item!.y * 2, width: open.item!.width * 2, height: open.item!.height * 2 },
  });
  const sheet = await bytes(await get(`/g/${V}/capsule-open/${json.image}`));
  expect(size(sheet)).toEqual([192 * columns, 192 * json.rows]);
  expect(sheet).toEqual(await bakedImage(open, 'sheet', 2, columns));
  const empty = await (await get(`/g/${V}/capsule-open/free-none-still.sheet.json`)).json() as any;
  expect([empty.tier, empty.item, empty.beats.land]).toEqual([null, undefined, undefined]);
});

test('one address per open: latest and old versions go to today’s, .apng to .png, a copy written another way to its own code', async () => {
  const get = fetchWith(makeEnv());
  const to = async (path: string) => { const r = await get(path); return [r.status, r.headers.get('location'), r.headers.get('cache-control')]; };
  expect(await to(`/g/latest/capsule-open/puttsies-${code}.png`)).toEqual([302, `/g/${V}/capsule-open/puttsies-${code}.png`, 'public, max-age=300']);
  expect(await to(`/g/3/capsule-open/puttsies-none.png`)).toEqual([301, `/g/${V}/capsule-open/puttsies-none.png`, 'public, max-age=86400']);
  expect(await to(`/g/${V}/capsule-open/puttsies-none@2.apng`)).toEqual([301, `/g/${V}/capsule-open/puttsies-none@2.png`, 'public, max-age=31536000, immutable']);
  // The scuff written short, and the code's own characters escaped, both go to the one address.
  expect(await to(`/g/${V}/capsule-open/puttsies-puttsies.ball~gold~0.01~120.png`)).toEqual([301, `/g/${V}/capsule-open/puttsies-${code}.png`, 'public, max-age=31536000, immutable']);
  expect(await to(`/g/${V}/capsule-open/puttsies-${code.replaceAll('~', '%7E')}-still.png`)).toEqual([301, `/g/${V}/capsule-open/puttsies-${code}-still.png`, 'public, max-age=31536000, immutable']);
});

test('anything else is a 404 that is never kept: an unknown capsule or copy, a bad code, scale or format', async () => {
  const get = fetchWith(makeEnv());
  for (const file of ['nope-none.png', 'season-none.png', 'Puttsies-none.png', 'puttsies-nothing.png', 'puttsies-nope.hat~plain~0.5000000~1.png',
    'puttsies-puttsies.ball~shiny~0.5000000~1.png', 'puttsies-puttsies.ball~gold~2.0000000~1.png', 'puttsies-puttsies.ball~gold~0.5000000~1000.png',
    'puttsies-none@0.png', 'puttsies-none@5.png', 'puttsies-none@02.png', 'puttsies-none@16.png', 'puttsies-none.json', 'puttsies-none.sheet.apng',
    'puttsies-none.gif', 'puttsies-none.sheet.gif', 'puttsies-none.webp', 'puttsies.png', 'puttsies-%E0%A4%A.png', `puttsies-${code}-moving.png`]) {
    const r = await get(`/g/${V}/capsule-open/${file}`);
    expect([file, r.status, r.headers.get('cache-control')]).toEqual([file, 404, 'no-store']);
  }
  expect((await get(`/g/${V}/capsule-open/puttsies-none.png`, { method: 'POST' })).status).toBe(405);
});

test('a new open counts against the same daily budget as any new picture; redirects and refusals never do', async () => {
  const env = makeEnv(), get = fetchWith(env);
  expect((await get(`/g/${V}/capsule-open/halfsies-none.png`)).status).toBe(200);
  env.db.exec('UPDATE claim_limits SET attempts = 3000');
  const r = await get(`/g/${V}/capsule-open/halfsies-${code}.png`);
  expect([r.status, r.headers.get('cache-control')]).toEqual([429, 'no-store']);
  expect((await get(`/g/${V}/capsule-open/halfsies-none.apng`)).status).toBe(301);
  expect((await get(`/g/${V}/capsule-open/nope-none.png`)).status).toBe(404);
  expect((await get(`/g/latest/capsule-open/halfsies-none.png`)).status).toBe(302);
});
