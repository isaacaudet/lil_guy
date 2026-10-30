// The Top 100 (Isaac, October 30: "find the coolest rarest top 100"): the rarest claimed guys, the rarest
// copies anyone holds, and the week's rarest real pulls for the home page's hand. A guy's rank (`guyRank`)
// and a copy's visible odds (`visibleOneIn`) are worked out by the library, so each is kept in a column once
// worked out (migration 0013) for the database to sort by.
import {
  ARM_NAMES, DEAL_PREFIX, DEEP_BLUE_PRINTS, FINISHES, FOOT_NAMES, FOUNDER_SEED, FX_IDS, PAINT_IDS, PINS, TONE_NAMES,
  accessories, bodies, cheeks, decode, eyes, guyRank, hair, heads, items, mouths, palettes, resolve, traitOdds, visibleOneIn,
} from '../src/index-headless.ts';
import { FOUNDER_KEY, NOT_HELD_BACK } from './founder.js';

export const TOP = 100;
// Rows worked out and written back on a read, so a backlog (new claims and pulls, or every row after the
// rules change) clears over a few reads. A guy's rank takes about a third of a millisecond; a copy's odds far less.
export const FILL = { guys: 200, copies: 500 };
// Copies on the copies board and in the week's pulls: none of the starters, which everyone has, and none
// the founder still holds.
const LISTED = c => c.source !== 'starter' && c.key !== FOUNDER_KEY;
// Real pulls: what a capsule gave, never a crafted copy or an old trade-up.
const PULLED = "source IN ('capsule', 'daily', 'seasonal')";

/**
 * Which rules a figure was worked out under: the figures for a set of probes, hashed. A row kept
 * under other rules (the library's weights or ranks changed) is worked out again. Never 0, which a
 * row not yet worked out holds.
 */
export function ruleOf(values) {
  let h = 2166136261;
  for (const c of JSON.stringify(values)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) || 1;
}

// A guy's dealt slots in `traitOdds` order, each with every part it can hold.
const SWEPT = [['head', heads], ['eyes', eyes], ['mouth', mouths], ['cheeks', cheeks], ['hair', hair], ['body', bodies],
  ['accessory', accessories], ['palette', palettes], ['shade', TONE_NAMES], ['arms', ARM_NAMES], ['feet', FOOT_NAMES]];
const chance = (guy, i, part) => traitOdds({ ...guy, [SWEPT[i][0]]: part })[i].chance;
const chances = (guy, i) => SWEPT[i][1].map((_, part) => chance(guy, i, part));
// Every slot but cheeks and markings: a guy without those shows everything it has without being drawn
// (`shows`), which keeps the probes quick to work out. The commonest guy has neither.
const PLAIN = [0, 1, 2, 4, 6, 7, 8, 9, 10];

/**
 * Guys whose ranks between them depend on every rule a rank has: every part in every slot, each on
 * the commonest guy; two ladders from the commonest guy to the rarest a part at a time, commonest part
 * first, which between them land in every step of the rank table, take in Lucky and the other chase
 * parts and end past the table; a few dealt guys; the founder.
 */
export function guyProbes() {
  const dealt = Array.from({ length: 8 }, (_, i) => resolve(DEAL_PREFIX + `probe${i}`.padStart(12, '0')));
  const commonest = { ...dealt[0], cheeks: 0, body: 0, lucky: false };
  for (const i of [...PLAIN, 3, 5]) { const odds = chances(commonest, i); commonest[SWEPT[i][0]] = odds.indexOf(Math.max(...odds)); }
  const sweep = [...SWEPT.flatMap(([slot, parts]) => parts.map((_, part) => ({ ...commonest, [slot]: part }))), { ...commonest, lucky: true }];
  const ladders = [PLAIN, [...PLAIN].reverse()].flatMap(order => {
    const steps = [];
    let guy = commonest;
    for (const i of order) {
      const byOdds = chances(guy, i).map((odds, part) => [odds, part]).filter(([odds]) => odds > 0).sort((a, b) => b[0] - a[0]);
      for (const [, part] of byOdds) steps.push(guy = { ...guy, [SWEPT[i][0]]: part });
    }
    return [...steps, { ...guy, lucky: true }];
  });
  return [...sweep, ...ladders, ...dealt, resolve(FOUNDER_SEED)];
}

