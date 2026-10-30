import { describe, expect, test } from 'bun:test';
import { AURA_PAD } from '../animate';
import { glanceRing } from '../animate';
import { cardInputOf, bakeSquare } from '../bake';
import { contrast, palettes, paletteOf } from '../palette';
import { T } from '../parts/art';
import { animate, AURAS, BAKED_SIZE, BUDDY_GUY_WIDTH, GUY_HEIGHT, GUY_WIDTH, items, LOOP_MS, bakeGuy, bakeCard, bakeView, bakedImage, cardFace, cardFaceAt, faceSpec, shineFit, shineFrame, dress, resolve, guyCode, readGuyCode, encodeApng, profileFrames, toProfilePng, toProfileGif, encode, decode, faceMoves, buddyLift, FACE_BUDDY_SPOTS, FACE_WIDTH, FACE_HEIGHT, FRAME_HEIGHT } from '../index-headless';

const aura = `${AURAS[0].id}~gold~0.0123456~20`;
const hat = `${items.find(i => i.slot === 'hat' && !i.free)!.id}~nebula~0.0500000~7`;
const total = (d: number[]) => d.reduce((a, b) => a + b, 0);

describe('baked guys', () => {
  test('a guy with nothing that shimmers is his move, frame for frame', () => {
    const anim = animate('Maya0', 'hop', {}), baked = bakeGuy({ seed: 'Maya0' }, 'hop');
    expect(total(baked.delays)).toBe(anim.duration);
    expect([baked.width, baked.height]).toEqual([22, 20]);
    expect([GUY_WIDTH, GUY_HEIGHT]).toEqual([BAKED_SIZE.guy.width, BAKED_SIZE.guy.height]);
  });

  test('a guy with a buddy is one wider size, the two of them centred, nothing cut off', () => {
    expect([BUDDY_GUY_WIDTH, GUY_HEIGHT]).toEqual([BAKED_SIZE.buddy.width, BAKED_SIZE.buddy.height]);
    const lit = (px: Uint8ClampedArray) => { let n = 0; for (let i = 3; i < px.length; i += 4) if (px[i]) n++; return n; };
    for (const [seed, buddy] of [['Maya0', 'pets.kitten'], ['Theo1', 'weighsies.elephant'], ['Lux7', 'trackdle.kart']]) {
      const equip = [`${buddy}~plain~0.3000000~900`];
      for (const move of ['idle', 'hop', 'dance'] as const) {
        const baked = bakeGuy({ seed, equip }, move);
        expect([baked.width, baked.height]).toEqual([BUDDY_GUY_WIDTH, GUY_HEIGHT]);
        expect(lit(baked.frames[0])).toBe(animate(seed, move, { equip }).frames[0].colors.flat().filter(Boolean).length);
        let left = baked.width, right = -1;
        for (const px of baked.frames) for (let i = 3; i < px.length; i += 4) if (px[i]) { const x = ((i - 3) / 4) % baked.width; left = Math.min(left, x); right = Math.max(right, x); }
        expect(left).toBeGreaterThanOrEqual(AURA_PAD);
        expect(Math.abs(left - (baked.width - 1 - right))).toBeLessThanOrEqual(2);
      }
    }
  });

  test('a shimmering copy plays the move whole times, and its finish comes round with it', () => {
    const spec = { seed: 'Theo1', equip: [hat] };
    const baked = bakeGuy(spec, 'idle'), anim = animate('Theo1', 'idle', { equip: [hat] });
    const { repeats, speed } = shineFit(anim.duration);
    expect(total(baked.delays)).toBe(repeats * anim.duration);
    expect(speed).toBeGreaterThan(0.7);
    expect(speed).toBeLessThan(1.5);
    const owned = dress(resolve('Theo1'), { equip: [hat] }, 'Theo1').owned;
    expect(shineFrame(anim.frames[0], owned, 0)).toEqual(shineFrame(anim.frames[0], owned, LOOP_MS));
  });

  test('cards loop in LOOP_MS without a jump, and a plain card is one picture', () => {
    const face = cardFace(faceSpec({ seed: 'Lux7', equip: [hat, aura], grade: 3 }));
    expect(cardFaceAt(face, 0)).toEqual(cardFaceAt(face, LOOP_MS));
    expect(total(bakeCard(faceSpec({ seed: 'Lux7', equip: [hat], grade: 3 })).delays)).toBe(LOOP_MS);
    expect(bakeCard(faceSpec({ seed: 'Maya0' })).frames).toHaveLength(1);
  });

  test('a buddy stands on the small face, the guy at his full size and left as he was', () => {
    const lit = (b: Uint8Array) => { let n = 0; for (let i = 3; i < b.length; i += 4) if (b[i]) n++; return n; };
    for (const [seed, buddy] of [['Maya0', 'pets.kitten'], ['Lux7', 'pets.puppy'], ['Theo1', 'pets.axolotl'], ['Hazel Newt', 'pets.bunny-buddy'], ['Wide', 'weighsies.whale']]) {
      const plain = cardFace({ name: seed, grade: 1 });
      expect(plain.hop).toBeNull();
      expect(lit(plain.buddy)).toBe(0);
      for (const spot of FACE_BUDDY_SPOTS) {
        const face = cardFace({ name: seed, copies: [decode(`${buddy}~prism~0.1000000~300`)!], grade: 1, buddy: spot });
        // Underneath the buddy, the face is the plain one: nothing of him moves or shrinks.
        expect(face.base).toEqual(plain.base);
        expect(lit(face.buddy)).toBeGreaterThan(20);
        expect(faceMoves(face)).toBe(true);
        // On the face, inside its bevel, and all of it shows when it hops.
        for (let i = 0; i < FACE_WIDTH * FACE_HEIGHT; i++) if (face.buddy[i * 4 + 3]) {
          const x = i % FACE_WIDTH, y = Math.floor(i / FACE_WIDTH);
          expect(x >= 2 && x <= FACE_WIDTH - 3 && y >= 3 && y <= FACE_HEIGHT - 3).toBe(true);
        }
        const hops = Array.from({ length: LOOP_MS / 20 }, (_, k) => k * 20).filter(ms => buddyLift(face, ms));
        expect(hops.length).toBeGreaterThan(0);
        expect(hops.length).toBeLessThan(LOOP_MS / 20 / 4);
        expect(cardFaceAt(face, hops[0])).not.toEqual(cardFaceAt(face, hops[0] - 200));
        expect(cardFaceAt(face, 0)).toEqual(cardFaceAt(face, LOOP_MS));
      }
      // The default is the peek; the floor stands lower.
      const top = (b: Uint8Array) => { for (let i = 3; i < b.length; i += 4) if (b[i]) return Math.floor((i - 3) / 4 / FACE_WIDTH); return -1; };
      const peek = cardFace({ name: seed, copies: [decode(`${buddy}~plain~0.1000000~300`)!] }), floor = cardFace({ name: seed, copies: [decode(`${buddy}~plain~0.1000000~300`)!], buddy: 'floor' });
      expect(top(floor.buddy)).toBeGreaterThan(top(peek.buddy));
    }
  });

  test('the small face\'s buddy hops when his moving picture\'s does, on its own', () => {
    const equip = ['pets.kitten~plain~0.1000000~300'];
    const face = cardFace(faceSpec({ seed: 'Maya0', equip }));
    const anim = animate('Maya0', 'idle', { equip, loop: { fit: true } });
    // In an idle beat he stands still: wherever his buddy is up a row, the face's is too.
    let t = 0, checked = 0;
    for (const f of anim.frames) {
      const floor = f.colors.map(row => row.slice(16).some(Boolean));
      if (!floor[FRAME_HEIGHT - 1] && floor[FRAME_HEIGHT - 2]) { expect(buddyLift(face, f.at ?? t)).toBe(1); checked++; }
      t += f.ms;
    }
    expect(checked).toBeGreaterThan(0);
  });

  test('views: a move, a still, a card; nothing for a view there is not', () => {
    const spec = { seed: 'Maya0', equip: [aura] };
    expect(bakeView(spec, 'still')!.frames).toHaveLength(1);
    expect(bakeView(spec, 'card-still')!.frames).toHaveLength(1);
    expect(bakeView(spec, 'moonwalk')).toBeNull();
    expect(bakeView(readGuyCode(guyCode(spec))!, 'idle')).toEqual(bakeView(spec, 'idle'));
  });

  test('an animated PNG carries every frame and loops for ever', async () => {
    const frames = bakeGuy({ seed: 'Maya0', equip: [aura] }, 'idle');
    const png = await bakedImage(frames, 'loop');
    expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const at = Buffer.from(png).indexOf('acTL');
    const view = new DataView(png.buffer, png.byteOffset + at + 4, 8);
    expect([view.getUint32(0), view.getUint32(4)]).toEqual([frames.frames.length, 0]);
    expect((await encodeApng(frames, 2)).length).toBeGreaterThan(png.length);
  });
});

