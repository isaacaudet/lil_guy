import { describe, expect, test } from 'bun:test';
import { cardArtPlayer, cardStill } from '../card';
import { cardFace, cardFaceAt } from '../card-face';
import { CARD_LOOKS, lookFor } from '../card-looks';
import { bakeView } from '../bake';
import { LOOP_MS } from '../loop';
import type { Owned } from '../owned';

const aura: Owned = { item: 'aura.flames', finish: 'classic', scuff: 0.1, print: 41 };
const prism: Owned = { item: 'amountle.crown', finish: 'prism', scuff: 0.02, print: 88 };
const gold: Owned = { item: 'flipsies.cap', finish: 'gold', scuff: 0.01, print: 5 };
const nebula: Owned = { item: 'cutsies.chef', finish: 'nebula', scuff: 0.04, print: 72 };
const tempered: Owned = { item: 'trackdle.cap', finish: 'tempered', scuff: 0.1, print: 230 };
const sunset: Owned = { item: 'puttsies.visor', finish: 'sunset', scuff: 0.03, print: 150 };
/** A card each look is its edition's own for (`classic` the Foil card's). */
const forLook = { classic: sunset, paint: aura, sheen: gold, liquid: tempered, opal: prism, bands: nebula } as const;
const differs = (a: ArrayLike<number>, b: ArrayLike<number>) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };

describe('card looks', () => {
  test('each edition has its own look, a Holographic card its finish\'s', () => {
    expect(lookFor(6, 'classic')).toBe(CARD_LOOKS.indexOf('paint'));
    expect(lookFor(5, 'gold')).toBe(CARD_LOOKS.indexOf('sheen'));
    expect(lookFor(3, 'prism')).toBe(CARD_LOOKS.indexOf('opal'));
    expect(lookFor(2, 'tempered')).toBe(CARD_LOOKS.indexOf('liquid'));
    expect(lookFor(2, 'nebula')).toBe(CARD_LOOKS.indexOf('bands'));
    expect(lookFor(1, 'sunset')).toBe(0);
    expect(lookFor(2, 'nebula', 'liquid')).toBe(CARD_LOOKS.indexOf('liquid'));
    // A look that doesn't fit the edition is passed over.
    expect(lookFor(1, 'sunset', 'paint')).toBe(0);
  });

  test('the earlier looks, gold and edge are still there to ask for', () => {
    const input = { seed: 'looks', title: 'A', copies: [gold], move: 'cheer' as const };
    expect(differs(cardStill(input), cardStill(input, 0.6, { gold: 'brushed' }))).toBeGreaterThan(2000);
    expect(differs(cardStill(input), cardStill(input, 0.6, { edge: 'sticker' }))).toBeGreaterThan(200);
    for (const copy of [aura, prism, nebula, tempered]) {
      const card = { seed: 'looks', title: 'A', copies: [copy] };
      expect(differs(cardStill(card), cardStill(card, 0.6, { look: 'classic' }))).toBeGreaterThan(500);
    }
  });

  test('every look comes round in LOOP_MS', () => {
    for (const look of CARD_LOOKS) {
      const face = cardFace({ name: 'looks', copies: [forLook[look]] });
      expect(face.look).toBe(CARD_LOOKS.indexOf(look));
      expect(differs(cardFaceAt(face, 0), cardFaceAt(face, LOOP_MS))).toBe(0);
      // A step before the loop closes is a step away from its start; hard-banded looks may tip a pixel's band.
      const a = cardFaceAt(face, LOOP_MS - 20), b = cardFaceAt(face, 0);
      let worst = 0;
      for (let i = 0; i < a.length; i++) worst = Math.max(worst, Math.abs(a[i] - b[i]));
      expect(worst).toBeLessThan(look === 'paint' || look === 'liquid' ? 160 : 60);
      expect(differs(cardFaceAt(face, 700), b)).toBeGreaterThan(0);
    }
  });

  test('each aura paints its own pattern', () => {
    const still = (item: string, print = 41) => cardStill({ seed: 'looks', title: 'A', copies: [{ item, finish: 'classic', scuff: 0.1, print }] });
    expect(differs(still('aura.flames'), still('aura.flames', 400))).toBeGreaterThan(500);
    expect(differs(still('aura.flames'), still('aura.orbit'))).toBeGreaterThan(2000);
  });

  test('a card\'s words: no stars, no print number, the title alone', () => {
    const input = (title: string, footer: string) => ({ seed: 'looks', title, lines: ['★ Aura', '@mochi'], copies: [aura], footer });
    expect(differs(cardStill(input('★ Flames | Classic', '#012 · 1st edition')), cardStill(input('Flames', '1st edition')))).toBe(0);
  });

  test('the art view is the card\'s window as a square', () => {
    const art = cardArtPlayer({ seed: 'looks', title: 'A', copies: [aura] });
    expect(art.width).toBe(art.height);
    expect(art.frame(0)).toHaveLength(art.width * art.height * 4);
    const view = bakeView({ seed: 'looks' }, 'art')!;
    expect(view.width).toBe(view.height);
    expect(bakeView({ seed: 'looks' }, 'art-still')!.frames).toHaveLength(1);
  });
});
