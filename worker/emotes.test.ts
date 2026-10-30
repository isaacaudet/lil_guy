import { test, expect } from 'bun:test';
import { ART_VERSION, EMOTE_SET, EMOTE_UNLOCKS, GRADES, bakedImage, emoteFrames, encode, gradeOf, guyCode, itemById, items, readGuyCode, readPart, slotOf, type Owned } from '../src/index-headless.ts';
import { EARNED_BY, NIGHT_PARTS, unlockOf } from './emotes.js';
import { callWith, claim, fetchWith, makeEnv } from './test-env.ts';

const item = items.find(i => i.slot === 'hat' && !i.free && !i.retired && !i.signature)!;
const MYTHIC: Owned = { item: item.id, finish: 'prism', scuff: 0.03, print: 5 };
const PRIZED: Owned = { item: item.id, finish: 'tempered', scuff: 0.3, print: 5 };
const AURA: Owned = { item: 'aura.flames', finish: 'classic', scuff: 0.4, print: 9 };
const EVERYONE = EMOTE_SET.map(e => e.id).filter(id => id !== 'galaxybrain');

// A copy put straight in a name's collection.
const give = (env: any, key: string, o: Owned) => Number(env.db.prepare(`INSERT INTO copies(key, code, item, game, slot, finish, grade, one_in, scuff, source, worn, at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 'capsule', 0, ?)`)
  .run(key, encode(o), o.item, itemById(o.item)!.game, slotOf(o), o.finish, GRADES.findIndex(g => g.id === gradeOf(o).id), o.scuff, new Date().toISOString()).lastInsertRowid);
const emotes = async (env: any, key: string) => ((await (await callWith(env)('/guys/' + key)).json()) as any).emotes;
// A test's own view of the Worker: what it worked out lately is kept per env, a minute at a time.
const later = (env: any) => fetchWith({ ...env });

test('the night set is eclipse and void eyes, the idea and thought toppers and op art, each a part only a capsule gives', () => {
  expect(NIGHT_PARTS).toEqual(['e27', 'e28', 't37', 't38', 'b19']);
  for (const code of NIGHT_PARTS) expect(readPart(code)).not.toBeNull();
  expect(gradeOf(MYTHIC).id).toBe('mythic');
  expect(gradeOf(PRIZED).id).toBe('prized');
  expect(slotOf(AURA)).toBe('aura');
});

test('only Galaxybrain is kept back; every other unlock is everyone’s, or the club’s to know (fire, crown) and open as before', () => {
  for (const e of EMOTE_SET) { const u = e.unlock ?? e.symbol; if (u) expect(EMOTE_UNLOCKS.some(x => x.id === u)).toBe(true); }
  const earned = EMOTE_UNLOCKS.filter(u => u.how !== 'Everyone has it').map(u => u.id);
  expect(earned.filter(id => !EARNED_BY[id as keyof typeof EARNED_BY]).sort()).toEqual(['crown', 'fire']);
  expect(EMOTE_SET.filter(e => unlockOf(e.id)).map(e => e.id)).toEqual(['galaxybrain']);
});

test('a guy’s page says which emotes it may use: Galaxybrain for a Mythic or better copy, an aura or a night set part', async () => {
  const env = makeEnv();
  await claim(env, 'mia');
  expect(await emotes(env, 'mia')).toEqual(EVERYONE);
  const prized = give(env, 'mia', PRIZED);
  expect(await emotes(env, 'mia')).toEqual(EVERYONE);
  env.db.prepare('DELETE FROM copies WHERE id = ?').run(prized);
  for (const o of [MYTHIC, { ...MYTHIC, finish: 'gold' }, AURA]) {
    const id = give(env, 'mia', o);
    expect(await emotes(env, 'mia')).toEqual(EMOTE_SET.map(e => e.id));
    env.db.prepare('DELETE FROM copies WHERE id = ?').run(id);
  }
  for (const code of NIGHT_PARTS) {
    env.db.prepare("INSERT INTO parts(key, code, at) VALUES ('mia', ?, '')").run(code);
    expect(await emotes(env, 'mia')).toEqual(EMOTE_SET.map(e => e.id));
    env.db.exec("DELETE FROM parts WHERE key = 'mia'");
  }
  // Any other part earns nothing.
  env.db.exec("INSERT INTO parts(key, code, at) VALUES ('mia', 'e23', '')");
  expect(await emotes(env, 'mia')).toEqual(EVERYONE);
  // The founder holds Origin, an aura.
  await claim(env, 'isaac');
  expect(await emotes(env, 'isaac')).toEqual(EMOTE_SET.map(e => e.id));
});

