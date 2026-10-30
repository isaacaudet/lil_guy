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
//
// Stamps are a holder's (holderOf): a name's Google sign-in when it has one, else the name. So a player who
// lets a name go and claims another keeps their balance, spends and starter, and their capsule luck and
// free day carry over too (account_luck): releasing and reclaiming never pays out twice.
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

const earnedSql = `COALESCE((SELECT SUM(n + ${GOLD} * cleared) FROM club_days WHERE holder = ? AND day >= ?), 0)`;
const ledgerSql = 'COALESCE((SELECT SUM(stamps) FROM stamp_ledger WHERE holder = ?), 0)';

/** Whether 0010 has been applied. Anything but its tables missing is a real error, and logged. */
export async function stampsReady(env) {
  try { await env.DB.prepare('SELECT 1 FROM stamp_ledger LIMIT 1').first(); return true; }
  catch (e) {
    if (!/no such table/i.test(String(e?.message))) console.error('stamps: probe failed:', e?.message);
    return false;
  }
}

/** A failure after 0010 is a real D1 error, so it goes on up; before 0010 it's just that stamps aren't open. */
async function beforeStamps(env, e, what) {
  if (await stampsReady(env)) { console.error(`stamps: ${what} failed:`, e?.message); throw e; }
}

/** Whose stamps a name's are: its Google sign-in's (an account hash), else the name's own. */
export async function holderOf(env, key) {
  const name = await env.DB.prepare('SELECT account FROM names WHERE key = ?').bind(key).first();
  return name?.account || key;
}

/**
 * Gives a player their starter stamps, once: a new player on claiming, and one who claimed before stamps
 * the first time their record loads after 0010. Guarded in the insert (and by a unique index), so two loads
 * at once give it once. Quiet before 0010.
 */
export async function giveStarter(env, holder) {
  try {
    await env.DB.prepare(`INSERT OR IGNORE INTO stamp_ledger(holder, stamps, what, at) SELECT ?, ?, 'starter', ?
      WHERE NOT EXISTS (SELECT 1 FROM stamp_ledger WHERE holder = ? AND what = 'starter')`).bind(holder, STARTER_STAMPS, new Date().toISOString(), holder).run();
  } catch (e) {
    // A real error is logged but never stops the player's record loading.
    if (await stampsReady(env)) console.error('stamps: starter failed:', e?.message);
  }
}

/**
 * A name just linked to a Google sign-in brings what it had as a name of its own: its spends move to the
 * account (its starter only if the account has none), and it takes on the account's dry run and free day.
 */
export async function linkStamps(env, key, account) {
  if (!(await stampsReady(env))) return;
  await env.DB.batch([
    env.DB.prepare('UPDATE OR IGNORE stamp_ledger SET holder = ? WHERE holder = ?').bind(account, key),
    env.DB.prepare('DELETE FROM stamp_ledger WHERE holder = ?').bind(key),
    env.DB.prepare('UPDATE OR IGNORE club_days SET holder = ? WHERE holder = ?').bind(account, key),
    env.DB.prepare('DELETE FROM club_days WHERE holder = ?').bind(key),
  ]);
  await carryLuck(env, key);
}

/**
 * A name's player record takes on its Google account's dry run and free day, kept when the account last
 * let a name go: pity and today's free capsule are the account's, once. Quiet before 0010. Its capsule
 * count stays the name's own (a pick closes on this name's first capsule); the account's adds to it in
 * the roll (accountOpened).
 */
export async function carryLuck(env, key) {
  if (!(await stampsReady(env))) return;
  const kept = (col, none) => `MAX(${col}, COALESCE((SELECT l.${col} FROM account_luck l JOIN names n ON n.account = l.account WHERE n.key = players.key), ${none}))`;
  await env.DB.prepare(`UPDATE players SET dry = ${kept('dry', 0)}, free_day = ${kept('free_day', "''")} WHERE key = ?`).bind(key).run();
}

/** Capsules a name's Google account opened on names it has let go, for its beginner's luck. 0 before 0010. */
export async function accountOpened(env, key) {
  try { return (await env.DB.prepare('SELECT l.opened FROM account_luck l JOIN names n ON n.account = l.account WHERE n.key = ?').bind(key).first())?.opened ?? 0; }
  catch (e) { await beforeStamps(env, e, 'luck'); return 0; }
}