const aura0 = encode({ item: 'aura.aurora', finish: 'classic', scuff: 0.1, print: 9 });

describe('profile pictures', () => {
  const specs = [
    { seed: 'mia' },
    { seed: 'zed', equip: [encode({ item: 'aura.aurora', finish: 'classic', scuff: 0.1, print: 9 })] },
    { seed: 'founder:isaac', equip: [encode({ item: 'trackdle.flag', finish: 'gold', scuff: 0, print: 1 }), encode({ item: 'aura.origin', finish: 'classic', scuff: 0, print: 1, fx: 'shimmer' })] },
  ];

  test('are square and solid, with every pixel of the guy inside the round crop', () => {
    for (const spec of specs.slice(0, 2)) {
      const p = profileFrames(spec), r = p.width / 2, ground = [...p.frames[0].subarray(0, 4)];
      expect(p.width).toBe(p.height);
      for (const px of p.frames) for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) {
        const i = (y * p.width + x) * 4;
        expect(px[i + 3]).toBe(255);
        const isGround = [0, 1, 2].every(k => px[i + k] === ground[k]);
        if (!isGround) expect(Math.hypot(Math.max(Math.abs(x - r), Math.abs(x + 1 - r)), Math.max(Math.abs(y - r), Math.abs(y + 1 - r)))).toBeLessThanOrEqual(r);
      }
    }
  });

  test('run a worn backdrop out to every edge', () => {
    const p = profileFrames(specs[2]), px = p.frames[0], at = (x: number, y: number) => [...px.subarray((y * p.width + x) * 4, (y * p.width + x) * 4 + 3)].join();
    // A checkered flag: neighbouring cells differ along the top edge, not one flat colour.
    expect(new Set(Array.from({ length: p.width }, (_, x) => at(x, 0))).size).toBeGreaterThan(1);
    expect(px.every((v, i) => i % 4 !== 3 || v === 255)).toBe(true);
  });

  test('a pale guy stands off the ground; the rest keep the tint of their own colour', () => {
    for (const name of ['Snow', 'Opal', 'Ice', 'Cream', 'Lemon', 'Butter', 'Midnight', 'Peach', 'Oxblood']) {
      const palette = palettes.findIndex(p => p.name === name);
      for (const seed of ['mia', 'zed', 'Theo1']) {
        const px = profileFrames({ seed, palette }).frames[0], ground = '#' + [px[0], px[1], px[2]].map(v => v.toString(16).padStart(2, '0')).join('');
        expect(contrast(ground, paletteOf({ ...resolve(seed), palette }).colors[T.BODY])).toBeGreaterThanOrEqual(1.3);
      }
    }
  });

  test('come out near 512 px, still as a PNG and moving as a GIF', async () => {
    const png = await toProfilePng(specs[1]), gif = toProfileGif(specs[1]);
    const side = (b: Uint8Array, at: number, le = false) => le ? b[at] | (b[at + 1] << 8) : (b[at] << 24) | (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3];
    expect(side(png, 16)).toBeGreaterThan(400); expect(side(png, 16)).toBeLessThanOrEqual(512);
    expect(side(gif, 6, true)).toBeGreaterThan(400); expect(side(gif, 6, true)).toBeLessThanOrEqual(512);
    expect(gif.length).toBeLessThan(10 * 1024 * 1024);
    expect(bakeView(specs[1], 'pfp-still')!.frames.length).toBe(1);
  });
});

