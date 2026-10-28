import { describe, expect, it } from 'bun:test';
import { NAME_KEY, nameKey, nameSkeleton } from '../name-key';

describe('name keys', () => {
  it('take underscores only between letters and digits, one at a time', () => {
    for (const ok of ['cool_guy', 'a_b', 'x1_y2_z3', 'isaac', 'ab']) expect(NAME_KEY.test(ok)).toBe(true);
    for (const bad of ['_cool', 'cool_', 'cool__guy', 'a', '_', 'Cool_guy', 'cool-guy', 'a'.repeat(17)]) expect(NAME_KEY.test(bad)).toBe(false);
  });
  it('turn what a player typed into a key', () => {
    expect(nameKey('Cool_Guy')).toBe('cool_guy');
    expect(nameKey('__cool___guy__')).toBe('cool_guy');
    expect(nameKey('cool guy!')).toBe('coolguy');
    expect(nameKey('abcdefghijklmno_p')).toBe('abcdefghijklmno');
    expect(NAME_KEY.test(nameKey('_a_'))).toBe(false);
  });
  it('compare names by skeleton', () => {
    expect(nameSkeleton('cool_guy')).toBe('coolguy');
  });
});
