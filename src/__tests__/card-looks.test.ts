import { describe, expect, test } from 'bun:test';
import { cardStill } from '../card';
import { cardFace, cardFaceAt } from '../card-face';
import { CARD_LOOKS, lookApplies, paintForm } from '../card-looks';
import { LOOP_MS } from '../loop';
import type { Owned } from '../owned';

const aura: Owned = { item: 'aura.flames', finish: 'classic', scuff: 0.1, print: 41 };
const prism: Owned = { item: 'amountle.crown', finish: 'prism', scuff: 0.02, print: 88 };
const gold: Owned = { item: 'flipsies.cap', finish: 'gold', scuff: 0.01, print: 5 };
const sunset: Owned = { item: 'puttsies.visor', finish: 'sunset', scuff: 0.03, print: 150 };
const nebula: Owned = { item: 'cutsies.chef', finish: 'nebula', scuff: 0.04, print: 72 };
const negative: Owned = { item: 'stackdle.tower', finish: 'negative', scuff: 0.02, print: 19 };
const forLook = { paint: aura, polychrome: prism, foil: sunset, holo: nebula, sheen: gold } as const;
const differs = (a: ArrayLike<number>, b: ArrayLike<number>) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };

describe('prototype card looks', () => {
  test('each look changes the card it is for, and leaves the rest as they are', () => {
    for (const look of CARD_LOOKS.slice(1) as (keyof typeof forLook)[]) {
      const input = { seed: 'looks', title: 'A', copies: [forLook[look]] };
      // The sheen is still most of the loop: look at it mid-sweep.
      const t = look === 'sheen' ? 0.5 : 0.6;
      expect(differs(cardStill(input, t), cardStill(input, t, { look }))).toBeGreaterThan(500);
      const other = { seed: 'looks', title: 'A', copies: [negative] };
      expect(differs(cardStill(other), cardStill(other, 0.6, { look }))).toBe(0);
    }
    expect(lookApplies(0, 6)).toBe(false);
  });

  test('edge and gold options change only the cards asked', () => {
    const input = { seed: 'looks', title: 'A', copies: [gold], move: 'cheer' as const };
    expect(differs(cardStill(input), cardStill(input, 0.6, { edge: 'now', gold: 'now' }))).toBe(0);
    for (const edge of ['cell', 'round', 'shadow', 'none', 'pool'] as const) expect(differs(cardStill(input), cardStill(input, 0.6, { edge }))).toBeGreaterThan(200);
    for (const g of ['champagne', 'trim', 'solid', 'fullart', 'warm'] as const) expect(differs(cardStill(input), cardStill(input, 0.6, { gold: g }))).toBeGreaterThan(2000);
    expect(differs(cardStill(input), cardStill(input, 0.6, { plate: true }))).toBeGreaterThan(1000);
  });

  test('each aura paints its own pattern', () => {
    const still = (item: string, print = 41) => cardStill({ seed: 'looks', title: 'A', copies: [{ item, finish: 'classic', scuff: 0.1, print }] }, 0.6, { look: 'paint', edge: 'round' });
    const flames = still('aura.flames');
    expect(differs(flames, still('aura.flames', 400))).toBeGreaterThan(500);
    expect(paintForm('aura.flames', 41).form[0]).not.toBe(paintForm('aura.orbit', 41).form[0]);
    expect(paintForm('aura.unknown', 3).form[0]).toBe(paintForm('aura.unknown', 3).form[0]);
  });

  test('every look comes round in LOOP_MS', () => {
    for (const look of CARD_LOOKS.slice(1) as (keyof typeof forLook)[]) {
      const face = cardFace({ name: 'looks', copies: [forLook[look]], look });
      expect(differs(cardFaceAt(face, 0), cardFaceAt(face, LOOP_MS))).toBe(0);
      // A step before the loop closes is a step away from its start, not a jump.
      const a = cardFaceAt(face, LOOP_MS - 20), b = cardFaceAt(face, 0);
      let worst = 0;
      for (let i = 0; i < a.length; i++) worst = Math.max(worst, Math.abs(a[i] - b[i]));
      expect(worst).toBeLessThan(look === 'paint' ? 140 : 60);
      expect(differs(cardFaceAt(face, 700), b)).toBeGreaterThan(0);
    }
  });
});