/**
 * Copies whose visible odds between them depend on every rule the odds have: every item's share of
 * its machine, every finish on an item and on an aura, Deep Blue and every Nebula phase, every effect
 * on an item and on an aura, each showpiece's own effect, and what a copy gains after it is made (a
 * tally, paint, pins) or can't show (its float), none of which should move them.
 */
export function copyProbes() {
  const item = items.find(i => i.slot !== 'aura' && !i.free && !i.retired && !i.signature);
  const aura = items.find(i => i.slot === 'aura' && !i.retired);
  const copy = (it, finish, more = {}) => ({ item: it.id, finish, scuff: 0.05, print: 7, ...more });
  return [
    ...items.map(i => copy(i, i.slot === 'aura' ? 'classic' : 'plain')),
    ...Object.keys(FINISHES).flatMap(f => [copy(item, f), copy(aura, f)]),
    ...DEEP_BLUE_PRINTS.map(print => copy(item, 'tempered', { print })),
    ...Array.from({ length: 20 }, (_, print) => copy(item, 'nebula', { print })),
    ...FX_IDS.flatMap(fx => [copy(item, 'plain', { fx }), copy(aura, 'classic', { fx })]),
    ...items.filter(i => i.signature).map(i => copy(i, 'plain', { fx: i.signature })),
    copy(item, 'plain', { scuff: 0.9, print: 8, tally: 30, paint: PAINT_IDS[0], pins: [PINS[0].id], date: '2026-10-30', souvenir: '2026-10-30', craft: 5 }),
  ];
}
/** The figures the rules give the probes, worked out afresh (the tests change the library under them). */
export const guyFigures = () => guyProbes().map(g => guyRank(g).top);
export const copyFigures = () => copyProbes().map(visibleOneIn);
let guyRule = 0, copyRule = 0;
export const guyRules = () => guyRule ||= ruleOf(guyFigures());
export const copyRules = () => copyRule ||= ruleOf(copyFigures());

// What this Worker has worked out already: a seed's rank or a code's odds never change while it runs.
const known = new Map();
const remember = (key, work) => {
  let v = known.get(key);
  if (v === undefined) {
    if (known.size > 100000) known.clear();
    known.set(key, v = work());
  }
  return v;
};
/** A guy's place among every guy dealt, 0 to 1 (`guyRank().top`): the deal's, never a picked look's. The founder's is 0. */
export const topOf = seed => remember('g' + seed, () => guyRank(resolve(seed)).top);
/** A copy's visible odds (`visibleOneIn`), 0 for a code that no longer reads. */
export const seenOf = code => remember('c' + code, () => { const o = decode(code); const v = o ? visibleOneIn(o) : 0; return Number.isFinite(v) ? v : 0; });

/** Writes figures back, as far as the database takes them; a read never fails for it. */
async function keep(env, statements) {
  if (!statements.length) return;
  try { await env.DB.batch(statements); } catch { /* tried again on the next read */ }
}
// The earlier claim first, then by name, so the order never depends on how the rows came.
const byAt = (a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.key < b.key ? -1 : a.key > b.key ? 1 : 0);

// A guy whose rank isn't kept for its seed under these rules (or who has no record to keep it in).
const UNRANKED = 'p.top_rule IS NOT ? OR p.top_seed IS NOT n.seed';

/**
 * The 100 rarest claimed guys by rank (`guyRank`), the founder first as on every list, then the earlier
 * claim on a tie. `since` is when each took its place: the latest claim among it and everyone above it.
 */
export async function topGuys(env) {
  const rule = guyRules();
  let counted = [], rest, kept = true;
  try {
    // A kept rank counts only for the seed it was worked out for: a pick in a new name's first hour changes it.
    ({ results: counted } = await env.DB.prepare(`SELECT n.key, n.seed, n.at, COALESCE(p.look, '') AS look, p.guy_top AS top FROM players p JOIN names n ON n.key = p.key
      WHERE p.top_rule = ? AND p.top_seed = n.seed ORDER BY p.guy_top, n.at, n.key LIMIT ?`).bind(rule, TOP).all());
    ({ results: rest } = await env.DB.prepare(`SELECT n.key, n.seed, n.at, COALESCE(p.look, '') AS look, p.key AS player FROM names n LEFT JOIN players p ON p.key = n.key
      WHERE ${UNRANKED}`).bind(rule).all());
  } catch {
    // Before migration 0013 there is nowhere to keep a rank, so every guy's is worked out here.
    counted = [];
    kept = false;
    ({ results: rest } = await env.DB.prepare(`SELECT n.key, n.seed, n.at, COALESCE(p.look, '') AS look FROM names n LEFT JOIN players p ON p.key = n.key`).all());
  }
  for (const r of rest) r.top = topOf(r.seed);
  if (kept) await keep(env, rest.filter(r => r.player).slice(0, FILL.guys).map(r => env.DB.prepare('UPDATE players SET guy_top = ?, top_rule = ?, top_seed = ? WHERE key = ?').bind(r.top, rule, r.seed, r.key)));
  let since = '';
  return [...counted, ...rest].sort((a, b) => a.top - b.top || byAt(a, b)).slice(0, TOP).map((r, i) => {
    if (r.at > since) since = r.at;
    return { place: i + 1, key: r.key, seed: r.seed, look: r.look, top: r.top, since };
  });
}

