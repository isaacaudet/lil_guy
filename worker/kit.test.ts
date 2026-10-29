import { test, expect, beforeEach, describe } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readFileSync } from 'node:fs';
import worker, { api } from './index.js';
import {
  ART_VERSION, AURAS, BAKED_SIZE, animate, bakeView, bakedImage, guyCode, readGuyCode, sheetColumns, viewSize, encodeGif, MOVES,
  lilGuyUrl, lilGuyImg, lilGuysFor, setLilGuysHost, LIL_GUY_PRESETS, LIL_GUY_PLACEHOLDER, lilGuySize,
} from '../src/index-headless.ts';
import { playGif, playPng } from '../src/__tests__/decoders';

const MIGRATIONS = ['0001_names.sql', '0002_collections.sql', '0003_google_accounts.sql', '0004_float_rank.sql', '0005_luck.sql', '0006_tags_swaps.sql', '0007_parts.sql', '0008_craft.sql', '0009_card_stats.sql', '0010_stamps.sql'];
let env: any;
beforeEach(() => {
  const db = new Database(':memory:');
  for (const m of MIGRATIONS) db.exec(readFileSync(new URL(`../migrations/${m}`, import.meta.url), 'utf8'));
  env = { CLAIM_SALT: 'test-only-salt', FOUNDER_SECRET: 'test-only-founder', DB: { async batch(statements: any[]) { db.exec('BEGIN'); try { const results = []; for (const statement of statements) results.push(await statement.run()); db.exec('COMMIT'); return results; } catch (e) { db.exec('ROLLBACK'); throw e; } }, prepare(sql: string) {
    let args: any[] = [];
    const statement = { bind(...values: any[]) { args = values; return statement; },
      async first() { return db.prepare(sql).get(...args); }, async all() { return { results: db.prepare(sql).all(...args) }; },
      async run() { const r = db.prepare(sql).run(...args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; } };
    return statement;
  } }, db, ASSETS: { fetch: async (r: Request) => new Response(`/* ${new URL(r.url).pathname} */`, { headers: { 'Content-Type': 'application/octet-stream' } }) } };
});
const get = (path: string, ip = '192.0.2.9') => worker.fetch(new Request('https://lilguys.test' + path, { headers: { 'CF-Connecting-IP': ip } }), env, { waitUntil() {} });
const bytes = async (r: Response) => new Uint8Array(await r.arrayBuffer());
const claim = async (key: string) => (await (await api(new Request(`https://lilguys.test/api/names/${key}`, { method: 'POST', headers: { 'CF-Connecting-IP': '192.0.2.1' } }), env)).json()) as any;
const pngSize = (b: Uint8Array) => { const v = new DataView(b.buffer, b.byteOffset); return [v.getUint32(16), v.getUint32(20)]; };
const gifSize = (b: Uint8Array) => [b[6] | (b[7] << 8), b[8] | (b[9] << 8)];
const aura = `${AURAS[0].id}~gold~0.0123456~20`;

const VIEWS = ['icon', 'icon-still', 'face', 'face-still', 'idle', 'still', 'pfp', 'pfp-still', 'card', 'card-still', 'art', 'art-still', 'card-full', 'card-full-still'];

describe('every view in every format', () => {
  const spec = { seed: 'Maya0', equip: [aura] }, code = guyCode(spec);
  for (const view of VIEWS) {
    test(view, async () => {
      const frames = bakeView(spec, view)!;
      const still = view.endsWith('still');
      const columns = sheetColumns(view, frames);
      // The picture: an animated PNG when it moves, exactly the library's bytes, at its documented size.
      const png = await get(`/g/${ART_VERSION}/${code}/${view}.png`);
      expect([png.status, png.headers.get('content-type'), png.headers.get('cache-control')]).toEqual([200, 'image/png', 'public, max-age=31536000, immutable']);
      const pb = await bytes(png);
      expect(pb).toEqual(await bakedImage(frames, still ? 'still' : 'loop'));
      const size = viewSize(view);
      if (size) expect(pngSize(pb)).toEqual([size.width, size.height]);
      if (!still) expect(playPng(pb).frames.length).toBe(frames.frames.length);
      // The GIF: the same frames, at a scale.
      const gif = await get(`/g/${ART_VERSION}/${code}/${view}@2.gif`);
      expect([gif.status, gif.headers.get('content-type')]).toEqual([200, 'image/gif']);
      const gb = await bytes(gif);
      expect(gb).toEqual(encodeGif(frames, 2));
      expect(gifSize(gb)).toEqual([frames.width * 2, frames.height * 2]);
      expect(playGif(gb).frames.length).toBe(frames.frames.length);
      // The sheet and its times: a game's sprite.
      const json = await (await get(`/g/${ART_VERSION}/${code}/${view}.sheet@3.json`)).json();
      expect(json).toEqual({ image: `${view}.sheet@3.png`, frameWidth: frames.width * 3, frameHeight: frames.height * 3, frames: frames.frames.length, columns, rows: Math.ceil(frames.frames.length / columns), delays: frames.delays });
      const sheet = await bytes(await get(`/g/${ART_VERSION}/${code}/${view}.sheet@3.png`));
      expect(pngSize(sheet)).toEqual([json.frameWidth * json.columns, json.frameHeight * json.rows]);
      expect(json.frameWidth * json.columns).toBeLessThanOrEqual(2048 * 3 * (MOVES.includes(view as any) ? 100 : 1));
    });
  }

  test('icons and faces move, on the ground, and the stills are their first frames', () => {
    const icon = bakeView(spec, 'icon')!, face = bakeView(spec, 'face')!;
    expect([icon.width, icon.height, face.width, face.height]).toEqual([16, 16, 14, 14]);
    expect(icon.frames.length).toBeGreaterThan(1);
    expect(face.frames.length).toBeGreaterThan(1);
    expect(bakeView(spec, 'icon-still')!.frames[0]).toEqual(icon.frames[0]);
    // Plain guys hop in their idle now and then: an icon keeps his feet on the ground in every frame.
    for (let i = 0; i < 40; i++) {
      const bottoms = bakeView({ seed: 'g' + i }, 'icon')!.frames.map(px => {
        let bottom = -1;
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (px[(y * 16 + x) * 4 + 3] >= 128) bottom = y;
        return bottom;
      });
      expect(new Set(bottoms).size).toBe(1);
      expect(bottoms[0]).toBeGreaterThanOrEqual(14);
    }
    // At rest an icon is his own sixteen by sixteen, pixel for pixel.
    const rest = animate('mia', 'idle').frames[0], still = bakeView({ seed: 'mia' }, 'icon-still')!.frames[0];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) expect(still[(y * 16 + x) * 4 + 3] >= 128).toBe(!!rest.colors[y + 4][x]);
    // No buddy and no backdrop in a square.
    const pet = bakeView({ seed: 'Maya0', equip: ['pets.kitten~plain~0.3000000~900'] }, 'icon')!;
    expect(pet.width).toBe(16);
  });

  test('the big card carries the name its code gives, and only its address keeps one', async () => {
    const titled = guyCode({ ...spec, title: '@maya' });
    expect(readGuyCode(titled)!.title).toBe('@maya');
    const moved = await get(`/g/${ART_VERSION}/${titled}/idle.png`);
    expect([moved.status, moved.headers.get('location')]).toEqual([301, `/g/${ART_VERSION}/${code}/idle.png`]);
    expect((await get(`/g/${ART_VERSION}/${titled}/card-full-still.png`)).status).toBe(200);
    expect(readGuyCode(guyCode({ seed: 'x', title: 'x'.repeat(25) }))).toBeNull();
  });
});

