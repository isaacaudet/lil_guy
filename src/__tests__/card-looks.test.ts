import { describe, expect, test } from 'bun:test';
import { cardStill } from '../card';
import { cardFace, cardFaceAt } from '../card-face';
import { CARD_LOOKS, lookApplies } from '../card-looks';
import { LOOP_MS } from '../loop';
import type { Owned } from '../owned';

const aura: Owned = { item: 'aura.flames', finish: 'classic', scuff: 0.1, print: 41 };
const prism: Owned = { item: 'amountle.crown', finish: 'prism', scuff: 0.02, print: 88 };
const gold: Owned = { item: 'flipsies.cap', finish: 'gold', scuff: 0.01, print: 5 };
const nebula: Owned = { item: 'cutsies.chef', finish: 'nebula', scuff: 0.04, print: 72 };
const negative: Owned = { item: 'stackdle.tower', finish: 'negative', scuff: 0.02, print: 19 };
const forLook = { paint: aura, polychrome: prism, foil: gold, holo: nebula } as const;
const differs = (a: ArrayLike<number>, b: ArrayLike<number>) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };

describe('prototype card looks', () => {
  test('each look changes the card it is for, and leaves the rest as they are', () => {
    for (const look of CARD_LOOKS.slice(1) as (keyof typeof forLook)[]) {
      const input = { seed: 'looks', title: 'A', copies: [forLook[look]] };
      expect(differs(cardStill(input), cardStill(input, 0.6, { look }))).toBeGreaterThan(500);
      const other = { seed: 'looks', title: 'A', copies: [negative] };
      expect(differs(cardStill(other), cardStill(other, 0.6, { look }))).toBe(0);
    }
    expect(lookApplies(0, 6)).toBe(false);
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
      expect(differs(cardFaceAt(face, 1500), b)).toBeGreaterThan(0);
    }
  });
});
