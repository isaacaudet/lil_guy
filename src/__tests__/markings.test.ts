import { describe, expect, test } from 'bun:test';
import { resolve, bodies, compose, shows, traitOdds } from '../index-headless';

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const guys = Array.from({ length: 600 }, (_, i) => resolve('4-markings' + i)).filter(c => c.body !== 0);

describe('markings', () => {
  test('a guy dealt markings shows them more often than not', () => {
    const shown = guys.filter(c => shows(c, 'body')).length;
    expect(shown / guys.length).toBeGreaterThan(0.4);
  });

  test('shows() is whether the guy changes', () => {
    for (const c of guys.slice(0, 80)) expect(shows(c, 'body')).toBe(!same(compose(c), compose({ ...c, body: 0 })));
  });

  test('his traits name only markings he shows', () => {
    for (const c of guys.slice(0, 120)) {
      const t = traitOdds(c).find(x => x.slot === 'markings')!;
      expect(t.name).toBe(shows(c, 'body') ? bodies[c.body].name : 'plain');
    }
  });
});
