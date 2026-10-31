/**
 * Animated GIFs and PNGs from RGBA frames, with no dependencies, so a card or
 * a guy can be saved anywhere the library runs (a browser, a game's server,
 * a script). Pixel art stays crisp: frames are scaled up by whole pixels,
 * never smoothed.
 */

export interface Frames {
  width: number;
  height: number;
  /** RGBA, `width * height * 4` bytes each. Alpha under 128 is transparent. */
  frames: Uint8ClampedArray[];
  /** How long each frame shows, in milliseconds. */
  delays: number[];
}

/** Each pixel made a `scale` by `scale` block. */
export function upscale(rgba: Uint8ClampedArray, width: number, height: number, scale: number): Uint8ClampedArray {
  if (scale === 1) return rgba;
  const W = width * scale, out = new Uint8ClampedArray(W * height * scale * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) out.set(rgba.subarray(i, i + 4), ((y * scale + dy) * W + x * scale + dx) * 4);
  }
  return out;
}

/**
 * Up to 255 colours that stand for every opaque pixel across the frames: all
 * of them when there are that few, else a median cut weighted by how much
 * each colour is used.
 */
function palette(frames: Uint8ClampedArray[]): number[] {
  const counts = new Map<number, number>();
  for (const f of frames) for (let i = 0; i < f.length; i += 4) {
    if (f[i + 3] < 128) continue;
    const c = (f[i] << 16) | (f[i + 1] << 8) | f[i + 2];
    counts.set(c, (counts.get(c) || 0) + 1);
  }
  return medianCut([...counts.entries()]);
}

/** Up to 255 colours standing for these colours and how often each is used, by median cut. */
function medianCut(all: [number, number][]): number[] {
  if (all.length <= 255) return all.map(([c]) => c);
  type Box = [number, number][];
  const ch = (c: number, k: number) => (c >> (16 - 8 * k)) & 255;
  const range = (box: Box, k: number) => { let lo = 255, hi = 0; for (const [c] of box) { const v = ch(c, k); if (v < lo) lo = v; if (v > hi) hi = v; } return hi - lo; };
  // Each box's spread along each channel, weighted by how much it is used, worked out once when it is made.
  const weigh = (box: Box) => { const used = Math.log2(1 + box.reduce((a, [, n]) => a + n, 0)); return [0, 1, 2].map(k => range(box, k) * used); };
  let boxes: Box[] = [all];
  let weights = [weigh(all)];
  while (boxes.length < 255) {
    let best = -1, bk = 0, bw = -1;
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      for (let k = 0; k < 3; k++) { const w = weights[i][k]; if (w > bw) { bw = w; best = i; bk = k; } }
    });
    if (best < 0) break;
    const box = boxes[best].sort((a, b) => ch(a[0], bk) - ch(b[0], bk));
    const total = box.reduce((a, [, n]) => a + n, 0);
    let run = 0, cut = 1;
    for (let i = 0; i < box.length - 1; i++) { run += box[i][1]; if (run >= total / 2) { cut = i + 1; break; } }
    const lo = box.slice(0, cut), hi = box.slice(cut);
    boxes.splice(best, 1, lo, hi);
    weights.splice(best, 1, weigh(lo), weigh(hi));
  }
  return boxes.map(box => {
    let r = 0, g = 0, b = 0, n = 0;
    for (const [c, k] of box) { r += ch(c, 0) * k; g += ch(c, 1) * k; b += ch(c, 2) * k; n += k; }
    return (Math.round(r / n) << 16) | (Math.round(g / n) << 8) | Math.round(b / n);
  });
}

/** The nearest of `table`'s colours (from index 1; 0 is transparent) to each colour asked for, remembered. */
function nearestIn(table: number[]): (c: number) => number {
  const nearest = new Map<number, number>();
  return (c: number) => {
    let i = nearest.get(c);
    if (i !== undefined) return i;
    let best = 1, bd = Infinity;
    for (let k = 1; k < table.length; k++) {
      const p = table[k], dr = ((c >> 16) & 255) - ((p >> 16) & 255), dg = ((c >> 8) & 255) - ((p >> 8) & 255), db = (c & 255) - (p & 255);
      const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
      if (d < bd) { bd = d; best = k; if (!d) break; }
    }
    nearest.set(c, best);
    return best;
  };
}

/**
 * The frames in at most 255 colours and transparent, each pixel the nearest colour of one palette made
 * for all of them, as a GIF has them. A picture with thousands of colours (a big card's foil) then
 * packs as an indexed PNG, several times smaller, and its GIF shows exactly the same pixels. It loses
 * colours, so a picture that has been served exact stays exact.
 */
