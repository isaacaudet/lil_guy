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
