// Stamps, the only currency (migrations/0010). A player gets a stamp for each DLE Club game they finish in
// a day (the five of the gauntlet and its extras, eight at most), and two gold "club" stamps on a day the
// five are all finished. Stamps are typed by game, like a passport's, but any will pay for anything:
//
// | Capsule | Cost |
// | --- | --- |
// | Mystery capsule | 5, any machine at random |
// | Pick-a-machine capsule | 8 |
// | Seasonal capsule, while one is on | 8 |
//
// Earned stamps come from the club days the card stats already read (card-stats.js, readClub), from
// STAMPS_FROM on: nothing before it is backdated. Every player, new or claimed before stamps (whose old
// tickets are simply gone), is given STARTER_STAMPS once, as a row in the ledger. The balance is what was
// earned plus the ledger: the starter in, every spend out. A spend is one guarded insert, so two at once can
// never take the same stamps. The founder never pays.
export const STAMPS_FROM = '2026-10-29';
/** What every player is given once: two mystery capsules, so beginner's luck shows at once. */
export const STARTER_STAMPS = 10;
export const STAMP_COST = { mystery: 5, machine: 8, seasonal: 8 };
/** Gold stamps for a day the gauntlet is cleared. */
export const GOLD = 2;
/** The most a day's games give: the gauntlet's five and three extras. */
export const DAY_MAX = 8;
// The club's ids for its games, where the machine has another name: Cutsies keeps its engine id, slicies.
const MACHINE = { slicies: 'cutsies' };
const GAME_ID = /^[a-z]{2,16}$/;

const earnedSql = `COALESCE((SELECT SUM(n + ${GOLD} * cleared) FROM club_days WHERE key = ? AND day >= ?), 0)`;
const ledgerSql = 'COALESCE((SELECT SUM(stamps) FROM stamp_ledger WHERE key = ?), 0)';

/** Whether 0010 has been applied. */
export async function stampsReady(env) {
  try { await env.DB.prepare('SELECT 1 FROM stamp_ledger LIMIT 1').first(); return true; }
  catch { return false; }
}

/**
 * Gives a player their starter stamps, once: a new player on claiming, and one who claimed before stamps
 * the first time their record loads after 0010. Guarded in the insert (and by a unique index), so two loads
 * at once give it once. Quiet before 0010.
 */
export async function giveStarter(env, key) {
  try {
    await env.DB.prepare(`INSERT OR IGNORE INTO stamp_ledger(key, stamps, what, at) SELECT ?, ?, 'starter', ?
      WHERE NOT EXISTS (SELECT 1 FROM stamp_ledger WHERE key = ? AND what = 'starter')`).bind(key, STARTER_STAMPS, new Date().toISOString(), key).run();
  } catch { /* before 0010 */ }
}

/**
 * A club day as stamps: `{ played, n, cleared }`. An endpoint from before `played` and `cleared` gives a
 * stamp for each game it counted, eight at most, and no gold. Null for a day that isn't one.
 */
export function stampDay(d) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d?.day)) return null;
  if (Array.isArray(d.played)) {
    const played = [...new Set(d.played.filter(g => typeof g === 'string' && GAME_ID.test(g)))].slice(0, DAY_MAX);
    return { played, n: played.length, cleared: d.cleared === true && played.length > 0 ? 1 : 0 };
  }
  if (!Number.isInteger(d.games)) return null;
  return { played: null, n: Math.max(0, Math.min(DAY_MAX, d.games)), cleared: 0 };
}

/** Keeps the club's days as stamps. A day only ever gains: a later read never takes a stamp back. */
export function keepDays(env, key, days) {
  return days.filter(d => d.day >= STAMPS_FROM).map(d => {
    const s = stampDay(d);
    return s && env.DB.prepare(`INSERT INTO club_days(key, day, played, n, cleared) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(key, day) DO UPDATE SET played = CASE WHEN excluded.n >= club_days.n AND excluded.played IS NOT NULL THEN excluded.played ELSE club_days.played END,
      n = MAX(club_days.n, excluded.n), cleared = MAX(club_days.cleared, excluded.cleared)`).bind(key, d.day, s.played && s.played.join(','), s.n, s.cleared);
  }).filter(Boolean);
}

/**
 * A player's stamps: balance, each game's count and gold. `ready` is false before 0010. `carried` marks a
 * name claimed before stamps, whose tickets became these, so the page can say so once.
 */
export async function stampState(env, key, { founder = false, linked = false, claimed = '' } = {}) {
  const carried = !!claimed && claimed.slice(0, 10) < STAMPS_FROM;
  const base = { ready: false, balance: 0, unlimited: founder, linked, carried, starter: STARTER_STAMPS, from: STAMPS_FROM, cost: STAMP_COST, games: {}, other: 0, gold: 0, earned: 0, spent: 0 };
  if (!(await stampsReady(env))) return base;
  const { results: days } = await env.DB.prepare('SELECT played, n, cleared FROM club_days WHERE key = ? AND day >= ?').bind(key, STAMPS_FROM).all();
  const games = {};
  let other = 0, gold = 0, earned = 0;
  for (const d of days) {
    earned += d.n + GOLD * d.cleared;
    gold += GOLD * d.cleared;
    if (d.played == null) { other += d.n; continue; }
    for (const g of d.played.split(',').filter(Boolean)) games[MACHINE[g] || g] = (games[MACHINE[g] || g] || 0) + 1;
  }
  const ledger = await env.DB.prepare(`SELECT COALESCE(SUM(CASE WHEN stamps > 0 THEN stamps END), 0) AS given, COALESCE(-SUM(CASE WHEN stamps < 0 THEN stamps END), 0) AS spent
    FROM stamp_ledger WHERE key = ?`).bind(key).first();
  return { ...base, ready: true, balance: earned + ledger.given - ledger.spent, games, other, gold, earned: earned + ledger.given, spent: ledger.spent };
}

/**
 * Spends `cost` stamps on `what`, all or nothing, in one statement: it only inserts while the balance
 * covers it, so two spends at once can never both take the last stamps. True when spent, false when
 * short, null before 0010.
 */
export async function spendStamps(env, key, cost, what) {
  try {
    const r = await env.DB.prepare(`INSERT INTO stamp_ledger(key, stamps, what, at) SELECT ?, ?, ?, ?
      WHERE ${earnedSql} + ${ledgerSql} >= ?`).bind(key, -cost, what, new Date().toISOString(), key, STAMPS_FROM, key, cost).run();
    return r.meta.changes === 1;
  } catch { return null; }
}

/** What a player short of stamps is told: how many more, and where they come from. */
export function shortOf(n, linked) {
  const more = `${n} more stamp${n === 1 ? '' : 's'}`;
  return linked ? `${more}: play a game on DLE Club.` : `${more}. Sign in to DLE Club and play to earn stamps.`;
}
