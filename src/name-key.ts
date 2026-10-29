/**
 * A claimed name as it is kept: lowercase letters and digits, with underscores only between them
 * (`cool_guy`, never `_cool`, `cool_` or `cool__guy`), 2 to 16 long.
 */
export const NAME_KEY = /^(?=[a-z0-9_]{2,16}$)[a-z0-9]+(?:_[a-z0-9]+)*$/;

/** Whatever a player typed, as a name key: other characters dropped, runs of underscores made one, none at the ends. */
export function nameKey(typed: string): string {
  const k = String(typed).toLowerCase().replace(/[^a-z0-9_]/g, '').replace(/_+/g, '_').replace(/^_+/, '');
  return k.slice(0, 16).replace(/_+$/, '');
}

/**
 * The name with its underscores taken out. Names claimed before underscores were allowed lost theirs
 * (`cool_guy` was claimed as `coolguy`), so two names with the same skeleton are one name: a new claim
 * can't take `cool_guy` while `coolguy` is held, and `cool_guy` finds `coolguy`'s guy.
 */
export const nameSkeleton = (key: string): string => key.replace(/_/g, '');