/**
 * A claimed guy's place among every claimed guy, in the guys board's order (by rank, the founder first,
 * then the earlier claim), and how many are claimed: `{ place, of }`, null for a name nobody holds. The
 * guys ahead of it are counted in the database from the kept ranks; only those not kept yet (claimed since
 * the board last kept them) are worked out here, and `behind` is called while the board could keep any. Only
 * the board writes ranks back. Before 0013 every guy is.
 */
export async function guyPlace(env, key, behind = () => {}) {
  const me = await env.DB.prepare('SELECT key, seed, at FROM names WHERE key = ?').bind(key).first();
  if (!me) return null;
  const rule = guyRules(), top = topOf(me.seed);
  let ahead = 0, rest;
  try {
    // Ahead: a lower rank, or the same one claimed earlier (then by name). Read off the rank's index.
    ({ n: ahead } = await env.DB.prepare(`SELECT COUNT(*) AS n FROM players p JOIN names n ON n.key = p.key
      WHERE p.top_rule = ? AND p.top_seed = n.seed AND p.guy_top <= ? AND (p.guy_top < ? OR n.at < ? OR (n.at = ? AND n.key < ?))`)
      .bind(rule, top, top, me.at, me.at, me.key).first());
    ({ results: rest } = await env.DB.prepare(`SELECT n.key, n.seed, n.at, p.key AS player FROM names n LEFT JOIN players p ON p.key = n.key WHERE ${UNRANKED}`).bind(rule).all());
    // Only a guy with a record can have its rank kept.
    if (rest.some(r => r.player)) behind();
  } catch {
    ahead = 0;
    ({ results: rest } = await env.DB.prepare('SELECT key, seed, at FROM names').all());
  }
  for (const r of rest) r.top = topOf(r.seed);
  const { n: of } = await env.DB.prepare('SELECT COUNT(*) AS n FROM names').first();
  return { place: 1 + ahead + rest.filter(r => r.key !== me.key && (r.top < top || (r.top === top && byAt(r, me) < 0))).length, of };
}

const rarer = (a, b) => b.seen - a.seen || a.scuff - b.scuff || a.id - b.id;
const copyPlace = (c, i) => ({ place: i + 1, id: c.id, key: c.key, code: c.code, no: c.pull || null, at: c.at });

/**
 * The 100 rarest copies anyone holds, by what the eye can see (`visibleOneIn`: item, finish, famous print,
 * effect, aura), the cleaner float then the earlier pull on a tie. `no` is its number in its item's run.
 */
export async function topCopies(env) {
  const rule = copyRules();
  let counted = [], rest, kept = true;
  try {
    ({ results: counted } = await env.DB.prepare(`SELECT id, key, code, pull, scuff, at, seen_in AS seen FROM copies
      WHERE seen_rule = ? AND source <> 'starter' AND ${NOT_HELD_BACK} ORDER BY seen_in DESC, scuff, id LIMIT ?`).bind(rule, TOP).all());
    // Every copy not yet worked out under these rules, starters and the founder's too, so none waits forever.
    ({ results: rest } = await env.DB.prepare('SELECT * FROM copies WHERE seen_rule < ? OR seen_rule > ?').bind(rule, rule).all());
  } catch {
    counted = [];
    kept = false;
    ({ results: rest } = await env.DB.prepare(`SELECT * FROM copies WHERE source <> 'starter' AND ${NOT_HELD_BACK}`).all());
  }
  for (const r of rest) r.seen = seenOf(r.code);
  if (kept) await keep(env, rest.slice(0, FILL.copies).map(r => env.DB.prepare('UPDATE copies SET seen_in = ?, seen_rule = ? WHERE id = ?').bind(r.seen, rule, r.id)));
  return [...counted, ...rest.filter(LISTED)].sort(rarer).slice(0, TOP).map(copyPlace);
}