describe('rare at a glance', () => {
  // A face or icon is cut to 255 colours, so a ring's colour may come out a step off.
  const near = (f: Uint8ClampedArray, i: number, c: string) => [1, 3, 5].every((k, j) => Math.abs(f[i + j] - parseInt(c.slice(k, k + 2), 16)) <= 4);
  const count = (frames: Uint8ClampedArray[], c: string) => Math.max(...frames.map(f => { let n = 0; for (let i = 0; i < f.length; i += 4) if (f[i + 3] && near(f, i, c)) n++; return n; }));

  test('faces and icons ring an aura in its own colours, and a rare copy in its grade', () => {
    const aura = encode({ item: 'aura.aurora', finish: 'frost', scuff: 0.1, print: 9 }), grail = encode({ item: items.find(i => i.slot === 'hat' && !i.free)!.id, finish: 'gold', scuff: 0.01, print: 4 });
    for (const view of ['face', 'icon'] as const) {
      const ring = glanceRing('Lux7', { equip: [aura] })!;
      const f = bakeSquare({ seed: 'Lux7', equip: [aura] }, view).frames;
      for (const c of ring) expect(count(f, c)).toBeGreaterThan(view === 'face' ? 8 : 15);
      expect(count(bakeSquare({ seed: 'Lux7', equip: [grail] }, view).frames, '#FFE27A')).toBeGreaterThan(8);
    }
  });

  test('a face starts at the head (or hat) whatever sparkles over it: a Lucky star, a Gold copy\'s mark', () => {
    // The face's lower rows, as a mask: the same when the square is cut from the same row.
    const low = (spec: Parameters<typeof bakeSquare>[0]) => { const f = bakeSquare(spec, 'face').frames[0]; return Array.from(f.slice(f.length / 2)).filter((_, i) => i % 4 === 3).map(Boolean).join(); };
    let lucky = 0;
    for (let i = 0; lucky < 12 && i < 20000; i++) {
      const seed = `face-lucky-${i}`;
      if (!resolve(seed).lucky) continue;
      lucky++;
      expect(low({ seed })).toBe(low({ seed, parts: { lucky: false } }));
    }
    // A Gold copy rings the guy, so compare his own middle columns' colours above the bottom row, which neither ring nor sparkle touches.
    const middle = (spec: Parameters<typeof bakeSquare>[0]) => { const f = bakeSquare(spec, 'face'), s = f.width; return Array.from({ length: s / 2 - 1 }, (_, y) => Array.from({ length: s - 6 }, (_, x) => f.frames[0].slice(((y + s / 2) * s + x + 3) * 4, ((y + s / 2) * s + x + 3) * 4 + 4).join('.')).join()).join('/'); };
    const crown = items.find(i => i.slot === 'hat' && !i.free)!.id;
    for (const seed of ['luna', 'xqc', 'mia']) expect(middle({ seed, equip: [encode({ item: crown, finish: 'gold', scuff: 0.01, print: 12 })] })).toBe(middle({ seed, equip: [encode({ item: crown, finish: 'plain', scuff: 0.3, print: 12 })] }));
  });

  test('a big card carries the best worn copy, Prized and better, on a second plate', () => {
    const fish = items.find(i => /goldfish/i.test(i.name))!;
    expect(cardInputOf({ seed: 'Maya0', equip: [encode({ item: fish.id, finish: 'gold', scuff: 0.01, print: 4 })] }).plate).toEqual({ text: `★ Grail · Gold ${fish.name}`, grade: 4 });
    expect(cardInputOf({ seed: 'Maya0', equip: [aura0, encode({ item: fish.id, finish: 'gold', scuff: 0.01, print: 4 })] }).plate?.grade).toBe(5);
    expect(cardInputOf({ seed: 'Maya0', equip: [encode({ item: fish.id, finish: 'sunset', scuff: 0.01, print: 4 })] }).plate).toBeUndefined();
    expect(cardInputOf({ seed: 'Maya0' }).plate).toBeUndefined();
  });
});