export function fewerColours(input: Frames): Frames {
  // Colours gathered into 32,768 bins (five bits a channel), each standing as its pixels' average: a
  // big card's tens of thousands of colours are counted and mapped by table, not one by one.
  const counts = new Uint32Array(32768), sums = new Float64Array(32768 * 3), seen = new Set<number>();
  for (const f of input.frames) for (let i = 0; i < f.length; i += 4) {
    if (f[i + 3] < 128) continue;
    if (seen.size <= 255) seen.add((f[i] << 16) | (f[i + 1] << 8) | f[i + 2]);
    const b = ((f[i] >> 3) << 10) | ((f[i + 1] >> 3) << 5) | (f[i + 2] >> 3);
    counts[b]++; sums[b * 3] += f[i]; sums[b * 3 + 1] += f[i + 1]; sums[b * 3 + 2] += f[i + 2];
  }
  // Few enough already: nothing to lose.
  if (seen.size <= 255) return input;
  const mean = (b: number) => (Math.round(sums[b * 3] / counts[b]) << 16) | (Math.round(sums[b * 3 + 1] / counts[b]) << 8) | Math.round(sums[b * 3 + 2] / counts[b]);
  const all: [number, number][] = [];
  for (let b = 0; b < 32768; b++) if (counts[b]) all.push([mean(b), counts[b]]);
  const table = [0, ...medianCut(all)], indexOf = nearestIn(table), ofBin = new Int32Array(32768).fill(-1);
  const frames = input.frames.map(f => {
    const out = new Uint8ClampedArray(f.length);
    for (let i = 0; i < f.length; i += 4) {
      if (f[i + 3] < 128) continue;
      const b = ((f[i] >> 3) << 10) | ((f[i + 1] >> 3) << 5) | (f[i + 2] >> 3);
      let c = ofBin[b];
      if (c < 0) c = ofBin[b] = table[indexOf(mean(b))];
      out[i] = c >> 16; out[i + 1] = (c >> 8) & 255; out[i + 2] = c & 255; out[i + 3] = 255;
    }
    return out;
  });
  return { ...input, frames };
}

/** LZW-compresses colour indices into GIF data sub-blocks. */
function lzw(indices: Uint8Array, minCode: number, out: number[]): void {
  const clear = 1 << minCode, end = clear + 1;
  let size = minCode + 1, next = end + 1, dict = new Map<number, number>();
  let bits = 0, acc = 0;
  const block: number[] = [];
  const emit = (code: number) => {
    acc |= code << bits; bits += size;
    while (bits >= 8) { block.push(acc & 255); acc >>= 8; bits -= 8; if (block.length === 255) { out.push(255, ...block); block.length = 0; } }
  };
  emit(clear);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i], key = (prefix << 8) | k, hit = dict.get(key);
    if (hit !== undefined) { prefix = hit; continue; }
    emit(prefix);
    if (next < 4096) { dict.set(key, next++); if (next > (1 << size) && size < 12) size++; }
    else { emit(clear); dict = new Map(); size = minCode + 1; next = end + 1; }
    prefix = k;
  }
  emit(prefix); emit(end);
  if (bits > 0) block.push(acc & 255);
  if (block.length) out.push(block.length, ...block);
  out.push(0);
}

/**
 * The box of pixels that differ between two frames `W` wide, as `[x, y, w, h]`, or null when none do.
 * Two pixels both under half alpha count as the same (both transparent).
 */