// The founder's own copies first (they are one of one, which no odds say), then the rarer.
const founderFirst = (a, b) => (b.source === 'founder') - (a.source === 'founder') || rarer(a, b);
/**
 * The most copies the Pulls page works out on a read: two of the copies board's write-backs. Past it (a
 * burst of pulls, every copy after the rules change, or before 0013 on a big collection) the page keeps
 * the order copies were pulled with (`one_in`, the old odds, which its index serves) until the board
 * catches up.
 */
export const BACKLOG = FILL.copies * 2;

/**
 * One page (`limit` from `offset`) of the copies matching `where` (on `copies c`, bound to `args`), by what
 * the eye can see as on the copies board: the Pulls page's rarest first, and on the founder's own page
 * (`founderPage`) his one-of-ones before them. Each row carries its holder's `seed` and `look`. Sorted in the
 * database by the kept odds; only copies not kept yet (pulled since the copies board last kept them), at most
 * `BACKLOG`, are worked out here, and `behind` is called while there are any. Only the board writes odds
 * back. Before 0013 every match is, as far as `BACKLOG`.
 */
export async function copiesBySeen(env, where, args, limit, offset, founderPage = false, behind = () => {}) {
  const rule = copyRules(), first = founderPage ? "c.source = 'founder' DESC, " : '';
  const select = `SELECT c.*, n.seed, COALESCE(p.look, '') AS look FROM copies c JOIN names n ON n.key = c.key LEFT JOIN players p ON p.key = c.key WHERE ${where}`;
  // One page in the database's own order, which an index serves.
  const page = async (also, order, values) => (await env.DB.prepare(`${select}${also} ORDER BY ${first}${order} LIMIT ? OFFSET ?`)
    .bind(...args, ...values, limit, offset).all()).results;
  let counted = [], rest, kept = true;
  try {
    ({ results: rest } = await env.DB.prepare(`${select} AND (c.seen_rule < ? OR c.seen_rule > ?) LIMIT ?`).bind(...args, rule, rule, BACKLOG + 1).all());
    if (!rest.length) {
      // Every match is kept: the page is the database's.
      const rows = await page(' AND c.seen_rule = ?', 'c.seen_in DESC, c.scuff, c.id', [rule]);
      for (const r of rows) r.seen = r.seen_in;
      return rows;
    }
    if (rest.length <= BACKLOG) ({ results: counted } = await env.DB.prepare(`${select} AND c.seen_rule = ? ORDER BY ${first}c.seen_in DESC, c.scuff, c.id LIMIT ?`).bind(...args, rule, offset + limit).all());
  } catch {
    counted = [];
    kept = false;
    ({ results: rest } = await env.DB.prepare(`${select} LIMIT ?`).bind(...args, BACKLOG + 1).all());
  }
  if (kept) behind();
  if (rest.length > BACKLOG) return page('', 'c.one_in DESC, c.scuff, c.id', []);
  for (const r of counted) r.seen = r.seen_in;
  for (const r of rest) r.seen = seenOf(r.code);
  return [...counted, ...rest].sort(founderFirst).slice(offset, offset + limit);
}

/** The rarest real pulls of the last `days` days (1 to 30), rarest first as on the copies board, each with its holder's `seed` and `look`. */
export async function rarestPulls(env, days = 7, limit = 12) {
  const after = new Date(Date.now() - days * 864e5).toISOString();
  const { results } = await env.DB.prepare(`SELECT * FROM copies WHERE at >= ? AND ${PULLED} AND ${NOT_HELD_BACK}`).bind(after).all();
  for (const r of results) r.seen = seenOf(r.code);
  const pulls = results.sort(rarer).slice(0, limit), keys = [...new Set(pulls.map(c => c.key))];
  const { results: guys } = keys.length
    ? await env.DB.prepare(`SELECT n.key, n.seed, COALESCE(p.look, '') AS look FROM names n LEFT JOIN players p ON p.key = n.key WHERE n.key IN (${keys.map(() => '?').join(',')})`).bind(...keys).all()
    : { results: [] };
  const guyOf = new Map(guys.map(g => [g.key, g]));
  return pulls.map(c => ({ id: c.id, key: c.key, code: c.code, no: c.pull || null, at: c.at, seed: guyOf.get(c.key)?.seed ?? null, look: guyOf.get(c.key)?.look ?? '' }));
}