test('before migration 0007 there are no parts to go on, so copies alone say', async () => {
  const env = makeEnv('0006_tags_swaps.sql');
  await claim(env, 'mia');
  expect(await emotes(env, 'mia')).toEqual(EVERYONE);
  give(env, 'mia', AURA);
  expect(await emotes(env, 'mia')).toEqual(EMOTE_SET.map(e => e.id));
});

test('baked Galaxybrain is a 404 for a guy who hasn’t earned it, by name or code; everything else is as it was', async () => {
  for (const env of [makeEnv('0013_top.sql'), makeEnv()]) {
    const get = fetchWith(env);
    await claim(env, 'mia');
    const hmm = await get(`/g/${ART_VERSION}/@mia/emote-hmm.png`);
    expect(hmm.status).toBe(302);
    const code = hmm.headers.get('location')!.split('/')[3];
    for (const path of [`/g/${ART_VERSION}/@mia/emote-galaxybrain.png`, `/g/latest/~mia/emote-galaxybrain-still@2.png`, `/g/latest/@mia/emote-galaxybrain@8.gif`,
      `/g/${ART_VERSION}/${code}/emote-galaxybrain.png`, `/g/${ART_VERSION}/${code}/emote-galaxybrain-still@4.png`, `/g/${ART_VERSION}/${code}/emote-galaxybrain.sheet.json`,
      // Nobody's guy: a chatter's, dealt from their name, and a code nobody claimed, aura and all.
      `/g/latest/~chatter/emote-galaxybrain.png`, `/g/${ART_VERSION}/${guyCode({ seed: 'Maya0', equip: [encode(AURA)] })}/emote-galaxybrain.png`]) {
      const r = await get(path);
      expect([path, r.status]).toEqual([path, 404]);
      expect(r.headers.get('cache-control')).toBe('no-store');
    }
    // Every other emote and view, for anyone.
    for (const path of [`/g/${ART_VERSION}/${code}/emote-hmm.png`, `/g/${ART_VERSION}/${code}/emote-mindblown@2.gif`, `/g/${ART_VERSION}/${code}/emote-hype-still.png`, `/g/${ART_VERSION}/${code}/idle.png`,
      `/g/${ART_VERSION}/${guyCode({ seed: 'Maya0' })}/emote-gg.png`]) expect([path, (await get(path)).status]).toEqual([path, 200]);
    expect((await get(`/g/latest/~chatter/emote-love.png`)).status).toBe(302);

    // Earned, it's drawn as any emote is, by name and by the code it goes to.
    const aura = give(env, 'mia', AURA);
    const now = later(env), byName = await now(`/g/${ART_VERSION}/@mia/emote-galaxybrain.png`);
    expect([byName.status, byName.headers.get('location')]).toEqual([302, `/g/${ART_VERSION}/${code}/emote-galaxybrain.png`]);
    const png = await now(`/g/${ART_VERSION}/${code}/emote-galaxybrain.png`);
    expect(png.status).toBe(200);
    expect(png.headers.get('cache-control')).toContain('immutable');
    expect(new Uint8Array(await png.arrayBuffer())).toEqual(await bakedImage(emoteFrames(readGuyCode(code)!, 'galaxybrain')!, 'loop'));
    expect((await now(`/g/${ART_VERSION}/${code}/emote-galaxybrain.sheet@2.json`)).status).toBe(200);
    // Under another look (an older code of the same guy) too: the seed is what's claimed.
    expect((await now(`/g/${ART_VERSION}/${guyCode({ seed: readGuyCode(code)!.seed })}/emote-galaxybrain-still.png`)).status).toBe(200);
    // Smelted or swapped away, it's gone again.
    env.db.prepare('DELETE FROM copies WHERE id = ?').run(aura);
    expect((await later(env)(`/g/${ART_VERSION}/${code}/emote-galaxybrain.png`)).status).toBe(404);
  }
});

test('the founder’s Galaxybrain is drawn: he holds Origin', async () => {
  const env = makeEnv(), get = fetchWith(env);
  await claim(env, 'isaac');
  const r = await get(`/g/${ART_VERSION}/@isaac/emote-galaxybrain@4.gif`);
  expect(r.status).toBe(302);
  expect((await get(r.headers.get('location')!)).status).toBe(200);
});