describe('any player, claimed or not', () => {
  test('an unclaimed name draws the guy its lowercased text deals', async () => {
    const r = await get(`/g/${ART_VERSION}/~Sneaky%20Gumdrop/face.png`);
    expect([r.status, r.headers.get('location'), r.headers.get('cache-control')]).toEqual([302, `/g/${ART_VERSION}/${guyCode({ seed: 'sneaky gumdrop' })}/face.png`, 'public, max-age=60']);
    const card = await get(`/g/${ART_VERSION}/~Sneaky%20Gumdrop/card-full.png`);
    expect(card.headers.get('location')).toBe(`/g/${ART_VERSION}/${guyCode({ seed: 'sneaky gumdrop', title: 'Sneaky Gumdrop' })}/card-full.png`);
    expect((await get(`/g/${ART_VERSION}/~${'x'.repeat(41)}/face.png`)).status).toBe(404);
    expect((await get(`/g/${ART_VERSION}/~a%2Cb/face.png`)).status).toBe(404);
  });

  test('a claimed name goes where @name goes, and its big card says @name', async () => {
    await claim('mia');
    const at = await get(`/g/${ART_VERSION}/@mia/icon.png`), tilde = await get(`/g/${ART_VERSION}/~MIA/icon.png`);
    expect(tilde.status).toBe(302);
    expect(tilde.headers.get('location')).toBe(at.headers.get('location'));
    const card = readGuyCode((await get(`/g/${ART_VERSION}/~mia/card-full.png`)).headers.get('location')!.split('/')[3])!;
    expect(card.title).toBe('@mia');
    // `@` is for claimed names only.
    expect((await get(`/g/${ART_VERSION}/@nobody/icon.png`)).status).toBe(404);
    expect((await get(`/g/${ART_VERSION}/~nobody/icon.png`)).status).toBe(302);
  });

  test('a claimed name that changes what he wears shows it within the minute', async () => {
    await claim('mia');
    const before = (await get(`/g/${ART_VERSION}/~mia/idle.png`)).headers.get('location');
    env.db.exec(`UPDATE copies SET worn = 0 WHERE key = 'mia'`);
    // The same Worker remembers a name for a minute; another (a fresh env) asks the database.
    expect((await get(`/g/${ART_VERSION}/~mia/idle.png`)).headers.get('location')).toBe(before);
    env = { ...env };
    expect((await get(`/g/${ART_VERSION}/~mia/idle.png`)).headers.get('location')).not.toBe(before);
  });
});

