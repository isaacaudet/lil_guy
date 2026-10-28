import { test, expect, beforeEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readFileSync } from 'node:fs';
import worker, { api } from './index.js';
import { ART_VERSION, BAKED_SIZE, bakeCard, bakeGuy, bakedImage, bakeView, faceSpec, guyCode, readGuyCode, AURAS } from '../src/index-headless.ts';

let env: any;
beforeEach(() => {
  const db = new Database(':memory:');
  for (const m of ['0001_names.sql', '0002_collections.sql', '0003_google_accounts.sql', '0004_float_rank.sql', '0005_luck.sql', '0006_tags_swaps.sql', '0007_parts.sql', '0008_craft.sql', '0009_card_stats.sql']) db.exec(readFileSync(new URL(`../migrations/${m}`, import.meta.url), 'utf8'));
  env = { CLAIM_SALT: 'test-only-salt', FOUNDER_SECRET: 'test-only-founder', DB: { async batch(statements: any[]) { db.exec('BEGIN'); try { const results = []; for (const statement of statements) results.push(await statement.run()); db.exec('COMMIT'); return results; } catch (e) { db.exec('ROLLBACK'); throw e; } }, prepare(sql: string) {
    let args: any[] = [];
    const statement = { bind(...values: any[]) { args = values; return statement; },
      async first() { return db.prepare(sql).get(...args); }, async all() { return { results: db.prepare(sql).all(...args) }; },
      async run() { const r = db.prepare(sql).run(...args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; } };
    return statement;
  } }, db };
});
const get = (path: string) => worker.fetch(new Request('https://lilguys.test' + path, { headers: { 'CF-Connecting-IP': '192.0.2.9' } }), env, { waitUntil() {} });
const bytes = async (r: Response) => new Uint8Array(await r.arrayBuffer());
const aura = `${AURAS[0].id}~gold~0.0123456~20`;

test('a code serves exactly the picture the library bakes, cached for good', async () => {
  const spec = { seed: 'Maya0', equip: [aura] }, code = guyCode(spec);
  const loop = await get(`/g/${ART_VERSION}/${code}/idle.png`);
  expect(loop.status).toBe(200);
  expect(loop.headers.get('content-type')).toBe('image/png');
  expect(loop.headers.get('cache-control')).toContain('immutable');
  expect(loop.headers.get('access-control-allow-origin')).toBe('*');
  expect(await bytes(loop)).toEqual(await bakedImage(bakeGuy(spec, 'idle'), 'loop'));
  expect(await bytes(await get(`/g/${ART_VERSION}/${code}/hop@4.png`))).toEqual(await bakedImage(bakeGuy(spec, 'hop'), 'loop', 4));
  expect(await bytes(await get(`/g/${ART_VERSION}/${code}/still.png`))).toEqual(await bakedImage(bakeGuy(spec, 'idle'), 'still'));
  expect(await bytes(await get(`/g/${ART_VERSION}/${code}/card.png`))).toEqual(await bakedImage(bakeCard(faceSpec(spec)), 'loop'));
  expect(await bytes(await get(`/g/${ART_VERSION}/${code}/pfp-still@16.png`))).toEqual(await bakedImage(bakeView(spec, 'pfp-still')!, 'still', 16));
  const sheet = await (await get(`/g/${ART_VERSION}/${code}/idle.sheet.json`)).json();
  expect(sheet.frames).toBe(bakeGuy(spec, 'idle').frames.length);
  expect(sheet.delays.reduce((a: number, b: number) => a + b, 0)).toBe(6000);
});

test('a guy with a buddy is served wider, the buddy beside him, and his sheet says so', async () => {
  const spec = { seed: 'Maya0', equip: ['pets.kitten~plain~0.3000000~900'] }, code = guyCode(spec);
  const png = await bytes(await get(`/g/${ART_VERSION}/${code}/still.png`));
  expect(png).toEqual(await bakedImage(bakeGuy(spec, 'idle'), 'still'));
  // The PNG's own header: width then height.
  const view = new DataView(png.buffer, png.byteOffset);
  expect([view.getUint32(16), view.getUint32(20)]).toEqual([BAKED_SIZE.buddy.width, BAKED_SIZE.buddy.height]);
  const sheet = await (await get(`/g/${ART_VERSION}/${code}/hop.sheet@2.json`)).json();
  expect([sheet.frameWidth, sheet.frameHeight]).toEqual([BAKED_SIZE.buddy.width * 2, BAKED_SIZE.buddy.height * 2]);
  const plain = await (await get(`/g/${ART_VERSION}/${guyCode({ seed: 'Maya0' })}/hop.sheet.json`)).json();
  expect([plain.frameWidth, plain.frameHeight]).toEqual([BAKED_SIZE.guy.width, BAKED_SIZE.guy.height]);
});

test('a claimed name sends you to the code of the guy as he is worn', async () => {
  const claim = await (await api(new Request('https://lilguys.test/api/names/mia', { method: 'POST', headers: { 'CF-Connecting-IP': '192.0.2.1' } }), env)).json();
  const r = await get(`/g/${ART_VERSION}/@mia/idle.png`);
  expect(r.status).toBe(302);
  const code = r.headers.get('location')!.split('/')[3];
  const spec = readGuyCode(code)!;
  expect(spec.seed).toBe(claim.seed);
  expect(spec.equip!.length).toBeGreaterThan(0);
  expect(r.headers.get('cache-control')).toBe('public, max-age=60');
  expect((await get(`/g/${ART_VERSION}/@nobody/idle.png`)).status).toBe(404);
});

test('old versions, other spellings and nonsense are turned away or redirected', async () => {
  const code = guyCode({ seed: 'Maya0' });
  const old = await get(`/g/0/${code}/idle.png`);
  expect([old.status, old.headers.get('location')]).toEqual([301, `/g/${ART_VERSION}/${code}/idle.png`]);
  // The same guy written another way (keys in another order) goes to his one address.
  const moved = await get(`/g/${ART_VERSION}/${btoa('{"p":null,"s":"Maya0"}').replace(/=+$/, '')}/idle.png`);
  expect([moved.status, moved.headers.get('location')]).toEqual([301, `/g/${ART_VERSION}/${code}/idle.png`]);
  for (const path of [`/g/${ART_VERSION}/${code}/moonwalk.png`, `/g/${ART_VERSION}/${code}/idle@99.png`, `/g/${ART_VERSION}/${code}/idle.gif`, `/g/${ART_VERSION}/not-a-code/idle.png`, `/g/${ART_VERSION}/${code}`]) {
    expect((await get(path)).status).toBe(404);
  }
  expect((await worker.fetch(new Request(`https://lilguys.test/g/${ART_VERSION}/${code}/idle.png`, { method: 'POST' }), env, {})).status).toBe(405);
});

test('codes round-trip and refuse what they cannot draw', () => {
  const spec = { seed: '4-abc123def456', parts: { head: 3, eyes: 1, flip: true }, palette: 7, equip: [aura], grade: 2 };
  expect(readGuyCode(guyCode(spec))).toEqual(spec);
  expect(readGuyCode('')).toBeNull();
  expect(readGuyCode(guyCode({ seed: 'x', equip: ['nonsense~gold~0~1'] }))).toBeNull();
});
