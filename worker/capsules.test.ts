import { test, expect } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { ART_VERSION, CAPSULES, CAPSULE_FILE_SIZES, bakedImage, capsuleFile, capsuleFrames, capsuleManifest, encodePng } from '../src/index-headless.ts';
import { fetchWith, makeEnv } from './test-env.ts';

const V = ART_VERSION;
const bytes = async (r: Response) => new Uint8Array(await r.arrayBuffer());
// A PNG's width and height from its header, and whether it moves (an APNG's acTL chunk).
const size = (b: Uint8Array) => { const v = new DataView(b.buffer); return [v.getUint32(16), v.getUint32(20)]; };
const moves = (b: Uint8Array) => new TextDecoder('latin1').decode(b).includes('acTL');

test('a capsule is the picture the library draws, still when shut, moving when it wobbles, cached for good', async () => {
  const get = fetchWith(makeEnv());
  const shut = await get(`/g/${V}/capsule/puttsies-closed-32.png`);
  expect(shut.status).toBe(200);
  expect(shut.headers.get('content-type')).toBe('image/png');
  expect(shut.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
  expect(shut.headers.get('access-control-allow-origin')).toBe('*');
  expect(shut.headers.get('x-content-type-options')).toBe('nosniff');
  const png = await bytes(shut);
  expect(png).toEqual(await bakedImage(capsuleFrames({ machine: 'puttsies', grid: 32 })!, 'still'));
  expect(size(png)).toEqual([32, 32]);
  expect(moves(png)).toBe(false);

  const big = await bytes(await get(`/g/${V}/capsule/mystery-closed-64@2.png`));
  expect(size(big)).toEqual([128, 128]);
  const wobble = await bytes(await get(`/g/${V}/capsule/free-wobble-16@3.png`));
  expect(moves(wobble)).toBe(true);
  expect(size(wobble)).toEqual([48, 48]);
  expect(wobble).toEqual(await bakedImage(capsuleFrames({ machine: 'free', state: 'wobble', grid: 16 })!, 'loop', 3));
});

test('every capsule in the manifest is served in every state', async () => {
  const get = fetchWith(makeEnv());
  for (const c of CAPSULES) for (const state of ['closed', 'wobble', 'open']) {
    const r = await get(`/g/${V}/capsule/${c.id}-${state}-16.png`);
    expect([c.id, state, r.status]).toEqual([c.id, state, 200]);
  }
});

test('a wobble comes as a sprite sheet too, one strip, with its frames’ times', async () => {
  const get = fetchWith(makeEnv());
  const frames = capsuleFrames({ machine: 'amountle', state: 'wobble', grid: 24 })!;
  const json = await (await get(`/g/${V}/capsule/amountle-wobble-24.sheet@2.json`)).json() as any;
  expect(json).toEqual({ image: 'amountle-wobble-24.sheet@2.png', frameWidth: 48, frameHeight: 48, frames: frames.frames.length, columns: frames.frames.length, rows: 1, delays: frames.delays });
  expect(size(await bytes(await get(`/g/${V}/capsule/amountle-wobble-24.sheet@2.png`)))).toEqual([48 * frames.frames.length, 48]);
});

test('one address per picture: no grid is the 64 master, .apng is .png, latest and old versions go to today’s', async () => {
  const get = fetchWith(makeEnv());
  const to = async (path: string) => { const r = await get(path); return [r.status, r.headers.get('location'), r.headers.get('cache-control')]; };
  expect(await to(`/g/${V}/capsule/pets-closed@2.png`)).toEqual([301, `/g/${V}/capsule/pets-closed-64@2.png`, 'public, max-age=31536000, immutable']);
  expect(await to(`/g/${V}/capsule/pets-wobble-32.apng`)).toEqual([301, `/g/${V}/capsule/pets-wobble-32.png`, 'public, max-age=31536000, immutable']);
  expect(await to('/g/latest/capsule/pets-open-16.png')).toEqual([302, `/g/${V}/capsule/pets-open-16.png`, 'public, max-age=300']);
  expect(await to('/g/3/capsule/pets-open-16.png')).toEqual([301, `/g/${V}/capsule/pets-open-16.png`, 'public, max-age=86400']);
});

test('anything else is a 404 that is never kept: an unknown capsule, state, grid, scale or format (a GIF has no clear glass)', async () => {
  const get = fetchWith(makeEnv());
  for (const file of ['nope-closed-32.png', 'season-closed-32.png', 'club.pumpkin-closed-32.png', 'season.nope-closed-32.png', 'Amountle-closed-32.png',
    'amountle-shaking-32.png', 'amountle-closed-48.png', 'amountle-closed-064.png', 'amountle-closed-32@0.png', 'amountle-closed-32@17.png',
    'amountle-closed-32@02.png', 'amountle-closed-32.json', 'amountle-closed-32.sheet.gif', 'amountle-closed-32.webp', 'amountle.png',
    'amountle-closed-32.gif', 'season.pumpkin-wobble-24@2.gif']) {
    const r = await get(`/g/${V}/capsule/${file}`);
    expect([file, r.status, r.headers.get('cache-control')]).toEqual([file, 404, 'no-store']);
  }
  expect((await get(`/g/${V}/capsule/amountle-closed-32.png`, { method: 'POST' })).status).toBe(405);
});

test('a new capsule picture counts against the same daily budget as a new guy picture', async () => {
  const env = makeEnv(), get = fetchWith(env);
  expect((await get(`/g/${V}/capsule/halfsies-closed-16.png`)).status).toBe(200);
  env.db.exec('UPDATE claim_limits SET attempts = 3000');
  const r = await get(`/g/${V}/capsule/halfsies-closed-24.png`);
  expect([r.status, r.headers.get('cache-control')]).toEqual([429, 'no-store']);
  // Redirects and refusals draw nothing, so they never count.
  expect((await get(`/g/${V}/capsule/halfsies-closed.png`)).status).toBe(301);
  expect((await get(`/g/${V}/capsule/nope-closed-16.png`)).status).toBe(404);
});

test('/capsules/manifest.json lists every capsule for any page to read, as the pack’s copy does', async () => {
  const get = fetchWith(makeEnv());
  const r = await get('/capsules/manifest.json');
  expect(r.status).toBe(200);
  expect(r.headers.get('content-type')).toContain('application/json');
  expect(r.headers.get('access-control-allow-origin')).toBe('*');
  expect(r.headers.get('cache-control')).toBe('public, max-age=300');
  const m = await r.json() as any;
  expect(m).toEqual(JSON.parse(JSON.stringify(capsuleManifest('https://lilguys.test'))));
  expect(m.capsules.map((c: any) => c.id)).toEqual(CAPSULES.map(c => c.id));
  // The pack's copy is the same list at the Worker's own address, which the Worker serves in its place.
  const pack = JSON.parse(readFileSync(new URL('../docs/capsules/manifest.json', import.meta.url), 'utf8'));
  expect(JSON.stringify(pack).replaceAll('https://lilguys.dleclub.com', 'https://lilguys.test')).toBe(JSON.stringify(m));
  expect(JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8')).assets.run_worker_first).toContain('/capsules/manifest.json');
  expect((await get('/capsules/manifest.json', { method: 'DELETE' })).status).toBe(405);
});

// Here, not in the library's tests, so the deploy's `bun test worker` stops a stale pack going out.
test('the plain files in docs/capsules are what the Worker draws: run `bun scripts/build-capsules.ts` after changing a capsule', async () => {
  const dir = new URL('../docs/capsules/', import.meta.url);
  expect(readdirSync(dir).sort()).toEqual([...CAPSULES.flatMap(c => CAPSULE_FILE_SIZES.map(px => capsuleFile(c.id, px))), 'manifest.json'].sort());
  for (const c of CAPSULES) for (const px of CAPSULE_FILE_SIZES) {
    const f = capsuleFrames({ machine: c.id, size: px })!;
    expect([c.id, px, Buffer.compare(readFileSync(new URL(capsuleFile(c.id, px), dir)), Buffer.from(await encodePng(f.frames[0], f.width, f.height)))]).toEqual([c.id, px, 0]);
  }
});