function changed(a: Uint8ClampedArray, b: Uint8ClampedArray, W: number, H: number): [number, number, number, number] | null {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (a[i + 3] < 128 && b[i + 3] < 128) continue;
    if (a[i] === b[i] && a[i + 1] === b[i + 1] && a[i + 2] === b[i + 2] && a[i + 3] === b[i + 3]) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return x1 < 0 ? null : [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
}

/** Whether a pixel shown in `before` is transparent in `after`: something a GIF can only clear by disposing. */
function clears(before: Uint8ClampedArray, after: Uint8ClampedArray): boolean {
  for (let i = 3; i < after.length; i += 4) if (after[i] < 128 && before[i] >= 128) return true;
  return false;
}

/**
 * An animated GIF that loops forever. Transparent pixels stay transparent, so
 * a guy can be saved without a background. After the first frame only the box
 * that changed is written, its unchanged pixels left to show through, so a
 * shimmer on a hat costs the hat, not the whole picture; a frame that has to
 * clear a pixel is written whole after a frame that clears itself away.
 */
export function encodeGif(input: Frames, scale = 1): Uint8Array {
  const W = input.width * scale, H = input.height * scale, n = input.frames.length;
  const frames = input.frames.map(f => upscale(f, input.width, input.height, scale));
  const colours = palette(frames);
  const table = [0, ...colours];                       // index 0 is transparent
  let bitsPer = 1; while ((1 << bitsPer) < table.length) bitsPer++;
  const out: number[] = [];
  const word = (n: number) => out.push(n & 255, (n >> 8) & 255);
  out.push(...[...'GIF89a'].map(c => c.charCodeAt(0)));
  word(W); word(H);
  out.push(0x80 | ((bitsPer - 1) << 4) | (bitsPer - 1), 0, 0);
  for (let i = 0; i < 1 << bitsPer; i++) { const c = table[i] ?? 0; out.push((c >> 16) & 255, (c >> 8) & 255, c & 255); }
  out.push(0x21, 0xff, 11, ...[...'NETSCAPE2.0'].map(c => c.charCodeAt(0)), 3, 1, 0, 0, 0);
  const indexOf = nearestIn(table);
  // A frame that turns a shown pixel transparent comes after one that clears itself (disposal 2), and
  // a frame that clears itself must cover the whole picture; every other frame leaves itself (disposal 1).
  const src = input.frames, w0 = input.width, h0 = input.height;
  const clearing = src.map((f, k) => n > 1 && clears(src[(k + n - 1) % n], f));
  const whole = src.map((_, k) => k === 0 || clearing[k] || clearing[(k + 1) % n]);
  frames.forEach((f, k) => {
    const delay = Math.max(2, Math.round((input.delays[k] ?? 80) / 10));
    const dispose = n > 1 && clearing[(k + 1) % n] ? 2 : 1;
    const box = whole[k] ? [0, 0, w0, h0] : changed(src[k - 1], src[k], w0, h0) ?? [0, 0, 1, 1];
    const [bx, by, bw, bh] = box.map(v => v * scale);
    out.push(0x21, 0xf9, 4, (dispose << 2) | 1); word(delay); out.push(0, 0);
    out.push(0x2c); word(bx); word(by); word(bw); word(bh); out.push(0);
    const before = whole[k] ? null : frames[k - 1];
    const idx = new Uint8Array(bw * bh);
    for (let y = 0, p = 0; y < bh; y++) for (let x = 0; x < bw; x++, p++) {
      const i = ((by + y) * W + bx + x) * 4;
      if (f[i + 3] < 128) { idx[p] = 0; continue; }
      // Unchanged under a frame that stays: left to show through, which packs smaller.
      if (before && before[i] === f[i] && before[i + 1] === f[i + 1] && before[i + 2] === f[i + 2] && before[i + 3] >= 128) { idx[p] = 0; continue; }
      idx[p] = indexOf((f[i] << 16) | (f[i + 1] << 8) | f[i + 2]);
    }
    const min = Math.max(2, bitsPer);
    out.push(min);
    lzw(idx, min, out);
  });
  out.push(0x3b);
  return new Uint8Array(out);
}

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (bytes: Uint8Array) => { let c = 0xffffffff; for (const b of bytes) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

/** zlib-wrapped deflate: compressed where the runtime has CompressionStream, else stored. */
async function zlib(raw: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream !== 'undefined') {
    const stream = new Blob([raw as BlobPart]).stream().pipeThrough(new CompressionStream('deflate'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  // Stored blocks: no compression, but a valid PNG everywhere.
  const out: number[] = [0x78, 0x01];
  for (let i = 0; i < raw.length; i += 65535) {
    const n = Math.min(65535, raw.length - i);
    out.push(i + n >= raw.length ? 1 : 0, n & 255, n >> 8, ~n & 255, (~n >> 8) & 255);
    for (let k = 0; k < n; k++) out.push(raw[i + k]);
  }
  let a = 1, b = 0; for (const v of raw) { a = (a + v) % 65521; b = (b + a) % 65521; }
  out.push(b >> 8, b & 255, a >> 8, a & 255);
  return new Uint8Array(out);
}

const concat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
};
const u32 = (n: number) => new Uint8Array([n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
const u16 = (n: number) => new Uint8Array([(n >>> 8) & 255, n & 255]);
function chunk(type: string, data: Uint8Array): Uint8Array {
  const body = concat([new Uint8Array([...type].map(c => c.charCodeAt(0))), data]);
  return concat([u32(data.length), body, u32(crc32(body))]);
}

/**
 * The PNG layout for a set of frames: indexed (a palette and its transparency)
 * when they use 256 colours or fewer, which pixel art nearly always does and
 * which packs several times smaller, else full RGBA.
 */
function layout(frames: Uint8ClampedArray[]): { indexed: boolean; colours: number[]; rows: (rgba: Uint8ClampedArray, W: number, H: number) => Uint8Array } {
  const key = (px: Uint8ClampedArray, i: number) => (px[i + 3] < 128 ? -1 : (px[i] << 16) | (px[i + 1] << 8) | px[i + 2]);
  const index = new Map<number, number>([[-1, 0]]);
  for (const px of frames) for (let i = 0; i < px.length && index.size <= 256; i += 4) { const k = key(px, i); if (!index.has(k)) index.set(k, index.size); }
  if (index.size > 256) return { indexed: false, colours: [], rows: (px, W, H) => {
    const raw = new Uint8Array((W * 4 + 1) * H);
    for (let y = 0; y < H; y++) raw.set(px.subarray(y * W * 4, (y + 1) * W * 4), y * (W * 4 + 1) + 1);
    return raw;
  } };
  return { indexed: true, colours: [...index.keys()], rows: (px, W, H) => {
    const raw = new Uint8Array((W + 1) * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) raw[y * (W + 1) + 1 + x] = index.get(key(px, (y * W + x) * 4))!;
    return raw;
  } };
}

/** The `w` by `h` box at `x`, `y` of a picture `W` wide. */
function crop(rgba: Uint8ClampedArray, W: number, x: number, y: number, w: number, h: number): Uint8ClampedArray {
  if (x === 0 && w === W) return rgba.subarray(y * W * 4, (y + h) * W * 4);
  const out = new Uint8ClampedArray(w * h * 4);
  for (let r = 0; r < h; r++) out.set(rgba.subarray(((y + r) * W + x) * 4, ((y + r) * W + x + w) * 4), r * w * 4);
  return out;
}

async function png(input: Frames, scale: number, animated: boolean, plays = 0): Promise<Uint8Array> {
  const W = input.width * scale, H = input.height * scale;
  const frames = input.frames.map(f => upscale(f, input.width, input.height, scale));
  const { indexed, colours, rows } = layout(frames);
  const head = new Uint8Array([...u32(W), ...u32(H), 8, indexed ? 3 : 6, 0, 0, 0]);
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head)];
  if (indexed) {
    parts.push(chunk('PLTE', new Uint8Array(colours.flatMap(k => (k < 0 ? [0, 0, 0] : [k >> 16, (k >> 8) & 255, k & 255])))));
    parts.push(chunk('tRNS', new Uint8Array([0])));
  }
  let seq = 0;
  if (animated) parts.push(chunk('acTL', concat([u32(frames.length), u32(plays)])));
  for (let i = 0; i < frames.length; i++) {
    // The first frame whole; after it only the box that changed, replacing what was there (no
    // disposal, source blend, so a pixel can turn transparent too), each shown its own time.
    const box = i === 0 ? null : changed(input.frames[i - 1], input.frames[i], input.width, input.height);
    const [bx, by, bw, bh] = i === 0 ? [0, 0, W, H] : (box ?? [0, 0, 1, 1]).map(v => v * scale);
    if (animated) parts.push(chunk('fcTL', concat([u32(seq++), u32(bw), u32(bh), u32(bx), u32(by), u16(Math.max(1, Math.round(input.delays[i] ?? 100))), u16(1000), new Uint8Array([0, 0])])));
    const data = await zlib(rows(i === 0 ? frames[i] : crop(frames[i], W, bx, by, bw, bh), bw, bh));
    parts.push(i === 0 ? chunk('IDAT', data) : chunk('fdAT', concat([u32(seq++), data])));
    if (!animated) break;
  }
  parts.push(chunk('IEND', new Uint8Array()));
  return concat(parts);
}

/** A PNG of one RGBA frame, scaled up by whole pixels. */
export function encodePng(rgba: Uint8ClampedArray, width: number, height: number, scale = 1): Promise<Uint8Array> {
  return png({ width, height, frames: [rgba], delays: [0] }, scale, false);
}

/**
 * An animated PNG of the frames, looping for ever, or played `plays` times and
 * left on its last frame (a capsule's open plays once). Browsers play it in a
 * plain `<img>` with no script, keep its transparency whole, and a still viewer
 * shows its first frame. Scale it up by whole pixels here, or in CSS with
 * `image-rendering: pixelated`.
 */
export function encodeApng(input: Frames, scale = 1, plays = 0): Promise<Uint8Array> {
  return png(input, scale, true, plays);
}
