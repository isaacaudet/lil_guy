import { describe, expect, test } from 'bun:test';
import { resolve } from '../resolve';
import { guyRank, guyOneIn, traitOdds, FOUNDER_RANK, GUY_TIERS } from '../rarity';
import { decodeLook, encodeLook, makeSeed } from '../look';
import { FOUNDER_COPIES, FOUNDER_LOOK, FOUNDER_SEED, isFounder, isFounderCopy } from '../founder';
import { hair, heads, eyes } from '../parts';
import { palettes } from '../palette';
import { roll } from '../owned';

describe('the founder', () => {
  test('his seed gives his picked look, a crowned round guy in Ocean, flagged as the founder', () => {
    const f = resolve(FOUNDER_SEED);
    expect(f.founder).toBe(true);
    expect(hair[f.hair].name).toBe('crown');
    expect(heads[f.head].name).toBe('round');
    expect(eyes[f.eyes].name).toBe('glossy');
    expect(palettes[f.palette].name).toBe('Ocean');
    expect(f).toMatchObject({ ...FOUNDER_LOOK.parts, palette: FOUNDER_LOOK.palette });
    // As the site and the Worker drew him before the library knew him: the seed's rotation, his parts and colour.
    expect(f.rotation).toBe(resolve('founder:isaac', {}).rotation);
    expect(isFounder(FOUNDER_SEED)).toBe(true);
    expect(isFounder('isaac')).toBe(false);
  });

  test('ranks at the top tier, the one of one, whatever his traits’ odds', () => {
    const f = resolve(FOUNDER_SEED);
    expect(guyRank(f)).toEqual({ top: 0, tier: GUY_TIERS.length - 1, name: 'Founder', label: 'One of one' });
    expect(guyRank(f)).toEqual(FOUNDER_RANK);
    // Without the flag his traits would rank him like anyone dealt: well short of the top.
    const { founder, ...asDealt } = f;
    expect(founder).toBe(true);
    expect(guyRank(asDealt).tier).toBeLessThan(GUY_TIERS.length - 1);
    // His traits' odds are still his, for the tiles that score them.
    expect(traitOdds(f)).toEqual(traitOdds(asDealt));
    expect(guyOneIn(f)).toBe(guyOneIn(asDealt));
  });

  test('stays the founder in a look he picks, and parts asked for go over his', () => {
    const f = resolve(FOUNDER_SEED);
    const picked = decodeLook(encodeLook({ ...f, palette: 0, hair: 0 }), f, [])!;
    expect(picked).toBeTruthy();
    const worn = { ...f, ...picked };
    expect(guyRank(worn).name).toBe('Founder');
    expect(resolve(FOUNDER_SEED, { hair: 0 })).toMatchObject({ hair: 0, founder: true, head: FOUNDER_LOOK.parts.head });
  });

  test('no other guy changes: nobody else is flagged, and ranks stay as dealt', () => {
    for (const seed of ['alice', 'okapi', 'founder', 'founder:isaa', 'founder:isaac ', 'Isaac', '3-0a1b2c3d4e5f', ...Array.from({ length: 300 }, () => makeSeed())]) {
      const g = resolve(seed);
      expect(g.founder).toBeUndefined();
      expect(guyRank(g).name).not.toBe('Founder');
      expect(guyRank(g)).toEqual(guyRank({ ...g }));
    }
  });

  test('his two copies are his own: the Gold flag and the Origin aura, which no capsule gives', () => {
    expect(isFounderCopy(FOUNDER_COPIES.flag)).toBe(true);
    expect(isFounderCopy(FOUNDER_COPIES.aura)).toBe(true);
    for (let i = 0; i < 2000; i++) expect(isFounderCopy(roll('f' + i, 'trackdle'))).toBe(false);
  });
});
