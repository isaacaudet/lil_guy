// Names with underscores (`cool_guy`) came after names without: before them a typed underscore was
// dropped, so `cool_guy` was claimed as `coolguy`. Those claims keep their name (grandfathered), a new
// claim can't take a name whose skeleton (its underscores taken out) is already held, and a name with
// underscores that nobody holds finds the guy of the one that lost them: chat's `cool_guy` is `coolguy`.
import { NAME_KEY, nameSkeleton } from '../src/index-headless.ts';

/** The key that holds a name: its own, else the grandfathered one without underscores, else null. */
export async function heldKey(env, key) {
  if (!NAME_KEY.test(key)) return null;
  if (await env.DB.prepare('SELECT 1 FROM names WHERE key = ?').bind(key).first()) return key;
  const bare = nameSkeleton(key);
  if (bare !== key && await env.DB.prepare('SELECT 1 FROM names WHERE key = ?').bind(bare).first()) return bare;
  return null;
}

/** Whether a new claim of this key clashes with a held name of the same skeleton. */
export async function skeletonTaken(env, key) {
  return !!await env.DB.prepare("SELECT 1 FROM names WHERE replace(key, '_', '') = ?").bind(nameSkeleton(key)).first();
}

// Names show on public pages. The same short list of words name tags can't hold (src/collect.ts), but
// matched as a whole word (between underscores) or at the start of a word, so `grape` and `peacock` pass.
// A few start ordinary words (spicy, cocktail, dickens, pussycat), so those are only refused whole.
const BLOCKED = ['fuck', 'shit', 'cunt', 'nigg', 'fag', 'rape', 'nazi', 'hitler', 'porn', 'cock', 'dick', 'pussy', 'whore', 'slut', 'retard', 'kike', 'spic', 'chink', 'tranny'];
const WHOLE_ONLY = new Set(['fag', 'cock', 'dick', 'pussy', 'spic', 'chink']);
// Held back for the club and its founder: `isaac` is his (with the founder secret), and so is every name
// that starts with it. Read with digits as letters, so `1saac` and `l1lguys` are held back too.
const RESERVED = ['dleclub', 'lilguys', 'founder'];
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's' };
const leet = s => s.replace(/[01345]/g, d => LEET[d]);

/** Why a new claim can't take this key: 'reserved', 'blocked', or '' when it can. */
export function nameRefused(key) {
  const bare = leet(nameSkeleton(key));
  if ((bare.startsWith('isaac') && key !== 'isaac') || RESERVED.includes(bare)) return 'reserved';
  const words = key.split('_').map(w => leet(w).replace(/[0-9]/g, ''));
  const hit = b => words.some(w => w === b || (!WHOLE_ONLY.has(b) && w.startsWith(b)))
    || (!WHOLE_ONLY.has(b) && bare.startsWith(b));
  return BLOCKED.some(hit) ? 'blocked' : '';
}
