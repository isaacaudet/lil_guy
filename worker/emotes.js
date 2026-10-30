// Which chat emotes a guy may use (the library's EMOTE_SET): every one but those whose unlock
// (EMOTE_UNLOCKS) this Worker keeps for what a player holds. Galaxybrain's starfield takes a Mythic or
// better copy, an aura, or one of the night set's capsule parts: eclipse or void eyes, the idea or thought
// topper, op art markings. Fire and crown (a 7-day streak, a perfect day) are the club's to know, not this
// Worker's, so everyone has Hype and Gg, as before.
import { EMOTE_SET, GRADES, bodies, decode, eyes, gradeOf, hair, partCode, slotOf } from '../src/index-headless.ts';

const MYTHIC = GRADES.findIndex(g => g.id === 'mythic');
const named = (slot, list, name) => partCode({ slot, index: list.findIndex(p => p.name === name) });
/** The night set's part codes (`partCode`): any one of them earns the starfield. */
export const NIGHT_PARTS = [named('eyes', eyes, 'eclipse'), named('eyes', eyes, 'void'), named('hair', hair, 'idea'), named('hair', hair, 'thought'), named('body', bodies, 'op art')];

const mythicOrBetter = code => {
  const o = decode(code);
  return !!o && (slotOf(o) === 'aura' || GRADES.findIndex(g => g.id === gradeOf(o).id) >= MYTHIC);
};
/** What earns each unlock this Worker keeps, from what a player holds: `{ copies: [{ code }], parts: [part codes] }`. */
export const EARNED_BY = {
  galaxy: held => held.copies.some(c => mythicOrBetter(c.code)) || held.parts.some(p => NIGHT_PARTS.includes(p)),
};

/** The unlock emote `id` takes that this Worker keeps, or null for one everyone has. */
export function unlockOf(id) {
  const e = EMOTE_SET.find(x => x.id === id);
  const unlock = e && (e.unlock ?? e.symbol);
  return unlock && EARNED_BY[unlock] ? unlock : null;
}

/** The emote ids a player holding `held` may use, in the set's order. */
export const emotesFor = held => EMOTE_SET.filter(e => { const u = unlockOf(e.id); return !u || EARNED_BY[u](held); }).map(e => e.id);

/** A name's copies and earned part codes (no parts before migration 0007 made the table). */
export async function holdings(env, key) {
  const { results: copies } = await env.DB.prepare('SELECT code FROM copies WHERE key = ?').bind(key).all();
  let parts = [];
  try { parts = (await env.DB.prepare('SELECT code FROM parts WHERE key = ?').bind(key).all()).results.map(r => r.code); }
  catch { /* before 0007 */ }
  return { copies, parts };
}

/** The unlock a baked view (`emote-<id>` or `emote-<id>-still`, as `bakeView` reads it) takes that this Worker keeps, or null. */
export function viewUnlock(view) {
  const m = /^emote-([a-z]+?)(-still)?$/.exec(view);
  return m ? unlockOf(m[1]) : null;
}

// What this Worker has worked out lately, so the sizes of a page's emotes ask the database once a minute.
const lately = new WeakMap();
const EARNED_TTL = 60, LATELY_MAX = 2000;

/**
 * Whether a baked view of the guy dealt `spec.seed` may be drawn: always, unless the view is an emote this
 * Worker keeps for what a player holds; then only for a claimed guy (any name holding that seed) who
 * holds it. Nobody's guy, a chatter's dealt from their name, hasn't earned it. Kept a minute.
 */
export async function mayShow(env, spec, view) {
  const unlock = viewUnlock(view);
  if (!unlock) return true;
  let recent = lately.get(env);
  if (!recent) lately.set(env, recent = new Map());
  const memo = `${unlock}:${spec.seed}`, kept = recent.get(memo);
  if (kept && kept.until > Date.now()) return kept.ok;
  const { results: names } = await env.DB.prepare('SELECT key FROM names WHERE seed = ?').bind(spec.seed).all();
  let ok = false;
  for (const n of names) if (!ok) ok = EARNED_BY[unlock](await holdings(env, n.key));
  if (recent.size >= LATELY_MAX) recent.clear();
  recent.set(memo, { ok, until: Date.now() + EARNED_TTL * 1000 });
  return ok;
}