/** Keeps a linked name's luck and free day for its account as it lets the name go: a statement for the release batch. */
export function keepLuck(env, key, guard, ...guardArgs) {
  return env.DB.prepare(`INSERT INTO account_luck(account, opened, dry, free_day)
    SELECT n.account, p.opened, p.dry, p.free_day FROM players p JOIN names n ON n.key = p.key WHERE p.key = ? AND n.account IS NOT NULL AND ${guard}
    ON CONFLICT(account) DO UPDATE SET opened = opened + excluded.opened, dry = excluded.dry, free_day = MAX(free_day, excluded.free_day)`).bind(key, ...guardArgs);
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

/** Keeps the club's days as the holder's stamps. A day only ever gains: a later read never takes a stamp back. */
export function keepDays(env, holder, days) {
  return days.filter(d => d.day >= STAMPS_FROM).map(d => {
    const s = stampDay(d);
    return s && env.DB.prepare(`INSERT INTO club_days(holder, day, played, n, cleared) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(holder, day) DO UPDATE SET played = CASE WHEN excluded.n >= club_days.n AND excluded.played IS NOT NULL THEN excluded.played ELSE club_days.played END,
      n = MAX(club_days.n, excluded.n), cleared = MAX(club_days.cleared, excluded.cleared)`).bind(holder, d.day, s.played && s.played.join(','), s.n, s.cleared);
  }).filter(Boolean);
}

/**
 * A player's stamps: balance, each game's count and gold. `ready` is false before 0010. `carried` marks a
 * name claimed before stamps, whose tickets became these, so the page can say so once.
 */
export async function stampState(env, holder, { founder = false, linked = false, claimed = '' } = {}) {
  const carried = !!claimed && claimed.slice(0, 10) < STAMPS_FROM;
  const base = { ready: false, balance: 0, unlimited: founder, linked, carried, starter: STARTER_STAMPS, from: STAMPS_FROM, cost: STAMP_COST, games: {}, other: 0, gold: 0, earned: 0, spent: 0 };
  if (!(await stampsReady(env))) return base;
  const { results: days } = await env.DB.prepare('SELECT played, n, cleared FROM club_days WHERE holder = ? AND day >= ?').bind(holder, STAMPS_FROM).all();
  const games = {};
  let other = 0, gold = 0, earned = 0;
  for (const d of days) {
    earned += d.n + GOLD * d.cleared;
    gold += GOLD * d.cleared;
    if (d.played == null) { other += d.n; continue; }
    for (const g of d.played.split(',').filter(Boolean)) games[MACHINE[g] || g] = (games[MACHINE[g] || g] || 0) + 1;
  }
  const ledger = await env.DB.prepare(`SELECT COALESCE(SUM(CASE WHEN stamps > 0 THEN stamps END), 0) AS given, COALESCE(-SUM(CASE WHEN stamps < 0 THEN stamps END), 0) AS spent
    FROM stamp_ledger WHERE holder = ?`).bind(holder).first();
  return { ...base, ready: true, balance: earned + ledger.given - ledger.spent, games, other, gold, earned: earned + ledger.given, spent: ledger.spent };
}

/**
 * Spends `cost` stamps on `what`, all or nothing, in one statement: it only inserts while the balance
 * covers it, so two spends at once can never both take the last stamps. True when spent, false when
 * short, null before 0010.
 */
export async function spendStamps(env, holder, cost, what) {
  try {
    const r = await env.DB.prepare(`INSERT INTO stamp_ledger(holder, stamps, what, at) SELECT ?, ?, ?, ?
      WHERE ${earnedSql} + ${ledgerSql} >= ?`).bind(holder, -cost, what, new Date().toISOString(), holder, STAMPS_FROM, holder, cost).run();
    return r.meta.changes === 1;
  } catch (e) { await beforeStamps(env, e, 'spend'); return null; }
}

/** Whether the player finished a DLE Club game on `day` (UTC), as the club's days kept here say. False before 0010. */
export async function playedOn(env, holder, day) {
  try { return !!(await env.DB.prepare('SELECT 1 FROM club_days WHERE holder = ? AND day = ? AND n > 0').bind(holder, day).first()); }
  catch (e) { await beforeStamps(env, e, 'played'); return false; }
}

/** What a player short of stamps is told: how many more, and where they come from. */
export function shortOf(n, linked) {
  const more = `${n} more stamp${n === 1 ? '' : 's'}`;
  return linked ? `${more}: play a game on DLE Club.` : `${more}. Sign in to DLE Club and play to earn stamps.`;
}