describe('latest', () => {
  test('redirects to the current art version for a few minutes, a name straight to its code', async () => {
    const code = guyCode({ seed: 'theo' });
    const r = await get(`/g/latest/${code}/face@2.png`);
    expect([r.status, r.headers.get('location'), r.headers.get('cache-control')]).toEqual([302, `/g/${ART_VERSION}/${code}/face@2.png`, 'public, max-age=300']);
    const named = await get(`/g/latest/~theo/face@2.png`);
    expect([named.status, named.headers.get('location'), named.headers.get('cache-control')]).toEqual([302, `/g/${ART_VERSION}/${code}/face@2.png`, 'public, max-age=60']);
    // An old version still finds today's picture.
    expect((await get(`/g/1/~theo/face.png`)).headers.get('location')).toBe(`/g/${ART_VERSION}/~theo/face.png`);
  });
});

describe('the batch read', () => {
  test('answers every name on a board, claimed or not, with ready addresses', async () => {
    await claim('mia');
    const r = await get('/api/club/batch?names=Mia,Sneaky%20Gumdrop,mia,theo');
    expect(r.status).toBe(200);
    expect(r.headers.get('access-control-allow-origin')).toBe('*');
    expect(r.headers.get('cache-control')).toBe('public, max-age=60');
    const body = (await r.json()) as any;
    expect(body.version).toBe(ART_VERSION);
    expect(Object.keys(body.guys)).toEqual(['mia', 'sneaky gumdrop', 'theo']);
    const mia = body.guys.mia, guest = body.guys['sneaky gumdrop'];
    expect([mia.claimed, mia.name, mia.founder, mia.wide]).toEqual([true, '@mia', false, false]);
    expect(mia.code).toBe((await get(`/g/${ART_VERSION}/@mia/idle.png`)).headers.get('location')!.split('/')[3]);
    expect([guest.claimed, guest.name, guest.code]).toEqual([false, 'sneaky gumdrop', guyCode({ seed: 'sneaky gumdrop' })]);
    for (const url of Object.values(guest.urls) as string[]) {
      expect(url.startsWith(`https://lilguys.test/g/${ART_VERSION}/`)).toBe(true);
      expect((await get(new URL(url).pathname)).status).toBe(200);
    }
    expect(readGuyCode(guest.urls.cardFull.split('/')[5])!.title).toBe('sneaky gumdrop');
  });

  test('says only names and guys: no accounts, keys, owners or seeds of their own', async () => {
    await claim('mia');
    env.db.exec(`UPDATE names SET account = '${'a'.repeat(64)}' WHERE key = 'mia'`);
    const owner = env.db.prepare(`SELECT owner FROM names WHERE key = 'mia'`).get().owner;
    const text = await (await get('/api/club/batch?names=mia')).text();
    for (const secret of ['a'.repeat(64), owner, '"account"', '"key"', '"owner"', '"seed"']) expect(text).not.toContain(secret);
  });

  test('takes 1 to 100 names, and the founder is marked', async () => {
    expect((await get('/api/club/batch?names=')).status).toBe(400);
    expect((await get('/api/club/batch?names=' + Array.from({ length: 101 }, (_, i) => 'p' + i).join(','))).status).toBe(400);
    expect((await get('/api/club/batch?names=' + Array.from({ length: 100 }, (_, i) => 'p' + i).join(','))).status).toBe(200);
    await api(new Request('https://lilguys.test/api/names/isaac', { method: 'POST', headers: { 'CF-Connecting-IP': '192.0.2.1', 'X-Founder-Secret': 'test-only-founder' } }), env);
    expect(((await (await get('/api/club/batch?n=isaac')).json()) as any).guys.isaac.founder).toBe(true);
  });

  test('is limited per address, as new pictures are', async () => {
    env.db.exec(`CREATE TEMP TRIGGER cap AFTER INSERT ON claim_limits BEGIN UPDATE claim_limits SET attempts = 2000 WHERE hash = NEW.hash; END`);
    expect((await get('/api/club/batch?names=a1', '198.51.100.1')).status).toBe(200);
    const r = await get('/api/club/batch?names=a2', '198.51.100.1');
    expect([r.status, r.headers.get('cache-control')]).toEqual([429, 'no-store']);
  });
});

