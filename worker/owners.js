// Where a copy has been (migration 0011): who pulled, crafted or was given it, and who it went to in each swap
// or gift, so a copy carries its history ("Pulled by @mia, Oct 30 → @pip, Nov 2") and a copy that left the
// founder's locker can say so. Only names and moments, never an account.

/** How a copy came to an owner. */
export const HOWS = ['pulled', 'daily', 'mystery', 'season', 'swapped', 'gift', 'crafted'];
/** How a copy's first owner came by it, from its `source`, for a copy made before its owners were kept (starters say pulled). */
export const howOf = source => ({ daily: 'daily', seasonal: 'season', craft: 'crafted', trade: 'crafted' })[source] || 'pulled';
const HOW_OF_SOURCE = "CASE source WHEN 'daily' THEN 'daily' WHEN 'seasonal' THEN 'season' WHEN 'craft' THEN 'crafted' WHEN 'trade' THEN 'crafted' ELSE 'pulled' END";

/** Keeps a new copy's first owner. Before 0011 there is nowhere to keep it, and the copy is made all the same. */
export async function firstOwner(env, copy, how) {
  try { await env.DB.prepare('INSERT OR IGNORE INTO copy_owners(copy_id, key, at, how) VALUES (?, ?, ?, ?)').bind(copy.id, copy.key, copy.at, how).run(); }
  catch { /* before 0011 */ }
}

/**
 * The statements that keep a swap's moves, for its batch, each only if this accept won (`won`, with its
 * arguments). `before` runs ahead of the moves: a copy with no owners kept yet (made between 0011 and this
 * Worker) gets its first owner as it stood. `after` runs once both copies have moved.
 */
export function swapOwners(env, s, at, won, wonArgs) {
  const moved = s.want ? [s.give, s.want] : [s.give];
  const before = moved.map(id => env.DB.prepare(`INSERT OR IGNORE INTO copy_owners(copy_id, key, at, how) SELECT id, key, at, ${HOW_OF_SOURCE} FROM copies
    WHERE id = ? AND NOT EXISTS (SELECT 1 FROM copy_owners WHERE copy_id = ?) AND ${won}`).bind(id, id, ...wonArgs));
  const to = (id, key, how) => env.DB.prepare(`INSERT OR IGNORE INTO copy_owners(copy_id, key, at, how) SELECT ?, ?, ?, ? WHERE ${won}`).bind(id, key, at, how, ...wonArgs);
  const after = [to(s.give, s.to_key, s.want ? 'swapped' : 'gift'), ...(s.want ? [to(s.want, s.from_key, 'swapped')] : [])];
  return { before, after };
}

/**
 * A copy's owners in turn, first first: `{key, at, how}`. A copy with none kept (a starter, the founder's
 * own, or one made before 0011 was applied) has one, its holder since it was made.
 */
export async function ownersOf(env, copy) {
  let owners = [];
  try { ({ results: owners } = await env.DB.prepare('SELECT key, at, how FROM copy_owners WHERE copy_id = ? ORDER BY at, id').bind(copy.id).all()); }
  catch { /* before 0011 */ }
  return owners.length ? owners : [{ key: copy.key, at: copy.at, how: howOf(copy.source) }];
}
