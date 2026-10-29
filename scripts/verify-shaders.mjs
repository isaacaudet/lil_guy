// The finishes' and the card's shaders against their plain-code twins: runs the GLSL in a real
// browser (Playwright's Chromium, WebGL in software) and compares every pixel with what
// shineFrame and cardFaceAt give, for guys and cards across finishes, grades and times.
// Run after `bun run showcase` (it loads docs/lil-guy.js): node scripts/verify-shaders.mjs
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// Playwright as installed for the project, or the machine's own copy.
const { chromium } = createRequire(import.meta.url)('playwright');

const lib = readFileSync(new URL('../docs/lil-guy.js', import.meta.url), 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<!doctype html><body></body>');
await page.addScriptTag({ content: lib });
const result = await page.evaluate(() => {
  const LG = window.LilGuy;
  const finishes = LG.SHADER_FINISHES;
  // Hats on his sixteen columns, and a buddy, whose frames are wider.
  const hats = [...LG.items.filter(i => i.slot === 'hat' && !i.free).slice(0, 3), LG.items.find(i => i.slot === 'buddy' && !i.retired)];
  const times = [0, 137, 1000, 2333, 4111, 5950];
  const read = (canvas, w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(canvas, 0, 0); return x.getImageData(0, 0, w, h).data; };
  const stats = { pixels: 0, off: 0, worst: 0, cases: 0 };
  const compare = (gpu, cpu) => {
    for (let i = 0; i < cpu.length; i += 4) {
      if (cpu[i + 3] < 128 && gpu[i + 3] < 128) continue;
      stats.pixels++;
      const d = Math.max(Math.abs(gpu[i] - cpu[i]), Math.abs(gpu[i + 1] - cpu[i + 1]), Math.abs(gpu[i + 2] - cpu[i + 2]), Math.abs(gpu[i + 3] - cpu[i + 3]));
      stats.worst = Math.max(stats.worst, d);
      if (d > 2) stats.off++;
    }
    stats.cases++;
  };
  const shine = LG.createShine(), card = LG.createCardShader();
  if (!shine || !card) return { error: 'no WebGL' };
  finishes.forEach((finish, f) => hats.forEach((hat, h) => {
    const equip = [`${hat.id}~${finish}~${(0.02 + 0.11 * h).toFixed(7)}~${17 + f * 31 + h * 7}`];
    const seed = `parity${f}-${h}`;
    const owned = LG.dress(LG.resolve(seed), { equip }, seed).owned;
    const anim = LG.animate(seed, 'idle', { equip });
    for (const ms of times) {
      const frame = anim.frames[0];
      shine.draw(frame, owned, ms);
      compare(read(shine.canvas, frame.colors[0].length, LG.FRAME_HEIGHT), LG.shineFrame(frame, owned, ms));
      for (const grade of [-1, 0, 1, 2, 3, 4, 5]) {
        const face = LG.cardFace({ name: seed, copies: equip.map(LG.decode), grade });
        card.draw(face, ms);
        compare(read(card.canvas, LG.FACE_WIDTH, LG.FACE_HEIGHT), LG.cardFaceAt(face, ms));
      }
    }
  }));
  // A buddy on the face, at each spot, in every finish, standing and mid-hop.
  const buddies = LG.items.filter(i => i.slot === 'buddy' && !i.retired);
  finishes.forEach((finish, f) => LG.FACE_BUDDY_SPOTS.forEach(spot => {
    const b = buddies[(f * 7 + spot.length) % buddies.length];
    const seed = `buddy${f}-${spot}`;
    const face = LG.cardFace({ name: seed, copies: [LG.decode(`${b.id}~${finish}~${(0.03 + 0.09 * f).toFixed(7)}~${41 + f * 53}`)], buddy: spot });
    const hops = [];
    for (let ms = 0; ms < LG.LOOP_MS && hops.length < 3; ms += 20) if (LG.buddyLift(face, ms)) hops.push(ms);
    if (!hops.length) throw new Error(`${seed}'s buddy never hops`);
    for (const ms of [0, 2333, ...hops]) {
      card.draw(face, ms);
      compare(read(card.canvas, LG.FACE_WIDTH, LG.FACE_HEIGHT), LG.cardFaceAt(face, ms));
    }
  }));
  // The prototype looks (./card-looks) on faces whose editions they change, and on the rest, where they fall back.
  const auras = LG.items.filter(i => i.slot === 'aura');
  const auraFinishes = ['classic', 'fade', 'frost', 'toxic', 'ruby', 'pearl'];
  LG.CARD_LOOKS.forEach((look, l) => {
    const equips = [
      ...finishes.map((finish, f) => `${hats[f % 3].id}~${finish}~${(0.01 + 0.07 * f).toFixed(7)}~${23 + f * 17}`),
      ...auras.map((a, k) => `${a.id}~${auraFinishes[k % auraFinishes.length]}~${(0.04 * (k % 20)).toFixed(7)}~${(101 + k * 29) % 1000}`),
    ];
    equips.forEach((e, k) => {
      const seed = `look${l}-${k}`;
      for (const ms of [0, 1000, 2333, 5950]) {
        const face = LG.cardFace({ name: seed, copies: [LG.decode(e)], look, contrast: 3 + k % 5 });
        card.draw(face, ms);
        compare(read(card.canvas, LG.FACE_WIDTH, LG.FACE_HEIGHT), LG.cardFaceAt(face, ms));
      }
    });
  });
  return stats;
});
await browser.close();
if (result.error) { console.error(result.error); process.exit(1); }
const share = result.off / result.pixels;
console.log(`${result.cases} pictures, ${result.pixels} pixels: ${result.off} more than 2/255 apart (${(share * 100).toFixed(3)}%), worst ${result.worst}/255`);
// A pixel may differ by a rounding step; a handful may land the other side of a twinkle's threshold.
if (share > 0.001) { console.error('The shaders and their plain-code twins disagree.'); process.exit(1); }