describe('the kit', () => {
  beforeEach(() => setLilGuysHost('https://lilguys.test'));

  test('addresses: names, codes, formats, scales and presets', () => {
    const code = guyCode({ seed: 'theo' });
    expect(lilGuyUrl('Sneaky Gumdrop', 'face')).toBe(`https://lilguys.test/g/${ART_VERSION}/~Sneaky%20Gumdrop/face.png`);
    expect(lilGuyUrl('@Mia', 'idle', { scale: 4 })).toBe(`https://lilguys.test/g/${ART_VERSION}/@mia/idle@4.png`);
    expect(lilGuyUrl({ code }, 'row', { format: 'gif', scale: 2 })).toBe(`https://lilguys.test/g/${ART_VERSION}/${code}/face@2.gif`);
    expect(lilGuyUrl({ code }, 'hop', { format: 'sheet' })).toBe(`https://lilguys.test/g/${ART_VERSION}/${code}/hop.sheet.png`);
    expect(lilGuyUrl({ code }, 'hop', { format: 'json', scale: 2, version: 'latest', host: 'http://x/' })).toBe(`http://x/g/latest/${code}/hop.sheet@2.json`);
    expect(lilGuySize('row')).toEqual({ width: 14, height: 14 });
    expect(lilGuySize('results', 4)).toEqual({ width: null, height: 80 });
    expect(lilGuySize('idle', 2, true)).toEqual({ width: BAKED_SIZE.buddy.width * 2, height: 40 });
    for (const [name, p] of Object.entries(LIL_GUY_PRESETS)) expect(lilGuyUrl('mia', name)).toContain(`/${p.view}.png`);
  });

  test('an <img> sized, pixelated, lazy, labelled, with a stand-in if it fails', () => {
    const doc = fakeDocument();
    const img: any = lilGuyImg('Sneaky Gumdrop', 'row');
    expect([img.width, img.height, img.alt, img.loading, img.decoding]).toEqual([42, 42, 'Sneaky Gumdrop', 'lazy', 'async']);
    expect(img.src).toBe(`https://lilguys.test/g/${ART_VERSION}/~Sneaky%20Gumdrop/face.png`);
    expect(img.style.cssText).toContain('image-rendering:pixelated');
    expect(img.srcset).toBeUndefined();
    const crisp: any = lilGuyImg('mia', 'face', { size: 2, srcset: true, alt: '' });
    expect(crisp.srcset).toBe([1, 2, 4].map(d => `https://lilguys.test/g/${ART_VERSION}/~mia/face${d > 1 ? '@' + d : ''}.png ${d}x`).join(', '));
    expect([crisp.width, crisp.alt]).toEqual([28, '']);
    crisp.fire('error');
    expect([crisp.src, crisp.srcset]).toEqual([LIL_GUY_PLACEHOLDER, undefined]);
    const results: any = lilGuyImg('mia', 'results');
    expect([results.width, results.height]).toEqual([undefined, 80]);
    expect(results.style.cssText).toContain('width:auto');
    doc.restore();
  });

  test('lilGuysFor reads a board once, in hundreds, and remembers it', async () => {
    await claim('mia');
    const realFetch = globalThis.fetch;
    const asked: string[] = [];
    globalThis.fetch = (async (url: string) => { asked.push(url); return get(new URL(url).pathname + new URL(url).search); }) as any;
    try {
      const names = ['Mia', ...Array.from({ length: 150 }, (_, i) => 'kit' + i)];
      const guys = await lilGuysFor(names);
      expect(asked.length).toBe(2);
      expect(Object.keys(guys).length).toBe(151);
      expect(guys.mia!.claimed).toBe(true);
      expect(guys.kit7!.code).toBe(guyCode({ seed: 'kit7' }));
      expect(lilGuyUrl(guys.mia!, 'card-full')).toBe(guys.mia!.urls.cardFull);
      await lilGuysFor(['mia', 'kit3']);
      expect(asked.length).toBe(2);
    } finally { globalThis.fetch = realFetch; }
  });
});

describe('the kit scripts', () => {
  test('are served readable from any page, for a few minutes', async () => {
    for (const path of ['/lilguys.js', '/lilguys.mjs']) {
      const r = await get(path);
      expect([r.status, r.headers.get('access-control-allow-origin'), r.headers.get('cache-control'), r.headers.get('content-type')]).toEqual([200, '*', 'public, max-age=300', 'text/javascript; charset=utf-8']);
    }
  });
});

/** Just enough of a document for `lilGuyImg`: an element that keeps what is set on it and can fire its listeners. */
function fakeDocument() {
  const before = (globalThis as any).document;
  (globalThis as any).document = {
    createElement: () => {
      const listeners: Record<string, () => void> = {};
      const el: any = { style: { cssText: '' }, addEventListener: (type: string, fn: () => void) => { listeners[type] = fn; }, removeAttribute: (k: string) => { delete el[k]; }, fire: (type: string) => listeners[type]?.() };
      return el;
    },
  };
  return { restore: () => { (globalThis as any).document = before; } };
}
